import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/apiResponse.js';
import { SubOrderStatus } from '@prisma/client';
import { CartService } from './cart.service.js';
import { config } from '../config/index.js';

const VALID_STATE_TRANSITIONS: Record<SubOrderStatus, SubOrderStatus[]> = {
  PLACED: ['PACKED', 'CANCELLED'],
  PACKED: ['SHIPPED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

export class OrderService {
  static async checkout(userId: string, addressId: string, couponCode?: string) {
    const address = await prisma.address.findFirst({
      where: { id: addressId, userId },
    });
    if (!address) {
      throw ApiError.badRequest('Invalid shipping address selected');
    }

    const cart = await CartService.getCart(userId);
    if (cart.items.length === 0) {
      throw ApiError.badRequest('Cannot checkout with an empty cart');
    }

    if (cart.hasUnavailableItems) {
      throw ApiError.badRequest('Some items in your cart are no longer available or out of stock');
    }

    // Optional Coupon Validation
    let discountAmount = 0;
    let couponId: string | undefined;

    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: couponCode },
      });

      if (!coupon || !coupon.active) {
        throw ApiError.badRequest('Invalid or inactive coupon code');
      }

      if (coupon.expiresAt && coupon.expiresAt < new Date()) {
        throw ApiError.badRequest('Coupon has expired');
      }

      if (cart.subtotal < Number(coupon.minOrder)) {
        throw ApiError.badRequest(`Minimum order amount for coupon is $${coupon.minOrder}`);
      }

      const userRedemptions = await prisma.couponRedemption.count({
        where: { couponId: coupon.id, userId },
      });

      if (userRedemptions >= coupon.perUserLimit) {
        throw ApiError.badRequest('You have already used this coupon');
      }

      if (coupon.type === 'PERCENT') {
        discountAmount = (cart.subtotal * Number(coupon.value)) / 100;
        if (coupon.maxDiscount && discountAmount > Number(coupon.maxDiscount)) {
          discountAmount = Number(coupon.maxDiscount);
        }
      } else {
        discountAmount = Math.min(Number(coupon.value), cart.subtotal);
      }

      couponId = coupon.id;
    }

    const finalTotal = Math.max(0, cart.subtotal - discountAmount);

    // Group cart items by vendor
    const itemsByVendor = new Map<string, typeof cart.items>();
    for (const item of cart.items) {
      const existing = itemsByVendor.get(item.vendorId) || [];
      existing.push(item);
      itemsByVendor.set(item.vendorId, existing);
    }

    // Atomic Checkout Transaction with row-level stock locks
    const result = await prisma.$transaction(async (tx) => {
      // 1. Lock and decrement stock for every product
      for (const item of cart.items) {
        // Row-level lock via raw query or atomic decrement with condition
        const updated = await tx.product.updateMany({
          where: {
            id: item.productId,
            stock: { gte: item.quantity },
          },
          data: {
            stock: { decrement: item.quantity },
          },
        });

        if (updated.count === 0) {
          throw ApiError.badRequest(`Insufficient stock for product: ${item.title}`);
        }
      }

      // 2. Create parent Order
      const parentOrder = await tx.order.create({
        data: {
          customerId: userId,
          addressId,
          subtotal: cart.subtotal,
          discount: discountAmount,
          total: finalTotal,
          couponId,
          paymentStatus: 'PENDING',
        },
      });

      // 3. Create Sub-Orders per vendor
      const createdSubOrders = [];
      for (const [vendorId, vendorItems] of itemsByVendor.entries()) {
        const vendorSubtotal = vendorItems.reduce((acc, i) => acc + i.itemTotal, 0);

        const subOrder = await tx.subOrder.create({
          data: {
            orderId: parentOrder.id,
            vendorId,
            subtotal: vendorSubtotal,
            status: 'PLACED',
            orderItems: {
              create: vendorItems.map((item) => ({
                productId: item.productId,
                titleSnapshot: item.title,
                priceSnapshot: item.price,
                quantity: item.quantity,
              })),
            },
          },
          include: { orderItems: true },
        });

        createdSubOrders.push(subOrder);
      }

      // 4. Record Coupon Redemption if applicable
      if (couponId) {
        await tx.couponRedemption.create({
          data: {
            couponId,
            userId,
            orderId: parentOrder.id,
          },
        });
      }

      return { parentOrder, subOrders: createdSubOrders };
    });

    // Clear cart in Redis after successful order creation
    await CartService.clearCart(userId);

    return result;
  }

  static async advanceSubOrderStatus(
    subOrderId: string,
    vendorId: string,
    newStatus: SubOrderStatus
  ) {
    const subOrder = await prisma.subOrder.findUnique({
      where: { id: subOrderId },
      include: { vendor: true },
    });

    if (!subOrder) {
      throw ApiError.notFound('Sub-order not found');
    }

    if (subOrder.vendorId !== vendorId) {
      throw ApiError.forbidden('You can only update your own sub-orders');
    }

    const allowedNext = VALID_STATE_TRANSITIONS[subOrder.status];
    if (!allowedNext.includes(newStatus)) {
      throw ApiError.badRequest(
        `Invalid status transition from "${subOrder.status}" to "${newStatus}". Allowed transitions: ${allowedNext.join(', ') || 'None'}`
      );
    }

    const timestampData: any = { status: newStatus };
    if (newStatus === 'PACKED') timestampData.packedAt = new Date();
    if (newStatus === 'SHIPPED') timestampData.shippedAt = new Date();
    if (newStatus === 'DELIVERED') timestampData.deliveredAt = new Date();

    const updated = await prisma.subOrder.update({
      where: { id: subOrderId },
      data: timestampData,
    });

    return updated;
  }

  static async cancelOrder(orderId: string, userId: string) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, customerId: userId },
      include: {
        subOrders: {
          include: { orderItems: true },
        },
      },
    });

    if (!order) {
      throw ApiError.notFound('Order not found');
    }

    // Only allow cancellation if all sub-orders are still PLACED
    const nonCancellable = order.subOrders.some((s) => s.status !== 'PLACED');
    if (nonCancellable) {
      throw ApiError.badRequest(
        'Order cannot be cancelled because one or more sub-orders are already being packed or shipped'
      );
    }

    return await prisma.$transaction(async (tx) => {
      // Restore inventory
      for (const sub of order.subOrders) {
        for (const item of sub.orderItems) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }

        await tx.subOrder.update({
          where: { id: sub.id },
          data: { status: 'CANCELLED' },
        });

        // Reverse Payout Ledger if existed
        await tx.payoutLedger.updateMany({
          where: { subOrderId: sub.id },
          data: { status: 'REFUNDED' },
        });
      }

      await tx.order.update({
        where: { id: order.id },
        data: { paymentStatus: 'REFUNDED' },
      });

      return { message: 'Order successfully cancelled and stock restored' };
    });
  }
}

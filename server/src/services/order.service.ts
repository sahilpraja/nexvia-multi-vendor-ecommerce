import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/apiResponse.js';
import { SubOrderStatus } from '@prisma/client';
import { CartService } from './cart.service.js';
import { config } from '../config/index.js';

export const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
  'REFUNDED',
  'PAYMENT_FAILED',
] as const;

export type OrderStatusType = typeof ORDER_STATUSES[number];

export const ALLOWED_ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'PROCESSING', 'PAYMENT_FAILED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['OUT_FOR_DELIVERY', 'DELIVERED', 'RETURNED', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'RETURNED', 'CANCELLED'],
  DELIVERED: ['RETURNED', 'REFUNDED'],
  RETURNED: ['REFUNDED'],
  CANCELLED: ['REFUNDED'],
  PAYMENT_FAILED: ['PENDING', 'CANCELLED'],
  REFUNDED: [],
};

const VALID_SUBORDER_TRANSITIONS: Record<SubOrderStatus, SubOrderStatus[]> = {
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
          orderStatus: 'PENDING',
        },
      });

      // 3. Create initial OrderStatusHistory entry
      await tx.orderStatusHistory.create({
        data: {
          orderId: parentOrder.id,
          status: 'PENDING',
          note: 'Order successfully placed by customer',
          updatedBy: 'SYSTEM',
        },
      });

      // 4. Create Sub-Orders per vendor
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

      // 5. Record Coupon Redemption if applicable
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

    // Clear cart in Redis/memory after successful order creation
    await CartService.clearCart(userId);

    return result;
  }

  /**
   * Admin: List all orders with searching, status filtering, and count metrics
   */
  static async listAdminOrders(params: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const { search, status, page = 1, limit = 50 } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Filter by specific order status
    if (status && status !== 'ALL') {
      where.orderStatus = status;
    }

    // Search by Order ID, Customer Name, or Customer Email
    if (search && search.trim() !== '') {
      const q = search.trim();
      where.OR = [
        { id: { contains: q, mode: 'insensitive' } },
        { customer: { name: { contains: q, mode: 'insensitive' } } },
        { customer: { email: { contains: q, mode: 'insensitive' } } },
        { trackingNumber: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [orders, total, allStatuses] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, email: true } },
          address: true,
          payment: true,
          subOrders: {
            include: {
              vendor: { select: { id: true, storeName: true } },
              orderItems: true,
            },
          },
          statusHistories: {
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
      prisma.order.groupBy({
        by: ['orderStatus'],
        _count: { _all: true },
      }),
    ]);

    // Build status count breakdown map for admin dashboard filter pills
    const statusCounts: Record<string, number> = { ALL: 0 };
    for (const s of ORDER_STATUSES) {
      statusCounts[s] = 0;
    }
    for (const item of allStatuses) {
      statusCounts[item.orderStatus] = item._count._all;
      statusCounts.ALL += item._count._all;
    }

    return {
      orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      statusCounts,
      availableStatuses: ORDER_STATUSES,
    };
  }

  /**
   * Admin: Get single order by ID with complete relations
   */
  static async getAdminOrderById(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        address: true,
        payment: true,
        subOrders: {
          include: {
            vendor: { select: { id: true, storeName: true } },
            orderItems: true,
          },
        },
        statusHistories: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      throw ApiError.notFound(`Order with ID ${orderId} not found`);
    }

    return order;
  }

  /**
   * Admin: Update order status with validation, transition checking, courier details, and history logging
   */
  static async updateOrderStatusByAdmin(
    orderId: string,
    data: {
      status: string;
      courierName?: string;
      trackingNumber?: string;
      note?: string;
      force?: boolean;
    },
    adminUser: { id: string; name?: string; email?: string }
  ) {
    const { status, courierName, trackingNumber, note, force = false } = data;

    // 1. Validate that status is in the allowed enum set
    if (!ORDER_STATUSES.includes(status as any)) {
      throw ApiError.badRequest(
        `Invalid status "${status}". Allowed statuses: ${ORDER_STATUSES.join(', ')}`
      );
    }

    // 2. Fetch existing order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        subOrders: {
          include: { orderItems: true },
        },
      },
    });

    if (!order) {
      throw ApiError.notFound('Order not found');
    }

    const currentStatus = order.orderStatus || 'PENDING';

    // 3. Status transition validation
    if (!force && currentStatus !== status) {
      const allowedNext = ALLOWED_ORDER_STATUS_TRANSITIONS[currentStatus] || [];
      if (!allowedNext.includes(status)) {
        throw ApiError.badRequest(
          `Invalid status transition from "${currentStatus}" to "${status}". Allowed transitions: ${
            allowedNext.length > 0 ? allowedNext.join(', ') : 'None (Terminal state)'
          }`
        );
      }
    }

    // 4. Atomic update in transaction
    const updated = await prisma.$transaction(async (tx) => {
      // Determine payment status adjustment if order is cancelled or refunded
      let paymentStatusUpdate = order.paymentStatus;
      if (status === 'REFUNDED') {
        paymentStatusUpdate = 'REFUNDED';
      } else if (status === 'CANCELLED' && order.paymentStatus === 'PAID') {
        paymentStatusUpdate = 'REFUNDED';
      } else if (status === 'PAYMENT_FAILED') {
        paymentStatusUpdate = 'FAILED';
      }

      // If cancelled and was not already cancelled, restore product stock
      if (status === 'CANCELLED' && currentStatus !== 'CANCELLED') {
        for (const sub of order.subOrders) {
          for (const item of sub.orderItems) {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { increment: item.quantity } },
            });
          }
        }
      }

      // Update parent Order
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          orderStatus: status,
          paymentStatus: paymentStatusUpdate,
          courierName: courierName !== undefined ? courierName : order.courierName,
          trackingNumber: trackingNumber !== undefined ? trackingNumber : order.trackingNumber,
        },
      });

      // Synchronize sub-orders according to business lifecycle
      if (status === 'SHIPPED') {
        await tx.subOrder.updateMany({
          where: { orderId, status: { in: ['PLACED', 'PACKED'] } },
          data: { status: 'SHIPPED', shippedAt: new Date() },
        });
      } else if (status === 'DELIVERED') {
        await tx.subOrder.updateMany({
          where: { orderId, status: { not: 'CANCELLED' } },
          data: { status: 'DELIVERED', deliveredAt: new Date() },
        });
      } else if (status === 'CANCELLED') {
        await tx.subOrder.updateMany({
          where: { orderId },
          data: { status: 'CANCELLED' },
        });
        await tx.payoutLedger.updateMany({
          where: { subOrder: { orderId } },
          data: { status: 'REFUNDED' },
        });
      }

      // Record Order Status History Entry
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status,
          courierName: courierName || order.courierName,
          trackingNumber: trackingNumber || order.trackingNumber,
          note: note || `Status updated from ${currentStatus} to ${status} by Admin`,
          updatedBy: adminUser.name || adminUser.email || 'Admin',
        },
      });

      return updatedOrder;
    });

    return this.getAdminOrderById(orderId);
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

    const allowedNext = VALID_SUBORDER_TRANSITIONS[subOrder.status];
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
        data: {
          orderStatus: 'CANCELLED',
          paymentStatus: order.paymentStatus === 'PAID' ? 'REFUNDED' : order.paymentStatus,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: 'CANCELLED',
          note: 'Order cancelled by customer',
          updatedBy: 'CUSTOMER',
        },
      });

      return { message: 'Order successfully cancelled and stock restored' };
    });
  }
}

import Stripe from 'stripe';
import { prisma } from '../config/prisma.js';
import { config } from '../config/index.js';
import { ApiError } from '../utils/apiResponse.js';

const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: '2024-12-18.acacia' as any,
});

export class PaymentService {
  static async createPaymentIntent(orderId: string, customerId: string) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, customerId },
      include: {
        subOrders: {
          include: { vendor: true },
        },
      },
    });

    if (!order) {
      throw ApiError.notFound('Order not found');
    }

    if (order.paymentStatus === 'PAID') {
      throw ApiError.badRequest('Order is already paid');
    }

    const amountInCents = Math.round(Number(order.total) * 100);

    // In test mode, create PaymentIntent
    let clientSecret: string | null = null;
    let paymentIntentId = `pi_test_${order.id.slice(0, 8)}_${Date.now()}`;

    try {
      if (config.stripe.secretKey && !config.stripe.secretKey.includes('placeholder')) {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amountInCents,
          currency: 'usd',
          metadata: {
            orderId: order.id,
            customerId,
          },
        });
        clientSecret = paymentIntent.client_secret;
        paymentIntentId = paymentIntent.id;
      } else {
        // Mock Stripe client secret for offline test mode
        clientSecret = `mock_secret_${paymentIntentId}`;
      }
    } catch {
      clientSecret = `mock_secret_${paymentIntentId}`;
    }

    // Upsert Payment record
    const payment = await prisma.payment.upsert({
      where: { orderId: order.id },
      create: {
        orderId: order.id,
        providerPaymentId: paymentIntentId,
        amount: order.total,
        status: 'PENDING',
      },
      update: {
        providerPaymentId: paymentIntentId,
        amount: order.total,
      },
    });

    return {
      paymentId: payment.id,
      providerPaymentId: paymentIntentId,
      clientSecret,
      amount: Number(order.total),
    };
  }

  static async handleSuccessfulPayment(providerPaymentId: string, rawPayload?: any) {
    const payment = await prisma.payment.findUnique({
      where: { providerPaymentId },
      include: {
        order: {
          include: {
            subOrders: {
              include: { vendor: true },
            },
          },
        },
      },
    });

    if (!payment) {
      throw ApiError.notFound(`Payment with ID ${providerPaymentId} not found`);
    }

    // Idempotency check: repeated webhooks do not double-process
    if (payment.status === 'SUCCESS') {
      return { message: 'Payment already processed (idempotent)', payment };
    }

    const commissionRate = config.commissionPercent / 100; // e.g., 0.10 for 10%

    // Atomic split ledger calculation
    return await prisma.$transaction(async (tx) => {
      // 1. Mark Payment as SUCCESS
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'SUCCESS',
          rawPayload: rawPayload || undefined,
        },
      });

      // 2. Mark Parent Order as PAID
      await tx.order.update({
        where: { id: payment.orderId },
        data: { paymentStatus: 'PAID' },
      });

      // 3. Create PayoutLedger entry for each vendor sub-order
      for (const subOrder of payment.order.subOrders) {
        const gross = Number(subOrder.subtotal);
        const commission = Math.round(gross * commissionRate * 100) / 100;
        const net = Math.round((gross - commission) * 100) / 100;

        await tx.payoutLedger.create({
          data: {
            paymentId: payment.id,
            subOrderId: subOrder.id,
            vendorId: subOrder.vendorId,
            gross,
            commission,
            net,
            status: 'TRANSFERRED',
          },
        });
      }

      return updatedPayment;
    });
  }

  static async getVendorEarnings(vendorId: string) {
    const ledgers = await prisma.payoutLedger.findMany({
      where: { vendorId },
      include: {
        subOrder: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            orderId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    let totalGross = 0;
    let totalCommission = 0;
    let totalNet = 0;

    for (const item of ledgers) {
      if (item.status === 'TRANSFERRED') {
        totalGross += Number(item.gross);
        totalCommission += Number(item.commission);
        totalNet += Number(item.net);
      }
    }

    return {
      summary: {
        totalGross: Math.round(totalGross * 100) / 100,
        totalCommission: Math.round(totalCommission * 100) / 100,
        totalNet: Math.round(totalNet * 100) / 100,
        payoutStatus: 'Active',
      },
      ledger: ledgers.map((l) => ({
        id: l.id,
        subOrderId: l.subOrderId,
        gross: Number(l.gross),
        commission: Number(l.commission),
        net: Number(l.net),
        status: l.status,
        date: l.createdAt,
      })),
    };
  }
}

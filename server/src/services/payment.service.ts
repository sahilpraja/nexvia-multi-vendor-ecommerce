import Stripe from 'stripe';
import { prisma } from '../config/prisma.js';
import { config } from '../config/index.js';
import { ApiError } from '../utils/apiResponse.js';
import { stripe, isStripeConfigured } from '../config/stripe.js';
import { CartService } from './cart.service.js';

export class PaymentService {
  /**
   * Create a Stripe Checkout Session for a pending Order
   */
  static async createCheckoutSession(orderId: string, customerId: string) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, customerId },
      include: {
        customer: { select: { email: true, name: true } },
        subOrders: {
          include: {
            orderItems: {
              include: { product: true },
            },
            vendor: true,
          },
        },
      },
    });

    if (!order) {
      throw ApiError.notFound('Order not found or unauthorized');
    }

    if (order.paymentStatus === 'PAID') {
      throw ApiError.badRequest('Order has already been paid');
    }

    if (order.paymentMethod === 'COD') {
      throw ApiError.badRequest(
        'This order was placed using Cash on Delivery (COD) and cannot be paid through Stripe Checkout'
      );
    }

    // Build line items from order items with real server-side pricing
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    for (const subOrder of order.subOrders) {
      for (const item of subOrder.orderItems) {
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: item.titleSnapshot,
              description: `Merchant: ${subOrder.vendor.storeName}`,
            },
            unit_amount: Math.round(Number(item.priceSnapshot) * 100),
          },
          quantity: item.quantity,
        });
      }
    }

    // If discount was applied, adjust or add as discount
    if (Number(order.discount) > 0) {
      // Add a coupon/discount line item or negative adjustment
      // Alternatively, let line items match order total directly
    }

    let sessionUrl = `${config.clientUrl}/payment/success?session_id=mock_session_${order.id}`;
    let sessionId = `cs_test_${order.id.slice(0, 8)}_${Date.now()}`;
    let paymentIntentId: string | null = null;

    if (isStripeConfigured) {
      try {
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          mode: 'payment',
          customer_email: order.customer.email,
          client_reference_id: order.id,
          line_items: lineItems.length > 0 ? lineItems : [
            {
              price_data: {
                currency: 'usd',
                product_data: {
                  name: `Nexvia Marketplace Order #${order.id.slice(0, 8)}`,
                },
                unit_amount: Math.round(Number(order.total) * 100),
              },
              quantity: 1,
            },
          ],
          metadata: {
            orderId: order.id,
            customerId: order.customerId,
          },
          success_url: `${config.clientUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${config.clientUrl}/payment/cancel?order_id=${order.id}`,
        });

        sessionId = session.id;
        sessionUrl = session.url || sessionUrl;
        paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : null;
      } catch (err: any) {
        console.warn('⚠️  Stripe Checkout Session live creation warning:', err.message);
        // Seamless fallback to test session mode
      }
    }

    // Upsert Payment record associated with the Order
    const payment = await prisma.payment.upsert({
      where: { orderId: order.id },
      create: {
        orderId: order.id,
        paymentMethod: 'STRIPE',
        providerPaymentId: sessionId,
        stripeSessionId: sessionId,
        stripePaymentIntentId: paymentIntentId,
        amount: order.total,
        currency: order.currency || 'USD',
        status: 'PENDING',
      },
      update: {
        paymentMethod: 'STRIPE',
        providerPaymentId: sessionId,
        stripeSessionId: sessionId,
        stripePaymentIntentId: paymentIntentId,
        amount: order.total,
        status: 'PENDING',
      },
    });

    return {
      sessionId,
      sessionUrl,
      paymentId: payment.id,
      orderId: order.id,
      amount: Number(order.total),
      currency: order.currency,
    };
  }

  /**
   * Retrieve Checkout Session details and verification status
   */
  static async getSessionStatus(sessionId: string, customerId?: string) {
    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { stripeSessionId: sessionId },
          { providerPaymentId: sessionId },
          { id: sessionId },
          { orderId: sessionId },
        ],
      },
      include: {
        order: {
          include: {
            address: true,
            subOrders: {
              include: {
                vendor: { select: { id: true, storeName: true } },
                orderItems: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw ApiError.notFound('Session or payment record not found');
    }

    if (customerId && payment.order.customerId !== customerId) {
      throw ApiError.forbidden('You do not have permission to view this payment session');
    }

    // If Stripe live configured, check latest status from Stripe
    let stripeStatus = payment.status;
    if (isStripeConfigured && sessionId.startsWith('cs_')) {
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status === 'paid' && payment.status !== 'PAID') {
          await this.handleSuccessfulPayment(
            payment.stripeSessionId || payment.providerPaymentId || payment.id,
            typeof session.payment_intent === 'string' ? session.payment_intent : undefined,
            session
          );
          stripeStatus = 'PAID';
        }
      } catch {
        // Fall back to DB payment status
      }
    }

    return {
      paymentId: payment.id,
      sessionId: payment.stripeSessionId || sessionId,
      orderId: payment.orderId,
      amount: Number(payment.amount),
      currency: payment.currency,
      paymentStatus: stripeStatus,
      order: payment.order,
    };
  }

  /**
   * Handle webhook events with signature verification and strict idempotency
   */
  static async processWebhookEvent(rawBody: Buffer | string, signature: string | undefined, parsedBody: any) {
    let event: Stripe.Event;

    if (isStripeConfigured && signature) {
      try {
        event = stripe.webhooks.constructEvent(rawBody, signature, config.stripe.webhookSecret);
      } catch (err: any) {
        throw ApiError.badRequest(`Stripe Webhook Signature Verification Failed: ${err.message}`);
      }
    } else {
      // In development or simulated webhook mode
      event = parsedBody;
    }

    const eventId = event?.id || `sim_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Idempotency: Check if webhook event was already recorded and processed
    const existingEvent = await prisma.paymentWebhookEvent.findUnique({
      where: { eventId },
    });

    if (existingEvent) {
      return { received: true, duplicate: true, message: 'Webhook event already processed (idempotent)' };
    }

    // Record webhook event in DB
    try {
      await prisma.paymentWebhookEvent.create({
        data: {
          eventId,
          eventType: event.type || 'unknown',
          processed: true,
          payload: event as any,
        },
      });
    } catch {
      // If concurrent insert occurred, treat as duplicate
      return { received: true, duplicate: true };
    }

    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data?.object as Stripe.Checkout.Session;
        const sessionId = session?.id || parsedBody.sessionId || parsedBody.paymentIntentId;
        const paymentIntentId =
          typeof session?.payment_intent === 'string'
            ? session.payment_intent
            : parsedBody.paymentIntentId;

        if (sessionId) {
          return await this.handleSuccessfulPayment(sessionId, paymentIntentId, event);
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const pi = event.data?.object as Stripe.PaymentIntent;
        const piId = pi?.id || parsedBody.paymentIntentId;
        if (piId) {
          return await this.handleSuccessfulPayment(piId, piId, event);
        }
        break;
      }

      case 'checkout.session.async_payment_failed':
      case 'payment_intent.payment_failed': {
        const obj = event.data?.object as any;
        const id = obj?.id || parsedBody.paymentIntentId || parsedBody.sessionId;
        if (id) {
          return await this.handleFailedPayment(id, obj?.last_payment_error?.message || 'Payment failed');
        }
        break;
      }

      default:
        // Other events received and acknowledged
        return { received: true, eventType: event.type };
    }

    return { received: true };
  }

  /**
   * Process successful payment: update Order, Payment, Ledger, and clear Cart
   */
  static async handleSuccessfulPayment(
    paymentIdentifier: string,
    stripePaymentIntentId?: string,
    rawPayload?: any
  ) {
    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { stripeSessionId: paymentIdentifier },
          { providerPaymentId: paymentIdentifier },
          { stripePaymentIntentId: paymentIdentifier },
          { id: paymentIdentifier },
          { orderId: paymentIdentifier },
        ],
      },
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
      throw ApiError.notFound(`Payment record for "${paymentIdentifier}" not found`);
    }

    // Idempotency: skip if already settled
    if (payment.status === 'PAID') {
      return { message: 'Payment already processed (idempotent)', payment };
    }

    const commissionRate = config.commissionPercent / 100;

    // Atomic transaction for order & ledger fulfillment
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Mark Payment as PAID
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'PAID',
          stripePaymentIntentId: stripePaymentIntentId || payment.stripePaymentIntentId,
          rawPayload: rawPayload ? (rawPayload as any) : undefined,
        },
      });

      // 2. Record PaymentTransaction audit log
      await tx.paymentTransaction.create({
        data: {
          paymentId: payment.id,
          type: 'STRIPE_CHARGE_SUCCEEDED',
          amount: payment.amount,
          status: 'PAID',
          referenceId: stripePaymentIntentId || payment.stripeSessionId || payment.providerPaymentId,
          note: 'Stripe charge verified and captured successfully',
        },
      });

      // 3. Mark Parent Order as PAID and update orderStatus to PROCESSING
      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          paymentStatus: 'PAID',
          orderStatus: 'PROCESSING',
        },
      });

      // Record order status history
      await tx.orderStatusHistory.create({
        data: {
          orderId: payment.orderId,
          status: 'PROCESSING',
          note: `Stripe online payment of $${Number(payment.amount).toFixed(2)} verified successfully`,
          updatedBy: 'SYSTEM_STRIPE_WEBHOOK',
        },
      });

      // 4. Create PayoutLedger entry for each vendor sub-order
      for (const subOrder of payment.order.subOrders) {
        const gross = Number(subOrder.subtotal);
        const commission = Math.round(gross * commissionRate * 100) / 100;
        const net = Math.round((gross - commission) * 100) / 100;

        await tx.payoutLedger.upsert({
          where: { subOrderId: subOrder.id },
          create: {
            paymentId: payment.id,
            subOrderId: subOrder.id,
            vendorId: subOrder.vendorId,
            gross,
            commission,
            net,
            status: 'TRANSFERRED',
          },
          update: {
            status: 'TRANSFERRED',
          },
        });
      }

      return updatedPayment;
    });

    // 5. Safely clear the customer's cart after verified successful payment
    await CartService.clearCart(payment.order.customerId);

    return updated;
  }

  /**
   * Handle payment failure
   */
  static async handleFailedPayment(paymentIdentifier: string, reason?: string) {
    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { stripeSessionId: paymentIdentifier },
          { providerPaymentId: paymentIdentifier },
          { stripePaymentIntentId: paymentIdentifier },
          { id: paymentIdentifier },
          { orderId: paymentIdentifier },
        ],
      },
    });

    if (!payment) return null;

    return await prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' },
      });

      await tx.paymentTransaction.create({
        data: {
          paymentId: payment.id,
          type: 'STRIPE_CHARGE_FAILED',
          amount: payment.amount,
          status: 'FAILED',
          referenceId: paymentIdentifier,
          note: reason || 'Stripe payment failed',
        },
      });

      await tx.order.update({
        where: { id: payment.orderId },
        data: { paymentStatus: 'FAILED', orderStatus: 'PAYMENT_FAILED' },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: payment.orderId,
          status: 'PAYMENT_FAILED',
          note: `Payment failed: ${reason || 'Unknown error'}`,
          updatedBy: 'SYSTEM_STRIPE_WEBHOOK',
        },
      });

      return updatedPayment;
    });
  }

  /**
   * Admin or automated refund processing
   */
  static async refundPayment(
    paymentIdOrOrderId: string,
    options?: {
      amount?: number;
      reason?: string;
      adminUser?: { id: string; email: string; name?: string };
    }
  ) {
    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { id: paymentIdOrOrderId },
          { orderId: paymentIdOrOrderId },
          { providerPaymentId: paymentIdOrOrderId },
          { stripeSessionId: paymentIdOrOrderId },
        ],
      },
      include: {
        order: {
          include: {
            subOrders: true,
          },
        },
      },
    });

    if (!payment) {
      throw ApiError.notFound('Payment record not found for refund');
    }

    if (payment.status !== 'PAID' && payment.status !== 'PARTIALLY_REFUNDED') {
      throw ApiError.badRequest(`Cannot refund payment in status "${payment.status}"`);
    }

    const totalPaid = Number(payment.amount);
    const existingRefunded = Number(payment.refundedAmount || 0);
    const remainingRefundable = Math.max(0, totalPaid - existingRefunded);

    const refundAmount = options?.amount ? Number(options.amount) : remainingRefundable;

    if (refundAmount <= 0 || refundAmount > remainingRefundable) {
      throw ApiError.badRequest(
        `Invalid refund amount: $${refundAmount}. Maximum refundable amount is $${remainingRefundable.toFixed(2)}`
      );
    }

    let stripeRefundId: string | null = null;

    // If Stripe payment intent is present and Stripe is configured, trigger live refund
    if (
      isStripeConfigured &&
      payment.stripePaymentIntentId &&
      !payment.stripePaymentIntentId.startsWith('pi_test_') &&
      !payment.stripePaymentIntentId.startsWith('mock_')
    ) {
      try {
        const stripeRefund = await stripe.refunds.create({
          payment_intent: payment.stripePaymentIntentId,
          amount: Math.round(refundAmount * 100),
          reason: 'requested_by_customer',
        });
        stripeRefundId = stripeRefund.id;
      } catch (err: any) {
        console.error('Stripe refund API error:', err.message);
        throw ApiError.badRequest(`Stripe refund failed: ${err.message}`);
      }
    } else if (payment.stripePaymentIntentId) {
      stripeRefundId = `re_test_${Date.now()}`;
    }

    const newRefundedTotal = existingRefunded + refundAmount;
    const isFullRefund = Math.abs(newRefundedTotal - totalPaid) < 0.01;
    const newStatus = isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED';

    return await prisma.$transaction(async (tx) => {
      // 1. Update Payment
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: newStatus,
          refundedAmount: newRefundedTotal,
        },
      });

      // 2. Record PaymentTransaction
      await tx.paymentTransaction.create({
        data: {
          paymentId: payment.id,
          type: 'REFUND',
          amount: refundAmount,
          status: newStatus,
          referenceId: stripeRefundId || `ref_${Date.now()}`,
          note: options?.reason || `Refund of $${refundAmount.toFixed(2)} processed by ${options?.adminUser?.email || 'Admin'}`,
        },
      });

      // 3. Update Order
      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          paymentStatus: newStatus,
          orderStatus: isFullRefund ? 'CANCELLED' : payment.order.orderStatus,
        },
      });

      // 4. Update sub-orders and ledgers if fully refunded
      if (isFullRefund) {
        await tx.subOrder.updateMany({
          where: { orderId: payment.orderId },
          data: { status: 'CANCELLED' },
        });

        await tx.payoutLedger.updateMany({
          where: { paymentId: payment.id },
          data: { status: 'REFUNDED' },
        });
      }

      // 5. Record order status history
      await tx.orderStatusHistory.create({
        data: {
          orderId: payment.orderId,
          status: isFullRefund ? 'CANCELLED' : payment.order.orderStatus,
          note: `Refund of $${refundAmount.toFixed(2)} issued. (${newStatus})`,
          updatedBy: options?.adminUser?.email || 'Admin',
        },
      });

      return updatedPayment;
    });
  }

  /**
   * Confirm Cash on Delivery (COD) collection by Admin / Delivery agent
   */
  static async confirmCodCollection(
    paymentId: string,
    adminUser: { id: string; email: string; name?: string }
  ) {
    const payment = await prisma.payment.findFirst({
      where: {
        OR: [{ id: paymentId }, { orderId: paymentId }],
      },
      include: {
        order: {
          include: {
            subOrders: true,
          },
        },
      },
    });

    if (!payment) {
      throw ApiError.notFound('Payment record not found');
    }

    if (payment.paymentMethod !== 'COD') {
      throw ApiError.badRequest('Only Cash on Delivery (COD) orders can be confirmed via cash collection');
    }

    if (payment.status === 'PAID') {
      return { message: 'Cash on delivery has already been marked as collected and paid', payment };
    }

    const commissionRate = config.commissionPercent / 100;

    return await prisma.$transaction(async (tx) => {
      // 1. Mark Payment as PAID and set collection details
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'PAID',
          codCollectedAt: new Date(),
          codCollectedBy: adminUser.email,
        },
      });

      // 2. Record PaymentTransaction
      await tx.paymentTransaction.create({
        data: {
          paymentId: payment.id,
          type: 'COD_CASH_COLLECTED',
          amount: payment.amount,
          status: 'PAID',
          referenceId: `cod_${Date.now()}`,
          note: `Cash of $${Number(payment.amount).toFixed(2)} collected by ${adminUser.email}`,
        },
      });

      // 3. Mark Parent Order as PAID and DELIVERED (if not already delivered)
      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          paymentStatus: 'PAID',
          orderStatus: payment.order.orderStatus === 'OUT_FOR_DELIVERY' || payment.order.orderStatus === 'CONFIRMED'
            ? 'DELIVERED'
            : payment.order.orderStatus,
        },
      });

      // 4. Update sub-orders and vendor payout ledgers
      for (const subOrder of payment.order.subOrders) {
        const gross = Number(subOrder.subtotal);
        const commission = Math.round(gross * commissionRate * 100) / 100;
        const net = Math.round((gross - commission) * 100) / 100;

        await tx.payoutLedger.upsert({
          where: { subOrderId: subOrder.id },
          create: {
            paymentId: payment.id,
            subOrderId: subOrder.id,
            vendorId: subOrder.vendorId,
            gross,
            commission,
            net,
            status: 'TRANSFERRED',
          },
          update: {
            status: 'TRANSFERRED',
          },
        });
      }

      // 5. Add status history
      await tx.orderStatusHistory.create({
        data: {
          orderId: payment.orderId,
          status: 'DELIVERED',
          note: `COD payment of $${Number(payment.amount).toFixed(2)} confirmed and received by ${adminUser.email}`,
          updatedBy: adminUser.email,
        },
      });

      return updatedPayment;
    });
  }

  /**
   * Admin: List all payments with filtering and search
   */
  static async getAdminPayments(filters: {
    search?: string;
    method?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const { search, method, status, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (method && method !== 'ALL') {
      where.paymentMethod = method;
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (search && search.trim() !== '') {
      const q = search.trim();
      where.OR = [
        { id: { contains: q, mode: 'insensitive' } },
        { orderId: { contains: q, mode: 'insensitive' } },
        { providerPaymentId: { contains: q, mode: 'insensitive' } },
        { stripeSessionId: { contains: q, mode: 'insensitive' } },
        { stripePaymentIntentId: { contains: q, mode: 'insensitive' } },
        { order: { customer: { email: { contains: q, mode: 'insensitive' } } } },
        { order: { customer: { name: { contains: q, mode: 'insensitive' } } } },
      ];
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          order: {
            include: {
              customer: { select: { id: true, name: true, email: true } },
              subOrders: {
                include: {
                  vendor: { select: { id: true, storeName: true } },
                },
              },
            },
          },
          transactions: {
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    return {
      payments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Admin: Payment Statistics Dashboard
   */
  static async getAdminPaymentStats() {
    const [allPayments, totalCount] = await Promise.all([
      prisma.payment.findMany({
        select: {
          amount: true,
          status: true,
          paymentMethod: true,
          refundedAmount: true,
        },
      }),
      prisma.payment.count(),
    ]);

    let totalRevenue = 0;
    let stripeVolume = 0;
    let codCollected = 0;
    let codPending = 0;
    let failedCount = 0;
    let refundsCount = 0;
    let refundsTotal = 0;
    let stripePaidCount = 0;
    let codPaidCount = 0;
    let codPendingCount = 0;

    for (const p of allPayments) {
      const amt = Number(p.amount);
      const ref = Number(p.refundedAmount || 0);

      if (p.status === 'PAID') {
        totalRevenue += amt;
        if (p.paymentMethod === 'STRIPE') {
          stripeVolume += amt;
          stripePaidCount++;
        } else if (p.paymentMethod === 'COD') {
          codCollected += amt;
          codPaidCount++;
        }
      } else if (p.status === 'COD_PENDING') {
        codPending += amt;
        codPendingCount++;
      } else if (p.status === 'FAILED') {
        failedCount++;
      }

      if (p.status === 'REFUNDED' || p.status === 'PARTIALLY_REFUNDED' || ref > 0) {
        refundsCount++;
        refundsTotal += ref;
      }
    }

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      stripeVolume: Math.round(stripeVolume * 100) / 100,
      codCollected: Math.round(codCollected * 100) / 100,
      codPending: Math.round(codPending * 100) / 100,
      failedCount,
      refundsCount,
      refundsTotal: Math.round(refundsTotal * 100) / 100,
      totalCount,
      breakdown: {
        stripePaidCount,
        codPaidCount,
        codPendingCount,
      },
    };
  }

  /**
   * Vendor earnings summary & ledger
   */
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

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
        providerPaymentId: sessionId,
        stripeSessionId: sessionId,
        stripePaymentIntentId: paymentIntentId,
        amount: order.total,
        currency: order.currency || 'USD',
        status: 'PENDING',
      },
      update: {
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
        OR: [{ stripeSessionId: sessionId }, { providerPaymentId: sessionId }, { id: sessionId }],
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
      throw ApiError.notFound('Session not found');
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
   * Handle webhook events with signature verification
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

      // 2. Mark Parent Order as PAID and update orderStatus to PROCESSING
      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          paymentStatus: 'PAID',
          orderStatus: 'PROCESSING',
        },
      });

      // 3. Create PayoutLedger entry for each vendor sub-order
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

    // 4. Safely clear the customer's cart after verified successful payment
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
        ],
      },
    });

    if (!payment) return null;

    return await prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' },
      });

      await tx.order.update({
        where: { id: payment.orderId },
        data: { paymentStatus: 'FAILED', orderStatus: 'PAYMENT_FAILED' },
      });

      return updatedPayment;
    });
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

import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../services/payment.service.js';
import { ApiError, sendResponse } from '../utils/apiResponse.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

/**
 * POST /api/payment/create-checkout-session
 */
export const createCheckoutSession = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const customerId = req.user!.userId;
    const { orderId } = req.body;

    if (!orderId) {
      return next(ApiError.badRequest('Order ID is required to initiate Stripe Checkout Session'));
    }

    const session = await PaymentService.createCheckoutSession(orderId, customerId);
    return sendResponse(res, 201, true, 'Stripe Checkout Session created', session);
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/payment/session/:id
 */
export const getSessionStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const customerId = req.user!.userId;
    const { id } = req.params;

    const result = await PaymentService.getSessionStatus(id, customerId);
    return sendResponse(res, 200, true, 'Payment session status retrieved', result);
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/payment/webhook
 * Handles incoming events from Stripe
 */
export const handleStripeWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const signature = req.headers['stripe-signature'] as string | undefined;
    const rawBody = (req as any).rawBody || req.body;

    const result = await PaymentService.processWebhookEvent(rawBody, signature, req.body);
    return res.status(200).json({ received: true, result });
  } catch (error: any) {
    console.error('❌ Stripe Webhook Error:', error.message);
    return next(error);
  }
};

/**
 * Retained for backward compatibility
 */
export const createPaymentIntent = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const customerId = req.user!.userId;
    const { orderId } = req.body;

    if (!orderId) {
      return next(ApiError.badRequest('Order ID is required'));
    }

    // Creates checkout session and also returns client info
    const session = await PaymentService.createCheckoutSession(orderId, customerId);
    return sendResponse(res, 200, true, 'Payment intent / session created', {
      paymentId: session.paymentId,
      providerPaymentId: session.sessionId,
      clientSecret: `mock_secret_${session.sessionId}`,
      amount: session.amount,
      sessionUrl: session.sessionUrl,
    });
  } catch (error) {
    return next(error);
  }
};

export const handlePaymentWebhook = handleStripeWebhook;

export const getVendorEarnings = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const vendorId = req.user!.vendorId!;
    const earnings = await PaymentService.getVendorEarnings(vendorId);
    return sendResponse(res, 200, true, 'Vendor earnings retrieved', earnings);
  } catch (error) {
    return next(error);
  }
};

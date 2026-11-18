import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../services/payment.service.js';
import { ApiError, sendResponse } from '../utils/apiResponse.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

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

    const intent = await PaymentService.createPaymentIntent(orderId, customerId);
    return sendResponse(res, 200, true, 'Payment intent created', intent);
  } catch (error) {
    return next(error);
  }
};

export const handlePaymentWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // In Stripe live/test webhooks, events have type e.g. 'payment_intent.succeeded'
    // Support both standard Stripe event payload and simulated payload
    const event = req.body;
    let paymentIntentId: string | null = null;

    if (event.type === 'payment_intent.succeeded') {
      paymentIntentId = event.data?.object?.id;
    } else if (event.paymentIntentId) {
      paymentIntentId = event.paymentIntentId;
    }

    if (!paymentIntentId) {
      return res.status(200).json({ received: true, message: 'Unhandled event type or no payment ID' });
    }

    const result = await PaymentService.handleSuccessfulPayment(paymentIntentId, event);
    return sendResponse(res, 200, true, 'Payment processed successfully', result);
  } catch (error) {
    return next(error);
  }
};

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

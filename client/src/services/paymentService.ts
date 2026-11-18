import { api } from '../api/client.js';

export interface CheckoutSessionResponse {
  sessionId: string;
  sessionUrl: string;
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
}

export interface SessionStatusResponse {
  paymentId: string;
  sessionId: string;
  orderId: string;
  amount: number;
  currency: string;
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  order: any;
}

export const paymentService = {
  createCheckoutSession: async (orderId: string): Promise<CheckoutSessionResponse> => {
    const res = await api.post('/payment/create-checkout-session', { orderId });
    return res.data.data;
  },

  getSessionStatus: async (sessionId: string): Promise<SessionStatusResponse> => {
    const res = await api.get(`/payment/session/${sessionId}`);
    return res.data.data;
  },

  simulateSuccessfulWebhook: async (sessionId: string): Promise<any> => {
    const res = await api.post('/payment/webhook', {
      type: 'checkout.session.completed',
      sessionId,
      data: {
        object: {
          id: sessionId,
          payment_status: 'paid',
        },
      },
    });
    return res.data;
  },
};

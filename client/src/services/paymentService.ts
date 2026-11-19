import { api } from '../api/client.js';
import { PaymentStatus, PaymentMethod } from '../types/index.js';

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
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  order: any;
}

export const paymentService = {
  createCheckoutSession: async (orderId: string): Promise<CheckoutSessionResponse> => {
    const res = await api.post('/payment/create-checkout-session', { orderId });
    return res.data.data;
  },

  getSessionStatus: async (sessionIdOrOrderId: string): Promise<SessionStatusResponse> => {
    const res = await api.get(`/payment/session/${sessionIdOrOrderId}`);
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

  // Admin APIs
  getAdminPayments: async (params?: {
    search?: string;
    method?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    payments: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> => {
    const res = await api.get('/admin/payments', { params });
    return res.data.data;
  },

  getAdminPaymentStats: async (): Promise<{
    totalRevenue: number;
    stripeVolume: number;
    codCollected: number;
    codPending: number;
    failedCount: number;
    refundsCount: number;
    refundsTotal: number;
    totalCount: number;
    breakdown: {
      stripePaidCount: number;
      codPaidCount: number;
      codPendingCount: number;
    };
  }> => {
    const res = await api.get('/admin/payments/stats');
    return res.data.data;
  },

  confirmCodCollection: async (paymentId: string): Promise<any> => {
    const res = await api.post(`/admin/payments/${paymentId}/confirm-cod`);
    return res.data.data;
  },

  refundPayment: async (
    paymentId: string,
    data?: { amount?: number; reason?: string }
  ): Promise<any> => {
    const res = await api.post(`/admin/payments/${paymentId}/refund`, data);
    return res.data.data;
  },
};

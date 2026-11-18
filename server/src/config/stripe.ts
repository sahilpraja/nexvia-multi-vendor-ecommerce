import Stripe from 'stripe';
import { config } from './index.js';

const isStripeConfigured = Boolean(
  config.stripe.secretKey &&
  !config.stripe.secretKey.includes('placeholder') &&
  config.stripe.secretKey.startsWith('sk_')
);

export const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: '2024-12-18.acacia' as any,
  typescript: true,
});

export { isStripeConfigured };

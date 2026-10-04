import type { PaymentLauncher } from '@/features/upi/services/payment-launcher-types';

/** Web (and any other platform): UPI apps can't be launched. */
export const paymentLauncher: PaymentLauncher = {
  getAvailableProviders: async () => [],
  launchUPIPayment: async () => ({ outcome: 'unsupported' }),
};

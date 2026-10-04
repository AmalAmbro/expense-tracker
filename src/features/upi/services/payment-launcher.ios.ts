import * as Linking from 'expo-linking';

import { UPI_PROVIDERS } from '@/features/upi/providers';
import type { PaymentLauncher } from '@/features/upi/services/payment-launcher-types';
import { buildUpiPaymentLink } from '@/features/upi/utils/upi-link';

/**
 * iOS: opens the chosen app through its URL scheme. iOS has no app chooser and apps
 * don't report a result back, so the user always confirms the outcome themselves.
 */
export const paymentLauncher: PaymentLauncher = {
  getAvailableProviders: async () =>
    UPI_PROVIDERS.filter((provider) => provider.iosLinkBase !== null),

  async launchUPIPayment(request, provider) {
    if (!provider.iosLinkBase) return { outcome: 'unsupported' };
    try {
      await Linking.openURL(buildUpiPaymentLink(request, provider.iosLinkBase));
    } catch {
      // openURL rejects when no installed app handles the scheme.
      return { outcome: 'not-installed' };
    }
    return { outcome: 'returned', response: null };
  },
};

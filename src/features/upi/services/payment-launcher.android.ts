import { UpiIntent } from '../../../../modules/upi-intent';

import { providerIdForPackage } from '@/features/upi/providers';
import type { PaymentLauncher } from '@/features/upi/services/payment-launcher-types';
import { buildUpiPaymentLink, parseUpiResponse } from '@/features/upi/utils/upi-link';

/**
 * Android: lists the UPI apps actually installed and opens the chosen one directly
 * (Intent.setPackage, via the local upi-intent module), for a result.
 */
export const paymentLauncher: PaymentLauncher = {
  async getAvailableProviders() {
    if (!UpiIntent) return [];
    const apps = await UpiIntent.getUpiApps();
    return apps
      .map(({ packageName, label, icon }) => ({
        id: providerIdForPackage(packageName),
        name: label,
        androidPackage: packageName,
        iosLinkBase: null,
        icon,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  async launchUPIPayment(request, provider) {
    if (!UpiIntent) return { outcome: 'unsupported' };

    let result;
    try {
      result = await UpiIntent.startPayment(buildUpiPaymentLink(request), provider.androidPackage);
    } catch (err) {
      if ((err as { code?: string }).code === 'E_UPI_APP_NOT_FOUND') {
        return { outcome: 'not-installed' };
      }
      throw err;
    }

    // Backing out of the app returns no reply, which leaves the status unknown.
    const response = result.response ?? (result.status ? `Status=${result.status}` : null);
    return { outcome: 'returned', response: response ? parseUpiResponse(response) : null };
  },
};

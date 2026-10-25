import type { UpiProvider } from '@/features/upi/providers';
import type { UpiAppResponse, UpiPaymentRequest } from '@/features/upi/utils/upi-link';
import type { ScannedUpiQr } from '@/features/upi/utils/upi-qr';

/** A payment to launch; when it came from a QR code, the QR's own link is used. */
export type UpiLaunchRequest = UpiPaymentRequest & { qr?: ScannedUpiQr | null };

/**
 * - returned: the UPI app was opened and the user came back. `response` is what the
 *   app reported (Android only); it is a hint, not proof of payment.
 * - not-installed: the chosen app isn't available, so nothing was sent.
 * - unsupported: this platform (or this build of the app) can't launch UPI payments.
 */
export type UpiLaunchResult =
  | { outcome: 'returned'; response: UpiAppResponse | null }
  | { outcome: 'not-installed' }
  | { outcome: 'unsupported' };

/**
 * Launches UPI apps; never processes payments itself. Platform-specific
 * implementations live in payment-launcher.{android,ios,}.ts.
 */
export type PaymentLauncher = {
  /**
   * Providers to offer. On Android these are the UPI apps actually installed; on iOS a
   * known list, since iOS can't be asked (installation is checked at launch).
   */
  getAvailableProviders(): Promise<UpiProvider[]>;
  launchUPIPayment(request: UpiLaunchRequest, provider: UpiProvider): Promise<UpiLaunchResult>;
};

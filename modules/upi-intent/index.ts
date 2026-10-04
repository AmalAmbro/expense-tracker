import { requireOptionalNativeModule } from 'expo';

export type UpiApp = {
  packageName: string;
  label: string;
  /** App icon as a PNG data URI (96×96), or null if unavailable. */
  icon: string | null;
};

export type UpiPaymentResult = {
  resultCode: number;
  /** e.g. "txnId=…&responseCode=00&Status=SUCCESS&txnRef=…" */
  response?: string;
  status?: string;
};

type UpiIntentNativeModule = {
  getUpiApps(): Promise<UpiApp[]>;
  startPayment(uri: string, packageName: string | null): Promise<UpiPaymentResult>;
};

/**
 * Android-only native module (modules/upi-intent/android). Null on other platforms, and
 * on Android builds made before the module was added, so callers can degrade gracefully
 * instead of crashing at startup.
 */
export const UpiIntent = requireOptionalNativeModule<UpiIntentNativeModule>('UpiIntent');

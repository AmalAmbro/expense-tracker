// Builds and reads UPI deep links (NPCI "UPI linking specification"). Pure functions.

/** A payee UPI ID (VPA), e.g. "corner.bakery@okaxis". */
const VPA_PATTERN = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,63}$/;

export function isValidVpa(vpa: string): boolean {
  return VPA_PATTERN.test(vpa.trim());
}

/** UPI amounts are rupees with exactly two decimals: 20000 paise → "200.00". */
export function formatUpiAmount(paise: number): string {
  if (!Number.isInteger(paise) || paise <= 0) {
    throw new Error('Amount must be a positive integer (paise)');
  }
  return `${Math.floor(paise / 100)}.${String(paise % 100).padStart(2, '0')}`;
}

export type UpiPaymentRequest = {
  /** Payee UPI ID (VPA). */
  payeeVpa: string;
  payeeName: string | null;
  /** Integer paise. */
  amount: number;
  /** Shown to the payer and payee, e.g. "Lunch". */
  note: string | null;
  /**
   * Merchant transaction reference (`tr`). Only for merchant payments that also carry
   * their merchant details (e.g. from a shop's QR code): UPI apps reject a `tr` without
   * them, typically with a misleading "limit exceeded" error. Null for a typed-in UPI ID.
   */
  transactionReference: string | null;
};

/**
 * Builds a UPI payment link. `base` is "upi://pay" for the generic intent, or an
 * app-specific prefix on iOS (e.g. "phonepe://pay").
 */
export function buildUpiPaymentLink(request: UpiPaymentRequest, base = 'upi://pay'): string {
  if (!isValidVpa(request.payeeVpa)) {
    throw new Error(`Invalid UPI ID: "${request.payeeVpa}"`);
  }
  const params: [string, string][] = [
    ['pa', request.payeeVpa.trim()],
    ['pn', request.payeeName?.trim() || request.payeeVpa.trim()],
    ['am', formatUpiAmount(request.amount)],
    ['cu', 'INR'],
  ];
  if (request.transactionReference) params.push(['tr', request.transactionReference]);
  const note = request.note?.trim();
  if (note) params.push(['tn', note]);

  const query = params.map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&');
  return `${base}?${query}`;
}

/** What the UPI app said happened. Never proof of payment on its own. */
export type UpiAppStatus = 'success' | 'failure' | 'submitted' | 'unknown';

export type UpiAppResponse = {
  status: UpiAppStatus;
  transactionId: string | null;
  responseCode: string | null;
  approvalReference: string | null;
  transactionReference: string | null;
};

/**
 * Parses the response string a UPI app returns on Android, e.g.
 * "txnId=AXI123&responseCode=00&Status=SUCCESS&txnRef=ET123". Keys are matched
 * case-insensitively because apps differ.
 */
export function parseUpiResponse(response: string | null | undefined): UpiAppResponse {
  const fields = new Map<string, string>();
  for (const pair of (response ?? '').split('&')) {
    const separator = pair.indexOf('=');
    if (separator <= 0) continue;
    const key = pair.slice(0, separator).trim().toLowerCase();
    let value = pair.slice(separator + 1).trim();
    try {
      value = decodeURIComponent(value);
    } catch {
      // Keep the raw value if it isn't valid percent-encoding.
    }
    fields.set(key, value);
  }

  const rawStatus = (fields.get('status') ?? '').toUpperCase();
  const status: UpiAppStatus =
    rawStatus === 'SUCCESS'
      ? 'success'
      : rawStatus === 'FAILURE' || rawStatus === 'FAILED'
        ? 'failure'
        : rawStatus === 'SUBMITTED' || rawStatus === 'PENDING'
          ? 'submitted'
          : 'unknown';

  const field = (key: string) => fields.get(key) || null;
  return {
    status,
    transactionId: field('txnid'),
    responseCode: field('responsecode'),
    approvalReference: field('approvalrefno'),
    transactionReference: field('txnref'),
  };
}

/**
 * A unique, alphanumeric transaction reference (UPI allows at most 35 characters),
 * e.g. "ET1791060000000A1B2C3D4". `randomHex` is injected so tests are deterministic.
 */
export function createTransactionReference(now: Date, randomHex: string): string {
  const suffix = randomHex
    .replace(/[^a-fA-F0-9]/g, '')
    .slice(0, 8)
    .toUpperCase();
  return `ET${now.getTime()}${suffix}`;
}

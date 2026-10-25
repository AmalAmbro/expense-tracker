import {
  buildUpiPaymentLink,
  formatUpiAmount,
  isValidVpa,
  type UpiPaymentRequest,
} from '@/features/upi/utils/upi-link';
import { parseAmountToPaise } from '@/utils/money';

/** A UPI payment QR code, parsed. Pure data — no I/O. */
export type ScannedUpiQr = {
  /** The QR contents, exactly as scanned. */
  raw: string;
  payeeVpa: string;
  payeeName: string | null;
  /** Amount in paise set by the QR (a "dynamic" QR), or null for a static QR. */
  amount: number | null;
  /** When true the payer can't change the amount (QR sets `am` without a minimum `mam`). */
  amountIsFixed: boolean;
  note: string | null;
  /** Merchant category code (`mc`); present on merchant QRs. */
  merchantCode: string | null;
  transactionReference: string | null;
  isMerchant: boolean;
  /** Every query parameter in original order, values still percent-encoded. */
  params: [string, string][];
};

export type UpiQrParseResult = { ok: true; qr: ScannedUpiQr } | { ok: false; error: string };

const EMV_QR_PREFIX = '000201';

function decode(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value;
  }
}

/** Parses a scanned QR code as a UPI payment request ("upi://pay?pa=…"). */
export function parseUpiQr(data: string): UpiQrParseResult {
  const raw = data.trim();
  const fail = (error: string): UpiQrParseResult => ({ ok: false, error });

  if (raw.startsWith(EMV_QR_PREFIX)) {
    return fail(
      'This is a Bharat QR code, which isn’t supported yet. Use the UPI QR if the shop has one.',
    );
  }
  const match = /^upi:\/\/([^/?#]*)\/?\?(.*)$/is.exec(raw);
  if (!match) {
    return fail('This isn’t a UPI payment QR code.');
  }
  if (match[1].toLowerCase() !== 'pay') {
    return fail('Only UPI payment QR codes are supported (not autopay or mandates).');
  }

  const params: [string, string][] = [];
  const firstValue = new Map<string, string>();
  for (const pair of match[2].split('&')) {
    if (!pair) continue;
    const separator = pair.indexOf('=');
    const key = (separator === -1 ? pair : pair.slice(0, separator)).trim();
    const value = separator === -1 ? '' : pair.slice(separator + 1).trim();
    if (!key) continue;
    params.push([key, value]);
    const lower = key.toLowerCase();
    if (!firstValue.has(lower)) firstValue.set(lower, decode(value).trim());
  }
  const get = (key: string) => firstValue.get(key) || null;

  const payeeVpa = get('pa');
  if (!payeeVpa || !isValidVpa(payeeVpa)) {
    return fail('This QR code doesn’t contain a valid UPI ID.');
  }
  const currency = get('cu');
  if (currency && currency.toUpperCase() !== 'INR') {
    return fail(`This QR code asks for ${currency}, but only INR is supported.`);
  }

  let amount: number | null = null;
  const amountText = get('am');
  if (amountText && !/^0+(\.0+)?$/.test(amountText)) {
    try {
      amount = parseAmountToPaise(amountText);
    } catch {
      return fail(`This QR code has an invalid amount (“${amountText}”).`);
    }
  }

  const merchantCode = get('mc');
  return {
    ok: true,
    qr: {
      raw,
      payeeVpa,
      payeeName: get('pn'),
      amount,
      amountIsFixed: amount !== null && !get('mam'),
      note: get('tn'),
      merchantCode,
      transactionReference: get('tr'),
      isMerchant: merchantCode !== null && !/^0+$/.test(merchantCode),
      params,
    },
  };
}

/**
 * Rebuilds the scanned QR's link for launching, changing as little as possible: all of
 * the merchant's parameters (mc, tr, mode, sign, …) pass through untouched, and only the
 * amount is set when the QR leaves it to the payer. A QR with a fixed amount is unchanged.
 */
export function buildUpiLinkFromQr(qr: ScannedUpiQr, amount: number, base = 'upi://pay'): string {
  if (qr.amountIsFixed && qr.amount !== amount) {
    throw new Error('This QR code has a fixed amount that can’t be changed');
  }
  const formattedAmount = encodeURIComponent(formatUpiAmount(amount));
  let params = qr.params;
  if (!qr.amountIsFixed) {
    const hasAmount = params.some(([key]) => key.toLowerCase() === 'am');
    params = hasAmount
      ? params.map(([key, value]) =>
          key.toLowerCase() === 'am' ? [key, formattedAmount] : [key, value],
        )
      : [...params, ['am', formattedAmount]];
  }
  if (!params.some(([key]) => key.toLowerCase() === 'cu')) {
    params = [...params, ['cu', 'INR']];
  }
  return `${base}?${params.map(([key, value]) => `${key}=${value}`).join('&')}`;
}

/** The link to launch for a request: the scanned QR's own link, or one built from scratch. */
export function buildLaunchLink(
  request: UpiPaymentRequest & { qr?: ScannedUpiQr | null },
  base = 'upi://pay',
): string {
  return request.qr
    ? buildUpiLinkFromQr(request.qr, request.amount, base)
    : buildUpiPaymentLink(request, base);
}

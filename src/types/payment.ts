export const PAYMENT_STATUSES = ['initiated', 'confirmed', 'failed', 'unknown'] as const;

/**
 * Launching a payment app doesn't prove the payment happened, so a payment starts as
 * `initiated` and only becomes `confirmed` when the user confirms it. Manually recorded
 * payments are `confirmed`.
 */
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** The actual money movement. One payment may cover several expense items. */
export type Payment = {
  id: string;
  /** Integer paise. */
  amount: number;
  /** ISO date, e.g. "2026-10-01". */
  date: string;
  paymentMethodId: string;
  /** Payment app or card provider, e.g. "gpay". */
  provider: string | null;
  merchantName: string | null;
  /** UPI ID (VPA) of the payee. */
  merchantVpa: string | null;
  status: PaymentStatus;
  /** Transaction reference from the provider, if known. */
  reference: string | null;
  notes: string | null;
  /** ISO timestamp. */
  createdAt: string;
  /** ISO timestamp. */
  updatedAt: string;
};

export type NewPayment = Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>;

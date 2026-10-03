import { addPaise, subtractPaise } from '@/utils/money';

/**
 * - unallocated: no items yet
 * - partial: items cover less than the payment
 * - allocated: items exactly match the payment
 * - over-allocated: items exceed the payment (a discrepancy to show, never auto-fix)
 */
export type AllocationStatus = 'unallocated' | 'partial' | 'allocated' | 'over-allocated';

export type Reconciliation = {
  /** Sum of the items, in paise. */
  allocated: number;
  /** Payment amount minus allocated, in paise; negative when over-allocated. */
  remaining: number;
  status: AllocationStatus;
};

/** Compares a payment with its expense items. Pure function — no I/O. */
export function reconcilePayment(paymentAmount: number, itemAmounts: number[]): Reconciliation {
  const allocated = addPaise(...itemAmounts);
  const remaining = subtractPaise(paymentAmount, allocated);

  let status: AllocationStatus;
  if (itemAmounts.length === 0) status = 'unallocated';
  else if (remaining > 0) status = 'partial';
  else if (remaining === 0) status = 'allocated';
  else status = 'over-allocated';

  return { allocated, remaining, status };
}

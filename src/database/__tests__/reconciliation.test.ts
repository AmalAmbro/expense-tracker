import { reconcilePayment } from '@/database/reconciliation';

describe('reconcilePayment', () => {
  it('is fully allocated when items match the payment exactly', () => {
    // The plan.md supermarket example: ₹2,350 across several categories.
    expect(reconcilePayment(235000, [45000, 30000, 22000, 80000, 58000])).toEqual({
      allocated: 235000,
      remaining: 0,
      status: 'allocated',
    });
  });

  it('reports the discrepancy when items fall short', () => {
    // plan.md: payment ₹2,350, items ₹2,270 → ₹80 unallocated, not "fully allocated".
    expect(reconcilePayment(235000, [227000])).toEqual({
      allocated: 227000,
      remaining: 8000,
      status: 'partial',
    });
  });

  it('flags items that exceed the payment', () => {
    expect(reconcilePayment(100000, [80000, 30000])).toEqual({
      allocated: 110000,
      remaining: -10000,
      status: 'over-allocated',
    });
  });

  it('treats a payment with no items as unallocated', () => {
    expect(reconcilePayment(50000, [])).toEqual({
      allocated: 0,
      remaining: 50000,
      status: 'unallocated',
    });
  });
});

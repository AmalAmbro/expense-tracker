import {
  EMPTY_UPI_PAYMENT_FORM,
  findUpiPaymentMethod,
  toUpiPaymentRecords,
  validateUpiPaymentForm,
  type UpiPaymentFormValues,
} from '@/features/upi/utils/upi-payment-form';
import { buildSeedCategories } from '@/test-utils/seed-categories';

const categories = buildSeedCategories();

const valid: UpiPaymentFormValues = {
  payeeVpa: ' bakery@okaxis ',
  payeeName: ' Corner Bakery ',
  amountText: '235.50',
  description: ' Bread ',
  categoryId: 'food-groceries',
  subcategoryId: null,
  providerId: 'gpay',
};

describe('validateUpiPaymentForm', () => {
  it('accepts a complete form', () => {
    expect(validateUpiPaymentForm(valid)).toEqual({});
  });

  it('reports every missing or invalid field', () => {
    expect(validateUpiPaymentForm(EMPTY_UPI_PAYMENT_FORM)).toEqual({
      payeeVpa: 'Enter a UPI ID like name@bank',
      amountText: 'Enter an amount greater than 0',
      description: 'Say what this payment is for',
      categoryId: 'Choose a category',
      providerId: 'Choose a UPI app',
    });
  });

  it('rejects malformed UPI IDs and amounts', () => {
    const errors = validateUpiPaymentForm({ ...valid, payeeVpa: 'bakery', amountText: '10.555' });
    expect(Object.keys(errors)).toEqual(['payeeVpa', 'amountText']);
  });
});

describe('findUpiPaymentMethod', () => {
  it('finds the active method named UPI, ignoring case', () => {
    const methods = [
      { id: 'cash', name: 'Cash', sortOrder: 0, isActive: true },
      { id: 'upi', name: ' upi ', sortOrder: 1, isActive: true },
    ];
    expect(findUpiPaymentMethod(methods)?.id).toBe('upi');
  });

  it('returns null when there is none', () => {
    expect(
      findUpiPaymentMethod([{ id: 'upi', name: 'UPI', sortOrder: 0, isActive: false }]),
    ).toBeNull();
  });
});

describe('toUpiPaymentRecords', () => {
  it('builds an initiated payment and its item, in paise', () => {
    expect(
      toUpiPaymentRecords(valid, {
        paymentMethodId: 'upi',
        categories,
        date: '2026-10-03',
        transactionReference: 'ET1',
      }),
    ).toEqual({
      payment: {
        amount: 23550,
        date: '2026-10-03',
        paymentMethodId: 'upi',
        provider: 'gpay',
        merchantName: 'Corner Bakery',
        merchantVpa: 'bakery@okaxis',
        status: 'initiated',
        reference: 'ET1',
        notes: null,
      },
      item: {
        amount: 23550,
        date: '2026-10-03',
        categoryId: 'food-groceries',
        subcategoryId: null,
        description: 'Bread',
        isEssential: true,
        notes: null,
      },
    });
  });

  it('stores a blank payee name as null', () => {
    const { payment } = toUpiPaymentRecords(
      { ...valid, payeeName: '  ' },
      { paymentMethodId: 'upi', categories, date: '2026-10-03', transactionReference: 'ET1' },
    );
    expect(payment.merchantName).toBeNull();
  });
});

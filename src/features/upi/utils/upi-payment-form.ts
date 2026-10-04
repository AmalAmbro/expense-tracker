import { isValidVpa } from '@/features/upi/utils/upi-link';
import { parseAmountToPaise } from '@/utils/money';
import type { Category } from '@/types/category';
import type { NewExpenseItem } from '@/types/expense';
import type { NewPayment } from '@/types/payment';
import type { PaymentMethod } from '@/types/payment-method';

export type UpiPaymentFormValues = {
  payeeVpa: string;
  payeeName: string;
  amountText: string;
  description: string;
  categoryId: string | null;
  subcategoryId: string | null;
  providerId: string | null;
};

export const EMPTY_UPI_PAYMENT_FORM: UpiPaymentFormValues = {
  payeeVpa: '',
  payeeName: '',
  amountText: '',
  description: '',
  categoryId: null,
  subcategoryId: null,
  providerId: null,
};

export type UpiPaymentFormErrors = Partial<Record<keyof UpiPaymentFormValues, string>>;

/** Validates the Pay form. An empty result means it can be submitted. */
export function validateUpiPaymentForm(values: UpiPaymentFormValues): UpiPaymentFormErrors {
  const errors: UpiPaymentFormErrors = {};
  if (!isValidVpa(values.payeeVpa)) {
    errors.payeeVpa = 'Enter a UPI ID like name@bank';
  }
  try {
    parseAmountToPaise(values.amountText);
  } catch {
    errors.amountText = 'Enter an amount greater than 0';
  }
  if (!values.description.trim()) {
    errors.description = 'Say what this payment is for';
  }
  if (!values.categoryId) {
    errors.categoryId = 'Choose a category';
  }
  if (!values.providerId) {
    errors.providerId = 'Choose a UPI app';
  }
  return errors;
}

/**
 * The payment method UPI payments are recorded under: the one named "UPI" if it
 * exists (it's seeded), otherwise null so the screen can ask the user to add one.
 */
export function findUpiPaymentMethod(methods: PaymentMethod[]): PaymentMethod | null {
  return methods.find((m) => m.isActive && m.name.trim().toLowerCase() === 'upi') ?? null;
}

/**
 * Converts a validated form into the records saved before launching the UPI app:
 * an `initiated` payment and the expense item it pays for.
 */
export function toUpiPaymentRecords(
  values: UpiPaymentFormValues,
  options: {
    paymentMethodId: string;
    categories: Category[];
    date: string;
    transactionReference: string;
  },
): { payment: NewPayment; item: NewExpenseItem } {
  const category = options.categories.find((c) => c.id === values.categoryId);
  if (!category) {
    throw new Error('Choose a category');
  }
  const amount = parseAmountToPaise(values.amountText);
  const description = values.description.trim();

  return {
    payment: {
      amount,
      date: options.date,
      paymentMethodId: options.paymentMethodId,
      provider: values.providerId,
      merchantName: values.payeeName.trim() || null,
      merchantVpa: values.payeeVpa.trim(),
      status: 'initiated',
      reference: options.transactionReference,
      notes: null,
    },
    item: {
      amount,
      date: options.date,
      categoryId: category.id,
      subcategoryId: values.subcategoryId,
      description,
      isEssential: category.isEssentialDefault,
      notes: null,
    },
  };
}

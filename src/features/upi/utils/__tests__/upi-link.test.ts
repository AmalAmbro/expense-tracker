import {
  buildUpiPaymentLink,
  createTransactionReference,
  formatUpiAmount,
  isValidVpa,
  parseUpiResponse,
} from '@/features/upi/utils/upi-link';

describe('isValidVpa', () => {
  it.each(['corner.bakery@okaxis', 'amal-123@ybl', 'shop_1@paytm', '9876543210@upi'])(
    'accepts %s',
    (vpa) => expect(isValidVpa(vpa)).toBe(true),
  );

  it.each(['', 'nobody', '@okaxis', 'a@', 'two@@ats', 'has space@okaxis', 'x@1bank'])(
    'rejects %p',
    (vpa) => expect(isValidVpa(vpa)).toBe(false),
  );
});

describe('formatUpiAmount', () => {
  it('always uses two decimals', () => {
    expect(formatUpiAmount(20000)).toBe('200.00');
    expect(formatUpiAmount(3250)).toBe('32.50');
    expect(formatUpiAmount(5)).toBe('0.05');
  });

  it('rejects non-positive and fractional paise', () => {
    expect(() => formatUpiAmount(0)).toThrow();
    expect(() => formatUpiAmount(10.5)).toThrow();
  });
});

describe('buildUpiPaymentLink', () => {
  const request = {
    payeeVpa: 'corner.bakery@okaxis',
    payeeName: 'Corner Bakery & Café',
    amount: 23500,
    note: 'Bread + buns',
    transactionReference: 'ET1791060000000ABCD',
  };

  it('builds a generic UPI intent with encoded parameters', () => {
    expect(buildUpiPaymentLink(request)).toBe(
      'upi://pay?pa=corner.bakery%40okaxis&pn=Corner%20Bakery%20%26%20Caf%C3%A9' +
        '&am=235.00&cu=INR&tr=ET1791060000000ABCD&tn=Bread%20%2B%20buns',
    );
  });

  it('omits the transaction reference when there is none (typed-in UPI ID)', () => {
    // Apps reject a `tr` without merchant details with a misleading "limit exceeded".
    expect(buildUpiPaymentLink({ ...request, note: null, transactionReference: null })).toBe(
      'upi://pay?pa=corner.bakery%40okaxis&pn=Corner%20Bakery%20%26%20Caf%C3%A9&am=235.00&cu=INR',
    );
  });

  it('supports an app-specific base and omits an empty note', () => {
    const link = buildUpiPaymentLink({ ...request, note: '  ' }, 'phonepe://pay');
    expect(link.startsWith('phonepe://pay?pa=')).toBe(true);
    expect(link).not.toContain('tn=');
  });

  it('falls back to the UPI ID as the payee name', () => {
    expect(buildUpiPaymentLink({ ...request, payeeName: null })).toContain(
      'pn=corner.bakery%40okaxis',
    );
  });

  it('refuses an invalid UPI ID', () => {
    expect(() => buildUpiPaymentLink({ ...request, payeeVpa: 'nobody' })).toThrow('Invalid UPI ID');
  });
});

describe('parseUpiResponse', () => {
  it('parses a successful response', () => {
    expect(
      parseUpiResponse('txnId=AXI123&responseCode=00&Status=SUCCESS&txnRef=ET1&ApprovalRefNo=998'),
    ).toEqual({
      status: 'success',
      transactionId: 'AXI123',
      responseCode: '00',
      approvalReference: '998',
      transactionReference: 'ET1',
    });
  });

  it('is case-insensitive about keys and values', () => {
    expect(parseUpiResponse('status=failure&TXNID=x').status).toBe('failure');
    expect(parseUpiResponse('Status=Submitted').status).toBe('submitted');
  });

  it('treats missing or unrecognised responses as unknown, never success', () => {
    expect(parseUpiResponse(undefined).status).toBe('unknown');
    expect(parseUpiResponse('').status).toBe('unknown');
    expect(parseUpiResponse('garbage').status).toBe('unknown');
    expect(parseUpiResponse('Status=OK').status).toBe('unknown');
  });
});

describe('createTransactionReference', () => {
  it('is alphanumeric and within the 35-character UPI limit', () => {
    const ref = createTransactionReference(new Date(1791060000000), 'a1-b2c3d4e5f6');
    expect(ref).toBe('ET1791060000000A1B2C3D4');
    expect(ref).toMatch(/^[A-Z0-9]{1,35}$/);
  });
});

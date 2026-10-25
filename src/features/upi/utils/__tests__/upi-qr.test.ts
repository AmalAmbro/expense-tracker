import { buildLaunchLink, buildUpiLinkFromQr, parseUpiQr } from '@/features/upi/utils/upi-qr';

function parsed(data: string) {
  const result = parseUpiQr(data);
  if (!result.ok) throw new Error(`expected ok, got: ${result.error}`);
  return result.qr;
}

const STATIC_MERCHANT =
  'upi://pay?pa=cornerbakery@okaxis&pn=Corner%20Bakery&mc=5411&tr=STQ1234&mode=02&purpose=00';

describe('parseUpiQr', () => {
  it('reads a static merchant QR (no amount)', () => {
    expect(parsed(STATIC_MERCHANT)).toEqual({
      raw: STATIC_MERCHANT,
      payeeVpa: 'cornerbakery@okaxis',
      payeeName: 'Corner Bakery',
      amount: null,
      amountIsFixed: false,
      note: null,
      merchantCode: '5411',
      transactionReference: 'STQ1234',
      isMerchant: true,
      params: [
        ['pa', 'cornerbakery@okaxis'],
        ['pn', 'Corner%20Bakery'],
        ['mc', '5411'],
        ['tr', 'STQ1234'],
        ['mode', '02'],
        ['purpose', '00'],
      ],
    });
  });

  it('reads a dynamic QR with a fixed amount in paise', () => {
    const qr = parsed('upi://pay?pa=shop@ybl&pn=Shop&am=235.50&cu=INR&tn=Order%2042');
    expect(qr).toMatchObject({ amount: 23550, amountIsFixed: true, note: 'Order 42' });
  });

  it('lets the payer edit the amount when the QR sets a minimum', () => {
    expect(parsed('upi://pay?pa=shop@ybl&am=100.00&mam=50.00')).toMatchObject({
      amount: 10000,
      amountIsFixed: false,
    });
  });

  it('treats a zero amount as no amount', () => {
    expect(parsed('upi://pay?pa=shop@ybl&am=0.00')).toMatchObject({
      amount: null,
      amountIsFixed: false,
    });
  });

  it('is tolerant of letter case, "+" spaces, and a trailing slash', () => {
    const qr = parsed('UPI://PAY/?PA=Shop@ybl&PN=Tea+Stall');
    expect(qr.payeeVpa).toBe('Shop@ybl');
    expect(qr.payeeName).toBe('Tea Stall');
  });

  it('identifies personal QRs (no merchant code, or 0000)', () => {
    expect(parsed('upi://pay?pa=friend@okicici&pn=Friend').isMerchant).toBe(false);
    expect(parsed('upi://pay?pa=friend@okicici&mc=0000').isMerchant).toBe(false);
  });

  it.each([
    ['https://example.com/pay', 'isn’t a UPI payment QR code'],
    ['hello', 'isn’t a UPI payment QR code'],
    ['upi://mandate?pa=shop@ybl', 'not autopay or mandates'],
    ['upi://pay?pn=NoId', 'valid UPI ID'],
    ['upi://pay?pa=not-a-vpa', 'valid UPI ID'],
    ['upi://pay?pa=shop@ybl&cu=USD', 'only INR'],
    ['upi://pay?pa=shop@ybl&am=abc', 'invalid amount'],
    ['upi://pay?pa=shop@ybl&am=-5', 'invalid amount'],
    ['00020101021226...', 'Bharat QR'],
  ])('rejects %p', (data, message) => {
    const result = parseUpiQr(data);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toContain(message);
  });
});

describe('buildUpiLinkFromQr', () => {
  it('keeps every merchant parameter verbatim and appends the amount and currency', () => {
    expect(buildUpiLinkFromQr(parsed(STATIC_MERCHANT), 12000)).toBe(
      `${STATIC_MERCHANT}&am=120.00&cu=INR`,
    );
  });

  it('leaves a fixed-amount QR untouched', () => {
    const raw = 'upi://pay?pa=shop@ybl&pn=Shop&am=235.50&cu=INR&tr=ORD42&sign=abc%3D%3D';
    expect(buildUpiLinkFromQr(parsed(raw), 23550)).toBe(raw);
  });

  it('refuses to change a fixed amount', () => {
    const qr = parsed('upi://pay?pa=shop@ybl&am=235.50');
    expect(() => buildUpiLinkFromQr(qr, 10000)).toThrow('fixed amount');
  });

  it('replaces an editable amount in place', () => {
    const qr = parsed('upi://pay?pa=shop@ybl&am=100.00&mam=50.00&cu=INR');
    expect(buildUpiLinkFromQr(qr, 7500)).toBe('upi://pay?pa=shop@ybl&am=75.00&mam=50.00&cu=INR');
  });

  it('supports an app-specific base (iOS)', () => {
    expect(buildUpiLinkFromQr(parsed('upi://pay?pa=shop@ybl'), 100, 'phonepe://pay')).toBe(
      'phonepe://pay?pa=shop@ybl&am=1.00&cu=INR',
    );
  });
});

describe('buildLaunchLink', () => {
  const base = {
    payeeVpa: 'shop@ybl',
    payeeName: null,
    amount: 100,
    note: null,
    transactionReference: null,
  };

  it('uses the scanned QR when there is one, and builds a plain link otherwise', () => {
    const qr = parsed('upi://pay?pa=shop@ybl&mc=5411');
    expect(buildLaunchLink({ ...base, qr })).toBe('upi://pay?pa=shop@ybl&mc=5411&am=1.00&cu=INR');
    expect(buildLaunchLink(base)).toBe('upi://pay?pa=shop%40ybl&pn=shop%40ybl&am=1.00&cu=INR');
  });
});

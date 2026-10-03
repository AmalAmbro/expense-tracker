const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Converts a trusted, already-parsed rupee amount into integer paise. */
export function toPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/** Parses user-entered rupee text (e.g. "32.50") into integer paise, or throws. */
export function parseAmountToPaise(input: string): number {
  const trimmed = input.trim();
  if (!AMOUNT_PATTERN.test(trimmed)) {
    throw new Error(`Invalid amount: "${input}"`);
  }
  const paise = toPaise(Number(trimmed));
  if (paise <= 0) {
    throw new Error('Amount must be greater than zero');
  }
  return paise;
}

export function addPaise(...amounts: number[]): number {
  return amounts.reduce((total, amount) => total + amount, 0);
}

export function subtractPaise(a: number, b: number): number {
  return a - b;
}

export function isPositiveAmount(paise: number): boolean {
  return Number.isInteger(paise) && paise > 0;
}

/** Formats integer paise as a rupee string, e.g. 89600 -> "₹896.00". */
export function formatPaise(paise: number): string {
  return currencyFormatter.format(paise / 100);
}

/** Formats integer paise as editable input text, e.g. 3250 -> "32.50", 20000 -> "200". */
export function formatPaiseForInput(paise: number): string {
  const rupees = Math.floor(paise / 100);
  const remainder = paise % 100;
  return remainder === 0 ? String(rupees) : `${rupees}.${String(remainder).padStart(2, '0')}`;
}

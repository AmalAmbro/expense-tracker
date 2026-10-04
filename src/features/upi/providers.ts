export type UpiProvider = {
  id: string;
  name: string;
  /** Android package to target; null = not launchable on Android. */
  androidPackage: string | null;
  /** iOS link prefix; null = not launchable on iOS. */
  iosLinkBase: string | null;
  /** App icon image URI (Android, from the installed app); null when unknown. */
  icon?: string | null;
};

/**
 * Known UPI apps. On Android the installed apps are discovered at runtime; this list
 * only supplies short ids and names for well-known ones (package names are Play Store
 * ids; Google Pay's is from Google's integration docs). The iOS link prefixes use the apps' documented URL
 * schemes, but the paths after the scheme are not officially documented — verify on a
 * device before relying on them.
 */
export const UPI_PROVIDERS: UpiProvider[] = [
  {
    id: 'gpay',
    name: 'Google Pay',
    androidPackage: 'com.google.android.apps.nbu.paisa.user',
    iosLinkBase: 'tez://upi/pay',
  },
  {
    id: 'phonepe',
    name: 'PhonePe',
    androidPackage: 'com.phonepe.app',
    iosLinkBase: 'phonepe://pay',
  },
  { id: 'paytm', name: 'Paytm', androidPackage: 'net.one97.paytm', iosLinkBase: 'paytmmp://pay' },
  {
    id: 'cred',
    name: 'CRED',
    androidPackage: 'com.dreamplug.androidapp',
    iosLinkBase: 'credpay://upi/pay',
  },
  { id: 'bhim', name: 'BHIM', androidPackage: 'in.org.npci.upiapp', iosLinkBase: 'bhim://upi/pay' },
];

export function getUpiProvider(id: string | null): UpiProvider | undefined {
  return UPI_PROVIDERS.find((provider) => provider.id === id);
}

/** The id stored on a payment: a short known id ("gpay") or else the package name. */
export function providerIdForPackage(packageName: string): string {
  return UPI_PROVIDERS.find((p) => p.androidPackage === packageName)?.id ?? packageName;
}

/** A display name for a stored provider id, falling back to the id itself. */
export function providerDisplayName(id: string | null): string | null {
  if (!id) return null;
  return getUpiProvider(id)?.name ?? id;
}

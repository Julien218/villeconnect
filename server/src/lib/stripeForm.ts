// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// L'API Stripe attend du application/x-www-form-urlencoded avec une notation à crochets :
//   { line_items: [{ quantity: 1 }] }  ->  line_items[0][quantity]=1

export type FormValue = string | number | boolean | null | undefined | FormValue[] | { [key: string]: FormValue };

export function encodeStripeForm(input: { [key: string]: FormValue }): string {
  const pairs: string[] = [];

  const visit = (key: string, value: FormValue): void => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(`${key}[${index}]`, item));
      return;
    }
    if (typeof value === 'object') {
      for (const [childKey, childValue] of Object.entries(value)) visit(`${key}[${childKey}]`, childValue);
      return;
    }
    pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  };

  for (const [key, value] of Object.entries(input)) visit(key, value);
  return pairs.join('&');
}

import { createClient } from '@supabase/supabase-js';
import type { Product, Settings } from './types';
export const configured = !!(
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);
export const supabase = configured
  ? createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    )
  : null;
export { money } from './format';
export const price = (p: Product) => p.discount_price ?? p.price;
export const defaultSettings: Settings = {
  id: 1,
  brand_name: "MICHAEL'S SCENTSATION",
  slogan: '...Experience the Art of Fragrance',
  whatsapp: '',
  bank_name: '',
  account_name: '',
  account_number: '',
  contact_email: '',
  instagram: '',
  address: '',
  delivery_info: '',
  delivery_fee: 0,
  promo_title: 'Better, together.',
  promo_text:
    'Discover fragrance pairings made for your everyday ritual. Explore our collection of perfume combos.',
};
export function whatsappUrl(phone: string, message: string) {
  let number = phone.replace(/\D/g, '');
  if (number.startsWith('0') && number.length === 11)
    number = '234' + number.slice(1);
  return number.length >= 10
    ? `https://wa.me/${number}?text=${encodeURIComponent(message)}`
    : '';
}
export async function api<T>(
  action: string,
  data: unknown = {},
  admin = false,
): Promise<T> {
  if (!configured)
    throw new Error('The store is not connected yet. Please try again later.');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };
  if (admin) {
    const session = await supabase?.auth.getSession();
    if (!session?.data.session) throw new Error('Please sign in again.');
    headers.Authorization = `Bearer ${session.data.session.access_token}`;
  }
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/store?action=${action}`,
    { method: 'POST', headers, body: JSON.stringify(data) },
  );
  const result = await res
    .json()
    .catch(() => ({ error: 'The server is unavailable. Please try again.' }));
  if (!res.ok)
    throw new Error(result.error || 'Something went wrong. Please try again.');
  return result as T;
}
export function readLocal<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback;
  } catch {
    return fallback;
  }
}
export const newToken = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');

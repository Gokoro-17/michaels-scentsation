export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string;
};
export type Product = {
  sales_count: number;
  id: string;
  name: string;
  slug: string;
  description: string;
  category_id: string;
  price: number;
  discount_price: number | null;
  stock: number;
  available: boolean;
  published: boolean;
  featured: boolean;
  bestseller: boolean;
  notes: string[];
  size: string;
  image_url: string;
  low_stock_threshold: number;
  created_at: string;
  category?: Category;
  images?: { id: string; url: string; alt: string }[];
  combo_items?: { product_id: string; quantity: number }[];
};
export type Review = {
  id: string;
  product_id: string;
  customer_name: string;
  rating: number;
  body: string;
  approved: boolean;
  created_at: string;
  order_id: string;
};
export type Settings = {
  id: number;
  brand_name: string;
  slogan: string;
  whatsapp: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  contact_email: string;
  instagram: string;
  address: string;
  delivery_info: string;
  delivery_fee: number;
  promo_title: string;
  promo_text: string;
};
export type CartLine = { product_id: string; quantity: number };
export type OrderItem = {
  id: string;
  product_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  image_url: string;
};
export const statuses = [
  'Awaiting Payment',
  'Payment Verification Pending',
  'Payment Confirmed',
  'Processing',
  'Ready for Delivery',
  'Delivered',
  'Cancelled',
] as const;
export type Status = (typeof statuses)[number];
export type Order = {
  id: string;
  reference: string;
  customer_name: string;
  email: string;
  phone: string;
  address: string;
  instructions: string;
  total: number;
  subtotal: number;
  delivery_fee: number;
  status: Status;
  payment_status: 'awaiting' | 'pending' | 'confirmed' | 'rejected';
  stock_deducted: boolean;
  created_at: string;
  order_items: OrderItem[];
  payment_receipts?: { id: string; path: string; created_at: string }[];
};
export type Notification = {
  id: string;
  kind: string;
  order_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
  sent_at: string | null;
  last_error: string | null;
};

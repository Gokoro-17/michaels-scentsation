export const ORDER_STATUSES = [
  "Awaiting Payment",
  "Payment Verification Pending",
  "Payment Confirmed",
  "Processing",
  "Ready for Delivery",
  "Delivered",
  "Cancelled",
] as const;
export function normalizePhone(value: string) {
  const n = value.replace(/[^\d+]/g, "").replace(/^\+/, "");
  return n.startsWith("0") && n.length === 11 ? "234" + n.slice(1) : n;
}
export function isReceipt(bytes: Uint8Array, type: string) {
  if (type === "image/jpeg")
    return (
      bytes.length > 4 &&
      bytes[0] === 255 &&
      bytes[1] === 216 &&
      bytes[2] === 255
    );
  if (type === "image/png")
    return [137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n);
  if (type === "application/pdf")
    return new TextDecoder().decode(bytes.subarray(0, 5)) === "%PDF-";
  return false;
}
export function parseCheckout(input: unknown) {
  const v = input as Record<string, unknown>;
  if (!v || typeof v !== "object") throw new Error("Invalid checkout.");
  const text = (key: string, min: number, max: number) => {
    const value = v[key];
    if (
      typeof value !== "string" ||
      value.trim().length < min ||
      value.trim().length > max
    )
      throw new Error(`Please check your ${key}.`);
    return value.trim();
  };
  const name = text("name", 2, 100),
    email = text("email", 5, 254).toLowerCase(),
    address = text("address", 10, 1000),
    phone = normalizePhone(text("phone", 10, 25)),
    token = text("token", 64, 64);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("Please enter a valid email address.");
  if (!/^\d{10,15}$/.test(phone))
    throw new Error("Please enter a valid phone number.");
  if (!/^[a-f0-9]{64}$/.test(token))
    throw new Error("Invalid order access code.");
  if (!Array.isArray(v.items) || v.items.length < 1 || v.items.length > 30)
    throw new Error("Your bag must contain between 1 and 30 fragrances.");
  const items = v.items as { productId: unknown; quantity: unknown }[];
  const seen = new Set();
  for (const item of items) {
    if (
      !item ||
      typeof item.productId !== "string" ||
      !isUuid(item.productId) ||
      typeof item.quantity !== "number" ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 50 ||
      seen.has(item.productId)
    )
      throw new Error("Please check the quantities in your bag.");
    seen.add(item.productId);
  }
  const instructions =
    typeof v.instructions === "string" ? v.instructions.trim() : "";
  if (instructions.length > 1000)
    throw new Error("Delivery instructions are too long.");
  return {
    name,
    email,
    address,
    phone,
    token,
    instructions,
    items: items as { productId: string; quantity: number }[],
  };
}
export const isUuid = (s: unknown): s is string =>
  typeof s === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
export function parseAccess(v: Record<string, unknown>) {
  if (
    typeof v.reference !== "string" ||
    !/^MSC-\d{8}-\d{6,}$/.test(v.reference) ||
    typeof v.token !== "string" ||
    !/^[a-f0-9]{64}$/.test(v.token)
  )
    throw new Error(
      "Please check your order reference and private access code.",
    );
  return { reference: v.reference, token: v.token };
}
export function validImageUrl(v: unknown) {
  if (typeof v !== "string") return false;
  try {
    const u = new URL(v);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

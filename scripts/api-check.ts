import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const env = Object.fromEntries(
  (await readFile(".env.local", "utf8"))
    .trim()
    .split(/\r?\n/)
    .map((l) => l.split("=")),
);
const url = env.VITE_SUPABASE_URL,
  key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
let passed = 0;
async function check(
  name: string,
  path: string,
  init: RequestInit,
  expected: number,
) {
  const res = await fetch(url + path, {
    ...init,
    headers: {
      apikey: key,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const body = await res.json();
  assert.equal(res.status, expected, `${name}: ${JSON.stringify(body)}`);
  console.log(`PASS ${name} (${res.status})`);
  passed++;
  return body;
}
await check("public categories load", "/rest/v1/categories?select=*", {}, 200);
await check("private orders blocked", "/rest/v1/orders?select=*", {}, 401);
await check(
  "private receipts blocked",
  "/rest/v1/payment_receipts?select=*",
  {},
  401,
);
await check(
  "admin sign-in required",
  "/functions/v1/store?action=admin-snapshot",
  { method: "POST", body: "{}" },
  401,
);
await check(
  "malformed checkout rejected",
  "/functions/v1/store?action=checkout",
  { method: "POST", body: "{}" },
  400,
);
await check(
  "private code required for tracking",
  "/functions/v1/store?action=track",
  {
    method: "POST",
    body: JSON.stringify({ reference: "MSC-20261106-000001" }),
  },
  400,
);
await check(
  "unknown tracking credentials rejected",
  "/functions/v1/store?action=track",
  {
    method: "POST",
    body: JSON.stringify({
      reference: "MSC-20261106-000001",
      token: "f".repeat(64),
    }),
  },
  404,
);
await check(
  "confirmation RPC blocked",
  "/rest/v1/rpc/manage_order",
  {
    method: "POST",
    body: JSON.stringify({
      p_order: "11111111-1111-1111-1111-111111111111",
      p_action: "confirm",
      p_actor: "11111111-1111-1111-1111-111111111111",
    }),
  },
  401,
);
console.log(`${passed} live API checks passed.`);

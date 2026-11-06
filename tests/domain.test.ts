import { test } from 'node:test';
import assert from 'node:assert/strict';
import { money } from '../src/format.ts';
test('bank-transfer amounts retain kobo without rounding to whole naira', () => {
  assert.equal(money(100.5), '₦100.50');
  assert.equal(money(1000), '₦1,000');
});
import {
  isReceipt,
  normalizePhone,
  parseAccess,
  parseCheckout,
} from '../server/domain.ts';
const valid = {
  name: 'Test Customer',
  email: 'test@example.com',
  phone: '08012345678',
  address: '10 Test Street, Lagos',
  instructions: '',
  token: 'a'.repeat(64),
  items: [{ productId: '11111111-1111-1111-1111-111111111111', quantity: 2 }],
};
test('checkout normalizes local Nigerian phone numbers', () =>
  assert.equal(parseCheckout(valid).phone, '2348012345678'));
test('client totals cannot override server pricing', () =>
  assert.equal('total' in parseCheckout({ ...valid, total: 1 }), false));
test('rejects duplicate items and invalid quantities', () => {
  for (const items of [
    [...valid.items, ...valid.items],
    [{ ...valid.items[0], quantity: 0 }],
    [{ ...valid.items[0], quantity: 1.5 }],
    [{ ...valid.items[0], quantity: 51 }],
  ])
    assert.throws(() => parseCheckout({ ...valid, items }));
});
test('checkout rejects malformed contact details and weak access codes', () => {
  for (const bad of [
    { email: 'broken' },
    { phone: 'abc' },
    { token: '12345' },
    { address: 'short' },
  ])
    assert.throws(() => parseCheckout({ ...valid, ...bad }));
});
test('tracking requires a 256-bit access code as well as a reference', () => {
  assert.throws(() => parseAccess({ reference: 'MSC-20261106-000001' }));
  assert.deepEqual(
    parseAccess({ reference: 'MSC-20261106-000001', token: valid.token }),
    { reference: 'MSC-20261106-000001', token: valid.token },
  );
});
test('receipt MIME must match file signature', () => {
  assert.equal(
    isReceipt(new TextEncoder().encode('%PDF-1.7'), 'application/pdf'),
    true,
  );
  assert.equal(
    isReceipt(
      new TextEncoder().encode('<script>alert(1)</script>'),
      'image/png',
    ),
    false,
  );
  assert.equal(
    isReceipt(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), 'image/png'),
    true,
  );
  assert.equal(
    isReceipt(new Uint8Array([255, 216, 255, 224, 0]), 'image/jpeg'),
    true,
  );
});
test('WhatsApp phone normalization accepts international numbers', () =>
  assert.equal(normalizePhone('+234 801 234 5678'), '2348012345678'));

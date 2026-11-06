import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  initialHeaderScroll,
  nextHeaderScroll,
} from '../src/useAutoHideHeader.ts';

test('header stays visible near the top, including negative overscroll', () => {
  const hidden = nextHeaderScroll(initialHeaderScroll(), 300);
  assert.equal(hidden.hidden, true);
  for (const y of [0, 30, 88, -20])
    assert.equal(nextHeaderScroll(hidden, y).hidden, false);
});

test('downward movement hides the header after the movement threshold', () => {
  let state = initialHeaderScroll(150);
  state = nextHeaderScroll(state, 156);
  assert.equal(state.hidden, false);
  state = nextHeaderScroll(state, 163);
  assert.equal(state.hidden, true);
});

test('scrolling upward reveals the header', () => {
  let state = nextHeaderScroll(initialHeaderScroll(150), 250);
  assert.equal(state.hidden, true);
  state = nextHeaderScroll(state, 241);
  assert.equal(state.hidden, false);
});

test('small direction changes do not flicker the header', () => {
  let state = nextHeaderScroll(initialHeaderScroll(100), 300);
  for (const y of [299, 301, 300, 302]) {
    state = nextHeaderScroll(state, y);
    assert.equal(state.hidden, true);
  }
});

test('small continuous upward movements accumulate before revealing', () => {
  let state = nextHeaderScroll(initialHeaderScroll(150), 300);
  for (const y of [298, 296, 294]) state = nextHeaderScroll(state, y);
  assert.equal(state.hidden, true);
  assert.equal(nextHeaderScroll(state, 292).hidden, false);
});

test('open controls and keyboard focus keep the header visible', () => {
  const hidden = nextHeaderScroll(initialHeaderScroll(), 300);
  assert.equal(nextHeaderScroll(hidden, 600, true).hidden, false);
});

test('closing a control resets direction before normal scrolling resumes', () => {
  let state = nextHeaderScroll(initialHeaderScroll(), 400, true);
  assert.equal(nextHeaderScroll(state, 404).hidden, false);
  state = nextHeaderScroll(state, 413);
  assert.equal(state.hidden, true);
});

test('the top threshold follows the current mobile header height', () => {
  const hidden = nextHeaderScroll(initialHeaderScroll(), 300);
  assert.equal(nextHeaderScroll(hidden, 72, false, 72).hidden, false);
});

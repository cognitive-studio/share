import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultState } from '../games/siren-shore/assets/state.mjs';
import { createReceiptModel, shareReceipt, shouldOfferReceipt } from '../games/siren-shore/assets/share.mjs';

function scandalState() {
  const state = createDefaultState();
  state.progression.level = 47;
  state.player.title = 'Publicly Misunderstood Siren';
  state.lastIncident = {
    type: 'snatch', itemId: 'crown-1', itemName: 'Emotionally Unavailable Tiara',
    npcId: 'cynthia', npcName: 'Cynthia Undertow',
    text: 'Your Majesty took Emotionally Unavailable Tiara from Cynthia Undertow.',
  };
  state.inventory.push({ id: 'crown-1', name: 'Emotionally Unavailable Tiara', origin: 'Discovered at the Disputed Reef.', history: ['Snatched from Cynthia Undertow by Your Majesty.'] });
  return state;
}

function fakeCanvas() {
  return { toBlob(callback) { callback(new Blob(['png'], { type: 'image/png' })); } };
}

test('receipt model turns persistent scandal into editorial evidence', () => {
  const model = createReceiptModel(scandalState(), 'https://example.test/share/games/siren-shore/?diagnostic=1#noise');
  assert.equal(model.level, 47);
  assert.match(model.headline, /property changed hands/i);
  assert.match(model.caption, /Cynthia/i);
  assert.match(model.object.name, /Tiara/);
  assert.match(model.provenance, /Snatched/);
  assert.equal(model.url, 'https://example.test/share/games/siren-shore/');
});

test('major finds and incidents offer a receipt without interrupting ordinary notices', () => {
  assert.equal(shouldOfferReceipt([{ type: 'rareFind' }]), true);
  assert.equal(shouldOfferReceipt([{ type: 'snatch' }]), true);
  assert.equal(shouldOfferReceipt([{ type: 'victory' }]), true);
  assert.equal(shouldOfferReceipt([{ type: 'shade' }]), true);
  assert.equal(shouldOfferReceipt([{ type: 'read' }]), true);
  assert.equal(shouldOfferReceipt([{ type: 'notice' }]), false);
});

test('native file sharing is preferred when the phone supports it', async () => {
  let payload;
  const navigatorObject = { canShare: ({ files }) => files.length === 1, async share(value) { payload = value; } };
  const result = await shareReceipt({ canvas: fakeCanvas(), navigatorObject, documentObject: {}, locationHref: 'https://example.test/game/' });
  assert.equal(result.method, 'native');
  assert.equal(payload.files.length, 1);
});

test('canceling the native share sheet is not an error', async () => {
  const navigatorObject = { canShare: () => true, async share() { const error = new Error('cancel');error.name = 'AbortError';throw error; } };
  const result = await shareReceipt({ canvas: fakeCanvas(), navigatorObject, documentObject: {}, locationHref: 'https://example.test/game/' });
  assert.equal(result.canceled, true);
});

test('unsupported sharing downloads the PNG and copies the clean URL', async () => {
  let copied = '';
  let clicked = false;
  const navigatorObject = { clipboard: { async writeText(value) { copied = value; } } };
  const documentObject = { createElement() { return { click() { clicked = true; }, remove() {} }; }, body: { append() {} } };
  const previous = globalThis.URL.createObjectURL;
  const previousRevoke = globalThis.URL.revokeObjectURL;
  globalThis.URL.createObjectURL = () => 'blob:receipt';
  globalThis.URL.revokeObjectURL = () => {};
  try {
    const result = await shareReceipt({ canvas: fakeCanvas(), navigatorObject, documentObject, locationHref: 'https://example.test/game/?x=1#y' });
    assert.equal(result.method, 'download');
    assert.equal(clicked, true);
    assert.equal(copied, 'https://example.test/game/');
  } finally {
    globalThis.URL.createObjectURL = previous;
    globalThis.URL.revokeObjectURL = previousRevoke;
  }
});

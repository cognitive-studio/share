import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultState } from '../games/siren-shore/assets/state.mjs';
import { createCabinetModel, createReceiptModel, shareReceipt, shouldOfferReceipt } from '../games/siren-shore/assets/share.mjs';

function stateWithSocialHistory() {
  const state = createDefaultState(() => 0.5);
  state.progression.points = 1200000;
  state.inventory.push({
    id: 'crown-1', name: 'Disputed Crown', slot: 'crown', ownerId: 'player',
    history: ['Found by Cynthia.', 'Taken by Your Majesty.'], colors: ['#ffd95e', '#ff4faf'],
  });
  state.equipped.crown = 'crown-1';
  state.social.incidents.push({
    id: 'incident-1', type: 'theft', actorId: 'player', targetId: 'cynthia',
    itemId: 'crown-1', text: 'Your Majesty stole the Disputed Crown from Cynthia.',
  });
  state.lastIncident = state.social.incidents[0];
  return state;
}

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

test('cabinet preserves allegations without requiring completion', () => {
  const model = createCabinetModel(stateWithSocialHistory());
  assert.equal(model.points, 1200000);
  assert.equal(model.objects[0].history.length, 2);
  assert.equal(model.mermaids[0].name, 'Cynthia Undertow');
  assert.match(model.incidents[0].text, /stole/i);
  assert.equal('completionPercent' in model, false);
});

test('receipt includes points, featured possession, and disputed account', () => {
  const model = createReceiptModel(stateWithSocialHistory());
  assert.equal(model.pointsLabel, '1,200,000 SIREN POINTS');
  assert.ok(model.featuredItem);
  assert.match(model.allegation, /disputes this account/i);
  assert.match(model.lastIncident, /stole/i);
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

test('a throwing file-share capability check falls through to PNG download', async () => {
  let clicked = false;
  const navigatorObject = { canShare() { throw new Error('capability probe failed'); }, async share() { throw new Error('share must not run'); } };
  const documentObject = { createElement() { return { click() { clicked = true; }, remove() {} }; }, body: { append() {} } };
  const previous = globalThis.URL.createObjectURL;
  const previousRevoke = globalThis.URL.revokeObjectURL;
  globalThis.URL.createObjectURL = () => 'blob:receipt';
  globalThis.URL.revokeObjectURL = () => {};
  try {
    const result = await shareReceipt({ canvas: fakeCanvas(), navigatorObject, documentObject, locationHref: 'https://example.test/game/' });
    assert.equal(result.method, 'download');
    assert.equal(clicked, true);
  } finally {
    globalThis.URL.createObjectURL = previous;
    globalThis.URL.revokeObjectURL = previousRevoke;
  }
});

test('a throwing file-share capability check reaches clipboard when download fails', async () => {
  let copied = '';
  const navigatorObject = {
    canShare() { throw new Error('capability probe failed'); },
    async share() { throw new Error('share must not run'); },
    clipboard: { async writeText(value) { copied = value; } },
  };
  const documentObject = { createElement() { throw new Error('download unavailable'); } };
  const result = await shareReceipt({ canvas: fakeCanvas(), navigatorObject, documentObject, locationHref: 'https://example.test/game/?private=never#still-no' });
  assert.equal(result.method, 'copy');
  assert.equal(copied, 'https://example.test/game/');
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

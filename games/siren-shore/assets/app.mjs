import { HAIR_STYLES, MAKEUP_STYLES, NPC_DEFINITIONS, PURSES, TAIL_STYLES } from './data.mjs';
import { advanceShore, collectFind, createOuting, equipItem, packItem, remixItems, resolveEncounter, resolveFightMove, returnHome } from './game.mjs';
import { createDefaultState, loadState, saveState, xpForLevel } from './state.mjs';
import { createRenderer } from './render.mjs';
import { createAudioController } from './audio.mjs';
import { createReceiptModel, renderReceipt, shareReceipt } from './share.mjs';

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const byId = (root, id) => root.getElementById(id);

export function createInputController({ pad, knob, actionButton, target = window, onMove, onAction }) {
  let pointer = null;
  const keys = new Set();
  const resetPad = () => { pointer = null; knob.style.transform = ''; onMove(0, 0); };
  const movePointer = (event) => {
    if (event.pointerId !== pointer) return;
    const rect = pad.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const limit = rect.width * .3;
    const magnitude = Math.hypot(dx, dy) || 1;
    const scale = Math.min(1, limit / magnitude);
    const x = dx * scale;
    const y = dy * scale;
    knob.style.transform = `translate(${x}px, ${y}px)`;
    onMove(x / limit, y / limit);
  };
  const pointerDown = (event) => { pointer = event.pointerId; pad.setPointerCapture(pointer); movePointer(event); };
  const pointerEnd = (event) => { if (event.pointerId === pointer) resetPad(); };
  const keyVector = () => {
    const x = Number(keys.has('ArrowRight') || keys.has('d')) - Number(keys.has('ArrowLeft') || keys.has('a'));
    const y = Number(keys.has('ArrowDown') || keys.has('s')) - Number(keys.has('ArrowUp') || keys.has('w'));
    const magnitude = Math.hypot(x, y) || 1;
    onMove(x / magnitude, y / magnitude);
  };
  const keydown = (event) => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(key)) { keys.add(key); keyVector(); event.preventDefault(); }
    if (['e', 'z', 'Enter'].includes(key) && !event.repeat) onAction();
  };
  const keyup = (event) => { keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key); keyVector(); };
  pad.addEventListener('pointerdown', pointerDown);
  pad.addEventListener('pointermove', movePointer);
  pad.addEventListener('pointerup', pointerEnd);
  pad.addEventListener('pointercancel', pointerEnd);
  actionButton.addEventListener('click', onAction);
  target.addEventListener('keydown', keydown);
  target.addEventListener('keyup', keyup);
  return { destroy() { pad.removeEventListener('pointerdown', pointerDown); target.removeEventListener('keydown', keydown); target.removeEventListener('keyup', keyup); } };
}

export function bootSirenShore(root = document, windowObject = window) {
  const loaded = loadState(windowObject.localStorage);
  let state = loaded.state;
  let movement = { x: 0, y: 0 };
  let selectedItemId = null;
  let selectedRemixId = null;
  let activeNpcId = null;
  let lastTime = performance.now();
  let frame = 0;
  const canvas = byId(root, 'ocean-canvas');
  const renderer = createRenderer(canvas, { reducedMotion: windowObject.matchMedia?.('(prefers-reduced-motion: reduce)').matches });
  const portraitRenderer = createRenderer(byId(root, 'portrait-canvas'), { reducedMotion: true });
  const runtime = { worldWidth: 1800, worldHeight: 1400, npcs: [], near: null };
  const audio = createAudioController({
    soundtrackUrl: './assets/siren-score.mp3',
    settings: state.settings,
    onSettings: (settings) => { state.settings = { ...state.settings, ...settings }; persist(); },
  });

  const say = (text) => {
    byId(root, 'toast').textContent = text;
    byId(root, 'live-region').textContent = text;
  };
  const persist = () => {
    const result = saveState(windowObject.localStorage, state);
    if (!result.ok) say(result.warning);
  };
  const applyEvents = (events = []) => {
    if (!events.length) return;
    say(events.map(({ text }) => text).join(' '));
    for (const item of events) audio.playEffect(item.type);
    persist();
  };
  const transition = (result) => { state = result.state; applyEvents(result.events); renderUi(); };

  function populateSelect(id, options, value) {
    const select = byId(root, id);
    select.replaceChildren(...options.map((option, index) => {
      const node = root.createElement('option');
      node.value = option.id ?? index;
      node.textContent = option.name ?? option;
      return node;
    }));
    select.value = String(value);
  }

  function newNpcPositions() {
    runtime.npcs = NPC_DEFINITIONS.slice(0, 4 + Math.min(4, Math.floor(state.progression.level / 4))).map((npc, index) => ({
      id: npc.id,
      x: 260 + ((index * 367 + state.progression.shores * 113) % 1320),
      y: 240 + ((index * 229 + state.progression.shores * 79) % 900),
      hair: index % HAIR_STYLES.length,
      tail: (index + 1) % TAIL_STYLES.length,
      makeup: index % MAKEUP_STYLES.length,
      vx: index % 2 ? 10 : -9,
      vy: index % 3 ? 5 : -6,
    }));
  }

  function nearest() {
    if (state.mode !== 'ocean') return null;
    const candidates = [];
    for (const find of state.shore.finds || []) if (!find.collected) candidates.push({ type: 'find', id: find.id, x: find.x, y: find.y, item: find.item });
    for (const npc of runtime.npcs) candidates.push({ type: 'npc', ...npc });
    const sorted = candidates.map((candidate) => ({ ...candidate, distance: distance(state.player, candidate) })).sort((a, b) => a.distance - b.distance);
    return sorted[0]?.distance < 120 ? sorted[0] : null;
  }

  function renderInventory() {
    const list = byId(root, 'inventory-list');
    byId(root, 'inventory-count').textContent = `${state.inventory.filter(({ ownerId }) => ownerId === 'player').length} OBJECTS`;
    const purse = PURSES.find(({ id }) => id === state.player.purse) || PURSES[1];
    byId(root, 'purse-count').textContent = `PURSE ${state.purseIds.length}/${purse.capacity}`;
    const owned = state.inventory.filter(({ ownerId }) => ownerId === 'player');
    list.replaceChildren(...owned.map((item) => {
      const button = root.createElement('button');
      button.type = 'button';button.className = 'inventory-card';button.dataset.itemId = item.id;
      button.setAttribute('aria-pressed', String(item.id === selectedItemId));
      button.innerHTML = `<b>${item.name}</b><small>${item.rarity} · ${state.purseIds.includes(item.id) ? 'AT RISK' : 'SAFE'}</small>`;
      button.addEventListener('click', () => { selectedItemId = item.id; renderInventory(); });
      return button;
    }));
    const selected = state.inventory.find(({ id }) => id === selectedItemId && owned.some((item) => item.id === id));
    byId(root, 'item-actions').hidden = !selected;
    const provenance = byId(root, 'provenance');
    provenance.innerHTML = selected ? `<b>${selected.name}</b><p>${selected.description || selected.origin}</p><ol>${[selected.origin, ...(selected.history || [])].filter(Boolean).map((line) => `<li>${line}</li>`).join('')}</ol>` : '<p>Select an object to review the allegations.</p>';
  }

  function renderUi() {
    root.body?.setAttribute('data-mode', state.mode);
    byId(root, 'game').dataset.mode = state.mode;
    byId(root, 'shore-label').textContent = state.mode === 'home' ? 'PRIVATE GROTTO' : state.shore.name;
    byId(root, 'player-title').textContent = state.player.title;
    byId(root, 'level-value').textContent = String(state.progression.level).padStart(2, '0');
    const floor = xpForLevel(state.progression.level);
    const ceiling = xpForLevel(state.progression.level + 1);
    byId(root, 'xp-fill').style.width = `${Math.max(0, Math.min(100, ((state.progression.xp - floor) / (ceiling - floor)) * 100))}%`;
    byId(root, 'home-actions').hidden = state.mode !== 'home';
    byId(root, 'ocean-controls').hidden = state.mode !== 'ocean';
    byId(root, 'music-toggle').checked = state.settings.music;
    byId(root, 'effects-toggle').checked = state.settings.effects;
    updateContextLabel();
    renderInventory();
    portraitRenderer.drawMermaidToContext({ hair: state.player.hair, tail: state.player.tail, makeup: state.player.makeup });
  }

  function updateContextLabel() {
    runtime.near = nearest();
    byId(root, 'action-label').textContent = runtime.near ? (runtime.near.type === 'find' ? 'CLAIM' : 'APPROACH') : 'LOOK';
  }

  function openSheet(id) {
    root.querySelectorAll('.sheet').forEach((sheet) => { sheet.hidden = sheet.id !== id; });
    const backdrop = root.querySelector('.sheet-backdrop');backdrop.hidden = false;
    if (id === 'home-sheet') { portraitRenderer.resize();portraitRenderer.drawMermaidToContext({ hair: state.player.hair, tail: state.player.tail, makeup: state.player.makeup }); }
    if (id === 'inventory-sheet') renderInventory();
    if (id === 'share-sheet') {
      const model = createReceiptModel(state);
      renderReceipt(byId(root, 'receipt-canvas'), model);
    }
  }
  function closeSheets() { root.querySelectorAll('.sheet').forEach((sheet) => { sheet.hidden = true; });root.querySelector('.sheet-backdrop').hidden = true; }

  function encounter(npcId) {
    activeNpcId = npcId;
    const npc = state.npcs[npcId];
    const card = byId(root, 'npc-card');card.textContent = npc.name;card.style.setProperty('--npc-a', npc.palette[0]);card.style.setProperty('--npc-b', npc.palette[1]);
    byId(root, 'encounter-title').textContent = npc.name;
    const greeting = resolveEncounter(state, npcId, 'greet', Math.random);
    byId(root, 'encounter-copy').textContent = greeting.events[0].text;
    byId(root, 'encounter-actions').hidden = false;byId(root, 'fight-actions').hidden = true;
    openSheet('encounter-sheet');audio.setScene('encounter');
  }

  function contextualAction() {
    runtime.near = nearest();
    if (!runtime.near) { say('Nothing nearby but atmosphere. Swim with more intention.');audio.playEffect('notice');return; }
    if (runtime.near.type === 'find') transition(collectFind(state, runtime.near.id));
    else encounter(runtime.near.id);
  }

  function tick(time) {
    const dt = Math.min(.04, (time - lastTime) / 1000 || 0);lastTime = time;
    if (state.mode === 'ocean' && !root.querySelector('.sheet:not([hidden])')) {
      state.player.x = Math.max(45, Math.min(runtime.worldWidth - 45, state.player.x + movement.x * 215 * dt));
      state.player.y = Math.max(60, Math.min(runtime.worldHeight - 60, state.player.y + movement.y * 215 * dt));
      for (const npc of runtime.npcs) { npc.x += npc.vx * dt;npc.y += npc.vy * dt;if (npc.x < 80 || npc.x > runtime.worldWidth - 80) npc.vx *= -1;if (npc.y < 100 || npc.y > runtime.worldHeight - 100) npc.vy *= -1; }
      runtime.near = nearest();
    }
    renderer.renderFrame({ state, runtime, time });
    if (!(frame++ % 8)) updateContextLabel();
    requestAnimationFrame(tick);
  }

  populateSelect('hair-select', HAIR_STYLES, state.player.hair);
  populateSelect('tail-select', TAIL_STYLES, state.player.tail);
  populateSelect('makeup-select', MAKEUP_STYLES, state.player.makeup);
  populateSelect('purse-select', PURSES, state.player.purse);
  newNpcPositions();

  byId(root, 'begin-game').addEventListener('click', async () => { await audio.unlock();byId(root, 'audio-gate').classList.add('is-gone');say(loaded.warning || 'The ocean has been briefed.'); });
  byId(root, 'enter-ocean').addEventListener('click', () => { if (!state.shore.finds) transition(createOuting(state, Math.random)); else { state.mode='ocean';persist();renderUi(); }newNpcPositions();audio.setScene('ocean'); });
  root.querySelectorAll('[data-open]').forEach((button) => button.addEventListener('click', () => openSheet(button.dataset.open)));
  root.querySelectorAll('[data-close-sheets]').forEach((button) => button.addEventListener('click', closeSheets));
  root.querySelectorAll('[data-tab="home"]').forEach((button) => button.addEventListener('click', () => { transition(returnHome(state));closeSheets();audio.setScene('home'); }));
  for (const [id, key] of [['hair-select','hair'],['tail-select','tail'],['makeup-select','makeup']]) byId(root,id).addEventListener('change',(event)=>{state.player[key]=Number(event.target.value);persist();renderUi();audio.playEffect('equip');});
  byId(root,'purse-select').addEventListener('change',(event)=>{state.player.purse=event.target.value;state.purseIds=[];persist();renderUi();audio.playEffect('pack');});
  byId(root, 'equip-item').addEventListener('click', () => selectedItemId && transition(equipItem(state, selectedItemId)));
  byId(root, 'pack-item').addEventListener('click', () => selectedItemId && transition(packItem(state, selectedItemId)));
  byId(root, 'remix-item').addEventListener('click', () => { if (!selectedRemixId) { selectedRemixId=selectedItemId;say('First ingredient selected. Choose another object.'); } else if (selectedItemId !== selectedRemixId) { transition(remixItems(state,[selectedRemixId,selectedItemId],Math.random));selectedRemixId=null;selectedItemId=null; } });
  root.querySelectorAll('[data-encounter]').forEach((button) => button.addEventListener('click', () => {
    const action=button.dataset.encounter;if(action==='leave'){closeSheets();activeNpcId=null;audio.setScene('ocean');say('You leave with your peace intact.');return;}
    const result=resolveEncounter(state,activeNpcId,action,Math.random);transition(result);
    if(action==='fight'){byId(root,'encounter-actions').hidden=true;byId(root,'fight-actions').hidden=false;audio.setScene('fight');}
  }));
  root.querySelectorAll('[data-fight]').forEach((button) => button.addEventListener('click',()=>{const result=resolveFightMove(state,activeNpcId,button.dataset.fight,Math.random);transition(result);if(!state.fight){closeSheets();audio.setScene('ocean');}else byId(root,'fight-score').textContent=`YOU ${state.fight.playerScore} · HER ${state.fight.npcScore}`;}));
  byId(root,'music-toggle').addEventListener('change',(event)=>audio.setMusicEnabled(event.target.checked));
  byId(root,'effects-toggle').addEventListener('change',(event)=>audio.setEffectsEnabled(event.target.checked));
  byId(root,'new-shore').addEventListener('click',()=>{transition(advanceShore(state,Math.random));newNpcPositions();closeSheets();audio.setScene('ocean');});
  byId(root,'return-home').addEventListener('click',()=>{transition(returnHome(state));closeSheets();audio.setScene('home');});
  byId(root,'reset-game').addEventListener('click',()=>{if(windowObject.confirm('Erase every object, grudge, friendship, and allegation stored on this device?')){state=createDefaultState();persist();windowObject.location.reload();}});
  byId(root,'share-receipt').addEventListener('click',async()=>{const result=await shareReceipt({canvas:byId(root,'receipt-canvas'),navigatorObject:windowObject.navigator,documentObject:root,locationHref:windowObject.location.href});byId(root,'share-status').textContent=result.canceled?'The ocean respects a canceled statement.':`Receipt ${result.method === 'native' ? 'shared' : result.method === 'download' ? 'downloaded' : 'copied'}.`;audio.playEffect('share');});
  createInputController({pad:byId(root,'move-pad'),knob:byId(root,'move-knob'),actionButton:byId(root,'action-button'),target:windowObject,onMove:(x,y)=>{movement={x,y};},onAction:contextualAction});
  const resize=()=>{renderer.resize();portraitRenderer.resize();};windowObject.addEventListener('resize',resize);windowObject.addEventListener('orientationchange',resize);
  root.addEventListener('visibilitychange',()=>root.hidden?audio.suspend():audio.resume());
  renderUi();requestAnimationFrame(tick);
  return { getState:()=>state, destroy(){cancelAnimationFrame(frame);renderer.destroy();portraitRenderer.destroy();audio.destroy();} };
}

if (typeof document !== 'undefined') bootSirenShore();

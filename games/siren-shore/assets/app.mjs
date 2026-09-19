import { FIN_STYLES, HAIR_STYLES, MAKEUP_STYLES, NPC_DEFINITIONS, PURSES, SCALE_STYLES, TAIL_STYLES } from './data.mjs';
import { advanceShore, collectFind, createOuting, equipItem, packItem, remixItems, resolveEncounter, resolveFightMove, returnHome, resumeOuting } from './game.mjs';
import { createDefaultState, loadState, pointsForLevel, saveState } from './state.mjs';
import { appearanceForState, createRenderer } from './render.mjs';
import { createAudioController } from './audio.mjs';
import { createHapticsController } from './haptics.mjs';
import { createCabinetModel, createReceiptModel, renderReceipt, shareReceipt, shouldOfferReceipt } from './share.mjs';
import { advanceWorld, createMotionState, currentViewportFor, ensureActiveZones, nearestActionable, stepMotion } from './world.mjs';
import { collectCurrentEntity, combinationLabel, performSirenCall, selectCurrentTarget, stepCurrent } from './current.mjs';
import { resolveHazard, swellForce } from './hazards.mjs';
import { advanceSocialClock, attemptNpcTheft, chooseNpcTarget, nextPursuit, reconcilePursuitForOuting, resolveContestedPickup, resolvePursuit, stepNpcPursuit } from './social.mjs';

const byId = (root, id) => root.getElementById(id);
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

export { currentViewportFor } from './world.mjs';

/** Semantics reach every feedback consumer. Toast filtering must never mute a pickup. */
export function dispatchOceanEvents(events, { renderer, audio, haptics, say }) {
  renderer.consumeEvents(events);audio.consumeEvents(events);
  for (const event of events) haptics.consumeEvent(event);
  const bookkeeping = new Set(['targetChanged','currentRetired','pointAward','combo','possessionTransferred','publicReaction']);
  const messages = [...new Set(events.filter(event => !bookkeeping.has(event.type)).map(event => event.text).filter(Boolean))];
  if (messages.length) say(messages.join(' '));
}

export function stepDisplayedPoints(displayed, target, dt, reducedMotion = false) {
  if (reducedMotion || target <= displayed) return target;
  const delta = target - displayed;
  return Math.min(target, displayed + Math.max(1, Math.ceil(delta * Math.min(1, Math.max(0,dt) * 12))));
}

export function renderCabinetContent(root, content, model, tab) {
  const node=(tag,text)=>{const result=root.createElement(tag);result.textContent=text;return result;};
  const summary=node('p',`${model.points.toLocaleString()} SIREN POINTS · ${model.title}`);
  summary.className='cabinet-summary';
  const entries=tab==='things'?model.objects:tab==='mermaids'?model.mermaids:model.incidents;
  if(!entries.length){content.replaceChildren(summary,node('p','No statement on file. You are not required to create one.'));return;}
  content.replaceChildren(summary,...entries.map(entry=>{
    const article=root.createElement('article');article.className='cabinet-entry';
    const heading=node('b',tab==='incidents'?entry.text:entry.name);
    article.append(heading);
    if(tab==='things'){
      article.append(node('p',`Currently: ${entry.ownerName}`),node('p',entry.history[0]||entry.origin||'The details remain aquatic.'));
      const details=root.createElement('details');details.append(node('summary','Full provenance'));
      const history=root.createElement('ol');
      for(const line of [entry.origin,...entry.history].filter(Boolean))history.append(node('li',String(line)));
      details.append(history);article.append(details);
    }else if(tab==='mermaids'){
      article.append(node('p',entry.memories[0]?.text||entry.signatureRead||'She has not entered a formal statement.'));
      const details=root.createElement('details');details.append(node('summary','Possessions, relationships & memories'));
      for(const possession of entry.possessions)details.append(node('p',`Wears or holds: ${possession.name}`));
      for(const edge of entry.relationships)details.append(node('p',`${edge.targetName}: affinity ${edge.affinity}, rivalry ${edge.rivalry}, heat ${edge.heat}${edge.alliance?' · allied':''}`));
      for(const memory of entry.memories)if(memory.text)details.append(node('p',memory.text));
      article.append(details);
    }else{
      article.append(node('p',[entry.actorName,entry.targetName].filter(Boolean).join(' · ')),node('small',`${entry.type||'allegation'} · ${entry.visibility||'on file'}`));
    }
    return article;
  }));
}

/** The same bounded frame transition runs in the browser and integration tests. */
export function stepOceanFrame(input, inputRuntime, intent, dt, size, random = Math.random) {
  const seconds = clamp(Number(dt) || 0, 0, .1);
  const runtime = { ...inputRuntime, npcs: (inputRuntime.npcs || []).map(npc => ({ ...npc })) };
  const bounds = { width: runtime.worldWidth || 1800, height: runtime.worldHeight || 1400, endless: true };
  let motion = stepMotion(runtime.motion || createMotionState(input.player), intent, seconds, bounds);
  let state = { ...input, player: { ...input.player, x: motion.x, y: motion.y } };
  state.world = advanceWorld(state.world, state.player, random);
  const viewport = currentViewportFor(state.player, size, bounds);
  const events = [];
  const current = stepCurrent(state, seconds, viewport, random);state = current.state;events.push(...current.events);
  const viewBounds = { minX: Math.max(36,viewport.cameraX+36), maxX: Math.min(bounds.width-36,viewport.cameraX+viewport.width-36), minY: viewport.cameraY+72, maxY: Math.min(bounds.height-72,viewport.cameraY+viewport.height-72) };
  const keepInView = npc => ({ ...npc, x: clamp(npc.x,viewBounds.minX,viewBounds.maxX), y: clamp(npc.y,viewBounds.minY,viewBounds.maxY) });
  const visible = state.current.entities.filter(entity => entity.x>=viewport.cameraX-48 && entity.x<=viewport.cameraX+viewport.width+48 && entity.y>=viewport.cameraY-72 && entity.y<=viewport.cameraY+viewport.height+72);
  runtime.npcs = runtime.npcs.map(previous => {
    if (!state.npcs[previous.id]) return previous;
    if (runtime.pursuit?.npcId === previous.id) {
      // Approach at bounded NPC speed, stop outside contact; the player can
      // decline by simply swimming away. No automatic encounter or damage.
      const gap = Math.hypot(previous.x-state.player.x,previous.y-state.player.y);
      return { ...keepInView(stepNpcPursuit(previous,gap>100 ? {id:'player',...state.player} : null,seconds)), mode:'pursuit-arrival' };
    }
    const target = chooseNpcTarget({ ...state.npcs[previous.id], ...previous },visible,state);
    let npc = keepInView(stepNpcPursuit(previous,target,seconds));
    const liveTarget = target && state.current.entities.find(entity => entity.id===target.id);
    if (liveTarget && Math.hypot(npc.x-liveTarget.x,npc.y-liveTarget.y)<=34) {
      const contest = resolveContestedPickup({ ...state, npcs:{...state.npcs,[npc.id]:{...state.npcs[npc.id],x:npc.x,y:npc.y}},social:{...state.social,contestBounds:viewBounds} },npc.id,liveTarget.id,random);
      state=contest.state;events.push(...contest.events);
      if(contest.impact){motion={...motion,...contest.impact.player};npc={...npc,...contest.impact.npc};}
      if(contest.contested&&contest.winner==='player'){
        const pickup=collectCurrentEntity(state,liveTarget.id);state=pickup.state;events.push(...pickup.events);
      }
      npc={...npc,targetId:null,mode:'drift',vx:-npc.vx*.35,vy:-npc.vy*.35};
    }
    npc.theftCooldown=Math.max(0,(Number(npc.theftCooldown)||0)-seconds);
    if(npc.theftCooldown===0 && Math.hypot(npc.x-state.player.x,npc.y-state.player.y)<=96){
      const theft=attemptNpcTheft(state,npc.id,random);state=theft.state;events.push(...theft.events);npc.theftCooldown=7+random()*6;
    }
    return npc;
  });
  const social=advanceSocialClock(state,seconds,random);state=social.state;events.push(...social.events);
  if (!runtime.pursuit) {
    const pursuit=nextPursuit(state,state.world.zoneIndex);
    const npc=pursuit&&runtime.npcs.find(npc=>npc.id===pursuit.npcId);
    if(npc){
      npc.x=pursuit.entry==='below'?state.player.x:pursuit.entry==='left'?viewBounds.minX:viewBounds.maxX;
      npc.y=pursuit.entry==='below'?viewBounds.maxY:state.player.y;npc.vx=0;npc.vy=0;
      runtime.pursuit={...pursuit,startedAt:state.social.clock.elapsed,origin:{x:state.player.x,y:state.player.y}};
      state={...state,social:{...state.social,pursuits:[runtime.pursuit]}};
      events.push({type:'pursuit',text:`${state.npcs[npc.id].name} is coming from ${pursuit.entry}. Meet her or keep swimming.`,pursuit:runtime.pursuit});
    }
  }
  if(runtime.pursuit && (Math.hypot(state.player.x-runtime.pursuit.origin.x,state.player.y-runtime.pursuit.origin.y)>=240 || state.social.clock.elapsed-runtime.pursuit.startedAt>25)){
    const departed=reconcilePursuitForOuting(state,runtime.pursuit,'swimAway');state=departed.state;events.push(...departed.events);runtime.pursuit=null;
  }
  if(state.current.swell?.phase==='active'){
    const force=swellForce(state.current.swell,{...state.player,...viewBounds});
    motion={...motion,x:clamp(state.player.x+force.x*seconds,viewBounds.minX,viewBounds.maxX),y:clamp(state.player.y+force.y*seconds,viewBounds.minY,viewBounds.maxY),vx:motion.vx+force.x*seconds,vy:motion.vy+force.y*seconds};
    state.player={...state.player,x:motion.x,y:motion.y};
    runtime.npcs=runtime.npcs.map(npc=>{const force=swellForce(state.current.swell,{...npc,...viewBounds});return keepInView({...npc,x:npc.x+force.x*seconds,y:npc.y+force.y*seconds});});
  }
  const collision=state.current.entities.find(entity=>entity.kind==='hazard'&&Math.hypot(entity.x-state.player.x,entity.y-state.player.y)<=52);
  if(collision){const hazard=resolveHazard(state,collision.id,random);state=hazard.state;events.push(...hazard.events);}
  runtime.motion={...motion,x:state.player.x,y:state.player.y};
  runtime.camera=currentViewportFor(state.player,size,bounds);
  return {state,runtime,events,viewport:runtime.camera};
}

function isVisibleUi(element) {
  for(let node=element;node;node=node.parentElement){
    if(node.hidden || node.classList?.contains('is-gone') || node.getAttribute?.('aria-hidden')==='true')return false;
    if(String(node.tagName).toUpperCase()==='DIALOG' && !node.open)return false;
    const style=node.ownerDocument?.defaultView?.getComputedStyle?.(node) || node.style;
    if(style?.display==='none' || style?.visibility==='hidden')return false;
  }
  return true;
}

function isBlockingDialog(node) {
  return (node.classList?.contains('sheet') || node.getAttribute?.('role')==='dialog' || String(node.tagName).toUpperCase()==='DIALOG') && isVisibleUi(node);
}

export function hasBlockingUi(root) {
  return [...root.querySelectorAll('.sheet, [role="dialog"], dialog')].some(isBlockingDialog);
}

export function isWorldActionAllowed(target, sheetOpen) {
  if (sheetOpen) return false;
  for (let node = target; node; node = node.parentElement) {
    if (['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(String(node.tagName || '').toUpperCase()) || node.isContentEditable || isBlockingDialog(node)) return false;
  }
  return true;
}

export function shouldHandleActionKey(event, sheetOpen) {
  const key = event?.key?.length === 1 ? event.key.toLowerCase() : event?.key;
  if (![' ', 'Spacebar', 'e', 'z', 'Enter'].includes(key) || event?.repeat || !isWorldActionAllowed(event?.target, sheetOpen)) return false;
  event.preventDefault?.();
  return true;
}

export function sheetTriggerForOpen({ sheetWasOpen, lastSheetTrigger, trigger }) {
  return sheetWasOpen ? lastSheetTrigger : trigger || null;
}

export function shouldSurfaceOceanEvent(type) {
  return ['currentRetired', 'rushStart', 'rushSummary', 'hazard', 'itemReleased', 'lookChanged', 'swellWarning', 'swellStart', 'swellImpact', 'swellEnd', 'pointAward', 'levelUp', 'contest', 'npcPickup', 'npcTheft', 'gossip', 'alliance', 'confrontation', 'reconciliation', 'pursuit'].includes(type);
}

/** A persistent status band for swells; the canvas retains the visual water cue. */
export function swellBannerModel(mode, swell) {
  if (mode !== 'ocean' || !swell?.phase) return { hidden: true, phase: null, text: '' };
  if (swell.phase === 'warning') return { hidden: false, phase: 'warning', text: 'SWELL WARNING · THE OCEAN IS GATHERING AN OPINION' };
  if (swell.phase === 'active') return { hidden: false, phase: 'active', text: 'SWELL ACTIVE · KEEP SWIMMING' };
  return { hidden: true, phase: null, text: '' };
}

export function createInputController({ pad, knob, actionButton, target = window, onMove, onAction, sheetOpen = () => false }) {
  let pointer = null;
  let moving = false;
  const keys = new Set();
  const emitMove = (x,y) => { moving = Boolean(x || y);onMove(x,y); };
  const reset = () => { keys.clear();pointer=null;knob.style.transform='';if(moving)emitMove(0,0); };
  const resetPad = reset;
  const movePointer = (event) => {
    if (event.pointerId !== pointer || sheetOpen()) return;
    const rect = pad.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const limit = rect.width * .3;
    const magnitude = Math.hypot(dx, dy) || 1;
    const scale = Math.min(1, limit / magnitude);
    const x = dx * scale;
    const y = dy * scale;
    knob.style.transform = `translate(${x}px, ${y}px)`;
    emitMove(x / limit, y / limit);
  };
  const pointerDown = (event) => { if(sheetOpen())return;pointer = event.pointerId; pad.setPointerCapture(pointer); movePointer(event); };
  const pointerEnd = (event) => { if (event.pointerId === pointer) resetPad(); };
  const keyVector = () => {
    const x = Number(keys.has('ArrowRight') || keys.has('d')) - Number(keys.has('ArrowLeft') || keys.has('a'));
    const y = Number(keys.has('ArrowDown') || keys.has('s')) - Number(keys.has('ArrowUp') || keys.has('w'));
    const magnitude = Math.hypot(x, y) || 1;
    emitMove(x / magnitude, y / magnitude);
  };
  const keydown = (event) => {
    if (!isWorldActionAllowed(event.target,sheetOpen())) { keys.clear();return; }
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(key)) { keys.add(key); keyVector(); event.preventDefault(); }
    if (shouldHandleActionKey(event, sheetOpen())) onAction();
  };
  const keyup = (event) => {
    if (!isWorldActionAllowed(event.target,sheetOpen())) { keys.clear();return; }
    if(keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key))keyVector();
  };
  const focusin = (event) => { if(!isWorldActionAllowed(event.target,sheetOpen()))reset(); };
  const actionClick = () => { if(!sheetOpen())onAction(); };
  pad.addEventListener('pointerdown', pointerDown);
  pad.addEventListener('pointermove', movePointer);
  pad.addEventListener('pointerup', pointerEnd);
  pad.addEventListener('pointercancel', pointerEnd);
  actionButton.addEventListener('click', actionClick);
  target.addEventListener('keydown', keydown);
  target.addEventListener('keyup', keyup);
  target.addEventListener('focusin', focusin);
  target.addEventListener('blur', reset);
  return { reset, destroy() { pad.removeEventListener('pointerdown', pointerDown); target.removeEventListener('keydown', keydown); target.removeEventListener('keyup', keyup); target.removeEventListener('focusin', focusin);target.removeEventListener('blur', reset); } };
}

export function bootSirenShore(root = document, windowObject = window) {
  const loaded = loadState(windowObject.localStorage);
  let state = loaded.state;
  state.world = ensureActiveZones(state.world, Math.random);
  let movement = { x: 0, y: 0 };
  let displayedPoints = state.progression.points;
  let selectedItemId = null;
  let selectedRemixId = null;
  let cabinetTab = 'things';
  let lastSheetTrigger = null;
  let activeNpcId = state.mode === 'fight' ? state.fight?.npcId || null : null;
  let lastTime = performance.now();
  let frame = 0;
  let animationFrameId = 0;
  let arcadeCaptionTimer = 0;
  const canvas = byId(root, 'ocean-canvas');
  const reducedMotion = Boolean(state.settings.reducedMotion || windowObject.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const renderer = createRenderer(canvas, { reducedMotion });
  const portraitRenderer = createRenderer(byId(root, 'portrait-canvas'), { reducedMotion: true });
  const runtime = { worldWidth: 1800, worldHeight: 1400, npcs: [], near: null, pursuit: null, reducedMotion, motion: createMotionState(state.player) };
  const audio = createAudioController({
    soundtrackUrl: './assets/siren-score.mp3',
    settings: state.settings,
    onSettings: (settings) => { state.settings = { ...state.settings, ...settings }; persist(); },
  });
  const haptics = createHapticsController({
    vibrate: windowObject.navigator?.vibrate?.bind(windowObject.navigator),
    enabled: state.settings.haptics !== false,
    interacted: false,
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
    dispatchOceanEvents(events,{renderer,audio,haptics,say});
    const rare = events.find(({ type }) => type === 'rarePickup');
    if (rare) {
      const caption = byId(root, 'arcade-caption');
      caption.textContent = rare.tier === 'legendary' || rare.multiplier >= 3 ? 'LEGENDARY ACQUISITION' : 'IMPORTANT TO HER';
      caption.hidden = false;
      windowObject.clearTimeout?.(arcadeCaptionTimer);
      arcadeCaptionTimer = windowObject.setTimeout?.(() => { caption.hidden = true; }, runtime.reducedMotion ? 2200 : 1500);
    }
    if (events.some(({ type }) => ['pointAward', 'combo', 'comboResolved', 'rushStart', 'rushSummary'].includes(type))) {
      updateProgressHud();
      byId(root, 'player-title').textContent = state.player.title;
      byId(root, 'level-value').textContent = String(state.progression.level).padStart(2, '0');
    }
    if (events.some(({ type }) => ['swellWarning', 'swellStart', 'swellEnd'].includes(type))) updateSwellBanner();
    if (events.some(({type}) => !['targetChanged','currentRetired'].includes(type))) persist();
    if (shouldOfferReceipt(events)) offerReceipt();
  };
  const transition = (result) => { state = result.state;runtime.motion=createMotionState(state.player); applyEvents(result.events); renderUi(); };

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
      y: state.player.y - 260 + ((index * 229 + state.progression.shores * 79) % 650),
      hair: index % HAIR_STYLES.length,
      tail: (index + 1) % TAIL_STYLES.length,
      makeup: index % MAKEUP_STYLES.length,
      vx: index % 2 ? 10 : -9,
      vy: index % 3 ? 5 : -6,
      targetId: null,
      mode: 'drift',
      frustration: 0,
      theftCooldown: 4 + index,
    }));
  }


  function clearOutingPursuit() {
    if (!runtime.pursuit) {
      state.social.pursuits = [];
      return [];
    }
    const resolved = resolvePursuit(state, runtime.pursuit, 'swimAway');
    state = resolved.state;
    runtime.pursuit = null;
    state.social.pursuits = [];
    return resolved.events;
  }

  function returnToGrotto() {
    const pursuitEvents = clearOutingPursuit();
    const home = returnHome(state);
    state = home.state;
    applyEvents([...pursuitEvents, ...home.events]);
    renderUi();
  }

  function nearest() {
    if (state.mode !== 'ocean') return null;
    const currentTarget = selectCurrentTarget(state.player, state.current.entities || [], 120);
    const entities = [
      ...(state.shore.finds || []).map((find) => ({ type: 'find', ...find })),
      ...(currentTarget ? [{ type: 'current', ...currentTarget }] : []),
    ];
    const npcs = runtime.npcs.map((npc) => ({ type: 'npc', ...npc }));
    return nearestActionable(state.player, entities, npcs, 120);
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

  function renderCabinet() {
    const model = createCabinetModel(state);
    const content = byId(root, 'cabinet-content');
    root.querySelectorAll('[data-cabinet-tab]').forEach((button) => button.setAttribute('aria-selected', String(button.dataset.cabinetTab === cabinetTab)));
    renderCabinetContent(root,content,model,cabinetTab);
  }

  function renderUi() {
    root.body?.setAttribute('data-mode', state.mode);
    byId(root, 'game').dataset.mode = state.mode;
    byId(root, 'shore-label').textContent = state.mode === 'home' ? 'PRIVATE GROTTO' : state.shore.name;
    byId(root, 'player-title').textContent = state.player.title;
    byId(root, 'level-value').textContent = String(state.progression.level).padStart(2, '0');
    updateProgressHud();
    byId(root, 'home-actions').hidden = state.mode !== 'home';
    byId(root, 'ocean-controls').hidden = state.mode !== 'ocean';
    byId(root, 'music-toggle').checked = state.settings.music;
    byId(root, 'effects-toggle').checked = state.settings.effects;
    byId(root, 'haptics-toggle').checked = state.settings.haptics !== false;
    updateContextLabel();
    renderInventory();
    portraitRenderer.drawMermaidToContext(appearanceForState(state));
  }

  function updateProgressHud() {
    const combo = state.current?.combo || { chain: null, count: 0, multiplier: 1 };
    const floor = pointsForLevel(state.progression.level);
    const ceiling = pointsForLevel(state.progression.level + 1);
    if(runtime.reducedMotion)displayedPoints=state.progression.points;
    byId(root, 'points-value').textContent = displayedPoints.toLocaleString();
    byId(root, 'xp-fill').style.width = `${Math.max(0, Math.min(100, ((state.progression.points - floor) / (ceiling - floor)) * 100))}%`;
    byId(root, 'combo-label').textContent = combo.chain ? combinationLabel(combo) : 'TREASURE THEORY';
    byId(root, 'combo-count').textContent = combo.count ? `${combo.count} · ×${combo.multiplier}` : '×1';
    const banner = byId(root, 'rush-banner');
    banner.hidden = state.current?.rush !== 'rush';
    banner.textContent = state.current?.rush === 'rush' ? 'TREASURE RUSH · FIND EVERYTHING' : 'TREASURE RUSH';
    updateSwellBanner();
  }

  function updateSwellBanner() {
    const banner = byId(root, 'swell-banner');
    const model = swellBannerModel(state.mode, state.current?.swell);
    banner.hidden = model.hidden;
    banner.dataset.phase = model.phase || '';
    banner.textContent = model.text;
  }

  function updateContextLabel() {
    runtime.near = nearest();
    renderer.setTarget(runtime.near);
    const [action, detail] = runtime.near ? (runtime.near.type === 'npc' ? ['APPROACH', 'MERMAID'] : ['CLAIM', runtime.near.type === 'current' ? 'TREASURE CURRENT' : 'TREASURE']) : ['CALL', 'INTO THE DARK'];
    byId(root, 'action-label').textContent = action;
    byId(root, 'action-detail').textContent = detail;
  }

  function openSheet(id, trigger = root.activeElement) {
    inputController.reset();
    movement={x:0,y:0};runtime.motion=createMotionState(state.player);
    const sheetWasOpen = Boolean(root.querySelector('.sheet:not([hidden])'));
    lastSheetTrigger = sheetTriggerForOpen({ sheetWasOpen, lastSheetTrigger, trigger: trigger?.focus ? trigger : null });
    root.querySelectorAll('.sheet').forEach((sheet) => { sheet.hidden = sheet.id !== id; });
    const backdrop = root.querySelector('.sheet-backdrop');backdrop.hidden = false;
    if (id === 'home-sheet') { portraitRenderer.resize();portraitRenderer.drawMermaidToContext(appearanceForState(state)); }
    if (id === 'inventory-sheet') renderInventory();
    if (id === 'cabinet-sheet') renderCabinet();
    if (id === 'share-sheet') {
      byId(root, 'receipt-offer').hidden = true;
      const model = createReceiptModel(state);
      renderReceipt(byId(root, 'receipt-canvas'), model);
    }
    root.defaultView?.queueMicrotask?.(() => byId(root, id).querySelector('.sheet-close')?.focus());
  }
  function offerReceipt() { byId(root, 'receipt-offer').hidden = false; }
  function restoreFightSheet() {
    if (!activeNpcId || !state.npcs[activeNpcId] || !state.fight) return;
    const npc = state.npcs[activeNpcId];
    const card = byId(root, 'npc-card');card.textContent = npc.name;card.style.setProperty('--npc-a', npc.palette[0]);card.style.setProperty('--npc-b', npc.palette[1]);
    byId(root, 'encounter-title').textContent = npc.name;
    byId(root, 'encounter-copy').textContent = state.lastIncident?.text || `${npc.name} remembers exactly where this altercation paused.`;
    openSheet('encounter-sheet');byId(root, 'encounter-actions').hidden = true;byId(root, 'fight-actions').hidden = false;
    byId(root, 'fight-score').textContent = `YOU ${state.fight.playerScore} · HER ${state.fight.npcScore}`;
    audio.setScene('fight');
  }
  function closeSheets() {
    root.querySelectorAll('.sheet').forEach((sheet) => { sheet.hidden = true; });root.querySelector('.sheet-backdrop').hidden = true;
    lastSheetTrigger?.focus?.();lastSheetTrigger = null;
    if (state.mode === 'fight' && state.fight && activeNpcId) restoreFightSheet();
  }

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
    if(hasBlockingUi(root))return;
    runtime.near = nearest();
    if (!runtime.near) { transition(performSirenCall(state, state.player, state.current.entities));return; }
    if (runtime.near.type === 'find') transition(collectFind(state, runtime.near.id));
    else if (runtime.near.type === 'current') transition(collectCurrentEntity(state, runtime.near.id));
    else {
      if (runtime.pursuit?.npcId === runtime.near.id) {
        const resolved = resolvePursuit(state, runtime.pursuit, 'engage');
        runtime.pursuit = null;
        transition(resolved);
      }
      encounter(runtime.near.id);
    }
  }

  function tick(time) {
    const dt = Math.min(.04, (time - lastTime) / 1000 || 0);lastTime = time;
    const nextPoints=stepDisplayedPoints(displayedPoints,state.progression.points,dt,runtime.reducedMotion);
    if(nextPoints!==displayedPoints){displayedPoints=nextPoints;byId(root,'points-value').textContent=displayedPoints.toLocaleString();}
    if (state.mode === 'ocean' && !hasBlockingUi(root)) {
      const bounds = canvas.getBoundingClientRect();
      const next = stepOceanFrame(state, runtime, movement, dt, { width: bounds.width, height: bounds.height }, Math.random);
      state = next.state;Object.assign(runtime,next.runtime);
      if (next.events.length) applyEvents(next.events);
      byId(root, "shore-label").textContent = state.world.zones.find(zone => zone.index === state.world.zoneIndex)?.name || state.shore.name;
      runtime.near = nearest();
      renderer.setTarget(runtime.near);
    }
    renderer.renderFrame({ state, runtime, time });
    if (!(frame++ % 8)) updateContextLabel();
    animationFrameId = requestAnimationFrame(tick);
  }

  populateSelect('hair-select', HAIR_STYLES, state.player.hair);
  populateSelect('tail-select', TAIL_STYLES, state.player.tail);
  populateSelect('makeup-select', MAKEUP_STYLES, state.player.makeup);
  populateSelect('scale-select', SCALE_STYLES, state.player.scales);
  populateSelect('fin-select', FIN_STYLES, state.player.fins);
  populateSelect('purse-select', PURSES, state.player.purse);
  newNpcPositions();

  byId(root, 'begin-game').addEventListener('click', async (event) => {
    haptics.activate();
    const result = await audio.unlock();
    if (!result.ok) { event.currentTarget.textContent = 'TRY SOUND AGAIN';say(result.warning);return; }
    byId(root, 'audio-gate').classList.add('is-gone');say(loaded.warning || 'The ocean has been briefed.');
  });
  byId(root, 'skip-audio').addEventListener('click', () => { haptics.activate();byId(root, 'audio-gate').classList.add('is-gone');say('You enter silently. Music remains available under More.'); });
  byId(root, 'receipt-offer').addEventListener('click', (event) => openSheet('share-sheet', event.currentTarget));
  byId(root, 'enter-ocean').addEventListener('click', () => { runtime.pursuit = null;state.social.pursuits = [];if (!state.shore.finds) transition(createOuting(state, Math.random)); else transition(resumeOuting(state));newNpcPositions();audio.setScene('ocean'); });
  root.querySelectorAll('[data-open]').forEach((button) => button.addEventListener('click', (event) => openSheet(button.dataset.open, event.currentTarget)));
  root.querySelectorAll('[data-close-sheets]').forEach((button) => button.addEventListener('click', closeSheets));
  root.querySelectorAll('[data-cabinet-tab]').forEach((button) => button.addEventListener('click', () => { cabinetTab = button.dataset.cabinetTab;renderCabinet(); }));
  windowObject.addEventListener('keydown', (event) => { if (event.key === 'Escape' && root.querySelector('.sheet:not([hidden])')) closeSheets(); });
  root.querySelectorAll('[data-tab="home"]').forEach((button) => button.addEventListener('click', () => { returnToGrotto();closeSheets();audio.setScene('home'); }));
  for (const [id, key] of [['hair-select','hair'],['tail-select','tail'],['makeup-select','makeup'],['scale-select','scales'],['fin-select','fins']]) byId(root,id).addEventListener('change',(event)=>{state.player[key]=Number(event.target.value);persist();renderUi();audio.playEffect('equip');});
  byId(root,'purse-select').addEventListener('change',(event)=>{state.player.purse=event.target.value;state.purseIds=[];persist();renderUi();audio.playEffect('pack');});
  byId(root, 'equip-item').addEventListener('click', () => selectedItemId && transition(equipItem(state, selectedItemId)));
  byId(root, 'pack-item').addEventListener('click', () => selectedItemId && transition(packItem(state, selectedItemId)));
  byId(root, 'remix-item').addEventListener('click', () => { if (!selectedRemixId) { selectedRemixId=selectedItemId;say('First ingredient selected. Choose another object.'); } else if (selectedItemId !== selectedRemixId) { transition(remixItems(state,[selectedRemixId,selectedItemId],Math.random));selectedRemixId=null;selectedItemId=null; } });
  root.querySelectorAll('[data-encounter]').forEach((button) => button.addEventListener('click', () => {
    const action=button.dataset.encounter;if(action==='leave'){if (state.mode === 'fight') clearOutingPursuit();if (state.mode === 'fight') transition(returnHome(state));closeSheets();activeNpcId=null;audio.setScene(state.mode === 'home' ? 'home' : 'ocean');say('You leave with your peace intact.');return;}
    const result=resolveEncounter(state,activeNpcId,action,Math.random);transition(result);
    if(action==='fight'){byId(root,'encounter-actions').hidden=true;byId(root,'fight-actions').hidden=false;audio.setScene('fight');}
  }));
  root.querySelectorAll('[data-fight]').forEach((button) => button.addEventListener('click',()=>{const result=resolveFightMove(state,activeNpcId,button.dataset.fight,Math.random);transition(result);if(!state.fight){closeSheets();audio.setScene('ocean');}else byId(root,'fight-score').textContent=`YOU ${state.fight.playerScore} · HER ${state.fight.npcScore}`;}));
  byId(root,'music-toggle').addEventListener('change',async(event)=>{audio.setMusicEnabled(event.target.checked);if(event.target.checked){const result=await audio.unlock();if(!result.ok)say(result.warning);}});
  byId(root,'effects-toggle').addEventListener('change',(event)=>audio.setEffectsEnabled(event.target.checked));
  byId(root,'haptics-toggle').addEventListener('change',(event)=>{state.settings.haptics=event.target.checked;haptics.setEnabled(event.target.checked);persist();});
  byId(root,'new-shore').addEventListener('click',()=>{clearOutingPursuit();transition(advanceShore(state,Math.random));runtime.pursuit=null;state.social.pursuits=[];newNpcPositions();closeSheets();audio.setScene('ocean');});
  byId(root,'return-home').addEventListener('click',()=>{returnToGrotto();closeSheets();audio.setScene('home');});
  byId(root,'reset-game').addEventListener('click',()=>{if(windowObject.confirm('Erase every object, grudge, friendship, and allegation stored on this device?')){state=createDefaultState();persist();windowObject.location.reload();}});
  byId(root,'share-receipt').addEventListener('click',async()=>{const result=await shareReceipt({canvas:byId(root,'receipt-canvas'),navigatorObject:windowObject.navigator,documentObject:root,locationHref:windowObject.location.href});byId(root,'share-status').textContent=result.canceled?'The ocean respects a canceled statement.':`Receipt ${result.method === 'native' ? 'shared' : result.method === 'download' ? 'downloaded' : 'copied'}.`;audio.playEffect('share');});
  const inputController = createInputController({pad:byId(root,'move-pad'),knob:byId(root,'move-knob'),actionButton:byId(root,'action-button'),target:windowObject,onMove:(x,y)=>{movement={x,y};},onAction:contextualAction,sheetOpen:()=>hasBlockingUi(root)});
  const resize=()=>{renderer.resize();portraitRenderer.resize();};windowObject.addEventListener('resize',resize);windowObject.addEventListener('orientationchange',resize);
  root.addEventListener('visibilitychange',()=>root.hidden?audio.suspend():audio.resume());
  renderUi();if(state.mode === 'fight')restoreFightSheet();animationFrameId=requestAnimationFrame(tick);
  return { getState:()=>state, destroy(){cancelAnimationFrame(animationFrameId);renderer.destroy();portraitRenderer.destroy();audio.destroy();} };
}

if (typeof document !== 'undefined') bootSirenShore();

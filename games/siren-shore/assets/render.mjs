import { currentViewportFor } from './world.mjs';
import { relationshipKey } from './social.mjs';
const TAU = Math.PI * 2;
const inventoryIndexes = new WeakMap();
const npcAppearanceCache = new WeakMap();
function inventoryIndex(state) {
  const inventory=state.inventory || [];
  if(!inventoryIndexes.has(inventory))inventoryIndexes.set(inventory,new Map(inventory.map(item=>[item.id,item])));
  return inventoryIndexes.get(inventory);
}

const ARCHETYPE_SHAPES = Object.freeze({
  coin: 'coin', pearl: 'pearl', jewel: 'gem', gem: 'gem', crown: 'crown', bag: 'bag', junk: 'junk',
  jellyfish: 'jellyfish', eel: 'eel', squid: 'squid', treasure: 'treasure', jewelry: 'gem',
  hair: 'hair', makeup: 'makeup', clothing: 'clothing', shoe: 'shoe', glove: 'glove', weapon: 'weapon',
});

const SLOT_SHAPES = Object.freeze({
  crown: 'crown', purse: 'bag', jewelry: 'gem', treasure: 'treasure', hair: 'hair', makeup: 'makeup',
  clothing: 'clothing', shoe: 'shoe', glove: 'glove', weapon: 'weapon',
});

export const EFFECT_INTENSITY = Object.freeze({
  pickup: 1,
  combo: 2,
  rarePickup: 3,
  rushStart: 3,
  swellStart: 2,
  legendary: 4,
});

export function shapeForArchetype(archetypeId) {
  return ARCHETYPE_SHAPES[String(archetypeId || '').toLowerCase()] || 'junk';
}

export function semanticShapeForItem(item = {}) {
  const archetype = String(item.archetypeId || '').toLowerCase();
  const archetypeShape = shapeForArchetype(archetype);
  if (archetypeShape !== 'junk' || archetype === 'junk') return archetypeShape;
  const declaredShape = String(item.shape || '').toLowerCase();
  const explicitShape = shapeForArchetype(declaredShape);
  if (explicitShape !== 'junk' || declaredShape === 'junk') return explicitShape;
  const name = String(item.name || '').toLowerCase();
  if (/tiara|crown/.test(name)) return 'crown';
  if (/bag|clutch|handbag/.test(name)) return 'bag';
  if (/ring|earring|brooch|anklet|corsage|jewel/.test(name)) return 'gem';
  if (/wig|veil|bonnet/.test(name)) return 'hair';
  if (/compact|mirror|eyelash/.test(name)) return 'makeup';
  if (/sandal|shoe/.test(name)) return 'shoe';
  if (/sabre|fork|opener|pick|fan/.test(name)) return 'weapon';
  if (SLOT_SHAPES[item.slot]) return SLOT_SHAPES[item.slot];
  if (/coin|gold/.test(name)) return 'coin';
  if (/pearl/.test(name)) return 'pearl';
  return 'junk';
}

export function semanticShapeForCurrentEntity(entity = {}) {
  const item = entity.item || {};
  return semanticShapeForItem({
    ...item,
    archetypeId: entity.archetypeId ?? item.archetypeId,
    shape: entity.shape ?? item.shape,
  });
}

export function createEffectsPool({ reducedMotion = false, maxParticles = 96 } = {}) {
  const requested = Math.max(0, Math.floor(Number(maxParticles) || 0));
  return {
    reducedMotion: Boolean(reducedMotion),
    maxParticles: Math.min(reducedMotion ? 32 : 96, requested || (reducedMotion ? 32 : 96)),
    particles: [],
    emphasis: [],
  };
}

export function pushEffect(pool, event = {}) {
  if (!pool) return pool;
  const type = event.type || 'sparkle';
  const x = Number(event.x) || 0;
  const y = Number(event.y) || 0;
  const intensity = Math.max(1, Number(event.intensity) || EFFECT_INTENSITY[type] || 1);
  const emphasis = type === 'target' || pool.reducedMotion || intensity >= 3;
  if (emphasis) {
    pool.emphasis.push({ type, x, y, intensity, amount: event.amount, motion: pool.reducedMotion ? 'static' : 'pulse', bornAt: Number(event.bornAt) || 0 });
    if (pool.emphasis.length > 16) pool.emphasis.splice(0, pool.emphasis.length - 16);
  }
  if (pool.reducedMotion || type === 'target') return pool;
  if (pool.particles.length >= pool.maxParticles) pool.particles.shift();
  pool.particles.push({ type, x, y, intensity, amount: event.amount, bornAt: Number(event.bornAt) || 0, life: Number(event.life) || (intensity >= 4 ? 1400 : 760) });
  return pool;
}

export function visualEffectForEvent(event = {}) {
  const legendary = event.type === 'rarePickup' && (event.tier === 'legendary' || Number(event.multiplier) >= 3);
  const type = legendary ? 'legendary' : event.type;
  return { ...event, type, intensity: EFFECT_INTENSITY[type] || (event.type === 'pointAward' || event.type === 'combo' ? 2 : 1) };
}

export function pursuitCueFor(state, pursuit) {
  if (!pursuit?.npcId || !state?.npcs?.[pursuit.npcId]) return null;
  return {
    npcId: pursuit.npcId,
    label: `${state.npcs[pursuit.npcId].name.split(' ')[0].toUpperCase()} IS COMING UP`,
    entry: pursuit.entry || 'below',
  };
}

export function appearanceForState(state) {
  return {
    hair: state.player.hair,
    tail: state.player.tail,
    makeup: state.player.makeup,
    scales: state.player.scales || 0,
    fins: state.player.fins || 0,
    effects: { ...(state.player.effects || {}) },
    equippedItems: Object.values(state.equipped || {})
      .map((id) => inventoryIndex(state).get(id))
      .filter(item=>item?.ownerId==='player'),
  };
}

export function appearanceForNpc(state, npcId) {
  const npc=state.npcs?.[npcId];if(!npc)return {equippedItems:[]};
  const possessions = npc.possessions || [];
  const cached = npcAppearanceCache.get(possessions);
  if (cached?.inventory === state.inventory && cached.incidents === state.social?.incidents && cached.palette === npc.palette) return cached.appearance;
  const disputed=new Set((state.social?.incidents||[]).filter(incident=>incident.actorId===npcId||incident.targetId===npcId).map(incident=>incident.itemId));
  const slots=new Map();
  for(const id of possessions){
    const item=inventoryIndex(state).get(id);
    if(!item||item.ownerId!==npcId||!SLOT_SHAPES[item.slot]||item.slot==='treasure')continue;
    if(!slots.has(item.slot)||disputed.has(id))slots.set(item.slot,item);
  }
  const appearance = {palette:npc.palette,equippedItems:[...slots.values()].slice(0,9)};
  npcAppearanceCache.set(possessions,{inventory:state.inventory,incidents:state.social?.incidents,palette:npc.palette,appearance});
  return appearance;
}

function seededUnit(value) {
  const x = Math.sin(value * 999.91) * 43758.5453;
  return x - Math.floor(x);
}

export function createRenderer(canvas, { reducedMotion = false } = {}) {
  const context = canvas.getContext('2d');
  let width = 1;
  let height = 1;
  let ratio = 1;
  let destroyed = false;
  let activeTarget = null;
  let lastPlayer = { x: 0, y: 0 };
  const effects = createEffectsPool({ reducedMotion, maxParticles: reducedMotion ? 32 : 96 });

  function resize() {
    const rect = canvas.getBoundingClientRect();
    ratio = Math.min(2, globalThis.devicePixelRatio || 1);
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function oceanBackground(time, palette = ['#0b5077', '#071a35', '#ff4faf']) {
    const gradient = context.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, palette[0] || '#0b5077');
    gradient.addColorStop(.58, palette[1] || '#071a35');
    gradient.addColorStop(1, '#030814');
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
    context.save();
    context.globalAlpha = .13;
    context.fillStyle = '#b9fff7';
    for (let i = 0; i < 7; i += 1) {
      const sway = reducedMotion ? 0 : Math.sin(time / 1700 + i) * 25;
      context.beginPath();
      context.moveTo(width * (i / 7) + sway, 0);
      context.lineTo(width * (i / 7) + 90 + sway, 0);
      context.lineTo(width * (i / 7) + 250 + sway, height);
      context.lineTo(width * (i / 7) + 120 + sway, height);
      context.closePath();
      context.fill();
    }
    context.restore();
  }

  function kelp(x, base, scale, time, color) {
    context.save();
    context.strokeStyle = color;
    context.lineWidth = 8 * scale;
    context.lineCap = 'round';
    context.globalAlpha = .55;
    context.beginPath();
    context.moveTo(x, base);
    const sway = reducedMotion ? 0 : Math.sin(time / 900 + x) * 15;
    context.bezierCurveTo(x - 25, base - 80 * scale, x + 30 + sway, base - 150 * scale, x + sway, base - 230 * scale);
    context.stroke();
    context.restore();
  }

  function drawTreasureGlyph(shape, primary, secondary, selected = false) {
    context.fillStyle = primary;
    context.strokeStyle = selected ? '#ff4faf' : '#fff1d0';
    context.lineWidth = selected ? 4 : 2;
    if (shape === 'coin') { context.beginPath();context.arc(0, 0, 11, 0, TAU);context.fill();context.stroke();context.fillStyle=secondary;context.globalAlpha=.72;context.beginPath();context.arc(0,0,4,0,TAU);context.fill(); }
    else if (shape === 'pearl') { context.beginPath();context.arc(0, 0, 10, 0, TAU);context.fill();context.stroke();context.fillStyle='#fff';context.globalAlpha=.72;context.beginPath();context.arc(-3,-3,3,0,TAU);context.fill(); }
    else if (shape === 'gem') { context.beginPath();context.moveTo(0,-15);context.lineTo(13,-3);context.lineTo(7,14);context.lineTo(-7,14);context.lineTo(-13,-3);context.closePath();context.fill();context.stroke();context.strokeStyle=secondary;context.lineWidth=1.5;context.beginPath();context.moveTo(-13,-3);context.lineTo(13,-3);context.moveTo(0,-15);context.lineTo(0,14);context.stroke(); }
    else if (shape === 'crown') { context.beginPath();context.moveTo(-15,11);context.lineTo(-13,-10);context.lineTo(-5,-1);context.lineTo(0,-15);context.lineTo(6,-1);context.lineTo(14,-10);context.lineTo(16,11);context.closePath();context.fill();context.stroke();context.fillStyle=secondary;context.fillRect(-15,7,30,5); }
    else if (shape === 'bag') { context.beginPath();context.rect(-14,-4,28,20);context.fill();context.stroke();context.beginPath();context.arc(0,-4,8,Math.PI,0);context.stroke(); }
    else if (shape === 'treasure') { context.beginPath();context.ellipse(0,2,16,11,0,0,TAU);context.fill();context.stroke();context.strokeStyle=secondary;context.beginPath();context.moveTo(-12,2);context.lineTo(12,2);context.moveTo(0,-7);context.lineTo(0,12);context.stroke(); }
    else if (shape === 'hair') { context.beginPath();context.arc(0,2,15,Math.PI,TAU);context.arc(-10,7,9,.5,2.7);context.arc(10,7,9,.4,2.6);context.fill();context.stroke();context.strokeStyle=secondary;context.beginPath();context.moveTo(-8,-5);context.quadraticCurveTo(0,4,8,-5);context.stroke(); }
    else if (shape === 'makeup') { context.beginPath();context.arc(0,2,14,0,TAU);context.fill();context.stroke();context.fillStyle=secondary;context.beginPath();context.arc(0,2,7,0,TAU);context.fill();context.strokeStyle='#fff1d0';context.beginPath();context.moveTo(-8,-7);context.lineTo(8,11);context.stroke(); }
    else if (shape === 'clothing') { context.beginPath();context.moveTo(0,-15);context.lineTo(15,-5);context.lineTo(11,16);context.lineTo(-11,16);context.lineTo(-15,-5);context.closePath();context.fill();context.stroke();context.strokeStyle=secondary;context.beginPath();context.moveTo(0,-12);context.lineTo(0,13);context.stroke(); }
    else if (shape === 'shoe') { context.beginPath();context.moveTo(-15,6);context.quadraticCurveTo(-4,-8,7,-7);context.lineTo(16,8);context.lineTo(16,13);context.lineTo(-15,13);context.closePath();context.fill();context.stroke(); }
    else if (shape === 'glove') { context.beginPath();context.moveTo(-10,14);context.lineTo(-11,-7);context.lineTo(-5,-14);context.lineTo(-1,-2);context.lineTo(2,-15);context.lineTo(6,-2);context.lineTo(10,-11);context.lineTo(13,-5);context.lineTo(8,14);context.closePath();context.fill();context.stroke(); }
    else if (shape === 'weapon') { context.strokeStyle=primary;context.lineWidth=7;context.lineCap='round';context.beginPath();context.moveTo(-15,14);context.lineTo(12,-13);context.stroke();context.strokeStyle=secondary;context.lineWidth=3;context.beginPath();context.moveTo(-12,12);context.lineTo(-2,17);context.moveTo(9,-16);context.lineTo(16,-9);context.stroke(); }
    else { context.save();context.rotate(-.2);context.beginPath();context.rect(-13,-9,26,18);context.fill();context.stroke();context.strokeStyle=secondary;context.beginPath();context.moveTo(-8,-4);context.lineTo(8,5);context.moveTo(-7,7);context.lineTo(7,-6);context.stroke();context.restore(); }
    context.globalAlpha = 1;
  }

  function drawItem(item, x, y, time, selected = false) {
    const bob = reducedMotion ? 0 : Math.sin(time / 450 + x) * 4;
    context.save();
    context.translate(x, y + bob);
    const shape = semanticShapeForItem(item);
    context.shadowColor = item.colors?.[1] || '#36e5d1';
    context.shadowBlur = 14;
    drawTreasureGlyph(shape, item.colors?.[0] || '#fff1d0', item.colors?.[1] || '#36e5d1', selected);
    context.restore();
  }

  function drawCurrentEntity(entity, time, selected = false) {
    if (entity.revealed === false) return;
    const item = entity.item || {};
    const bob = reducedMotion ? 0 : Math.sin(time / 420 + entity.x) * 3 - (selected ? 7 : 0);
    const primary = item.colors?.[0] || '#fff1d0';
    const secondary = item.colors?.[1] || '#36e5d1';
    context.save();
    context.translate(entity.x, entity.y + bob);
    if (selected) {
      context.strokeStyle = secondary;context.lineWidth = 3;context.globalAlpha = .72;
      context.beginPath();context.arc(0, 0, 24, 0, TAU);context.stroke();
      context.globalAlpha = 1;
    }
    context.shadowColor = secondary;context.shadowBlur = selected ? 20 : 12;
    drawTreasureGlyph(semanticShapeForCurrentEntity(entity), primary, secondary, selected);
    if (selected) { context.fillStyle='#fff';context.font='900 11px system-ui';context.textAlign='center';context.fillText(item.name || 'TREASURE',0,-34); }
    context.restore();
  }

  function drawHazardEntity(entity, time) {
    const bob = reducedMotion ? 0 : Math.sin(time / 360 + entity.x) * 9;
    context.save();context.translate(entity.x, entity.y + bob);context.lineWidth = 3;
    context.shadowColor = entity.archetypeId === 'eel' ? '#f8f33b' : entity.archetypeId === 'squid' ? '#2e163f' : '#ff72d2';context.shadowBlur = 18;
    context.strokeStyle = '#fff1d0';
    if (entity.archetypeId === 'jellyfish') {
      context.fillStyle='#ff5fc0';context.beginPath();context.arc(0,-4,17,Math.PI,0);context.lineTo(17,5);context.lineTo(-17,5);context.closePath();context.fill();context.stroke();context.strokeStyle='#ffcef0';
      for (let index = -2; index <= 2; index += 1) { context.beginPath();context.moveTo(index*6,5);context.quadraticCurveTo(index*9-8,22,index*5,34);context.stroke(); }
    } else if (entity.archetypeId === 'eel') {
      context.strokeStyle='#f8f33b';context.lineWidth=10;context.lineCap='round';context.beginPath();context.moveTo(-28,0);context.bezierCurveTo(-12,-20,3,23,29,0);context.stroke();context.fillStyle='#fff';context.beginPath();context.arc(25,-2,3,0,TAU);context.fill();
    } else {
      context.fillStyle='#673b9c';context.beginPath();context.ellipse(0,-3,16,20,0,0,TAU);context.fill();context.stroke();context.strokeStyle='#caa3ff';
      for (let index = -3; index <= 3; index += 1) { context.beginPath();context.moveTo(index*4,11);context.quadraticCurveTo(index*8,24,index*6,34);context.stroke(); }
    }
    context.restore();
  }

  function drawSwell(swell, time) {
    if (!swell) return;
    const direction = swell.direction || { x: 0, y: 1 };
    const fromX = direction.x < 0 ? width : 0;const fromY = direction.y < 0 ? height : 0;
    const gradient = context.createLinearGradient(fromX, fromY, width - fromX, height - fromY);
    gradient.addColorStop(0, swell.phase === 'warning' ? 'rgba(255, 222, 103, .20)' : 'rgba(83, 238, 255, .30)');gradient.addColorStop(1, 'rgba(83, 238, 255, 0)');
    context.save();context.fillStyle=gradient;context.fillRect(0,0,width,height);context.strokeStyle=swell.phase === 'warning' ? '#ffe66b' : '#93fff7';context.lineWidth=4;context.globalAlpha=.62;
    if (reducedMotion) { context.beginPath();context.moveTo(fromX,fromY);context.lineTo(fromX+direction.x*-56+direction.y*42,fromY+direction.y*-56-direction.x*42);context.stroke(); }
    else { const offset=(time/16)%(Math.max(width,height)+100);for(let index=0;index<3;index+=1){const start=offset+index*70;context.beginPath();context.moveTo(fromX+direction.x*start,fromY+direction.y*start);context.quadraticCurveTo(width/2+direction.y*36,height/2-direction.x*36,width-fromX+direction.x*start,height-fromY+direction.y*start);context.stroke();} }
    context.restore();
  }

  function drawFarWater(time) {
    context.save();
    context.globalAlpha = .38;
    context.fillStyle = '#b9fff7';
    for (let index = 0; index < 24; index += 1) {
      const seed = seededUnit(index * 17 + 11);
      const drift = reducedMotion ? 0 : Math.sin(time / 1600 + index) * 18;
      context.beginPath();context.arc(seed * width + drift, seededUnit(index * 23 + 7) * height, index % 5 === 0 ? 2.4 : 1.2, 0, TAU);context.fill();
    }
    context.restore();
  }

  function drawForegroundLife(cameraX, cameraY, time) {
    context.save();context.translate(-cameraX * 1.08, -cameraY * 1.08);context.globalAlpha=.62;
    for (let index = 0; index < 9; index += 1) {
      const x = (seededUnit(index * 37 + 19) * (width + 520)) + cameraX;
      const y = (seededUnit(index * 43 + 3) * (height + 420)) + cameraY;
      const sway = reducedMotion ? 0 : Math.sin(time / 900 + index) * 10;
      context.fillStyle=index%2?'#ff4faf':'#36e5d1';context.beginPath();context.ellipse(x+sway,y,18,6,.35,0,TAU);context.fill();
      context.fillStyle='#fff1d0';context.beginPath();context.arc(x+10+sway,y-1,1.5,0,TAU);context.fill();
    }
    context.restore();
  }

  function drawTargetHalo(target, cameraX, cameraY, time) {
    if (!target || !Number.isFinite(target.x) || !Number.isFinite(target.y)) return;
    const x = target.x - cameraX;const y = target.y - cameraY;
    const pulse = reducedMotion ? 0 : Math.sin(time / 150) * 4;
    context.save();context.translate(x,y);context.strokeStyle='#fff1d0';context.fillStyle='#fff';context.lineWidth=3;context.shadowColor='#ff4faf';context.shadowBlur=18;
    context.beginPath();context.arc(0,0,28+pulse,0,TAU);context.stroke();
    context.setLineDash([3,5]);context.globalAlpha=.72;context.beginPath();context.arc(0,0,36-pulse*.25,0,TAU);context.stroke();context.setLineDash([]);context.globalAlpha=1;
    context.font='900 10px system-ui';context.textAlign='center';context.fillText(target.item?.name || target.name || 'TREASURE',0,-45);
    context.fillStyle='#36e5d1';context.font='1000 9px system-ui';context.fillText(target.type === 'npc' ? 'APPROACH' : 'CLAIM',0,48);
    context.restore();
  }

  function drawReactionMark(npc, state, cameraX, cameraY, time) {
    const relation = state.social?.relationships?.[relationshipKey(npc.id,'player')];
    const mark = npc.mode === 'pursue' ? '!' : (relation?.rivalry || 0) > 16 ? '☠' : (relation?.affinity || 0) > 14 ? '♥' : '✦';
    const wobble = reducedMotion ? 0 : Math.sin(time / 220 + npc.x) * 2;
    context.save();context.translate(npc.x-cameraX+25,npc.y-cameraY-30+wobble);context.fillStyle=mark==='☠'?'#ff4faf':'#fff1d0';context.strokeStyle='#071a35';context.lineWidth=3;context.font='1000 19px system-ui';context.textAlign='center';context.strokeText(mark,0,0);context.fillText(mark,0,0);context.restore();
  }

  function drawEffects(time, cameraX, cameraY) {
    const now = Number(time) || 0;
    effects.particles = effects.particles.filter((particle) => now - particle.bornAt < particle.life);
    effects.emphasis = effects.emphasis.filter((item) => now - item.bornAt < 1800);
    for (const particle of effects.particles) {
      const age = Math.max(0, now - particle.bornAt);const progress = Math.min(1, age / particle.life);
      const rise = (particle.intensity * 18 + 14) * progress;
      const size = 2 + particle.intensity * 1.6 * (1-progress);
      context.save();context.translate(particle.x-cameraX,particle.y-cameraY-rise);context.globalAlpha=1-progress;context.fillStyle=particle.type==='pointAward'?'#f8f33b':particle.intensity>=3?'#ff4faf':'#36e5d1';
      context.beginPath();context.moveTo(0,-size);context.lineTo(size,0);context.lineTo(0,size);context.lineTo(-size,0);context.closePath();context.fill();
      if (particle.type === 'pointAward') { context.fillStyle='#fff1d0';context.font='1000 11px system-ui';context.textAlign='center';context.fillText(`+${Math.max(0,Number(particle.amount)||0).toLocaleString()}`,0,-11); }
      context.restore();
    }
    for (const item of effects.emphasis) {
      if(item.type==='pointAward'){
        context.save();context.fillStyle='#fff1d0';context.font='1000 11px system-ui';context.textAlign='center';context.fillText(`+${Math.max(0,Number(item.amount)||0).toLocaleString()}`,item.x-cameraX,item.y-cameraY-36);context.restore();continue;
      }
      if (item.type !== 'legendary' && item.type !== 'rarePickup') continue;
      const age = Math.max(0, now - item.bornAt);const alpha=item.motion==='static'?1:Math.max(0,1-age/1800);
      context.save();context.globalAlpha=alpha;context.fillStyle='#fff1d0';context.strokeStyle='#ff4faf';context.lineWidth=2;context.font='1000 13px system-ui';context.textAlign='center';
      const y=item.y-cameraY-52;context.fillText('LEGENDARY ACQUISITION',item.x-cameraX,y);context.beginPath();context.moveTo(item.x-cameraX-72,y+8);context.lineTo(item.x-cameraX+72,y+8);context.stroke();context.restore();
    }
  }

  function drawMermaid({ x, y, hair = 0, tail = 0, makeup = 0, scales = 0, fins = 0, effects = {}, equippedItems = [], palette, label, facing = 1, scale = 1, portrait = false, banking = 0 }) {
    const colors = palette || [['#ff4faf', '#8b2f76', '#fff1d0'], ['#36e5d1', '#11788b', '#ffd29d'], ['#8b5cf6', '#4c2e85', '#ffe0c2']][tail % 3];
    context.save();
    context.translate(x, y);
    if(!reducedMotion&&!portrait)context.rotate(Math.max(-1,Math.min(1,Number(banking)||0))*.12);
    context.scale(facing * scale, scale);
    context.fillStyle = colors[1];
    context.beginPath();
    context.moveTo(-8, 20);context.bezierCurveTo(-30, 70, -22, 106, 0, 122);context.bezierCurveTo(16, 110, 26, 72, 8, 20);context.fill();
    context.beginPath();context.moveTo(-2, 116);context.lineTo(-34, 143);context.lineTo(0, 134);context.lineTo(34, 143);context.lineTo(2, 116);context.fill();
    context.globalAlpha=.52;context.strokeStyle=colors[2]||'#fff1d0';context.lineWidth=2;
    for(let row=0;row<4;row+=1)for(let column=-1;column<=1;column+=1){context.beginPath();context.arc(column*7+(row%2?3:0),58+row*13,3+(scales%3),0,TAU);context.stroke();}
    context.globalAlpha=1;context.fillStyle=colors[fins%2];context.beginPath();context.moveTo(-10,70);context.lineTo(-35-(fins%3)*6,88);context.lineTo(-9,96);context.moveTo(10,70);context.lineTo(35+(fins%3)*6,88);context.lineTo(9,96);context.fill();
    context.fillStyle = '#eebc9f';
    context.beginPath();context.ellipse(0, 0, 19, 26, 0, 0, TAU);context.fill();
    context.strokeStyle = '#48142c';context.lineWidth = 3;
    context.beginPath();context.moveTo(-10, 3);context.lineTo(-3, 1);context.moveTo(3, 1);context.lineTo(10, 3);context.stroke();
    context.strokeStyle = makeup % 2 ? '#ff3f9b' : '#40142f';context.lineWidth = 3;
    context.beginPath();context.arc(0, 10, 7, .2, Math.PI - .2);context.stroke();
    if (effects.makeup === 'inked') { context.fillStyle='#2e163f';context.globalAlpha=.72;context.beginPath();context.ellipse(-13,6,6,10,.2,0,TAU);context.ellipse(13,6,6,10,-.2,0,TAU);context.fill();context.globalAlpha=1; }
    context.fillStyle = colors[0];
    context.beginPath();
    if (hair % 3 === 0) { context.arc(0, -17, 35, Math.PI, TAU);context.arc(-24, -2, 22, 1.2, 4.7);context.arc(24, -2, 22, -1.5, 2); }
    else if (hair % 3 === 1) { context.ellipse(0, -28, 38, 50, 0, Math.PI, TAU);context.rect(-30, -21, 60, 26); }
    else { context.arc(0, -21, 30, Math.PI, TAU);for(let i=-2;i<=2;i+=1)context.arc(i*13,-35-Math.abs(i)*4,14,0,TAU); }
    context.fill();
    if (effects.hair === 'electric') { context.strokeStyle='#f8f33b';context.lineWidth=4;context.beginPath();context.moveTo(-30,-44);context.lineTo(-17,-59);context.lineTo(-8,-43);context.lineTo(5,-65);context.lineTo(17,-45);context.lineTo(29,-58);context.stroke(); }
    context.fillStyle = colors[2] || '#fff1d0';
    context.beginPath();context.moveTo(-22,25);context.lineTo(0,12);context.lineTo(22,25);context.lineTo(14,43);context.lineTo(-14,43);context.closePath();context.fill();
    if (portrait) {
      context.strokeStyle = '#fff1d0';context.lineWidth=3;context.beginPath();context.arc(0,-62,20,Math.PI,TAU);context.lineTo(0,-89);context.lineTo(10,-63);context.lineTo(25,-82);context.stroke();
    }
    for (const item of equippedItems) {
      context.strokeStyle=item.colors?.[0]||'#ff4faf';context.fillStyle=item.colors?.[1]||'#36e5d1';context.lineWidth=3;
      if(item.slot==='crown'||item.slot==='hair'){context.beginPath();context.moveTo(-24,-43);context.lineTo(-13,-67);context.lineTo(0,-48);context.lineTo(13,-67);context.lineTo(24,-43);context.stroke();}
      else if(item.slot==='jewelry'||item.slot==='makeup'){context.beginPath();context.arc(0,33,9,0,TAU);context.stroke();}
      else if(item.slot==='weapon'){context.beginPath();context.moveTo(24,20);context.lineTo(44,80);context.stroke();}
      else if(item.slot==='purse'){context.strokeRect(-37,36,18,15);}
      else {context.globalAlpha=.75;context.fillRect(-18,25,36,10);context.globalAlpha=1;}
    }
    context.scale(facing,1);
    if (label) { context.fillStyle='#fff';context.font='900 11px system-ui';context.textAlign='center';context.fillText(label,0,-58); }
    context.restore();
  }

  function drawPursuitCue(state, runtime, time) {
    const cue = pursuitCueFor(state, runtime.pursuit);
    const npc = cue && (runtime.npcs || []).find(({ id }) => id === cue.npcId);
    if (!cue || !npc) return;
    const pulse = reducedMotion ? 0 : Math.sin(time / 180) * 4;
    context.save();context.translate(npc.x, npc.y - 66);
    context.strokeStyle='#ff91dc';context.fillStyle='#fff1d0';context.lineWidth=3;context.globalAlpha=.88;
    context.beginPath();context.arc(0,0,20+pulse,0,TAU);context.stroke();
    context.font='900 10px system-ui';context.textAlign='center';context.fillText(cue.label,0,-30);
    context.font='900 16px system-ui';context.fillStyle='#ff91dc';
    context.fillText(cue.entry === 'below' ? '↑' : cue.entry === 'left' ? '→' : '←',0,6);
    context.restore();
  }

  function renderFrame({ state, runtime, time = performance.now() }) {
    if (destroyed) return;
    const zone=state.world?.zones?.find(zone=>zone.index===state.world.zoneIndex);
    oceanBackground(time, state.mode==='home'?state.shore?.palette:zone?.palette || state.shore?.palette);
    drawFarWater(time);
    drawSwell(state.current?.swell, time);
    const {cameraX,cameraY}=currentViewportFor(state.player,{width,height},{width:runtime.worldWidth||1800,height:runtime.worldHeight||1400,endless:true});
    context.save();context.translate(-cameraX * .25, -cameraY * .12);
    for (let i = 0; i < 18; i += 1) kelp(seededUnit(i + 3) * (width + 500), height + cameraY * .12, .45 + seededUnit(i) * .85, time, i % 2 ? '#1fc4a4' : '#6b4ca0');
    context.restore();
    drawForegroundLife(cameraX, cameraY, time);
    context.save();context.translate(-cameraX, -cameraY);
    for (const find of state.shore?.finds || []) if (!find.collected) drawItem(find.item, find.x, find.y, time, runtime.near?.id === find.id);
    for (const entity of state.current?.entities || []) {
      if (entity.kind === 'hazard') drawHazardEntity(entity, time);
      else drawCurrentEntity(entity, time, runtime.near?.type === 'current' && runtime.near.id === entity.id);
    }
    for (const npc of runtime.npcs || []) {
      const target = state.current?.entities?.find(({ id }) => id === npc.targetId);
      if (!target || npc.mode !== 'pursue') continue;
      context.save();context.strokeStyle=state.npcs[npc.id]?.palette?.[2] || '#fff1d0';context.lineWidth=2;context.globalAlpha=.36;
      context.setLineDash([4, 8]);context.beginPath();context.moveTo(npc.x,npc.y+18);context.lineTo(target.x,target.y);context.stroke();context.setLineDash([]);
      context.fillStyle='#fff1d0';context.globalAlpha=.82;context.beginPath();context.arc(target.x,target.y,28+(reducedMotion?0:Math.sin(time/180)*3),0,TAU);context.stroke();context.restore();
    }
    for (const npc of runtime.npcs || []) {
      drawMermaid({ ...npc, ...appearanceForNpc(state,npc.id), label: state.npcs[npc.id]?.name.split(' ')[0].toUpperCase(), scale: .72 });
      drawReactionMark(npc, state, 0, 0, time);
    }
    drawPursuitCue(state, runtime, time);
    drawTargetHalo(activeTarget || runtime.near, 0, 0, time);
    drawEffects(time, 0, 0);
    drawMermaid({ x: state.player.x, y: state.player.y, ...appearanceForState(state), banking:runtime.motion?.banking, label: 'YOU', scale: .82 });
    context.restore();
    lastPlayer = { x: state.player.x, y: state.player.y };
  }

  function setTarget(target) {
    activeTarget = target && Number.isFinite(target.x) && Number.isFinite(target.y) ? { ...target } : null;
    return activeTarget;
  }

  function consumeEvents(events = []) {
    for (const event of events) {
      const x = Number(event.x) || activeTarget?.x || lastPlayer.x;
      const y = Number(event.y) || activeTarget?.y || lastPlayer.y;
      const visual = visualEffectForEvent(event);
      const type = visual.type;
      const intensity = visual.intensity;
      const copies = reducedMotion || type==='pointAward' ? 1 : Math.min(4, intensity);
      for (let index = 0; index < copies; index += 1) pushEffect(effects, { type, amount:event.amount, x: x + (index - 1) * 8, y: y - index * 6, intensity, bornAt: performance.now() });
    }
    return effects;
  }

  function renderPortrait(targetContext, model, bounds = { x: 0, y: 0, width: 320, height: 260 }) {
    const previous = context;
    const portraitContext = targetContext || previous;
    portraitContext.save();
    if (portraitContext !== previous) {
      const original = { canvasContext: context };
      Object.assign(original, {});
    }
    const gradient = portraitContext.createLinearGradient(bounds.x, bounds.y, bounds.x, bounds.y + bounds.height);
    gradient.addColorStop(0, '#164e72');gradient.addColorStop(1, '#071a35');portraitContext.fillStyle=gradient;portraitContext.fillRect(bounds.x,bounds.y,bounds.width,bounds.height);
    if (portraitContext === context) drawMermaid({ x: bounds.x+bounds.width/2, y: bounds.y+bounds.height*.48, hair:model.hair,tail:model.tail,makeup:model.makeup,effects:model.effects||{},palette:model.palette,scale:1.18,portrait:true });
    else {
      const tempCanvas = document.createElement('canvas');tempCanvas.width=bounds.width;tempCanvas.height=bounds.height;
      const tempRenderer=createRenderer(tempCanvas,{reducedMotion:true});tempRenderer.resize();tempRenderer.drawMermaidToContext(model);portraitContext.drawImage(tempCanvas,bounds.x,bounds.y,bounds.width,bounds.height);tempRenderer.destroy();
    }
    portraitContext.restore();
  }

  function drawMermaidToContext(model) {
    oceanBackground(0, model.palette);
    drawMermaid({ x: width/2, y: height*.46, hair:model.hair,tail:model.tail,makeup:model.makeup,scales:model.scales||0,fins:model.fins||0,effects:model.effects||{},equippedItems:model.equippedItems||[],palette:model.palette,scale:1.1,portrait:true });
  }

  function worldToScreen(x, y, player) {
    const {cameraX,cameraY}=currentViewportFor(player,{width,height},{width:1800,height:1400,endless:true});
    return { x: x - cameraX, y: y - cameraY };
  }

  function destroy() { destroyed = true; }
  resize();
  return { resize, renderFrame, renderPortrait, drawMermaidToContext, worldToScreen, setTarget, consumeEvents, destroy };
}

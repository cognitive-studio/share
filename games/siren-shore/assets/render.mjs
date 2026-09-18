const TAU = Math.PI * 2;

export function appearanceForState(state) {
  return {
    hair: state.player.hair,
    tail: state.player.tail,
    makeup: state.player.makeup,
    scales: state.player.scales || 0,
    fins: state.player.fins || 0,
    equippedItems: Object.values(state.equipped || {})
      .map((id) => state.inventory.find((item) => item.id === id && item.ownerId === 'player'))
      .filter(Boolean),
  };
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

  function drawItem(item, x, y, time, selected = false) {
    const bob = reducedMotion ? 0 : Math.sin(time / 450 + x) * 4;
    context.save();
    context.translate(x, y + bob);
    context.rotate(Math.PI / 4);
    context.fillStyle = item.colors?.[0] || '#fff1d0';
    context.strokeStyle = selected ? '#ff4faf' : '#fff1d0';
    context.lineWidth = selected ? 4 : 2;
    context.shadowColor = item.colors?.[1] || '#36e5d1';
    context.shadowBlur = 14;
    context.fillRect(-9, -9, 18, 18);
    context.strokeRect(-11, -11, 22, 22);
    context.restore();
  }

  function drawMermaid({ x, y, hair = 0, tail = 0, makeup = 0, scales = 0, fins = 0, equippedItems = [], palette, label, facing = 1, scale = 1, portrait = false }) {
    const colors = palette || [['#ff4faf', '#8b2f76', '#fff1d0'], ['#36e5d1', '#11788b', '#ffd29d'], ['#8b5cf6', '#4c2e85', '#ffe0c2']][tail % 3];
    context.save();
    context.translate(x, y);
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
    context.fillStyle = colors[0];
    context.beginPath();
    if (hair % 3 === 0) { context.arc(0, -17, 35, Math.PI, TAU);context.arc(-24, -2, 22, 1.2, 4.7);context.arc(24, -2, 22, -1.5, 2); }
    else if (hair % 3 === 1) { context.ellipse(0, -28, 38, 50, 0, Math.PI, TAU);context.rect(-30, -21, 60, 26); }
    else { context.arc(0, -21, 30, Math.PI, TAU);for(let i=-2;i<=2;i+=1)context.arc(i*13,-35-Math.abs(i)*4,14,0,TAU); }
    context.fill();
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

  function renderFrame({ state, runtime, time = performance.now() }) {
    if (destroyed) return;
    oceanBackground(time, state.shore?.palette);
    const cameraX = Math.max(0, Math.min((runtime.worldWidth || 1800) - width, state.player.x - width / 2));
    const cameraY = Math.max(0, Math.min((runtime.worldHeight || 1400) - height, state.player.y - height / 2));
    context.save();context.translate(-cameraX * .25, -cameraY * .12);
    for (let i = 0; i < 18; i += 1) kelp(seededUnit(i + 3) * (width + 500), height + cameraY * .12, .45 + seededUnit(i) * .85, time, i % 2 ? '#1fc4a4' : '#6b4ca0');
    context.restore();
    context.save();context.translate(-cameraX, -cameraY);
    for (const find of state.shore?.finds || []) if (!find.collected) drawItem(find.item, find.x, find.y, time, runtime.near?.id === find.id);
    for (const npc of runtime.npcs || []) drawMermaid({ ...npc, palette: state.npcs[npc.id]?.palette, label: state.npcs[npc.id]?.name.split(' ')[0].toUpperCase(), scale: .72 });
    drawMermaid({ x: state.player.x, y: state.player.y, ...appearanceForState(state), label: 'YOU', scale: .82 });
    context.restore();
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
    if (portraitContext === context) drawMermaid({ x: bounds.x+bounds.width/2, y: bounds.y+bounds.height*.48, hair:model.hair,tail:model.tail,makeup:model.makeup,palette:model.palette,scale:1.18,portrait:true });
    else {
      const tempCanvas = document.createElement('canvas');tempCanvas.width=bounds.width;tempCanvas.height=bounds.height;
      const tempRenderer=createRenderer(tempCanvas,{reducedMotion:true});tempRenderer.resize();tempRenderer.drawMermaidToContext(model);portraitContext.drawImage(tempCanvas,bounds.x,bounds.y,bounds.width,bounds.height);tempRenderer.destroy();
    }
    portraitContext.restore();
  }

  function drawMermaidToContext(model) {
    oceanBackground(0, model.palette);
    drawMermaid({ x: width/2, y: height*.46, hair:model.hair,tail:model.tail,makeup:model.makeup,scales:model.scales||0,fins:model.fins||0,equippedItems:model.equippedItems||[],palette:model.palette,scale:1.1,portrait:true });
  }

  function worldToScreen(x, y, player) {
    const cameraX = Math.max(0, player.x - width / 2);
    const cameraY = Math.max(0, player.y - height / 2);
    return { x: x - cameraX, y: y - cameraY };
  }

  function destroy() { destroyed = true; }
  resize();
  return { resize, renderFrame, renderPortrait, drawMermaidToContext, worldToScreen, destroy };
}

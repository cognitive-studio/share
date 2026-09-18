function cleanUrl(value) {
  const url = new URL(value || globalThis.location?.href || 'https://cognitive-studio.github.io/share/games/siren-shore/');
  url.search = '';
  url.hash = '';
  return url.href;
}

const HEADLINES = {
  find: 'THE OCEAN PROVIDED',
  snatch: 'PROPERTY CHANGED HANDS',
  shade: 'STATEMENT MADE IN OPEN WATER',
  altercation: 'COMPOSURE WAS REARRANGED',
};

const RECEIPT_EVENTS = new Set(['rareFind', 'trade', 'snatch', 'victory', 'loss', 'levelUp']);
export const shouldOfferReceipt = (events = []) => events.some(({ type }) => RECEIPT_EVENTS.has(type));

export function createReceiptModel(state, locationHref) {
  const incident = state.lastIncident || { type: 'find', text: `${state.player.name} remains available for discovery.` };
  const object = state.inventory.find(({ id }) => id === incident.itemId) || {
    name: 'The Entire Look',
    origin: `Assembled at ${state.shore?.name || 'a private grotto'}.`,
    history: ['Worn without requesting permission.'],
    colors: ['#36e5d1', '#ff4faf'],
  };
  const npc = incident.npcName || (incident.npcId && state.npcs[incident.npcId]?.name);
  const caption = npc
    ? `${npc} was present and has chosen to make that everyone’s problem.`
    : 'The ocean declined to comment. The object did not.';
  return {
    name: state.player.name,
    title: state.player.title,
    level: state.progression.level,
    headline: HEADLINES[incident.type] || 'A MERMAID HAS BEEN OBSERVED',
    caption,
    incident: incident.text,
    npc,
    object: { name: object.name, colors: object.colors || ['#36e5d1', '#ff4faf'] },
    provenance: object.history?.at(-1) || object.origin || 'Acquired under conditions nobody can now verify.',
    mermaid: {
      hair: state.player.hair,
      tail: state.player.tail,
      makeup: state.player.makeup,
      equippedItems: Object.values(state.equipped || {}).map((id) => state.inventory.find((item) => item.id === id && item.ownerId === 'player')).filter(Boolean),
    },
    url: cleanUrl(locationHref),
  };
}

function wrap(context, text, x, y, width, lineHeight, maxLines = 4) {
  const words = String(text).split(/\s+/);
  let line = '';
  let lines = 0;
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (context.measureText(next).width > width && line) {
      context.fillText(line, x, y + lines * lineHeight);
      lines += 1;
      line = word;
      if (lines >= maxLines) return y + lines * lineHeight;
    } else line = next;
  }
  if (line && lines < maxLines) { context.fillText(line, x, y + lines * lineHeight);lines += 1; }
  return y + lines * lineHeight;
}

function drawReceiptMermaid(context, model) {
  const x = 540;
  const y = 515;
  const tailColors = [['#36e5d1','#11859a'],['#ff4faf','#8b2f76'],['#8b5cf6','#4c2e85'],['#ff7a59','#bc3e67'],['#c5d8e8','#64748b']][model.mermaid.tail % 5];
  context.save();context.translate(x,y);
  context.fillStyle=tailColors[1];context.beginPath();context.moveTo(-34,65);context.bezierCurveTo(-110,220,-70,320,0,355);context.bezierCurveTo(90,300,100,190,34,65);context.fill();
  context.beginPath();context.moveTo(-5,340);context.lineTo(-115,420);context.lineTo(0,390);context.lineTo(115,420);context.lineTo(5,340);context.fill();
  context.fillStyle='#efbc9f';context.beginPath();context.ellipse(0,0,72,92,0,0,Math.PI*2);context.fill();
  context.strokeStyle='#3d0b2f';context.lineWidth=10;context.beginPath();context.moveTo(-42,12);context.lineTo(-10,4);context.moveTo(10,4);context.lineTo(42,12);context.stroke();
  context.strokeStyle=model.mermaid.makeup%2?'#ff4faf':'#4d1837';context.beginPath();context.arc(0,39,28,.15,Math.PI-.15);context.stroke();
  context.fillStyle=model.mermaid.hair%2?'#ff4faf':'#1b102e';context.beginPath();context.arc(0,-70,125,Math.PI,Math.PI*2);for(let i=-3;i<=3;i+=1)context.arc(i*38,-110-Math.abs(i)*9,42,0,Math.PI*2);context.fill();
  context.fillStyle='#fff1d0';context.beginPath();context.moveTo(-88,92);context.lineTo(0,48);context.lineTo(88,92);context.lineTo(52,155);context.lineTo(-52,155);context.closePath();context.fill();
  for (const item of model.mermaid.equippedItems || []) {
    context.strokeStyle=item.colors?.[0]||'#ff4faf';context.fillStyle=item.colors?.[1]||'#36e5d1';context.lineWidth=10;
    if(item.slot==='crown'||item.slot==='hair'){context.beginPath();context.moveTo(-90,-98);context.lineTo(-48,-170);context.lineTo(0,-112);context.lineTo(48,-170);context.lineTo(90,-98);context.stroke();}
    else if(item.slot==='jewelry'||item.slot==='makeup'){context.beginPath();context.arc(0,120,35,0,Math.PI*2);context.stroke();}
    else if(item.slot==='weapon'){context.beginPath();context.moveTo(92,70);context.lineTo(150,250);context.stroke();}
    else {context.globalAlpha=.75;context.fillRect(-78,92,156,34);context.globalAlpha=1;}
  }
  context.strokeStyle='#fff1d0';context.lineWidth=12;context.beginPath();context.moveTo(-75,-190);context.lineTo(-35,-125);context.lineTo(0,-225);context.lineTo(35,-125);context.lineTo(82,-190);context.stroke();
  context.restore();
}

export function renderReceipt(canvas, model) {
  canvas.width = 1080;
  canvas.height = 1350;
  const context = canvas.getContext('2d');
  const gradient = context.createLinearGradient(0,0,0,1350);gradient.addColorStop(0,'#0d6082');gradient.addColorStop(.58,'#071a35');gradient.addColorStop(1,'#030814');context.fillStyle=gradient;context.fillRect(0,0,1080,1350);
  context.save();context.globalAlpha=.14;context.fillStyle='#d6fff8';for(let x=-200;x<1200;x+=190){context.beginPath();context.moveTo(x,0);context.lineTo(x+90,0);context.lineTo(x+390,1000);context.lineTo(x+220,1000);context.fill();}context.restore();
  context.strokeStyle='#fff1d0';context.lineWidth=5;context.strokeRect(42,42,996,1266);context.strokeStyle='#ff4faf';context.lineWidth=17;context.strokeRect(64,64,952,1222);
  context.fillStyle='#36e5d1';context.font='900 25px system-ui';context.letterSpacing='4px';context.fillText('SIREN SHORE // OFFICIAL RECEIPT',92,115);
  context.fillStyle='#fff';context.font='900 70px Impact, sans-serif';wrap(context,model.headline,92,205,896,70,2);
  drawReceiptMermaid(context,model);
  context.fillStyle='#ff4faf';context.font='900 36px Impact, sans-serif';context.fillText(model.title.toUpperCase(),92,870);
  context.fillStyle='#fff1d0';context.font='900 22px system-ui';context.fillText(`SIREN LEVEL ${String(model.level).padStart(2,'0')}`,92,910);
  context.fillStyle=model.object.colors?.[0]||'#36e5d1';context.fillRect(92,958,24,24);
  context.fillStyle='#fff';context.font='900 34px system-ui';wrap(context,model.object.name,132,980,800,42,2);
  context.fillStyle='#c6dce7';context.font='500 24px system-ui';let y=wrap(context,model.provenance,92,1065,896,33,2)+20;
  context.fillStyle='#fff';context.font='800 25px system-ui';wrap(context,model.caption,92,y,896,34,3);
  context.fillStyle='#36e5d1';context.font='800 20px ui-monospace, monospace';context.fillText(model.url.replace(/^https?:\/\//,''),92,1252);
  return canvas;
}

function canvasBlob(canvas) {
  if (canvas.convertToBlob) return canvas.convertToBlob({ type: 'image/png' });
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Could not create receipt image')), 'image/png'));
}

export async function shareReceipt({ canvas, navigatorObject = navigator, documentObject = document, locationHref = location.href }) {
  const url = cleanUrl(locationHref);
  let blob;
  try { blob = await canvasBlob(canvas); }
  catch {
    try { await navigatorObject.clipboard?.writeText(url); } catch { /* URL remains available in the page. */ }
    return { method: 'copy', canceled: false };
  }
  const file = typeof File === 'function' ? new File([blob], 'siren-shore-receipt.png', { type: 'image/png' }) : Object.assign(blob, { name: 'siren-shore-receipt.png' });
  const payload = { title: 'Siren Shore Receipt', text: 'The ocean keeps receipts. Mine is attached.', url, files: [file] };
  if (navigatorObject.share && navigatorObject.canShare?.({ files: payload.files })) {
    try { await navigatorObject.share(payload);return { method: 'native', canceled: false }; }
    catch (error) { if (error?.name === 'AbortError') return { method: 'native', canceled: true }; }
  }
  try {
    const objectUrl = URL.createObjectURL(blob);
    const anchor = documentObject.createElement('a');
    anchor.href = objectUrl;anchor.download = 'siren-shore-receipt.png';
    documentObject.body?.append?.(anchor);anchor.click();anchor.remove?.();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  } catch {
    try { await navigatorObject.clipboard?.writeText(url); } catch { /* URL remains visible. */ }
    return { method: 'copy', canceled: false };
  }
  try { await navigatorObject.clipboard?.writeText(url); } catch { /* Download remains successful. */ }
  return { method: 'download', canceled: false };
}

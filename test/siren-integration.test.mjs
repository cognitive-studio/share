import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultState, loadState, saveState, SAVE_KEY } from '../games/siren-shore/assets/state.mjs';
import { resolveHazard } from '../games/siren-shore/assets/hazards.mjs';
import { collectCurrentEntity, stepCurrent } from '../games/siren-shore/assets/current.mjs';
import { collectFind, createOuting, returnHome, resumeOuting, advanceShore, equipItem, resolveEncounter, resolveFightMove } from '../games/siren-shore/assets/game.mjs';
import { resolveContestedPickup, recordIncident, relationshipKey, advanceSocialClock, attemptNpcTheft, transferPossession } from '../games/siren-shore/assets/social.mjs';
import { createMotionState, ensureActiveZones } from '../games/siren-shore/assets/world.mjs';
import { createCabinetModel } from '../games/siren-shore/assets/share.mjs';
import { ZONE_DEFINITIONS } from '../games/siren-shore/assets/data.mjs';
import { createAudioController } from '../games/siren-shore/assets/audio.mjs';
import { createHapticsController } from '../games/siren-shore/assets/haptics.mjs';
import * as app from '../games/siren-shore/assets/app.mjs';
import * as render from '../games/siren-shore/assets/render.mjs';

const viewport = { width: 390, height: 844 };
const fixed = () => .5;
function storageFor(state) { const map = new Map([[SAVE_KEY, JSON.stringify(state)]]); return { getItem: key => map.get(key), setItem: (key, value) => map.set(key, value) }; }
function scene() {
  const state = createDefaultState(fixed); state.mode = 'ocean'; state.player.x = 600;state.player.y = 500;
  state.world = ensureActiveZones(state.world, fixed);
  return state;
}
function item(id = 'heirloom', slot = 'crown') { return { id, name: 'The disputed heirloom', slot, ownerId: 'player', history: ['Found by Marina.'], colors: ['#ff4faf','#36e5d1'] }; }
function releasedScene(slot = 'crown') {
  const state = scene();state.inventory.push(item('heirloom',slot));state.purseIds.push('heirloom');
  state.current.entities.push({ id:'jelly',kind:'hazard',archetypeId:'jellyfish',x:600,y:500 });
  return resolveHazard(state,'jelly',()=>0).state;
}
function contestedScene() {
  const state = scene();state.npcs.cynthia.x=600;state.npcs.cynthia.y=500;
  state.current.entities=[{ id:'prize',kind:'treasure',archetypeId:'crown',shape:'crown',chain:'jewelry',tier:'legendary',revealed:true,actionable:true,x:600,y:500,vx:0,vy:0,points:388000,item:{...item(),ownerId:null} }];
  return state;
}
function frame(state, runtime = {}, intent = {x:0,y:0}, dt = .04) {
  assert.equal(typeof app.stepOceanFrame,'function','the app must expose and use its real ocean frame transition');
  return app.stepOceanFrame(state,{worldWidth:1800,worldHeight:1400,npcs:[],motion:createMotionState(state.player),...runtime},intent,dt,viewport,fixed);
}

test('released recovery rejected by a full purse is atomic and can succeed later',()=>{
  const state=releasedScene();state.player.purse='clutch';
  for(let i=0;i<12;i++){state.inventory.push(item(`packed-${i}`));state.purseIds.push(`packed-${i}`);}
  const before=structuredClone(state),entity=state.current.entities[0];
  const failed=collectCurrentEntity(state,entity.id);
  assert.deepEqual(failed.state,before);
  failed.state.purseIds=[];
  const recovered=collectCurrentEntity(failed.state,entity.id).state;
  assert.equal(recovered.inventory.filter(v=>v.id==='heirloom').length,1);
  assert.equal(recovered.inventory.find(v=>v.id==='heirloom').ownerId,'player');
  assert.match(recovered.inventory.find(v=>v.id==='heirloom').history.join(' '),/Found by Marina/);
});

test('released and contest-secured claims survive home, outings, advance, save/reload and deep retirement',()=>{
  for(const initial of [releasedScene(),resolveContestedPickup(contestedScene(),'cynthia','prize',()=>1).state]){
    let state=initial;const entityId=state.current.entities[0].id;
    for(const transition of [returnHome,resumeOuting,advanceShore,createOuting]){
      state=transition(state,fixed).state;
      state=loadState(storageFor(state)).state;
      state=stepCurrent(state,.04,{...viewport,cameraX:405,cameraY:-9000},fixed).state;
      assert.ok(state.current.entities.some(v=>v.id===entityId),'durable claim must survive every boundary');
    }
    state.purseIds=[];state=collectCurrentEntity(state,entityId).state;
    assert.equal(state.inventory.filter(v=>v.id==='heirloom').length,1);
    assert.equal(state.inventory.find(v=>v.id==='heirloom').ownerId,'player');
  }
});

test('released crown, hair, shoe and weapon keep their semantic silhouettes',()=>{
  for(const slot of ['crown','hair','shoe','weapon']) assert.equal(render.semanticShapeForCurrentEntity(releasedScene(slot).current.entities[0]),slot);
});

test('contest win then collect, equip and greet resolves canonical name with partial legacy memory',()=>{
  let state=resolveContestedPickup(contestedScene(),'cynthia','prize',()=>1).state;
  state=collectCurrentEntity(state,'prize').state;state=equipItem(state,'heirloom').state;
  assert.match(resolveEncounter(state,'cynthia','greet').events[0].text,/disputed heirloom/i);
  state.inventory=[];
  assert.doesNotThrow(()=>resolveEncounter(state,'cynthia','greet'));
});

test('shade and both snatch outcomes record one social incident and one reward at most',()=>{
  for(const [action,roll] of [['shade',0],['snatch',0],['snatch',1]]){
    const state=scene();state.inventory=[{...item(),ownerId:'cynthia'}];state.npcs.cynthia.possessions=['heirloom'];
    const result=resolveEncounter(state,'cynthia',action,()=>roll);
    assert.equal(result.state.social.incidents.length,1);
    assert.equal(result.state.progression.incidents,1);
    assert.ok(result.state.social.relationships[relationshipKey('cynthia','player')].heat>0);
    assert.ok(result.state.social.rumors.length>0);
    assert.ok(result.events.filter(v=>v.type==='pointAward').length<=1);
  }
});

test('resolved fight joins shared social history once without a second reward',()=>{
  let state=resolveEncounter(scene(),'cynthia','fight').state;let result;
  for(let i=0;i<3;i++){result=resolveFightMove(state,'cynthia','read',()=>0);state=result.state;}
  assert.equal(state.social.incidents.length,1);assert.equal(state.progression.incidents,1);
  assert.equal(result.events.filter(v=>v.type==='pointAward').length,1);
  assert.ok(state.social.relationships[relationshipKey('cynthia','player')].heat>0);
});

test('secured legendary preserves rarity and automatic contest collection dispatches semantic feedback',()=>{
  const won=resolveContestedPickup(contestedScene(),'cynthia','prize',()=>1).state;
  const stepped=stepCurrent(won,.04,{...viewport,cameraX:405,cameraY:78},fixed).state;
  assert.equal(stepped.current.entities.find(v=>v.id==='prize').tier,'legendary');
  const collected=collectCurrentEntity(stepped,'prize');
  assert.ok(collected.events.some(v=>v.type==='rarePickup'));
  const consumers=[[],[],[]];
  assert.equal(typeof app.dispatchOceanEvents,'function');
  app.dispatchOceanEvents(collected.events,{renderer:{consumeEvents:e=>consumers[0].push(...e)},audio:{consumeEvents:e=>consumers[1].push(...e)},haptics:{consumeEvent:e=>consumers[2].push(e)},say:()=>{}});
  for(const events of consumers) for(const type of ['rarePickup','combo','pointAward']) assert.ok(events.some(v=>v.type===type));
});

test('malformed v3 relationships and nested records normalize before the social clock and frame',()=>{
  const state=scene();state.social.relationships={'cynthia→player':null,'marina→cynthia':{heat:'garbage',rivalry:Infinity},bad:[]};
  state.social.incidents=[{actorId:'cynthia',targetId:'marina',witnesses:null}];state.social.rumors=[null];state.social.pursuits=[null,{}];
  const loaded=loadState(storageFor(state));assert.equal(loaded.recovered,false);
  assert.doesNotThrow(()=>advanceSocialClock(loaded.state,180,()=>0));
  assert.doesNotThrow(()=>frame(loaded.state));
});

test('Cabinet retains actual incident narrative, entire provenance, ownership and relationships',()=>{
  const original=scene();original.inventory=[{...item(),history:Array.from({length:30},(_,i)=>`Owner ${i}`)}];
  const state=recordIncident(original,{type:'theft',actorId:'player',targetId:'cynthia',itemId:'heirloom',text:'Cynthia alleges the tiara was borrowed, not donated.'},fixed).state;
  const model=createCabinetModel(state);
  assert.equal(model.incidents[0].text,'Cynthia alleges the tiara was borrowed, not donated.');
  assert.equal(model.objects[0].history.length,30);assert.equal(model.objects[0].ownerId,'player');
  assert.ok(model.mermaids.find(v=>v.id==='cynthia').relationships.length>0);
  assert.equal(model.title,state.player.title);assert.equal('completionPercent' in model,false);
});

test('stolen canonical crown is worn by rival until recovered or voluntarily left',()=>{
  const state=scene();state.inventory=[item(),{...item('old-crown'),ownerId:'cynthia'}];state.purseIds=['heirloom'];state.npcs.cynthia.possessions=['old-crown'];
  const stolen=attemptNpcTheft(state,'cynthia',()=>0).state;
  assert.equal(typeof render.appearanceForNpc,'function');
  assert.equal(render.appearanceForNpc(stolen,'cynthia').equippedItems.find(v=>v.slot==='crown').id,'heirloom');
  const declined=resolveEncounter(stolen,'cynthia','leave').state;
  assert.equal(render.appearanceForNpc(declined,'cynthia').equippedItems.find(v=>v.slot==='crown').id,'heirloom');
  const recovered=resolveEncounter(stolen,'cynthia','snatch',()=>0).state;
  assert.equal(recovered.inventory.find(v=>v.id==='heirloom').ownerId,'player');
  assert.ok(!render.appearanceForNpc(recovered,'cynthia').equippedItems.some(v=>v.id==='heirloom'));
});

test('real app frame swims upward through several zones, follows camera and retires summaries',()=>{
  let state=scene(),runtime={};state.world.zones.find(v=>v.index===0).incidents=['Cynthia remembers.'];
  const palettes=new Set();
  for(let i=0;i<700;i++){
    const next=frame(state,runtime,{x:0,y:-1});state=next.state;runtime=next.runtime;
    assert.equal(state.world.zones.length,3);
    assert.ok(state.player.y>=next.viewport.cameraY && state.player.y<=next.viewport.cameraY+844);
    palettes.add(state.world.zones.find(v=>v.index===state.world.zoneIndex).palette.join(','));
  }
  assert.ok(state.world.zoneIndex>=4);assert.ok(state.world.distance>5000);assert.ok(state.player.y<0);
  assert.ok(palettes.size>1);assert.ok(state.world.history.some(v=>v.incidents.includes('Cynthia remembers.')));
});

test('returning pursuer approaches but neither forces combat nor prevents swimming away',()=>{
  let state=recordIncident(scene(),{type:'theft',actorId:'player',targetId:'cynthia'},fixed).state;
  let next=frame(state,{npcs:[{id:'cynthia',x:600,y:850,vx:0,vy:0}]});
  assert.ok(next.runtime.pursuit);
  const before=Math.hypot(next.runtime.npcs[0].x-next.state.player.x,next.runtime.npcs[0].y-next.state.player.y);
  for(let i=0;i<40;i++) next=frame(next.state,next.runtime);
  assert.ok(Math.hypot(next.runtime.npcs[0].x-next.state.player.x,next.runtime.npcs[0].y-next.state.player.y)<before);
  assert.equal(next.state.mode,'ocean');
  for(let i=0;i<100;i++) next=frame(next.state,next.runtime,{x:0,y:-1});
  assert.equal(next.runtime.pursuit,null);assert.equal(next.state.mode,'ocean');
});

test('reduced motion changes no swell simulation and loose treasures and hazards move',()=>{
  const state=scene();state.current.swell={phase:'active',remaining:8,strength:100,direction:{x:1,y:0}};
  state.current.entities=[{id:'loose',kind:'treasure',x:650,y:550,vx:0,vy:0,tier:'ambient'},{id:'eel',kind:'hazard',archetypeId:'eel',x:690,y:570,vx:0,vy:0}];
  const normal=frame(state,{reducedMotion:false}),reduced=frame(state,{reducedMotion:true});
  assert.deepEqual(normal.state,reduced.state);
  assert.ok(normal.state.player.x>600);
  assert.ok(normal.state.current.entities.find(v=>v.id==='loose').x>650);
  assert.ok(normal.state.current.entities.find(v=>v.id==='eel').x>690);
});

test('large saves retain untouched durable branches across the real no-transaction frame',()=>{
  const state=scene();state.inventory=Array.from({length:20000},(_,i)=>({...item(`old-${i}`),history:Array(50).fill('Ancient provenance.')}));
  state.world.history=Array.from({length:10000},(_,i)=>({index:i-10001,incidents:['Ancient scandal.']}));
  const updated=frame(state).state;
  for(const key of ['inventory','npcs','equipped','purseIds','progression']) assert.equal(updated[key],state[key],`${key} must not be cloned by frame clocks`);
  assert.equal(updated.world.history,state.world.history);
  assert.equal(updated.social.incidents,state.social.incidents);
  assert.equal(updated.inventory[19999],state.inventory[19999]);
});

test('arrow movement leaves forms and open dialogs alone including held keys',()=>{
  const listeners={};const moves=[];let sheet=false,prevented=0;
  const node={style:{},addEventListener:(type,fn)=>{listeners[type]=fn;},removeEventListener(){}};
  const control=app.createInputController({pad:node,knob:node,actionButton:node,target:node,onMove:(x,y)=>moves.push([x,y]),onAction(){},sheetOpen:()=>sheet});
  listeners.keydown({key:'ArrowUp',target:{tagName:'INPUT'},preventDefault(){prevented++;}});
  assert.equal(prevented,0);assert.ok(moves.every(([x,y])=>x===0&&y===0));
  listeners.keydown({key:'ArrowUp',target:{tagName:'BODY'},preventDefault(){prevented++;}});
  control.reset();sheet=true;listeners.keydown({key:'ArrowLeft',target:{tagName:'BODY'},preventDefault(){prevented++;}});
  assert.deepEqual(moves.at(-1),[0,0]);assert.equal(prevented,1);
});

test('point effects retain award amount and bounded rolling score settles without overshoot',()=>{
  const pool=render.createEffectsPool();render.pushEffect(pool,{type:'pointAward',amount:4006});
  assert.equal(pool.particles[0].amount,4006);
  assert.equal(typeof app.stepDisplayedPoints,'function');
  let value=0;value=app.stepDisplayedPoints(value,1000000,.04,false);assert.ok(value>0&&value<1000000);
  for(let i=0;i<200;i++)value=app.stepDisplayedPoints(value,1000000,.04,false);
  assert.equal(value,1000000);assert.equal(app.stepDisplayedPoints(0,1000000,.04,true),1000000);
});

function recordingCanvas(){
  const calls=[];
  const context=new Proxy({}, {get:(_object,key)=>key==='createLinearGradient'?()=>({addColorStop:(...args)=>calls.push(['color',...args])}):(...args)=>calls.push([key,...args]),set:()=>true});
  return {calls,canvas:{getContext:()=>context,getBoundingClientRect:()=>viewport}};
}
test('renderer consumes zone palette, canonical relationship reactions, banking and exact point award',()=>{
  const state=scene();const zone=state.world.zones.find(v=>v.index===0);zone.palette=['#123456','#345678','#abcdef'];
  state.social.relationships[relationshipKey('cynthia','player')]={rivalry:20};
  const {canvas,calls}=recordingCanvas();const renderer=render.createRenderer(canvas);
  renderer.consumeEvents([{type:'pointAward',amount:4006}]);
  renderer.renderFrame({state,runtime:{npcs:[{id:'cynthia',x:600,y:500}],motion:{banking:.7}},time:performance.now()});
  assert.ok(calls.some(v=>v[0]==='color'&&v[2]==='#123456'));
  assert.ok(calls.some(v=>v[0]==='fillText'&&v[1]==='☠'));
  assert.ok(calls.some(v=>v[0]==='rotate'&&v[1]!==0));
  assert.ok(calls.some(v=>v[0]==='fillText'&&v[1]==='+4,006'));
});

test('full v2 appearance, provenance, NPC memory and preferences survive migration and play',()=>{
  const legacy=scene();legacy.version=2;delete legacy.progression.points;legacy.progression.xp=987654;
  Object.assign(legacy.player,{hair:4,tail:3,makeup:2,scales:1,fins:2,purse:'clutch'});
  legacy.settings={music:false,effects:true,reducedMotion:true};legacy.inventory=[{...item(),origin:'A long story',parents:[{id:'parent',name:'Ancestor'}]}];legacy.equipped={crown:'heirloom'};
  legacy.npcs.cynthia.memories=[{itemId:'heirloom',itemName:'Legacy Crown',text:'She remembers.'}];
  const loaded=loadState(storageFor(legacy));assert.equal(loaded.recovered,false);
  for(const key of ['hair','tail','makeup','scales','fins','purse'])assert.equal(loaded.state.player[key],legacy.player[key]);
  assert.deepEqual(loaded.state.inventory[0].history,legacy.inventory[0].history);assert.deepEqual(loaded.state.inventory[0].parents,legacy.inventory[0].parents);assert.equal(loaded.state.inventory[0].origin,'A long story');
  assert.deepEqual(loaded.state.npcs.cynthia.memories,legacy.npcs.cynthia.memories);
  assert.equal(loaded.state.settings.music,false);assert.equal(loaded.state.settings.reducedMotion,true);
  assert.equal(frame(loaded.state).state.progression.points,987654);
});

test('Cabinet browser content exposes expandable full history, owner, social edges and points',()=>{
  const nodes=[];const root={createElement:tag=>{const node={tag,textContent:'',children:[],append(...children){this.children.push(...children);}};nodes.push(node);return node;}};
  const content={replaceChildren(...children){this.children=children;}};
  const state=recordIncident(scene(),{actorId:'player',targetId:'cynthia',text:'The actual allegation.'},fixed).state;
  state.inventory=[{...item(),history:Array.from({length:30},(_,i)=>`Owner ${i}`)}];state.npcs.cynthia.possessions=['heirloom'];
  assert.equal(typeof app.renderCabinetContent,'function');
  app.renderCabinetContent(root,content,createCabinetModel(state),'things');
  assert.ok(nodes.some(node=>node.tag==='details'));assert.ok(nodes.some(node=>node.textContent==='Owner 0'));
  assert.ok(nodes.some(node=>/Your Majesty/.test(node.textContent)));assert.ok(nodes.some(node=>/SIREN POINTS/.test(node.textContent)));
  app.renderCabinetContent(root,content,createCabinetModel(state),'mermaids');
  assert.ok(nodes.some(node=>/rivalry/i.test(node.textContent)));assert.ok(nodes.some(node=>/disputed heirloom/.test(node.textContent)));
  app.renderCabinetContent(root,content,createCabinetModel(state),'incidents');
  assert.ok(nodes.some(node=>node.textContent==='The actual allegation.'));
});

test('real discoveries and allegations become zone retirement records',()=>{
  let state=recordIncident(scene(),{actorId:'player',targetId:'cynthia',text:'She disputes the evidence.'},fixed).state;
  state.current.entities=contestedScene().current.entities;
  state=collectCurrentEntity(state,'prize').state;
  let runtime={};
  for(let i=0;i<300;i++){const next=frame(state,runtime,{x:0,y:-1});state=next.state;runtime=next.runtime;}
  const departed=state.world.history.find(zone=>zone.index===0);
  assert.ok(departed?.incidents.includes('She disputes the evidence.'));
  assert.ok(departed.possessions.includes('The disputed heirloom'));
});

test('autonomous scene clock does not mutate its caller while sharing no-transaction history',()=>{
  const state=scene(),before=structuredClone(state);
  advanceSocialClock(state,61,fixed);
  assert.deepEqual(state,before);
});

test('automatic frame contest awards and dispatches one legendary pickup plus combo resolution',()=>{
  const state=contestedScene();state.current.combo={chain:'gold',count:3,multiplier:2};
  const result=app.stepOceanFrame(state,{npcs:[{id:'cynthia',x:600,y:500,vx:0,vy:0,theftCooldown:20}],motion:createMotionState(state.player)}, {x:0,y:0},.04,viewport,()=>1);
  for(const type of ['rarePickup','combo','comboResolved','pointAward'])assert.equal(result.events.filter(event=>event.type===type).length,1);
  const delivered=[];
  app.dispatchOceanEvents(result.events,{renderer:{consumeEvents:events=>delivered.push(...events)},audio:{consumeEvents(){}},haptics:{consumeEvent(){}},say(){}});
  assert.equal(delivered.filter(event=>event.type==='rarePickup')[0].tier,'legendary');
  assert.equal(result.state.inventory.filter(item=>item.id==='heirloom').length,1);
});

test('many durable recovery claims queue without expanding active frame work or losing recoverability',()=>{
  let state=scene();state.current.entities=Array.from({length:140},(_,i)=>({...contestedScene().current.entities[0],id:`claim-${i}`,item:{...item(`held-${i}`),ownerId:null},recoverableClaim:true,contestResolvedBy:'player'}));
  state=frame(state).state;
  assert.ok(state.current.entities.length<=72);
  assert.equal(state.current.entities.length+state.current.recoveryClaims.length,140);
  const dormant=state.current.recoveryClaims;
  assert.equal(frame(state).state.current.recoveryClaims,dormant);
  for(let i=0;i<140;i++){
    state.purseIds=[];
    const entity=state.current.entities.find(entity=>entity.recoverableClaim);
    assert.ok(entity);state=collectCurrentEntity(state,entity.id).state;
    state=frame(state).state;
  }
  assert.equal(state.inventory.length,140);assert.equal(state.current.recoveryClaims.length,0);
});

test('nearby empty-purse theft checks share a 20k-item archive and produce no save-worthy chatter',()=>{
  const state=scene();state.inventory=Array.from({length:20000},(_,i)=>item(`safe-${i}`));state.world.history=Array.from({length:10000},(_,i)=>({index:i-10001,incidents:['Old news.']}));
  const result=frame(state,{npcs:[{id:'cynthia',x:600,y:510,vx:0,vy:0,theftCooldown:0}]});
  assert.equal(result.state.inventory,state.inventory);assert.equal(result.state.world.history,state.world.history);
  assert.deepEqual(result.events,[]);assert.ok(result.runtime.npcs[0].theftCooldown>0);
});

function recordingAudioContext(){
  const frequencies=[];
  return {frequencies,state:'suspended',currentTime:0,destination:{},resume(){this.state='running';return Promise.resolve();},createMediaElementSource:()=>({connect(){}}),
    createGain:()=>({gain:{value:1,setTargetAtTime(){}},connect(){}}),createBiquadFilter:()=>({frequency:{value:0},connect(){}}),
    createOscillator:()=>({frequency:{set value(value){frequencies.push(value);},exponentialRampToValueAtTime(){}},connect(){},start(){},stop(){}})};
}
test('one successful NPC theft has one real audio/haptic cue and one narrative announcement',async()=>{
  const state=scene();state.inventory=[item()];state.purseIds=['heirloom'];
  const result=attemptNpcTheft(state,'cynthia',()=>0);
  const context=recordingAudioContext(),vibrations=[],messages=[],visuals=[];
  const audio=createAudioController({audioContextFactory:()=>context,audioFactory:()=>({play:()=>Promise.resolve(),pause(){}}),soundtrackUrl:'local-score.mp3'});
  await audio.unlock();
  const haptics=createHapticsController({vibrate:pattern=>vibrations.push(pattern),enabled:true,interacted:true});
  app.dispatchOceanEvents(result.events,{audio,haptics,renderer:{consumeEvents:events=>visuals.push(...events)},say:text=>messages.push(text)});
  assert.deepEqual(context.frequencies,[156]);assert.deepEqual(vibrations,[[28,18,12]]);
  assert.equal(messages.length,1);assert.equal(messages[0],result.events.find(event=>event.type==='npcTheft').text);
  assert.equal(result.state.social.incidents.length,1);assert.equal(result.state.social.rumors.length,1);
  assert.ok(result.state.social.relationships[relationshipKey('player','cynthia')].heat>0);
  assert.ok(visuals.some(event=>event.type==='npcTheft'));
});

test('a second visit appends new archived zone evidence without duplicating its first visit',()=>{
  let world=ensureActiveZones({seed:7,zoneIndex:0,zones:[],history:[]});
  world.zones.find(zone=>zone.index===0).incidents=['First visit.'];
  world.zones.find(zone=>zone.index===0).possessions=['First crown.'];
  world=ensureActiveZones({...world,zoneIndex:2});
  world=ensureActiveZones({...world,zoneIndex:0});
  const revisited=world.zones.find(zone=>zone.index===0);
  revisited.incidents=['First visit.','Second visit.'];revisited.possessions=['First crown.','Second crown.'];
  world=ensureActiveZones({...world,zoneIndex:2});
  assert.equal(world.history.filter(zone=>zone.index===0).length,1);
  assert.deepEqual(world.history.find(zone=>zone.index===0).incidents,['First visit.','Second visit.']);
  assert.deepEqual(world.history.find(zone=>zone.index===0).possessions,['First crown.','Second crown.']);
  world=ensureActiveZones({...world,zoneIndex:0});world.zones.find(zone=>zone.index===0).incidents=Array.from({length:200},(_,i)=>`New allegation ${i}.`);
  world=ensureActiveZones({...world,zoneIndex:2});assert.ok(world.history.find(zone=>zone.index===0).incidents.length<=80);
});

test('ordinary find and successful READ/fight retain action narration through app dispatch',()=>{
  const state=scene();state.shore.finds=[{id:'shore-find',item:{...item(),ownerId:null,rarity:'Interesting'}}];
  const find=collectFind(state,'shore-find');
  const fight=resolveEncounter(state,'cynthia','fight');const read=resolveFightMove(fight.state,'cynthia','read',()=>0);
  for(const [result,type] of [[find,'find'],[fight,'fight'],[read,'read']]){
    const messages=[];app.dispatchOceanEvents(result.events,{renderer:{consumeEvents(){}},audio:{consumeEvents(){}},haptics:{consumeEvent(){}},say:text=>messages.push(text)});
    assert.ok(messages.some(text=>text.includes(result.events.find(event=>event.type===type).text)),`${type} narration should remain audible to the live region`);
  }
});

test('keyup in forms or a sheet makes no movement callback and clearing a sheet removes held keys',()=>{
  const listeners={},moves=[];let sheet=false;
  const node={style:{},addEventListener:(type,fn)=>{listeners[type]=fn;},removeEventListener(){}};
  const control=app.createInputController({pad:node,knob:node,actionButton:node,target:node,onMove:(x,y)=>moves.push([x,y]),onAction(){},sheetOpen:()=>sheet});
  listeners.keydown({key:'ArrowUp',target:{tagName:'BODY'},preventDefault(){}});
  const before=moves.length;sheet=true;
  listeners.keyup({key:'ArrowRight',target:{tagName:'BODY'}});assert.equal(moves.length,before);
  sheet=false;listeners.keyup({key:'ArrowLeft',target:{tagName:'INPUT'}});assert.equal(moves.length,before);
  assert.equal(typeof control.reset,'function');control.reset();
  listeners.keydown({key:'ArrowRight',target:{tagName:'BODY'},preventDefault(){}});assert.deepEqual(moves.at(-1),[1,0]);
});

test('integer-safe generated zones cover the catalog for common seeds and remain stable on reload',()=>{
  for(const seed of [0,1,7,1073741823,2147483647,123456789]){
    const sequence=Array.from({length:120},(_,zoneIndex)=>ensureActiveZones({seed,zoneIndex,zones:[],history:[]}).zones.find(zone=>zone.index===zoneIndex).definition.id);
    assert.equal(new Set(sequence).size,ZONE_DEFINITIONS.length,`seed ${seed} should use the full zone catalog`);
    assert.deepEqual(sequence,Array.from({length:120},(_,zoneIndex)=>ensureActiveZones(JSON.parse(JSON.stringify({seed,zoneIndex,zones:[],history:[]}))).zones.find(zone=>zone.index===zoneIndex).definition.id));
  }
});

test('repeated NPC drawing reuses a 20k-possession projection and invalidates it on transfer',()=>{
  let state=scene();state.inventory=Array.from({length:20000},(_,i)=>({...item(`crown-${i}`),ownerId:'cynthia'}));
  let iterations=0;
  const possessions=state.inventory.map(item=>item.id);
  Object.defineProperty(possessions,Symbol.iterator,{enumerable:false,value:function*(){iterations++;yield* Array.prototype.values.call(this);}});
  state.npcs.cynthia.possessions=possessions;
  const first=render.appearanceForNpc(state,'cynthia');const initialIterations=iterations;
  const {canvas}=recordingCanvas();const renderer=render.createRenderer(canvas);
  for(let i=0;i<20;i++)renderer.renderFrame({state,runtime:{npcs:[{id:'cynthia',x:600,y:500}]},time:i*16});
  assert.equal(iterations,initialIterations,'unchanged lifetime possessions cannot be rescanned each render');
  assert.ok(first.equippedItems.length<=9);
  state=transferPossession(state,first.equippedItems[0].id,'cynthia','player','Recovered.').state;
  const after=render.appearanceForNpc(state,'cynthia');assert.ok(!after.equippedItems.some(item=>item.id===first.equippedItems[0].id));
});

test('presentation bookkeeping is silent without suppressing renderer semantics',async()=>{
  const context=recordingAudioContext(),messages=[],visuals=[];
  const audio=createAudioController({audioContextFactory:()=>context,audioFactory:()=>({play:()=>Promise.resolve(),pause(){}}),soundtrackUrl:'local-score.mp3'});
  await audio.unlock();
  const events=['targetChanged','currentRetired','pointAward','combo','possessionTransferred','publicReaction'].map(type=>({type,text:`${type} bookkeeping`}));
  app.dispatchOceanEvents(events,{audio,haptics:createHapticsController({vibrate:null}),renderer:{consumeEvents:events=>visuals.push(...events)},say:text=>messages.push(text)});
  assert.deepEqual(context.frequencies,[]);assert.deepEqual(messages,[]);assert.deepEqual(visuals,events);
});

test('focus and window blur cancel held movement in the actual ocean frame',()=>{
  for(const transition of ['focusin','blur']){
    const listeners={},moves=[];let movement={x:0,y:0},state=scene(),runtime={};
    const node={style:{},addEventListener:(type,fn)=>{listeners[type]=fn;},removeEventListener(){}};
    app.createInputController({pad:node,knob:node,actionButton:node,target:node,onMove:(x,y)=>{movement={x,y};moves.push([x,y]);},onAction(){}});
    const body={tagName:'BODY'},button={tagName:'BUTTON',parentElement:body};
    listeners.keydown({key:'ArrowUp',target:body,preventDefault(){}});
    for(let i=0;i<10;i++)({state,runtime}=frame(state,runtime,movement));
    assert.ok(runtime.motion.vy<0);
    listeners[transition]?.({target:transition==='focusin'?button:node});
    listeners.keyup({key:'ArrowUp',target:button});
    assert.deepEqual(movement,{x:0,y:0},`${transition} must cancel the app's active movement, not only its key Set`);
    for(let i=0;i<120;i++)({state,runtime}=frame(state,runtime,movement));
    assert.ok(Math.abs(runtime.motion.vy)<.1,`${transition} must allow actual frame momentum to settle`);
    const after=moves.length;
    listeners[transition]?.({target:transition==='focusin'?button:node});
    listeners.keyup({key:'Tab',target:button});
    assert.equal(moves.length,after,'idle focus transitions must not dispatch unrelated movement');
  }
});

test('visible audio dialog blocks world input including descendants and leaves entry buttons native',()=>{
  const classes=new Set(['audio-gate']);
  const gate={tagName:'SECTION',hidden:false,getAttribute:name=>name==='role'?'dialog':null,classList:{contains:name=>classes.has(name)}};
  const copy={tagName:'P',parentElement:gate},button={tagName:'BUTTON',parentElement:gate};
  assert.equal(app.isWorldActionAllowed(copy,false),false,'dialog ancestry blocks action even without a sheet flag');
  assert.equal(typeof app.hasBlockingUi,'function');
  const root={querySelectorAll:()=>[gate]};
  const listeners={},moves=[];let actions=0,prevented=0;
  const node={style:{},addEventListener:(type,fn)=>{listeners[type]=fn;},removeEventListener(){}};
  app.createInputController({pad:node,knob:node,actionButton:node,target:node,onMove:(x,y)=>moves.push([x,y]),onAction:()=>actions++,sheetOpen:()=>app.hasBlockingUi(root)});
  for(const target of [copy,{tagName:'BODY'},button])for(const key of ['ArrowUp',' ','Enter']){
    listeners.keydown({key,target,preventDefault:()=>prevented++});listeners.keyup({key,target});
  }
  assert.deepEqual(moves,[]);assert.equal(actions,0);assert.equal(prevented,0,'native entry button activation must not be prevented');
  listeners.click();assert.equal(actions,0,'covered world action button must also be guarded');
  classes.add('is-gone');assert.equal(app.hasBlockingUi(root),false);
  listeners.keydown({key:' ',target:{tagName:'BODY'},preventDefault:()=>prevented++});assert.equal(actions,1);
  classes.delete('is-gone');gate.parentElement={hidden:true};assert.equal(app.hasBlockingUi(root),false,'hidden ancestors do not block play');
});

test('loaded malformed zone evidence is safe to merge on a later retirement',()=>{
  for(const malformed of [{bad:true},'not an evidence array',null]){
    const initial=scene();initial.world.history=[{index:0,incidents:malformed,possessions:malformed}];
    const loaded=loadState(storageFor(initial));assert.equal(loaded.state.mode,'ocean');
    let world=loaded.state.world;
    const zone=world.zones.find(zone=>zone.index===0);zone.incidents=['New allegation.'];zone.possessions=['New crown.'];
    assert.doesNotThrow(()=>{world=ensureActiveZones({...world,zoneIndex:2});});
    assert.deepEqual(world.history.find(zone=>zone.index===0).incidents,['New allegation.']);
    assert.deepEqual(world.history.find(zone=>zone.index===0).possessions,['New crown.']);
  }
  const initial=scene();initial.world.history=[{index:0,incidents:['Valid allegation.',null,{text:'Legacy allegation.'},7],possessions:['Valid crown.',false,{name:'Legacy crown.'}]}];
  let world=loadState(storageFor(initial)).state.world;
  world.zones.find(zone=>zone.index===0).incidents=['New allegation.'];world.zones.find(zone=>zone.index===0).possessions=['New crown.'];
  world=ensureActiveZones({...world,zoneIndex:2});
  assert.deepEqual(world.history.find(zone=>zone.index===0).incidents,['Valid allegation.','Legacy allegation.','New allegation.']);
  assert.deepEqual(world.history.find(zone=>zone.index===0).possessions,['Valid crown.','Legacy crown.','New crown.']);
});

test('uncontested NPC pickup retains the newest memory within the 120-entry cap',()=>{
  const state=contestedScene();state.player.x=1200;state.npcs.cynthia.memories=Array.from({length:120},(_,i)=>({type:'old',text:`Memory ${i}`}));
  const result=resolveContestedPickup(state,'cynthia','prize',()=>0);
  assert.equal(result.contested,false);assert.equal(result.winner,'cynthia');
  const memories=result.state.npcs.cynthia.memories;
  assert.equal(memories.length,120);assert.equal(memories[0].text,'Memory 1');assert.equal(memories.at(-1).itemId,'heirloom');
  assert.equal(memories.at(-1).type,'currentClaim');
});

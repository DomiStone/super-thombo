const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../game.js'), 'utf8');

// Minimal DOM/canvas harness for deterministic simulation. This does not replace
// browser layout, hit-target, touch or visual testing.
function boot({blockedStorage = false} = {}) {
  const handlers = {};
  const elements = new Map();
  const store = new Map();
  const drawCalls = [];
  let raf;
  const gradient = {addColorStop() {}};
  const canvas = new Proxy({}, {get(_, prop) {
    if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return () => gradient;
    if (prop === 'measureText') return text => ({width: text.length * 8});
    return (...args) => drawCalls.push([prop, ...args]);
  }, set() {return true;}});
  class Element {
    constructor(id) {this.id=id;this.style={};this.children=[];this.handlers={};this.attrs={};this.classes=new Set();this.classList={add:x=>this.classes.add(x),remove:x=>this.classes.delete(x),contains:x=>this.classes.has(x),toggle:(x,on)=>on?this.classes.add(x):this.classes.delete(x)};}
    addEventListener(type, f) {(this.handlers[type]??=[]).push(f);}
    emit(type, extra={}) {for(const f of this.handlers[type]||[])f({preventDefault(){},stopPropagation(){},...extra});}
    click() {this.emit('click');}
    appendChild(el) {this.children.push(el);}
    setAttribute(k,v) {this.attrs[k]=v;}
    focus() {document.activeElement=this;}
    setPointerCapture() {}
    getContext() {return canvas;}
    getBoundingClientRect() {return this.rect||{width:960,height:520};}
  }
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  for(const [,id] of html.matchAll(/id="([^"]+)"/g))elements.set(id,new Element(id));
  const document={hidden:false,getElementById:id=>{assert.ok(elements.has(id),'Missing DOM ID: '+id);return elements.get(id)},createElement:()=>new Element(),addEventListener:(k,f)=>{(handlers['document:'+k]??=[]).push(f)}};
  const context = {console,document,Image:class{complete=true;naturalWidth=1536;naturalHeight=1024},localStorage:{getItem:k=>{if(blockedStorage)throw Error('blocked');return store.get(k)},setItem:(k,v)=>{if(blockedStorage)throw Error('blocked');store.set(k,v)}},requestAnimationFrame:f=>{raf=f},setInterval:()=>1,setTimeout:()=>1,clearTimeout(){},alert(){},addEventListener:(k,f)=>{(handlers[k]??=[]).push(f)}};
  context.window=context;
  vm.createContext(context);
  const expose = `;globalThis.api={fitViewport,start,tick,draw,jump,cable,loop,returnHome,openWheel,selectWorld,updateHud,hazardActive,get state(){return {W,H,active,bonus,world,score,lives,p,coins,viruses,blocks,portals,particles,springs,hazards,dustClouds,stars,levelPlatforms,pits,checkpoint,frame,key,highScore,soundOn}},setState(v){if('score'in v)score=v.score;if('lives'in v)lives=v.lives;if('frame'in v)frame=v.frame;if('checkpoint'in v)checkpoint=v.checkpoint;}};`;
  vm.runInContext(source.replace(/\}\)\(\);\s*$/, expose+'})();'),context);
  return {api:context.api,elements,store,document,drawCalls,emit:(k,e={})=>(handlers[k]||[]).forEach(f=>f({preventDefault(){},...e})),raf:now=>raf(now)};
}

test('all eight menu cards select and start the matching world',()=>{
  const {api,elements}=boot();
  assert.equal(elements.get('world-track').children.length,8);
  assert.equal(elements.get('wheel-stage').children.length,8);
  for(let i=0;i<8;i++) {
    elements.get('world-track').children[i].click();
    assert.ok(elements.get('world-wheel').classList.contains('open'));
    assert.equal(elements.get('wheel-stage').children[i].attrs['aria-pressed'],'true');
    elements.get('wheel-go').click();
    assert.equal(api.state.world,i);
    assert.equal(api.state.active,true);
    assert.ok(elements.get('menu').classList.contains('hidden'));
    assert.ok(api.state.hazards.length>=4);
    assert.equal(api.state.pits.length,3);
    api.draw();
    api.returnHome();
  }
});
test('all world artwork files exist',()=>{
  const names=['mainboard-city','gpu-skyline','ram-forest','cpu-core','virus-labor','wlan-wolken','firewall-festung','quantum-kern'];
  for(const name of names)assert.ok(fs.statSync(path.join(__dirname,'../assets/worlds',name+'.webp')).size>1000);
});
test('pit fall removes one life and returns to a safe checkpoint',()=>{
  const {api}=boot();api.start(0);api.setState({checkpoint:950});
  Object.assign(api.state.p,{x:1140,y:650,vy:8,inv:0});api.tick();
  assert.equal(api.state.lives,2);assert.equal(api.state.p.x,950);assert.equal(api.state.p.y,300);
});
test('double jump crosses the widest gap',()=>{
  const {api}=boot();api.start(7);const {p,pits,key}=api.state;
  Object.assign(p,{x:pits[0].x-40,y:438,vy:0,jumps:0,inv:100});key.right=true;api.jump();
  for(let n=0;n<42;n++){if(n===18)api.jump();api.tick();}
  assert.ok(p.x>pits[0].x+pits[0].w);assert.ok(p.y<438);assert.equal(api.state.lives,3);
});
test('bonus return preserves collected items, enemies and checkpoint',()=>{
  const {api}=boot();api.start(3);api.state.coins[0].taken=true;api.state.viruses[0].alive=false;api.setState({checkpoint:950});
  const coins=api.state.coins;Object.assign(api.state.p,{x:1500,y:333});api.cable();
  assert.equal(api.state.bonus,true);Object.assign(api.state.p,{x:1580,y:333});api.cable();
  assert.equal(api.state.bonus,false);assert.equal(api.state.coins,coins);assert.ok(coins[0].taken);assert.equal(api.state.viruses[0].alive,false);assert.equal(api.state.checkpoint,950);
});
test('all reward types count toward saved high score',()=>{
  const {api,store}=boot();api.start(0);const star=api.state.stars[0];Object.assign(api.state.p,{x:star.x,y:star.y,vy:0});api.tick();
  assert.ok(api.state.score>=10);assert.equal(Number(store.get('thomboHigh')),api.state.score);
  api.setState({score:api.state.score+5});api.updateHud();assert.equal(Number(store.get('thomboHigh')),api.state.score);
});
test('game controls reset when focus is lost or a new game starts',()=>{
  const {api,emit}=boot();api.start();emit('keydown',{key:'ArrowRight'});assert.equal(api.state.key.right,true);emit('blur');assert.equal(api.state.key.right,false);
  emit('keydown',{key:'a'});api.returnHome();api.start();assert.equal(api.state.key.left,false);
});
test('storage restrictions do not prevent starting or saving a score',()=>{
  const {api}=boot({blockedStorage:true});api.start(4);api.setState({score:50});api.updateHud();assert.equal(api.state.highScore,50);
});
test('mute persists and survives game interactions',()=>{
  const {api,elements,store}=boot();elements.get('soundtest').click();api.start();api.jump();assert.equal(api.state.soundOn,false);assert.equal(store.get('thomboSound'),'off');
});
test('60 Hz and 120 Hz rendering advance the same simulation time',()=>{
  function run(hz){const {api,raf}=boot();api.start();raf(0);for(let i=1;i<=hz;i++)raf(i*1000/hz);return api.state.frame;}
  assert.ok(Math.abs(run(60)-run(120))<=1);
});
test('each world transitions through the exit and game-over returns to menu',()=>{
  const {api,elements}=boot();
  for(let i=0;i<8;i++){api.start(i);api.state.p.x=3800;api.cable();assert.equal(api.state.world,(i+1)%8);}
  api.setState({lives:1});Object.assign(api.state.p,{y:650,x:1140,inv:0});api.tick();assert.equal(api.state.active,false);assert.equal(elements.get('menu').classList.contains('hidden'),false);
});

test('viewport preserves proportions and gives portrait play a closer camera',()=>{
 const {api,elements}=boot();const screen=elements.get('screen');
 for(const [width,height] of [[844,350],[390,650],[1366,720]]){
  screen.rect={width,height};api.fitViewport();
  assert.ok(Math.abs(screen.width/screen.height-width/height)<.003);
  if(width<height)assert.ok(screen.width<520,'portrait shows a closer slice of the world');
  api.start(0);api.draw();
 }
});

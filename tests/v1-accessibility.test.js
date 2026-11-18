'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const controls=require('../public/accessibility');
function setup(){
  const elements=new Map();
  let resize;
  const doc={
    querySelector:s=>elements.get(s),querySelectorAll:s=>s==='#nav a'?[link]:[],
    addEventListener:(key,fn)=>doc[key]=fn,
    defaultView:{matchMedia:()=>({addEventListener:(_,fn)=>resize=fn})}
  };
  function element(id){
    const e={attrs:new Map(),isConnected:true,tabIndex:0,visible:true,
      focus(){doc.activeElement=this;},getClientRects(){return this.visible?[{}]:[];},
      matches(){return false;},getAttribute(k){return this.attrs.get(k);},
      setAttribute(k,v){this.attrs.set(k,v);},removeAttribute(k){this.attrs.delete(k);},
      addEventListener(k,f){this[k]=f;},classList:{toggle(k,on){this[k]=on;}}};
    elements.set(id,e);return e;
  }
  const open=element('#cartBtn'),close=element('#closeModal'),input=element('input'),link=element('#nav a');
  const menu=element('#menuBtn'),nav=element('#nav'),dialog=element('#overlay'),content=element('#modalContent');
  element('#dialogStatus');Object.assign(dialog,{open:false,showModal(){this.open=true;},close(){this.open=false;},querySelectorAll(){return [close,...content.fields];}});
  Object.assign(content,{fields:[],querySelector:()=>({}),querySelectorAll(){return this.fields;},replaceChildren(){this.fields=[];}});
  open.focus();const api=controls(doc);
  function key(name,shift=false){
    const event={key:name,shiftKey:shift,preventDefault(){this.prevented=true;}};
    if(name==='Tab')dialog.keydown(event);else if(dialog.open)dialog.cancel(event);else doc.keydown(event);
    return event;
  }
  return {api,open,close,input,link,menu,nav,dialog,doc,content,key,resize:()=>resize()};
}
test('empty cart retains forward and reverse tab and restores its opener after cancellation',()=>{
  const s=setup();s.api.modal('cart');assert.equal(s.doc.activeElement,s.close);
  for(const reverse of [false,true]){assert.ok(s.key('Tab',reverse).prevented);assert.equal(s.doc.activeElement,s.close);}
  s.key('Escape');assert.equal(s.dialog.open,false);assert.equal(s.doc.activeElement,s.open);
});
test('dialog replacement preserves opener and cycles from the last field to Close',()=>{
  const s=setup();s.api.modal('cart');s.content.fields=[s.input];s.api.modal('form');
  assert.equal(s.doc.activeElement,s.input);s.key('Tab');assert.equal(s.doc.activeElement,s.close);
  s.key('Tab',true);assert.equal(s.doc.activeElement,s.input);s.api.close();assert.equal(s.doc.activeElement,s.open);
});
test('mobile navigation synchronizes disclosure, focus, link activation and breakpoint changes',()=>{
  const s=setup();s.menu.onclick();assert.equal(s.menu.getAttribute('aria-expanded'),'true');assert.equal(s.doc.activeElement,s.link);
  s.key('Escape');assert.equal(s.doc.activeElement,s.menu);assert.equal(s.nav.classList.open,false);
  s.menu.onclick();s.link.click();assert.equal(s.menu.getAttribute('aria-expanded'),'false');
  s.menu.onclick();s.resize();assert.equal(s.nav.classList.open,false);
});

'use strict';
(function(root){
 function normalize(value,products){const out={};if(!value||typeof value!=='object'||Array.isArray(value))return out;for(const p of products){if(!p.active||!Number.isSafeInteger(p.price)||p.price<=0||!Number.isSafeInteger(p.stock)||p.stock<=0)continue;const qty=Object.prototype.hasOwnProperty.call(value,p.id)?value[p.id]:0;if(Number.isSafeInteger(qty)&&qty>0)Object.defineProperty(out,p.id,{value:Math.min(qty,p.stock),enumerable:true,writable:true,configurable:true});}return out;}
 function read(raw){try{const x=JSON.parse(raw||'{}');return x&&typeof x==='object'&&!Array.isArray(x)?x:{};}catch{return {};}}
 const api={normalize,read};if(typeof module==='object'&&module.exports)module.exports=api;else root.VitaSafeCart=api;
})(typeof window!=='undefined'?window:globalThis);

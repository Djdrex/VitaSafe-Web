'use strict';
fetch('/api/health').then(r=>r.json()).then(x=>{
 if(x.mode!=='demo')return;
 const el=document.createElement('div');
 el.setAttribute('role','status');
 el.textContent='VitaSafe · DEMOSTRACIÓN — No se aceptan pedidos ni registros. No ingreses información real. Los datos de esta vista pueden reiniciarse.';
 Object.assign(el.style,{position:'sticky',top:'0',zIndex:'99999',background:'#7f1d1d',color:'#fff',padding:'10px 16px',textAlign:'center',font:'600 13px system-ui,sans-serif'});
 document.body.prepend(el);
 const syncHeight=()=>document.documentElement.style.setProperty('--demo-banner-height',el.getBoundingClientRect().height+'px');
 syncHeight();
 new ResizeObserver(syncHeight).observe(el);
}).catch(()=>{});

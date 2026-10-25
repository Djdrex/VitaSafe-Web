'use strict';
// Lima local time is UTC-05 year-round; this avoids the server timezone and UTC date bug.
const LIMA_OFFSET_MS=5*60*60*1000;
const localNow=()=>new Date(Date.now()-LIMA_OFFSET_MS);
const localDate=()=>localNow().toISOString().slice(0,10);
const localMinutes=()=>{const d=localNow();return d.getUTCHours()*60+d.getUTCMinutes()};
const opening=8*60,closing=22*60,lead=60;
function validateSchedule(date,time){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw Error('Selecciona fecha y hora válidas');
 const day=new Date(date+'T00:00:00Z');if(Number.isNaN(day.getTime())||day.toISOString().slice(0,10)!==date)throw Error('Fecha inválida');
 const minutes=Number(time.slice(0,2))*60+Number(time.slice(3));
 if(minutes<opening||minutes>closing)throw Error('Selecciona un horario entre 8:00 y 22:00');
 const today=localDate();if(date<today)throw Error('No se aceptan fechas anteriores a hoy');
 if(date===today&&minutes<localMinutes()+lead)throw Error('El horario de hoy ya no está disponible. Selecciona otro horario o mañana');
 if(day.getTime()>new Date(today+'T00:00:00Z').getTime()+90*86400000)throw Error('Puedes reservar hasta con 90 días de anticipación');
 return true;
}
function availability(){const today=localDate(),start=localMinutes()+lead;return {today,earliest_date:start>closing?new Date(new Date(today+'T00:00:00Z').getTime()+86400000).toISOString().slice(0,10):today,earliest_minutes:start,open:'08:00',close:'22:00',lead_minutes:lead,timezone:'America/Lima'};}
module.exports={validateSchedule,availability};

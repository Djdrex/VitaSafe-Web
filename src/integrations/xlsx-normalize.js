'use strict';
// ExcelJS expects unprefixed SpreadsheetML tags. Some valid XLSX writers use
// explicit namespace prefixes. Normalize only that known namespace, after the
// caller has enforced the compressed/decompressed ZIP limits.
const JSZip=require('jszip'),path=require('node:path').posix;
async function normalizeSpreadsheetML(buffer){
 const zip=await JSZip.loadAsync(buffer);let changed=false;
 const namespace='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
 for(const entry of Object.values(zip.files)){
  if(!entry.dir&&/^xl\/.*\.rels$/.test(entry.name)){
   const source=entry.name.replace('/_rels/','/').replace(/\.rels$/,'');
   const text=await entry.async('string');
   const fixed=text.replace(/Target="\/(xl\/[^"<>]+)"/g,(_,target)=>'Target="'+path.relative(path.dirname(source),target)+'"');
   if(fixed!==text){zip.file(entry.name,fixed);changed=true}continue;
  }
  if(entry.dir||!/^xl\/.*\.xml$/.test(entry.name))continue;
  let xml=await entry.async('string');
  const declarations=[...xml.matchAll(/xmlns:([A-Za-z_][\w.-]*)=["']http:\/\/schemas\.openxmlformats\.org\/spreadsheetml\/2006\/main["']/g)];
  for(const match of declarations){
   const prefix=match[1].replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
   xml=xml.replace(new RegExp('(<\\/?)'+prefix+':','g'),'$1');
   xml=xml.replaceAll(match[0],'xmlns="'+namespace+'"');changed=true;
  }
  if(declarations.length)zip.file(entry.name,xml);
 }
 return changed?zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'}):buffer;
}
module.exports={normalizeSpreadsheetML};

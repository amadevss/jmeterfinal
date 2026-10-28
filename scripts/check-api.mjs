import assert from 'node:assert/strict';
const base=process.env.BASE_URL||'http://localhost:3001';
const participant='Maria Pruebas';
let checks=0;
async function call(path, status=200, method='GET', body, headers={}){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json','X-Participante':participant,...headers},...(body!==undefined?{body:typeof body==='string'?body:JSON.stringify(body)}:{})});assert.equal(r.status,status,`${method} ${path}`);checks++;return {r,data:[204,205,304].includes(r.status)?null:await r.json()};}
const {data:health}=await call('/api/salud');assert.equal(health.derechohabientes,500);
const {data:list}=await call('/api/derechohabientes');const curp=list.derechohabientes[0].curp;
await call('/api/derechohabientes?limite=51',422);
const codes=[];
for(const [path,status,method,body,headers] of [[`/api/derechohabientes/${curp}`,200],['/api/derechohabientes/XXXX000000HXXXXX00',404],['/api/citas',201,'POST',{curp,especialidad:'Pediatría',fecha:'2026-11-05',hora:'09:30'}],['/api/citas',400,'POST','{"curp":"x" "hora":"09:30"}'],['/api/protegido',200,'GET',undefined,{Authorization:'Bearer clinica123'}]]){const {r,data}=await call(path,status,method,body,headers);codes.push(data.mision.codigo);assert.equal(data.mision.codigo,r.headers.get('x-mision-codigo'));if(data.id)globalThis.cita=data.id;}
for(const codigo of codes){const {data}=await call('/api/misiones/verificar',200,'POST',{participante:participant,codigo});assert.equal(data.valido,true);}
await call('/api/misiones/verificar',400,'POST',{participante:'Otro Usuario',codigo:codes[0]});
await call('/api/misiones/verificar',200,'POST',{participante:'MÁRIA   PRUEBAS',codigo:codes[0]});
await call('/api/misiones/constancia',400,'POST',{participante:participant,codigos:codes.slice(1)});
const {data:cert}=await call('/api/misiones/constancia',200,'POST',{participante:participant,codigos:codes});assert.match(cert.folio,/^CD-[A-F0-9]{8}$/);
await call('/api/protegido',401);await call('/api/citas',422,'POST',{});await call('/api/citas',422,'POST',[]);
await call('/api/citas',404,'POST',{curp:'NO',especialidad:'x',fecha:'x',hora:'x'});
await call(`/api/citas/${globalThis.cita}`);await call(`/api/citas/${globalThis.cita}`,200,'PUT',{curp,especialidad:'x',fecha:'x',hora:'x'});await call(`/api/citas/${globalThis.cita}`,200,'PATCH',{hora:'12:30'});await call(`/api/citas/${globalThis.cita}`,400,'PATCH',{});await call(`/api/citas/${globalThis.cita}`,204,'DELETE');await call('/api/citas/NO',404);
await call('/api/simular/500',500);await call('/api/simular/204',204);await call('/api/simular/205',205);await call('/api/simular/600',422);await call('/api/simular/lento?ms=-1',422);const start=Date.now();await call('/api/simular/lento?ms=100');assert.ok(Date.now()-start>=95);
const soap=await fetch(base+'/soap',{method:'POST',headers:{'Content-Type':'text/xml'},body:`<soap:Envelope><soap:Body><ConsultarDerechohabiente><curp>${curp}</curp></ConsultarDerechohabiente></soap:Body></soap:Envelope>`});assert.equal(soap.status,200);assert.match(await soap.text(),/ConsultarDerechohabienteResponse/);checks++;
const fault=await fetch(base+'/soap',{method:'POST',body:'<no/>'});assert.equal(fault.status,500);assert.match(await fault.text(),/soap:Fault/);checks++;
const csv=await fetch(base+'/datos/curps_500.csv');assert.equal((await csv.text()).trim().split('\n').length,501);checks++;
const {data:entries}=await call('/api/peticiones?participante=Maria%20Pruebas');assert.ok(entries.some(e=>e.codigo===codes[0]));assert.ok(entries.every(e=>!e.ruta.startsWith('/api/peticiones')));assert.ok(entries.every(e=>!('authorization' in e)));
for(const path of ['/','/docs','/jmeter/Entrega_Final_TUNOMBRE.jmx']){assert.equal((await fetch(base+path)).status,200);checks++;}
console.log(`${checks} comprobaciones HTTP correctas. Cinco misiones, firma, constancia, validación, CRUD simulado, SOAP, CSV y monitor.`);

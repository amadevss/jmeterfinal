const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import assert from 'node:assert/strict';
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});const page=await browser.newPage({viewport:{width:1440,height:1100}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:3002');await page.getByLabel('Nombre del participante').fill('Maria Pruebas');await page.getByRole('button',{name:'Seleccionar',exact:true}).click();
 const codes=await page.evaluate(async()=>{const rows=await(await fetch('/api/peticiones?participante=Maria%20Pruebas')).json();return [...new Set(rows.filter(e=>e.codigo).map(e=>e.codigo))];});assert.equal(codes.length,5);
 for(const code of codes){await page.getByLabel('¿Ya tienes un código de misión?').fill(code);await page.getByRole('button',{name:'Guardar código →'}).click();await page.getByRole('status').filter({hasText:/verificada y guardada/}).waitFor();await page.getByRole('button',{name:'Guardar código →'}).waitFor({state:'visible'});}
 await page.getByText(/Folio: CD-/).waitFor();await page.reload();await page.getByText(/Folio: CD-/).waitFor();
 await page.screenshot({path:'docs/panel-desktop.png',fullPage:true});
 await page.getByLabel('Nombre del participante').fill('Otro Usuario');await page.getByRole('button',{name:'Seleccionar',exact:true}).click();await page.getByText('Activo: Otro Usuario').waitFor();assert.equal(await page.getByText(/Folio: CD-/).count(),0);
 await page.getByLabel('Nombre del participante').fill('Maria Pruebas');await page.getByRole('button',{name:'Seleccionar',exact:true}).click();await page.getByText(/Folio: CD-/).waitFor();
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'docs/panel-mobile.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);
 await page.goto('http://127.0.0.1:3002/docs');await page.getByLabel('X-Participante',{exact:true}).fill('Usuario Docs');await page.getByRole('button',{name:'Ejecutar GET →'}).click();await page.getByText(/HTTP 200/).waitFor();await page.screenshot({path:'docs/documentacion-mobile.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);assert.deepEqual(errors,[]);
 console.log('UI correcta: cinco códigos, constancia, recarga, perfiles separados, probador real, móvil sin desbordamiento y sin errores de navegador.');await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});

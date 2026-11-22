// Browser-native acceptance of the frontend only. Uses synthetic claims in isolated Chromium profiles.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const SITE='http://127.0.0.1:4173/';
const STORE='nbr_eledger_entries_v1';
const cases=[
  { route:'Salary (Others)', ref:'E2E-SAL-101', claim:'Claimed Amount' },
  { route:'Service Payment', ref:'E2E-SRV-101', claim:'Claimed Amount' },
  { route:'Others', ref:'E2E-OTH-101', claim:'Claimed Amount' },
  { route:'Source Tax (LTU)', ref:'E2E-LTU-101', claim:'Amount' },
  { route:'Adjustment of Tax Refund', ref:'E2E-REF-101', claim:'Adjustment Claim Amount' },
];
const report=[];
async function startPreview(){
 const proc=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4173','--strictPort'],{stdio:['ignore','pipe','pipe']});
 let log='';
 proc.stdout.on('data',d=>log+=String(d)); proc.stderr.on('data',d=>log+=String(d));
 for(let i=0;i<80;i++){
  if(proc.exitCode!==null)throw Error('Preview exited: '+log);
  try{const response=await fetch(SITE); if(response.ok&&(await response.text()).includes('NBR eReturn Ledger'))return proc;}catch{}
  await delay(200);
 }
 proc.kill();throw Error('Preview unavailable: '+log);
}
async function openRoute(page,name,width){
 if(width<600){
  const opener=page.getByRole('button',{name:'Open ledger menu'});
  if(await opener.isVisible())await opener.click();
 }
 const aside=page.locator('aside.eledger-sidebar');
 if(['Salary (Others)','Service Payment','Others','Source Tax (LTU)'].includes(name)){
  const group=aside.getByRole('button',{name:'Claim Source Tax',exact:true});
  if(await group.getAttribute('aria-expanded')==='false')await group.click();
 }
 await aside.getByRole('button',{name,exact:true}).click();
}
function editorFor(page,c,width){
 const inline=width>=768 && (c.route==='Salary (Others)' || c.route==='Adjustment of Tax Refund');
 return inline ? page.locator('tr.eledger-source-inline-editor') : page.getByRole('dialog');
}
async function fill(form,c){
 if(['Salary (Others)','Service Payment','Others'].includes(c.route)){
  await form.getByRole('textbox',{name:'Depositing Authority'}).fill('Synthetic E2E Authority');
  if(c.route==='Others')await form.getByRole('combobox',{name:'Purpose of the Payment'}).selectOption({index:1});
  if(c.route==='Service Payment')await form.getByRole('combobox',{name:'Payment Document Type'}).selectOption('CHALLAN');
  const inlineSalary=c.route==='Salary (Others)' && await form.evaluate(el=>el.tagName==='TR');
  const refLabel=c.route==='Salary (Others)' && !inlineSalary?'Challan / Certificate Reference No.':'Challan/ Certificate Reference No.';
  const totalLabel=c.route==='Salary (Others)' && !inlineSalary?'Challan / Certificate Amount':'Challan/ Certificate Amount';
  await form.getByRole('textbox',{name:refLabel,exact:true}).fill(c.ref);
  await form.locator('input[type=date]').fill('2026-05-14');
  await form.getByRole('spinbutton',{name:totalLabel,exact:true}).fill('800');
  await form.getByRole('spinbutton',{name:'Claimed Amount'}).fill('250');
 }else if(c.route==='Source Tax (LTU)'){
  await form.getByRole('combobox',{name:'Section'}).selectOption({index:1});
  await form.getByRole('spinbutton',{name:'Amount',exact:true}).fill('250');
  await form.getByRole('textbox',{name:'Challan No'}).fill(c.ref);
  await form.getByRole('textbox',{name:'Description'}).fill('Synthetic LTU');
 }else{
  await form.getByRole('textbox',{name:'Assessment Year'}).fill('2025-2026');
  await form.getByRole('textbox',{name:'Return Register No. / Reference No.'}).fill(c.ref);
  await form.locator('input[type=date]').fill('2026-04-15');
  await form.getByRole('combobox',{name:'Return Filing Zone'}).selectOption({index:1});
  await form.getByRole('combobox',{name:'Return Filing Circle'}).selectOption({index:1});
  await form.getByRole('spinbutton',{name:'Refund Amount'}).fill('800');
  await form.getByRole('spinbutton',{name:'Adjustment Claim Amount'}).fill('250');
 }
}
async function save(form,c){
 const inline=await form.evaluate(el=>el.tagName==='TR');
 const label=c.route==='Source Tax (LTU)'?'Submit':c.route==='Salary (Others)'&&!inline?'Save claim':'Save';
 await form.getByRole('button',{name:label,exact:true}).click();
 try {
  await form.waitFor({state:'detached'});
 } catch (error) {
  const state = await form.evaluate((node) => ({
   alerts: [...node.querySelectorAll('[role="alert"]')].map((item) => item.textContent?.trim()),
   fields: [...node.querySelectorAll('input,select,textarea')].map((item) => ({
    label: item.getAttribute('aria-label'), value: item.value, invalid: item.getAttribute('aria-invalid'),
   })),
   content: node.textContent?.slice(0, 700),
  })).catch(() => ({ detached: true }));
  throw new Error('Native Save left drawer open: ' + JSON.stringify({ route: c.route, state }), { cause: error });
 }
}
async function stored(page){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)??'null'),STORE);}
async function testViewport(browser,width){
 const context=await browser.newContext({viewport:{width,height:width<600?844:900},isMobile:width<600,hasTouch:width<600});
 const page=await context.newPage(); page.setDefaultTimeout(10000);
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 const response=await page.goto(SITE,{waitUntil:'networkidle'});
 assert.equal(response.status(),200);
 await page.getByRole('heading',{name:'Dashboard',exact:true}).waitFor();
 assert.deepEqual(await stored(page),[],'Native storage on first visit must have no invented credits');
 report.push({width,check:'fresh native storage',pass:true});
 // Source-evidenced Income Sync is a disclosure, not an invented manual Add form.
 for (const route of ['Bank/FI Interest/Profit','Sanchayapatra']) {
  await openRoute(page,route,width);
  const disclosure=page.locator('details.eledger-workflow-disclosure summary');
  await disclosure.waitFor({state:'visible'});
  assert.match(await disclosure.innerText(),/Sync from Income/);
  assert.equal(await page.getByRole('button',{name:'Add Entry',exact:true}).count(),0);
  await disclosure.click();
  await page.getByText(/No pending declared income sources found/).waitFor({state:'visible'});
  assert.deepEqual(await stored(page),[],'Income disclosure must not write claims');
  report.push({width,category:route,check:'read-only Income Sync disclosure; no invented declarations',pass:true});
 }
 for(const c of cases){
  await openRoute(page,c.route,width);
  const add=c.route==='Source Tax (LTU)'?'Add Source Tax':'Add Entry';
  await page.getByRole('button',{name:add,exact:true}).click();
  const form=editorFor(page,c,width); await form.waitFor({state:'visible'});
  if(width>=768 && (c.route==='Salary (Others)' || c.route==='Adjustment of Tax Refund'))
    assert.equal(await form.locator('td').count(),c.route==='Salary (Others)'?8:9,
      'Original PDF inline row must include each source cell and its Action cell');
  await fill(form,c); await save(form,c);
  const saved=(await stored(page)).find(row=>row.referenceNo===c.ref);
  assert.ok(saved,'Native saved row missing '+c.ref);
  assert.equal(saved.taxDeducted,250);assert.equal(saved.status,'PENDING_VERIFICATION');
  assert.equal(saved.externalVerified,false);
  const date=saved.date;
  report.push({width,category:c.route,check:'Add writes pending native record',pass:true});

  await page.reload({waitUntil:'networkidle'});
  await openRoute(page,c.route,width);
  await page.locator('table tbody tr').filter({hasText:c.ref}).waitFor({state:'visible'});
  assert.equal((await stored(page)).find(row=>row.id===saved.id)?.referenceNo,c.ref);
  report.push({width,category:c.route,check:'real browser reload preserves Add',pass:true});

  await page.getByRole('button',{name:'View details '+c.ref}).click();
   await page.getByRole('dialog',{name:'Record Details'}).getByRole('button',{name:'Edit',exact:true}).click();
  const cancelEditor=editorFor(page,c,width);
  await cancelEditor.getByRole('spinbutton',{name:c.claim,exact:true}).fill('110');
  await cancelEditor.getByRole('button',{name:c.route==='Source Tax (LTU)' ? 'Close form' : 'Cancel',exact:true}).click();
  await page.reload({waitUntil:'networkidle'});
  await openRoute(page,c.route,width);
  assert.equal((await stored(page)).find(row=>row.id===saved.id)?.taxDeducted,250);
  report.push({width,category:c.route,check:'Cancel preserves amount after reload',pass:true});

  await page.getByRole('button',{name:'View details '+c.ref}).click();
   await page.getByRole('dialog',{name:'Record Details'}).getByRole('button',{name:'Edit',exact:true}).click();
  const edit=editorFor(page,c,width);
  await edit.getByRole('spinbutton',{name:c.claim,exact:true}).fill('300');await save(edit,c);
  await page.reload({waitUntil:'networkidle'});
  await openRoute(page,c.route,width);
  const updated=(await stored(page)).find(row=>row.id===saved.id);
  assert.ok(updated);assert.equal(updated.taxDeducted,300);assert.equal(updated.date,date);
  assert.equal(updated.createdAt,saved.createdAt);
  report.push({width,category:c.route,check:'Edit/Save preserves identity/date after reload',pass:true});

  page.once('dialog',d=>d.dismiss());
  await page.getByRole('button',{name:'View details '+c.ref}).click();
   await page.getByRole('dialog',{name:'Record Details'}).getByRole('button',{name:'Delete',exact:true}).click();
  await page.reload({waitUntil:'networkidle'});
  await openRoute(page,c.route,width);
  assert.ok((await stored(page)).some(row=>row.id===saved.id));
  report.push({width,category:c.route,check:'dismissed Delete preserves row after reload',pass:true});

  page.once('dialog',d=>d.accept());
  await page.getByRole('button',{name:'View details '+c.ref}).click();
   await page.getByRole('dialog',{name:'Record Details'}).getByRole('button',{name:'Delete',exact:true}).click();
  await page.locator('table tbody tr').filter({hasText:c.ref}).waitFor({state:'detached'});
  await page.reload({waitUntil:'networkidle'});
  assert.ok(!(await stored(page)).some(row=>row.id===saved.id));
  report.push({width,category:c.route,check:'confirmed Delete persists after reload',pass:true});
 }
 // Source page 18: real browser create/edit/delete and reload, with no official-credit mutation.
 await openRoute(page,'Environmental Surcharge',width);
 const surchargeHeaders=await page.locator('table.eledger-official-records thead th').allTextContents();
 assert.deepEqual(surchargeHeaders.map(s=>s.trim()),[
  'Motor Vehicle Registration No','Transaction ID','Bank Name','Branch Name','Payment Date','Paid Amount','Action',
 ]);
 await page.getByRole('button',{name:'Add Entry',exact:true}).click();
 const surchargeForm=width>=768 ? page.locator('tr[aria-label="New surcharge record"]') : page.getByRole('dialog',{name:'Add Entry'});
 await surchargeForm.waitFor({state:'visible'});
 await surchargeForm.getByRole('textbox',{name:'Motor Vehicle Registration No'}).fill('E2E-MOTOR-01');
 await surchargeForm.getByRole('textbox',{name:'Transaction ID'}).fill('E2E-SUR-101');
 await surchargeForm.getByRole('combobox',{name:'Bank Name'}).selectOption('AB Bank PLC');
 await surchargeForm.getByRole('textbox',{name:'Branch Name'}).fill('E2E Local Branch');
 await surchargeForm.locator('input[type=date]').fill('2026-05-14');
 await surchargeForm.getByRole('spinbutton',{name:'Paid Amount'}).fill('250');
 if(width>=768) await page.locator('.eledger-surcharge-grid-footer').getByRole('button',{name:'Save',exact:true}).click();
 else await surchargeForm.getByRole('button',{name:'Save',exact:true}).click();
 await surchargeForm.waitFor({state:'detached'});
 let surcharge=(await stored(page)).find(row=>row.referenceNo==='E2E-SUR-101');
 assert.ok(surcharge,'Surcharge Add did not persist');
 assert.equal(surcharge.claimEvidence.registrationNo,'E2E-MOTOR-01');
 assert.equal(surcharge.claimEvidence.bankName,'AB Bank PLC');
 assert.equal(surcharge.taxDeducted,250);
 assert.equal(surcharge.status,'PENDING_VERIFICATION');
 assert.equal(surcharge.externalVerified,false);
 report.push({width,category:'Environmental Surcharge',check:'original six-field Add persists pending local record',pass:true});
 await page.reload({waitUntil:'networkidle'});await openRoute(page,'Environmental Surcharge',width);
 let surchargeRow=width>=768 ? page.locator('tr.eledger-surcharge-grid-row').first() : page.locator('table tbody tr').filter({hasText:'E2E-SUR-101'});
 await surchargeRow.waitFor({state:'visible'});
 if(width>=768){
   await surchargeRow.getByRole('combobox',{name:'Bank Name'}).waitFor();
   await surchargeRow.getByRole('spinbutton',{name:'Paid Amount'}).fill('275');
   await page.locator('.eledger-surcharge-grid-footer').getByRole('button',{name:'Save',exact:true}).click();
 } else {
   assert.match(await surchargeRow.innerText(),/AB Bank PLC/);
   await surchargeRow.getByRole('button',{name:'Edit'}).click();
   const editSurcharge=page.getByRole('dialog',{name:'Edit Entry'});
   await editSurcharge.getByRole('spinbutton',{name:'Paid Amount'}).fill('275');
   await editSurcharge.getByRole('button',{name:'Save',exact:true}).click();
   await editSurcharge.waitFor({state:'detached'});
 }
 await page.reload({waitUntil:'networkidle'});await openRoute(page,'Environmental Surcharge',width);
 surcharge=(await stored(page)).find(row=>row.referenceNo==='E2E-SUR-101');
 assert.equal(surcharge.taxDeducted,275);
 assert.equal(surcharge.claimEvidence.bankName,'AB Bank PLC');
 report.push({width,category:'Environmental Surcharge',check:'edit, source columns and reload persistence',pass:true});
 surchargeRow=width>=768 ? page.locator('tr.eledger-surcharge-grid-row').first() : page.locator('table tbody tr').filter({hasText:'E2E-SUR-101'});
 page.once('dialog',d=>d.dismiss());
 await surchargeRow.getByRole('button',{name:'Delete'}).click();
 assert.ok((await stored(page)).some(row=>row.id===surcharge.id));
 page.once('dialog',d=>d.accept());
 await surchargeRow.getByRole('button',{name:'Delete'}).click();
 await surchargeRow.waitFor({state:'detached'});
 assert.ok(!(await stored(page)).some(row=>row.id===surcharge.id));
 report.push({width,category:'Environmental Surcharge',check:'delete confirmation and isolated local persistence',pass:true});
 // Original PDF p18 permits more than one unsaved desktop row and one shared Save.
 if(width>=768){
   await page.getByRole('button',{name:'Add Entry',exact:true}).click();
   await page.getByRole('button',{name:'Add Entry',exact:true}).click();
   const grid=page.locator('.eledger-surcharge-grid-row');
   assert.equal(await grid.count(),2,'Two unsaved surcharge rows must coexist');
   const drafts=[
     {ref:'E2E-SUR-BATCH-1',vehicle:'BATCH-MOTOR-1',amount:'150'},
     {ref:'E2E-SUR-BATCH-2',vehicle:'BATCH-MOTOR-2',amount:'350'},
   ];
   for(let i=0;i<2;i++){
     const row=grid.nth(i);
     await row.getByRole('textbox',{name:'Motor Vehicle Registration No'}).fill(drafts[i].vehicle);
     await row.getByRole('textbox',{name:'Transaction ID'}).fill(drafts[i].ref);
     await row.getByRole('combobox',{name:'Bank Name'}).selectOption('Community Bank Bangladesh PLC');
     await row.getByRole('textbox',{name:'Branch Name'}).fill('Local branch');
     await row.locator('input[type=date]').fill('2026-05-14');
     await row.getByRole('spinbutton',{name:'Paid Amount'}).fill(drafts[i].amount);
   }
   assert.match(await page.locator('.eledger-payment-columns').first().innerText(),/500/);
   await page.locator('.eledger-surcharge-grid-footer').getByRole('button',{name:'Save',exact:true}).click();
   assert.equal((await stored(page)).filter(row=>row.referenceNo.startsWith('E2E-SUR-BATCH')).length,2);
   await page.reload({waitUntil:'networkidle'});await openRoute(page,'Environmental Surcharge',width);
   assert.equal((await stored(page)).filter(row=>row.referenceNo.startsWith('E2E-SUR-BATCH')).length,2);
   report.push({width,category:'Environmental Surcharge',check:'two editable rows and one shared Save persist 500 in local ledger',pass:true});
   for(const ref of drafts.map(x=>x.ref)){
     page.once('dialog',d=>d.accept());
     await page.locator('tr.eledger-surcharge-grid-row').filter({
       has:page.locator('input[aria-label="Transaction ID"][value="'+ref+'"]')
     }).getByRole('button',{name:'Delete '+ref}).click();
   }
   assert.equal((await stored(page)).filter(row=>row.referenceNo.startsWith('E2E-SUR-BATCH')).length,0);
 }

 await openRoute(page,'Salary (Others)',width);
 await page.getByRole('button',{name:'Add Entry',exact:true}).click();
 const form=editorFor(page,cases[0],width);
 await fill(form,{...cases[0],ref:'E2E-AY-ISOLATION'});await save(form,cases[0]);
 await page.getByRole('combobox',{name:'Assessment Year'}).selectOption('2025-2026');
 await page.locator('table tbody tr').filter({hasText:'E2E-AY-ISOLATION'}).waitFor({state:'detached'});
 await page.getByRole('combobox',{name:'Assessment Year'}).selectOption('2026-2027');
 await page.locator('table tbody tr').filter({hasText:'E2E-AY-ISOLATION'}).waitFor({state:'visible'});
 report.push({width,check:'AY context isolation in actual UI',pass:true});
 const nextPage=await context.newPage();await nextPage.goto(SITE,{waitUntil:'networkidle'});
 assert.deepEqual(await stored(nextPage),await stored(page));
 report.push({width,check:'native persistence shared with second tab',pass:true});
 assert.deepEqual(errors,[]);
 report.push({width,check:'zero uncaught JS errors',pass:true});
 await context.close();
}
let proc,browser;
try{
 proc=await startPreview();browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 for(const width of [1280,390,320])await testViewport(browser,width);
 console.log('NATIVE_BROWSER_ACCEPTANCE PASS '+report.length+'/'+report.length);
 console.log(JSON.stringify(report));
}catch(e){console.error('NATIVE_BROWSER_ACCEPTANCE FAIL',e.stack||String(e));process.exitCode=1;}
finally{if(browser)await browser.close();if(proc)proc.kill('SIGTERM');}

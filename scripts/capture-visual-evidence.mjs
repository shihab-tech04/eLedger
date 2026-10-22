// Evidence capture only: no NBR access, taxpayer records, mutations or model-data claims.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const SITE = 'http://127.0.0.1:4173/';
const DEST = 'artifacts/eledger-visual-evidence';
const routes = [
  ['01-salary-ibas','Salary (iBAS++)','source'],
  ['02-salary-others','Salary (Others)','source'],
  ['03-bank-fi','Bank/FI Interest/Profit','source'],
  ['04-dividend','Dividend','source'],
  ['05-service','Service Payment','source'],
  ['06-sanchayapatra','Sanchayapatra','source'],
  ['07-import','Import','source'],
  ['08-source-ltu','Source Tax (LTU)','source'],
  ['09-commercial','Commercial Vehicle','source'],
  ['10-other-tds','Others','source'],
  ['11-car-ait','AIT on Car','ait'],
  ['12-ait154','AIT (154)','ait'],
  ['13-ait-import','AIT Import (120)','ait'],
  ['14-paid-return','Tax Paid with Return (173)','direct'],
  ['15-surcharge','Environmental Surcharge','direct'],
  ['16-refund','Adjustment of Tax Refund','direct'],
  ['17-carry-forward','Adjustment of carry forward tax u/s 163','direct'],
  ['18-status','Tax Payment Status','status']
];
const forms = [
 ['Salary (Others)',6,'02-salary-others'],
 ['Service Payment',6,'05-service'],
 ['Others',7,'10-other-tds'],
 ['Source Tax (LTU)',5,'08-source-ltu'],
 ['Adjustment of Tax Refund',7,'16-refund']
];
const out={source:'compiled Vite dist, isolated empty browser storage',release:process.env.GITHUB_SHA||'LOCAL',
  observedAt:new Date().toISOString(),scope:'original NBR signed-in visual comparison NOT performed',
  viewports:[],routes:[],forms:[],dashboard:[],ibas:[],javascriptExceptions:[],pass:false};
async function boot(){
 const p=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4173','--strictPort'],{stdio:['ignore','pipe','pipe']});
 let logs='';
 p.stdout.on('data',d=>logs+=d);p.stderr.on('data',d=>logs+=d);
 for(let i=0;i<75;i++){
   if(p.exitCode!==null)throw Error('Preview stopped '+logs);
   try{const v=await fetch(SITE);if(v.ok && (await v.text()).includes('NBR eReturn Ledger'))return p;}catch{}
   await sleep(200);
 }
 p.kill();throw Error('Preview inaccessible '+logs);
}
async function openNav(page,label,group,width){
 if(width<600)await page.getByRole('button',{name:'Open ledger menu',exact:true}).click();
 const nav=page.locator('aside.eledger-sidebar');
 if(group==='source'||group==='ait'){
  const g=nav.getByRole('button',{name:group==='source'?'Claim Source Tax':'Claim AIT',exact:true});
  if(await g.getAttribute('aria-expanded')==='false')await g.click();
 }
 await nav.getByRole('button',{name:label,exact:true}).click();
}
async function screenshot(page,rel){
 const target=path.join(DEST,rel+'.png');
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.screenshot({path:target,fullPage:true,animations:'disabled'});
 return target;
}
async function checkOverflow(page){
 const dims=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,
   viewport:document.documentElement.clientWidth}));
 assert.ok(dims.doc<=dims.viewport+1,'Document overflow '+JSON.stringify(dims));
}
let preview, browser;
try {
 await mkdir(DEST,{recursive:true});
 preview=await boot();browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 // The first navigation page is audited separately at four viewports, in both languages.
 for(const width of [375,768,1280,1920]){
  const ctx=await browser.newContext({viewport:{width,height:width<600?844:900},
    isMobile:width<600,hasTouch:width<600,locale:'en-US'});
  const page=await ctx.newPage();page.setDefaultTimeout(12000);
  page.on('pageerror',e=>out.javascriptExceptions.push({width,error:String(e)}));
  await page.goto(SITE,{waitUntil:'networkidle'});
  await page.getByRole('heading',{name:'Dashboard',exact:true}).waitFor();
  const status=page.locator('.eledger-dashboard-credit-status');
  assert.equal(await status.count(),1,'Verified-credit status must be near the summary');
  assert.match(await status.innerText(),/verified credit/i);
  assert.equal(await page.locator('svg.eledger-composition-bar').count(),0,
    'No 0%-composition bar for a fresh empty ledger');
  assert.ok((await page.locator('details.eledger-category-unrecorded').count())>=3);
  assert.ok((await page.locator('details.eledger-category-unrecorded:not([open])').count())>=3);
  const ctas=page.getByRole('button',{name:'Start with Salary (Others)',exact:true});
  await ctas.waitFor({state:'visible'});
  await checkOverflow(page);
  const enShot=await screenshot(page,'dashboard/'+width+'-en');
  const summaryBounding=await page.locator('.eledger-dashboard-primary-next').boundingBox();
  const statusBounding=await status.boundingBox();
  assert.ok(summaryBounding && statusBounding);
  assert.ok(statusBounding.y<summaryBounding.y,
    'Verified-credit amount must precede primary next action');
  out.dashboard.push({width,language:'en',screenshot:enShot,statusY:Math.round(statusBounding.y),
    nextActionY:Math.round(summaryBounding.y),pass:true});
  await page.getByRole('button',{name:'বাংলা',exact:true}).click();
  await page.locator('.eledger-app[lang="bn"]').waitFor();
  await page.getByRole('button',{name:'অন্যান্য বেতন দিয়ে শুরু করুন',exact:true}).waitFor();
  await checkOverflow(page);
  const bnShot=await screenshot(page,'dashboard/'+width+'-bn');
  out.dashboard.push({width,language:'bn',screenshot:bnShot,pass:true});
  await page.getByRole('button',{name:'English',exact:true}).click();

  // The primary CTA must land on an editable Salary (Others) head, not read-only iBAS++.
  await page.getByRole('button',{name:'Start with Salary (Others)',exact:true}).click();
  const activeRoute=page.locator('aside.eledger-sidebar button[aria-current="page"]').filter({hasText:'Salary (Others)'});
  assert.equal(await activeRoute.count(),1,
    'Salary (Others) must be selected even when mobile navigation is closed');
  // Return to the dashboard and ensure the group-aggregate card opens all payment buckets.
  if(width<=960)await page.getByRole('button',{name:'Open ledger menu'}).click();
  const sidebar=page.locator('aside.eledger-sidebar');
  if(width<=960)assert.ok(await sidebar.evaluate(el=>el.classList.contains('is-open')),
    'Mobile navigation did not open before return to Dashboard');
  const dashboardNav=sidebar.locator('nav.eledger-sidebar-links > button').first();
  await dashboardNav.click();
  await page.getByRole('heading',{name:'Dashboard',exact:true}).waitFor();
  await page.locator('button.eledger-summary-card.other').click();
  await page.getByRole('dialog',{name:'Tax Payment Status'}).waitFor();
  await page.getByRole('button',{name:'Close Tax Payment Status'}).click();
  if(width===1280){
    // An explicit uncategorized zero is never mistaken for verified credit.
    const source=page.locator('section.eledger-category-source details');
    await source.locator('summary').click();
    assert.ok(await source.locator('button').count()>0);
    await source.locator('summary').click();
  }
  assert.equal(out.javascriptExceptions.filter(e=>e.width===width).length,0);
  await ctx.close();
 }
 // Independently exercise Page 02 iBAS++ at small phone, tablet and desktop widths.
 for(const width of [375,768,1280,1920]){
  const ctx=await browser.newContext({viewport:{width,height:width<=375?812:900},
    isMobile:width<600,hasTouch:width<600,locale:'en-US'});
  const page=await ctx.newPage();page.setDefaultTimeout(12000);
  page.on('pageerror',e=>out.javascriptExceptions.push({width,error:String(e)}));
  await page.goto(SITE,{waitUntil:'networkidle'});
  if(width<=960)await page.getByRole('button',{name:'Open ledger menu'}).click();
  const nav=page.locator('aside.eledger-sidebar');
  await nav.getByRole('button',{name:'Salary (iBAS++)',exact:true}).click();
  await page.getByRole('heading',{name:'Salary (iBAS++)',exact:true}).waitFor();
  await page.locator('#eledger-ibas-empty-title').waitFor();
  assert.match(await page.locator('.eledger-ibas-empty').innerText(),/does not mean that no tax was deducted/);
  assert.equal(await page.getByRole('button',{name:'Add Entry',exact:true}).count(),0);
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('nbr_eledger_entries_v1'))),[],
    'Read-only payroll empty state must not invent records');
  if(width<=960){
    const selector=page.locator('.eledger-mobile-route-selector');
    await selector.waitFor({state:'visible'});
    assert.match(await selector.innerText(),/Swipe for more/);
    const navTabs=selector.locator('nav.eledger-source-mobile-routes');
    const dimensions=await navTabs.evaluate(el=>({width:el.clientWidth,scroll:el.scrollWidth}));
    assert.ok(dimensions.scroll>dimensions.width,'iBAS source navigation needs visible overflow');
    const targets=await navTabs.locator('button').evaluateAll(els=>els.map(el=>el.getBoundingClientRect().height));
    assert.ok(targets.length>=8 && targets.every(height=>height>=43.5),
      'Category touch targets must be at least 44px high: '+targets);
  }
  await checkOverflow(page);
  const en=await screenshot(page,'ibas/'+width+'-en');
  out.ibas.push({width,language:'en',screenshot:en,pass:true});
  await page.getByRole('button',{name:'বাংলা',exact:true}).click();
  await page.locator('.eledger-app[lang="bn"]').waitFor();
  await page.getByRole('heading',{name:'স্থানীয় iBAS++ বেতনের তথ্য পাওয়া যায়নি'}).waitFor();
  await checkOverflow(page);
  const bn=await screenshot(page,'ibas/'+width+'-bn');
  out.ibas.push({width,language:'bn',screenshot:bn,pass:true});
  await page.getByRole('button',{name:'English',exact:true}).click();

  await page.getByRole('button',{name:'Review Salary (Others)',exact:true}).click();
  await page.getByRole('heading',{name:'Salary (Others)',exact:true}).waitFor();
  if(width<=960)await page.getByRole('button',{name:'Open ledger menu'}).click();
  await nav.getByRole('button',{name:'Salary (iBAS++)',exact:true}).click();
  await page.getByRole('button',{name:'How eLedger works',exact:true}).click();
  await page.getByRole('heading',{name:'How eReturn Ledger Works',exact:true}).waitFor();
  assert.equal(out.javascriptExceptions.filter(x=>x.width===width).length,0);
  await ctx.close();
 }
 for(const width of [1280,390]){
  const context=await browser.newContext({viewport:{width,height:width===390?844:900},
    isMobile:width===390,hasTouch:width===390,locale:'en-US'});
  const page=await context.newPage();page.setDefaultTimeout(12000);
  page.on('pageerror',x=>out.javascriptExceptions.push({width,error:String(x)}));
  const response=await page.goto(SITE,{waitUntil:'networkidle'});
  assert.equal(response.status(),200);
  assert.equal(await page.evaluate(()=>localStorage.getItem('nbr_eledger_entries_v1')),'[]');
  out.viewports.push(width);
  for(const [id,label,group] of routes){
   if(group==='status'){
    await openNav(page,label,group,width);
    await page.getByRole('dialog',{name:'Tax Payment Status'}).waitFor();
    await checkOverflow(page);
    let shot=await screenshot(page,String(width)+'/'+id+'-en');
    out.routes.push({width,id,originalNavLabel:label,language:'en',visual:shot,pass:true});
    await page.getByRole('button',{name:'Close Tax Payment Status'}).click();
    await page.getByRole('button',{name:'বাংলা',exact:true}).click();
    if(width<600)await page.getByRole('button',{name:'লেজার মেনু খুলুন'}).click();
    await page.locator('aside.eledger-sidebar').getByRole('button',{name:'কর পরিশোধের অবস্থা',exact:true}).click();
    await page.getByRole('dialog',{name:'কর পরিশোধের অবস্থা'}).waitFor();
    await checkOverflow(page);
    shot=await screenshot(page,String(width)+'/'+id+'-bn');
    out.routes.push({width,id,originalNavLabel:label,language:'bn',visual:shot,pass:true});
    await page.getByRole('button',{name:'কর পরিশোধের বিবরণ বন্ধ করুন'}).click();
    await page.getByRole('button',{name:'English',exact:true}).click();
    continue;
   }
   await openNav(page,label,group,width);
   await page.locator('main.eledger-main').waitFor();
   for(const lang of ['en','bn']){
    if(lang==='bn')await page.getByRole('button',{name:'বাংলা',exact:true}).click();
    const langValue=await page.locator('.eledger-app').getAttribute('lang');
    assert.equal(langValue,lang);
    await checkOverflow(page);
    if(width===390){
      const empty=page.locator('table.eledger-official-records tr.eledger-empty-records-row td');
      if(await empty.count()){
        const bounds=await empty.first().evaluate(td=>{
          const row=td.closest('tr');
          return {cell:td.getBoundingClientRect().width,row:row?.getBoundingClientRect().width||0};
        });
        assert.ok(bounds.row>0&&bounds.cell/bounds.row>=0.8,
          'Mobile '+id+' '+lang+' empty message is squeezed into a table column: '+JSON.stringify(bounds));
      }
    }
    const shot=await screenshot(page,String(width)+'/'+id+'-'+lang);
    out.routes.push({width,id,originalNavLabel:label,language:lang,visual:shot,pass:true});
   }
   await page.getByRole('button',{name:'English',exact:true}).click();
  }
  for(const [route,expectedFields,id] of forms){
   const group=route==='Adjustment of Tax Refund'?'direct':'source';
   await openNav(page,route,group,width);
   const add=route==='Source Tax (LTU)'?'Add Source Tax':'Add Entry';
   await page.getByRole('button',{name:add,exact:true}).click();
   const dialog=page.getByRole('dialog');
   await dialog.waitFor();
   const inputs=dialog.locator('input,select,textarea');
   const fieldCount=await inputs.count();
   const fields=await inputs.evaluateAll(nodes=>nodes.map(x=>({
    tag:x.tagName.toLowerCase(),type:x.getAttribute('type'),name:x.getAttribute('aria-label'),
    parentLabel:x.closest('label')?.textContent?.trim().slice(0,120)
   })));
   assert.equal(fieldCount,expectedFields,
     route+': source field inventory expected '+expectedFields+' controls, got '+fieldCount);
   await checkOverflow(page);
   const shot=await screenshot(page,String(width)+'/form-'+id+'-en');
   out.forms.push({width,route,expectedFields,fieldCount,fields,visual:shot,pass:true});
   await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
  }
  assert.equal(out.javascriptExceptions.filter(e=>e.width===width).length,0);
  await context.close();
 }
 // NEIR component parity on a synthetic, isolated read-only bank record.
 // This fixture never reaches production storage or claims official tax verification.
 for(const width of [390,1280]){
  const ctx=await browser.newContext({viewport:{width,height:width===390?844:900},
    isMobile:width===390,hasTouch:width===390,locale:'en-US'});
  const fixture={id:'neir-ui-test-01',taxpayerTin:'123456789012',assessmentYear:'2026-2027',
    category:'SOURCE_TAX',routeId:'bank-fi',referenceNo:'NEIR-UI-FIXTURE-001',
    sourceEntity:'Fixture Bank',sectionCode:'Sec 102',grossAmount:1000,taxDeducted:100,
    date:'2026-05-10',status:'PENDING_VERIFICATION',workflow:'SYNC_FROM_INCOME',
    isManual:false,externalVerified:false,createdAt:'2026-06-01T00:00:00.000Z',
    updatedAt:'2026-06-01T00:00:00.000Z'};
  await ctx.addInitScript(record=>{
    if(localStorage.getItem('nbr_eledger_entries_v1')==null)
      localStorage.setItem('nbr_eledger_entries_v1',JSON.stringify([record]));
  },fixture);
  const page=await ctx.newPage();page.setDefaultTimeout(12000);
  page.on('pageerror',e=>out.javascriptExceptions.push({width,error:String(e)}));
  await page.goto(SITE,{waitUntil:'networkidle'});
  await openNav(page,'Bank/FI Interest/Profit','source',width);
  const row=page.locator('tr.eledger-neir-record-row').filter({hasText:'Fixture Bank'});
  await row.waitFor({state:'visible'});
  await row.focus();await page.keyboard.press('Enter');
  const drawer=page.getByRole('dialog',{name:'Record Details'});
  await drawer.waitFor({state:'visible'});
  assert.match(await drawer.innerText(),/Fixture Bank/);
  assert.match(await drawer.innerText(),/NEIR-UI-FIXTURE-001/);
  assert.equal(await drawer.getAttribute('aria-modal'),'true');
  await checkOverflow(page);
  const shot=await screenshot(page,'neir/'+width+'-record-details');
  await page.keyboard.press('Escape');
  await drawer.waitFor({state:'detached'});
  assert.equal(await page.evaluate(()=>document.body.style.overflow),'');
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('nbr_eledger_entries_v1')));
  assert.equal(stored.length,1);
  assert.equal(stored[0].externalVerified,false);
  out.neir=out.neir??[];
  out.neir.push({width,screenshot:shot,keyboardOpen:true,escapeClose:true,recordUnchanged:true});
  await ctx.close();
 }
 assert.equal(out.neir.length,2);
 assert.equal(out.dashboard.length,8);
 assert.equal(out.ibas.length,8);
 assert.equal(out.routes.length,72);
 assert.equal(out.forms.length,10);
 out.pass=true;
 console.log('VISUAL_EVIDENCE PASS '+out.dashboard.length+' dashboard captures, '+out.ibas.length+' iBAS EN/BN captures, '+out.routes.length+' route captures, '+out.forms.length+' form captures, 0 JS errors');
}catch(e){console.error('VISUAL_EVIDENCE FAIL',e.stack||String(e));process.exitCode=1;}
finally{
 await writeFile(path.join(DEST,'manifest.json'),JSON.stringify(out,null,2));
 if(browser)await browser.close();
 if(preview)preview.kill('SIGTERM');
}

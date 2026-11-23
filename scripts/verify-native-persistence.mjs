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
 if(['Salary (Others)','Service Payment','Others','Source Tax (LTU)','Dividend'].includes(name)){
  const group=aside.getByRole('button',{name:'Claim Source Tax',exact:true});
  if(await aside.evaluate(el=>el.classList.contains('is-collapsed'))){
   await group.click();
   await page.getByRole('menu',{name:'Source Tax categories'}).getByRole('menuitem',{name,exact:true}).click();
   return;
  }
  if(await group.getAttribute('aria-expanded')==='false')await group.click();
 }
 await aside.getByRole('button',{name,exact:true}).click();
}
function editorFor(page,c,width,mode='add'){
 return page.getByRole('dialog',{name:mode==='edit'?'Edit Record':'Add Entry'});
}
async function moreAction(page,reference,action){
 await page.getByRole('button',{name:'More actions '+reference,exact:true}).click();
 await page.getByRole('menuitem',{name:action,exact:true}).click();
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
  await form.locator('input[type=file]').setInputFiles({
    name:'local-ltu-evidence.pdf',mimeType:'application/pdf',
    buffer:Buffer.from('%PDF-1.4\n% isolated browser-only fixture\n'),
  });
  assert.match(await form.locator('#eledger-ltu-file-note').innerText(),
    /Only the file name is stored locally/,'Do not imply attachment bytes are retained');
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
 const editing=(await form.getByRole('button',{name:'Save Changes',exact:true}).count())>0;
 const label=editing?'Save Changes':c.route==='Source Tax (LTU)'?'Submit':c.route==='Salary (Others)'?'Save claim':'Save';
 await form.getByRole('button',{name:label,exact:true}).click();
 try {
  await form.waitFor({state:'detached'}); } catch (error) {
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
 if(width===1280){
   // Old expanded preference is retained without preventing the new v2 default.
   await context.addInitScript(()=>localStorage.setItem('eledger_sidebar_collapsed_v1','false'));
 }
 const page=await context.newPage(); page.setDefaultTimeout(10000);
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 const response=await page.goto(SITE,{waitUntil:'networkidle'});
 assert.equal(response.status(),200);
 await page.getByRole('heading',{name:'Dashboard',exact:true}).waitFor();
 assert.deepEqual(await stored(page),[],'Native storage on first visit must have no invented credits');
 // Computed CSS acceptance for the exact compiled browser version, not a stylesheet guess.
 const system=await page.evaluate(()=>{
   const app=document.querySelector('.eledger-app');
   const primary=document.querySelector('main .eledger-button-primary');
   const footer=document.querySelector('.eledger-footer');
   const nav=document.querySelector('.eledger-mobile-bottom-nav button');
   const get=el=>el?getComputedStyle(el):null;
   return {
     font:get(app)?.fontFamily,
     primary:{fg:get(primary)?.color,bg:get(primary)?.backgroundColor},
     footer:{fg:get(footer)?.color,bg:get(footer)?.backgroundColor,size:parseFloat(get(footer)?.fontSize||'0')},
     navFont:parseFloat(get(nav)?.fontSize||'0'),
     footerNote:footer?.textContent||'',
   };
 });
 const ratio=(fg,bg)=>{
   const toRGB=c=>(c?.match(/[0-9.]+/g)||[]).slice(0,3).map(Number).map(v=>{
     const n=v/255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;
   });
   const lum=c=>{const [r,g,b]=toRGB(c);return .2126*r+.7152*g+.0722*b;};
   const a=lum(fg),b=lum(bg);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
 };
 assert.ok(system.font?.includes('Poppins'),'English typeface must follow approved Poppins stack');
 assert.ok(ratio(system.primary.fg,system.primary.bg)>=4.5,
   'Computed primary CTA text must meet AA: '+JSON.stringify(system.primary));
 assert.ok(ratio(system.footer.fg,system.footer.bg)>=4.5,
   'Computed footer contrast must meet AA: '+JSON.stringify(system.footer));
 assert.ok(system.footer.size>=12,'Footer supporting text must be at least 12px');
 assert.match(system.footerNote,/Standalone local ledger/,'Global financial provenance must be clear');
 if(width<600)assert.ok(system.navFont>=12,'Phone bottom tab labels must be at least 12px');
 if(width<600){
   const targets=await page.locator('aside.eledger-sidebar .eledger-side-link').evaluateAll(els=>
     els.slice(0,20).map(el=>parseFloat(getComputedStyle(el).minHeight)));
   assert.ok(targets.every(x=>x>=44),'Mobile drawer link targets must be at least 44px');
 }
 await page.getByRole('button',{name:'বাংলা',exact:true}).click();
 await page.locator('.eledger-app[lang="bn"]').waitFor();
 assert.ok((await page.locator('.eledger-app').evaluate(el=>getComputedStyle(el).fontFamily))
   .includes('Noto Sans Bengali Variable'),'Bengali must use the bundled variable font');
 await page.getByRole('button',{name:'English',exact:true}).click();
 report.push({width,check:'computed AA primary/footer contrast, EN/BN font contract and mobile label sizes',pass:true});
 if(width>=961){
   const nav=page.locator('aside.eledger-sidebar');
   assert.equal(await nav.evaluate(el=>el.classList.contains('is-collapsed')),true,
     'New and returning desktop visitors must see the compact sidebar by default');
   await page.waitForFunction(() =>
     Math.abs((document.querySelector('aside.eledger-sidebar')?.getBoundingClientRect().width??0)-80)<2);
   assert.equal(await page.evaluate(()=>localStorage.getItem('eledger_sidebar_collapsed_v2')),'true');
   const headerToggle=page.locator('.eledger-header-nav-toggle');
   assert.equal(await nav.locator('.eledger-sidebar-collapse-button').count(),0,
     'Navigation rail must not own a second collapse button');
   await headerToggle.getByRole('button',{name:'Expand navigation',exact:true}).click();
   await page.waitForFunction(() =>
     Math.abs((document.querySelector('aside.eledger-sidebar')?.getBoundingClientRect().width??0)-260)<2);
   // The single approved eReturn Ledger logo belongs to the global header, not the sidebar.
   assert.ok(await page.locator('.eledger-header .eledger-brand').isVisible(),
     'Global eReturn Ledger brand remains visible on desktop');
   const expandedLogo=await page.locator('.eledger-brand').boundingBox();
   const expandedRail=await nav.boundingBox();
   assert.ok(expandedLogo&&expandedRail&&Math.abs(expandedLogo.width-expandedRail.width)<2,
     'Expanded masthead logo compartment aligns with sidebar');
   assert.ok(await nav.locator('.eledger-sidebar-section-label').isVisible(),
     'Expanded navigation shows its section heading');
   assert.equal(await nav.locator('.eledger-sidebar-brand').count(),0,
     'Expanded sidebar must not duplicate the global brand');
   const collapse=headerToggle.getByRole('button',{name:'Collapse navigation',exact:true});
   const toggleBefore=await collapse.boundingBox();
   const headerBefore=await page.locator('.eledger-header').boundingBox();
   const dashboardButton=await nav.getByRole('button',{name:'Dashboard',exact:true}).boundingBox();
   assert.ok(toggleBefore&&headerBefore&&dashboardButton&&
     toggleBefore.y>=headerBefore.y&&toggleBefore.y+toggleBefore.height<=headerBefore.y+headerBefore.height,
     'Navigation toggle belongs to the global header');
   assert.ok(dashboardButton.y>=headerBefore.y+headerBefore.height,
     'Sidebar begins with Dashboard directly underneath global header');
   assert.ok(dashboardButton.width>150, 'Expanded Dashboard item must use full sidebar width');
   await collapse.click();
   await page.waitForFunction(() =>
     Math.abs((document.querySelector('aside.eledger-sidebar')?.getBoundingClientRect().width??0)-80)<2,
     null,{timeout:3000});
   assert.equal(await nav.evaluate(el=>el.classList.contains('is-collapsed')),true);
   assert.equal(await page.evaluate(()=>localStorage.getItem('eledger_sidebar_collapsed_v2')),'true');
   const expand=headerToggle.getByRole('button',{name:'Expand navigation',exact:true});
   const toggleBox=await expand.boundingBox();
   const headerAfter=await page.locator('.eledger-header').boundingBox();
   assert.ok(toggleBox&&headerAfter&&
     toggleBox.y>=headerAfter.y&&toggleBox.y+toggleBox.height<=headerAfter.y+headerAfter.height,
     'Collapsed navigation toggle stays within the global masthead');
   assert.ok(toggleBox.width>=44&&toggleBox.height>=44,
     'Header expand button must meet 44x44 accessible target');
   assert.equal(await nav.locator('.eledger-sidebar-brand').count(),0,
     'Collapsed sidebar must not duplicate the global brand');
   assert.equal(await nav.locator('.eledger-nav-top-row').count(),0,
     'No duplicate Dashboard row or wasted sidebar space');
   const compactLogo=await page.locator('.eledger-brand').boundingBox();
   const compactRail=await nav.boundingBox();
   assert.ok(compactLogo&&compactRail&&Math.abs(compactLogo.width-80)<2&&Math.abs(compactLogo.width-compactRail.width)<2,
     'Compact 80px logo area and navigation rail align');
   assert.equal(await page.locator('.eledger-brand-words').isVisible(),false,
     'Icon-only rail hides topbar wordmark but not logo');
   for(const [name,icon] of [['Home / Guide','lucide-book-open'],
     ['Environmental Surcharge','lucide-leaf'],
     ['Adjustment of Tax Refund','lucide-rotate-ccw'],
     ['Adjustment of carry forward tax u/s 163','lucide-history']]){
     const b=nav.getByRole('button',{name,exact:true});
     assert.equal(await b.getAttribute('title'),name);
     assert.equal(await b.locator('svg.'+icon).count(),1,'Distinct compact icon for '+name);
   }
   const support=nav.getByRole('link',{name:'Taxes Helpline · 09643717171'});
   assert.ok(await support.isVisible(),'Compact rail must keep telephone help available');
   const helpBox=await support.boundingBox();
   assert.ok(helpBox&&helpBox.height>=44&&helpBox.width>=44,'Help shortcut must be >=44px');

   // Source Tax compact flyout: every route accessible without widening sidebar.
   const sourceGroup=nav.getByRole('button',{name:'Claim Source Tax',exact:true});
   await sourceGroup.click();
   const sourceMenu=page.getByRole('menu',{name:'Source Tax categories'});
   await sourceMenu.waitFor({state:'visible'});
   assert.equal(await sourceGroup.getAttribute('aria-expanded'),'true');
   assert.equal(await sourceMenu.getByRole('menuitem').count(),10,
     'Compact Source Tax must expose all ten destinations');
   assert.ok(Math.abs((await nav.boundingBox()).width-80)<2,
     'Opening a flyout must NOT expand the compact sidebar');
   const first=sourceMenu.getByRole('menuitem').first();
   assert.ok(await first.evaluate(el=>el===document.activeElement),
     'Flyout keyboard focus must be placed on the first route');
   await page.keyboard.press('End');
   assert.ok(await sourceMenu.getByRole('menuitem').last().evaluate(el=>el===document.activeElement),
     'Flyout End must reach its last route');
   await page.keyboard.press('Escape');
   await sourceMenu.waitFor({state:'detached'});
   assert.ok(await sourceGroup.evaluate(el=>el===document.activeElement),
     'Escape returns focus to the compact group button');

   await sourceGroup.click();
   await page.getByRole('menu',{name:'Source Tax categories'})
     .getByRole('menuitem',{name:'Salary (Others)',exact:true}).click();
   await page.getByRole('heading',{name:'Salary (Others)',exact:true}).waitFor();
   assert.equal(await sourceGroup.getAttribute('aria-current'),'true',
     'Selected Source Tax child must highlight its compact parent');
   assert.ok((await sourceGroup.getAttribute('class')).includes('is-active-parent'));
   assert.equal(await page.getByRole('menu').count(),0,'Navigation closes the flyout');
   await page.reload({waitUntil:'networkidle'});
   await page.getByRole('heading',{name:'Dashboard',exact:true}).waitFor();
   assert.equal(await nav.evaluate(el=>el.classList.contains('is-collapsed')),true,
     'Compact rail preference survives reload without changing existing route reset');
   await sourceGroup.click();
   await page.getByRole('menu',{name:'Source Tax categories'})
     .getByRole('menuitem',{name:'Salary (Others)',exact:true}).click();
   await page.getByRole('heading',{name:'Salary (Others)',exact:true}).waitFor();
   assert.equal(await sourceGroup.getAttribute('aria-current'),'true',
     'Reopening selected route must restore the active parent highlight');

   const aitGroup=nav.getByRole('button',{name:'Claim AIT',exact:true});
   await aitGroup.click();
   const aitMenu=page.getByRole('menu',{name:'AIT categories'});
   await aitMenu.waitFor();
   assert.equal(await aitMenu.getByRole('menuitem').count(),3,
     'Compact AIT must expose all three routes');
   await aitMenu.getByRole('menuitem',{name:'AIT on Car',exact:true}).click();
   await page.getByRole('heading',{name:'AIT on Car',exact:true}).waitFor();
   assert.equal(await aitGroup.getAttribute('aria-current'),'true',
     'AIT compact parent inherits active child state');
   assert.equal(await sourceGroup.getAttribute('aria-current'),null,
     'Previous group must no longer appear selected');

   await page.getByRole('button',{name:'বাংলা',exact:true}).click();
   await page.locator('.eledger-app[lang="bn"]').waitFor();
   const bnGroup=nav.getByRole('button',{name:'অগ্রিম কর দাবি',exact:true});
   await bnGroup.click();
   const bnMenu=page.getByRole('menu',{name:'অগ্রিম করের খাতসমূহ'});
   assert.equal(await bnMenu.getByRole('menuitem').count(),3);
   assert.ok(await bnMenu.getByRole('menuitem',{name:'ব্যক্তিগত গাড়ির অগ্রিম কর'}).isVisible());
   await page.keyboard.press('Escape');
   await bnMenu.waitFor({state:'detached'});
   await page.getByRole('button',{name:'English',exact:true}).click();
   await expand.click();
   await page.waitForFunction(() =>
     Math.abs((document.querySelector('aside.eledger-sidebar')?.getBoundingClientRect().width??0)-260)<2,
     null,{timeout:3000});
   assert.equal(await page.evaluate(()=>localStorage.getItem('eledger_sidebar_collapsed_v2')),'false');
   assert.ok(await nav.getByRole('button',{name:'AIT on Car',exact:true}).isVisible(),
     'Expanded original accordion must still show selected AIT route');
   await page.reload({waitUntil:'networkidle'});
   assert.equal(await nav.evaluate(el=>el.classList.contains('is-collapsed')),false,
     'Explicitly expanded desktop layout must persist after reload');
   // Restore neutral Dashboard so the existing CRUD regression suite is independent.
   await nav.getByRole('button',{name:'Dashboard',exact:true}).click();
   await page.getByRole('heading',{name:'Dashboard',exact:true}).waitFor();
   report.push({width,check:'logo-row 44px controls; all 13 compact flyout routes; keyboard; EN/BN; active parent; Help; refresh; expanded regression',pass:true});
 }
 if(width<600){
   const tabs=page.locator('nav.eledger-mobile-bottom-nav');
   assert.ok(await tabs.isVisible(),'Phone bottom navigation must be visible');
   assert.equal(await tabs.locator('button').count(),4,'Exactly four mobile destinations, no duplicate Status tab');
   assert.ok(await page.locator('.eledger-header .eledger-brand').isVisible(),
     'Global eReturn Ledger logo visible on phone');
   assert.equal(await page.getByRole('button',{name:'Tax Payment Status',exact:true}).count(),1,
     'One dashboard status entry point on phone');
   await page.getByRole('button',{name:'Tax Payment Status',exact:true}).click();
   const statusDialog=page.getByRole('dialog',{name:'Tax Payment Status',exact:true});
   await statusDialog.waitFor({state:'visible'});
   assert.ok(await statusDialog.getByText('Payment breakdown',{exact:true}).isVisible());
   assert.ok(await statusDialog.getByText('Particulars',{exact:true}).isVisible());
   assert.ok(await statusDialog.getByText('Amount',{exact:true}).isVisible());
   await statusDialog.getByRole('button',{name:'Close Tax Payment Status'}).click();
   await statusDialog.waitFor({state:'detached'});
   await tabs.getByRole('button',{name:'Source Tax',exact:true}).click();
   assert.equal(await tabs.getByRole('button',{name:'Source Tax',exact:true}).getAttribute('aria-current'),'page',
     'Mobile Source Tax destination must update the active navigation state');
   await page.locator('main.eledger-main').waitFor({state:'visible'});
   await tabs.getByRole('button',{name:'Home',exact:true}).click();
   await page.getByRole('heading',{name:'Dashboard',exact:true}).waitFor();
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
   assert.ok(overflow<=2,'Mobile page must not overflow viewport: '+overflow);
   report.push({width,check:'four quick tabs, single accessible status modal on phone',pass:true});
 }
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
  assert.equal(await form.getAttribute('aria-modal'),'true',
    'Every Add must open an accessible modal at desktop and phone widths');
  assert.equal(await page.locator('tr.eledger-source-inline-editor').count(),0,
    'No desktop inline Add rows permitted');
  await fill(form,c); await save(form,c);
  const saved=(await stored(page)).find(row=>row.referenceNo===c.ref);
  assert.ok(saved,'Native saved row missing '+c.ref);
  assert.equal(saved.taxDeducted,250);assert.equal(saved.status,'PENDING_VERIFICATION');
  assert.equal(saved.externalVerified,false);
  const date=saved.date;
  report.push({width,category:c.route,check:'Add writes pending native record',pass:true});
  // Regression: year-only table filters must be clearable even when search is empty.
  // Use an actual saved record, not a synthetic empty-state assertion.
  const rowFilter=page.getByRole('combobox',{name:'Filter by year',exact:true});
  const rowReset=page.locator('.eledger-table-controls').getByRole('button',{name:'Reset',exact:true});
  assert.equal(await rowReset.isDisabled(),true,'Untouched '+c.route+' Reset must stay inactive');
  await rowFilter.selectOption('2026');
  assert.equal(await rowReset.isEnabled(),true,'Year-only filter must enable Reset in '+c.route);
  await rowReset.click();
  assert.equal(await rowFilter.inputValue(),'all','Reset must restore All years in '+c.route);
  report.push({width,category:c.route,check:'year-only filter Reset clears year without search text',pass:true});
  if(c.route==='Source Tax (LTU)'){
    const localClaim=(await stored(page)).find(row=>row.referenceNo===c.ref);
    assert.equal(localClaim?.claimEvidence?.attachmentFileName,'local-ltu-evidence.pdf',
      'Only the selected filename should be recorded, never document bytes');
    report.push({width,category:c.route,check:'local filename retained and true upload disclaimer',pass:true});
  }

  await page.reload({waitUntil:'networkidle'});
  await openRoute(page,c.route,width);
  await page.locator('table tbody tr').filter({hasText:c.ref}).waitFor({state:'visible'});
  assert.equal((await stored(page)).find(row=>row.id===saved.id)?.referenceNo,c.ref);
  report.push({width,category:c.route,check:'real browser reload preserves Add',pass:true});

  // A populated row has exactly View + More, never directly exposed Edit/Delete.
  const row=page.locator('table tbody tr').filter({hasText:c.ref});
  assert.equal(await row.getByRole('button').count(),2,'Row action surface must have View and More only');
  assert.equal(await row.getByRole('button',{name:'Edit',exact:true}).count(),0);
  assert.equal(await row.getByRole('button',{name:'Delete',exact:true}).count(),0);
  if(c.route==='Salary (Others)'){
    // The portalled More menu may stay open after keyboard focus leaves it.
    // Its Arrow/Home/End handler must not steal native year-filter keys.
    const moreTrigger=row.getByRole('button',{name:'More actions '+c.ref,exact:true});
    await moreTrigger.click();
    const actions=page.getByRole('menu',{name:'More actions for: '+c.ref});
    await actions.waitFor({state:'visible'});
    await page.keyboard.press('End');
    assert.ok(await actions.getByRole('menuitem').last().evaluate(
      node=>node===document.activeElement),
      'End must still navigate within an active More menu');
    const yearFilter=page.getByRole('combobox',{name:'Filter by year',exact:true});
    await yearFilter.focus();
    await page.keyboard.press('ArrowDown');
    assert.ok(await yearFilter.evaluate(node=>node===document.activeElement),
      'An open More menu must never steal ArrowDown from the focused year filter');
    await yearFilter.selectOption('all');
    await moreTrigger.click();
    await actions.waitFor({state:'detached'});
    report.push({width,category:c.route,
      check:'More keyboard End stays inside menu; ArrowDown respects focused filter',pass:true});
  }
  await moreAction(page,c.ref,'Edit');
  const cancelEditor=editorFor(page,c,width,'edit');
  await cancelEditor.waitFor({state:'visible'});
  await cancelEditor.getByRole('spinbutton',{name:c.claim,exact:true}).fill('110');
  await cancelEditor.getByRole('button',{name:'Cancel',exact:true}).click();
  await page.reload({waitUntil:'networkidle'});
  await openRoute(page,c.route,width);
  assert.equal((await stored(page)).find(row=>row.id===saved.id)?.taxDeducted,250);
  report.push({width,category:c.route,check:'More/Edit drawer Cancel preserves amount after reload',pass:true});

  await moreAction(page,c.ref,'Edit');
  const edit=editorFor(page,c,width,'edit');
  await edit.waitFor({state:'visible'});
  await edit.getByRole('spinbutton',{name:c.claim,exact:true}).fill('300');
  await save(edit,c);
  await page.reload({waitUntil:'networkidle'});
  await openRoute(page,c.route,width);
  const updated=(await stored(page)).find(row=>row.id===saved.id);
  assert.ok(updated);assert.equal(updated.taxDeducted,300);assert.equal(updated.date,date);
  assert.equal(updated.createdAt,saved.createdAt);
  report.push({width,category:c.route,check:'More/Edit drawer Save persists original reference and date',pass:true});

  page.once('dialog',d=>d.dismiss());
  await moreAction(page,c.ref,'Delete');
  await page.reload({waitUntil:'networkidle'});
  await openRoute(page,c.route,width);
  assert.ok((await stored(page)).some(row=>row.id===saved.id));
  report.push({width,category:c.route,check:'dismissed More/Delete preserves row after reload',pass:true});

  page.once('dialog',d=>d.accept());
  await moreAction(page,c.ref,'Delete');
  await page.locator('table tbody tr').filter({hasText:c.ref}).waitFor({state:'detached'});
  await page.reload({waitUntil:'networkidle'});
  assert.ok(!(await stored(page)).some(row=>row.id===saved.id));
  report.push({width,category:c.route,check:'confirmed Delete persists after reload',pass:true});
 }
 // Prototype-v2 surcharge: two rows in ONE modal, not editable table cells.
 await openRoute(page,'Environmental Surcharge',width);
 await page.getByRole('button',{name:'Add Entry',exact:true}).click();
 const surchargeModal=page.getByRole('dialog',{name:'Add Entry'});
 await surchargeModal.waitFor();
 await surchargeModal.getByRole('button',{name:'Add another transaction'}).click();
 const batch=[['E2E-SUR-101','E2E-MOTOR-01','250'],['E2E-SUR-102','E2E-MOTOR-02','350']];
 for(let i=0;i<2;i++){
  const item=surchargeModal.locator('.eledger-surcharge-batch-item').nth(i);
  await item.getByRole('textbox',{name:'Motor Vehicle Registration No'}).fill(batch[i][1]);
  await item.getByRole('textbox',{name:'Transaction ID'}).fill(batch[i][0]);
  await item.getByRole('combobox',{name:'Bank Name'}).selectOption('AB Bank PLC');
  await item.getByRole('textbox',{name:'Branch Name'}).fill('Local Branch');
  await item.locator('input[type=date]').fill('2026-05-14');
  await item.getByRole('spinbutton',{name:'Paid Amount'}).fill(batch[i][2]);
 }
 assert.equal(await page.locator('tr.eledger-surcharge-grid-row').count(),0);
 await surchargeModal.getByRole('button',{name:'Save all transactions'}).click();
 await surchargeModal.waitFor({state:'detached'});
 assert.equal((await stored(page)).filter(e=>e.referenceNo.startsWith('E2E-SUR-10')).length,2);
 await page.reload({waitUntil:'networkidle'});
 await openRoute(page,'Environmental Surcharge',width);
 // Surcharge shares the year-filter contract but uses its own table component.
 const surchargeYear=page.getByRole('combobox',{name:'Filter by year',exact:true});
 const surchargeReset=page.locator('.eledger-table-controls').getByRole('button',{name:'Reset',exact:true});
 assert.equal(await surchargeReset.isDisabled(),true,'Untouched Surcharge Reset remains inactive');
 await surchargeYear.selectOption('2026');
 assert.equal(await surchargeReset.isEnabled(),true,'Year-only Surcharge filter must enable Reset');
 await surchargeReset.click();
 assert.equal(await surchargeYear.inputValue(),'all','Reset clears Surcharge year');
 report.push({width,category:'Environmental Surcharge',check:'year-only filter Reset without search',pass:true});
 const surchargeRow=page.locator('table tbody tr').filter({hasText:'E2E-SUR-101'});
 assert.equal(await surchargeRow.getByRole('button').count(),2);
 await moreAction(page,'E2E-SUR-101','Edit');
 const surchargeEdit=page.getByRole('dialog',{name:'Edit Record'});
 await surchargeEdit.getByRole('spinbutton',{name:'Paid Amount'}).fill('275');
 await surchargeEdit.getByRole('button',{name:'Save Changes'}).click();
 await surchargeEdit.waitFor({state:'detached'});
 assert.equal((await stored(page)).find(e=>e.referenceNo==='E2E-SUR-101')?.taxDeducted,275);
 for(const [reference] of batch){
  page.once('dialog',dialog=>dialog.accept());
  await moreAction(page,reference,'Delete');
 }
 assert.equal((await stored(page)).filter(e=>e.referenceNo.startsWith('E2E-SUR-10')).length,0);
 report.push({width,category:'Environmental Surcharge',check:'two modal transactions, drawer Edit, confirmed More/Delete and reload',pass:true});
 await openRoute(page,'Salary (Others)',width);
 await page.getByRole('button',{name:'Add Entry',exact:true}).click();
 const form=editorFor(page,cases[0],width);
 await fill(form,{...cases[0],ref:'E2E-AY-ISOLATION'});await save(form,cases[0]);
 // A year-only filter must enable Reset even when search text is empty.
 // Previously Reset was incorrectly disabled on the search-query state alone.
 const salaryYearFilter=page.getByRole('combobox',{name:'Filter by year',exact:true});
 const salaryReset=page.locator('.eledger-salary-table').getByRole('button',{name:'Reset',exact:true});
 assert.equal(await salaryReset.isDisabled(),true,'Untouched Salary filter Reset remains disabled');
 await salaryYearFilter.selectOption('2026');
 assert.equal(await salaryReset.isEnabled(),true,'Year-only filter must enable Reset');
 await salaryReset.click();
 assert.equal(await salaryYearFilter.inputValue(),'all','Reset clears the active year filter');
 report.push({width,category:'Salary (Others)',check:'year-only filter enables Reset, restores All years',pass:true});
 await page.getByRole('combobox',{name:'Assessment Year'}).selectOption('2025-2026');
 await page.locator('table tbody tr').filter({hasText:'E2E-AY-ISOLATION'}).waitFor({state:'detached'});
 await page.getByRole('combobox',{name:'Assessment Year'}).selectOption('2026-2027');
 await page.locator('table tbody tr').filter({hasText:'E2E-AY-ISOLATION'}).waitFor({state:'visible'});
 report.push({width,check:'AY context isolation in actual UI',pass:true});
 if(width>=961){
   await page.getByRole('button',{name:'Add Entry',exact:true}).click();
   const editor=page.getByRole('dialog',{name:'Add Entry'});
   await editor.getByRole('textbox',{name:'Depositing Authority'}).fill('UNSAVED E2E DRAFT');
   assert.equal(await editor.getAttribute('aria-modal'),'true',
     'Dirty Add must remain modal and block unintended sidebar actions');
   assert.ok(await editor.evaluate(node=>node.contains(document.activeElement)),
     'Keyboard focus stays within Add modal');
   await editor.getByRole('button',{name:'Cancel',exact:true}).click();
   await editor.waitFor({state:'detached'});
   assert.ok(!(await stored(page)).some(e=>e.sourceEntity==='UNSAVED E2E DRAFT'),
     'Cancel discards unsaved modal edits without financial writes');
   await page.locator('aside.eledger-sidebar').getByRole('button',{name:'Dashboard',exact:true}).click();
   await page.getByRole('heading',{name:'Dashboard',exact:true}).waitFor();
   report.push({width,check:'modal focus protection, explicit Cancel/Discard and zero fabricated ledger writes',pass:true});
 }
 const nextPage=await context.newPage();await nextPage.goto(SITE,{waitUntil:'networkidle'});
 assert.deepEqual(await stored(nextPage),await stored(page));
 report.push({width,check:'native persistence shared with second tab',pass:true});
 assert.deepEqual(errors,[]);
 report.push({width,check:'zero uncaught JS errors',pass:true});
 await context.close();
}
async function conditionalLocalRows(browser,width){
 const ctx=await browser.newContext({viewport:{width,height:width<600?844:900},
   isMobile:width<600,hasTouch:width<600});
 const page=await ctx.newPage();page.setDefaultTimeout(10000);
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(SITE,{waitUntil:'networkidle'});
 const when='2026-05-14T12:00:00Z';
 const base={
   taxpayerTin:'123456789012', assessmentYear:'2026-2027',
   grossAmount:1000,taxDeducted:400,date:'2026-05-14',
   status:'PENDING_VERIFICATION',isManual:false,externalVerified:false,
   createdAt:when,updatedAt:when,
 };
 const synthetic=[
   {...base,id:'e2e-local-carry-163',category:'ADJUSTMENT',
     routeId:'carry-forward',referenceNo:'E2E-CARRY-163',
     sourceEntity:'Synthetic prior return evidence',sectionCode:'Sec 163',
     workflow:'SINGLE_CLAIM',remarks:'Local non-government fixture only'},
   {...base,id:'e2e-local-dividend-117',category:'SOURCE_TAX',
     routeId:'dividend',referenceNo:'E2E-DIVIDEND-117',
     sourceEntity:'Synthetic dividend issuer',sectionCode:'Sec 117',
     workflow:'SYNC_FROM_INCOME',grossAmount:1000,taxDeducted:175},
 ];
 await page.evaluate(([key,rows])=>localStorage.setItem(key,JSON.stringify(rows)),[STORE,synthetic]);
 await page.reload({waitUntil:'networkidle'});
 assert.equal((await stored(page)).length,2,'Synthetic fixture valid for local testing only');
 await openRoute(page,'Adjustment of carry forward tax u/s 163',width);
 const panel=page.locator('section.eledger-carryforward-source');
 await panel.getByText('Claimed (local; pending verification)').waitFor();
 assert.match(await panel.innerText(),/400/);
 assert.ok(await panel.getByRole('button',{name:'More actions E2E-CARRY-163',exact:true}).isVisible());
 page.once('dialog',d=>d.dismiss());
 await moreAction(page,'E2E-CARRY-163','Delete');
 assert.equal((await stored(page)).length,2,'Dismissed carry-forward deletion preserves source');
 page.once('dialog',d=>d.accept());
 await moreAction(page,'E2E-CARRY-163','Delete');
 await panel.getByRole('button',{name:'Claim',exact:true}).waitFor();
 assert.equal((await stored(page)).length,1);
 report.push({width,category:'Carry Forward 163',
   check:'populated local amount, cancellable Delete and true empty state',pass:true});
 await openRoute(page,'Dividend',width);
 const row=page.locator('.eledger-official-records tbody tr').filter({hasText:'E2E-DIVIDEND-117'});
 await row.waitFor({state:'visible'});
 assert.match(await row.innerText(),/175/);
 assert.equal(await row.getByRole('button').count(),2,'Dividend cell shows View and More only');
 page.once('dialog',d=>d.dismiss());
 await moreAction(page,'E2E-DIVIDEND-117','Delete');
 assert.equal((await stored(page)).length,1);
 page.once('dialog',d=>d.accept());
 await moreAction(page,'E2E-DIVIDEND-117','Delete');
 await row.waitFor({state:'detached'});
 assert.equal((await stored(page)).length,0);
 report.push({width,category:'Dividend',
   check:'populated read-only row Action, cancel/confirm local Delete, no external sync',pass:true});
 assert.deepEqual(errors,[],'Conditional local forms must have no uncaught JS errors');
 await ctx.close();
}
let proc,browser;
try{
 proc=await startPreview();browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 for(const width of [1280,390,320])await testViewport(browser,width);
 for(const width of [1280,390,320])await conditionalLocalRows(browser,width);
 console.log('NATIVE_BROWSER_ACCEPTANCE PASS '+report.length+'/'+report.length);
 console.log(JSON.stringify(report));
}catch(e){console.error('NATIVE_BROWSER_ACCEPTANCE FAIL',e.stack||String(e));process.exitCode=1;}
finally{if(browser)await browser.close();if(proc)proc.kill('SIGTERM');}

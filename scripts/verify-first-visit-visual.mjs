// First-visit regression and published-site acceptance. Read-only: never write ledger data.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as sleep} from 'node:timers/promises';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const target=process.env.ELEDGER_URL || 'http://127.0.0.1:4173/';
const dir='artifacts/eledger-first-visit';
const findings={url:target,commit:process.env.GITHUB_SHA||'local',capturedAt:new Date().toISOString(),cases:[],errors:[],pass:false};
let preview,browser;
async function screenshot(page,label){
  const p=dir+'/'+label+'.png';
  await page.screenshot({path:p,fullPage:false,animations:'disabled'});
  return p;
}
try{
  await mkdir(dir,{recursive:true});
  if(!process.env.ELEDGER_URL){
    preview=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4173','--strictPort'],{stdio:'ignore'});
    let ready=false;
    for(let i=0;i<80;i++){try{if((await fetch(target)).ok){ready=true;break;}}catch{}await sleep(200);}
    assert.ok(ready,'Local preview did not start');
  }
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  for(const width of [390,960,961,1280,1440,1920]){
    const context=await browser.newContext({viewport:{width,height:900},isMobile:width<600,hasTouch:width<600,locale:'en-US'});
    const page=await context.newPage();page.setDefaultTimeout(12000);
    page.on('pageerror',e=>findings.errors.push({width,error:String(e)}));
    const response=await page.goto(target,{waitUntil:'networkidle'});
    assert.equal(response?.status(),200,'Site HTTP status at '+width);
    await page.getByRole('heading',{name:'Dashboard',exact:true}).waitFor();
    const nav=page.locator('aside.eledger-sidebar');
    // One branded masthead and one labeled dashboard status action at every width.
    assert.ok(await page.locator('.eledger-header .eledger-brand').isVisible(), 'Header brand visible at '+width);
    assert.equal(await nav.locator('.eledger-sidebar-brand').count(), 0, 'Sidebar logo removed at '+width);
    assert.equal(await nav.locator('.eledger-sidebar-brand-row').count(), 0, 'Empty logo-row spacer removed at '+width);
    assert.equal(await nav.locator('.eledger-nav-top-row').count(), 0, 'Sidebar contains no second title/toggle row at '+width);
    assert.equal(await nav.locator('.eledger-sidebar-collapse-button').count(), 0, 'No collapse control inside navigation at '+width);
    if(width>=961){
      const dashboard=await nav.getByRole('button',{name:'Dashboard',exact:true}).boundingBox();
      const toggle=await page.locator('.eledger-header-nav-toggle').getByRole('button').boundingBox();
      const header=await page.locator('.eledger-header').boundingBox();
      assert.ok(dashboard&&toggle&&header, 'Navigation/header layout boxes available at '+width);
      const section=await nav.locator('.eledger-sidebar-section-label').boundingBox();
      assert.ok(section&&section.y-header.y-header.height<28,
        'Menu marker appears directly under masthead at '+width);
      assert.ok(dashboard.y>=section.y+section.height&&
        dashboard.y-section.y-section.height<26,
        'Dashboard follows the visible menu marker without an unused strip at '+width);
      assert.ok(toggle.y>=header.y&&toggle.y+toggle.height<=header.y+header.height,
        'Navigation toggle is inside the masthead at '+width);
      const grid=await page.locator('.eledger-dashboard-columns').boundingBox();
      const quick=await page.locator('.eledger-dashboard-quick-actions').boundingBox();
      const middle=await page.locator('.eledger-dashboard-middle').boundingBox();
      assert.ok(grid&&quick&&middle, 'Dashboard grid panels exist at '+width);
      if(width<=1550){
        const source=await page.locator('.eledger-category-source').boundingBox();
        assert.ok(source&&Math.abs(quick.x-source.x)<3&&Math.abs(quick.width-source.width)<3,
          'Quick Actions must stack directly under Source Tax at '+width);
        assert.ok(quick.y>=source.y+source.height-1&&quick.y-source.y-source.height<28,
          'No unused vertical gap between Source Tax and Quick Actions at '+width);
        assert.ok(Math.abs(source.y-middle.y)<3,
          'Source Tax and AIT stacks align at the top at '+width);
      }else{
        assert.ok(quick.x>=middle.x+middle.width-4,
          'Quick Actions occupies the third column at wide desktop '+width);
      }
    }
    assert.equal(await nav.locator('.eledger-status-link').count(), 0, 'Status removed from sidebar at '+width);
    assert.equal(await page.getByRole('button',{name:'Tax Payment Status',exact:true}).count(), 1, 'Single status action at '+width);
    assert.equal(await page.getByRole('button',{name:'Review payment status',exact:true}).count(), 0, 'No duplicate review CTA at '+width);
    const compact=width>=961;
    assert.equal(await nav.evaluate(el=>el.classList.contains('is-collapsed')),compact,'Compact breakpoint at '+width);
    if(compact){
      await page.waitForFunction(()=>Math.abs((document.querySelector('aside.eledger-sidebar')?.getBoundingClientRect().width||0)-80)<2);
      assert.equal(await page.evaluate(()=>localStorage.getItem('eledger_sidebar_collapsed_v2')),'true');
      const toggle=page.locator('.eledger-header-nav-toggle').getByRole('button',{name:'Expand navigation',exact:true});
      const rect=await toggle.boundingBox();
      assert.ok(rect&&rect.width>=44&&rect.height>=44,'Compact toggle target at '+width);
      assert.ok(await nav.getByRole('link',{name:/Taxes Helpline/}).isVisible());
    }else{
      const opener=page.locator('.eledger-header-nav-toggle').getByRole('button',{name:'Open ledger menu',exact:true});
      assert.ok(await opener.isVisible(),'Mobile menu control belongs to masthead at '+width);
      assert.equal(await page.locator('.eledger-mobile-nav').count(),0,'No secondary menu bar at '+width);
      await opener.click();
      await nav.waitFor({state:'visible'});
      await nav.getByRole('button',{name:'Dashboard',exact:true}).waitFor({state:'visible'});
      await page.keyboard.press('Escape');
      await nav.waitFor({state:'hidden'});
      assert.equal(await nav.evaluate(el=>el.classList.contains('is-open')),false,'Escape closes drawer at '+width);
    }
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'Horizontal overflow at '+width);
    findings.cases.push({width,stage:'first-load-en',compact,shot:await screenshot(page,width+'-first-en'),pass:true});
    if(compact){
      const source=nav.getByRole('button',{name:'Claim Source Tax',exact:true});
      await source.click();
      const menu=page.getByRole('menu',{name:'Source Tax categories'});
      await menu.waitFor({state:'visible'});
      assert.equal(await menu.getByRole('menuitem').count(),10);
      assert.equal(await nav.evaluate(el=>el.classList.contains('is-collapsed')),true);
      findings.cases.push({width,stage:'source-flyout',items:10,shot:await screenshot(page,width+'-source-flyout'),pass:true});
      if(await menu.count()===0){await source.click();await menu.waitFor({state:'visible'});}
      await menu.getByRole('menuitem',{name:'Salary (Others)',exact:true}).click();
      await page.getByRole('heading',{name:'Salary (Others)',exact:true}).waitFor();
      assert.equal(await source.getAttribute('aria-current'),'true');
      const ait=nav.getByRole('button',{name:'Claim AIT',exact:true});
      await ait.click();
      const aitMenu=page.getByRole('menu',{name:'AIT categories'});
      await aitMenu.waitFor({state:'visible'});
      assert.equal(await aitMenu.getByRole('menuitem').count(),3);
      assert.equal(await nav.evaluate(el=>el.classList.contains('is-collapsed')),true);
      await page.keyboard.press('Escape');
      await aitMenu.waitFor({state:'detached'});
    }
    await page.getByRole('button',{name:'বাংলা',exact:true}).click();
    await page.locator('.eledger-app[lang="bn"]').waitFor();
    findings.cases.push({width,stage:'bengali',shot:await screenshot(page,width+'-bn'),pass:true});
    if(compact){
      const bnAit=nav.getByRole('button',{name:'অগ্রিম কর দাবি',exact:true});
      await bnAit.click();
      const bnMenu=page.getByRole('menu',{name:'অগ্রিম করের খাতসমূহ'});
      await bnMenu.waitFor({state:'visible'});
      assert.equal(await bnMenu.getByRole('menuitem').count(),3);
      await page.keyboard.press('Escape');
      await bnMenu.waitFor({state:'detached'});
      await page.locator('.eledger-header-nav-toggle').getByRole('button',{name:'নেভিগেশন প্রসারিত করুন',exact:true}).click();
      await page.waitForFunction(()=>Math.abs((document.querySelector('aside.eledger-sidebar')?.getBoundingClientRect().width||0)-260)<2);
      await page.reload({waitUntil:'networkidle'});
      assert.equal(await nav.evaluate(el=>el.classList.contains('is-collapsed')),false,'Expanded preference after reload');
      if(width===1280){
        const mastheadTitle=page.locator('.eledger-agency strong');
        const rect=await mastheadTitle.boundingBox();
        assert.ok(rect&&rect.height<20,'Expanded 1280px NBR heading must remain on a single line');
        assert.equal(await mastheadTitle.evaluate(el=>getComputedStyle(el).whiteSpace),'nowrap');
      }
      findings.cases.push({width,stage:'expanded-preference',shot:await screenshot(page,width+'-expanded'),pass:true});
    }
    await context.close();
  }
  // Regression for the actual reported defect: header and left rail must
  // remain pinned when the central page scrolls. Check both desktop rail states
  // and the mobile header without changing any financial records.
  for(const width of [390,1280,1440,1920]){
    const context=await browser.newContext({viewport:{width,height:520},isMobile:width<600,hasTouch:width<600,locale:'en-US'});
    const page=await context.newPage();page.setDefaultTimeout(12000);
    page.on('pageerror',e=>findings.errors.push({width,stage:'scroll-pinning',error:String(e)}));
    await page.goto(target,{waitUntil:'networkidle'});
    await page.getByRole('heading',{name:'Dashboard',exact:true}).waitFor();
    await page.evaluate(()=>window.scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
    await page.waitForFunction(()=>window.scrollY>80);
    const header=page.locator('header.eledger-header');
    const masthead=await header.boundingBox();
    assert.ok(masthead&&Math.abs(masthead.y)<2,
      'Top header must stay fixed in viewport after full page scroll at '+width);
    assert.ok(await page.locator('.eledger-header-nav-toggle button').first().isVisible(),
      'Header navigation toggle remains available while scrolled at '+width);
    if(width>=961){
      const sidebar=page.locator('aside.eledger-sidebar');
      let rail=await sidebar.boundingBox();
      assert.ok(rail&&Math.abs(rail.y-masthead.height)<3&&Math.abs(rail.height-(520-masthead.height))<4,
        'Compact left navigation must remain directly below pinned header at '+width);
      await page.locator('.eledger-header-nav-toggle').getByRole('button',{name:'Expand navigation',exact:true}).click();
      await page.waitForFunction(()=>Math.abs((document.querySelector('aside.eledger-sidebar')?.getBoundingClientRect().width||0)-260)<2);
      rail=await sidebar.boundingBox();
      const expandedHeader=await header.boundingBox();
      assert.ok(rail&&expandedHeader&&Math.abs(rail.y-expandedHeader.height)<3,
        'Expanded left navigation stays pinned under header at '+width);
      const beforeScroll=await page.evaluate(()=>window.scrollY);
      await sidebar.locator('.eledger-sidebar-links').evaluate(el=>{el.scrollTop=el.scrollHeight;});
      assert.ok(Math.abs((await page.evaluate(()=>window.scrollY))-beforeScroll)<3,
        'Scrolling nested sidebar entries must not move main dashboard at '+width);
      assert.ok(await sidebar.getByRole('link',{name:/Taxes Helpline/}).isVisible(),
        'Pinned rail keeps helpline visible at '+width);
      await page.locator('.eledger-header-nav-toggle').getByRole('button',{name:'Collapse navigation',exact:true}).click();
      await page.waitForFunction(()=>Math.abs((document.querySelector('aside.eledger-sidebar')?.getBoundingClientRect().width||0)-80)<2);
      rail=await sidebar.boundingBox();
      assert.ok(rail&&Math.abs(rail.y-(await header.boundingBox()).height)<3,
        'Compact navigation remains anchored after toggle and scroll at '+width);
    }else{
      const menu=page.locator('.eledger-header-nav-toggle').getByRole('button',{name:'Open ledger menu',exact:true});
      await menu.click();
      await page.locator('aside.eledger-sidebar').waitFor({state:'visible'});
      await page.keyboard.press('Escape');
      await page.locator('aside.eledger-sidebar').waitFor({state:'hidden'});
      const after=await header.boundingBox();
      assert.ok(after&&Math.abs(after.y)<2,
        'Mobile masthead stays pinned after opening and closing menu at scroll position');
    }
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),
      'Pinned navigation does not introduce horizontal overflow at '+width);
    findings.cases.push({width,stage:'fixed-header-sidebar-while-scrolling',
      shot:await screenshot(page,width+'-fixed-nav-scrolled'),pass:true});
    await context.close();
  }
  // Isolated synthetic populated-ledger check: the layout must also be correct
  // when the user has nonzero claims, not just in a clean first-visit profile.
  for(const width of [1280,1440]){
    const ctx=await browser.newContext({viewport:{width,height:900},locale:'en-US'});
    await ctx.addInitScript(()=>{
      const base={taxpayerTin:'123456789012',assessmentYear:'2026-2027',
        referenceNo:'SYNTHETIC-DASHBOARD-UI',sourceEntity:'Local browser fixture',
        sectionCode:'Sec 86',grossAmount:100000,taxDeducted:85000,
        date:'2026-06-30',status:'PENDING_VERIFICATION',workflow:'SYSTEM_CLAIM',
        isManual:false,externalVerified:false,
        createdAt:'2026-06-30T00:00:00Z',updatedAt:'2026-06-30T00:00:00Z'};
      localStorage.setItem('nbr_eledger_entries_v1',JSON.stringify([
        {...base,id:'ui-source-fixture',category:'SOURCE_TAX',routeId:'salary-ibas'},
        {...base,id:'ui-ait-fixture',category:'AIT',routeId:'car-ait',taxDeducted:25000},
        {...base,id:'ui-payment-fixture',category:'PAYMENT',routeId:'sec-173',taxDeducted:40000},
      ]));
    });
    const page=await ctx.newPage();
    const response=await page.goto(target,{waitUntil:'networkidle'});
    assert.equal(response?.status(),200,'Populated fixture preview response '+width);
    await page.getByRole('heading',{name:'Dashboard',exact:true}).waitFor();
    await page.getByText('1,50,000',{exact:true}).first().waitFor();
    const dashboard=await page.locator('.eledger-dashboard-columns').boundingBox();
    const quick=await page.locator('.eledger-dashboard-quick-actions').boundingBox();
    const source=await page.locator('.eledger-category-source').boundingBox();
    assert.ok(dashboard&&quick&&source&&Math.abs(quick.x-source.x)<3&&Math.abs(quick.width-source.width)<3&&
      quick.y>=source.y+source.height-1&&quick.y-source.y-source.height<28,
      'Populated Source Tax and Quick Actions must form one contiguous column at '+width);
    assert.equal(await page.getByRole('button',{name:'Tax Payment Status',exact:true}).count(),1);
    findings.cases.push({width,stage:'populated-synthetic-dashboard',shot:await screenshot(page,width+'-populated'),pass:true});
    await ctx.close();
  }
  assert.deepEqual(findings.errors,[],'Uncaught JS errors');
  findings.pass=true;
  console.log('FIRST_VISIT_ACCEPTANCE PASS '+findings.cases.length+' cases / 6 baseline viewport widths + scrolling');
}catch(error){
  console.error('FIRST_VISIT_ACCEPTANCE FAIL',error.stack||String(error));
  process.exitCode=1;
}finally{
  await writeFile(dir+'/manifest.json',JSON.stringify(findings,null,2));
  await browser?.close();
  preview?.kill('SIGTERM');
}

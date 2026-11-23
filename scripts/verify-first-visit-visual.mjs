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
      assert.ok(dashboard.y-header.y-header.height<24, 'Dashboard begins directly under header at '+width);
      assert.ok(toggle.y>=header.y&&toggle.y+toggle.height<=header.y+header.height,
        'Navigation toggle is inside the masthead at '+width);
      const grid=await page.locator('.eledger-dashboard-columns').boundingBox();
      const quick=await page.locator('.eledger-dashboard-quick-actions').boundingBox();
      const middle=await page.locator('.eledger-dashboard-middle').boundingBox();
      assert.ok(grid&&quick&&middle, 'Dashboard grid panels exist at '+width);
      if(width<=1550){
        assert.ok(quick.width>=grid.width*0.92,
          'Quick Actions must span full dashboard width at intermediate desktop '+width);
        if(width>1100){
          const cards=await page.locator('.eledger-dashboard-action-list > button').all();
          const rects=await Promise.all(cards.map(card=>card.boundingBox()));
          assert.ok(rects.length===3&&rects.every(box=>box&&Math.abs(box.y-rects[0].y)<5),
            'Three Quick Actions tiles form one horizontal row at '+width);
        }
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
      await page.waitForFunction(()=>Math.abs((document.querySelector('aside.eledger-sidebar')?.getBoundingClientRect().width||0)-104)<2);
      assert.equal(await page.evaluate(()=>localStorage.getItem('eledger_sidebar_collapsed_v2')),'true');
      const toggle=page.locator('.eledger-header-nav-toggle').getByRole('button',{name:'Expand navigation',exact:true});
      const rect=await toggle.boundingBox();
      assert.ok(rect&&rect.width>=44&&rect.height>=44,'Compact toggle target at '+width);
      assert.ok(await nav.getByRole('link',{name:/Taxes Helpline/}).isVisible());
    }else{
      await page.locator('.eledger-mobile-nav').waitFor({state:'visible'});
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
      findings.cases.push({width,stage:'expanded-preference',pass:true});
    }
    await context.close();
  }
  assert.deepEqual(findings.errors,[],'Uncaught JS errors');
  findings.pass=true;
  console.log('FIRST_VISIT_ACCEPTANCE PASS '+findings.cases.length+' cases / 5 viewport widths');
}catch(error){
  console.error('FIRST_VISIT_ACCEPTANCE FAIL',error.stack||String(error));
  process.exitCode=1;
}finally{
  await writeFile(dir+'/manifest.json',JSON.stringify(findings,null,2));
  await browser?.close();
  preview?.kill('SIGTERM');
}

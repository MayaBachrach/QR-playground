"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
async function run(browser, baseURL, outputDir) {
  const context = await browser.newContext({viewport:{width:1280,height:900}, permissions:["clipboard-read","clipboard-write"], acceptDownloads:true});
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(baseURL);
  await page.evaluate(() => document.fonts.ready);
  const focus = () => page.evaluate(() => document.activeElement.id || document.activeElement.dataset.command);
  const cells = () => page.evaluate(() => Array.from(cells));
  const ready = () => page.waitForFunction(() => !busy);
  const original = await cells();

  // Normal paste/submit entry; edit keys must remain ordinary text-input keys.
  await page.locator("#data").focus();
  await page.evaluate(() => navigator.clipboard.writeText("https://example.com"));
  await page.keyboard.press("Control+V");
  assert.equal(await page.locator("#data").inputValue(), "https://example.com");
  await page.keyboard.press("End");
  await page.keyboard.type("/frps123");
  assert.deepEqual(await cells(), original);
  await page.locator("#data").fill("https://example.com");
  await page.keyboard.press("Enter");
  assert.equal(await focus(), "qr");

  // Navigation changes only markers, never the full SVG or module nodes.
  await page.evaluate(() => window.beforeSVG = document.querySelector("#qr svg"));
  const start = await page.locator("#position").innerText();
  await page.keyboard.press("ArrowRight");
  assert.notEqual(await page.locator("#position").innerText(), start);
  assert(await page.evaluate(() => window.beforeSVG === document.querySelector("#qr svg")));
  await page.keyboard.press("Space"); await ready();
  assert.notDeepEqual(await cells(), original);
  assert(await page.evaluate(() => verifies()));

  // Failed decoder validation restores edits and keeps any valid selection.
  const edited = await cells();
  await page.evaluate(() => { window.realDecode=QREngine.decode; QREngine.decode=()=>null; });
  await page.keyboard.press("Space"); await ready();
  assert.deepEqual(await cells(), edited);
  await page.evaluate(() => QREngine.decode=window.realDecode);

  // Protected module at the top-left cannot change.
  await page.keyboard.press("r");
  for(let i=0;i<40;i++) await page.keyboard.press("ArrowLeft");
  for(let i=0;i<40;i++) await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Space"); await ready();
  assert.deepEqual(await cells(), original);
  assert.match(await page.locator("#cell-state").innerText(), /מוגנת/);
  await page.keyboard.press("Delete");
  assert.deepEqual(await cells(), original);
  assert.equal(await page.locator("#erase").getAttribute("aria-disabled"),"true");

  // Menu entry, search and movement while asynchronous work is running.
  await page.keyboard.press("Tab"); assert.equal(await focus(),"KeyF");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Escape"); assert.equal(await focus(),"qr");
  await page.keyboard.press("ArrowRight");
  await ready();
  assert.equal(await page.locator('.region-choice[aria-disabled="false"]').count(),3);
  await page.keyboard.press("Tab");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowLeft"); assert.equal(await focus(),"Digit2");
  await page.keyboard.press("Enter"); assert.equal(await focus(),"qr");
  assert.equal(await page.locator("#erase").getAttribute("aria-disabled"),"false");
  assert.match(await page.locator("#cell-state").innerText(),/Del/);
  const beforeDelete=await cells();
  await page.keyboard.press("Delete"); await ready();
  assert.notDeepEqual(await cells(),beforeDelete);
  assert(await page.evaluate(() => verifies()));
  assert.equal(await page.locator("#erase").getAttribute("aria-disabled"),"true");
  await page.keyboard.press("r"); assert.deepEqual(await cells(),original);

  // Worker load failure is recoverable and retains region results and selection.
  await page.keyboard.press("f"); await ready(); await page.keyboard.press("1");
  const selected = await page.evaluate(() => JSON.stringify({regions,selectedRegion}));
  await page.route("**/search-worker.js",route=>route.abort());
  await page.keyboard.press("f"); await ready();
  assert.match(await page.locator("#status").innerText(),/נכשל/);
  assert.deepEqual(await cells(),original);
  assert.equal(await page.evaluate(() => JSON.stringify({regions,selectedRegion})),selected);
  await page.unroute("**/search-worker.js");
  await page.keyboard.press("f"); await ready();
  await page.keyboard.press("1");

  // Export through public keyboard controls with an active editor overlay.
  await fs.mkdir(outputDir,{recursive:true});
  for(const [key,ext] of [["p","png"],["s","svg"]]){
    const downloadEvent=page.waitForEvent("download");
    await page.keyboard.press(key);
    const download=await downloadEvent; await ready();
    await download.saveAs(path.join(outputDir,"qart."+ext));
    if(ext==="svg"){
      const svg=await fs.readFile(path.join(outputDir,"qart.svg"),"utf8");
      assert(!/data-cursor|stroke=|filter=/.test(svg));
    }
  }

  // Empty/oversized input must retain the previous QR and user's draft.
  await page.keyboard.press("Escape");
  await page.locator("#data").fill("");
  await page.keyboard.press("Enter");
  assert.equal(await focus(),"data"); assert.deepEqual(await cells(),original);
  await page.locator("#data").fill("x".repeat(6000));
  await page.keyboard.press("Enter");
  assert.equal((await page.locator("#data").inputValue()).length,6000);
  assert.deepEqual(await cells(),original);
  await page.keyboard.press("Escape"); assert.equal(await focus(),"qr");

  // Native Tab/Shift+Tab order; return from menu preserves cursor.
  const position=await page.locator("#position").innerText();
  await page.keyboard.press("Tab"); await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#position").innerText(),position);
  await page.keyboard.press("Shift+Tab"); assert.equal(await focus(),"data");
  await page.keyboard.press("Tab"); assert.equal(await focus(),"qr");

  // Layout, short screens and a 200%-equivalent CSS viewport.
  for(const [width,height] of [[1280,900],[390,700],[320,568],[1024,500],[640,450]]){
    await page.setViewportSize({width,height});
    await page.locator("#data").focus(); await page.keyboard.press("Enter");
    await page.keyboard.press("Tab");
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),width+" horizontal overflow");
    await page.keyboard.press("f"); await ready();
    await page.keyboard.press("1");
    assert.equal(await focus(),"qr");
    const box=await page.locator("#qr").boundingBox();
    assert(box.y>=0 && box.y+box.height<=height,width+" QR focus outside viewport");
    await page.screenshot({path:path.join(outputDir,"layout-"+width+"x"+height+".png"),fullPage:true});
  }
  assert.deepEqual(errors,[]);
  await context.close();
  console.log("Browser regressions passed: paste, focus, editing, protection, validation rollback, worker recovery, regions, deletion, reset, exports and five viewports.");
}
module.exports = run;
if(require.main===module){
  (async()=>{
    const {chromium}=require("playwright");
    const browser=await chromium.launch({headless:true});
    try { await run(browser,process.env.QART_URL||"http://127.0.0.1:8766",process.env.QART_OUTPUT||"test-output"); }
    finally { await browser.close(); }
  })().catch(error=>{console.error(error);process.exitCode=1;});
}

const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    // Capture and print console messages from the page
    page.on('console', msg => {
      console.log(`BROWSER CONSOLE [${msg.type()}]:`, msg.text());
    });
    
    page.on('pageerror', err => {
      console.error('BROWSER ERROR:', err.toString());
    });

    console.log('Navigating to localhost:3003 ...');
    await page.goto('http://localhost:3003', { waitUntil: 'networkidle0', timeout: 10000 }).catch(e => console.log('Goto timeout/error:', e.message));
    
    const bodyHTML = await page.evaluate(() => document.body.innerHTML);
    console.log('Body length:', bodyHTML.length);
    console.log('Body content (first 200 chars):', bodyHTML.substring(0, 200));
    
    await browser.close();
  } catch (err) {
    console.error('Puppeteer script failed:', err);
  }
})();
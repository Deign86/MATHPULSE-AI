const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

async function exportDiagrams() {
  const outputDir = path.join(__dirname, '..', 'docs', 'diagrams', 'activity_diagrams');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const htmlPath = 'file:///' + path.join(__dirname, '..', 'docs', 'activity-diagrams-viewer.html').replace(/\\/g, '/');
  console.log('Loading HTML from:', htmlPath);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(htmlPath, { waitUntil: 'networkidle0' });

  // Wait for all diagrams to render (check if SVG elements exist in containers)
  await page.waitForFunction(() => {
    const svgs = document.querySelectorAll('.diagram-container svg');
    return svgs.length === 9;
  }, { timeout: 30000 });

  console.log('All 9 diagrams rendered in DOM. Extracting SVGs and capturing PNGs...');

  const results = await page.evaluate(() => {
    const cards = document.querySelectorAll('.module-card');
    const data = [];
    cards.forEach(card => {
      const id = card.id.replace('card-', '');
      const title = card.querySelector('h2').innerText.replace('📌', '').trim();
      const svgEl = card.querySelector('.diagram-container svg');
      const svgText = svgEl ? new XMLSerializer().serializeToString(svgEl) : null;
      data.push({ id, title, svgText });
    });
    return data;
  });

  for (const item of results) {
    if (!item.svgText) continue;

    const safeName = item.id + '_' + item.title.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').slice(0, 50);
    const svgFile = path.join(outputDir, `${safeName}.svg`);
    fs.writeFileSync(svgFile, item.svgText, 'utf8');
    console.log(`Saved SVG: ${path.basename(svgFile)}`);

    // Capture screenshot of the card container
    const cardHandle = await page.$(`#card-${item.id} .diagram-container`);
    if (cardHandle) {
      const pngFile = path.join(outputDir, `${safeName}.png`);
      await cardHandle.screenshot({ path: pngFile });
      console.log(`Saved PNG: ${path.basename(pngFile)}`);
    }
  }

  await browser.close();
  console.log('Finished exporting all 9 diagrams to:', outputDir);
}

exportDiagrams().catch(err => {
  console.error('Export failed:', err);
  process.exit(1);
});

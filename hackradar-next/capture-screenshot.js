const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function captureScreenshot() {
  console.log('Starting screenshot capture...');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // Navigate to your Next.js app
  await page.goto('http://localhost:7843', {
    waitUntil: 'networkidle0',
    timeout: 30000
  });

  // Wait a bit for any animations
  await page.waitForTimeout(2000);

  // Create screenshots directory if it doesn't exist
  const screenshotsDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir);
  }

  // Generate timestamp for filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `hackradar-${timestamp}.png`;
  const filepath = path.join(screenshotsDir, filename);

  // Take screenshot
  await page.screenshot({ 
    path: filepath,
    fullPage: true 
  });

  console.log(`Screenshot saved to: ${filepath}`);

  await browser.close();
}

captureScreenshot().catch(console.error);
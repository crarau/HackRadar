const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Set viewport size
  await page.setViewport({ width: 1920, height: 1080 });
  
  // Navigate to the app
  await page.goto('http://localhost:8742', { waitUntil: 'networkidle2' });
  
  // Wait a bit for animations to complete
  await new Promise(r => setTimeout(r, 2000));
  
  // Take screenshot
  await page.screenshot({ 
    path: 'hackradar-live-screenshot.png',
    fullPage: true 
  });
  
  console.log('Screenshot saved as hackradar-live-screenshot.png');
  
  await browser.close();
})();
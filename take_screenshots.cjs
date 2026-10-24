const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const executablePath = fs.existsSync(CHROME_PATH) ? CHROME_PATH : EDGE_PATH;

const SCREENSHOT_DIR = path.resolve(__dirname, 'screenshots');
const ARTIFACT_DIR = 'C:\\Users\\eleva\\.gemini\\antigravity\\brain\\ec62c782-57b2-4172-8379-740152ba6e31';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function capture() {
  console.log('Launching browser with:', executablePath);
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1050 });

  console.log('Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise((r) => setTimeout(r, 2000));

  // 1. Live Network Dashboard
  const shot1 = path.join(SCREENSHOT_DIR, '01_live_network.png');
  await page.screenshot({ path: shot1, fullPage: false });
  console.log('Saved 01_live_network.png');

  // 2. Localization Tab
  const buttons = await page.$$('button');
  for (const b of buttons) {
    const text = await (await b.getProperty('textContent')).jsonValue();
    if (text.includes('Localization Analysis')) {
      await b.click();
      break;
    }
  }
  await new Promise((r) => setTimeout(r, 1200));
  const shot2 = path.join(SCREENSHOT_DIR, '02_localization_analysis.png');
  await page.screenshot({ path: shot2, fullPage: false });
  console.log('Saved 02_localization_analysis.png');

  // 3. Relays & Backup Tab
  for (const b of await page.$$('button')) {
    const text = await (await b.getProperty('textContent')).jsonValue();
    if (text.includes('Relays & Backup')) {
      await b.click();
      break;
    }
  }
  await new Promise((r) => setTimeout(r, 1200));
  const shot3 = path.join(SCREENSHOT_DIR, '03_relays_backup.png');
  await page.screenshot({ path: shot3, fullPage: false });
  console.log('Saved 03_relays_backup.png');

  // 4. Audit & History Tab
  for (const b of await page.$$('button')) {
    const text = await (await b.getProperty('textContent')).jsonValue();
    if (text.includes('Audit & History')) {
      await b.click();
      break;
    }
  }
  await new Promise((r) => setTimeout(r, 1200));
  const shot4 = path.join(SCREENSHOT_DIR, '04_audit_history.png');
  await page.screenshot({ path: shot4, fullPage: false });
  console.log('Saved 04_audit_history.png');

  // 5. Back to Live Network and open Fault Injection Modal
  for (const b of await page.$$('button')) {
    const text = await (await b.getProperty('textContent')).jsonValue();
    if (text.includes('Live Network')) {
      await b.click();
      break;
    }
  }
  await new Promise((r) => setTimeout(r, 1000));

  for (const b of await page.$$('button')) {
    const text = await (await b.getProperty('textContent')).jsonValue();
    if (text.includes('Inject Fault')) {
      await b.click();
      break;
    }
  }
  await new Promise((r) => setTimeout(r, 1000));
  const shot5 = path.join(SCREENSHOT_DIR, '05_fault_injection_modal.png');
  await page.screenshot({ path: shot5, fullPage: false });
  console.log('Saved 05_fault_injection_modal.png');

  await browser.close();

  // Copy all shots to ARTIFACT_DIR as well
  const files = ['01_live_network.png', '02_localization_analysis.png', '03_relays_backup.png', '04_audit_history.png', '05_fault_injection_modal.png'];
  for (const f of files) {
    const src = path.join(SCREENSHOT_DIR, f);
    const dest = path.join(ARTIFACT_DIR, f);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
    }
  }
  console.log('All screenshots captured and synchronized to artifacts directory!');
}

capture().catch((e) => {
  console.error('Error during screenshot capture:', e);
  process.exit(1);
});

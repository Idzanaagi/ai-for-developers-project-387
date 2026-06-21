import { spawn, exec } from 'node:child_process';
import { mkdir, access, writeFile } from 'node:fs/promises';
import { request } from 'node:http';
import lighthouse from 'lighthouse';
import { desktopConfig } from 'lighthouse';
import { launch } from 'chrome-launcher';

const PAGES = [
  { path: '/', name: 'calendar' },
  { path: '/admin', name: 'admin' },
];

const BASE = 'http://localhost:3000';
const OUTPUT_DIR = 'lighthouse-reports';
const THRESHOLDS = {
  performance: 0.9,
  accessibility: 0.9,
  'best-practices': 0.9,
  seo: 0.9,
};

const shouldOpen = process.argv.includes('--open');

function waitForServer(port, timeout = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    function ping() {
      const req = request(`http://localhost:${port}`, { method: 'HEAD' }, (res) => {
        resolve();
      });
      req.on('error', () => {
        if (Date.now() - start > timeout) {
          reject(new Error(`Server did not start within ${timeout}ms`));
        } else {
          setTimeout(ping, 500);
        }
      });
      req.end();
    }
    ping();
  });
}

async function runLighthouse(url) {
  let chrome;
  try {
    chrome = await launch({ chromeFlags: ['--headless'] });
  } catch (err) {
    throw new Error('Chrome not found. Install Chrome or Chromium to run Lighthouse.');
  }
  try {
    const result = await lighthouse(url, {
      port: chrome.port,
      output: 'html',
      logLevel: 'error',
      onlyCategories: Object.keys(THRESHOLDS),
    }, desktopConfig);
    return result;
  } finally {
    try {
      await chrome.kill();
    } catch {
      // chrome-launcher on Windows may fail to remove temp files — not critical
    }
  }
}

async function main() {
  const serverProcess = spawn('npx tsx src/server.ts', {
    stdio: 'ignore',
    shell: true,
  });

  try {
    console.log('Starting server...');
    await waitForServer(3000);
    console.log('Server is ready');

    await mkdir(OUTPUT_DIR, { recursive: true });

    let allPassed = true;

    for (const page of PAGES) {
      const url = `${BASE}${page.path}`;
      console.log(`\nAuditing ${url}...`);

      const result = await runLighthouse(url);
      const { categories } = result.lhr;

      const reportPath = `${OUTPUT_DIR}/${page.name}.html`;
      await writeFile(reportPath, result.report);
      console.log(`Report saved: ${reportPath}`);

      console.log('Scores:');
      let pagePassed = true;
      for (const [category, threshold] of Object.entries(THRESHOLDS)) {
        const score = categories[category]?.score ?? 0;
        const scorePct = Math.round(score * 100);
        const passed = score >= threshold;
        const status = passed ? '\u2713' : '\u2717';
        console.log(`  ${status} ${category}: ${scorePct} (threshold: ${Math.round(threshold * 100)})`);
        if (!passed) pagePassed = false;
      }

      if (!pagePassed) allPassed = false;
    }

    if (shouldOpen) {
      console.log('\nOpening reports...');
      for (const page of PAGES) {
        const reportPath = `${OUTPUT_DIR}/${page.name}.html`;
        try {
          await access(reportPath);
          exec(`start "" "${reportPath}"`);
        } catch { }
      }
    }

    console.log('\n--- Summary ---');
    if (allPassed) {
      console.log('All thresholds passed');
    } else {
      console.error('Some thresholds failed');
      process.exitCode = 1;
    }
  } finally {
    serverProcess.kill();
  }
}

main().catch((err) => {
  console.error('Lighthouse audit failed:', err);
  process.exitCode = 1;
});

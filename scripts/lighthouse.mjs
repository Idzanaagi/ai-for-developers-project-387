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

function generateIndex(results) {
  const labels = {
    performance: 'Performance',
    accessibility: 'Accessibility',
    'best-practices': 'Best Practices',
    seo: 'SEO',
  };

  const rows = results.map((r) => {
    const cells = Object.keys(THRESHOLDS).map((cat) => {
      const score = r.scores[cat];
      const color = score >= 90 ? '#0c6' : score >= 50 ? '#fa3' : '#e44';
      return `<td style="text-align:center;color:${color};font-weight:bold">${score}</td>`;
    }).join('');
    const displayName = r.name.charAt(0).toUpperCase() + r.name.slice(1);
    return `<tr><td><a href="${r.name}.html">${displayName}</a></td>${cells}</tr>`;
  }).join('');

  const headerCells = Object.values(labels).map((l) => `<th>${l}</th>`).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Lighthouse Reports</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;background:#0d1117;color:#c9d1d9}
h1{color:#f0f6fc}
table{width:100%;border-collapse:collapse;margin-top:20px}
th,td{padding:12px;border-bottom:1px solid #30363d;text-align:left}
th{background:#161b22;color:#8b949e;font-weight:600;text-transform:uppercase;font-size:12px}
a{color:#58a6ff;text-decoration:none}
a:hover{text-decoration:underline}
tr:hover{background:#161b22}
.footer{margin-top:40px;font-size:12px;color:#8b949e}
</style>
</head>
<body>
<h1>Lighthouse Reports</h1>
<table>
<thead><tr><th>Page</th>${headerCells}<th>Report</th></tr></thead>
<tbody>${rows}</tbody>
</table>
<div class="footer">Generated at ${new Date().toISOString().slice(0, 19).replace('T', ' ')}</div>
</body>
</html>`;

  return writeFile(`${OUTPUT_DIR}/index.html`, html);
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

    const results = [];
    let allPassed = true;

    for (const page of PAGES) {
      const url = `${BASE}${page.path}`;
      console.log(`\nAuditing ${url}...`);

      const result = await runLighthouse(url);
      const { categories, finalDisplayedUrl } = result.lhr;

      const reportPath = `${OUTPUT_DIR}/${page.name}.html`;
      await writeFile(reportPath, result.report);
      console.log(`Report saved: ${reportPath}`);

      const scores = {};
      console.log('Scores:');
      let pagePassed = true;
      for (const [category, threshold] of Object.entries(THRESHOLDS)) {
        const score = categories[category]?.score ?? 0;
        const scorePct = Math.round(score * 100);
        scores[category] = scorePct;
        const passed = score >= threshold;
        const status = passed ? '\u2713' : '\u2717';
        console.log(`  ${status} ${category}: ${scorePct} (threshold: ${Math.round(threshold * 100)})`);
        if (!passed) pagePassed = false;
      }

      results.push({ name: page.name, scores });
      if (!pagePassed) allPassed = false;
    }

    await generateIndex(results);

    if (shouldOpen) {
      console.log('\nOpening reports...');
      for (const page of PAGES) {
        const reportPath = `${OUTPUT_DIR}/${page.name}.html`;
        try {
          await access(reportPath);
          exec(`start "" "${reportPath}"`);
        } catch { }
      }
      try {
        exec(`start "" "${OUTPUT_DIR}/index.html"`);
      } catch { }
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

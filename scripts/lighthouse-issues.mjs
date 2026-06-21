import { execSync } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const OUTPUT_DIR = 'lighthouse-reports';
const LABEL = 'lighthouse';
const REPORTS_URL = 'https://idzanaagi.github.io/ai-for-developers-project-387';
const DRY_RUN = process.argv.includes('--dry-run');

async function getFailingAudits() {
  const files = await readdir(OUTPUT_DIR);
  const jsonFiles = files.filter(f => f.endsWith('.json'));
  const seen = new Set();
  const findings = [];

  for (const file of jsonFiles) {
    const pageName = file.replace('.json', '');
    const content = await readFile(join(OUTPUT_DIR, file), 'utf-8');
    const lhr = JSON.parse(content);

    for (const cat of Object.values(lhr.categories)) {
      for (const ref of cat.auditRefs) {
        const audit = lhr.audits[ref.id];
        if (!audit || audit.score == null || audit.score >= 1) continue;
        if (audit.scoreDisplayMode === 'notApplicable' || audit.scoreDisplayMode === 'manual') continue;

        const key = `${pageName}:${ref.id}`;
        if (seen.has(key)) continue;
        seen.add(key);

        findings.push({
          page: pageName,
          title: audit.title,
          description: (audit.description || '').replace(/\n/g, ' ').slice(0, 500),
          score: audit.score,
        });
      }
    }
  }

  return findings;
}

function getExistingIssues() {
  try {
    const output = execSync(
      `gh issue list --label ${LABEL} --state open --json title,number --limit 100`,
      { encoding: 'utf-8', maxBuffer: 1024 * 1024 }
    );
    return JSON.parse(output);
  } catch {
    return [];
  }
}

function makeIssueTitle(page, auditTitle) {
  const displayName = page.charAt(0).toUpperCase() + page.slice(1);
  return `[Lighthouse] ${displayName} — ${auditTitle}`;
}

async function main() {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) {
    console.error('GH_TOKEN or GITHUB_TOKEN not set');
    process.exitCode = 1;
    return;
  }

  let findings;
  try {
    findings = await getFailingAudits();
  } catch (err) {
    console.error('Failed to read Lighthouse reports:', err.message);
    process.exitCode = 1;
    return;
  }

  if (findings.length === 0) {
    console.log('No failing audits found — all clear!');
    return;
  }

  const existingIssues = getExistingIssues();
  console.log(`Found ${findings.length} failing audits, ${existingIssues.length} open lighthouse issues`);

  for (const finding of findings) {
    const title = makeIssueTitle(finding.page, finding.title);
    if (existingIssues.some(i => i.title === title)) continue;

    const route = finding.page === 'calendar' ? '' : finding.page;
    const body = [
      `**Page**: /${route}`,
      `**Score**: ${Math.round(finding.score * 100)} / 100`,
      '',
      finding.description,
      '',
      `[View report](${REPORTS_URL}/${finding.page}.html)`,
    ].join('\n');

    const cmd = `gh issue create --title ${JSON.stringify(title)} --label ${LABEL} --body ${JSON.stringify(body)}`;
    console.log(`\nCreating issue: ${title}`);
    if (DRY_RUN) {
      console.log(`  (dry-run) Would run: ${cmd}`);
    } else {
      try {
        const url = execSync(cmd, { encoding: 'utf-8' }).trim();
        console.log(`  Created: ${url}`);
      } catch (err) {
        console.error(`  Failed: ${err.message}`);
      }
    }
  }

  const currentFindingTitles = new Set(findings.map(f => makeIssueTitle(f.page, f.title)));
  for (const issue of existingIssues) {
    if (currentFindingTitles.has(issue.title)) continue;

    console.log(`\nIssue no longer relevant: #${issue.number} — ${issue.title}`);
    if (DRY_RUN) {
      console.log(`  (dry-run) Would close #${issue.number}`);
    } else {
      try {
        execSync(
          `gh issue close ${issue.number} --comment "This issue has been resolved in the latest Lighthouse audit"`,
          { encoding: 'utf-8' }
        );
        console.log(`  Closed #${issue.number}`);
      } catch (err) {
        console.error(`  Failed to close #${issue.number}: ${err.message}`);
      }
    }
  }

  if (DRY_RUN) {
    console.log('\nDry run complete. No changes made.');
  }
}

main().catch((err) => {
  console.error('lighthouse-issues failed:', err);
  process.exitCode = 1;
});

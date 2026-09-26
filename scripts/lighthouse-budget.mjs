import { readFileSync, writeFileSync } from 'node:fs';

export const REQUIRED_CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'];
export const MINIMUM_SCORE = 0.95;
export const OVERRIDE_LABEL = 'lighthouse-budget-override';

export function evaluateReport(report, profile) {
  const route = report.finalUrl ? new URL(report.finalUrl).pathname : '/';
  const failures = [];

  for (const category of REQUIRED_CATEGORIES) {
    const score = report.categories?.[category]?.score;
    if (typeof score !== 'number' || score < MINIMUM_SCORE) {
      failures.push({ route, profile, category, score: typeof score === 'number' ? score : null });
    }
  }

  return failures;
}

export function isOverrideAuthorized(labels, body) {
  const reasonMatch = body?.match(/^Lighthouse budget override:\s*(.+)$/im);
  return labels.includes(OVERRIDE_LABEL) && Boolean(reasonMatch?.[1]?.trim());
}

export function shouldFail(results, overrideAuthorized = false) {
  return (
    results.auditFailures.length > 0 || (results.budgetFailures.length > 0 && !overrideAuthorized)
  );
}

function summarize() {
  const results = { budgetFailures: [], auditFailures: [] };

  for (const [profile, outcome] of [
    ['mobile', process.env.MOBILE_OUTCOME],
    ['desktop', process.env.DESKTOP_OUTCOME],
  ]) {
    const path = `lighthouse-reports/${profile}.json`;
    if (outcome !== 'success') {
      results.auditFailures.push({
        profile,
        message: `step concluded with ${outcome ?? 'unknown outcome'}`,
      });
    }

    try {
      const report = JSON.parse(readFileSync(path, 'utf8'));
      results.budgetFailures.push(...evaluateReport(report, profile));
    } catch (error) {
      results.auditFailures.push({ profile, message: `could not read report (${error.message})` });
    }
  }

  writeFileSync('lighthouse-budget-results.json', `${JSON.stringify(results, null, 2)}\n`);
}

function enforce() {
  const results = JSON.parse(readFileSync('lighthouse-budget-results.json', 'utf8'));
  const overrideAuthorized = process.env.LIGHTHOUSE_OVERRIDE_AUTHORIZED === 'true';

  if (shouldFail(results, overrideAuthorized)) {
    console.error(
      'Lighthouse budget enforcement failed. See the PR comment for route and category details.',
    );
    process.exitCode = 1;
  }
}

const command = process.argv[2];
if (command === 'summarize') summarize();
else if (command === 'enforce') enforce();
else if (process.argv[1]?.endsWith('lighthouse-budget.mjs')) {
  console.error('Expected command: summarize or enforce');
  process.exitCode = 2;
}

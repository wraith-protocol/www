import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateReport,
  isOverrideAuthorized,
  REQUIRED_CATEGORIES,
  shouldFail,
} from './lighthouse-budget.mjs';

function report(scores) {
  return {
    finalUrl: 'https://example.test/products/',
    categories: Object.fromEntries(
      REQUIRED_CATEGORIES.map((category) => [category, { score: scores[category] ?? 0.95 }]),
    ),
  };
}

test('passes when every required category meets the budget', () => {
  const results = { budgetFailures: evaluateReport(report({}), 'mobile'), auditFailures: [] };

  assert.deepEqual(results.budgetFailures, []);
  assert.equal(shouldFail(results), false);
});

test('fails with the route and category below budget', () => {
  const failures = evaluateReport(report({ performance: 0.94 }), 'desktop');
  const results = { budgetFailures: failures, auditFailures: [] };

  assert.deepEqual(failures, [
    { route: '/products/', profile: 'desktop', category: 'performance', score: 0.94 },
  ]);
  assert.equal(shouldFail(results), true);
});

test('requires both the override label and a reason, and never overrides audit errors', () => {
  const results = { budgetFailures: [{ route: '/', category: 'seo' }], auditFailures: [] };

  assert.equal(
    isOverrideAuthorized(
      ['lighthouse-budget-override'],
      'Lighthouse budget override: vendor outage',
    ),
    true,
  );
  assert.equal(isOverrideAuthorized(['lighthouse-budget-override'], 'No reason'), false);
  assert.equal(shouldFail(results, true), false);
  assert.equal(
    shouldFail({ ...results, auditFailures: [{ profile: 'mobile', message: 'failed' }] }, true),
    true,
  );
});

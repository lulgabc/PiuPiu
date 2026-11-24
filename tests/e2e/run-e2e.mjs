#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './cdp.mjs';
import { TARGET_VIEWPORT_LIST, VIEWPORTS } from './assertions.mjs';
import { getSmokeTests } from './suites/smoke.mjs';
import { getTier1Tests } from './suites/tier1.mjs';
import { getTier2Tests } from './suites/tier2.mjs';
import { getTier3Tests } from './suites/tier3.mjs';
import { getTier4Tests } from './suites/tier4.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..', '..');

function parseArgs(argv) {
  const opts = {
    tier: 'all',
    smoke: false,
    list: false,
    filter: '',
    viewport: 'all',
    transport: 'pipe',
    headless: true,
    timeout: 20000,
    explicitTimeout: false,
    json: false,
    keepArtifacts: false,
  };

  for (const arg of argv) {
    if (arg === '--smoke') opts.smoke = true;
    else if (arg === '--list') opts.list = true;
    else if (arg === '--json') opts.json = true;
    else if (arg === '--keep-artifacts') opts.keepArtifacts = true;
    else if (arg.startsWith('--tier=')) opts.tier = arg.slice(7);
    else if (arg.startsWith('--filter=')) opts.filter = arg.slice(9);
    else if (arg.startsWith('--viewport=')) opts.viewport = arg.slice(11);
    else if (arg.startsWith('--transport=')) opts.transport = arg.slice(12);
    else if (arg.startsWith('--headless=')) opts.headless = arg.slice(11) !== 'false';
    else if (arg.startsWith('--timeout=')) {
      opts.timeout = Math.max(1000, Number(arg.slice(10)) || 20000);
      opts.explicitTimeout = true;
    }
    else if (arg === '--help' || arg === '-h') {
      console.log(`Usage: node tests/e2e/run-e2e.mjs [options]

Options:
  --tier=1|2|3|4|all        Run specified tier(s) (default: all)
  --smoke                   Run baseline-safe smoke suite
  --list                    List matching tests without launching Chrome
  --filter=<pattern>        Filter tests by id, feature, or title (substring or /regex/)
  --viewport=<id|all>       desktop|mobile|tablet_p|tablet_l|all (default: all)
  --transport=pipe|ws       CDP transport (default: pipe)
  --headless=true|false     Headless Chrome (default: true)
  --timeout=<ms>            Per-test timeout in ms (default: 20000)
  --json                    Output JSON report to stdout
  --keep-artifacts          Preserve failure artifacts under /tmp
`);
      process.exit(0);
    } else {
      throw new Error(`Unknown CLI argument: ${arg}`);
    }
  }

  if (!['pipe', 'ws'].includes(opts.transport)) {
    throw new Error(`Invalid --transport="${opts.transport}" (expected pipe|ws)`);
  }

  const validTiers = new Set(['1', '2', '3', '4', 'all']);
  const tierTokens = String(opts.tier || '')
    .toLowerCase()
    .split(',')
    .map((s) => s.trim());
  if (
    !tierTokens.length ||
    tierTokens.some((t) => !validTiers.has(t)) ||
    (tierTokens.includes('all') && tierTokens.length > 1)
  ) {
    throw new Error(`Invalid --tier="${opts.tier}" (expected 1|2|3|4|all or comma-separated 1..4)`);
  }
  opts.tier = tierTokens.join(',');

  return opts;
}

function resolveViewports(viewportArg) {
  if (!viewportArg || viewportArg === 'all') return TARGET_VIEWPORT_LIST;
  if (VIEWPORTS[viewportArg]) return [VIEWPORTS[viewportArg]];
  throw new Error(`Unknown --viewport="${viewportArg}". Expected desktop|mobile|tablet_p|tablet_l|all`);
}

function buildFilterMatcher(pattern) {
  if (!pattern) return () => true;
  if (pattern.startsWith('/') && pattern.lastIndexOf('/') > 0) {
    const last = pattern.lastIndexOf('/');
    const rx = new RegExp(pattern.slice(1, last), pattern.slice(last + 1) || 'i');
    return (t) => rx.test(`${t.id} ${t.feature} ${t.title}`);
  }
  const needle = pattern.toLowerCase();
  return (t) => `${t.id} ${t.feature} ${t.title}`.toLowerCase().includes(needle);
}

function collectTests(opts, viewports) {
  let tests = [];
  if (opts.smoke) {
    tests = getSmokeTests({ rootDir: ROOT_DIR, viewports });
  } else {
    const tSpec = opts.tier.toLowerCase();
    const want = (n) => tSpec === 'all' || tSpec.split(',').includes(String(n));
    if (want(1)) tests.push(...getTier1Tests());
    if (want(2)) tests.push(...getTier2Tests());
    if (want(3)) tests.push(...getTier3Tests());
    if (want(4)) tests.push(...getTier4Tests());
  }

  const matches = buildFilterMatcher(opts.filter);
  return tests.filter(matches);
}

async function runWithTimeout(fn, timeoutMs, testId) {
  let timer;
  try {
    return await Promise.race([
      fn(),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`Test ${testId} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  let opts;
  let viewports;
  try {
    opts = parseArgs(process.argv.slice(2));
    viewports = resolveViewports(opts.viewport);
  } catch (err) {
    console.error(`CLI error: ${err.message}`);
    process.exit(2);
  }

  const tests = collectTests(opts, viewports);

  if (opts.list) {
    const byTier = { smoke: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const t of tests) {
      byTier[t.tier] = (byTier[t.tier] || 0) + 1;
    }
    if (opts.json) {
      console.log(
        JSON.stringify(
          {
            ok: true,
            mode: opts.smoke ? 'smoke' : 'list',
            counts: {
              total: tests.length,
              tier1: byTier[1],
              tier2: byTier[2],
              tier3: byTier[3],
              tier4: byTier[4],
              smoke: byTier.smoke,
            },
            tests: tests.map(({ id, tier, feature, title }) => ({ id, tier, feature, title })),
          },
          null,
          2
        )
      );
    } else {
      for (const t of tests) {
        console.log(`${t.id}\t[tier=${t.tier} ${t.feature}]\t${t.title}`);
      }
      console.log(
        `\nTotal: ${tests.length} (T1=${byTier[1]}, T2=${byTier[2]}, T3=${byTier[3]}, T4=${byTier[4]}, smoke=${byTier.smoke})`
      );
    }
    process.exit(0);
  }

  const log = opts.json ? (...a) => console.error(...a) : (...a) => console.log(...a);
  const startedAt = Date.now();
  let browser = null;
  const results = [];
  let capabilities = null;

  try {
    browser = await launchBrowser({
      rootDir: ROOT_DIR,
      transport: opts.transport,
      headless: opts.headless,
    });

    log(`Running ${tests.length} E2E test(s) via CDP (${opts.transport}, headless=${opts.headless})...`);

    for (const test of tests) {
      const t0 = Date.now();
      try {
        const effectiveTimeout = opts.explicitTimeout
          ? opts.timeout
          : Math.max(opts.timeout, test.timeoutMs || 0);
        const details = await runWithTimeout(
          () => test.run({ browser, rootDir: ROOT_DIR, viewports, opts }),
          effectiveTimeout,
          test.id
        );
        if (details && details.capabilities) {
          capabilities = details.capabilities;
        }
        const durationMs = Date.now() - t0;
        results.push({
          id: test.id,
          tier: test.tier,
          feature: test.feature,
          status: 'passed',
          durationMs,
          ...(details ? { details } : {}),
        });
        log(`PASS ${test.id} (${durationMs}ms) — ${test.title}`);
      } catch (err) {
        const durationMs = Date.now() - t0;
        const message = err && err.stack ? err.stack : String(err);
        results.push({
          id: test.id,
          tier: test.tier,
          feature: test.feature,
          status: 'failed',
          durationMs,
          error: err && err.message ? err.message : String(err),
        });
        log(`FAIL ${test.id} (${durationMs}ms) — ${test.title}\n  ${message.split('\n')[0]}`);
        if (opts.keepArtifacts) {
          const dir = path.join('/tmp', `piupiu-e2e-artifacts-${process.pid}`);
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(path.join(dir, `${test.id}.log`), message, 'utf8');
        }
      }
    }
  } catch (harnessErr) {
    console.error(`Harness error: ${harnessErr.stack || harnessErr.message}`);
    if (browser) await browser.close();
    process.exit(2);
  } finally {
    if (browser) await browser.close();
  }

  const passed = results.filter((r) => r.status === 'passed').length;
  const failed = results.filter((r) => r.status === 'failed').length;
  const summary = {
    total: results.length,
    passed,
    failed,
    skipped: 0,
  };
  const payload = {
    ok: failed === 0,
    mode: opts.smoke ? 'smoke' : `tier:${opts.tier}`,
    durationMs: Date.now() - startedAt,
    summary,
    ...(capabilities ? { capabilities } : {}),
    results,
  };

  if (opts.json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    log(`\nSummary: ${passed}/${results.length} passed, ${failed} failed (${payload.durationMs}ms)`);
  }

  process.exit(failed === 0 ? 0 : 1);
}

await main();

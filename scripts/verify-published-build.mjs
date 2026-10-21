/** Read-only acceptance: all public Pages files must match the compiled dist byte-for-byte. */
import { createHash } from 'node:crypto';
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const site = new URL(process.env.SITE_URL ?? 'https://shihab-tech04.github.io/eLedger/');
if (site.protocol !== 'https:' && !(site.hostname === '127.0.0.1' && site.protocol === 'http:')) {
  throw new Error('Site must be HTTPS or isolated local loopback');
}
if (!site.pathname.endsWith('/')) site.pathname += '/';
const dist = path.resolve(process.env.DIST_PATH ?? 'dist');
const out = path.resolve(process.env.EVIDENCE_PATH ?? 'artifacts/published-build-evidence.json');
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');

async function filesUnder(root, rel = '') {
  const names = await readdir(path.join(root, rel), { withFileTypes: true });
  const results = [];
  for (const item of names) {
    const next = path.posix.join(rel, item.name);
    if (item.isDirectory()) results.push(...await filesUnder(root, next));
    else if (item.isFile()) results.push(next);
  }
  return results.sort();
}
async function check() {
  const files = await filesUnder(dist);
  if (!files.includes('index.html') || files.length < 2) throw new Error('Invalid release dist: missing index or assets');
  const indexText = await readFile(path.join(dist, 'index.html'), 'utf8');
  if (!/assets\/index-[^"\s]+\.js/.test(indexText) || !/assets\/index-[^"\s]+\.css/.test(indexText)) {
    throw new Error('Vite production index does not identify fingerprinted JS and CSS');
  }
  const evidence = {target: site.origin + site.pathname, commit: process.env.GITHUB_SHA ?? 'LOCAL',
    checkedAt: new Date().toISOString(), fileCount: files.length, files: [], success: false};
  for (const file of files) {
    const expected = await readFile(path.join(dist, file));
    const url = new URL(file, site);
    if (file === 'index.html') url.searchParams.set('eledger-release-check', process.env.GITHUB_SHA ?? 'manual');
    const row = {file, expectedSha256: sha(expected), actualSha256: null, status: null,
      match: false, bytes: expected.length};
    evidence.files.push(row);
    try {
      const response = await fetch(url, {headers: {'Cache-Control': 'no-cache', Accept: '*/*'},
        signal: AbortSignal.timeout(15000), redirect: 'follow'});
      row.status = response.status;
      if (!response.ok) continue;
      if (new URL(response.url).origin !== site.origin) {
        row.error = 'Unexpected cross-origin redirect'; continue;
      }
      const received = Buffer.from(await response.arrayBuffer());
      row.actualSha256 = sha(received);
      row.actualBytes = received.length;
      row.match = row.actualSha256 === row.expectedSha256;
    } catch (error) { row.error = String(error?.message ?? error); }
  }
  evidence.success = evidence.files.every((file) => file.match);
  await mkdir(path.dirname(out), {recursive: true});
  await writeFile(out, JSON.stringify(evidence, null, 2) + '\n');
  return evidence;
}
let report;
const attempts = Math.max(1, Math.min(8, Number(process.env.MAX_ATTEMPTS ?? '8')));
for (let attempt = 1; attempt <= attempts; attempt++) {
  report = await check();
  console.log('PUBLISHED_BUILD attempt ' + attempt + ' (' + report.files.filter(file => file.match).length + '/' + report.fileCount + ' files matched)');
  if (report.success) break;
  for (const missing of report.files.filter(file => !file.match)) {
    console.log('MISMATCH ' + missing.file + ' HTTP=' + missing.status
      + ' expected=' + missing.expectedSha256 + ' actual=' + (missing.actualSha256 ?? missing.error));
  }
  if (attempt < attempts) await sleep(10000);
}
if (!report.success) {
  console.error('PUBLISHED_BUILD FAIL - public site differs from compiled release or cannot be read');
  process.exitCode = 1;
} else console.log('PUBLISHED_BUILD PASS ' + report.fileCount + '/' + report.fileCount
  + ' exact files for ' + report.commit);

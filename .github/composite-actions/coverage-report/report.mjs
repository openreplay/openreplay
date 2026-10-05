// usage: node report.mjs <title> <diff-cover.json> <current summaries dir> <baseline summaries dir> [base branch]
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const [title, diffFile, currentDir, baselineDir, baseArg] = process.argv.slice(2);
const baseRef = baseArg || 'dev';
const hasBaseline =
  existsSync(baselineDir) &&
  readdirSync(baselineDir).some((f) => f.endsWith('.json'));

const linesPct = (file) => {
  if (!existsSync(file)) return null;
  const { covered, total } = JSON.parse(readFileSync(file, 'utf8')).total.lines;
  return total ? (covered / total) * 100 : null;
};
const fmt = (v) => (v == null ? 'n/a' : `${v.toFixed(2)}%`);
const fmtDelta = (v) => (v == null ? 'n/a' : `${v > 0 ? '+' : ''}${v.toFixed(2)}%`);

const rows = readdirSync(currentDir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.slice(0, -'.json'.length))
  .sort()
  .map((label) => {
    const current = linesPct(join(currentDir, `${label}.json`));
    const baseline = linesPct(join(baselineDir, `${label}.json`));
    const delta = current != null && baseline != null ? current - baseline : null;
    return `| ${label} | ${fmt(baseline)} | ${fmt(current)} | ${fmtDelta(delta)} |`;
  });

const diff = JSON.parse(readFileSync(diffFile, 'utf8'));
const changed = diff.total_num_lines
  ? `${diff.total_percent_covered}% (${diff.total_num_violations} of ${diff.total_num_lines} lines missing)`
  : 'no coverable lines changed';

console.log(`### ${title}

| | dev | PR | Δ |
|---|--:|--:|--:|
${rows.join('\n')}

Changed lines vs ${baseRef}: ${changed}${
  hasBaseline
    ? ''
    : '\n\n_No dev baseline yet: no successful dev run has uploaded this report._'
}`);

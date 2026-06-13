#!/usr/bin/env node
/* sentinel:skip-file — test asserts ABSENCE of placeholder tokens; the literals
   REPLACE_ME / __PLACEHOLDER__ below are the search patterns, not real placeholders. */
/*
 * Minimal structural smoke test for the shipped single-file dashboard.
 * No build system / framework — run with: `node test_smoke.js`.
 * Verifies the deployable HTML artifact has not regressed structurally:
 *   - no UTF-8 BOM (breaks some parsers / offline serving)
 *   - <script> open/close tags balance
 *   - no literal `</script>` inside a JS template literal (would close the tag early)
 *   - no unfilled template tokens left in the shipped file
 */
'use strict';
const fs = require('fs');
const path = require('path');

const FILES = ['TEZEPELUMAB_ASTHMA_REVIEW.html', 'index.html'];
let failures = 0;
function check(cond, msg) {
  if (cond) { console.log('  ok  - ' + msg); }
  else { console.error('  FAIL - ' + msg); failures++; }
}

for (const name of FILES) {
  const file = path.join(__dirname, name);
  console.log('# ' + name);
  const buf = fs.readFileSync(file);
  const hasBom = buf.length >= 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF;
  check(!hasBom, 'no UTF-8 BOM');

  const html = buf.toString('utf8');
  const open = (html.match(/<script[ >]/g) || []).length;
  const close = (html.match(/<\/script>/g) || []).length;
  check(open === close, `<script> tags balanced (open=${open} close=${close})`);

  // Any unescaped </script> appearing inside a backtick template literal would
  // prematurely close the script block. The codebase escapes them; assert none leak.
  const literalInTemplate = /`[^`]*<\/script>[^`]*`/.test(html);
  check(!literalInTemplate, 'no literal </script> inside a template literal');

  const tokens = html.match(/\{\{[^}]+\}\}|REPLACE_ME|__PLACEHOLDER__/g) || [];
  check(tokens.length === 0, `no unfilled template tokens (${tokens.length} found)`);
}

if (failures) { console.error(`\n${failures} check(s) failed`); process.exit(1); }
console.log('\nall smoke checks passed');

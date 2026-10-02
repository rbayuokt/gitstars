import assert from 'node:assert/strict';
import { test } from 'node:test';
import { escapeXml, formatNumber, isValidUsername, parseLimit, truncate } from '../src/utils.ts';

test('formatNumber', () => {
  const cases: Array<[number, string]> = [
    [0, '0'], [52, '52'], [999, '999'], [1000, '1k'], [1250, '1.3k'], [10_000, '10k'],
    [14_000, '14k'], [14_892, '14.9k'], [999_499, '999k'], [999_999, '1M'], [1_200_000, '1.2M'],
  ];
  for (const [n, out] of cases) assert.equal(formatNumber(n), out, String(n));
});

test('parseLimit', () => {
  assert.equal(parseLimit(null), 10);
  assert.equal(parseLimit(''), 10);
  assert.equal(parseLimit('abc'), 10);
  assert.equal(parseLimit('5'), 5);
  assert.equal(parseLimit('50'), 10);
  assert.equal(parseLimit('0'), 1);
  assert.equal(parseLimit('-3'), 1);
  assert.equal(parseLimit('2.7'), 2);
});

test('escapeXml', () => {
  assert.equal(escapeXml(`<a href="x">'&'</a>`), '&lt;a href=&quot;x&quot;&gt;&apos;&amp;&apos;&lt;/a&gt;');
});

test('truncate', () => {
  assert.equal(truncate('short', 10), 'short');
  assert.equal(truncate('some-extremely-long-project-name', 25), 'some-extremely-long-proj…');
});

test('isValidUsername', () => {
  for (const ok of ['torvalds', 'a', 'a-b', 'A1', 'x'.repeat(39)]) assert.ok(isValidUsername(ok), ok);
  for (const bad of ['', '-a', 'a-', 'a--b', 'x'.repeat(40), 'a.b', 'evil.com', 'a/b', '..']) {
    assert.ok(!isValidUsername(bad), bad);
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as K from '../frissito/ksh.mjs';
import { figyeltek, benneVan } from '../frissito/figyelo.mjs';
import { adatModell } from '../epit.mjs';
import { rag } from '../forras/sablon.mjs';
import { readFile } from 'node:fs/promises';

const FEJ = 'Foglalkozás FEOR\'08 kódja;Foglalkozás megnevezése;' + [2024, 2025].map(e => `${e} Korcsoport 30 év alatt;${e} Korcsoport 30–39 éves;${e} Korcsoport 40–49 éves;"${e} Korcsoport \n50 év és afelett";${e} Együtt`).join(';');
const TABLA = `20.1.1.52. Teljes munkaidőben alkalmazásban állók bruttó átlagkeresete foglalkozások szerint [Ft/fő/hó];;\n${FEJ}\n2142;Szoftverfejlesztő;1 023 038;1 349 899;1 339 964;1 157 890;1 246 716;1 095 037;1 472 607;1 473 632;1 296 423;1 364 606\n1110;Törvényhozó;;2 116 219;2 250 591;2 341 260;2 263 869;;2 163 392;2 615 577;2 616 163;2 548 701\n`;

test('mun0208 parser: years, age groups, blanks, quoted header with line break', () => {
  const t = K.keresetTabla(TABLA);
  assert.deepEqual(t.evek, [2024, 2025]);
  assert.deepEqual(t.fog['2142'].e, [1246716, 1364606]);
  assert.deepEqual(t.fog['2142'].k[1], [1095037, 1472607, 1473632, 1296423]);
  assert.equal(t.fog['1110'].k[0][0], null);
});
test('mun0208 parser refuses a table with a different title or an unknown column', () => {
  assert.throws(() => K.keresetTabla(TABLA.replace('bruttó átlagkeresete', 'létszáma')), /táblacím/);
  assert.throws(() => K.keresetTabla(TABLA.replace('2025 Együtt', '2025 Valami más')), /ismeretlen oszlop|öt oszlop/);
});
test('validation refuses too few rows and absurd values', () => {
  assert.throws(() => K.keresetEllenor(K.keresetTabla(TABLA)), /legalább 400/);
});
test('under-25 cap is read from the NAV sentence', () => {
  assert.equal(K.fiatalHatar('<p>Az adóalapból levonható kedvezmény 2026-ban havonta maximum 715&nbsp;765 forint forint, ami</p>', 2026), 715765);
  assert.equal(K.fiatalHatar('<p>2027-ben havonta maximum 760 123 forint</p>', 2027), 760123);
  assert.equal(K.fiatalHatar('<p>semmi</p>', 2026), null);
});
test('watcher: key phrase lookup ignores markup', () => {
  assert.equal(benneVan('<p>ha nem haladja meg annak <b>nyolcvan</b> százalékát.</p>', 'nyolcvan százalékát'), true);
  assert.equal(benneVan('<p>kilencven százalékát</p>', 'nyolcvan százalékát'), false);
});
test('year suffixes', () => {
  assert.deepEqual([2025, 2026, 2027, 2028, 2030, 2040].map(e => rag(e, 'ban')), ['2025-ben', '2026-ban', '2027-ben', '2028-ban', '2030-ban', '2040-ben']);
  assert.deepEqual([2025, 2026, 2023, 2030].map(e => rag(e, 'os')), ['2025-ös', '2026-os', '2023-as', '2030-as']);
});
test('real data: model is consistent', async () => {
  const A = await adatModell();
  assert.ok(A.fog.length > 400);
  assert.equal(new Set(A.fog.map(f => f.slug)).size, A.fog.length, 'unique page addresses');
  const sz = JSON.parse(await readFile(new URL('../data/szabalyok.json', import.meta.url), 'utf8'));
  assert.ok(figyeltek(sz, A.szEv).length >= 3);
  const nevek = JSON.parse(await readFile(new URL('../data/nevek.json', import.meta.url), 'utf8')).nevek;
  const ker = JSON.parse(await readFile(new URL('../data/kereset.json', import.meta.url), 'utf8'));
  for (const k of Object.keys(nevek)) assert.ok(ker.fog[k], `nevek.json: ismeretlen FEOR-kód: ${k}`);
  for (const f of A.fog) { assert.ok(f.netto > 0 && f.netto < f.brutto); assert.ok(Math.abs(f.netto / f.brutto - 0.665) < 0.001); }
  assert.equal(A.kodra['2142'].brutto, ker.fog['2142'].e.at(-1));
});

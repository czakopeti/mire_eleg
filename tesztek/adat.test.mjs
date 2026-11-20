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

test('mun0143 parser: latest filled cumulated row, year carried over', () => {
  const fej = 'Év;Időszak;Teljes munkaidőben alkalmazásban állók bruttó átlagkeresete, Ft/fő/hó;x;Teljes munkaidőben alkalmazásban állók bruttó medián keresete, Ft/fő/hó;x;Teljes munkaidőben alkalmazásban állók nettó átlagkeresete, Ft/fő/hó';
  const t = `cím;;\n${fej}\nHavonta;;\n2026.;január;840 570;126,3;598 744;111,0;585 674\nHavi kumulált adatok;;\n2026.;január–január;840 570;126,3;598 744;111,0;585 674\n;január–szeptember;762 202;110,3;609 020;109,5;534 255\n;január–október;;;;;\nNegyedéves kumulált adatok;;\n2026.;I.;1;1;1;1;1\n`;
  assert.deepEqual(K.orszagosHavi(t), { ev: 2026, idoszak: 'január–szeptember', bruttoAtlag: 762202, bruttoMedian: 609020, nettoAtlag: 534255 });
  assert.throws(() => K.orszagosHavi(t.replace('bruttó medián', 'valami')), /oszlopok/);
});

test('settlement earnings: a value repeated from the next year counts as missing', () => {
  const telep = Object.fromEntries(Array.from({ length: 2600 }, (_, i) => [String(1000 + i), [100000, 200000, 200000, 300000]]));
  const megye = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [i ? `M${i}` : 'Budapest', [300000, 320000, 340000, 360000]]));
  const t = K.telepKereset({ evek: [2019, 2020, 2021, 2022], megye, telep, megnevezes: 'x' });
  assert.deepEqual(t.telep['1000'], [100000, null, 200000, 300000]);
  assert.equal(t.potolt, 2600);
  assert.throws(() => K.telepKereset({ evek: [2019], megye: {}, telep: {} }), /csak 0 település/);
});
test('monthly series: year carried over, stops at the cumulated block', () => {
  const sorok = Array.from({ length: 12 }, (_, i) => `${i ? '' : '2025.'};${['január', 'február', 'március', 'április', 'május', 'június', 'július', 'augusztus', 'szeptember', 'október', 'november', 'december'][i]};700 000;109,0;560 000;108,0;480 000`).join('\n');
  const h = K.haviSor(`cím;;\nÉv;Időszak\nHavonta;;\n${sorok}\nHavi kumulált adatok;;\n2025.;január–január;1;1;1;1;1\n`);
  assert.equal(h.length, 12); assert.deepEqual(h[11], { ev: 2025, ho: 12, brutto: 700000, bruttoIndex: 109, median: 560000, netto: 480000 });
});

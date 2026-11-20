import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as S from '../forras/js/szamitas.mjs';

const sz = JSON.parse(await readFile(new URL('../data/szabalyok.json', import.meta.url), 'utf8')).evek['2026'];

test('plain case: 15% + 18.5%', () => {
  const r = S.netto(sz, { brutto: 600000 });
  assert.equal(r.szja, 90000); assert.equal(r.tb, 111000); assert.equal(r.netto, 399000);
});
test('under 25: tax free up to the cap, tb still due', () => {
  const r = S.netto(sz, { brutto: 600000, fiatal25: true });
  assert.equal(r.szja, 0); assert.equal(r.netto, 489000);
  const m = S.netto(sz, { brutto: 1000000, fiatal25: true });
  assert.equal(m.szja, Math.round((1000000 - 715765) * 0.15));
  assert.equal(S.netto(sz, { brutto: 1000000 }).netto + 107365, m.netto);
});
test('family allowance: 20 000 / 80 000 / 198 000 per month', () => {
  const a = S.netto(sz, { brutto: 2000000 }).netto;
  assert.equal(S.netto(sz, { brutto: 2000000, eltartottak: 1 }).netto - a, 20001); // 133 340 * 15% = 20 001
  assert.equal(S.netto(sz, { brutto: 2000000, eltartottak: 2 }).netto - a, 79998);
  assert.equal(S.netto(sz, { brutto: 2000000, eltartottak: 3 }).netto - a, 198000);
});
test('family allowance spills over to the contribution when tax is not enough', () => {
  const r = S.netto(sz, { brutto: 400000, eltartottak: 2 }); // allowance base 533 320 > 400 000
  assert.equal(r.szja, 0);
  assert.equal(r.jarulekKedv, Math.round(133320 * 0.15));
  assert.equal(r.netto, 400000 - (74000 - 19998));
});
test('mother exemption: no tax, whole family allowance against tb, never above tb', () => {
  const r = S.netto(sz, { brutto: 500000, anya: true, eltartottak: 3 });
  assert.equal(r.szja, 0); assert.equal(r.tb, 0); assert.equal(r.netto, 500000);
  const k = S.netto(sz, { brutto: 500000, anya: true, eltartottak: 1 });
  assert.equal(k.netto, 500000 - 92500 + 20001);
});
test('threshold must be exceeded, not just reached', () => {
  const k = S.berkuszob(500000);
  assert.equal(k.hatarKerek, 400000); assert.equal(k.legkisebb, 400001);
  assert.equal(S.berMegfelel(400000, 500000), false); assert.equal(S.berMegfelel(400001, 500000), true);
  assert.equal(S.berkuszob(578224).legkisebb, 462580); // 462 579.2 -> 462 580
});
test('real value: earlier years are multiplied up to the last year', () => {
  const r = S.realErtek([2023, 2024, 2025], [100000, 100000, 100000], { 2024: 103.7, 2025: 104.4 });
  assert.deepEqual(r, [Math.round(100000 * 1.037 * 1.044), 104400, 100000]);
});
test('flat and car', () => {
  const l = S.lakas({ nettoHavi: 400000, m2Ft: 1000000 });
  assert.equal(l.ar, 50000000); assert.equal(l.honap, 125);
  assert.equal(S.idotartam(125), '10 év 5 hónap');
  assert.equal(S.auto({ nettoHavi: 400000, ar: 6000000, kmHavi: 1000, fogyasztas: 6, literAr: 600 }).uzemanyag, 36000);
});

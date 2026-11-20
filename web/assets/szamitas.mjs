// Calculation core. Used by the browser, the build and the tests. No DOM, no I/O.

/**
 * Gross -> net monthly wage.
 * sz: one year's rules from data/szabalyok.json
 * be: { brutto, fiatal25?: bool, anya?: bool, eltartottak?: number }
 * Simplifications (also stated on the page): one earner claims the whole family allowance,
 * every dependant is a "beneficiary dependant", no personal or first-marriage allowance.
 */
export function netto(sz, be) {
  const brutto = Math.max(0, Math.round(Number(be.brutto) || 0));
  const n = Math.max(0, Math.floor(Number(be.eltartottak) || 0));
  let alap = brutto;
  const lepesek = [];
  let anyaKedv = 0, fiatalKedv = 0;
  if (be.anya) { anyaKedv = alap; alap = 0; lepesek.push(['anyak', anyaKedv]); }
  else if (be.fiatal25) { fiatalKedv = Math.min(alap, sz.fiatal25.ertek); alap -= fiatalKedv; lepesek.push(['fiatal25', fiatalKedv]); }
  const egy = n === 0 ? 0 : sz.csaladi.ertek[Math.min(n, 3) - 1];
  const csaladiKeret = egy * n;
  const csaladiSzja = Math.min(alap, csaladiKeret);
  alap -= csaladiSzja;
  const szja = Math.round(alap * sz.szja.ertek);
  const tbTeljes = Math.round(brutto * sz.tb.ertek);
  const jarulekKedv = Math.min(tbTeljes, Math.round((csaladiKeret - csaladiSzja) * sz.szja.ertek));
  const tb = tbTeljes - jarulekKedv;
  const ertek = brutto - szja - tb;
  return {
    brutto, netto: ertek, szja, tb, tbTeljes, jarulekKedv,
    anyaKedv, fiatalKedv, csaladiKeret, csaladiSzja,
    csaladiMegtakaritas: Math.round(csaladiSzja * sz.szja.ertek) + jarulekKedv,
    arany: brutto ? ertek / brutto : 0,
  };
}

/** Net -> gross for the plain case (no allowances); used by "what gross do I need". */
export function bruttoNettobol(sz, n) {
  return Math.round(n / (1 - sz.szja.ertek - sz.tb.ertek));
}

/** Today's estimated price per m² (HUF) of a settlement entry from data/lakasar.json. */
export function m2Ar(t) {
  return Math.round(t.ar * 1000 * (t.szorzo || 1));
}

/**
 * How long a flat takes.
 * be: { nettoHavi, m2Ft, m2 = 50, megtakaritas = 1 (share of net put aside) }
 */
export function lakas(be) {
  const m2 = be.m2 || 50;
  const ar = Math.round(be.m2Ft * m2);
  const havi = be.nettoHavi * (be.megtakaritas ?? 1);
  const honap = havi > 0 ? ar / havi : Infinity;
  return { ar, honap, ev: honap / 12, m2PerHavi: be.nettoHavi / be.m2Ft };
}

/**
 * Car affordability.
 * be: { nettoHavi, ar, kmHavi?, fogyasztas? (l/100 km), literAr? }
 */
export function auto(be) {
  const haviBer = be.ar > 0 && be.nettoHavi > 0 ? be.ar / be.nettoHavi : null;
  const uzemanyag = be.kmHavi > 0 && be.fogyasztas > 0 && be.literAr > 0 ? Math.round(be.kmHavi * be.fogyasztas / 100 * be.literAr) : null;
  return { haviBer, uzemanyag, uzemanyagArany: uzemanyag != null && be.nettoHavi > 0 ? uzemanyag / be.nettoHavi : null };
}

/**
 * Wage threshold for third-country nationals: the base wage must EXCEED 80% of the national
 * gross average earnings of the FEOR occupation (445/2013. Korm. r. 6. § (3), 20. § (6)).
 */
export function berkuszob(atlag, arany = 0.8) {
  const hatar = atlag * arany;
  return { atlag, hatar, hatarKerek: Math.floor(hatar), legkisebb: Math.floor(hatar) + 1 };
}
export function berMegfelel(alapber, atlag, arany = 0.8) {
  return alapber > atlag * arany;
}

/** Real value series in the last year's prices. index: { ev: CPI, previous year = 100 } */
export function realErtek(evek, ertekek, index) {
  const utolso = evek[evek.length - 1];
  return evek.map((ev, i) => {
    if (ertekek[i] == null) return null;
    let sz = 1;
    for (let e = ev + 1; e <= utolso; e++) { if (index[e] == null) return null; sz *= index[e] / 100; }
    return Math.round(ertekek[i] * sz);
  });
}

// ---------- formatting (Hungarian) ----------
export const ft = n => n == null || !isFinite(n) ? '–' : `${Math.round(n).toLocaleString('hu-HU').replace(/ /g, ' ')} Ft`;
export const szamHu = (n, t = 0) => n == null || !isFinite(n) ? '–' : n.toLocaleString('hu-HU', { minimumFractionDigits: t, maximumFractionDigits: t }).replace(/ /g, ' ');
export const szazalek = (x, t = 1) => `${szamHu(x * 100, t)}%`;
/** 13.4 years -> "13 év 5 hónap" */
export function idotartam(honap) {
  if (!isFinite(honap)) return '–';
  const h = Math.max(1, Math.round(honap));
  const ev = Math.floor(h / 12), ho = h % 12;
  return [ev ? `${ev} év` : '', ho ? `${ho} hónap` : ''].filter(Boolean).join(' ');
}
/** Search key: lower case, accents removed. */
export const kulcs = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

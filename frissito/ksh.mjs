// Pure parsers for the source files. No network here, so the tests can run them on fixtures.

/** KSH STADAT CSV files are Windows-1250 encoded (the en dash in "30–39" proves it). */
export function dekodol(buf) {
  return new TextDecoder('windows-1250').decode(buf);
}

/** Minimal CSV parser: semicolon separated, quoted cells may contain line breaks. */
export function csv(szoveg) {
  const sorok = [];
  let sor = [], cella = '', idezet = false;
  for (let i = 0; i < szoveg.length; i++) {
    const c = szoveg[i];
    if (idezet) {
      if (c === '"' && szoveg[i + 1] === '"') { cella += '"'; i++; }
      else if (c === '"') idezet = false;
      else cella += c;
    } else if (c === '"') idezet = true;
    else if (c === ';') { sor.push(cella); cella = ''; }
    else if (c === '\n') { sor.push(cella); sorok.push(sor); sor = []; cella = ''; }
    else if (c !== '\r') cella += c;
  }
  if (cella !== '' || sor.length) { sor.push(cella); sorok.push(sor); }
  return sorok.map(s => s.map(x => x.replace(/\s+/g, ' ').trim()));
}

/** "1 316 438" -> 1316438, "104,4" -> 104.4, "" or ".." -> null */
export function szam(s) {
  const t = String(s ?? '').replace(/[\s ]/g, '').replace(',', '.');
  if (t === '' || !/^-?\d+(\.\d+)?$/.test(t)) return null;
  return Number(t);
}

export const KORCSOPORTOK = ['30 év alatt', '30–39 éves', '40–49 éves', '50 év és afelett'];

function korIndex(fej) {
  if (/együtt/i.test(fej)) return 4;
  if (/30 év alatt/i.test(fej)) return 0;
  if (/30.?39/.test(fej)) return 1;
  if (/40.?49/.test(fej)) return 2;
  if (/50 év/i.test(fej)) return 3;
  return -1;
}

/**
 * mun0208: gross average earnings of full-time employees by occupation (FEOR-08), by age group.
 * Returns { cim, evek, fog: { kod: { n, e: [per year], k: [[4 age groups] per year] } } }
 */
export function keresetTabla(szoveg) {
  const sorok = csv(szoveg);
  const fejIx = sorok.findIndex(s => /FEOR/i.test(s[0] || '') && /megnevez/i.test(s[1] || ''));
  if (fejIx < 0) throw new Error('mun0208: nem találom a fejlécet (FEOR kód; megnevezés).');
  const cim = (sorok[0] || [''])[0];
  if (!/bruttó átlagkeresete/i.test(cim) || !/foglalkozás/i.test(cim)) throw new Error(`mun0208: váratlan táblacím: „${cim}”`);
  const fej = sorok[fejIx];
  const oszlop = [];
  for (let i = 2; i < fej.length; i++) {
    const ev = Number((fej[i].match(/(20\d\d)/) || [])[1]);
    const k = korIndex(fej[i]);
    if (!ev || k < 0) { if (fej[i]) throw new Error(`mun0208: ismeretlen oszlop: „${fej[i]}”`); continue; }
    oszlop.push({ i, ev, k });
  }
  const evek = [...new Set(oszlop.map(o => o.ev))].sort((a, b) => a - b);
  for (const ev of evek) if (oszlop.filter(o => o.ev === ev).length !== 5) throw new Error(`mun0208: a(z) ${ev}. évnek nincs meg mind az öt oszlopa.`);
  const fog = {};
  for (const s of sorok.slice(fejIx + 1)) {
    if (!/^\d{4}$/.test(s[0] || '')) continue;
    const e = evek.map(() => null), k = evek.map(() => [null, null, null, null]);
    for (const o of oszlop) {
      const v = szam(s[o.i]);
      const y = evek.indexOf(o.ev);
      if (o.k === 4) e[y] = v; else k[y][o.k] = v;
    }
    fog[s[0]] = { n: s[1].replace(/\s+/g, ' ').trim(), e, k };
  }
  return { cim, evek, fog };
}

/** Sanity checks. Throws with a readable reason, so a broken download never reaches the site. */
export function keresetEllenor(uj, regi) {
  const n = Object.keys(uj.fog).length;
  if (n < 400) throw new Error(`mun0208: csak ${n} foglalkozás van a táblában (legalább 400 kell).`);
  if (uj.evek.length < 5) throw new Error('mun0208: ötnél kevesebb év.');
  const utolso = uj.evek.length - 1;
  let van = 0;
  for (const [kod, f] of Object.entries(uj.fog)) {
    for (const v of [...f.e, ...f.k.flat()]) if (v != null && (v < 60000 || v > 20000000)) throw new Error(`mun0208: hihetetlen érték (${v}) a(z) ${kod} kódnál.`);
    if (f.e[utolso] != null) van++;
  }
  if (van < n * 0.9) throw new Error('mun0208: az utolsó év adatainak több mint tizede hiányzik.');
  if (regi?.evek?.length) {
    const ru = regi.evek[regi.evek.length - 1];
    if (uj.evek[utolso] < ru) throw new Error(`mun0208: az új tábla utolsó éve (${uj.evek[utolso]}) régebbi, mint a meglévő (${ru}).`);
    // Earlier years rarely change; a big silent shift means the table layout moved.
    const kozos = regi.evek.filter(e => uj.evek.includes(e));
    let elter = 0, ossz = 0;
    for (const [kod, f] of Object.entries(regi.fog || {})) {
      const g = uj.fog[kod]; if (!g) continue;
      for (const ev of kozos) {
        const a = f.e[regi.evek.indexOf(ev)], b = g.e[uj.evek.indexOf(ev)];
        if (a == null || b == null) continue;
        ossz++; if (Math.abs(a - b) / a > 0.2) elter++;
      }
    }
    if (ossz && elter / ossz > 0.1) throw new Error('mun0208: a korábbi évek értékeinek több mint tizede 20%-nál jobban megváltozott.');
  }
  return true;
}

/** mun0188: national net average earnings by sex and age. */
export function nettoTabla(szoveg) {
  const sorok = csv(szoveg);
  const cim = (sorok[0] || [''])[0];
  if (!/nettó átlagkeresete/i.test(cim)) throw new Error(`mun0188: váratlan táblacím: „${cim}”`);
  const fej = sorok.find(s => s[0] === 'Év');
  if (!fej) throw new Error('mun0188: nincs „Év” fejléc.');
  const ossz = fej.findIndex(x => /^összesen$/i.test(x));
  if (ossz < 0) throw new Error('mun0188: nincs „Összesen” oszlop.');
  const kezd = sorok.findIndex(s => /nettó átlagkereset, forint/i.test(s[0] || ''));
  const out = { cim, evek: [], osszesen: [], ferfi: [], no: [] };
  for (const s of sorok.slice(kezd + 1)) {
    if (!/^\d{4}$/.test(s[0])) break;
    out.evek.push(Number(s[0])); out.osszesen.push(szam(s[ossz])); out.ferfi.push(szam(s[1])); out.no.push(szam(s[2]));
  }
  if (out.evek.length < 3 || out.osszesen.some(v => v == null || v < 100000 || v > 5000000)) throw new Error('mun0188: hiányos vagy hihetetlen adatok.');
  return out;
}

/** ara0001: consumer price index, previous year = 100. Returns { ev: index } */
export function inflacioTabla(szoveg) {
  const sorok = csv(szoveg);
  const fej = sorok.find(s => s[0] === 'Év');
  if (!fej || !/fogyasztóiár-index/i.test(fej[1] || '')) throw new Error('ara0001: a második oszlop nem a fogyasztóiár-index.');
  const index = {};
  for (const s of sorok) if (/^\d{4}$/.test(s[0])) { const v = szam(s[1]); if (v != null) index[s[0]] = v; }
  const evek = Object.keys(index);
  if (evek.length < 5 || Object.values(index).some(v => v < 90 || v > 140)) throw new Error('ara0001: hiányos vagy hihetetlen árindexek.');
  return index;
}

/**
 * Ingatlanmérleg arak.json -> compact settlement list for a flat.
 * Price series: "t" (flats in multi-dwelling buildings) when the latest value exists, otherwise "o" (all dwellings).
 * Unit: thousand HUF per m². The "becsles.szorzok" multiplier turns the last yearly price into today's estimate.
 */
export function lakasarLista(a) {
  if (!a?.egysegek || !Array.isArray(a.evek)) throw new Error('arak.json: hiányzik az „egysegek” vagy az „evek”.');
  const megye = Object.fromEntries(Object.entries(a.megyek || {}).map(([k, v]) => [k, v.n]));
  const utolsoEv = a.evek[a.evek.length - 1];
  const tel = [];
  for (const [kod, u] of Object.entries(a.egysegek)) {
    let sor = null, tipus = null, ix = -1;
    for (const t of ['t', 'o']) {
      const s = u.s?.[t]; if (!s) continue;
      for (let i = s.length - 1; i >= s.length - 3 && i >= 0; i--) if (s[i] != null) { if (i > ix) { ix = i; sor = s; tipus = t; } break; }
    }
    if (!sor) continue; // no price in the last three years
    const ev = a.evek[ix];
    const szorzo = ev === utolsoEv ? (a.becsles?.szorzok?.[kod] ?? null) : null;
    tel.push({ kod, n: u.n, m: megye[u.m] || '', ar: sor[ix], ev, tipus, szorzo, db: u.s[tipus + 'd']?.[ix] ?? null });
  }
  if (tel.length < 300) throw new Error(`arak.json: csak ${tel.length} településnek van friss ára.`);
  if (tel.some(t => t.ar < 10 || t.ar > 5000)) throw new Error('arak.json: hihetetlen négyzetméterár (ezer Ft/m² egységet várok).');
  tel.sort((x, y) => x.n.localeCompare(y.n, 'hu'));
  return { evek: a.evek, utolsoEv, becslesCimke: a.becsles?.cimke || null, forras: a.forras || null, ellenorizve: a.ellenorizve || null, tel };
}

/** autózom nav-uzemanyagar.json -> latest monthly NAV fuel prices. */
export function uzemanyag(a) {
  const l = a?.legfrissebb;
  if (!l || !(l.benzin_ft_l > 200 && l.benzin_ft_l < 2000) || !(l.dizel_ft_l > 200 && l.dizel_ft_l < 2000)) throw new Error('autózom: hiányzik vagy hihetetlen a legfrissebb üzemanyagár.');
  return { honap: l.honap, benzin: l.benzin_ft_l, dizel: l.dizel_ft_l, kozzeteve: l.kozzeteve || null, forras: a.forras || null, ellenorizve: a.ellenorizve || null };
}

/** NAV page text -> the monthly cap of the under-25 allowance for the given year, or null. */
export function fiatalHatar(html, ev) {
  const t = html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
  const m = t.match(new RegExp(`${ev}-b[ae]n\\s+havonta\\s+maximum\\s+([\\d ]{6,11})\\s*forint`, 'i'));
  if (!m) return null;
  const v = Number(m[1].replace(/\s/g, ''));
  return v > 300000 && v < 3000000 ? v : null;
}

/**
 * mun0143: national monthly earnings. We use the latest filled row of the "cumulated by month" block
 * (January–X), because a single month is distorted by bonuses.
 * Returns { ev, idoszak, bruttoAtlag, bruttoMedian, nettoAtlag }
 */
export function orszagosHavi(szoveg) {
  const sorok = csv(szoveg);
  const fej = sorok.find(s => s[0] === 'Év');
  if (!fej || !/bruttó átlagkeresete, Ft/i.test(fej[2] || '') || !/bruttó medián/i.test(fej[4] || '') || !/nettó átlagkeresete, Ft/i.test(fej[6] || '')) throw new Error('mun0143: az oszlopok sorrendje megváltozott.');
  const kezd = sorok.findIndex(s => /^Havi kumulált/i.test(s[0] || ''));
  if (kezd < 0) throw new Error('mun0143: nincs „Havi kumulált adatok” blokk.');
  let ev = null, ki = null;
  for (const s of sorok.slice(kezd + 1)) {
    if (/kumulált/i.test(s[0] || '')) break;
    if (/^\d{4}/.test(s[0] || '')) ev = Number(s[0].slice(0, 4));
    const a = szam(s[2]), m = szam(s[4]), n = szam(s[6]);
    if (ev && a != null && m != null && n != null) ki = { ev, idoszak: s[1], bruttoAtlag: a, bruttoMedian: m, nettoAtlag: n };
  }
  if (!ki || ki.bruttoMedian < 200000 || ki.bruttoMedian > ki.bruttoAtlag || ki.bruttoAtlag > 5000000) throw new Error('mun0143: hiányzó vagy hihetetlen országos adatok.');
  return ki;
}

const HO = ['január', 'február', 'március', 'április', 'május', 'június', 'július', 'augusztus', 'szeptember', 'október', 'november', 'december'];
/** mun0143, "Havonta" block: monthly national series. Returns [{ ev, ho (1-12), brutto, bruttoIndex, median, netto }] */
export function haviSor(szoveg) {
  const sorok = csv(szoveg);
  const kezd = sorok.findIndex(s => /^Havonta/i.test(s[0] || ''));
  if (kezd < 0) throw new Error('mun0143: nincs „Havonta” blokk.');
  const ki = []; let ev = null;
  for (const s of sorok.slice(kezd + 1)) {
    if (/kumulált/i.test(s[0] || '')) break;
    if (/^\d{4}/.test(s[0] || '')) ev = Number(s[0].slice(0, 4));
    const ho = HO.indexOf((s[1] || '').toLowerCase()) + 1;
    const brutto = szam(s[2]), median = szam(s[4]), netto = szam(s[6]);
    if (ev && ho && brutto != null && median != null && netto != null) ki.push({ ev, ho, brutto, bruttoIndex: szam(s[3]), median, netto });
  }
  if (ki.length < 12 || ki.some(h => h.brutto < 200000 || h.brutto > 5000000 || h.median > h.brutto)) throw new Error('mun0143: hiányos vagy hihetetlen havi adatsor.');
  return ki;
}

/**
 * Net earnings by place of residence (KSH TIMEA, collected by the Ingatlanmérleg updater).
 * Keeps the structure, checks it. Keys of "telep" are the first four digits of the KSH settlement code.
 */
export function telepKereset(a) {
  if (!Array.isArray(a?.evek) || !a.megye || !a.telep) throw new Error('telepkereset: hiányzik az evek, a megye vagy a telep.');
  const n = Object.keys(a.telep).length;
  if (n < 2500 || Object.keys(a.megye).length < 20) throw new Error(`telepkereset: csak ${n} település, ${Object.keys(a.megye).length} megye.`);
  const bp = a.megye.Budapest?.at(-1);
  if (!(bp > 150000 && bp < 3000000)) throw new Error('telepkereset: hihetetlen budapesti érték.');
  for (const s of Object.values(a.telep)) if (s.length !== a.evek.length) throw new Error('telepkereset: egy sor hossza eltér az évek számától.');
  // In the source a missing year is filled with the next year's value. Two identical consecutive
  // values are therefore treated as "the earlier one is missing", so the trend does not show a false jump.
  const telep = {}; let potolt = 0;
  for (const [k, sor] of Object.entries(a.telep)) telep[k] = sor.map((v, i) => { if (v != null && i < sor.length - 1 && v === sor[i + 1]) { potolt++; return null; } return v; });
  return { megnevezes: a.megnevezes || '', evek: a.evek, megye: a.megye, telep, potolt, eredeti: a.forras || null, forrasKelt: a.ellenorizve || null };
}

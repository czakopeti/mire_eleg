// Page frame, shared helpers and build-time SVG charts.
import { ft, szamHu } from './js/szamitas.mjs';

export const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const slug = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const nagy = s => s.charAt(0).toLocaleUpperCase('hu') + s.slice(1);

const HONAP = ['január', 'február', 'március', 'április', 'május', 'június', 'július', 'augusztus', 'szeptember', 'október', 'november', 'december'];
/** "2026-11-20" -> "2026. november 20." */
export const datum = iso => { const [e, h, n] = iso.split('-').map(Number); return `${e}. ${HONAP[h - 1]}${n ? ` ${n}.` : ''}`; };

// Hungarian suffixes for years, so the text stays correct next year too.
const TIZES = { ban: ['ben', 'ban', 'ban', 'ben', 'ben', 'ban', 'ben', 'ban', 'ben'], os: ['es', 'as', 'as', 'es', 'es', 'as', 'es', 'as', 'es'] };
const EGYES = { ban: [null, 'ben', 'ben', 'ban', 'ben', 'ben', 'ban', 'ben', 'ban', 'ben'], os: [null, 'es', 'es', 'as', 'es', 'ös', 'os', 'es', 'as', 'es'] };
export function rag(ev, tipus) {
  const e = ev % 10, t = Math.floor(ev / 10) % 10;
  const r = e ? EGYES[tipus][e] : t ? TIZES[tipus][t - 1] : (tipus === 'ban' ? 'ben' : 'es');
  return `${ev}-${r}`;
}
export const evBan = ev => rag(ev, 'ban');
export const evOs = ev => rag(ev, 'os');

/** Source line that goes under every figure block. */
export function forras(f, extra = '') {
  return `<p class="forras">Forrás: <a href="${esc(f.url)}" rel="noopener">${esc(f.nev)}</a>${extra ? `, ${extra}` : ''}. Letöltve: ${datum(f.letoltve || f.ellenorizve)}</p>`;
}

const JEL = `<svg class="jel" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9" fill="var(--zold)"/><path d="M10 7h12v18l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3-2 1.3z" fill="#fff"/><path d="M13 12h6M13 16h6" stroke="var(--zold)" stroke-width="1.8" stroke-linecap="round"/></svg>`;

export const MENU = [['foglalkozasok/', 'Foglalkozások'], ['hol-allsz/', 'Hol állsz?'], ['osszehasonlitas/', 'Összehasonlítás'], ['terkep/', 'Térkép'], ['nyertesek-vesztesek/', 'Nyertesek'], ['brutto-netto-kalkulator/', 'Kalkulátor'], ['berkuszob-kereso/', 'Bérküszöb']];

/**
 * o: { ut, cim, leiras, tartalom, jsonld?: object[], morzsa?: [[ut, nev]], szkript?: bool }
 * k: build context { cfg, v (asset version), frissitve }
 */
export function oldal(o, k) {
  const { cfg } = k;
  const teljes = `${cfg.domain}/${o.ut}`;
  const ld = [...(o.jsonld || [])];
  if (o.morzsa?.length) ld.push({
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [['', 'Főoldal'], ...o.morzsa].map(([ut, nev], i) => ({ '@type': 'ListItem', position: i + 1, name: nev, item: `${cfg.domain}/${ut}` })),
  });
  return `<!doctype html>
<html lang="hu">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(o.cim)}</title>
<meta name="description" content="${esc(o.leiras)}">
<link rel="canonical" href="${esc(teljes)}">
${cfg.eles ? '' : '<meta name="robots" content="noindex">\n'}<meta property="og:type" content="website">
<meta property="og:locale" content="hu_HU">
<meta property="og:site_name" content="${esc(cfg.marka)}">
<meta property="og:title" content="${esc(o.cim)}">
<meta property="og:description" content="${esc(o.leiras)}">
<meta property="og:url" content="${esc(teljes)}">
<meta name="theme-color" content="#073B28">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/assets/fonts/geist-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/geist-latin-ext-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/alap.css?v=${k.v}">
<script>document.documentElement.classList.add('js')</script>
${ld.map(x => `<script type="application/ld+json">${JSON.stringify(x).replace(/</g, '\\u003c')}</script>`).join('\n')}
</head>
<body${o.ut === '' ? ' class="fooldal"' : ''}>
<a class="ugras" href="#tartalom">Ugrás a tartalomra</a>
<header class="fej">
  <div class="fej-bel">
    <a class="logo" href="/" aria-label="${esc(cfg.marka)}, főoldal">${JEL}<span>mire elég?</span></a>
    <nav aria-label="Fő menü">${MENU.map(([u, n]) => `<a href="/${u}"${o.ut.startsWith(u) ? ' aria-current="page"' : ''}>${n}</a>`).join('')}</nav>
  </div>
</header>
<main id="tartalom">
${o.morzsa?.length ? `<nav class="morzsa" aria-label="Morzsamenü"><a href="/">Főoldal</a>${o.morzsa.map(([u, n], i) => i === o.morzsa.length - 1 ? `<span>${esc(n)}</span>` : `<a href="/${u}">${esc(n)}</a>`).join('')}</nav>` : ''}
${o.tartalom}
</main>
<footer class="lab">
  <div class="lab-bel">
    <div class="lab-sor">
      <a class="logo" href="/">${JEL}<span>mire elég?</span></a>
      <p>${esc(cfg.szlogen)}</p>
    </div>
    <nav aria-label="Lábléc">
      <a href="/foglalkozasok/">Minden foglalkozás</a><a href="/hol-allsz/">Hol állsz?</a><a href="/osszehasonlitas/">Szakmák összehasonlítása</a><a href="/terkep/">Megfizethetőségi térkép</a><a href="/nyertesek-vesztesek/">Nyertesek és vesztesek</a><a href="/brutto-netto-kalkulator/">Bruttó–nettó kalkulátor</a><a href="/mire-eleg/">Mire elég?</a><a href="/berkuszob-kereso/">Bérküszöb-kereső</a><a href="/forrasok/">Források és módszertan</a><a href="/adatok/">Letölthető adatok</a><a href="/impresszum/">Impresszum, adatkezelés</a>
    </nav>
    <p class="lab-apro">Az adatok utolsó ellenőrzése: ${datum(k.frissitve)}. A keresetek a KSH hivatalos adatai, a nettó bér saját számítás a hatályos szabályok alapján. Tájékoztató jellegű, nem minősül adó- vagy jogi tanácsadásnak.</p>
  </div>
</footer>
${o.szkript === false ? '' : `<script type="module" src="/assets/app.mjs?v=${k.v}"></script>`}
</body>
</html>
`;
}

// ---------- charts (static SVG, colours from CSS variables; they draw in once when scrolled into view) ----------

export const rovid = n => n >= 1e6 ? `${szamHu(n / 1e6, n >= 1e7 ? 1 : 2)} M` : `${szamHu(Math.round(n / 1000))} e`;

/** Bars by age group. The highest bar is highlighted. */
export function korOszlopok(cimkek, ertekek, alCimkek = []) {
  const W = 420, H = 250, bal = 6, also = 46, felso = 30;
  const max = Math.max(...ertekek.filter(v => v != null));
  const sav = (W - 2 * bal) / ertekek.length, sz = Math.min(76, sav - 22);
  const y = v => felso + (H - felso - also) * (1 - v / max);
  const csucs = ertekek.indexOf(max);
  let g = `<line class="tengely" x1="${bal}" x2="${W - bal}" y1="${H - also}" y2="${H - also}"/>`;
  ertekek.forEach((v, i) => {
    const kx = bal + sav * i + sav / 2;
    if (v == null) { g += `<text class="d-nincs" x="${kx}" y="${H - also - 8}" text-anchor="middle">nincs adat</text>`; }
    else {
      const top = y(v), h = H - also - top, r = Math.min(4, h);
      g += `<path class="oszlop${i === csucs ? ' csucs' : ''}" style="--i:${i}" d="M${kx - sz / 2} ${H - also}V${top + r}q0-${r} ${r}-${r}h${sz - 2 * r}q${r} 0 ${r} ${r}V${H - also}z"><title>${esc(cimkek[i])}: ${ft(v)}</title></path>`;
      g += `<text class="d-ertek kesobb" x="${kx}" y="${top - 8}" text-anchor="middle">${rovid(v)} Ft</text>`;
    }
    g += `<text class="d-cimke" x="${kx}" y="${H - also + 19}" text-anchor="middle">${esc(cimkek[i])}</text>`;
    if (alCimkek[i]) g += `<text class="d-al" x="${kx}" y="${H - also + 36}" text-anchor="middle">${esc(alCimkek[i])}</text>`;
  });
  return `<svg class="abra" data-latvany viewBox="0 0 ${W} ${H}" role="img" aria-label="Bruttó átlagkereset korcsoportonként: ${esc(cimkek.map((c, i) => `${c} ${ertekek[i] == null ? 'nincs adat' : ft(ertekek[i])}`).join(', '))}">${g}</svg>`;
}

/** Two lines over the years: nominal (solid) and real (dashed). Both are direct-labelled. */
export function trendVonal(evek, nevleges, real, utolsoEv) {
  const W = 420, H = 250, bal = 24, jobb = 84, felso = 18, also = 34;
  const mind = [...nevleges, ...real].filter(v => v != null);
  const max = Math.max(...mind) * 1.06;
  const x = i => bal + (W - bal - jobb) * (evek.length === 1 ? 0.5 : i / (evek.length - 1));
  const y = v => felso + (H - felso - also) * (1 - v / max);
  const vonal = sor => { let d = '', toll = false; sor.forEach((v, i) => { if (v == null) { toll = false; return; } d += `${toll ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`; toll = true; }); return d; };
  let g = `<line class="racs" x1="${bal}" x2="${W - jobb}" y1="${y(max / 2.12)}" y2="${y(max / 2.12)}"/><text class="d-al" x="${W - jobb + 8}" y="${y(max / 2.12) + 4}">${rovid(max / 2.12)} Ft</text>`;
  g += `<line class="tengely" x1="${bal}" x2="${W - jobb}" y1="${H - also}" y2="${H - also}"/>`;
  evek.forEach((e, i) => { g += `<text class="d-cimke" x="${x(i)}" y="${H - also + 20}" text-anchor="middle">${evek.length > 8 && i % 2 ? '' : e}</text>`; });
  let r = `<path class="vonal real" d="${vonal(real)}"/><path class="vonal nevl" d="${vonal(nevleges)}"/>`;
  evek.forEach((e, i) => {
    if (real[i] != null && i < evek.length - 1) r += `<circle class="pont real" cx="${x(i)}" cy="${y(real[i])}" r="4"><title>${e}, ${utolsoEv}. évi áron: ${ft(real[i])}</title></circle>`;
    if (nevleges[i] != null) r += `<circle class="pont nevl" cx="${x(i)}" cy="${y(nevleges[i])}" r="4"><title>${e}, akkori áron: ${ft(nevleges[i])}</title></circle>`;
  });
  g += `<g class="rajz">${r}</g>`;
  const n0 = nevleges.findIndex(v => v != null), r0 = real.findIndex(v => v != null);
  const veg = evek.length - 1;
  if (nevleges[veg] != null) g += `<text class="d-ertek kesobb" x="${x(veg) + 9}" y="${y(nevleges[veg]) + 4}">${rovid(nevleges[veg])} Ft</text>`;
  if (r0 >= 0 && n0 >= 0) {
    const fent = real[r0] >= nevleges[n0];
    g += `<text class="d-nev" x="${x(r0) + 6}" y="${y(real[r0]) + (fent ? -10 : 18)}">mai áron</text>`;
    g += `<text class="d-nev" x="${x(n0) + 6}" y="${y(nevleges[n0]) + (fent ? 18 : -10)}">akkori áron</text>`;
  }
  return `<svg class="abra" data-latvany viewBox="0 0 ${W} ${H}" role="img" aria-label="A bruttó átlagkereset alakulása ${evek[0]} és ${evek[veg]} között, akkori áron és ${utolsoEv}. évi áron. A pontos értékek az ábra alatti táblázatban vannak.">${g}</svg>
<p class="jelmagy"><span><i class="j nevl"></i>Akkori áron (névleges)</span><span><i class="j real"></i>${utolsoEv}. évi áron (inflációval korrigálva)</span></p>`;
}

/**
 * Scatter of every occupation: x = gross (log scale), y = real change since the first year.
 * pontok: [{ kod, nev, slug, brutto, realValt }]. mini: no axes or links (home tile).
 */
export function szoras(pontok, { mini = false, elsoEv, utolsoEv } = {}) {
  const W = mini ? 300 : 860, H = mini ? 150 : 520, bal = mini ? 6 : 58, jobb = mini ? 6 : 24, felso = mini ? 6 : 30, also = mini ? 6 : 52;
  const p = pontok.filter(f => f.realValt != null);
  const xs = p.map(f => Math.log(f.brutto)), ys = p.map(f => f.realValt);
  const xMin = Math.log(Math.min(200000, ...p.map(f => f.brutto)) * 0.95), xMax = Math.max(...xs) + 0.05;
  const yMin = Math.min(-0.1, Math.floor(Math.min(...ys) * 10) / 10), yMax = Math.ceil(Math.max(...ys) * 10) / 10;
  const x = v => bal + (W - bal - jobb) * (Math.log(v) - xMin) / (xMax - xMin);
  const y = v => felso + (H - felso - also) * (1 - (v - yMin) / (yMax - yMin));
  let g = '';
  if (!mini) {
    for (let t = Math.ceil(yMin * 5) / 5; t <= yMax + 1e-9; t += 0.2) g += `<line class="racs" x1="${bal}" x2="${W - jobb}" y1="${y(t)}" y2="${y(t)}"/><text class="d-al" x="${bal - 8}" y="${y(t) + 4}" text-anchor="end">${t > 0.001 ? '+' : ''}${Math.round(t * 100)}%</text>`;
    for (const t of [250000, 500000, 1000000, 2000000, 4000000]) if (Math.log(t) < xMax) g += `<text class="d-al" x="${x(t)}" y="${H - also + 20}" text-anchor="middle">${rovid(t)} Ft</text><line class="racs" x1="${x(t)}" x2="${x(t)}" y1="${felso}" y2="${H - also}"/>`;
    g += `<text class="d-nev" x="${(bal + W - jobb) / 2}" y="${H - 8}" text-anchor="middle">Bruttó átlagkereset, ${utolsoEv} (logaritmikus skála)</text>`;
    g += `<text class="d-nev" x="${bal}" y="${felso - 12}">A bér vásárlóértékének változása ${elsoEv} óta</text>`;
  }
  g += `<line class="nulla" x1="${bal}" x2="${W - jobb}" y1="${y(0)}" y2="${y(0)}"/>`;
  const r = mini ? 2.2 : 4.5;
  g += p.map(f => {
    const c = `<circle class="sz-pont${f.realValt < 0 ? ' veszt' : ''}" cx="${x(f.brutto).toFixed(1)}" cy="${y(f.realValt).toFixed(1)}" r="${r}" data-cs="${f.kod[0]}"${mini ? '' : ` data-nev="${esc(f.nev)}" data-b="${f.brutto}" data-r="${f.realValt.toFixed(4)}"`}/>`;
    return mini ? c : `<a href="/fizetes/${f.slug}/" aria-label="${esc(f.nev)}: ${ft(f.brutto)}, ${f.realValt >= 0 ? '+' : '−'}${szamHu(Math.abs(f.realValt) * 100, 1)}%">${c}</a>`;
  }).join('');
  if (!mini) {
    const jelolt = new Set([[...p].sort((a, b) => b.realValt - a.realValt)[0], [...p].sort((a, b) => a.realValt - b.realValt)[0], [...p].sort((a, b) => b.brutto - a.brutto)[0]]);
    for (const f of jelolt) { const jobbra = x(f.brutto) < W * 0.7; g += `<text class="d-cimke sz-felirat" x="${x(f.brutto) + (jobbra ? 9 : -9)}" y="${y(f.realValt) + 4}" text-anchor="${jobbra ? 'start' : 'end'}">${esc(f.nev)}</text>`; }
  }
  return `<svg class="abra szoras${mini ? ' mini' : ''}" viewBox="0 0 ${W} ${H}" ${mini ? 'aria-hidden="true"' : `role="img" aria-label="Pontdiagram: ${p.length} foglalkozás bruttó átlagkeresete és reálbér-változása ${elsoEv} és ${utolsoEv} között. A pontos értékek az ábra alatti táblázatokban vannak."`}>${g}</svg>`;
}

/** County outlines as a small decorative map (home tile). megyek: [[name, path]], vb: viewBox */
export function megyeTerkep(vb, megyek) {
  return `<svg class="mini-terkep" viewBox="${vb}" aria-hidden="true">${megyek.map(m => `<path d="${m[1]}"/>`).join('')}</svg>`;
}

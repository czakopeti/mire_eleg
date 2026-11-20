// Builds the static site into web/. Node 22, no dependencies.
//   node epit.mjs
import { readFile, writeFile, mkdir, rm, cp, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as S from './forras/js/szamitas.mjs';
import { oldal, slug, nagy, datum, evOs } from './forras/sablon.mjs';
import * as O from './forras/oldalak.mjs';

const GY = dirname(fileURLToPath(import.meta.url));
const J = async f => JSON.parse(await readFile(join(GY, f), 'utf8'));
const WEB = join(GY, 'web');

export async function adatModell() {
  const [cfg, ker, nettoO, inf, lak, auto, szabalyok, nevek, allapot, orsz, geoO] = await Promise.all(['config.json', 'data/kereset.json', 'data/netto_orszagos.json', 'data/inflacio.json', 'data/lakasar.json', 'data/auto.json', 'data/szabalyok.json', 'data/nevek.json', 'data/allapot.json', 'data/orszagos.json', 'forras/geo/orszag.json'].map(J));
  const maEv = Number(new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Budapest' }).slice(0, 4));
  // Tax rules: this year's if present, otherwise the latest known year (and the page says so).
  const szEvek = Object.keys(szabalyok.evek).map(Number).sort((a, b) => a - b);
  const szEv = szEvek.includes(maEv) ? maEv : szEvek.filter(e => e <= maEv).pop() ?? szEvek.pop();
  const sz = szabalyok.evek[szEv];
  const szElteres = szEv !== maEv ? `A ${maEv}. évi szabályokat még nem vettük fel, a kalkulátor a ${evOs(szEv)} szabályokkal számol.` : (sz.atveve ? `A ${szEv}. évi szabályok egy része még ellenőrzés alatt áll.` : '');

  const evek = ker.evek, u = evek.length - 1, utolso = evek[u];
  const foglalt = new Set();
  const fog = [];
  for (const [kod, f] of Object.entries(ker.fog)) {
    if (f.e[u] == null) continue; // no figure for the latest year -> no page
    const aliasok = nevek.nevek[kod] || [];
    const alias = aliasok.length > 0;
    const nev = alias ? nagy(aliasok[0]) : f.n;
    let sl = slug(alias ? aliasok[0] : f.n);
    if (foglalt.has(sl)) sl = `${sl}-${kod}`;
    foglalt.add(sl);
    const nbont = S.netto(sz, { brutto: f.e[u] });
    const real = S.realErtek(evek, f.e, inf.index);
    const elso = f.e.findIndex(v => v != null);
    fog.push({
      kod, n: f.n, nev, alias, aliasok, slug: sl, e: f.e, k: f.k, brutto: f.e[u], netto: nbont.netto, nbont, real,
      egyEv: f.e[u - 1] != null ? f.e[u] / f.e[u - 1] - 1 : null,
      realValt: elso >= 0 && elso < u && real[elso] != null ? f.e[u] / real[elso] - 1 : null,
    });
  }
  const rangsor = [...fog].sort((a, b) => b.brutto - a.brutto);
  rangsor.forEach((f, i) => { f.rang = i + 1; });
  const kodra = Object.fromEntries(fog.map(f => [f.kod, f]));
  const nepszeru = ['2142', '3311', '7524', '2431', '5113', '8417', '4121', '2212'].map(k => kodra[k]).filter(Boolean);
  const mf = kodra['7524'] || rangsor[Math.floor(rangsor.length / 2)];
  const mt = lak.tel.find(t => t.n === 'Debrecen') || lak.tel[0];
  const minta = { f: mf, t: mt, lakas: S.lakas({ nettoHavi: mf.netto, m2Ft: S.m2Ar(mt) }) };
  const frissitve = [ker, nettoO, inf, lak, auto, orsz].map(d => d.ellenorizve).sort().pop();
  return { orsz, geo: { vb: geoO.vb, m: geoO.m }, cfg, ker, nettoO, inf, lak, auto, szabalyok, sz, szEv, szElteres, maEv, evek, utolso, fog, rangsor, kodra, nepszeru, minta, frissitve: allapot.futott || frissitve, orszagNetto: nettoO.osszesen.at(-1), nettoEv: nettoO.evek.at(-1) };
}

const csvSor = a => a.map(x => { const s = String(x ?? ''); return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(';');

async function epit() {
  const A = await adatModell();
  await rm(WEB, { recursive: true, force: true });
  await mkdir(join(WEB, 'assets', 'fonts'), { recursive: true });
  await mkdir(join(WEB, 'adatok', 'v1'), { recursive: true });

  // assets
  const css = await readFile(join(GY, 'forras/css/alap.css'), 'utf8');
  const app = await readFile(join(GY, 'forras/js/app.mjs'), 'utf8');
  const mag = await readFile(join(GY, 'forras/js/szamitas.mjs'), 'utf8');
  const v = createHash('sha1').update(css + app + mag).digest('hex').slice(0, 8);
  await writeFile(join(WEB, 'assets/alap.css'), css);
  await writeFile(join(WEB, 'assets/app.mjs'), app.replace("'./szamitas.mjs'", `'./szamitas.mjs?v=${v}'`));
  await writeFile(join(WEB, 'assets/szamitas.mjs'), mag);
  await cp(join(GY, 'forras/fonts'), join(WEB, 'assets/fonts'), { recursive: true });
  await cp(join(GY, 'forras/kepek/favicon.svg'), join(WEB, 'assets/favicon.svg'));
  await cp(join(GY, 'forras/geo'), join(WEB, 'assets/geo'), { recursive: true });

  // data for the browser and for download
  const b = A.szabalyok.berkuszob.arany;
  await writeFile(join(WEB, 'adatok/kereso.json'), JSON.stringify(A.fog.map(f => [f.kod, f.nev, f.slug, f.alias ? [f.n, ...f.aliasok.slice(1)].join('|') : '', f.brutto, f.netto, f.rang, f.realValt == null ? null : Math.round(f.realValt * 1000) / 1000, f.k.at(-1)])));
  await writeFile(join(WEB, 'adatok/telepulesek.json'), JSON.stringify(A.lak.tel.map(t => [t.kod, t.n, t.m, S.m2Ar(t), t.ev, t.szorzo ? 1 : 0, t.tipus, t.db])));
  await writeFile(join(WEB, 'adatok/v1/kereset.json'), JSON.stringify({ leiras: 'Teljes munkaidőben alkalmazásban állók bruttó átlagkeresete foglalkozásonként (FEOR-08), Ft/fő/hó. e: együtt, évenként; k: korcsoportonként, évenként.', licenc: 'CC BY 4.0', forras: A.ker.forras, letoltve: A.ker.letoltve, ellenorizve: A.ker.ellenorizve, evek: A.evek, korcsoportok: A.ker.korcsoportok, foglalkozasok: Object.fromEntries(A.fog.map(f => [f.kod, { nev: f.n, koznapi: f.aliasok, url: `${A.cfg.domain}/fizetes/${f.slug}/`, e: f.e, k: f.k }])) }));
  await writeFile(join(WEB, 'adatok/v1/szabalyok.json'), JSON.stringify({ licenc: 'CC BY 4.0', ...A.szabalyok }, null, 1));
  const fej = `# Forrás: ${A.ker.forras.nev}; ${A.utolso}. évi adat; letöltve: ${A.ker.ellenorizve}; ${A.cfg.domain}`;
  await writeFile(join(WEB, 'adatok/berkuszob.csv'), '﻿' + [fej, csvSor(['feor', 'foglalkozas', `brutto_atlag_${A.utolso}`, 'kuszob_80_szazalek', 'legkisebb_megfelelo_alapber']), ...[...A.fog].sort((x, y) => x.kod.localeCompare(y.kod)).map(f => { const k = S.berkuszob(f.brutto, b); return csvSor([f.kod, f.n, f.brutto, k.hatarKerek, k.legkisebb]); })].join('\n') + '\n');
  await writeFile(join(WEB, 'adatok/foglalkozasok.csv'), '﻿' + [fej, csvSor(['feor', 'foglalkozas', 'koznapi_nevek', `brutto_${A.utolso}`, `netto_kedvezmeny_nelkul_${A.szEv}_szabalyokkal`, 'brutto_30_alatt', 'brutto_30_39', 'brutto_40_49', 'brutto_50_felett', 'kuszob_80_szazalek', 'url']), ...A.rangsor.map(f => csvSor([f.kod, f.n, f.aliasok.join(', '), f.brutto, f.netto, ...f.k.at(-1).map(x => x ?? ''), S.berkuszob(f.brutto, b).hatarKerek, `${A.cfg.domain}/fizetes/${f.slug}/`]))].join('\n') + '\n');

  // pages
  const k = { cfg: A.cfg, v, frissitve: A.frissitve };
  const lapok = [O.fooldal(A), O.foglalkozasok(A), O.holAllsz(A), O.osszehasonlitas(A), O.terkep(A), O.nyertesek(A), O.kalkulator(A), O.mireEleg(A), O.berkuszob(A), O.forrasok(A), O.adatok(A), O.impresszum(A), ...A.fog.map(f => O.foglalkozas(A, f))];
  for (const l of lapok) {
    const mappa = join(WEB, l.ut);
    await mkdir(mappa, { recursive: true });
    await writeFile(join(mappa, 'index.html'), oldal(l, k));
  }
  await writeFile(join(WEB, '404.html'), oldal({ ut: '404.html', cim: 'Nincs ilyen oldal', leiras: 'A keresett oldal nem található.', tartalom: '<h1>Nincs ilyen oldal</h1><p class="bevezeto">Lehet, hogy elírás van a címben. A <a href="/foglalkozasok/">foglalkozások listájában</a> minden szakmát megtalálsz.</p>', szkript: false }, k));

  // SEO / GEO files
  const d = A.cfg.domain;
  await writeFile(join(WEB, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${lapok.map(l => `<url><loc>${d}/${l.ut}</loc><lastmod>${l.ut.startsWith('fizetes/') || l.ut === '' || l.ut === 'foglalkozasok/' || l.ut === 'berkuszob-kereso/' ? A.ker.letoltve : A.frissitve}</lastmod></url>`).join('\n')}\n</urlset>\n`);
  await writeFile(join(WEB, 'robots.txt'), A.cfg.eles ? `User-agent: *\nAllow: /\n\nSitemap: ${d}/sitemap.xml\n` : `# Test version: pages carry noindex until config.json "eles" is true.\nUser-agent: *\nAllow: /\n`);
  const pelda = ['2142', '3311', '7524', '2431', '8417', '5113'].map(c => A.kodra[c]).filter(Boolean);
  await writeFile(join(WEB, 'llms.txt'), `# ${A.cfg.marka}

> Magyarországi fizetések foglalkozásonként: ${A.fog.length} foglalkozás (FEOR-08) bruttó átlagkeresete a KSH ${A.utolso}. évi adataiból, számított nettóval (${A.szEv}. évi szabályok), korcsoportos bontással, inflációval korrigált idősorral ${A.evek[0]} óta, lakásvásárlási összevetéssel és a harmadik országbeli munkavállalók 80 százalékos bérküszöbével. Az adatok hetente, maguktól frissülnek. Utolsó ellenőrzés: ${A.frissitve}.

## Fő oldalak
- [Minden foglalkozás](${d}/foglalkozasok/): bruttó és nettó átlagkereset FEOR-főcsoportonként
- [Hol állsz?](${d}/hol-allsz/): a saját bér összevetése a szakma, a korcsoport és az ország átlagával, mediánjával
- [Szakmák összehasonlítása](${d}/osszehasonlitas/): két-három foglalkozás bére, pályaíve, reálbére
- [Megfizethetőségi térkép](${d}/terkep/): hol hány év alatt jön ki egy lakás egy adott bérből
- [Nyertesek és vesztesek](${d}/nyertesek-vesztesek/): minden szakma reálbér-változása ${A.evek[0]} óta
- [Bruttó–nettó kalkulátor](${d}/brutto-netto-kalkulator/): szja 15%, tb-járulék 18,5%, 25 év alattiak kedvezménye (havi ${S.ft(A.sz.fiatal25.ertek)}-ig), anyák szja-mentessége, családi kedvezmény
- [Mire elég?](${d}/mire-eleg/): hány év alatt jön ki egy lakás a nettó bérből, ${A.lak.tel.length} település áraival
- [Bérküszöb-kereső](${d}/berkuszob-kereso/): harmadik országbeli munkavállaló alapbérének meg kell haladnia a FEOR-kód szerinti országos bruttó átlagkereset 80%-át (445/2013. (XI. 28.) Korm. rendelet 6. § (3), 20. § (6))
- [Források és módszertan](${d}/forrasok/)

## Példák (bruttó átlag, ${A.utolso}; nettó kedvezmények nélkül)
${pelda.map(f => `- [${f.nev}](${d}/fizetes/${f.slug}/) (FEOR ${f.kod}, ${f.n}): bruttó ${S.ft(f.brutto)}, nettó ${S.ft(f.netto)}`).join('\n')}

## Gépi adatok (CC BY 4.0)
- [foglalkozasok.csv](${d}/adatok/foglalkozasok.csv): minden foglalkozás egy sorban
- [berkuszob.csv](${d}/adatok/berkuszob.csv): bérküszöb FEOR-kódonként
- [kereset.json](${d}/adatok/v1/kereset.json): teljes idősor korcsoportonként
- [szabalyok.json](${d}/adatok/v1/szabalyok.json): adószabályok forrással

## Megjegyzések
- A KSH foglalkozásonként átlagot közöl, mediánt nem; az átlag magasabb a jellemző bérnél.
- Forrás: ${A.ker.forras.nev} (${A.ker.forras.fajl}).
- Idézéskor: „KSH, ${A.cfg.marka}”.
`);
  await writeFile(join(WEB, '_headers'), `/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n/adatok/*\n  Cache-Control: public, max-age=3600\n  Access-Control-Allow-Origin: *\n/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n`);
  const n = (await readdir(join(WEB, 'fizetes'))).length;
  console.log(`Kész: ${lapok.length} oldal (${n} foglalkozás), adatok: KSH ${A.utolso}, szabályok: ${A.szEv}, verzió: ${v}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await epit();

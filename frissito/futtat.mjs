// Weekly updater: downloads every source, validates it, and rewrites data/*.json only if the content changed.
// If a source is unreachable or looks wrong, the old data stays and the problem is printed to stdout (-> GitHub issue).
// Usage: node frissito/futtat.mjs            (network)
//        FORRAS_MAPPA=/path node frissito/futtat.mjs   (reads the same file names from a local folder, for testing)
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as K from './ksh.mjs';

const GYOKER = join(dirname(fileURLToPath(import.meta.url)), '..');
const D = f => join(GYOKER, 'data', f);
const MA = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Budapest' });

export const FORRASOK = {
  kereset: { url: 'https://www.ksh.hu/stadat_files/mun/hu/mun0208.csv', lap: 'https://www.ksh.hu/stadat_files/mun/hu/mun0208.html', nev: 'KSH STADAT 20.1.1.52. Teljes munkaidőben alkalmazásban állók bruttó átlagkeresete foglalkozások szerint', fajl: 'mun0208.csv' },
  netto: { url: 'https://www.ksh.hu/stadat_files/mun/hu/mun0188.csv', lap: 'https://www.ksh.hu/stadat_files/mun/hu/mun0188.html', nev: 'KSH STADAT 20.1.1.58. Nettó átlagkereset a munkavállalók főbb demográfiai jellemzői szerint', fajl: 'mun0188.csv' },
  orszagos: { url: 'https://www.ksh.hu/stadat_files/mun/hu/mun0143.csv', lap: 'https://www.ksh.hu/stadat_files/mun/hu/mun0143.html', nev: 'KSH STADAT 20.2.1.39. Főbb kereseti adatok, havonta és kumulálva', fajl: 'mun0143.csv' },
  telepkereset: { url: 'https://raw.githubusercontent.com/czakopeti/lakaskoltseg/main/data/kereset.json', lap: 'https://map.ksh.hu/timea/?locale=hu', nev: 'KSH TIMEA: nettó átlagkereset a munkavállalók lakcíme szerint (az Ingatlanmérleg adatgyűjtéséből)', fajl: 'kereset-telep.json' },
  inflacio: { url: 'https://www.ksh.hu/stadat_files/ara/hu/ara0001.csv', lap: 'https://www.ksh.hu/stadat_files/ara/hu/ara0001.html', nev: 'KSH STADAT 1.1.1.1. Főbb ármutatók (fogyasztóiár-index)', fajl: 'ara0001.csv' },
  lakasar: { url: 'https://ingatlanmerleg.hu/adatok/lakasarak/arak.json', lap: 'https://ingatlanmerleg.hu/lakasarak/', nev: 'Ingatlanmérleg: településenkénti lakásárak (KSH Ingatlanadattár alapján)', fajl: 'arak.json' },
  auto: { url: 'https://autozom.hu/adatok/v1/nav-uzemanyagar.json', lap: 'https://autozom.hu/nav-uzemanyagar/', nev: 'autózom: NAV havi üzemanyagárak', fajl: 'nav-uzemanyagar.json' },
  fiatal: { url: 'https://nav.gov.hu/ado/szja/25-ev-alatti-fiatalok-kedvezmenye', fajl: 'nav-25.html' },
};

async function leker(f) {
  if (process.env.FORRAS_MAPPA) return readFile(join(process.env.FORRAS_MAPPA, f.fajl));
  let hiba;
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(f.url, { headers: { 'user-agent': 'mire-eleg-frissito (github.com/czakopeti/mire_eleg)' }, signal: AbortSignal.timeout(40000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return Buffer.from(await r.arrayBuffer());
    } catch (e) { hiba = e; await new Promise(r => setTimeout(r, 3000 * (i + 1))); }
  }
  throw new Error(`${f.url}: ${hiba.message}`);
}
const olvas = async f => existsSync(D(f)) ? JSON.parse(await readFile(D(f), 'utf8')) : null;
/** Writes only when the data part changed, so "letoltve" does not create a commit every week. */
async function ir(f, uj, regi) {
  const mag = o => JSON.stringify({ ...o, letoltve: undefined, ellenorizve: undefined });
  if (regi && mag(regi) === mag(uj)) { regi.ellenorizve = MA; await writeFile(D(f), JSON.stringify(regi) + '\n'); return false; }
  await writeFile(D(f), JSON.stringify(uj) + '\n'); return true;
}

const jelentes = [];
const lepes = async (nev, fn) => { try { await fn(); } catch (e) { jelentes.push(`- **${nev}**: ${e.message} A korábbi adat maradt érvényben.`); console.error(`[hiba] ${nev}: ${e.message}`); } };

await mkdir(join(GYOKER, 'data'), { recursive: true });

await lepes('KSH foglalkozásonkénti keresetek (mun0208)', async () => {
  const regi = await olvas('kereset.json');
  const t = K.keresetTabla(K.dekodol(await leker(FORRASOK.kereset)));
  K.keresetEllenor(t, regi);
  const uj = { forras: { nev: FORRASOK.kereset.nev, url: FORRASOK.kereset.lap, fajl: FORRASOK.kereset.url }, letoltve: MA, ellenorizve: MA, korcsoportok: K.KORCSOPORTOK, evek: t.evek, fog: t.fog };
  if (regi) {
    uj.letoltve = regi.letoltve;
    const ru = regi.evek.at(-1), uu = uj.evek.at(-1);
    if (uu > ru) { uj.letoltve = MA; jelentes.push(`- **Új év a KSH-táblában**: megjelent a ${uu}. évi foglalkozásonkénti kereset. Az oldal magától átállt rá; nézd át a főoldalt és egy-két foglalkozást.`); }
    const ujKod = Object.keys(uj.fog).filter(k => !regi.fog[k]);
    if (ujKod.length) jelentes.push(`- **Új FEOR-kódok**: ${ujKod.join(', ')}. Köznapi nevet a data/nevek.json fájlban adhatsz nekik.`);
  }
  if (await ir('kereset.json', uj, regi) && regi) console.error('kereset.json frissült');
});

await lepes('KSH országos nettó átlagkereset (mun0188)', async () => {
  const t = K.nettoTabla(K.dekodol(await leker(FORRASOK.netto)));
  await ir('netto_orszagos.json', { forras: { nev: FORRASOK.netto.nev, url: FORRASOK.netto.lap, fajl: FORRASOK.netto.url }, letoltve: MA, ellenorizve: MA, ...t }, await olvas('netto_orszagos.json'));
});

await lepes('KSH országos átlag és medián (mun0143)', async () => {
  const t = K.orszagosHavi(K.dekodol(await leker(FORRASOK.orszagos)));
  await ir('orszagos.json', { forras: { nev: FORRASOK.orszagos.nev, url: FORRASOK.orszagos.lap, fajl: FORRASOK.orszagos.url }, letoltve: MA, ellenorizve: MA, ...t }, await olvas('orszagos.json'));
});

await lepes('KSH havi keresetek (mun0143)', async () => {
  const sor = K.haviSor(K.dekodol(await leker(FORRASOK.orszagos)));
  const regi = await olvas('havi.json');
  if (regi && sor.length > regi.sor.length) { const u = sor.at(-1); jelentes.push(`- **Új havi béradat**: megjelent a ${u.ev}. ${u.ho}. havi kereset. A Bérbarométer és az RSS magától frissült.`); }
  await ir('havi.json', { forras: { nev: FORRASOK.orszagos.nev, url: FORRASOK.orszagos.lap, fajl: FORRASOK.orszagos.url }, letoltve: MA, ellenorizve: MA, sor }, regi);
});

await lepes('Települési nettó keresetek (KSH TIMEA)', async () => {
  const t = K.telepKereset(JSON.parse((await leker(FORRASOK.telepkereset)).toString('utf8')));
  await ir('telepkereset.json', { forras: { nev: FORRASOK.telepkereset.nev, url: FORRASOK.telepkereset.lap, fajl: FORRASOK.telepkereset.url }, letoltve: MA, ellenorizve: MA, ...t }, await olvas('telepkereset.json'));
});

await lepes('KSH fogyasztóiár-index (ara0001)', async () => {
  const index = K.inflacioTabla(K.dekodol(await leker(FORRASOK.inflacio)));
  await ir('inflacio.json', { forras: { nev: FORRASOK.inflacio.nev, url: FORRASOK.inflacio.lap, fajl: FORRASOK.inflacio.url }, letoltve: MA, ellenorizve: MA, index }, await olvas('inflacio.json'));
});

await lepes('Ingatlanmérleg lakásárak (arak.json)', async () => {
  const l = K.lakasarLista(JSON.parse((await leker(FORRASOK.lakasar)).toString('utf8')));
  await ir('lakasar.json', { forras: { nev: FORRASOK.lakasar.nev, url: FORRASOK.lakasar.lap, fajl: FORRASOK.lakasar.url, eredeti: l.forras }, letoltve: MA, ellenorizve: MA, forrasKelt: l.ellenorizve, evek: l.evek, utolsoEv: l.utolsoEv, becslesCimke: l.becslesCimke, tel: l.tel }, await olvas('lakasar.json'));
});

await lepes('autózom üzemanyagár', async () => {
  const u = K.uzemanyag(JSON.parse((await leker(FORRASOK.auto)).toString('utf8')));
  await ir('auto.json', { forras: { nev: FORRASOK.auto.nev, url: FORRASOK.auto.lap, fajl: FORRASOK.auto.url, eredeti: u.forras }, letoltve: MA, ellenorizve: MA, forrasKelt: u.ellenorizve, honap: u.honap, kozzeteve: u.kozzeteve, benzin: u.benzin, dizel: u.dizel }, await olvas('auto.json'));
});

// Tax rules: the under-25 cap is the only figure that changes every year by itself; NAV publishes it on a fixed page.
await lepes('NAV: 25 év alattiak kedvezményének havi összege', async () => {
  const sz = await olvas('szabalyok.json');
  const ev = Number(MA.slice(0, 4));
  const utolso = Math.max(...Object.keys(sz.evek).map(Number));
  let html; try { html = (await leker(FORRASOK.fiatal)).toString('utf8'); } catch (e) { if (process.env.FORRAS_MAPPA) return; throw e; }
  for (const e of [ev, ev + 1]) {
    const v = K.fiatalHatar(html, e);
    if (v == null) continue;
    if (!sz.evek[e]) {
      sz.evek[e] = structuredClone(sz.evek[utolso]);
      sz.evek[e].fiatal25.ertek = v; sz.evek[e].fiatal25.ellenorizve = MA;
      sz.evek[e].atveve = `A ${utolso}. évi szabályokból átvéve, a 25 év alattiak határa a NAV oldaláról frissítve (${MA}). A többi tételt ellenőrizni kell.`;
      jelentes.push(`- **${e}. évi adószabályok**: a NAV közzétette a 25 év alattiak ${e}. évi határát (${v.toLocaleString('hu-HU')} Ft). A többi ${e}. évi szabályt a ${utolso}. éviből vettem át: ellenőrizd a data/szabalyok.json fájlban (szja, tb-járulék, családi kedvezmény, anyák kedvezményei).`);
    } else if (sz.evek[e].fiatal25.ertek !== v) {
      jelentes.push(`- **25 év alattiak kedvezménye ${e}**: a NAV oldalán ${v.toLocaleString('hu-HU')} Ft áll, nálunk ${sz.evek[e].fiatal25.ertek.toLocaleString('hu-HU')} Ft volt. Átírtam a NAV értékére.`);
      sz.evek[e].fiatal25.ertek = v; sz.evek[e].fiatal25.ellenorizve = MA;
    } else sz.evek[e].fiatal25.ellenorizve = MA;
  }
  if (!sz.evek[ev]) jelentes.push(`- **Hiányoznak a ${ev}. évi adószabályok**: az oldal a ${utolso}. évivel számol, és ezt ki is írja. Vedd fel a ${ev}. évet a data/szabalyok.json fájlba.`);
  await writeFile(D('szabalyok.json'), JSON.stringify(sz, null, 2) + '\n');
});

await writeFile(D('allapot.json'), JSON.stringify({ futott: MA }, null, 2) + '\n');
if (jelentes.length) console.log(`Adatfrissítés, ${MA}.\n\n${jelentes.join('\n')}\n`);

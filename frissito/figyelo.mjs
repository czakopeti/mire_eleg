// Source watcher: laws cannot update themselves, so every week we check that the page each rule is based on
// still contains the key phrase or number ("kulcs"). A missing phrase is printed to stdout (-> GitHub issue).
// A page that cannot be downloaded is reported separately and softly; it is not proof of a change.
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const GY = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Collects { nev, url, kulcs } from the rules file. Exported for the tests. */
export function figyeltek(sz, ev) {
  const s = sz.evek[ev], ki = [];
  if (s.fiatal25?.kulcs) ki.push({ nev: s.fiatal25.nev, url: s.fiatal25.forras.url, kulcs: s.fiatal25.kulcs });
  for (const j of s.anyak?.jogcimek || []) if (j.kulcs) ki.push({ nev: j.nev, url: j.forras.url, kulcs: j.kulcs });
  for (const m of Object.values(sz.minimalber?.evek || {})) if (m.kulcs) ki.push({ nev: `Minimálbér (${m.hely})`, url: m.forras.url, kulcs: m.kulcs });
  if (sz.berkuszob?.kulcs) ki.push({ nev: sz.berkuszob.nev, url: sz.berkuszob.forras.url, kulcs: sz.berkuszob.kulcs });
  return ki;
}
export const szovegge = html => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;| /g, ' ').replace(/\s+/g, ' ');
export const benneVan = (html, kulcs) => szovegge(html).toLowerCase().includes(kulcs.toLowerCase());

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const sz = JSON.parse(await readFile(join(GY, 'data/szabalyok.json'), 'utf8'));
  const ev = Math.max(...Object.keys(sz.evek).map(Number));
  const valtozott = [], elerhetetlen = [];
  for (const f of figyeltek(sz, ev)) {
    try {
      const r = await fetch(f.url, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; mire-eleg-figyelo)' }, signal: AbortSignal.timeout(40000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const html = await r.text();
      if (szovegge(html).length < 500) throw new Error('az oldal szövege nem olvasható géppel');
      if (!benneVan(html, f.kulcs)) valtozott.push(`- **${f.nev}**: a forrásoldalon már nem szerepel ez: „${f.kulcs}”. Nézd meg, változott-e a szabály: ${f.url}`);
    } catch (e) { elerhetetlen.push(`- ${f.nev}: ${f.url} (${e.message})`); }
  }
  if (valtozott.length) console.log(`Forrásfigyelő: megváltozhatott egy szabály.\n\n${valtozott.join('\n')}\n`);
  if (elerhetetlen.length) console.error(`Nem sikerült ellenőrizni:\n${elerhetetlen.join('\n')}`);
}

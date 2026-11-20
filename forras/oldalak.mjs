// Page contents. Every number comes from the data files; nothing is typed in by hand.
import { esc, datum, evBan, evOs, forras, korOszlopok, trendVonal, szoras, megyeTerkep, nagy } from './sablon.mjs';
import * as S from './js/szamitas.mjs';
const { ft, szamHu, szazalek, idotartam } = S;

export const FOCSOPORT = {
  1: 'Vezetők, törvényhozók', 2: 'Felsőfokú képzettséget igénylő foglalkozások', 3: 'Technikusok, ügyintézők, asszisztensek',
  4: 'Irodai és ügyfélkapcsolati foglalkozások', 5: 'Kereskedelem és szolgáltatás', 6: 'Mezőgazdaság és erdőgazdálkodás',
  7: 'Ipari és építőipari szakmák', 8: 'Gépkezelők, összeszerelők, járművezetők', 9: 'Szakképzettséget nem igénylő foglalkozások', 0: 'Fegyveres szervek',
};
const MINTA_TELEPULES = ['Budapest XIII. kerület', 'Budapest XI. kerület', 'Debrecen', 'Szeged', 'Győr', 'Pécs', 'Miskolc', 'Nyíregyháza'];

const az = s => /^[aáeéiíoóöőuúüű5]|^1(\d{3})?\b/i.test(String(s).trim()) ? 'az' : 'a';
const KOR_NEV = ['30 év alattiak', '30–39 évesek', '40–49 évesek', '50 év felettiek'];
const elojel = x => `${x >= 0 ? '+' : '−'}${szamHu(Math.abs(x) * 100, 1)}%`;
const adatBlokk = (id, o) => `<script type="application/json" id="${id}">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;
const kerForras = A => forras({ ...A.ker.forras, letoltve: A.ker.ellenorizve }, `${A.utolso}. évi adat`);
const lakForras = A => forras({ ...A.lak.forras, letoltve: A.lak.ellenorizve }, `${A.lak.utolsoEv}. évi tényadat${A.lak.becslesCimke ? `, a mai árat az Ingatlanmérleg becsli (${A.lak.becslesCimke})` : ''}`);
const szabalyJegy = A => `A nettó a ${evOs(A.szEv)} szabályokkal számolt saját érték (15% szja, 18,5% tb-járulék, kedvezmények nélkül). <a href="/forrasok/#szabalyok">A szabályok forrásai</a>`;
const fogLink = f => `<a href="/fizetes/${f.slug}/">${esc(f.nev)}</a>`;
const gyik = lista => `<section class="gyik"><h2>Gyakori kérdések</h2>${lista.map(([k, v]) => `<details><summary>${esc(k)}</summary><p>${v}</p></details>`).join('')}</section>`;
const gyikLd = lista => ({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: lista.map(([k, v]) => ({ '@type': 'Question', name: k, acceptedAnswer: { '@type': 'Answer', text: v.replace(/<[^>]+>/g, '') } })) });
const sor = (cimke, ertek, osztaly = '') => `<div class="szalag-sor ${osztaly}"><span>${cimke}</span><b>${ertek}</b></div>`;

const kereso = (helyorzo = 'Foglalkozás neve vagy FEOR-kódja', cimke = 'Keresd meg a foglalkozásodat', mod = '') => `<div class="kereso" data-kereso="${mod}">
  <label for="k-be">${cimke}</label>
  <input id="k-be" type="search" autocomplete="off" placeholder="${helyorzo}" aria-controls="k-lista" inputmode="search">
  <ul id="k-lista" class="k-lista" hidden></ul>
</div>`;

// ------------------------------------------------------------------ home
export function fooldal(A) {
  const top = A.rangsor.slice(0, 8), also = A.rangsor.slice(-8).reverse();
  const valt = A.fog.filter(f => f.realValt != null);
  const nott = [...valt].sort((a, b) => b.realValt - a.realValt).slice(0, 8);
  const nyert = valt.filter(f => f.realValt > 0).length;
  const m = A.minta, f = m.f;
  const lista = (cim, fogl, ertek, megj) => `<section class="lista"><h3>${cim}</h3><ol>${fogl.map(g => `<li>${fogLink(g)}<b>${ertek(g)}</b></li>`).join('')}</ol><p class="apro">${megj}</p></section>`;
  return {
    ut: '', cim: `Mire elég a fizetésed? Fizetések foglalkozásonként ${A.utolso}`,
    leiras: `${A.fog.length} foglalkozás bruttó és nettó átlagkeresete a KSH ${A.utolso}. évi adataiból: korcsoportok, reálbér ${A.evek[0]} óta, és hogy hány év alatt jön ki belőle egy lakás.`,
    jsonld: [{ '@context': 'https://schema.org', '@type': 'WebSite', name: A.cfg.marka, url: `${A.cfg.domain}/`, inLanguage: 'hu', description: A.cfg.szlogen },
      { '@context': 'https://schema.org', '@type': 'Dataset', name: `Bruttó és nettó átlagkeresetek foglalkozásonként, ${A.evek[0]}–${A.utolso}`, description: `A teljes munkaidőben alkalmazásban állók bruttó átlagkeresete ${A.fog.length} FEOR-08 foglalkozásra, korcsoportonként, a KSH adataiból, számított nettóval és bérküszöbbel.`, url: `${A.cfg.domain}/adatok/`, license: 'https://creativecommons.org/licenses/by/4.0/', isBasedOn: A.ker.forras.url, temporalCoverage: `${A.evek[0]}/${A.utolso}`, dateModified: A.ker.letoltve, creator: { '@type': 'Organization', name: A.cfg.marka } }],
    tartalom: `<section class="hos teljes">
  <div class="hos-szoveg">
    <h1>Mire elég a fizetésed?</h1>
    <p class="bevezeto">${A.fog.length} szakma hivatalos béradata egy helyen. Írd be a tiédet, és kinyomtatjuk a bérszalagját: mennyi a bruttó, mennyi marad belőle, és hol áll a többi szakma között.</p>
    ${kereso('pl. ápoló, programozó, 7524', 'Írd be a szakmádat', 'szalag')}
    <p class="gyors">${A.nepszeru.map(g => `<button type="button" data-hos-kod="${g.kod}">${esc(g.nev)}</button>`).join('')}</p>
  </div>
  <aside class="szalag hos-szalag" data-hos-szalag aria-live="polite">
    <p class="szalag-fej">Minta: ${esc(f.nev.toLocaleLowerCase('hu'))}<span>KSH, ${A.utolso}</span></p>
    ${sor('Bruttó átlagkereset', ft(f.brutto))}
    ${sor('Szja (15%)', `− ${ft(f.nbont.szja)}`)}
    ${sor('Tb-járulék (18,5%)', `− ${ft(f.nbont.tb)}`)}
    ${sor('Nettó', `<span data-szamlal="${f.netto}">${ft(f.netto)}</span>`, 'ossz')}
    <p class="szalag-lab">A ${A.rangsor.length} szakma között a ${f.rang}. A bér vásárlóértéke ${A.evek[0]} óta ${elojel(f.realValt)}. <a href="/fizetes/${f.slug}/">A teljes oldal</a></p>
  </aside>
</section>
<section class="bento" aria-label="Eszközök">
  <a class="csempe nagy" href="/terkep/"><div><h2>Hol ér a legtöbbet a fizetésed?</h2><p>Térkép ${A.lak.tel.length} település lakásáraival. Megmutatja, a te béredből hol hány év alatt jön ki egy lakás.</p></div>${megyeTerkep(A.geo.vb, A.geo.m)}</a>
  <a class="csempe" href="/hol-allsz/"><h2>Hol állsz?</h2><p>Hasonlítsd a béredet a szakmád, a korosztályod és az ország átlagához.</p><p class="csempe-szam"><b>${ft(A.orsz.bruttoMedian)}</b>az országos bruttó medián, ${A.orsz.ev}. ${esc(A.orsz.idoszak)}</p></a>
  <a class="csempe" href="/nyertesek-vesztesek/"><h2>Nyertesek és vesztesek</h2><p>${valt.length} szakmából ${nyert}-ben ér többet a bér, mint ${evBan(A.evek[0])}.</p>${szoras(A.fog, { mini: true })}</a>
  <a class="csempe" href="/osszehasonlitas/"><h2>Szakmák egymás mellett</h2><p>Két-három foglalkozás bére, pályaíve és reálbére egy ábrán.</p></a>
  <a class="csempe" href="/brutto-netto-kalkulator/"><h2>Bruttó–nettó kalkulátor</h2><p>A ${evOs(A.szEv)} szabályokkal, családi és anyakedvezménnyel.</p></a>
  <a class="csempe" href="/berkuszob-kereso/"><h2>Bérküszöb-kereső</h2><p>HR-eseknek: a 80%-os küszöb FEOR-kódonként.</p></a>
</section>
<section class="harom">
  ${lista('A legjobban fizető foglalkozások', top, g => ft(g.brutto), `Bruttó átlagkereset, ${A.utolso}.`)}
  ${lista('A legkevésbé fizetők', also, g => ft(g.brutto), `Bruttó átlagkereset, ${A.utolso}.`)}
  ${lista(`Itt nőtt a legtöbbet a reálbér`, nott, g => elojel(g.realValt), `${A.evek[0]}–${A.utolso}, inflációval korrigálva.`)}
</section>
${kerForras(A)}
${forras({ ...A.orsz.forras, letoltve: A.orsz.ellenorizve }, `országos medián, ${A.orsz.ev}. ${A.orsz.idoszak}`)}
<section class="szoveg">
  <h2>Miben más ez, mint egy fizetési toplista?</h2>
  <p>A számok a KSH hivatalos adatai. Minden foglalkozásnak saját oldala van a köznapi nevével együtt, így a „programozó” és a „villanyszerelő” is megtalálható akkor is, ha a hivatalos FEOR-megnevezést nem ismered.</p>
  <p>Az oldal magától frissül. Amikor a KSH közzéteszi a következő év adatait, minden szám, ábra és rangsor átáll. Az adószabályokat hetente összevetjük a NAV és a Nemzeti Jogszabálytár oldalaival. Minden szám mellett ott a forrása és a letöltés napja.</p>
  <p>Egy korlátot érdemes ismerned. A KSH foglalkozásonként átlagot közöl, mediánt nem. Az átlagot néhány kiugróan magas fizetés felfelé húzza, ezért a szakmádban dolgozók többsége jellemzően az átlag alatt keres.</p>
</section>`,
  };
}

// ------------------------------------------------------------------ occupation
export function foglalkozas(A, f) {
  const u = A.evek.length - 1;
  const kor = f.k[u], korNetto = kor.map(v => v == null ? null : S.netto(A.sz, { brutto: v }).netto);
  const korCimke = ['30 alatt', '30–39', '40–49', '50 felett'];
  const vanKor = kor.filter(v => v != null).length >= 2;
  const csucsIx = kor.indexOf(Math.max(...kor.filter(v => v != null)));
  const elsoEv = A.evek[f.e.findIndex(v => v != null)];
  const real = f.real, eloz = f.e[u - 1];
  const kuszob = S.berkuszob(f.brutto, A.szabalyok.berkuszob.arany);
  const hasonlo = A.fog.filter(g => g.kod !== f.kod && g.kod.slice(0, 2) === f.kod.slice(0, 2)).sort((a, b) => Math.abs(a.kod - f.kod) - Math.abs(b.kod - f.kod)).slice(0, 6);
  const tel = MINTA_TELEPULES.map(n => A.lak.tel.find(t => t.n === n)).filter(Boolean);
  const egy = f.alias ? `egy ${f.nev.toLocaleLowerCase('hu')}` : null;
  const kisNev = f.alias ? f.nev.toLocaleLowerCase('hu') : `„${f.n}”`;
  const bp = tel[0] ? S.lakas({ nettoHavi: f.netto, m2Ft: S.m2Ar(tel[0]) }) : null;

  const kerdesek = [
    [egy ? `Mennyit keres ${egy} ${evBan(A.utolso)}?` : `Mennyi ${az(f.n)} „${f.n}” foglalkozás átlagkeresete?`,
      `A KSH adatai szerint ${az(f.n)} „${f.n}” (FEOR ${f.kod}) foglalkozásban a teljes munkaidős alkalmazottak bruttó átlagkeresete ${evBan(A.utolso)} havi ${ft(f.brutto)} volt. Ez kedvezmények nélkül nettó ${ft(f.netto)}.`],
    ['Miért lehet a fizetésem alacsonyabb az itt látott átlagnál?',
      `Az átlagot a kiugróan magas bérek felfelé húzzák, ezért a dolgozók többsége az átlag alatt keres. Számít az is, hogy hol dolgozol, mekkora cégnél és hány éve. ${vanKor ? `Ebben a foglalkozásban például ${az(KOR_NEV[csucsIx])} ${KOR_NEV[csucsIx]} átlaga a legmagasabb.` : ''} Az adat a pótlékokat, a prémiumot és a jutalmat is tartalmazza.`],
    [`Mennyi a ${f.kod} FEOR-kód bérküszöbe harmadik országbeli munkavállalónál?`,
      `Az alapbérnek meg kell haladnia a ${ft(f.brutto)} országos bruttó átlagkereset 80 százalékát, vagyis ${ft(kuszob.hatarKerek)} fölött kell lennie (${A.szabalyok.berkuszob.hely.split(',')[0]}).`],
  ];
  if (bp) kerdesek.push([`Hány év alatt jön ki ebből a fizetésből egy lakás?`, `Egy 50 négyzetméteres lakás becsült ára itt: ${esc(tel[0].n)}, ${ft(bp.ar)}. Ez ${szamHu(bp.ev, 1)} évnyi teljes nettó bér ebben a foglalkozásban. A <a href="/mire-eleg/?f=${f.kod}">Mire elég?</a> oldalon a saját településeddel és megtakarítási arányoddal is kiszámolhatod.`]);

  return {
    ut: `fizetes/${f.slug}/`,
    cim: `${f.nev} fizetés ${A.utolso}: bruttó ${szamHu(Math.round(f.brutto / 1000))} ezer Ft, nettó ${szamHu(Math.round(f.netto / 1000))} ezer Ft`,
    leiras: `${f.nev}${f.alias ? ` (${f.n}, FEOR ${f.kod})` : ` (FEOR ${f.kod})`}: bruttó átlagkereset ${ft(f.brutto)}, nettó ${ft(f.netto)} a KSH ${A.utolso}. évi adatai szerint. Korcsoportok, reálbér ${elsoEv} óta, lakás és bérküszöb.`,
    morzsa: [['foglalkozasok/', 'Foglalkozások'], [`fizetes/${f.slug}/`, f.nev]],
    jsonld: [{
      '@context': 'https://schema.org', '@type': 'Occupation', name: f.n, alternateName: f.aliasok.length ? f.aliasok : undefined,
      occupationalCategory: `FEOR-08 ${f.kod}`, occupationLocation: { '@type': 'Country', name: 'Magyarország' },
      estimatedSalary: [{ '@type': 'MonetaryAmount', name: `Bruttó átlagkereset, ${A.utolso}`, currency: 'HUF', value: { '@type': 'QuantitativeValue', value: f.brutto, unitText: 'MONTH' } }],
      mainEntityOfPage: { '@type': 'WebPage', lastReviewed: A.ker.ellenorizve },
    }, gyikLd(kerdesek)],
    tartalom: `<article class="fog">
<header class="fog-fej">
  <p class="cimkek"><span>FEOR ${f.kod}</span><a href="/foglalkozasok/#cs${f.kod[0]}">${esc(FOCSOPORT[f.kod[0]])}</a></p>
  <h1>${egy ? `Mennyit keres ${esc(egy)}?` : `${esc(f.n)}: fizetés ${A.utolso}`}</h1>
  ${f.alias ? `<p class="hivatalos">Hivatalos megnevezés: <b>${esc(f.n)}</b>${f.aliasok.length > 1 ? `. Így is keresik: ${f.aliasok.slice(1).map(esc).join(', ')}` : ''}.</p>` : ''}
</header>
<div class="ketto">
  <div class="szalag">
    <p class="szalag-fej">Havi átlagkereset<span>KSH, ${A.utolso}</span></p>
    ${sor('Bruttó', ft(f.brutto))}
    ${sor('Szja (15%)', `− ${ft(f.nbont.szja)}`)}
    ${sor('Tb-járulék (18,5%)', `− ${ft(f.nbont.tb)}`)}
    ${sor('Nettó', ft(f.netto), 'ossz')}
    <p class="szalag-lab">${szabalyJegy(A)}. Kedvezménnyel több marad: <a href="/brutto-netto-kalkulator/?b=${f.brutto}">számold ki a sajátodat</a>.</p>
  </div>
  <div class="tenyek">
    <div class="teny"><span>Helyezés</span><b>${f.rang}.</b><small>a ${A.rangsor.length} foglalkozás közül</small></div>
    ${eloz != null ? `<div class="teny"><span>Egy év alatt</span><b>${elojel(f.brutto / eloz - 1)}</b><small>${A.evek[u - 1]} → ${A.utolso}, bruttó</small></div>` : ''}
    ${f.realValt != null ? `<div class="teny"><span>Reálbér ${elsoEv} óta</span><b>${elojel(f.realValt)}</b><small>inflációval korrigálva</small></div>` : ''}
    <div class="teny"><span>Az országos nettó átlaghoz képest</span><b>${szamHu(f.netto / A.orszagNetto * 100)}%</b><small>országos: ${ft(A.orszagNetto)} (KSH, ${A.nettoEv})</small></div>
  </div>
</div>
${kerForras(A)}
<p class="muveletek"><a class="gomb" href="/hol-allsz/?f=${f.kod}">Hol állsz ebben a szakmában?</a><a class="gomb masod" href="/osszehasonlitas/?a=${f.kod}">Összehasonlítás más szakmával</a><a class="gomb masod" href="/terkep/?f=${f.kod}">Térképen</a></p>

${vanKor ? `<section>
  <h2>Pályaív: mennyit keresnek korcsoportonként?</h2>
  <p>${kor[0] != null && kor[csucsIx] != null && csucsIx !== 0 ? `A 30 év alattiak bruttó átlagkeresete ${ft(kor[0])}. A legtöbbet ${az(KOR_NEV[csucsIx])} ${KOR_NEV[csucsIx]} keresik, bruttó ${ft(kor[csucsIx])}-ot, ami ${szamHu((kor[csucsIx] / kor[0] - 1) * 100)}%-kal több.` : `Ebben a foglalkozásban a 30 év alattiak átlaga a legmagasabb, bruttó ${ft(kor[0])}.`} ${kor[3] != null && csucsIx !== 3 && csucsIx !== 0 ? `Az 50 év felettiek átlaga ${ft(kor[3])}.` : ''}</p>
  <figure>${korOszlopok(korCimke, kor, korNetto.map(v => v == null ? '' : `nettó ${szamHu(Math.round(v / 1000))} e Ft`))}</figure>
  <p class="apro">Bruttó átlagkereset, alatta a kedvezmények nélkül számolt nettó. A 25 év alattiak és az szja-mentes anyák nettója ennél magasabb.</p>
  ${kerForras(A)}
</section>` : ''}

<section>
  <h2>Hogyan változott a bér ${elsoEv} óta?</h2>
  <p>${f.realValt != null ? `A bruttó átlagkereset ${elsoEv} és ${A.utolso} között ${ft(f.e[A.evek.indexOf(elsoEv)])}-ról ${ft(f.brutto)}-ra változott. Az infláció levonása után a fizetés ${f.realValt >= 0 ? `${szamHu(f.realValt * 100, 1)}%-kal többet` : `${szamHu(-f.realValt * 100, 1)}%-kal kevesebbet`} ér, mint ${evBan(elsoEv)}.` : ''}</p>
  <figure>${trendVonal(A.evek, f.e, real, A.utolso)}</figure>
  <div class="gordul"><table>
    <thead><tr><th>Év</th><th>Bruttó átlag</th><th>Változás</th><th>${A.utolso}. évi áron</th><th>Nettó*</th></tr></thead>
    <tbody>${A.evek.map((ev, i) => `<tr><th>${ev}</th><td>${ft(f.e[i])}</td><td>${i && f.e[i] != null && f.e[i - 1] != null ? elojel(f.e[i] / f.e[i - 1] - 1) : '–'}</td><td>${ft(real[i])}</td><td>${f.e[i] == null ? '–' : ft(S.netto(A.sz, { brutto: f.e[i] }).netto)}</td></tr>`).join('')}</tbody>
  </table></div>
  <p class="apro">* Kedvezmények nélkül; az szja és a járulék kulcsa ${A.evek[0]} óta együtt 33,5%. ${f.e.some(v => v == null) ? 'Ahol nincs adat, ott a KSH az alacsony létszám miatt nem közölt értéket.' : ''}</p>
  ${kerForras(A)}
  ${forras({ ...A.inf.forras, letoltve: A.inf.ellenorizve }, 'éves fogyasztóiár-index')}
</section>

${tel.length ? `<section>
  <h2>Mire elég? Lakás ${esc(kisNev)} fizetésből</h2>
  <p>Ennyi idő alatt jönne ki egy 50 négyzetméteres lakás, ha a teljes nettó átlagkeresetet (${ft(f.netto)}) félretennéd. A valóságban ennek a töredékét lehet megtakarítani, ezért a szám összehasonlításra jó: megmutatja, hol mennyit ér ugyanaz a fizetés.</p>
  <div class="gordul"><table>
    <thead><tr><th>Település</th><th>50 m² becsült ára</th><th>Ennyi nettó bér</th></tr></thead>
    <tbody>${tel.map(t => { const l = S.lakas({ nettoHavi: f.netto, m2Ft: S.m2Ar(t) }); return `<tr><th>${esc(t.n)}</th><td>${ft(l.ar)}</td><td>${idotartam(l.honap)}</td></tr>`; }).join('')}</tbody>
  </table></div>
  ${lakForras(A)}
  <form class="mini" data-mini-lakas data-netto="${f.netto}" onsubmit="return false">
    <label for="m-tel">A te településed</label>
    <input id="m-tel" type="search" autocomplete="off" placeholder="Település neve" aria-controls="m-lista">
    <ul id="m-lista" class="k-lista" hidden></ul>
    <p class="mini-eredmeny" aria-live="polite" hidden></p>
  </form>
  <p><a class="gomb masod" href="/mire-eleg/?f=${f.kod}">Részletes számítás megtakarítási aránnyal és autóval</a></p>
</section>` : ''}

<section class="kuszob-doboz">
  <h2>Bérküszöb harmadik országbeli munkavállalónál</h2>
  <p>Ha EU-n kívüli munkavállalót vennél fel erre a FEOR-kódra (${f.kod}), az alapbérének meg kell haladnia az országos bruttó átlagkereset 80 százalékát.</p>
  <div class="szalag keskeny">
    ${sor(`Országos bruttó átlag, ${A.utolso}`, ft(f.brutto))}
    ${sor('Ennek 80%-a', ft(kuszob.hatarKerek))}
    ${sor('A legkisebb megfelelő alapbér', ft(kuszob.legkisebb), 'ossz')}
  </div>
  <p class="forras">Jogszabály: <a href="${esc(A.szabalyok.berkuszob.forras.url)}" rel="noopener">${esc(A.szabalyok.berkuszob.hely)}</a>. Ellenőrizve: ${datum(A.szabalyok.berkuszob.ellenorizve)} <a href="/berkuszob-kereso/">A szabály részletei és kivételei</a></p>
</section>

${hasonlo.length ? `<section><h2>Rokon foglalkozások</h2><ul class="rokon">${hasonlo.map(g => `<li>${fogLink(g)}<span>${ft(g.brutto)}</span></li>`).join('')}</ul>${kerForras(A)}</section>` : ''}
${gyik(kerdesek)}
</article>`,
  };
}

// ------------------------------------------------------------------ all occupations
export function foglalkozasok(A) {
  const csoport = k => A.fog.filter(f => f.kod[0] === String(k)).sort((a, b) => b.brutto - a.brutto);
  return {
    ut: 'foglalkozasok/', cim: `Fizetések foglalkozásonként ${A.utolso}: ${A.fog.length} szakma bruttó és nettó átlagkeresete`,
    leiras: `Az összes foglalkozás bruttó és nettó átlagkeresete a KSH ${A.utolso}. évi adataiból, FEOR-főcsoportonként, a legjobban fizetőtől a legkevésbé fizetőig.`,
    morzsa: [['foglalkozasok/', 'Foglalkozások']],
    tartalom: `<h1>Fizetések foglalkozásonként</h1>
<p class="bevezeto">${A.fog.length} foglalkozás bruttó és nettó átlagkeresete a KSH ${A.utolso}. évi adataiból. Csoportonként a legmagasabb átlagtól haladunk lefelé.</p>
${kereso()}
<nav class="ugro" aria-label="Főcsoportok">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(k => `<a href="#cs${k}">${esc(FOCSOPORT[k])}</a>`).join('')}</nav>
${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(k => `<section id="cs${k}"><h2>${esc(FOCSOPORT[k])}</h2>
<div class="gordul"><table class="nagy-tabla"><thead><tr><th>Foglalkozás</th><th>FEOR</th><th>Bruttó</th><th>Nettó</th><th>Egy év alatt</th></tr></thead><tbody>
${csoport(k).map(f => `<tr><th>${fogLink(f)}${f.alias ? `<small>${esc(f.n)}</small>` : ''}</th><td>${f.kod}</td><td>${ft(f.brutto)}</td><td>${ft(f.netto)}</td><td>${f.egyEv == null ? '–' : elojel(f.egyEv)}</td></tr>`).join('\n')}
</tbody></table></div></section>`).join('\n')}
${kerForras(A)}
<p class="apro">${szabalyJegy(A)}.</p>`,
  };
}

// ------------------------------------------------------------------ gross-net calculator
function szabalyLista(A) {
  const s = A.sz;
  const egy = x => `<li><b>${esc(x.nev)}.</b> ${esc(x.szoveg)} <span class="forras-sor">${esc(x.hely)} · <a href="${esc(x.forras.url)}" rel="noopener">${esc(x.forras.nev)}</a> · ellenőrizve: ${datum(x.ellenorizve)}</span></li>`;
  return `<ul class="szabalyok">${egy(s.szja)}${egy(s.tb)}${egy(s.fiatal25)}${egy(s.csaladi)}
<li><b>${esc(s.anyak.nev)}.</b> ${esc(s.anyak.szoveg)}<ul>${s.anyak.jogcimek.map(j => `<li><b>${esc(j.nev)}.</b> ${esc(j.szoveg)} <span class="forras-sor">${esc(j.hely)} · <a href="${esc(j.forras.url)}" rel="noopener">${esc(j.forras.nev)}</a> · ellenőrizve: ${datum(s.anyak.ellenorizve)}</span></li>`).join('')}</ul></li>
<li><b>Sorrend.</b> ${esc(s.sorrend.szoveg)} <span class="forras-sor">${esc(s.sorrend.hely)} · ellenőrizve: ${datum(s.sorrend.ellenorizve)}</span></li></ul>`;
}

export function kalkulator(A) {
  const s = A.sz, mb = 600000, m = S.netto(s, { brutto: mb, eltartottak: 2 });
  const kerdesek = [
    [`Mennyi a nettó ${szamHu(mb)} forint bruttóból ${evBan(A.szEv)}?`, `Kedvezmények nélkül ${ft(S.netto(s, { brutto: mb }).netto)}, mert a bruttóból 15% szja és 18,5% tb-járulék megy le. Két gyermek után a családi kedvezménnyel ${ft(m.netto)} marad.`],
    ['Mennyi szja-t nem kell fizetnie egy 25 év alattinak?', `${evBan(A.szEv)} a bér havi ${ft(s.fiatal25.ertek)}-ig mentes az szja alól, ami legfeljebb havi ${ft(Math.round(s.fiatal25.ertek * s.szja.ertek))} megtakarítás. A 18,5% tb-járulékot a 25 év alattiak is fizetik.`],
    ['Mi történik, ha a családi kedvezmény nagyobb, mint az szja-m?', 'A fel nem használt rész 15 százalékát a tb-járulékból vonhatod le, ez a családi járulékkedvezmény. A kalkulátor ezt magától elvégzi.'],
    ['Az szja-mentes anyák is kapnak családi kedvezményt?', 'Igen. Mivel szja-t nem fizetnek, a családi kedvezményt teljes egészében a tb-járulékból érvényesíthetik.'],
  ];
  return {
    ut: 'brutto-netto-kalkulator/', cim: `Bruttó–nettó kalkulátor ${A.szEv}: szja, tb-járulék, családi kedvezmény`,
    leiras: `Bruttó bérből nettó a ${evOs(A.szEv)} szabályokkal: 25 év alattiak kedvezménye, anyák szja-mentessége, családi kedvezmény és járulékkedvezmény. Minden szabálynál forrás és dátum.`,
    morzsa: [['brutto-netto-kalkulator/', 'Bruttó–nettó kalkulátor']],
    jsonld: [gyikLd(kerdesek), { '@context': 'https://schema.org', '@type': 'WebApplication', name: `Bruttó–nettó kalkulátor ${A.szEv}`, applicationCategory: 'FinanceApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: 0, priceCurrency: 'HUF' }, inLanguage: 'hu' }],
    tartalom: `<h1>Bruttó–nettó kalkulátor ${A.szEv}</h1>
<p class="bevezeto">Írd be a havi bruttó béredet, és megmutatjuk, mennyi marad nettóban a ${evOs(A.szEv)} szabályok szerint.${A.szElteres ? ` <b>${esc(A.szElteres)}</b>` : ''}</p>
<div class="kalk">
  <form class="urlap" data-netto-kalk onsubmit="return false">
    <div class="mezo"><label for="n-brutto">Havi bruttó bér</label><div class="be"><input id="n-brutto" name="brutto" inputmode="numeric" autocomplete="off"><span>Ft</span></div></div>
    <fieldset><legend>Kedvezmények</legend>
      <label class="kapcs"><input type="checkbox" name="fiatal25"><span>25 év alatti vagyok</span></label>
      <label class="kapcs"><input type="checkbox" name="anya"><span>Szja-mentes anya vagyok <small>30 év alatti anya, 40 év alatti kétgyermekes, három- vagy többgyermekes</small></span></label>
    </fieldset>
    <div class="mezo"><label for="n-elt">Eltartott gyermekek száma</label>
      <select id="n-elt" name="eltartottak"><option value="">válassz</option><option value="0">nincs</option><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option><option>6</option></select></div>
    <p class="minta-sor"><button type="button" class="gomb masod" data-minta='{"brutto":${mb},"eltartottak":"2"}'>Minta betöltése</button><span>Minta: bruttó ${szamHu(mb)} Ft, két gyermek.</span></p>
  </form>
  <div class="szalag eredmeny" data-netto-eredmeny aria-live="polite">
    <p class="szalag-fej">Havi elszámolás<span>${A.szEv}</span></p>
    <p class="ures">Írd be a bruttó béredet, és itt megjelenik a levezetés.</p>
  </div>
</div>
${adatBlokk('adat', { sz: s, ev: A.szEv })}
<section><h2 id="szabalyok">A ${evOs(A.szEv)} szabályok, forrással</h2>${szabalyLista(A)}
<p class="apro">Amivel a kalkulátor egyszerűsít: a családi kedvezményt egy kereső veszi igénybe, minden gyermek kedvezményezett eltartott, a személyi kedvezménnyel és az első házasok kedvezményével nem számol.</p></section>
${gyik(kerdesek)}`,
  };
}

// ------------------------------------------------------------------ what is it enough for
export function mireEleg(A) {
  const m = A.minta;
  return {
    ut: 'mire-eleg/', cim: `Mire elég a fizetésed? Lakás és autó a nettó béredből`,
    leiras: `Hány év alatt jön ki egy 50 négyzetméteres lakás a fizetésedből a településeden, és mekkora terhet jelent egy autó? ${A.lak.tel.length} település árai, ${A.fog.length} foglalkozás bére.`,
    morzsa: [['mire-eleg/', 'Mire elég?']],
    tartalom: `<h1>Mire elég a fizetésed?</h1>
<p class="bevezeto">Válassz foglalkozást vagy írd be a saját nettódat, add meg a települést, és megmutatjuk, hány év alatt jön ki belőle egy lakás, és mennyit visz el egy autó.</p>
<div class="kalk">
  <form class="urlap" data-mire onsubmit="return false">
    <fieldset><legend>A fizetés</legend>
      <div class="mezo"><label for="me-fog">Foglalkozás</label><input id="me-fog" type="search" autocomplete="off" placeholder="Foglalkozás neve vagy FEOR-kódja" aria-controls="me-fog-lista"><ul id="me-fog-lista" class="k-lista" hidden></ul></div>
      <div class="mezo"><label for="me-netto">vagy a saját havi nettód</label><div class="be"><input id="me-netto" name="netto" inputmode="numeric" autocomplete="off"><span>Ft</span></div></div>
    </fieldset>
    <fieldset><legend>Lakás</legend>
      <div class="mezo"><label for="me-tel">Település</label><input id="me-tel" type="search" autocomplete="off" placeholder="Település vagy budapesti kerület" aria-controls="me-tel-lista"><ul id="me-tel-lista" class="k-lista" hidden></ul></div>
      <div class="mezo fel"><label for="me-m2">Alapterület</label><div class="be"><input id="me-m2" name="m2" inputmode="numeric" autocomplete="off" placeholder="50"><span>m²</span></div></div>
      <div class="mezo fel"><label for="me-megt">Ennyit teszel félre a nettóból</label><div class="be"><input id="me-megt" name="megt" inputmode="numeric" autocomplete="off" placeholder="100"><span>%</span></div></div>
    </fieldset>
    <fieldset><legend>Autó <small>nem kötelező</small></legend>
      <div class="mezo"><label for="me-auto">Az autó ára</label><div class="be"><input id="me-auto" name="autoar" inputmode="numeric" autocomplete="off"><span>Ft</span></div></div>
      <div class="mezo fel"><label for="me-km">Havi futás</label><div class="be"><input id="me-km" name="km" inputmode="numeric" autocomplete="off"><span>km</span></div></div>
      <div class="mezo fel"><label for="me-fogy">Fogyasztás</label><div class="be"><input id="me-fogy" name="fogy" inputmode="decimal" autocomplete="off"><span>l/100 km</span></div></div>
      <div class="csipek" role="radiogroup" aria-label="Üzemanyag"><label><input type="radio" name="uza" value="benzin" checked><span>Benzin, ${A.auto.benzin} Ft/l</span></label><label><input type="radio" name="uza" value="dizel"><span>Dízel, ${A.auto.dizel} Ft/l</span></label></div>
    </fieldset>
    <p class="minta-sor"><button type="button" class="gomb masod" data-minta='{"fog":"${m.f.kod}","tel":"${m.t.kod}","autoar":6000000,"km":1200,"fogy":"6,5"}'>Minta betöltése</button><span>Minta: ${esc(m.f.nev.toLocaleLowerCase('hu'))}, ${esc(m.t.n)}, 6 millió forintos autó.</span></p>
  </form>
  <div class="szalag eredmeny" data-mire-eredmeny aria-live="polite">
    <p class="szalag-fej">Mire elég?</p>
    <p class="ures">Válassz foglalkozást vagy írd be a nettódat, és add meg a települést.</p>
  </div>
</div>
${adatBlokk('adat', { auto: { benzin: A.auto.benzin, dizel: A.auto.dizel, honap: A.auto.honap }, lakEv: A.lak.utolsoEv, becsles: A.lak.becslesCimke, kerEv: A.utolso })}
<section class="szoveg"><h2>Hogyan számolunk?</h2>
<p><b>Fizetés.</b> A foglalkozás ${A.utolso}. évi bruttó átlagkeresetéből (KSH) a ${evOs(A.szEv)} szabályokkal, kedvezmények nélkül számolunk nettót. Ha beírod a saját nettódat, azzal számolunk.</p>
<p><b>Lakás.</b> A négyzetméterár a település ${A.lak.utolsoEv}. évi tényleges adásvételeinek átlaga (KSH Ingatlanadattár, a NAV illetékadataiból), amelyet az Ingatlanmérleg a lakásárindexszel a mai szintre becsül${A.lak.becslesCimke ? ` (${esc(A.lak.becslesCimke)})` : ''}. Ahol van elég társasházi lakás, ott azok árával számolunk, máshol az összes lakóingatlanéval. Az eredmény azt mutatja, hány havi megtakarítás fedezi a vételárat; hitellel, kamattal és a bérek jövőbeli változásával nem számol.</p>
<p><b>Autó.</b> Az autó árát te adod meg. Az üzemanyagköltséghez a NAV ${datum(A.auto.honap)}i üzemanyagárát használjuk az autózom adatfájljából. A teljes fenntartási költséget az <a href="https://autozom.hu/autofenntartas-kalkulator/" rel="noopener">autózom kalkulátora</a> számolja ki.</p>
${kerForras(A)}${lakForras(A)}${forras({ ...A.auto.forras, letoltve: A.auto.ellenorizve }, `${datum(A.auto.honap)}i ár`)}
</section>`,
  };
}

// ------------------------------------------------------------------ wage threshold finder
export function berkuszob(A) {
  const b = A.szabalyok.berkuszob;
  const pl = A.fog.find(f => f.kod === '8211') || A.rangsor[200];
  const pk = S.berkuszob(pl.brutto, b.arany);
  const kerdesek = [
    ['Mennyi a bérküszöb harmadik országbeli munkavállalónál?', `Az alapbérnek meg kell haladnia a FEOR-kód szerinti foglalkozás országos bruttó átlagkeresetének 80 százalékát. Példa: ${az(pl.n)} „${pl.n}” (FEOR ${pl.kod}) átlaga ${ft(pl.brutto)}, a küszöb ${ft(pk.hatarKerek)}, ennél magasabb alapbér kell.`],
    ['Melyik év átlagkeresetével kell számolni?', `A KSH által legutóbb közzétett éves adattal. Ez most a ${A.utolso}. évi, amelyet a KSH a 20.1.1.52. számú táblában közöl. Amikor megjelenik az új év, ez az oldal magától átáll rá.`],
    ['Elég, ha a bér pontosan az átlag 80 százaléka?', 'A rendelet szövege szerint az alapbér akkor lényegesen alacsonyabb, ha nem haladja meg az átlag nyolcvan százalékát. A pontosan 80 százalékos alapbér tehát még kevés, legalább egy forinttal többnek kell lennie.'],
    ['A pótlékok és a prémium beleszámítanak?', 'A rendelet az alapbért (illetményt, díjazást) veti össze az átlagkeresettel. A KSH átlagkeresete viszont a pótlékokat és a prémiumot is tartalmazza, ezért a küszöb a gyakorlatban szigorúbb, mint amilyennek elsőre látszik.'],
  ];
  return {
    ut: 'berkuszob-kereso/', cim: `Bérküszöb-kereső ${A.maEv}: a FEOR-átlagbér 80%-a harmadik országbeli munkavállalóknál`,
    leiras: `Keresd ki FEOR-kód vagy név alapján, mekkora alapbért kell legalább fizetni harmadik országbeli munkavállalónak: a KSH ${A.utolso}. évi átlagkeresetének 80 százaléka ${A.fog.length} foglalkozásra, a jogszabályhellyel.`,
    morzsa: [['berkuszob-kereso/', 'Bérküszöb-kereső']],
    jsonld: [gyikLd(kerdesek)],
    tartalom: `<h1>Bérküszöb-kereső harmadik országbeli munkavállalókhoz</h1>
<p class="bevezeto">Írd be a FEOR-kódot vagy a foglalkozás nevét, és megkapod az országos bruttó átlagkeresetet, annak 80 százalékát, és a legkisebb alapbért, amely megfelel a szabálynak.</p>
<div class="kalk">
  <form class="urlap" data-kuszob onsubmit="return false">
    <div class="mezo"><label for="bk-fog">FEOR-kód vagy foglalkozás</label><input id="bk-fog" type="search" autocomplete="off" placeholder="pl. 8211 vagy összeszerelő" aria-controls="bk-lista"><ul id="bk-lista" class="k-lista" hidden></ul></div>
    <div class="mezo"><label for="bk-ber">A tervezett havi alapbér <small>nem kötelező</small></label><div class="be"><input id="bk-ber" name="ber" inputmode="numeric" autocomplete="off"><span>Ft</span></div></div>
    <p class="minta-sor"><button type="button" class="gomb masod" data-minta='{"fog":"${pl.kod}","ber":${Math.round(pk.hatar / 1000) * 1000 + 5000}}'>Minta betöltése</button><span>Minta: ${esc(pl.n)} (${pl.kod}).</span></p>
  </form>
  <div class="szalag eredmeny" data-kuszob-eredmeny aria-live="polite">
    <p class="szalag-fej">Bérküszöb<span>KSH, ${A.utolso}</span></p>
    <p class="ures">Válassz foglalkozást, és itt megjelenik a küszöb.</p>
  </div>
</div>
${adatBlokk('adat', { arany: b.arany, ev: A.utolso, letoltve: A.ker.ellenorizve })}
<section class="szoveg"><h2>Mit mond a jogszabály?</h2>
<p>${esc(b.szoveg)}</p>
<ul>${b.megjegyzesek.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
<p class="forras">Jogszabály: <a href="${esc(b.forras.url)}" rel="noopener">${esc(b.hely)}</a>, a Nemzeti Jogszabálytárban ${datum(b.szovegallapot)} óta hatályos szöveg. Ellenőrizve: ${datum(b.ellenorizve)}</p>
${kerForras(A)}
<p class="apro">Ez az oldal tájékoztatás, a konkrét engedélyügyben a kormányhivatal dönt. A tábla a KSH legutóbb közzétett éves adatát mutatja; a KSH évente egyszer, jellemzően tavasszal frissíti.</p>
</section>
<section><h2>Az összes FEOR-kód küszöbe</h2>
<p><a class="gomb masod" href="/adatok/berkuszob.csv" download>Letöltés CSV-ben</a></p>
<div class="gordul"><table class="nagy-tabla"><thead><tr><th>FEOR</th><th>Foglalkozás</th><th>Bruttó átlag, ${A.utolso}</th><th>80%</th><th>Legkisebb megfelelő alapbér</th></tr></thead><tbody>
${[...A.fog].sort((a, c) => a.kod.localeCompare(c.kod)).map(f => { const k = S.berkuszob(f.brutto, b.arany); return `<tr id="k${f.kod}"><td>${f.kod}</td><th><a href="/fizetes/${f.slug}/">${esc(f.n)}</a></th><td>${ft(f.brutto)}</td><td>${ft(k.hatarKerek)}</td><td>${ft(k.legkisebb)}</td></tr>`; }).join('\n')}
</tbody></table></div>
${kerForras(A)}</section>
${gyik(kerdesek)}`,
  };
}


// ------------------------------------------------------------------ where do you stand
export function holAllsz(A) {
  const m = A.minta.f;
  const kerdesek = [
    ['Mihez hasonlítjátok a béremet?', `A szakmád ${A.utolso}. évi országos bruttó átlagához, a korcsoportod átlagához (KSH, foglalkozásonként négy korcsoport), valamint a teljes munkaidős alkalmazottak országos átlagához és mediánjához (${A.orsz.ev}. ${A.orsz.idoszak}).`],
    ['Miért nem mondjátok meg, hogy a szakmám hány százaléka keres nálam kevesebbet?', 'Ehhez a szakmán belüli bérek eloszlása kellene, amit a KSH nem közöl, csak az átlagot. Amit pontosan tudunk: a béred az átlag hány százaléka, és hány szakma átlagát előzi meg.'],
    ['Mi a különbség az átlag és a medián között?', `A medián az a bér, amelynél a dolgozók fele többet, fele kevesebbet keres. Az országos bruttó medián ${ft(A.orsz.bruttoMedian)}, az átlag ${ft(A.orsz.bruttoAtlag)}: az átlagot a kiugróan magas bérek húzzák fel.`],
  ];
  return {
    ut: 'hol-allsz/', cim: 'Hol állsz a fizetéseddel? Hasonlítsd a szakmád és a korosztályod átlagához',
    leiras: `Írd be a szakmádat és a bruttó béredet: megmutatjuk, hol állsz a szakmád, a korcsoportod és az ország átlagához képest, és hány szakma átlagát előzöd meg a ${A.fog.length}-ből.`,
    morzsa: [['hol-allsz/', 'Hol állsz?']], jsonld: [gyikLd(kerdesek)],
    tartalom: `<h1>Hol állsz a fizetéseddel?</h1>
<p class="bevezeto">Add meg a szakmádat és a havi bruttódat. Megmutatjuk, hol vagy a szakmád, a korosztályod és az ország átlagához képest.</p>
<div class="kalk">
  <form class="urlap" data-hol onsubmit="return false">
    <div class="mezo"><label for="ha-fog">A szakmád</label><input id="ha-fog" type="search" autocomplete="off" placeholder="Foglalkozás neve vagy FEOR-kódja" aria-controls="ha-lista"><ul id="ha-lista" class="k-lista" hidden></ul></div>
    <div class="mezo"><label for="ha-brutto">Havi bruttó béred</label><div class="be"><input id="ha-brutto" name="brutto" inputmode="numeric" autocomplete="off"><span>Ft</span></div></div>
    <fieldset><legend>Korcsoportod <small>nem kötelező</small></legend>
      <div class="csipek" role="radiogroup" aria-label="Korcsoport">${['30 alatt', '30–39', '40–49', '50 felett'].map((c, i) => `<label><input type="radio" name="kor" value="${i}"><span>${c}</span></label>`).join('')}</div>
    </fieldset>
    <p class="minta-sor"><button type="button" class="gomb masod" data-minta='{"fog":"${m.kod}","brutto":${Math.round(m.brutto * 1.12 / 10000) * 10000},"kor":"1"}'>Minta betöltése</button><span>Minta: ${esc(m.nev.toLocaleLowerCase('hu'))}, 30–39 éves.</span></p>
  </form>
  <div class="szalag eredmeny" data-hol-eredmeny aria-live="polite">
    <p class="szalag-fej">Hol állsz?</p>
    <p class="ures">Válaszd ki a szakmádat, és írd be a bruttódat.</p>
  </div>
</div>
<figure class="szeles" data-hol-abra hidden></figure>
${adatBlokk('adat', { sz: A.sz, ev: A.utolso, db: A.fog.length, orsz: { ev: A.orsz.ev, idoszak: A.orsz.idoszak, atlag: A.orsz.bruttoAtlag, median: A.orsz.bruttoMedian } })}
${kerForras(A)}
${forras({ ...A.orsz.forras, letoltve: A.orsz.ellenorizve }, `országos átlag és medián, ${A.orsz.ev}. ${A.orsz.idoszak}`)}
${gyik(kerdesek)}`,
  };
}

// ------------------------------------------------------------------ compare occupations
export function osszehasonlitas(A) {
  const p = ['2142', '3311', '7524'].map(k => A.kodra[k]).filter(Boolean);
  return {
    ut: 'osszehasonlitas/', cim: 'Szakmák összehasonlítása: fizetés, pályaív és reálbér egymás mellett',
    leiras: `Hasonlíts össze két vagy három foglalkozást: bruttó és nettó átlagkereset, korcsoportos pályaív és a bér vásárlóértékének változása ${A.evek[0]} óta, a KSH adataiból.`,
    morzsa: [['osszehasonlitas/', 'Összehasonlítás']],
    tartalom: `<h1>Szakmák egymás mellett</h1>
<p class="bevezeto">Válassz két vagy három foglalkozást. Megmutatjuk a bérüket, azt, hogy melyik korban mennyit fizetnek, és hogyan változott a bérük értéke ${A.evek[0]} óta.</p>
<form class="urlap harmas" data-ossze onsubmit="return false">
  ${['Első', 'Második', 'Harmadik'].map((c, i) => `<div class="mezo"><label for="oh-${i}">${c} foglalkozás${i === 2 ? ' <small>nem kötelező</small>' : ''}</label><input id="oh-${i}" type="search" autocomplete="off" placeholder="Foglalkozás neve" aria-controls="oh-l${i}"><ul id="oh-l${i}" class="k-lista" hidden></ul></div>`).join('')}
  <p class="minta-sor"><button type="button" class="gomb masod" data-minta='${JSON.stringify(p.map(f => f.kod))}'>Minta betöltése</button><span>Minta: ${p.map(f => esc(f.nev.toLocaleLowerCase('hu'))).join(', ')}.</span></p>
</form>
<div data-ossze-eredmeny aria-live="polite"><p class="ures-doboz">Válassz legalább két foglalkozást, és itt megjelenik az összevetés.</p></div>
${adatBlokk('adat', { sz: A.sz, szEv: A.szEv, index: A.inf.index, db: A.fog.length })}
${kerForras(A)}
${forras({ ...A.inf.forras, letoltve: A.inf.ellenorizve }, 'éves fogyasztóiár-index a reálbérhez')}
<p class="apro">${szabalyJegy(A)}.</p>`,
  };
}

// ------------------------------------------------------------------ affordability map
export function terkep(A) {
  const m = A.minta.f;
  return {
    ut: 'terkep/', cim: 'Megfizethetőségi térkép: hol ér a legtöbbet a fizetésed?',
    leiras: `Térkép ${A.lak.tel.length} település és budapesti kerület lakásáraival. Válassz foglalkozást vagy írd be a nettódat, és megmutatja, hol hány év alatt jön ki egy 50 négyzetméteres lakás.`,
    morzsa: [['terkep/', 'Térkép']],
    tartalom: `<h1>Hol ér a legtöbbet a fizetésed?</h1>
<p class="bevezeto">A térkép alapból a lakások négyzetméterárát mutatja. Válassz foglalkozást vagy írd be a nettódat, és átvált arra, hogy hol hány év alatt jön ki a béredből egy 50 négyzetméteres lakás.</p>
<form class="urlap soros" data-terkep onsubmit="return false">
  <div class="mezo"><label for="tk-fog">Foglalkozás</label><input id="tk-fog" type="search" autocomplete="off" placeholder="Foglalkozás neve vagy FEOR-kódja" aria-controls="tk-lista"><ul id="tk-lista" class="k-lista" hidden></ul></div>
  <div class="mezo"><label for="tk-netto">vagy a saját havi nettód</label><div class="be"><input id="tk-netto" name="netto" inputmode="numeric" autocomplete="off"><span>Ft</span></div></div>
  <p class="minta-sor"><button type="button" class="gomb masod" data-minta='{"fog":"${m.kod}"}'>Minta betöltése</button><span>Minta: ${esc(m.nev.toLocaleLowerCase('hu'))}.</span></p>
</form>
<div class="terkep-doboz">
  <div class="terkep-fej"><p class="terkep-cim" data-tk-cim>Lakások négyzetméterára</p><div class="jelkulcs" data-tk-kulcs></div></div>
  <div class="terkep-racs">
    <div class="terkep-nagy" data-tk-orszag><p class="ures">A térkép betöltéséhez JavaScript kell.</p></div>
    <div class="terkep-bp"><p>Budapest kerületei</p><div data-tk-bp></div></div>
  </div>
  <p class="terkep-info" data-tk-info aria-live="polite">Vidd az egeret egy település fölé, vagy koppints rá.</p>
</div>
${lakForras(A)}
<div class="ketlista" data-tk-listak hidden></div>
${adatBlokk('adat', { lakEv: A.lak.utolsoEv, becsles: A.lak.becslesCimke, kerEv: A.utolso })}
<section class="szoveg"><h2>Hogyan olvasd a térképet?</h2>
<p>A sötétebb zöld drágább lakást, illetve több évnyi bért jelent. A szürke településeken az elmúlt három évben túl kevés adásvétel volt ahhoz, hogy árat közöljünk.</p>
<p>A bér a foglalkozás országos átlaga, amely mindenhol ugyanaz: a KSH foglalkozásonként csak országos adatot közöl. A térkép ezért azt mutatja, mennyit ér ugyanaz a fizetés különböző helyeken. A valóságban a bérek Budapesten magasabbak, kistelepüléseken alacsonyabbak az országos átlagnál.</p>
<p>Az évek száma azt jelenti, hány évnyi teljes nettó bér fedezi egy 50 négyzetméteres lakás becsült mai árát. A kis forgalmú települések ára néhány adásvételből jön, ezért ott óvatosan kezeld.</p>
${kerForras(A)}</section>`,
  };
}

// ------------------------------------------------------------------ winners and losers
export function nyertesek(A) {
  const p = A.fog.filter(f => f.realValt != null);
  const rend = [...p].sort((a, b) => b.realValt - a.realValt);
  const nyert = p.filter(f => f.realValt > 0).length, veszt = p.length - nyert;
  const med = rend[Math.floor(rend.length / 2)].realValt;
  const e0 = A.evek[0];
  const tabla = (cim, lista) => `<section><h2>${cim}</h2><div class="gordul"><table><thead><tr><th>Foglalkozás</th><th>Bruttó, ${e0}</th><th>Bruttó, ${A.utolso}</th><th>Reálbér</th></tr></thead><tbody>${lista.map(f => `<tr><th>${fogLink(f)}</th><td>${ft(f.e[0])}</td><td>${ft(f.brutto)}</td><td>${elojel(f.realValt)}</td></tr>`).join('')}</tbody></table></div></section>`;
  const csop = k => { const l = p.filter(f => f.kod[0] === String(k)).map(f => f.realValt).sort((a, b) => a - b); return l.length ? l[Math.floor(l.length / 2)] : null; };
  return {
    ut: 'nyertesek-vesztesek/', cim: `Nyertesek és vesztesek: melyik szakmában ér többet a fizetés, mint ${evBan(e0)}?`,
    leiras: `${p.length} foglalkozás reálbére ${e0} és ${A.utolso} között egy ábrán: ${nyert} szakmában nőtt, ${veszt} szakmában csökkent a bér vásárlóértéke. KSH-adatok, inflációval korrigálva.`,
    morzsa: [['nyertesek-vesztesek/', 'Nyertesek és vesztesek']],
    tartalom: `<h1>Nyertesek és vesztesek ${e0} óta</h1>
<p class="bevezeto">${p.length} szakmából ${nyert}-ben ér ma többet a fizetés, mint ${evBan(e0)}, ${veszt === 0 ? 'és egyben sem ér kevesebbet' : `${veszt}-ben kevesebbet ér`}. A tipikus szakmában a bér vásárlóértéke ${szamHu(Math.abs(med) * 100, 1)}%-kal ${med >= 0 ? 'nőtt' : 'csökkent'}.</p>
<div class="csipek szuro" data-szoras-szuro role="group" aria-label="Kiemelés főcsoport szerint"><button type="button" class="csip akt" data-cs="">Mind</button>${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(k => `<button type="button" class="csip" data-cs="${k}">${esc(FOCSOPORT[k])}</button>`).join('')}</div>
<figure class="szeles szoras-doboz">${szoras(A.fog, { elsoEv: e0, utolsoEv: A.utolso })}<div class="buborek" data-szoras-buborek hidden></div></figure>
<p class="apro">Minden pont egy foglalkozás. Jobbra a jobban fizetők, feljebb azok, ahol többet nőtt a bér értéke. A nulla vonal alatt a bér kevesebbet ér, mint ${evBan(e0)}. Kattints egy pontra a szakma oldaláért.</p>
${kerForras(A)}
${forras({ ...A.inf.forras, letoltve: A.inf.ellenorizve }, 'éves fogyasztóiár-index')}
<section><h2>Szakmacsoportonként</h2><div class="gordul"><table><thead><tr><th>Főcsoport</th><th>Foglalkozások száma</th><th>Tipikus reálbér-változás</th></tr></thead><tbody>${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(k => [k, csop(k), p.filter(f => f.kod[0] === String(k)).length]).filter(x => x[1] != null).sort((a, b) => b[1] - a[1]).map(([k, v, n]) => `<tr><th>${esc(FOCSOPORT[k])}</th><td>${n}</td><td>${elojel(v)}</td></tr>`).join('')}</tbody></table></div><p class="apro">A tipikus érték a csoport középső (medián) foglalkozásának változása.</p></section>
${tabla('A 15 legnagyobb nyertes', rend.slice(0, 15))}
${tabla(veszt >= 15 ? 'A 15 legnagyobb vesztes' : 'A 15 leggyengébb', rend.slice(-15).reverse())}
<section class="szoveg"><h2>Hogyan számoltunk?</h2>
<p>A ${e0}. évi bruttó átlagkeresetet a közbeeső évek inflációjával a ${A.utolso}. évi árszintre szoroztuk, és ehhez mértük a ${A.utolso}. évi bért. A változás a bruttó bérre vonatkozik; a nettó kedvezmények nélkül ugyanilyen arányban mozog.</p>
<p>A nagy ugrások mögött gyakran központi béremelés áll (például az egészségügyben és az oktatásban), vagy az, hogy egy kis létszámú foglalkozásban megváltozott a dolgozók összetétele.</p></section>`,
  };
}

// ------------------------------------------------------------------ sources, data, imprint
export function forrasok(A) {
  const adat = (cim, d, megj) => `<li><b>${cim}.</b> ${megj} <span class="forras-sor"><a href="${esc(d.forras.url)}" rel="noopener">${esc(d.forras.nev)}</a> · <a href="${esc(d.forras.fajl)}" rel="noopener">nyers fájl</a> · letöltve: ${datum(d.letoltve)} · utoljára ellenőrizve: ${datum(d.ellenorizve)}</span></li>`;
  return {
    ut: 'forrasok/', cim: 'Források és módszertan', leiras: 'Honnan jönnek az oldal adatai, mikor frissültek utoljára, és hogyan számolunk nettó bért, reálbért, lakásárat és bérküszöböt.',
    morzsa: [['forrasok/', 'Források és módszertan']],
    tartalom: `<h1>Források és módszertan</h1>
<p class="bevezeto">Minden adat nyilvános, hivatalos forrásból jön, és magától frissül. A frissítő hetente lefut; a legutóbbi futás napja: ${datum(A.frissitve)}.</p>
<section><h2 id="adatok">Adatok</h2><ul class="szabalyok">
${adat('Keresetek foglalkozásonként', A.ker, `${A.fog.length} foglalkozás (FEOR-08, négy számjegy), ${A.evek[0]}–${A.utolso}, négy korcsoport. A teljes munkaidőben alkalmazásban állók havi bruttó átlagkeresete. A KSH évente frissíti.`)}
${adat('Országos nettó átlagkereset', A.nettoO, 'Az összehasonlításhoz használt országos nettó átlag, kedvezményekkel együtt.')}
${adat('Országos átlag és medián', A.orsz, `A teljes munkaidős alkalmazottak országos bruttó átlaga és mediánja az év eleje óta (${A.orsz.ev}. ${A.orsz.idoszak}). A „Hol állsz?” oldal ehhez hasonlít.`)}
${adat('Infláció', A.inf, `Éves fogyasztóiár-index. A reálbért úgy kapjuk, hogy a korábbi évek bérét a közbeeső évek inflációjával a ${A.utolso}. évi árszintre szorozzuk.`)}
${adat('Lakásárak', A.lak, `${A.lak.tel.length} település és budapesti kerület négyzetméterára (${A.lak.utolsoEv}), a KSH Ingatlanadattár alapján, az Ingatlanmérleg mai becslésével.`)}
${adat('Üzemanyagár', A.auto, 'A NAV havi üzemanyagára az autózom nyilvános adatfájljából.')}
</ul></section>
<section><h2 id="szabalyok">A ${evOs(A.szEv)} bérszámítás szabályai</h2>${szabalyLista(A)}</section>
<section><h2 id="berkuszob">Bérküszöb</h2><p>${esc(A.szabalyok.berkuszob.szoveg)}</p><p class="forras">${esc(A.szabalyok.berkuszob.hely)} · <a href="${esc(A.szabalyok.berkuszob.forras.url)}" rel="noopener">${esc(A.szabalyok.berkuszob.forras.nev)}</a> · ellenőrizve: ${datum(A.szabalyok.berkuszob.ellenorizve)}</p></section>
<section class="szoveg"><h2>Amit az adatokról tudnod kell</h2>
<p>A KSH foglalkozásonként átlagot közöl, mediánt nem. Az átlag magasabb a mediánnál, mert a kiugró bérek felfelé húzzák.</p>
<p>Az adat a teljes munkaidőben alkalmazásban állókra vonatkozik. A vállalkozók és a részmunkaidősök nincsenek benne. A kereset az alapbér mellett a pótlékokat, a prémiumot és a jutalmat is tartalmazza.</p>
<p>A köznapi neveket (például „programozó” a Szoftverfejlesztő mellett) mi rendeltük a FEOR-kódokhoz. Egy köznapi név több kódhoz is illhet; ilyenkor a leggyakoribb megfelelőt választottuk.</p>
<p>A jogszabályok szövegét gép nem tudja értelmezni. Ezért a frissítő hetente megnézi, hogy a forrásoldalakon megvan-e még az a mondat és szám, amelyre a szabály épül, és jelez, ha eltűnt. A 25 év alattiak évente változó határát a NAV oldaláról magától átveszi.</p></section>`,
  };
}

export function adatok(A) {
  return {
    ut: 'adatok/', cim: 'Letölthető adatok: fizetések és bérküszöbök CSV-ben, JSON-ban', leiras: `${A.fog.length} foglalkozás bruttó és nettó átlagkeresete, korcsoportos bontása és bérküszöbe letölthető fájlokban, szabad felhasználással.`,
    morzsa: [['adatok/', 'Letölthető adatok']],
    tartalom: `<h1>Letölthető adatok</h1>
<p class="bevezeto">Az oldal adatai szabadon felhasználhatók, kereskedelmi célra is (CC BY 4.0). Forrásmegjelölés: „KSH, ${esc(A.cfg.marka)} (${A.cfg.domain.replace('https://', '')})”.</p>
<ul class="szabalyok">
<li><b><a href="/adatok/foglalkozasok.csv" download>foglalkozasok.csv</a></b> FEOR-kód, megnevezés, köznapi nevek, bruttó és nettó átlag (${A.utolso}), korcsoportok, 80%-os bérküszöb.</li>
<li><b><a href="/adatok/berkuszob.csv" download>berkuszob.csv</a></b> Bérküszöb FEOR-kódonként.</li>
<li><b><a href="/adatok/v1/kereset.json">v1/kereset.json</a></b> A teljes idősor (${A.evek[0]}–${A.utolso}) korcsoportonként, gépi feldolgozásra.</li>
<li><b><a href="/adatok/v1/szabalyok.json">v1/szabalyok.json</a></b> A bérszámítás szabályai forrással és dátummal.</li>
</ul>
${kerForras(A)}`,
  };
}

export function impresszum(A) {
  const u = A.cfg.uzemelteto;
  return {
    ut: 'impresszum/', cim: 'Impresszum és adatkezelés', leiras: 'Az oldal üzemeltetője, a tárhelyszolgáltató és az adatkezelés.', morzsa: [['impresszum/', 'Impresszum']],
    tartalom: `<h1>Impresszum és adatkezelés</h1>
<section class="szoveg"><h2>Üzemeltető</h2><p>${esc(u.nev)}, ${esc(u.tipus)}.${A.cfg.kapcsolat_email ? ` Kapcsolat: <a href="mailto:${esc(A.cfg.kapcsolat_email)}">${esc(A.cfg.kapcsolat_email)}</a>.` : ''}</p>
<h2>Tárhely</h2><p>${esc(A.cfg.tarhely.nev)}, ${esc(A.cfg.tarhely.cim)}, <a href="${esc(A.cfg.tarhely.web)}" rel="noopener">${esc(A.cfg.tarhely.web.replace('https://', ''))}</a>.</p>
<h2>Adatkezelés</h2><p>Az oldal nem használ sütit, nem kér regisztrációt, és nem gyűjt személyes adatot. Amit a kalkulátorokba beírsz, az a böngésződben marad, a szerverre nem kerül el. A tárhelyszolgáltató a kiszolgáláshoz szükséges technikai naplót vezet (IP-cím, időpont).</p>
<h2>Felelősség</h2><p>Az oldal tájékoztató jellegű. A számítások a megjelölt források és a hatályos szabályok alapján készülnek, de nem helyettesítik a bérszámfejtést, az adótanácsadást és a jogi tanácsot.</p></section>`,
  };
}

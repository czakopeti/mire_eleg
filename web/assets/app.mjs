// Browser layer: search boxes and the live calculators. Forms always open empty.
import * as S from './szamitas.mjs?v=89298ea9';
const { ft, szamHu, idotartam, kulcs } = S;

const $ = (s, e = document) => e.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const adat = () => { const e = $('#adat'); return e ? JSON.parse(e.textContent) : {}; };
const szamBe = v => { const t = String(v ?? '').replace(/[\s .]/g, '').replace(',', '.'); return t === '' || isNaN(t) ? null : Number(t); };
const sor = (c, e, o = '') => `<div class="szalag-sor ${o}"><span>${c}</span><b>${e}</b></div>`;
const datumHu = iso => { const [e, h, n] = iso.split('-').map(Number); return `${e}. ${['január', 'február', 'március', 'április', 'május', 'június', 'július', 'augusztus', 'szeptember', 'október', 'november', 'december'][h - 1]} ${n}.`; };

// thousand separators while typing
document.addEventListener('input', e => {
  const i = e.target;
  if (i.matches?.('input[inputmode="numeric"]')) { const n = i.value.replace(/\D/g, ''); i.value = n ? Number(n).toLocaleString('hu-HU').replace(/ /g, ' ') : ''; }
});

// ---- lazy data
let fogP, telP;
const foglalkozasok = () => fogP ??= fetch('/adatok/kereso.json').then(r => r.json()).then(a => a.map(([kod, nev, slug, egyeb, brutto, netto, rang, real, kor]) => ({ kod, nev, slug, egyeb, brutto, netto, rang, real, kor, k: kulcs(`${nev} ${egyeb} ${kod}`) })));
const telepulesek = () => telP ??= fetch('/adatok/telepulesek.json').then(r => r.json()).then(a => a.map(([kod, n, m, ar, ev, becsult, tipus, db, slug]) => ({ kod, n, m, ar, ev, becsult, tipus, db, slug, k: kulcs(n) })));

function talalatok(lista, q, max = 8) {
  const k = kulcs(q); if (!k) return [];
  const szavak = k.split(' ');
  return lista.map(x => {
    if (!szavak.every(s => x.k.includes(s))) return null;
    const p = x.k.startsWith(k) ? 0 : x.k.split(' ').some(w => w.startsWith(szavak[0])) ? 1 : 2;
    return [p, x];
  }).filter(Boolean).sort((a, b) => a[0] - b[0] || a[1].k.length - b[1].k.length).slice(0, max).map(x => x[1]);
}

/** Generic combobox. valaszt(item) is called on pick; sorHtml(item) renders a row. */
function kombo(input, lista, forras, sorHtml, valaszt) {
  let elemek = [], akt = -1;
  const rajzol = () => {
    lista.innerHTML = elemek.map((x, i) => `<li role="option" data-i="${i}"${i === akt ? ' class="akt"' : ''}>${sorHtml(x)}</li>`).join('') || (input.value.trim().length > 1 ? '<li class="nincs">Nincs találat. Próbáld rövidebben vagy a FEOR-kóddal.</li>' : '');
    lista.hidden = !lista.innerHTML;
  };
  input.addEventListener('input', async () => { elemek = talalatok(await forras(), input.value); akt = -1; rajzol(); });
  input.addEventListener('focus', () => { forras(); });
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (elemek.length) { akt = (akt + (e.key === 'ArrowDown' ? 1 : -1) + elemek.length) % elemek.length; rajzol(); } }
    else if (e.key === 'Enter') { e.preventDefault(); const x = elemek[akt >= 0 ? akt : 0]; if (x) { lista.hidden = true; valaszt(x); } }
    else if (e.key === 'Escape') lista.hidden = true;
  });
  lista.addEventListener('mousedown', e => e.preventDefault());
  lista.addEventListener('click', e => { const li = e.target.closest('li[data-i]'); if (li) { lista.hidden = true; valaszt(elemek[li.dataset.i]); } });
  input.addEventListener('blur', () => setTimeout(() => { lista.hidden = true; }, 150));
}
const fogSor = f => `<span>${esc(f.nev)}<small>${f.egyeb ? esc(f.egyeb.split('|')[0]) + ', ' : ''}FEOR ${f.kod}</small></span><b>${ft(f.brutto)}</b>`;
const telSor = t => `<span>${esc(t.n)}<small>${esc(t.m)}</small></span><b>${szamHu(Math.round(t.ar / 1000))} e Ft/m²</b>`;
const telJegy = (t, d) => `${t.ev}. évi ${t.tipus === 't' ? 'társasházi lakásárak' : 'lakóingatlan-árak'}${t.becsult && d?.becsles ? `, mai szintre becsülve (${esc(d.becsles)})` : ''}. Forrás: <a href="https://ingatlanmerleg.hu/lakasarak/" rel="noopener">Ingatlanmérleg, KSH Ingatlanadattár</a>.`;

// ---- motion: charts draw in once when visible; totals count up
const csendes = matchMedia('(prefers-reduced-motion: reduce)').matches;
const figyelo = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('lat'); figyelo.unobserve(e.target); } }), { threshold: 0.35 }) : null;
const latvany = (gyoker = document) => gyoker.querySelectorAll('[data-latvany]').forEach(e => figyelo ? figyelo.observe(e) : e.classList.add('lat'));
latvany();
function szamlal(el) {
  const cel = Number(el.dataset.szamlal); if (csendes || !cel) return;
  const t0 = performance.now(), ido = 900;
  const lep = t => { const p = Math.min(1, (t - t0) / ido), k = 1 - Math.pow(1 - p, 3); el.textContent = ft(cel * k); if (p < 1) requestAnimationFrame(lep); };
  requestAnimationFrame(lep);
}
const elojel = x => `${x >= 0 ? '+' : '−'}${szamHu(Math.abs(x) * 100, 1)}%`;

// ---- the strip of all occupations: tooltip on hover, click opens the occupation
let savBub;
for (const sv of document.querySelectorAll('[data-sav]')) {
  const hos = sv.closest('.hos');
  if (hos && !csendes) { const v = [...sv.querySelectorAll('.sv-v')]; v.forEach((e, i) => e.style.setProperty('--d', Math.round(i / v.length * 700))); }
  const mutat = e => { const t = e.target; if (!t.classList?.contains('sv-v')) return; savBub ??= document.body.appendChild(Object.assign(document.createElement('div'), { className: 'sav-buborek' })); const r = t.getBoundingClientRect(); savBub.innerHTML = `<b>${esc(t.dataset.n)}</b>${ft(Number(t.dataset.b))}`; savBub.style.left = `${Math.min(Math.max(r.left, 100), innerWidth - 100)}px`; savBub.style.top = `${r.top}px`; savBub.hidden = false; };
  sv.addEventListener('pointerover', mutat);
  sv.addEventListener('pointerout', () => { if (savBub) savBub.hidden = true; });
  sv.addEventListener('click', async e => { const t = e.target; if (!t.classList?.contains('sv-v')) return; if (hos) { const l = await foglalkozasok(); const f = l.find(x => x.kod === t.dataset.k); if (f) hosValaszt(f, l.length); } else location.href = `/fizetes/${t.dataset.s}/`; });
}
function savKiemel(sv, f) {
  sv.querySelector('.sv-v.ki')?.classList.remove('ki');
  const v = sv.querySelector(`.sv-v[data-k="${f.kod}"]`); if (!v) return;
  v.classList.add('ki'); v.parentNode.appendChild(v);
  const x = Number(v.getAttribute('x1')), W = sv.viewBox.baseVal.width, horg = x > W - 170 ? 'end' : x < 170 ? 'start' : 'middle';
  const j = sv.querySelector('.sv-jelolo'); j.removeAttribute('hidden'); sv.appendChild(j);
  const [n, e] = j.querySelectorAll('text'); for (const t of [n, e]) { t.setAttribute('x', x); t.setAttribute('text-anchor', horg); }
  n.textContent = f.nev; e.textContent = ft(f.brutto);
}

// ---- site search (list page) and the home hero, where picking an occupation updates the card and the strip
const hosKartya = $('[data-hos-kartya]');
if (hosKartya) hosKartya.querySelectorAll('[data-szamlal]').forEach(szamlal);
function hosValaszt(f, db) {
  hosKartya.innerHTML = `<p class="hk-fej">${esc(f.nev)}</p><p class="hk-szam"><span data-szamlal="${f.netto}">${ft(f.netto)}</span></p><p class="hk-al">nettó havonta, bruttó ${ft(f.brutto)}</p>
<dl><dt>Helyezés</dt><dd>${f.rang}. / ${db}</dd>${f.real == null ? '' : `<dt>Reálbér 2019 óta</dt><dd>${elojel(f.real)}</dd>`}</dl>
<p class="hk-gomb"><a class="gomb feher" href="/fizetes/${f.slug}/">A teljes oldal</a><a class="gomb atlatszo" href="/hol-allsz/?f=${f.kod}">Hol állsz?</a></p>`;
  if (!csendes) { hosKartya.classList.remove('valt'); void hosKartya.offsetWidth; hosKartya.classList.add('valt'); hosKartya.querySelectorAll('[data-szamlal]').forEach(szamlal); }
  savKiemel($('.hos [data-sav]'), f);
  document.querySelectorAll('[data-hos-kod]').forEach(g => g.classList.toggle('akt', g.dataset.hosKod === f.kod));
}
for (const k of document.querySelectorAll('[data-kereso]')) {
  const hos = k.dataset.kereso === 'hos' && hosKartya;
  kombo($('input', k), $('ul', k), foglalkozasok, fogSor, async f => { if (hos) { $('input', k).value = f.nev; hosValaszt(f, (await foglalkozasok()).length); } else location.href = `/fizetes/${f.slug}/`; });
}
for (const g of document.querySelectorAll('[data-hos-kod]')) g.addEventListener('click', async () => { const l = await foglalkozasok(); const f = l.find(x => x.kod === g.dataset.hosKod); if (f) hosValaszt(f, l.length); });
// header menu: close on Escape, and close the mobile menu when a link is used
document.addEventListener('keydown', e => { if (e.key === 'Escape') { document.activeElement?.blur?.(); $('.mobilmenu')?.removeAttribute('open'); } });

// ---- gross -> net
const nk = $('[data-netto-kalk]');
if (nk) {
  const d = adat(), ki = $('[data-netto-eredmeny]');
  const szamol = () => {
    const brutto = szamBe(nk.brutto.value);
    if (!brutto) { ki.innerHTML = `<p class="szalag-fej">Havi elszámolás<span>${d.ev}</span></p><p class="ures">Írd be a bruttó béredet, és itt megjelenik a levezetés.</p>`; return; }
    if (nk.anya.checked) nk.fiatal25.checked = false;
    const r = S.netto(d.sz, { brutto, fiatal25: nk.fiatal25.checked, anya: nk.anya.checked, eltartottak: Number(nk.eltartottak.value) || 0 });
    const alap = S.netto(d.sz, { brutto });
    ki.innerHTML = `<p class="szalag-fej">Havi elszámolás<span>${d.ev}</span></p>
${sor('Bruttó bér', ft(r.brutto))}
${r.anyaKedv ? sor('Anyák kedvezménye (szja-mentes)', ft(r.anyaKedv), 'halk') : ''}
${r.fiatalKedv ? sor('25 év alattiak kedvezménye', ft(r.fiatalKedv), 'halk') : ''}
${r.csaladiKeret ? sor('Családi kedvezmény az adóalapból', ft(r.csaladiSzja), 'halk') : ''}
${sor('Személyi jövedelemadó', `− ${ft(r.szja)}`)}
${sor('Tb-járulék (18,5%)', `− ${ft(r.tbTeljes)}`)}
${r.jarulekKedv ? sor('Családi járulékkedvezmény', `+ ${ft(r.jarulekKedv)}`) : ''}
${sor('Nettó bér', ft(r.netto), 'ossz')}
<p class="szalag-lab">A bruttó ${szamHu(r.arany * 100, 1)}%-a marad nálad.${r.netto > alap.netto ? ` A kedvezmények havi ${ft(r.netto - alap.netto)}-ot hoznak.` : ''} Szabályok: ${d.ev}, <a href="#szabalyok">forrásokkal lejjebb</a>.</p>`;
  };
  nk.addEventListener('input', szamol); nk.addEventListener('change', szamol);
  $('[data-minta]', nk).addEventListener('click', e => { const m = JSON.parse(e.currentTarget.dataset.minta); nk.brutto.value = szamHu(m.brutto); nk.eltartottak.value = m.eltartottak; nk.fiatal25.checked = nk.anya.checked = false; szamol(); });
  const b = new URLSearchParams(location.search).get('b');
  if (b && /^\d{5,8}$/.test(b)) { nk.brutto.value = szamHu(Number(b)); szamol(); }
}

// ---- occupation page: your own settlement
const mini = $('[data-mini-lakas]');
if (mini) {
  const netto = Number(mini.dataset.netto), ki = $('.mini-eredmeny', mini);
  kombo($('input', mini), $('ul', mini), telepulesek, telSor, t => {
    $('input', mini).value = t.n;
    const l = S.lakas({ nettoHavi: netto, m2Ft: t.ar });
    ki.hidden = false;
    ki.innerHTML = `<b>${esc(t.n)}:</b> egy 50 m²-es lakás becsült ára ${ft(l.ar)}, ami <b>${idotartam(l.honap)}</b> teljes nettó bére ebben a foglalkozásban. <small>${telJegy(t)}</small>`;
  });
}

// ---- what is it enough for
const me = $('[data-mire]');
if (me) {
  const d = adat(), ki = $('[data-mire-eredmeny]');
  let fog = null, tel = null;
  const szamol = () => {
    const sajat = szamBe(me.netto.value);
    const netto = sajat || fog?.netto;
    if (!netto) { ki.innerHTML = '<p class="szalag-fej">Mire elég?</p><p class="ures">Válassz foglalkozást vagy írd be a nettódat, és add meg a települést.</p>'; return; }
    let h = `<p class="szalag-fej">Mire elég?<span>${sajat ? 'saját nettó' : esc(fog.nev)}</span></p>${sor('Havi nettó', ft(netto))}`;
    if (!sajat) h += `<p class="szalag-jegy">KSH ${d.kerEv}. évi bruttó átlag (${ft(fog.brutto)}), kedvezmények nélkül. <a href="/fizetes/${fog.slug}/">A foglalkozás oldala</a></p>`;
    if (tel) {
      const m2 = szamBe(me.m2.value) || 50, megt = Math.min(100, Math.max(1, szamBe(me.megt.value) || 100)) / 100;
      const l = S.lakas({ nettoHavi: netto, m2Ft: tel.ar, m2, megtakaritas: megt });
      h += `${sor(`Négyzetméterár, ${esc(tel.n)}`, ft(tel.ar))}${sor(`${szamHu(m2)} m² lakás ára`, ft(l.ar))}${megt < 1 ? sor(`Havi megtakarítás (${szamHu(megt * 100)}%)`, ft(netto * megt)) : ''}${sor('Ennyi idő alatt jön ki', idotartam(l.honap), 'ossz')}
<p class="szalag-jegy">${megt < 1 ? '' : 'A teljes nettó bérrel számolva. Írd be, a nettód hány százalékát teszed félre, és valósabb számot kapsz. '}Egy havi nettóból ${szamHu(l.m2PerHavi, 2)} m² jön ki. ${telJegy(tel, d)}</p>`;
    } else h += '<p class="ures">Add meg a települést a lakáshoz.</p>';
    const ar = szamBe(me.autoar.value);
    if (ar) {
      const tip = me.uza.value;
      const a = S.auto({ nettoHavi: netto, ar, kmHavi: szamBe(me.km.value), fogyasztas: szamBe(me.fogy.value), literAr: d.auto[tip] });
      h += `${sor('Az autó ára', ft(ar))}${sor('Ennyi havi nettó bér', `${szamHu(a.haviBer, 1)} hónap`, a.uzemanyag == null ? 'ossz' : '')}`;
      if (a.uzemanyag != null) h += `${sor('Üzemanyag havonta', ft(a.uzemanyag))}${sor('A nettód ennyi része megy tankolásra', `${szamHu(a.uzemanyagArany * 100, 1)}%`, 'ossz')}<p class="szalag-jegy">${tip === 'benzin' ? 'Benzin' : 'Dízel'}: ${d.auto[tip]} Ft/l, a NAV ${d.auto.honap.replace('-', '. ')}. havi ára. Forrás: <a href="https://autozom.hu/nav-uzemanyagar/" rel="noopener">autózom</a>.</p>`;
    }
    ki.innerHTML = h;
  };
  kombo($('#me-fog'), $('#me-fog-lista'), foglalkozasok, fogSor, f => { fog = f; $('#me-fog').value = f.nev; me.netto.value = ''; szamol(); });
  kombo($('#me-tel'), $('#me-tel-lista'), telepulesek, telSor, t => { tel = t; $('#me-tel').value = t.n; szamol(); });
  me.addEventListener('input', e => { if (e.target.id === 'me-fog' && !e.target.value) fog = null; if (e.target.id === 'me-tel' && !e.target.value) tel = null; szamol(); });
  me.addEventListener('change', szamol);
  const betolt = async (fk, tk) => {
    if (fk) { fog = (await foglalkozasok()).find(f => f.kod === fk) || null; if (fog) $('#me-fog').value = fog.nev; }
    if (tk) { tel = (await telepulesek()).find(t => t.kod === tk) || null; if (tel) $('#me-tel').value = tel.n; }
    szamol();
  };
  $('[data-minta]', me).addEventListener('click', e => { const m = JSON.parse(e.currentTarget.dataset.minta); me.netto.value = ''; me.autoar.value = szamHu(m.autoar); me.km.value = szamHu(m.km); me.fogy.value = m.fogy; betolt(m.fog, m.tel); });
  const f = new URLSearchParams(location.search).get('f');
  if (f && /^\d{4}$/.test(f)) betolt(f, null);
}

// ---- wage threshold
const bk = $('[data-kuszob]');
if (bk) {
  const d = adat(), ki = $('[data-kuszob-eredmeny]');
  let fog = null;
  const szamol = () => {
    if (!fog) { ki.innerHTML = `<p class="szalag-fej">Bérküszöb<span>KSH, ${d.ev}</span></p><p class="ures">Válassz foglalkozást, és itt megjelenik a küszöb.</p>`; return; }
    const k = S.berkuszob(fog.brutto, d.arany), ber = szamBe(bk.ber.value);
    let h = `<p class="szalag-fej">${esc(fog.egyeb ? fog.egyeb.split('|')[0] : fog.nev)}<span>FEOR ${fog.kod}</span></p>
${sor(`Országos bruttó átlag, ${d.ev}`, ft(k.atlag))}${sor('Ennek 80%-a', ft(k.hatarKerek))}${sor('A legkisebb megfelelő alapbér', ft(k.legkisebb), 'ossz')}`;
    if (ber) {
      const jo = S.berMegfelel(ber, fog.brutto, d.arany);
      h += `<p class="itelet ${jo ? 'jo' : 'rossz'}"><b>${jo ? 'Megfelel.' : 'Kevés.'}</b> A ${ft(ber)} alapbér az átlag ${szamHu(ber / fog.brutto * 100, 1)}%-a${jo ? ', a küszöb fölött van.' : `, még ${ft(k.legkisebb - ber)} hiányzik.`}</p>`;
    }
    h += `<p class="szalag-jegy">Forrás: KSH STADAT 20.1.1.52., ${d.ev}. évi adat, letöltve: ${datumHu(d.letoltve)} A küszöböt meg kell haladni (445/2013. Korm. r. 6. § (3), 20. § (6)). <a href="/fizetes/${fog.slug}/">A foglalkozás oldala</a></p>`;
    ki.innerHTML = h;
  };
  kombo($('#bk-fog'), $('#bk-lista'), foglalkozasok, fogSor, f => { fog = f; $('#bk-fog').value = `${f.kod} ${f.egyeb ? f.egyeb.split('|')[0] : f.nev}`; szamol(); });
  bk.addEventListener('input', e => { if (e.target.id === 'bk-fog' && !e.target.value) fog = null; szamol(); });
  $('[data-minta]', bk).addEventListener('click', async e => { const m = JSON.parse(e.currentTarget.dataset.minta); fog = (await foglalkozasok()).find(f => f.kod === m.fog); $('#bk-fog').value = `${fog.kod} ${fog.egyeb ? fog.egyeb.split('|')[0] : fog.nev}`; bk.ber.value = szamHu(m.ber); szamol(); });
}

// ---- shared bits for the new tools
const rovid = n => n >= 1e6 ? `${szamHu(n / 1e6, 2)} M` : `${szamHu(Math.round(n / 1000))} e`;
const KOR = ['30 alatt', '30–39', '40–49', '50 felett'];
const param = k => new URLSearchParams(location.search).get(k);

// ---- where do you stand
const ha = $('[data-hol]');
if (ha) {
  const d = adat(), ki = $('[data-hol-eredmeny]'), abra = $('[data-hol-abra]');
  let fog = null;
  const szamol = async () => {
    const brutto = szamBe(ha.brutto.value);
    if (!fog || !brutto) { ki.innerHTML = '<p class="szalag-fej">Hol állsz?</p><p class="ures">Válaszd ki a szakmádat, és írd be a bruttódat.</p>'; abra.hidden = true; return; }
    const mind = await foglalkozasok();
    const kor = ha.kor.value === '' ? null : Number(ha.kor.value), korAtl = kor == null ? null : fog.kor?.[kor];
    const alatta = mind.filter(f => f.brutto < brutto).length;
    const n = S.netto(d.sz, { brutto });
    const kul = (a) => `${elojel(brutto / a - 1)}`;
    ki.innerHTML = `<p class="szalag-fej">${esc(fog.nev)}<span>FEOR ${fog.kod}</span></p>
${sor('A te bruttód', ft(brutto))}${sor('Nettó, kedvezmények nélkül', ft(n.netto), 'halk')}
${sor(`A szakmád átlaga (${ft(fog.brutto)})`, kul(fog.brutto))}
${korAtl ? sor(`A ${KOR[kor]} évesek átlaga (${ft(korAtl)})`, kul(korAtl)) : (kor != null ? sor(`A ${KOR[kor]} évesek átlaga`, 'nincs adat', 'halk') : '')}
${sor(`Országos medián (${ft(d.orsz.median)})`, kul(d.orsz.median))}
${sor(`Országos átlag (${ft(d.orsz.atlag)})`, kul(d.orsz.atlag))}
${sor('Ennyi szakma átlagát előzöd meg', `${alatta} / ${d.db}`, 'ossz')}
<p class="szalag-lab">${brutto >= fog.brutto ? 'A szakmád átlaga fölött keresel.' : 'A szakmád átlaga alatt keresel, ahogy a dolgozók többsége: az átlagot a kiugró bérek felfelé húzzák.'} Szakmai átlag: KSH, ${d.ev}. Országos adat: ${d.orsz.ev}. ${esc(d.orsz.idoszak)}. <a href="/fizetes/${fog.slug}/">A szakma oldala</a></p>`;
    // strip: every occupation average as a tick on a log scale
    const W = 860, H = 178, bal = 20, jobb = 20, yT = 96;
    const lo = Math.log(Math.min(180000, brutto * 0.9)), hi = Math.log(Math.max(...mind.map(f => f.brutto), brutto) * 1.05);
    const x = v => bal + (W - bal - jobb) * (Math.log(v) - lo) / (hi - lo);
    let g = mind.map(f => `<line class="st-vonas" x1="${x(f.brutto).toFixed(1)}" x2="${x(f.brutto).toFixed(1)}" y1="${yT - 16}" y2="${yT + 16}"/>`).join('');
    for (const t of [250000, 500000, 1000000, 2000000, 4000000]) if (Math.log(t) > lo && Math.log(t) < hi) g += `<text class="d-al" x="${x(t)}" y="${H - 8}" text-anchor="middle">${rovid(t)} Ft</text>`;
    const horg = v => x(v) > W - 150 ? 'end' : x(v) < 150 ? 'start' : 'middle';
    g += `<line class="st-median" x1="${x(d.orsz.median)}" x2="${x(d.orsz.median)}" y1="${yT - 26}" y2="${yT + 34}"/><text class="d-al" x="${x(d.orsz.median)}" y="${yT + 46}" text-anchor="${horg(d.orsz.median)}">országos medián</text>`;
    g += `<line class="st-szakma" x1="${x(fog.brutto)}" x2="${x(fog.brutto)}" y1="${yT - 24}" y2="${yT + 24}"/><text class="d-nev" x="${x(fog.brutto)}" y="${yT - 50}" text-anchor="${horg(fog.brutto)}">a szakmád átlaga</text><text class="d-al" x="${x(fog.brutto)}" y="${yT - 34}" text-anchor="${horg(fog.brutto)}">${rovid(fog.brutto)} Ft</text>`;
    const kozel = Math.abs(x(brutto) - x(fog.brutto)) < 110;
    g += `<circle class="st-te" cx="${x(brutto)}" cy="${yT}" r="9"/><text class="d-ertek" x="${x(brutto)}" y="${kozel ? yT - 72 : yT - 34}" text-anchor="${horg(brutto)}">te: ${rovid(brutto)} Ft</text>`;
    abra.hidden = false;
    abra.innerHTML = `<svg class="abra" viewBox="0 0 ${W} ${H}" role="img" aria-label="Sávábra: a ${d.db} szakma átlagkeresete logaritmikus skálán, rajta a te béred (${ft(brutto)}), a szakmád átlaga (${ft(fog.brutto)}) és az országos medián (${ft(d.orsz.median)}).">${g}</svg><p class="jelmagy"><span>Minden vonás egy szakma országos bruttó átlaga. A skála logaritmikus.</span></p>`;
  };
  kombo($('#ha-fog'), $('#ha-lista'), foglalkozasok, fogSor, f => { fog = f; $('#ha-fog').value = f.nev; szamol(); });
  ha.addEventListener('input', e => { if (e.target.id === 'ha-fog' && !e.target.value) fog = null; szamol(); });
  ha.addEventListener('change', szamol);
  const betolt = async kod => { fog = (await foglalkozasok()).find(f => f.kod === kod) || null; if (fog) $('#ha-fog').value = fog.nev; szamol(); };
  $('[data-minta]', ha).addEventListener('click', e => { const m = JSON.parse(e.currentTarget.dataset.minta); ha.brutto.value = szamHu(m.brutto); ha.kor.value = m.kor; betolt(m.fog); });
  if (/^\d{4}$/.test(param('f') || '')) betolt(param('f'));
}

// ---- compare occupations
const oh = $('[data-ossze]');
if (oh) {
  const d = adat(), ki = $('[data-ossze-eredmeny]');
  const val = [null, null, null];
  let teljesP;
  const teljes = () => teljesP ??= fetch('/adatok/v1/kereset.json').then(r => r.json());
  const rajzol = async () => {
    const lista = val.filter(Boolean);
    const q = new URLSearchParams(); lista.forEach((f, i) => q.set('abc'[i], f.kod));
    history.replaceState(null, '', lista.length ? `?${q}` : location.pathname);
    if (lista.length < 2) { ki.innerHTML = '<p class="ures-doboz">Válassz legalább két foglalkozást, és itt megjelenik az összevetés.</p>'; return; }
    const T = await teljes(), evek = T.evek;
    const sorok = lista.map(f => { const t = T.foglalkozasok[f.kod]; return { f, e: t.e, k: t.k.at(-1), real: S.realErtek(evek, t.e, d.index) }; });
    const kartyak = sorok.map((s, i) => `<div class="kartya s${i}"><h3><a href="/fizetes/${s.f.slug}/">${esc(s.f.nev)}</a></h3><small>FEOR ${s.f.kod}</small><b>${ft(s.f.brutto)}</b><small>bruttó átlag, ${evek.at(-1)}</small><dl><dt>Nettó</dt><dd>${ft(s.f.netto)}</dd><dt>Helyezés</dt><dd>${s.f.rang}. / ${d.db}</dd><dt>Reálbér ${evek[0]} óta</dt><dd>${s.f.real == null ? '–' : elojel(s.f.real)}</dd></dl></div>`).join('');
    // grouped bars by age
    const W = 460, H = 270, bal = 8, also = 30, felso = 26;
    const max = Math.max(...sorok.flatMap(s => s.k.filter(v => v != null)));
    const sav = (W - 2 * bal) / 4, osz = Math.min(30, (sav - 22) / sorok.length);
    const y = v => felso + (H - felso - also) * (1 - v / max);
    let b = `<line class="tengely" x1="${bal}" x2="${W - bal}" y1="${H - also}" y2="${H - also}"/>`;
    KOR.forEach((c, j) => {
      const kx = bal + sav * j + sav / 2, x0 = kx - (osz + 2) * sorok.length / 2 + 1;
      sorok.forEach((s, i) => { const v = s.k[j]; if (v == null) return; const xx = x0 + (osz + 2) * i, top = y(v), r = Math.min(4, H - also - top); b += `<path class="oszlop s${i}" style="--i:${j}" d="M${xx} ${H - also}V${top + r}q0-${r} ${r}-${r}h${osz - 2 * r}q${r} 0 ${r} ${r}V${H - also}z"><title>${esc(s.f.nev)}, ${c}: ${ft(v)}</title></path>`; });
      b += `<text class="d-cimke" x="${kx}" y="${H - also + 19}" text-anchor="middle">${c}</text>`;
    });
    b += `<line class="racs" x1="${bal}" x2="${W - bal}" y1="${y(max)}" y2="${y(max)}"/><text class="d-al" x="${bal}" y="${y(max) - 6}">${rovid(max)} Ft</text>`;
    // real-value lines
    const W2 = 460, jobb = 20, bal2 = 46, also2 = 30, felso2 = 16;
    const rmax = Math.max(...sorok.flatMap(s => s.real.filter(v => v != null))) * 1.06;
    const x2 = i => bal2 + (W2 - bal2 - jobb) * i / (evek.length - 1), y2 = v => felso2 + (H - felso2 - also2) * (1 - v / rmax);
    let l = '';
    for (const t of [0.5, 1]) l += `<line class="racs" x1="${bal2}" x2="${W2 - jobb}" y1="${y2(rmax * t / 1.06)}" y2="${y2(rmax * t / 1.06)}"/><text class="d-al" x="${bal2 - 6}" y="${y2(rmax * t / 1.06) + 4}" text-anchor="end">${rovid(rmax * t / 1.06)}</text>`;
    l += `<line class="tengely" x1="${bal2}" x2="${W2 - jobb}" y1="${H - also2}" y2="${H - also2}"/>`;
    evek.forEach((e, i) => { l += `<text class="d-cimke" x="${x2(i)}" y="${H - also2 + 19}" text-anchor="middle">${e}</text>`; });
    let rj = '';
    sorok.forEach((s, i) => {
      let p = '', toll = false; s.real.forEach((v, j) => { if (v == null) { toll = false; return; } p += `${toll ? 'L' : 'M'}${x2(j).toFixed(1)} ${y2(v).toFixed(1)}`; toll = true; });
      rj += `<path class="vonal s${i}" d="${p}"/>` + s.real.map((v, j) => v == null ? '' : `<circle class="pont s${i}" cx="${x2(j)}" cy="${y2(v)}" r="4"><title>${esc(s.f.nev)}, ${evek[j]}: ${ft(v)} (${evek.at(-1)}. évi áron)</title></circle>`).join('');
    });
    l += `<g class="rajz">${rj}</g>`;
    const jm = (t) => `<p class="jelmagy">${sorok.map((s, i) => `<span><i class="${t} s${i}"></i>${esc(s.f.nev)}</span>`).join('')}</p>`;
    const tabla = `<div class="gordul"><table><thead><tr><th></th>${sorok.map(s => `<th>${esc(s.f.nev)}</th>`).join('')}</tr></thead><tbody>
<tr><th>Bruttó átlag, ${evek.at(-1)}</th>${sorok.map(s => `<td>${ft(s.f.brutto)}</td>`).join('')}</tr>
<tr><th>Nettó, kedvezmények nélkül</th>${sorok.map(s => `<td>${ft(s.f.netto)}</td>`).join('')}</tr>
${KOR.map((c, j) => `<tr><th>${c}, bruttó</th>${sorok.map(s => `<td>${ft(s.k[j])}</td>`).join('')}</tr>`).join('')}
<tr><th>Bruttó, ${evek[0]}</th>${sorok.map(s => `<td>${ft(s.e[0])}</td>`).join('')}</tr>
<tr><th>Ugyanez ${evek.at(-1)}. évi áron</th>${sorok.map(s => `<td>${ft(s.real[0])}</td>`).join('')}</tr>
<tr><th>Reálbér ${evek[0]} óta</th>${sorok.map(s => `<td>${s.f.real == null ? '–' : elojel(s.f.real)}</td>`).join('')}</tr></tbody></table></div>`;
    const elso = [...sorok].sort((a, c) => c.f.brutto - a.f.brutto);
    ki.innerHTML = `<p class="bevezeto">A legtöbbet ${esc(elso[0].f.nev.toLocaleLowerCase('hu'))}ként lehet keresni: bruttó ${ft(elso[0].f.brutto - elso.at(-1).f.brutto)}-tal többet havonta, mint a legalacsonyabb átlagú szakmában a kiválasztottak közül.</p>
<div class="kartyak">${kartyak}</div>
<div class="ket-abra"><figure><h3>Pályaív: bruttó átlag korcsoportonként</h3><svg class="abra" data-latvany viewBox="0 0 ${W} ${H}" role="img" aria-label="Csoportos oszlopdiagram: bruttó átlagkereset korcsoportonként. Az értékek a lenti táblázatban vannak.">${b}</svg>${jm('n')}</figure>
<figure><h3>A bér értéke ${evek.at(-1)}. évi áron</h3><svg class="abra" data-latvany viewBox="0 0 ${W2} ${H}" role="img" aria-label="Vonaldiagram: a bruttó átlagkereset inflációval korrigálva, ${evek[0]}–${evek.at(-1)}. Az értékek a lenti táblázatban vannak.">${l}</svg>${jm('j')}</figure></div>
${tabla}`;
    latvany(ki);
  };
  [0, 1, 2].forEach(i => {
    const be = $(`#oh-${i}`);
    kombo(be, $(`#oh-l${i}`), foglalkozasok, fogSor, f => { val[i] = f; be.value = f.nev; rajzol(); });
    be.addEventListener('input', () => { if (!be.value && val[i]) { val[i] = null; rajzol(); } });
  });
  const betolt = async kodok => { const l = await foglalkozasok(); kodok.slice(0, 3).forEach((k, i) => { val[i] = l.find(f => f.kod === k) || null; $(`#oh-${i}`).value = val[i]?.nev || ''; }); rajzol(); };
  $('[data-minta]', oh).addEventListener('click', e => betolt(JSON.parse(e.currentTarget.dataset.minta)));
  const kezdo = ['a', 'b', 'c'].map(param).filter(k => /^\d{4}$/.test(k || ''));
  if (kezdo.length) betolt(kezdo);
}

// ---- scatter: highlight by main group, tooltip
const szSzuro = $('[data-szoras-szuro]');
if (szSzuro) {
  const svg = $('.szoras-doboz .szoras'), bub = $('[data-szoras-buborek]'), doboz = $('.szoras-doboz');
  szSzuro.addEventListener('click', e => {
    const g = e.target.closest('.csip'); if (!g) return;
    szSzuro.querySelectorAll('.csip').forEach(c => c.classList.toggle('akt', c === g));
    svg.classList.toggle('szurt', g.dataset.cs !== '');
    svg.querySelectorAll('.sz-pont').forEach(p => p.classList.toggle('kiemelt', p.dataset.cs === g.dataset.cs));
  });
  const mutat = p => {
    const r = p.getBoundingClientRect(), dr = doboz.getBoundingClientRect();
    bub.innerHTML = `<b>${esc(p.dataset.nev)}</b>${ft(Number(p.dataset.b))}, reálbér ${elojel(Number(p.dataset.r))}`;
    bub.style.left = `${Math.min(Math.max(r.left + r.width / 2 - dr.left, 90), dr.width - 90)}px`; bub.style.top = `${r.top - dr.top}px`; bub.hidden = false;
  };
  svg.addEventListener('pointerover', e => { if (e.target.classList.contains('sz-pont')) mutat(e.target); });
  svg.addEventListener('pointerout', e => { if (e.target.classList.contains('sz-pont')) bub.hidden = true; });
  svg.addEventListener('focusin', e => { const p = e.target.querySelector?.('.sz-pont'); if (p) mutat(p); });
  svg.addEventListener('focusout', () => { bub.hidden = true; });
}

// ---- affordability map
const tk = $('[data-terkep]');
if (tk) {
  const d = adat(), info = $('[data-tk-info]'), cim = $('[data-tk-cim]'), kulcsEl = $('[data-tk-kulcs]'), listak = $('[data-tk-listak]');
  const AR = [300, 500, 800, 1200], EV = [3, 5, 8, 12];
  let fog = null, tel = null, akt = null;
  const netto = () => szamBe(tk.netto.value) || fog?.netto || null;
  const osztaly = (v, h) => h.findIndex(x => v < x) === -1 ? 4 : h.findIndex(x => v < x);
  const ertek = (t, n) => n ? t.ar * 50 / n / 12 : t.ar / 1000;
  const szin = () => {
    const n = netto(), h = n ? EV : AR;
    document.querySelectorAll('.tk path').forEach(p => { const t = tel.get(p.dataset.k); p.setAttribute('class', (t ? `t${osztaly(ertek(t, n), h)}` : 'tn') + (p.dataset.k === akt ? ' akt' : '')); });
    cim.textContent = n ? `Hány év alatt jön ki egy 50 m²-es lakás${fog && !szamBe(tk.netto.value) ? `: ${fog.nev.toLocaleLowerCase('hu')}, nettó ${ft(n)}` : ` havi nettó ${ft(n)} bérből`}` : 'Lakások négyzetméterára';
    const cimkek = n ? ['3 év alatt', '3–5 év', '5–8 év', '8–12 év', '12 év fölött'] : ['300 e Ft alatt', '300–500 e', '500–800 e', '800 e – 1,2 M', '1,2 M Ft/m² fölött'];
    kulcsEl.innerHTML = cimkek.map((c, i) => `<span><i style="background:var(--t${i})"></i>${c}</span>`).join('') + '<span><i style="background:var(--tn)"></i>nincs adat</span>';
    if (akt) mutat(akt);
    if (n) {
      const jo = [...tel.values()].filter(t => t.db >= 30).sort((a, b) => a.ar - b.ar);
      const li = l => `<ol>${l.map(t => `<li><span style="flex:1">${esc(t.n)}</span><b>${idotartam(t.ar * 50 / n)}</b></li>`).join('')}</ol>`;
      listak.hidden = false;
      listak.innerHTML = `<section class="lista"><h3>Itt jön ki a leghamarabb</h3>${li(jo.slice(0, 10))}<p class="apro">Csak azok a települések, ahol legalább 30 adásvétel volt a mért évben.</p></section><section class="lista"><h3>Itt a legkésőbb</h3>${li(jo.slice(-10).reverse())}<p class="apro">50 m²-es lakás, a teljes nettó bérrel számolva.</p></section>`;
    } else listak.hidden = true;
  };
  const mutat = k => {
    const t = tel.get(k), n = netto();
    if (!t) { info.innerHTML = 'Ezen a településen az elmúlt három évben túl kevés adásvétel volt.'; return; }
    info.innerHTML = `<b>${esc(t.n)}</b> (${esc(t.m)}): ${ft(t.ar)}/m², egy 50 m²-es lakás kb. ${ft(t.ar * 50)}.${n ? ` Ez <b>${idotartam(t.ar * 50 / n)}</b> teljes nettó bére.` : ''} <small>${telJegy(t, d)}</small>`;
  };
  const rajz = (g, hova) => {
    hova.innerHTML = `<svg class="tk" viewBox="${g.vb}" role="img" aria-label="Térkép: a települések színe a kiválasztott mutató szerint. A pontos értékek a település fölé állva vagy rákoppintva olvashatók.">${g.u.map(u => `<path data-k="${u[0]}" d="${u[1]}"/>`).join('')}</svg>`;
    const s = hova.firstChild;
    const kival = e => { const k = e.target.dataset?.k; if (!k) return; document.querySelector('.tk path.akt')?.classList.remove('akt'); akt = k; e.target.classList.add('akt'); mutat(k); };
    s.addEventListener('pointerover', kival); s.addEventListener('click', kival);
  };
  (async () => {
    const [t, o, b] = await Promise.all([telepulesek(), fetch('/assets/geo/orszag.json').then(r => r.json()), fetch('/assets/geo/budapest.json').then(r => r.json())]);
    tel = new Map(t.map(x => [x.kod, x]));
    rajz(o, $('[data-tk-orszag]')); rajz(b, $('[data-tk-bp]'));
    if (/^\d{4}$/.test(param('f') || '')) { fog = (await foglalkozasok()).find(f => f.kod === param('f')) || null; if (fog) $('#tk-fog').value = fog.nev; }
    szin();
  })();
  kombo($('#tk-fog'), $('#tk-lista'), foglalkozasok, fogSor, f => { fog = f; $('#tk-fog').value = f.nev; tk.netto.value = ''; if (tel) szin(); });
  tk.addEventListener('input', e => { if (e.target.id === 'tk-fog' && !e.target.value) fog = null; if (tel) szin(); });
  $('[data-minta]', tk).addEventListener('click', async e => { const m = JSON.parse(e.currentTarget.dataset.minta); fog = (await foglalkozasok()).find(f => f.kod === m.fog); $('#tk-fog').value = fog.nev; tk.netto.value = ''; if (tel) szin(); });
}

// ---- settlement search
const tks = $('[data-telkereso]');
if (tks) kombo($('input', tks), $('ul', tks), async () => (await telepulesek()).filter(t => t.slug), telSor, t => { location.href = `/telepules/${t.slug}/`; });

// ---- pay band helper
const bs = $('[data-bersav]');
if (bs) {
  const d = adat(), ki = $('[data-bersav-eredmeny]');
  let fog = null;
  const kerek = n => Math.round(n / 10000) * 10000;
  const szamol = () => {
    if (!fog) { ki.innerHTML = '<p class="szalag-fej">Bérsáv</p><p class="ures">Válassz foglalkozást, és itt megjelennek a viszonyítási pontok.</p>'; return; }
    const kor = (fog.kor || []).filter(v => v != null);
    const also = kor.length ? Math.min(...kor) : fog.brutto, felso = kor.length ? Math.max(...kor) : fog.brutto;
    const min = szamBe(bs.min.value), max = szamBe(bs.max.value);
    let h = `<p class="szalag-fej">${esc(fog.nev)}<span>FEOR ${fog.kod}</span></p>
${sor(`Országos bruttó átlag, ${d.ev}`, ft(fog.brutto))}
${kor.length > 1 ? sor('Legalacsonyabb korcsoportátlag', ft(also)) + sor('Legmagasabb korcsoportátlag', ft(felso)) : ''}
${sor(`Garantált bérminimum, ${d.mbEv}`, ft(d.garantalt), 'halk')}
${sor('Javasolt viszonyítási sáv', `${szamHu(kerek(also) / 1000)}–${szamHu(kerek(felso) / 1000)} e Ft`, 'ossz')}`;
    if (min && max && max >= min) {
      const hol = v => `${szamHu(v / fog.brutto * 100)}%`;
      const itelet = max < also ? ['rossz', 'A sáv teteje is a legalacsonyabb korcsoportátlag alatt van.'] : min > felso ? ['jo', 'A sáv alja is a legmagasabb korcsoportátlag fölött van.'] : ['jo', 'A sáv átfedi a szakma jellemző béreit.'];
      h += `<p class="itelet ${itelet[0]}"><b>${itelet[1]}</b> A tervezett ${ft(min)} – ${ft(max)} sáv a szakmai átlag ${hol(min)}–${hol(max)}-a.${min < d.garantalt ? ` A sáv alja a garantált bérminimum (${ft(d.garantalt)}) alatt van; szakképzettséget igénylő munkakörben ez nem megengedett.` : ''}</p>
<p class="szalag-jegy"><b>Hirdetésbe:</b> „Bruttó ${szamHu(min)}–${szamHu(max)} Ft/hó.”</p>`;
    } else if (min || max) h += '<p class="szalag-jegy">Add meg a sáv alját és tetejét is; a tető ne legyen kisebb az aljánál.</p>';
    h += `<p class="szalag-jegy">Forrás: KSH STADAT 20.1.1.52., ${d.ev}. évi adat, letöltve: ${datumHu(d.letoltve)} Az átlag pótlékokkal és prémiummal együtt értendő. <a href="/fizetes/${fog.slug}/">A szakma oldala</a></p>`;
    ki.innerHTML = h;
  };
  kombo($('#bs-fog'), $('#bs-lista'), foglalkozasok, fogSor, f => { fog = f; $('#bs-fog').value = f.nev; szamol(); });
  bs.addEventListener('input', e => { if (e.target.id === 'bs-fog' && !e.target.value) fog = null; szamol(); });
  $('[data-minta]', bs).addEventListener('click', async e => { const m = JSON.parse(e.currentTarget.dataset.minta); fog = (await foglalkozasok()).find(f => f.kod === m.fog); $('#bs-fog').value = fog.nev; bs.min.value = szamHu(m.min); bs.max.value = szamHu(m.max); szamol(); });
}

// ---- when will you earn a million
const mi = $('[data-millio]');
if (mi) {
  const d = adat(), ki = $('[data-millio-eredmeny]');
  let fog = null, teljesP;
  const teljes = () => teljesP ??= fetch('/adatok/v1/kereset.json').then(r => r.json());
  const szamol = async () => {
    const brutto = szamBe(mi.brutto.value), cel = szamBe(mi.cel.value) || 1000000;
    if (!fog || !brutto) { ki.innerHTML = '<p class="szalag-fej">Mikor?</p><p class="ures">Válaszd ki a szakmádat, és írd be a bruttódat.</p>'; return; }
    const T = await teljes(), e = T.foglalkozasok[fog.kod].e, i0 = e.findIndex(v => v != null), n = e.length - 1 - i0;
    if (n < 2) { ki.innerHTML = '<p class="szalag-fej">Mikor?</p><p class="ures">Ehhez a szakmához nincs elég hosszú idősor.</p>'; return; }
    const utem = Math.pow(e.at(-1) / e[i0], 1 / n) - 1;
    const inf = Object.entries(d.index).filter(([ev]) => ev > T.evek[i0] && ev <= d.utolsoEv).map(x => x[1] / 100), infAtl = Math.pow(inf.reduce((a, b) => a * b, 1), 1 / inf.length) - 1;
    let h = `<p class="szalag-fej">${esc(fog.nev)}<span>FEOR ${fog.kod}</span></p>${sor('A mostani bruttód', ft(brutto))}${sor(`A szakma béremelkedése évente (${T.evek[i0]}–${d.utolsoEv})`, `${szamHu(utem * 100, 1)}%`)}${sor('Ebből infláció évente', `${szamHu(infAtl * 100, 1)}%`, 'halk')}`;
    if (brutto >= cel) h += `${sor('A cél', ft(cel))}<p class="itelet jo"><b>Már megvan.</b> A béred eléri a célt.</p>`;
    else if (utem <= 0) h += '<p class="itelet rossz"><b>Ezzel az ütemmel soha.</b> A szakma átlagbére nem nőtt az időszakban.</p>';
    else {
      const ev = Math.log(cel / brutto) / Math.log(1 + utem), mikor = d.maEv + Math.ceil(ev);
      h += `${sor('A cél', ft(cel))}${sor('Ennyi év múlva', `${szamHu(ev, 1)} év`)}${sor('Ebben az évben éred el', String(mikor), 'ossz')}<p class="szalag-jegy">Ha az infláció az időszak átlagán marad, a ${ft(cel)} akkor annyit ér majd, mint ma ${ft(cel / Math.pow(1 + infAtl, ev))}.</p>`;
    }
    h += `<p class="szalag-jegy">Az ütem a szakma KSH szerinti bruttó átlagkeresetéből számolt éves átlag. A múlt nem garancia a jövőre. <a href="/fizetes/${fog.slug}/">A szakma oldala</a></p>`;
    ki.innerHTML = h;
  };
  kombo($('#mi-fog'), $('#mi-lista'), foglalkozasok, fogSor, f => { fog = f; $('#mi-fog').value = f.nev; szamol(); });
  mi.addEventListener('input', e => { if (e.target.id === 'mi-fog' && !e.target.value) fog = null; szamol(); });
  $('[data-minta]', mi).addEventListener('click', async e => { const m = JSON.parse(e.currentTarget.dataset.minta); fog = (await foglalkozasok()).find(f => f.kod === m.fog); $('#mi-fog').value = fog.nev; mi.brutto.value = szamHu(m.brutto); szamol(); });
}

// ---- wage threshold, English
const wt = $('[data-kuszob-en]');
if (wt) {
  const d = adat(), ki = $('[data-kuszob-en-eredmeny]'), en = n => `HUF ${Math.round(n).toLocaleString('en-US')}`;
  let fog = null;
  const szamol = () => {
    if (!fog) { ki.innerHTML = `<p class="szalag-fej">Wage threshold<span>KSH, ${d.ev}</span></p><p class="ures">Choose an occupation to see the threshold.</p>`; return; }
    const k = S.berkuszob(fog.brutto, d.arany), ber = szamBe(wt.ber.value), nev = fog.egyeb ? fog.egyeb.split('|')[0] : fog.nev;
    let h = `<p class="szalag-fej"><span lang="hu" style="color:inherit;font-weight:600">${esc(nev)}</span><span>FEOR ${fog.kod}</span></p>${sor(`National gross average, ${d.ev}`, en(k.atlag))}${sor('80% of the average', en(k.hatarKerek))}${sor('Lowest compliant base wage', en(k.legkisebb), 'ossz')}`;
    if (ber) { const jo = S.berMegfelel(ber, fog.brutto, d.arany); h += `<p class="itelet ${jo ? 'jo' : 'rossz'}"><b>${jo ? 'Above the threshold.' : 'Too low.'}</b> ${en(ber)} is ${(ber / fog.brutto * 100).toFixed(1)}% of the average${jo ? '.' : `; ${en(k.legkisebb - ber)} more is needed.`}</p>`; }
    h += `<p class="szalag-jegy">Source: KSH STADAT 20.1.1.52, ${d.ev} data, downloaded ${d.letoltve}. The threshold must be exceeded (Gov. Decree 445/2013, Sections 6 (3) and 20 (6)).</p>`;
    ki.innerHTML = h;
  };
  kombo($('#wt-fog'), $('#wt-lista'), foglalkozasok, fogSor, f => { fog = f; $('#wt-fog').value = `${f.kod} ${f.egyeb ? f.egyeb.split('|')[0] : f.nev}`; szamol(); });
  wt.addEventListener('input', e => { if (e.target.id === 'wt-fog' && !e.target.value) fog = null; szamol(); });
}

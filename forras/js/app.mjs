// Browser layer: search boxes and the live calculators. Forms always open empty.
import * as S from './szamitas.mjs';
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
const foglalkozasok = () => fogP ??= fetch('/adatok/kereso.json').then(r => r.json()).then(a => a.map(([kod, nev, slug, egyeb, brutto, netto]) => ({ kod, nev, slug, egyeb, brutto, netto, k: kulcs(`${nev} ${egyeb} ${kod}`) })));
const telepulesek = () => telP ??= fetch('/adatok/telepulesek.json').then(r => r.json()).then(a => a.map(([kod, n, m, ar, ev, becsult, tipus]) => ({ kod, n, m, ar, ev, becsult, tipus, k: kulcs(n) })));

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
const fogSor = f => `<span>${esc(f.nev)}<small>${f.egyeb ? esc(f.egyeb.split('|')[0]) + ' · ' : ''}FEOR ${f.kod}</small></span><b>${ft(f.brutto)}</b>`;
const telSor = t => `<span>${esc(t.n)}<small>${esc(t.m)}</small></span><b>${szamHu(Math.round(t.ar / 1000))} e Ft/m²</b>`;
const telJegy = (t, d) => `${t.ev}. évi ${t.tipus === 't' ? 'társasházi lakásárak' : 'lakóingatlan-árak'}${t.becsult && d?.becsles ? `, mai szintre becsülve (${esc(d.becsles)})` : ''}. Forrás: <a href="https://ingatlanmerleg.hu/lakasarak/" rel="noopener">Ingatlanmérleg, KSH Ingatlanadattár</a>.`;

// ---- site search (home, list page)
for (const k of document.querySelectorAll('[data-kereso]')) {
  kombo($('input', k), $('ul', k), foglalkozasok, fogSor, f => { location.href = `/fizetes/${f.slug}/`; });
}

// ---- gross -> net
const nk = $('[data-netto-kalk]');
if (nk) {
  const d = adat(), ki = $('[data-netto-eredmeny]');
  const szamol = () => {
    const brutto = szamBe(nk.brutto.value);
    if (!brutto) { ki.innerHTML = `<p class="szalag-fej">Havi elszámolás · ${d.ev}</p><p class="ures">Írd be a bruttó béredet, és itt megjelenik a levezetés.</p>`; return; }
    if (nk.anya.checked) nk.fiatal25.checked = false;
    const r = S.netto(d.sz, { brutto, fiatal25: nk.fiatal25.checked, anya: nk.anya.checked, eltartottak: Number(nk.eltartottak.value) || 0 });
    const alap = S.netto(d.sz, { brutto });
    ki.innerHTML = `<p class="szalag-fej">Havi elszámolás · ${d.ev}</p>
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
    let h = `<p class="szalag-fej">Mire elég? · ${sajat ? 'saját nettó' : esc(fog.nev)}</p>${sor('Havi nettó', ft(netto))}`;
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
    if (!fog) { ki.innerHTML = `<p class="szalag-fej">Bérküszöb · KSH ${d.ev}</p><p class="ures">Válassz foglalkozást, és itt megjelenik a küszöb.</p>`; return; }
    const k = S.berkuszob(fog.brutto, d.arany), ber = szamBe(bk.ber.value);
    let h = `<p class="szalag-fej">FEOR ${fog.kod} · ${esc(fog.egyeb ? fog.egyeb.split('|')[0] : fog.nev)}</p>
${sor(`Országos bruttó átlag, ${d.ev}`, ft(k.atlag))}${sor('Ennek 80%-a', ft(k.hatarKerek))}${sor('A legkisebb megfelelő alapbér', ft(k.legkisebb), 'ossz')}`;
    if (ber) {
      const jo = S.berMegfelel(ber, fog.brutto, d.arany);
      h += `<p class="itelet ${jo ? 'jo' : 'rossz'}"><b>${jo ? 'Megfelel.' : 'Kevés.'}</b> A ${ft(ber)} alapbér az átlag ${szamHu(ber / fog.brutto * 100, 1)}%-a${jo ? ', a küszöb fölött van.' : `, még ${ft(k.legkisebb - ber)} hiányzik.`}</p>`;
    }
    h += `<p class="szalag-jegy">Forrás: KSH STADAT 20.1.1.52., ${d.ev}. évi adat, letöltve: ${datumHu(d.letoltve)} A küszöböt meg kell haladni (445/2013. Korm. r. 6. § (3), 20. § (6)). <a href="/fizetes/${fog.slug}/">A foglalkozás oldala</a></p>`;
    ki.innerHTML = h;
  };
  kombo($('#bk-fog'), $('#bk-lista'), foglalkozasok, fogSor, f => { fog = f; $('#bk-fog').value = `${f.kod} · ${f.egyeb ? f.egyeb.split('|')[0] : f.nev}`; szamol(); });
  bk.addEventListener('input', e => { if (e.target.id === 'bk-fog' && !e.target.value) fog = null; szamol(); });
  $('[data-minta]', bk).addEventListener('click', async e => { const m = JSON.parse(e.currentTarget.dataset.minta); fog = (await foglalkozasok()).find(f => f.kod === m.fog); $('#bk-fog').value = `${fog.kod} · ${fog.egyeb ? fog.egyeb.split('|')[0] : fog.nev}`; bk.ber.value = szamHu(m.ber); szamol(); });
}

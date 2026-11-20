# Mire elég a fizetésed? (munkanév)

Magyar fizetésoldal foglalkozásonként, a KSH hivatalos adataiból: minden foglalkozásnak saját oldala van a köznapi nevével, bruttóból számolt nettóval, korcsoportos pályaívvel, inflációval korrigált idősorral, lakásos összevetéssel és a harmadik országbeli munkavállalók 80%-os bérküszöbével. Az [autózom](https://autozom.hu) és az [Ingatlanmérleg](https://ingatlanmerleg.hu) testvéroldala, ugyanazzal a felépítéssel.

Statikus oldal. Nincs adatbázis, nincs szerver, nincs süti, nincs fizetős szolgáltatás. Az űrlapok üresen nyílnak.

**Állapot:** működő változat négy eszközzel (Hol állsz?, összehasonlítás, megfizethetőségi térkép, nyertesek és vesztesek), tesztnévvel (`config.json`: `eles: false`, minden oldal noindex).

## Mi frissül magától?

| Adat | Forrás | Hogyan |
|---|---|---|
| Keresetek foglalkozásonként, korcsoportonként | KSH STADAT mun0208 (20.1.1.52) | `frissito/futtat.mjs` letölti, ellenőrzi; új évnél minden oldal átáll |
| Országos nettó átlag | KSH mun0188 (20.1.1.58) | ugyanígy |
| Országos átlag és medián (év eleje óta) | KSH mun0143 (20.2.1.39) | ugyanígy |
| Infláció (reálbér) | KSH ara0001 (1.1.1.1) | ugyanígy |
| Lakásárak településenként, mai becsléssel | ingatlanmerleg.hu/adatok/lakasarak/arak.json | ugyanígy |
| Üzemanyagár | autozom.hu/adatok/v1/nav-uzemanyagar.json | ugyanígy |
| 25 év alattiak kedvezményének határa | NAV oldala | a frissítő kiolvassa az új évi összeget |
| Többi adószabály, bérküszöb-rendelet | NAV, Nemzeti Jogszabálytár | `frissito/figyelo.mjs` hetente megnézi, megvan-e még a kulcsmondat; ha nincs, jegyet nyit |

Ha egy letöltés hibás vagy hihetetlen (kevés sor, más táblacím, elszállt értékek), a régi adat marad, és a futás jegyet nyit a tárolóban. Hibás szám így nem kerül ki.

## Felépítés

| Mappa / fájl | Mi van benne |
|---|---|
| `data/szabalyok.json` | A bérszámítás szabályai évenként és a bérküszöb szabálya: érték, jogszabályhely, forrás, ellenőrzés napja. |
| `data/nevek.json` | Köznapi nevek FEOR-kódonként. Kézzel bővíthető; az első név adja a webcímet. |
| `data/kereset.json` stb. | A frissítő írja, kézzel ne szerkeszd. |
| `frissito/ksh.mjs` | A forrásfájlok értelmezői és ellenőrzői (hálózat nélkül, tesztelhetően). |
| `frissito/futtat.mjs`, `frissito/figyelo.mjs` | Heti letöltés, illetve a jogszabályforrások figyelése. |
| `forras/js/szamitas.mjs` | Számítási mag: nettó, lakás, autó, bérküszöb, reálérték. A böngésző, az építő és a tesztek is ezt használják. |
| `forras/oldalak.mjs`, `forras/sablon.mjs` | Az oldalak szövege, kerete és az ábrák. |
| `forras/geo/` | A térkép települési és kerületi határai (az Ingatlanmérleg tárolójából átvéve). |
| `web/` | A kész oldal. A Cloudflare Pages ezt szolgálja ki. Az `epit.mjs` írja. |

## Parancsok (Node 22, nincs függőség)

```
node frissito/futtat.mjs      # adatok letöltése (internet kell)
node --test tesztek/*.test.mjs
node epit.mjs                 # web/ felépítése
```

## Cloudflare Pages (ingyenes csomag)

1. Workers & Pages → Create → Pages → Connect to Git → `czakopeti/mire_eleg`.
2. Framework preset: None. Build command: üres. Build output directory: `web`.
3. A kapott `.pages.dev` címet írd a `config.json` `domain` mezőjébe, ha eltér.

## Élesítés előtt

- Végleges név és domain (`config.json`: `marka`, `domain`), kapcsolati e-mail.
- A `data/szabalyok.json` jogszabályhelyeinek összevetése az elsődleges forrással (a NAV-os összegek ellenőrizve, a paragrafusszámok másodlagos forrásból valók).
- `eles: true`, majd `node epit.mjs`.

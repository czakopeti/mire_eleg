# Dizájn

2026. november 20-án harmadszor, teljesen újraterveztük. A korábbi krémszínű és sötétzöld változat megszűnt. Az arculat szándékosan nem hasonlít az autózomra és az Ingatlanmérlegre.

## Szerkezet

A főoldalt és a menüt ugyanaz a négy kérdés rendezi: **A szakmád**, **A fizetésed**, **A lakóhelyed**, **HR-eseknek**. Minden eszköz pontosan egy csoportba tartozik. A főoldalon a csoportok eszközei sorokként jelennek meg, mindegyik mellett egy élő szám az adatból (nem dísz: a sor tartalmát mutatja).

Az aloldalak sorrendje: címke, cím, **egy számokkal teli összegző bekezdés, amely maga a válasz**, frissességi sor, a fő számok, a sávábra, részletek, „Számolj tovább”, gyakori kérdések.

## Elemek

| Elem | Szabály |
|---|---|
| Színek | Fehér alap, tinta `#0C1230`, kobaltkék `#2447F0`, halvány kék `#EEF1FB` a felületekhez. Korall `#F2603C` a kiemeléshez és a második adatsorhoz, türkiz `#0E9384` a harmadikhoz. Sötét módban külön ellenőrzött lépések. |
| Betű | Egyetlen család két hangon: Archivo (OFL, saját tárhelyről). A címek keskenyítve (66–78%) és 800-as súllyal, a szöveg normál szélességgel. |
| Sávábra (`.sav`) | Az oldal jellegzetes eleme: mind a 461 szakma egy-egy vonás a bruttó bér logaritmikus skáláján. A főoldalon a kiválasztott szakma korall színnel kiemelkedik; a szakmaoldalakon az adott szakma. A vonásokra kattintva a szakma oldala nyílik. |
| Körvonal és árnyék | 2 px tinta körvonal a kártyákon, mezőkön, táblázatokon. Kemény, eltolt árnyék (6 px) csak az eredménykártyán, a legördülő menün és a kereső mezőn. |
| Fő szám | A legfontosabb szám kobaltkék blokkon, nagy keskeny számmal (nettó a szakmaoldalon, végösszeg a kalkulátorokban). |
| Ábrák | Kék a fő adatsor, korall a második (szaggatott), türkiz a harmadik (pontozott). A színek színtévesztő-ellenőrzésen átmentek. A térkép egyszínű, világostól sötétig. |
| Űrlapok | Üresen nyílnak. Minta csak a „Minta betöltése” gombbal. |
| Forrás | Minden számblokk alatt forrássor: forrás neve linkkel, az adat éve, a letöltés napja. |

## Mozgás

A főoldalon a sávábra vonásai balról jobbra felnőnek, a kiválasztott szakma kártyája váltáskor megmozdul, a nettó felszámol. Az ábrák egyszer rajzolódnak ki, amikor a látómezőbe érnek. A térkép színe átúszik. A `prefers-reduced-motion` beállításnál minden mozgás kikapcsol.

## Amit nem csinálunk

Nincs csupa nagybetűs címke, nincs nyíl a linkek végén, nincs beúszó animáció minden szakaszon, nincs felugró ablak, süti és külső betöltés.

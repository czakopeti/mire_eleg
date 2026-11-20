# Dizájn

2026. november 20-án újraterveztük. A korábbi krémszínű, talpas betűs változat megszűnt.

## Honnan jön a szerkezet

A nagy amerikai bér- és pénzügyi termékek (Levels.fyi, Carta, Ramp, Wise) bevált rendje: a főoldal tetején maga a termék működik, alatta az eszközök csempéi, az aloldalakon bal oldalt a mezők, jobb oldalt az élő eredmény. A szerkezetet vettük át, az arculatukat nem.

## Elemek

| Elem | Szabály |
|---|---|
| Színek | Fehér alap, köd `#F1F4F2` a felületekhez, tinta `#101613`, bankjegyzöld `#0B6B43`, mélyzöld `#073B28` a főoldali sávhoz, menta `#CDF2DA` a végösszegekhez. Borostyán `#C9820A` és kék `#3B5BDB` csak ábrákban. Sötét módban külön ellenőrzött lépések. |
| Betű | Egyetlen család: Geist (OFL, saját tárhelyről). A címek 650-es súllyal, szoros betűközzel; a számok táblázatos szélességűek. |
| Bérszalag (`.szalag`) | Az oldal egyetlen hangsúlyos eleme: fehér kártya szaggatott fejléccel, menta végösszeggel, fogazott alsó széllel. Minden eredmény ebben jelenik meg. |
| Főoldal | Mélyzöld sáv, benne a kereső és egy bérszalag. A szalag mintával indul (felirata: „Minta”); ha a látogató beír vagy kiválaszt egy szakmát, annak a bérszalagja „nyomtatódik ki”. |
| Csempék | Az eszközök eltérő méretű csempéi, valódi adatból rajzolt kis ábrával (megyetérkép, pontfelhő, országos medián). |
| Ábrák | Zöld a fő adatsor, borostyán a második, kék a harmadik; a vonalak szaggatása is eltér, és van jelmagyarázat. A színpárok színtévesztő-ellenőrzésen átmentek. A térkép egyszínű, világostól sötétig. Minden ábra alatt ott a táblázat vagy a pontos érték. |
| Űrlapok | Üresen nyílnak. Minta csak a „Minta betöltése” gombbal kerül beléjük, mellette kiírva, mi a minta. |
| Forrás | Minden számblokk alatt forrássor: forrás neve linkkel, az adat éve, a letöltés napja. |

## Mozgás

Egy hangsúlyos mozzanat van: a bérszalag kinyomtatódik, és a végösszeg felszámol. Az ábrák egyszer rajzolódnak ki, amikor a látómezőbe érnek (az oszlopok felnőnek, a vonalak balról jobbra megjelennek). A térkép színe átúszik, amikor bért váltasz. Oldalváltáskor a böngésző áttűnést ad, ahol támogatja. A `prefers-reduced-motion` beállításnál minden mozgás kikapcsol.

## Amit nem csinálunk

Nincs csupa nagybetűs címke, nincs nyíl a linkek végén, nincs beúszó animáció minden szakaszon, nincs felugró ablak, süti és külső betöltés.

# Werkzeuge zum Prüfen

Dieser Ordner wird nicht veröffentlicht (Netlify liefert nur `public/` aus). Alles läuft mit Node, ohne zusätzliche Pakete.

| Befehl | Was es prüft |
|---|---|
| `node tools/check.mjs` | Ohne Browser: beschädigte und manipulierte Spielstände, Stimmigkeit der Erfolgsliste, Erzeugung aller Welten (und dass darin fast nichts schwebt), die Musikbeschreibung (Zustände, Tempi, Speicher) und der Rückfall auf die alte Musik |
| `node tools/vendor-music.mjs [Pfad]` | Kopiert die benötigten Dateien der Musik-Generator-Suite nach `public/src/vendor/musik-generator/` (Standardpfad `../../Musik-Generator`) |
| `node tools/floating.mjs [welt …]` | Ohne Browser: zählt je Welt, was in der frisch erzeugten Welt schwebt (nicht über Flächen mit dem Boden verbunden), nach Bauwerk und Würfelart; mit `KIND=<art>` Beispielpositionen. `check.mjs` schlägt ab 100 solcher Würfel in einer Welt fehl |
| `node tools/music.mjs [stück]` | Ohne Browser: listet die Musikstücke, wie die Suite sie komponiert – Besetzung je Zustand, Tempi, die ersten Töne der Melodie, Speicherbedarf |
| `node tools/smoke.mjs` | Mit Browser: spielt in jeder Welt ein kurzes Szenario und rund 30 längere (Selbstspiel, Verkehr, alle Angriffe, Klettern, Knöpfe, Handy-Format, niedrigste Detailstufe) und meldet Skriptfehler, auch solche, die das Spiel selbst abgefangen hat. Danach, einzeln: der Vergleichslauf zweimal (gleiche Prüfsumme = reproduzierbar) und zwei Messläufe mit Obergrenzen für die Rechenzeit pro Bild. Drei Browser laufen nebeneinander (`JOBS=n`), jeder Lauf mit eigenem Debug-Port und Profil, rund fünf Minuten; `ONLY=name,name` wiederholt einzelne Läufe; `quick` nur die Welten und der Vergleichslauf. |
| `node tools/soak.mjs [minuten] [sekunden je welt] [zusatz]` | Mit Browser: der Dauerlauf des Selbstspiels (Standard 120 Minuten, 240 Sekunden je Welt). Alle 30 Sekunden eine Probe; besteht, wenn kein Fehler auftrat, die Figur nie eine Minute lang nichts zerstörte und der Speicher von Welt zu Welt nicht stetig wächst |
| `node tools/serve.mjs` | Startet das Spiel auf `http://127.0.0.1:8766` mit denselben Sicherheits-Headern wie auf Netlify |
| `node tools/browser.mjs <name> "<adress-parameter>" <szenario> [ms] [breite] [höhe]` | Ein einzelnes Szenario; gibt den Zustand des Spiels als JSON aus und legt ein Bildschirmfoto in `tools/out/` ab. Braucht den laufenden Server |

Die Szenarien stehen nach Themen in `web/scenarios/` (`measure.js`, `attacks.js`, `movement.js`, `world.js`, `ui.js`); `web/test.js` lädt sie und führt das aus, dessen Name hinter dem `#` der Adresse steht. Jedes löst Eingaben aus und schreibt am Ende Messwerte in `window.__extra`.

**Messen und Vergleichen** (`measure.js`):

- `hash` – der Vergleichslauf: hält die Spielschleife an, baut die Welt aus ihrem Startwert neu und schaltet die Simulation 2 400 Schritte (40 Sekunden Spielzeit) mit festen Eingaben weiter; alle fünf Sekunden ein anderer Angriff. Am Ende eine Prüfsumme über jeden Würfel und alles, was sich bewegt. Mit `auto=1` spielt stattdessen der Autopilot (Startwert `seed=`). Gleiche Adresse, gleiche Prüfsumme; ein Umbau, der nichts am Verhalten ändert, behält sie. Für den Vergleich mit einem älteren Stand: diesen Stand in einen eigenen Ordner auschecken (`git worktree add`) und dort denselben Lauf starten.
- `perf` – misst jedes Bild: Rechenzeit je System, Anteil der Bilder über 25 ms mit Aufschlüsselung der schlimmsten, wartende Blöcke, Grafikspeicher. `warm=` ms vorher, `run=` ms Messung.
- `still` – wartet, bis alles im Bild vernetzt ist, und hält das Bild ohne Oberfläche an (`yaw=`, `pitch=`): zum Vergleichen von Bildschirmfotos vor und nach einer Änderung an Vernetzen oder Zeichnen.
- `soak` – der Dauerlauf (siehe `soak.mjs`).

Beispiele:

```
node tools/browser.mjs jahrmarkt "world=funfair&stage=5" walk 5000
node tools/browser.mjs einnahmen "world=skyline&stage=6&idle=1&run=55000" income 58000
node tools/browser.mjs sprung "world=skyline&stage=2" leapfar 12000
node tools/browser.mjs seil "world=primeval&stage=1&quality=4&style=rope&mode=cut&lt=0.15&d=0.35&dmin=40&run=9000" span 13500
node tools/browser.mjs vulkan "world=primeval&quality=4&d=80&up=0.18&aimy=12" volcano 7500
node tools/browser.mjs vergleich "world=city&stage=8&quality=2&species=tentacle" hash 20000
node tools/browser.mjs messung "world=neon&stage=7&species=robot&idle=1&quality=4&seed=3&warm=8000&run=25000" perf 36000
node tools/browser.mjs schraeg "world=skyline&stage=4&yaw=0.6" climbslant 8500
```

`span` durchtrennt eine Superstruktur (`style=` Stil aus `links.js`, `mode=cut|anchor|pier|load`, `t=` wo, `lt=` wohin die Kamera schaut, `solid=1` nur Verbindungen zwischen zwei Gebäuden, `touch=1` meldet, woran der Rest noch hängt) und protokolliert alle 250 ms Ketten, ausstehende Brüche, Bruchstücke und verbliebene Würfel. `volcano` schneidet ein Schaufenster in den Vulkan (ohne Physik; `cut=0` lässt es) und löst mit `erupt=ms` einen Ausbruch aus. `floaters` kappt Bauten einer Art am Fuß (`kind=wheel`, `cut=` Anteil der Höhe) und zählt dann, was die Haltsuche noch fallen lässt – was also in der Luft hing (`control=1` ohne diese Prüfung: zeigt, was in der Wartezeit von Trümmern getroffen wird; `owner=1` nennt die Bauwerke). `fortress` prüft den Schirm über den Mauern (`mode=jump`, `breach`, `siege` mit `off=0` fürs Tor, `gun` für ein explodierendes Geschütz). `musicswitch` (mit `GPU="--autoplay-policy=no-user-gesture-required"`, sonst darf der Ton nicht starten) wechselt die Welt und die Musikwahl und protokolliert, welches Stück wann einsetzt. `hitwall` stellt eine Figur an den Fuß eines Bauwerks (`kind=mountain`, `dz=` seitlich versetzt) und lässt sie zuschlagen: wie viel geht, wie tief das Loch wird, welche Stockwerke nachgeben. `volcano` mit `peak=1` zeigt den Berg, `erupt=` löst dort die Lawine aus. `hubview` zeigt einen Knotenpunkt (`hub=reservoir`) oder ein Bauwerk einer Art, `spantime` misst, was `spans.js` beim Laden und je Schritt kostet. `newmoves` stellt Hubschrauber oder Tentakel vor das nächste große Gebäude und löst einen Angriff aus (`tool=`, `heavy=1`, `at=` ms bis zum Bild, `go=` ms danach vorwärts fliegen, `dist=` Abstand in Körperhöhen, `view=` Kamerawinkel, `freeze=1` hält das Bild an, `trace=1` protokolliert Seil und Höhe); `do=emote&id=heart` zeigt ein Emoticon des Tentakels, `do=dive` lässt es abtauchen und reisen (`keep=1` am Startplatz, `above=` Höhe für einen Blick zurück von oben auf die gehobene Erde). `buttons` prüft jeden Knopf für alle acht Figuren und alle drei Eingabegeräte (Tastatur, Gamepad, Touch), dazu Weltauswahl, Einstellungen und das aufgeklappte Menü: im Bild, groß genug, von nichts verdeckt; außerdem, dass ein Mausklick auf den Steigen-Knopf des Hubschraubers nicht in die Touch-Ansicht wechselt. Fenstergröße über die Breite und Höhe von `browser.mjs`; ein Fund lässt den Lauf fehlschlagen. `movetest` mit `direct=1` zählt nur, was ein Angriff selbst zerstört – ohne Einstürze und Kettenreaktionen – und bucht es auf die Funktion, die es zerstört hat. `audit` (mit `idle=1&run=ms`) bucht jeden zerstörten Würfel auf die Funktion, die ihn zerstört hat, und protokolliert alle 2 s den Weg des Selbstspiels – damit fiel auf, dass das Untergraben anfangs jedes Haus einriss.

Der Browser wird mit einem eigenen Profil im Temp-Ordner gestartet; der Browser, den man selbst benutzt, bleibt unberührt. Gesucht wird Chrome, Brave oder Chromium; mit `BROWSER=/pfad` lässt sich ein anderer angeben.

Was diese Werkzeuge nicht können: beurteilen, wie sich etwas anfühlt, aussieht oder anhört. Dafür gibt es `TESTEN.md` im Projektordner.

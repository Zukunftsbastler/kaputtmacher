# Kaputtmacher

Ein 3D-Voxel-Spiel im Browser, in dem man als Monster, Roboter, Panzer oder Flieger eine detailliert gebaute Welt zerlegt. Es gibt kein Ziel, keine Gegner, kein Verlieren – nur Zerstörung, die sich wuchtig anfühlt.

Diese README hat zwei Teile: [Teil 1](#teil-1-das-spiel) beschreibt das Spiel und seine Absicht, [Teil 2](#teil-2-projektüberblick-für-eine-ki) ist ein Projektüberblick für eine KI (oder einen Menschen), die am Code weiterarbeiten soll.

---

## Teil 1: Das Spiel

### Starten

```
python3 serve.py
```

Dann `http://localhost:8000` öffnen. Es wird nichts installiert und nichts gebaut.

`serve.py` verbietet dem Browser das Zwischenspeichern. Mit einem gewöhnlichen Dateiserver kann der Browser nach einem Update eine alte Quelldatei neben einer neuen behalten; das Spiel bleibt dann mit einer Meldung wie „… is not a function“ stehen. In dem Fall hilft neu laden ohne Cache (Cmd+Shift+R, in Safari Cmd+Option+R).

### Worum es geht

- **Lust an der Zerstörung, entspannt.** Das Spiel ist nicht kompetitiv. Es gibt keinen Lebensbalken, keinen Timer, kein Game Over. Zerstören macht das Monster größer und stärker, und Macht geht nie verloren.
- **Für ein Kind gedacht.** Auslöser war ein Fünfjähriger, der Bauklotz-Türme baut, um sie umzuwerfen. Deshalb ist das Spiel sprachfrei (nur Bilder und Ziffern), führt jede Bedienung einmal vor, statt sie zu erklären, und zeigt niemanden, der zu Schaden kommt.
- **Ein Lernprojekt für Voxel.** Der Autor will den Umgang mit Voxeln besser verstehen: Speicherung, Meshing, Zerstörung, Physik. Anlass war, dass 3D-Gestaltung mit aktuellen KI-Modellen gut möglich geworden ist. Deshalb ist alles selbst gebaut, ohne Engine und ohne Bibliotheken.
- **Eine Hypothese zum Zusehen.** Im direkt zuvor entstandenen Spiel „Fördeland“, in dem eine Welt aufgebaut wird, ließen Studierende den Selbstspiel-Modus im Hintergrund laufen und empfanden das als entspannend und anregend. Nachdem es in einer Vorlesung kurz gezeigt worden war, kam die Bitte, es künftig immer mitlaufen zu lassen; der Vergleich war TikTok-Videos, bei denen der Ton von einem nicht verwandten Bild begleitet wird. Kaputtmacher soll prüfen, ob das Gegenteil – die Ästhetik der Zerstörung – denselben Effekt hat. Die Vermutung: Veränderung, der man zusehen kann, beruhigt und regt an, egal in welche Richtung sie läuft.
- **Idle-Modus:** Mit dem Popcorn-Knopf (oder der Taste I) spielt das Spiel sich selbst: Es sucht sich Gebäude, zerlegt sie mit wechselnden Angriffen und reist nach einer fertigen Welt in die nächste. Jede eigene Eingabe übernimmt wieder. Für den Dauerbetrieb im Hintergrund startet `?idle=1` in der Adresse direkt im Idle-Modus.

### Was man tut

| | |
|---|---|
| Bewegen | W/S oder Pfeile vor und zurück, A/D drehen, Umschalt rennen, Leertaste springen (halten = höher, in der Luft noch einmal drücken = Doppelsprung mit Salto; am höchsten Punkt, wenn die Figur golden schimmert, ein drittes Mal = Stampfattacke senkrecht nach unten) |
| Angreifen | **Linksklick schnell und schwächer, Rechtsklick langsam und stark.** Tasten 1–4 wählen den Angriff |
| Kamera | Mittlere Maustaste ziehen. Die freie Flugkamera steht in den Einstellungen (oder Tab) |
| Von vorn beginnen | Einstellungen (Zahnrad) → „Von vorn beginnen“: löscht den Spielstand auf diesem Gerät |
| Zusehen | Popcorn-Knopf oder Taste I: das Spiel spielt sich selbst |
| Gamepad | wird automatisch erkannt (Trigger rechts/links) |
| Handy, Tablet | Steuerknüppel links; rechts Knöpfe für Springen, schnellen und starken Angriff und Angriffswechsel; alles Übrige im Menü ☰ oben rechts. Ins Bild tippen zielt (kurz = schnell, halten = stark) |

**Fünf Figuren, fünf Arten zu zerstören.** Jede hat vier Angriffe (ab Stufe 1, 3, 5, 7), jeden in einer schnellen und einer starken Fassung:

| Figur | Angriffe |
|---|---|
| 🦖 Dino | Schwanzschlag, Biss, Ansturm, Feuer und Atomstrahl |
| 🦍 Gorilla | Fäuste, Würfe, Stampfen und Sprungschlag, Raserei |
| 🤖 Roboter | Laser, Raketen, Laserklinge, Orbitalschlag |
| 🪖 Panzer | Kanone, Mörser, Rammen, Flammenwerfer und Bunkerbrecher |
| ✈️ Flieger | Bordkanone und Bomben, Raketen, Bombenteppich, Brandbomben und Riesenbombe |

Der Flieger ist immer in Bewegung: A/D lenkt, W/S steigt und sinkt, Umschalt ist der Nachbrenner. Er fliegt durch Häuserschluchten und durch Gebäude hindurch.

**Zehn Welten,** frei wählbar: die Wolkenkratzer-Stadt als Hauptszenario (Start im Zentralpark, Türme bis 230 m), dazu Bauklotz-Zimmer, Garten, Wohnstraße, Spielzeugland, Dorf, Parklandschaft, Stadt, Fabrik und ein gewürfelter Planet mit Schiebereglern. Große Welten sind Planeten ohne Rand.

**Was die Zerstörung ausmacht:** Materialien brechen verschieden. Gebäude geben nach, wenn einem Stockwerk zu viel Tragkraft fehlt – Holz früh, Beton spät. Abgetrennte Teile kippen, zerschellen und zerschlagen, worauf sie fallen. Dabei zählt die Masse: Ein Turmstück zerdrückt ein kleines Haus einfach und hüllt es in Staub, an einem anderen Turm bleibt es eher lehnen. Zerstörte Hydranten spritzen eine Weile Wasserfontänen, die Feuer löschen; Lampen sprühen Funken; manche Autos explodieren. Feuer richtet sich nach dem Material: Laub und Holz brennen, Glas platzt, Stein und Blech verrußen.

**Die Welt reagiert:** Beim ersten Schaden kommt ein Polizeiauto, dann mehr, dazu Reporter im Hubschrauber, die Feuerwehr, sobald es brennt, und schließlich das Militär mit Hubschraubern und Kampffliegern. Niemand kann dem Kaputtmacher etwas anhaben; alle lassen sich umwerfen oder vom Himmel holen. Die Alarmstufe (Sterne) steigt mit der Zeit und ebbt wieder ab, wenn man nichts zerstört.

**Erfolge:** 128 kleine Ziele, die beim Erreichen kurz eingeblendet werden. Jede der fünf Figuren wächst für sich. Ab Stufe 4 reißen Einstürze Nachbarn mit (Kettenreaktionen, abschaltbar). Holz, Blätter und Stoff brennen. Hubschrauber kreisen, sobald es kracht. Lose Trümmer verschwinden nach rund 30 Sekunden wieder; größere Schutthaufen bleiben als Ruinen.

Das vollständige Konzept mit allen Zahlen steht in [KONZEPT.md](KONZEPT.md).

### Stand

Spielbar. Geprüft wurde bisher fast nur automatisiert (Durchläufe im Browser mit Bildschirmfotos). Nicht von der KI beurteilbar und daher offen: wie sich die Animationen in Bewegung anfühlen, wie der Ton klingt, die Spielbalance, das Verhalten auf Handy, Gamepad und schwachen Rechnern. Einzelheiten in KONZEPT.md, Abschnitt 16.

---

## Teil 2: Projektüberblick für eine KI

### Regeln des Projekts

1. **Keine Abhängigkeiten, kein Build.** Kein npm, kein Framework, keine Engine, kein CDN. Der Inhalt von `public/` wird unverändert ausgeliefert (Netlify, `netlify.toml`). Grund: möglichst kleine Angriffsfläche.
2. **Strenge Content-Security-Policy** (`public/_headers`): nur eigene Dateien, keine Inline-Skripte, keine Inline-Style-Attribute im Markup (Setzen über `element.style` ist erlaubt), keine Netzwerkzugriffe.
3. **Quellcode englisch,** Spieloberfläche sprachfrei (Emoji als Symbole). Text gibt es nur an zwei Stellen, beide auf Deutsch: in den Einstellungen und als Link „Impressum & Datenschutz“ (rechtlich nötig, führt zu `public/impressum.html`).
   Wer ändert, was das Spiel speichert oder lädt, muss die Datenschutzerklärung in `public/impressum.html` anpassen – sie beschreibt den Ist-Zustand genau.
4. **Jeder Prompt des Autors wird wörtlich abgelegt** als `PROMPTS/PROMPTnn.md` (nächste freie Nummer).
5. **KONZEPT.md ist die Spezifikation** und wird bei jeder Änderung mitgeführt, einschließlich ehrlichem Umsetzungsstand in Abschnitt 16.
6. **Kindgerecht:** kein Scheitern, kein Blut, niemand stirbt; Neues wird einzeln eingeführt und vorgemacht.

### Verzeichnis

```
serve.py            lokaler Entwicklungsserver ohne Cache
tools/              Prüfwerkzeuge (Node, ohne Pakete): check.mjs, smoke.mjs, serve.mjs, browser.mjs, web/test.js
TESTEN.md           Checkliste für Tests von Hand
VERLAUF.md          was sich von Entwurf zu Entwurf geändert hat
netlify.toml        veröffentlicht public/
KONZEPT.md          Spielkonzept und Umsetzungsstand
PROMPTS/            alle Prompts des Autors
public/
  index.html, style.css, _headers
  impressum.html, legal.css, legal.js   Impressum, Datenschutzerklärung und der Knopf zum Löschen des Spielstands
  src/              27 ES-Module, siehe unten
```

### Module (`public/src`)

| Datei | Aufgabe |
|---|---|
| `main.js` | Klasse `Game`: besitzt alle Systeme, feste Simulationsschritte (1/60 s), Kamera, Zielstrahl, Rendern eines Bildes, Macht/Wachstum, Zähler, Kettenreaktionen, Ereignis-Rückrufe (`onDamage`, `onImpact`, `onCollapse`, `onShove` …). Einstiegspunkt; legt `window.game` an |
| `math.js` | Matrizen, Quaternionen, reproduzierbarer Zufall (`makeRng`), `wrapDelta` |
| `materials.js` | Materialien (Festigkeit, Dichte, Machtwert, Klang) und Voxel-Typen (Material + Farbe). Tabellen `TYPE_MAT`, `TYPE_RGBA`, `TYPE_FLAGS` |
| `world.js` | Statisches Voxel-Gitter in 32³-Blöcken; `get`/`set`; Gebäudeliste (`structures`) mit Grundriss-Karte; `finalize()` nach der Erzeugung |
| `worldgen.js` | Baukasten und Baupläne aller Welten; Liste `WORLDS`; Stadtgenerator `town()` |
| `citykit.js` | Großstadt-Baukasten: Wolkenkratzer aus Segmenten, Fassaden, Dächer, Läden, Eingänge |
| `mesher.js` | Voxel → Dreiecke: nur sichtbare Flächen, Kantenabdunklung, Zusammenfassen gleicher Flächen |
| `renderer.js` | WebGL2: Voxel-Netze, Würfel-Instanzen, Leuchtpunkte, Himmel; Krümmung, Dunst, Sichtfenster um die Figur |
| `destruction.js` | Schadensformen (`sphere`, `capsule`) und Haltprüfung (`flush`): was den Bodenkontakt verliert, wird Bruchstück |
| `stability.js` | Tragkraft-Bilanz je Stockwerk; Schubsen; Schwächung durch Kettenreaktionen; löst Einstürze aus |
| `bodies.js` | Starre Bruchstücke: Fallen, Kontakt mit der Welt (Wucht nach Masse: Leichtes wird zerdrückt), Weiterzerbrechen, Zurückschreiben als Schutt |
| `particles.js` | `Debris` (lose Würfel mit Kollision), `Fx` (Staub, Funken, Rauch …), `GRAVITY`, `launch()` |
| `fire.js` | Hitze und Flammpunkte je Material (`heat`, `heatSphere`), brennende Voxel, langsame Ausbreitung, Ruß, Brandherde, Staubwolken, Löschen (`douse`) |
| `reactions.js` | Reaktionen zerstörter Dinge: Hydranten-Fontänen, Wasserschwall, Funken an Lampen; Wasser löscht Feuer |
| `sweeper.js` | Entfernt lose Trümmer nach 30 s, lässt Haufen ab 14 Würfeln stehen |
| `monster.js` | Gelenkmodelle der fünf Figuren je Stufe, Körpersprache (`locomotion`), Steuerung am Boden und in der Luft (`Monster`) |
| `tools.js` | Angriffe: Tabelle `MOVES` je Figur (leicht/schwer, Pose, Wirkung) und die Bausteine dafür (`blow`, `shock`, `bolt`, `ray`, `rocket`, `bomb`, `grab` …) |
| `actors.js` | Bewohner und Einsatzkräfte: Polizeiautos, Feuerwehr, Reporter-, Lösch- und Militär-Hubschrauber, Kampfflieger; Alarmstufe |
| `achievements.js` | Liste der 128 Erfolge, Zähler (`STATS`), Prüfung |
| `traffic.js` | Straßennetz (`Roads`: Kreuzungen, Rechtsverkehr, Ausweichen, Wenden) und fahrende Autos und Busse (`Traffic`) |
| `landmarks.js`, `landmarks2.js` | Besondere Grundstücke für den Stadtgenerator: Fahrgeschäfte, Hafenanlagen, Riesenbauten; Flughafen, Burg, Raumhafen, Winterwelt, Unterwasserstadt |
| `autopilot.js` | Idle-Modus: füllt den Eingabezustand, wählt Ziele, Angriffe und Welten |
| `audio.js` | Erzeugter Ton (Web Audio), keine Dateien |
| `input.js` | Maus/Tastatur, Gamepad, Touch → ein gemeinsamer Zustand |
| `hud.js` | Oberfläche aus DOM-Elementen, Vorführ-Hinweise, Weltauswahl, Einstellungen |
| `progress.js` | Spielstand und Einstellungen in `localStorage`: Stufe und Macht je Figur, Zähler, Erfolge, Detailstufe |

### Datenmodell

- **Voxel:** ein Byte. 0 = Luft, 1–127 = ursprüngliche Typen, Typ|128 = derselbe Typ als loser Schutt, 254/255 = verkohlt/glühend. Würfelkante = 1 Einheit.
- **Welt:** Blöcke von 32³ als `Uint8Array`; ein Block mit nur einem Wert liegt als einzelnes Byte vor (`uniform`). Planeten haben `wrap = true` und Zweierpotenz-Kanten; `get`/`set` falten x und z selbst.
- **Gebäude (`structure`):** Zuordnung über die Grundriss-Karte `footprint[x + sx*z]`, kein Speicher pro Voxel. Enthält Zählerstände und für `major`-Gebäude Tragkraft `S`, Ursprungs-Tragkraft `S0` und Masse `M` je Höhenschicht.
- **Drei Zustände eines Voxels:** fest im Gitter → Teil eines starren Bruchstücks (`Body`, eigenes kleines Gitter mit Lage und Drehung) → loser Würfel (`Debris`) → zurück ins Gitter als Schutt.
- **Koordinaten:** x/z waagerecht, y nach oben. Vorwärts bei Blickwinkel `yaw` ist `(sin yaw, cos yaw)`; „rechts“ ist dann `(-cos yaw, sin yaw)`.
- **Planeten-Darstellung:** Die Welt ist flach; erst der Vertex-Shader senkt alles um `Abstand² × u_curv` ab. Alles wird relativ zu einem Fokuspunkt (Monster oder Flugkamera) gezeichnet. Der Zielstrahl (`Game.pick`) rechnet diese Krümmung zurück.

### Ablauf

Ein Bild (`Game.frame`): Eingabe abfragen → Kamera → Zielstrahl → 0 bis 3 Simulationsschritte → Blöcke neu vernetzen (Zeitbudget, nächste zuerst, auf Planeten nur im sichtbaren Ausschnitt) → zeichnen.

Ein Simulationsschritt (`Game.step`), Reihenfolge ist wichtig: Figur bewegen → Angriff starten/fortführen (`tools`) → Bruchstücke → Feuer → Stabilität → Aufräumen → **Haltprüfung (`destruction.flush`)** → lose Würfel → Effekte → Bewohner/Hubschrauber → Explosionen → Macht und Zähler.

### Invarianten und Fallstricke

- **Jede Änderung der Welt läuft über `world.set`.** Dort hängen Zähler, Macht, Tragkraft-Bilanz und die Markierung zum Neuvernetzen. Wer Voxel entfernt, ruft danach `destruction.addSeeds(x, y, z)`, sonst bleibt Abgetrenntes in der Luft stehen.
- **Die Simulation benutzt `game.rng`,** nie `Math.random` (nur Kamerawackeln und Ton dürfen das). Feste Zeitschritte und reproduzierbarer Zufall sind Voraussetzung für die geplante Zeitlupe und das Zurückspulen.
- **Keine Speicheranforderung im Spielverlauf,** wo es sich vermeiden lässt: Schutt, Effekte und Zwischenpuffer sind feste Vorräte.
- **Zusammengefasste Flächen sind auf Planeten waagerecht höchstens 4 Würfel lang** (`meshChunk`), sonst klaffen sie durch die Krümmung auseinander.
- **Strahlen verlaufen gerade im Bild, nicht in der Welt** (`Tools.trace`, `toPicture`/`toWorld`). Wer eine neue Strahlenwaffe baut, benutzt `bolt` oder `ray` und liest Treffpunkt und Richtung aus `this.hit` und `rdx/rdy/rdz`, statt selbst entlang einer Weltgeraden zu rechnen.
- **Vertex-Positionen sind 16-Bit-Ganzzahlen;** der Farbton je Würfel entsteht erst im Fragment-Shader.
- **Browser-Cache:** siehe „Starten“. Nach Änderungen an mehreren Modulen immer mit `serve.py` testen. Auf Netlify sorgt `Cache-Control: no-cache` in `_headers` dafür, dass der Browser bei jeder Datei nachfragt.
- **Kompaktes Layout** (`Hud.layout`, CSS-Klassen `compact` und `touch` am `<body>`): Dieselben Knöpfe werden per CSS umsortiert, nichts ist doppelt gebaut. `#topright` wird zum aufklappbaren Menü, die Werkzeugleiste weicht auf Touch den Daumenknöpfen in `#touchpad`. Neue Knöpfe, die die Figur nicht direkt steuern, gehören in `#topright`.
- **`touch-action`** steht nur auf der Zeichenfläche auf `none`; auf `<body>` würde es das Scrollen der Menüs mit dem Finger verhindern.
- **Tastatur gehört dem Spiel nur ohne offenes Menü** (`forGame` in `input.js`), sonst wären Regler und Knöpfe der Einstellungen nicht per Tastatur bedienbar.
- **Berührungs-Kennungen (`Touch.identifier`) sind beliebige Zahlen,** auf iOS auch negative. Nie mit `>= 0` prüfen, ob ein Finger aktiv ist; dafür gibt es eigene Flags (`stick.on`, `fireOn` in `input.js`).
- **`game.lastHit`** (Richtung und Hochwurf des letzten Treffers) bestimmt, wohin abgetrennte Teile kippen. Vor einem Schaden setzen.
- **Hindernisprüfung der Figur:** sowohl am nächsten Schritt als auch etwas dahinter prüfen (siehe `Monster.update`); einzeln führte jedes zu einem Stillstand, einmal bei hohem Tempo, einmal vor dünnen Pfosten.

### Sicherheit

Das Spiel ist rein statisch und spricht nach dem Laden mit keinem Server. Was es dennoch an Angriffsfläche gibt, ist so abgesichert:

| Fläche | Maßnahme |
|---|---|
| Fremder Code | Es gibt keinen: keine Abhängigkeiten, kein CDN, kein Build. `public/_headers` erlaubt per Content-Security-Policy nur eigene Skripte und Styles, keine Inline-Skripte, keine Netzwerkzugriffe, keine Einbettung in fremde Seiten |
| Text → HTML | Kommt nicht vor (`innerHTML`, `eval` und Verwandte werden nirgends benutzt; die Oberfläche entsteht über `createElement` und `textContent`). Die Policy erzwingt das zusätzlich über Trusted Types |
| Adresszeile | Die Test-Parameter (`?stage=` …) werden gegen Wertebereiche und feste Listen geprüft (`cleanStage`, `cleanSpecies`, `cleanQuality` in `progress.js`) und nie gespeichert. Ein präparierter Link kann das Spiel weder zum Absturz bringen noch Speicher fressen lassen |
| Spielstand | `localStorage` gilt als nicht vertrauenswürdig: `sanitize()` in `progress.js` baut aus beliebigem Inhalt einen gültigen Spielstand; Unbekanntes wird verworfen. Ein beschädigter Spielstand kann das Spiel nicht dauerhaft lahmlegen |
| Gerätefunktionen | Per Permissions-Policy abgeschaltet, bis auf Gamepad und Vollbild |
| Spielstand löschen | Knopf auf der Seite „Impressum & Datenschutz“ (`legal.js`, zwei Schritte) und als „Von vorn beginnen“ in den Einstellungen. Der Schlüssel `kaputtmacher.v1` steht in `progress.js` und in `legal.js` – wird er umbenannt, dann an beiden Stellen |
| Veröffentlichter Umfang | Nur `public/`. Konzept, Prompts, README, `serve.py` und `tools/` werden nicht ausgeliefert |

Regeln, damit das so bleibt: kein `innerHTML` und keine Inline-Styles im Markup; jeder neue Adress-Parameter und jedes neue Feld im Spielstand bekommt eine Prüfung in `progress.js`; keine externen Ressourcen.

Bewusst belassen: `window.game` und die Test-Parameter. Beides gibt nur Zugriff auf das, was der Spieler im eigenen Browser ohnehin hat.

### Testen ohne Testframework

- **Adress-Parameter** (speichern keinen Fortschritt): `?world=skyline|blocks|garden|house|toyland|village|park|funfair|castle|winter|city|airport|factory|harbour|reef|spaceport|giants|random`, `?stage=7`, `?species=dino|gorilla|robot|tank|jet`, `?tool=<Angriffs-Id>`, `?unlock=1`, `?quality=1…5` (Detailstufe; `low` und `high` gehen weiter), `?fly=1`, `?idle=1`.
- **`window.game`** gibt in der Browser-Konsole Zugriff auf alles, z. B. `game.tools.use(game.tool, true)` oder `game.gain += 1e6`.
- **`tools/`** (siehe `tools/README.md`): `node --experimental-default-type=module tools/check.mjs` prüft ohne Browser Spielstand-Laden, Erfolgsliste und die Erzeugung aller Welten; `node tools/smoke.mjs` spielt in einem eigenen Headless-Browser jede Welt und einige längere Szenarien durch und meldet Skriptfehler. Nach jeder größeren Änderung beide laufen lassen.
- **Messen statt schätzen:** `node tools/browser.mjs name "world=skyline&stage=6&idle=1&run=55000" income 58000` liefert die Macht pro Sekunde im Selbstspiel; daraus sind die Stufen-Schwellen (`NEED` in `monster.js`) abgeleitet.
- **Von Hand:** `TESTEN.md`.

### Rezepte

- **Neuer Angriff:** in `tools.js` einen Eintrag in `MOVES.<figur>` anlegen: `{ id, icon, stage, light, heavy }`. Jede Fassung hat `wind`, `strike`, `recover` (Sekunden), `pose(j, p, a, b, c, act)` für die Gelenke und eine oder mehrere Wirkungen: `begin`, `tick` (jeden Schritt während des Schlags), `hit` (einmal bei `hitAt`), `end`. `root: true` hält die Füße fest.
- **Neue Figur:** in `monster.js` Eintrag in `SPECIES`, Modell in `buildModel` (Teile mit Drehpunkt und Elternteil), Körpersprache in `locomotion`; in `tools.js` eine Angriffsliste.
- **Neue Welt:** in `worldgen.js` eine Bauplan-Funktion (liefert eine `World`) und einen Eintrag in `WORLDS`. Für Städte genügt ein neuer Parametersatz für `town()`.
- **Neues Material oder neuer Voxel-Typ:** `materials.js`; höchstens 127 Typen.
- **Neue Welt:** ein Eintrag in `WORLDS` (`worldgen.js`) mit Gewichten je Grundstücksart; neue Grundstücksarten als Funktion in `LOTS` (`landmarks.js`), dazu ein Eintrag in `WORLD_NAMES` (`achievements.js`) und in der Liste von `tools/smoke.mjs`. Jedes Bauteil muss zusammenhängen und den Boden berühren, sonst hängt es in der Luft, bis es angestoßen wird.
- **Neuer Erfolg:** eine Zeile in `achievements.js` (`tiers(zähler, symbol, text, [[schwelle, name], …])`). Ein neuer Zähler kommt zusätzlich in `STATS` und wird im Spiel mit `game.stat(key)` oder `game.statMax(key, wert)` gezählt; nur Zähler aus `STATS` überstehen das Laden.
- **Feuer:** nie Voxel direkt anzünden, sondern Hitze geben (`fire.heatSphere(x, y, z, radius, hitze, versuche)`); Flammpunkte und Brenndauer stehen in `materials.js` (`FLASH`, `BURN`).
- **Neue Einstellung oder Detailgröße:** Schalter in `TOGGLES` und `DEFAULTS` (`progress.js`) und im Einstellungsblatt (`hud.js`); Größen je Detailstufe in der Tabelle `DETAIL` (`main.js`).
- **Neue Reaktion der Welt:** in `reactions.js` den Voxel-Typ in die Tabelle `REACT` eintragen und in `onVoxel` behandeln. Die Funktion läuft für jeden zerstörten Würfel, muss also billig bleiben.
- **Macht bei Einstürzen:** `game.gainScale` ist nur in `bodies.detach` und `stability.collapse` kleiner als 1 (`FALL_GAIN`) und muss danach wieder auf 1 stehen.

### Idle-Modus (`autopilot.js`)

Der Autopilot tut nichts, was ein Spieler nicht auch könnte: Er füllt einmal pro Bild den Zustand von `Input` (`forward`, `turn`, `sprint`, `aimX/aimY`, `firePressed`, `heavyPressed`) und wählt Angriffe über `game.selectTool`. Die Simulation weiß nicht, wer spielt.

- **Ablauf:** nächstes stehendes Gebäude wählen (eines der drei nächsten, jedes dritte Mal ein fernes, damit die Karte erkundet wird) → eine noch feste Stelle daran suchen (`pickSpot`) → hinlaufen oder hinfliegen und über `game.project()` darauf zielen → in Reichweite abwechselnd schnell und stark angreifen → alle 5 bis 11 Sekunden den Angriff wechseln → bei Stillstand springen, dann anderes Ziel.
- **Weltwechsel:** 7 Sekunden nach 100 % oder nach 12 Minuten in derselben Welt, reihum durch `WORLDS`.
- **Ein und aus:** `game.setIdle(on)`; Knopf 🍿, Taste I, Adresse `?idle=1`, optional automatisch nach 2 Minuten ohne Eingabe (Einstellungen). Jede echte Eingabe schaltet ab (`input.onActivity`).
- **Zufall:** Die Entscheidungen des Autopiloten nutzen `Math.random`, gehören also bewusst nicht zur reproduzierbaren Simulation.
- **Erweitern:** neue Angriffe mit Fernwirkung in die Liste `RANGED` eintragen, sonst läuft der Autopilot damit bis an das Ziel heran.

### Bekannte Lücken

Bruchstücke stoßen nicht miteinander zusammen · keine Schlagschatten · kein fahrender Verkehr · Feuer frisst sich nicht durch Beton- und Glasbauten · Zeitlupe (außer kurz bei schweren Treffern), Zurückspulen und „Welt wehrt sich“ fehlen · Speicherbedarf der Wolkenkratzer-Stadt rund 190 MB · Balance, Ton und Animationen sind nicht von Menschen abgenommen.

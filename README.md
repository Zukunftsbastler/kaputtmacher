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
- **Geplant: ein Idle-Modus,** in dem das Spiel selbst entscheidet, was als Nächstes zerstört wird, sodass es im Hintergrund laufen kann. Er ist noch nicht gebaut; Teil 2 nennt die Stelle, an der er ansetzen würde.

### Was man tut

| | |
|---|---|
| Bewegen | W/S oder Pfeile vor und zurück, A/D drehen, Umschalt rennen, Leertaste springen (halten = höher) |
| Angreifen | **Linksklick schnell und schwächer, Rechtsklick langsam und stark.** Tasten 1–4 wählen den Angriff |
| Kamera | Mittlere Maustaste ziehen; Tab wechselt zur freien Flugkamera |
| Gamepad, Touch | werden automatisch erkannt (Trigger rechts/links; kurz tippen/halten) |

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

**Was die Zerstörung ausmacht:** Materialien brechen verschieden. Gebäude geben nach, wenn einem Stockwerk zu viel Tragkraft fehlt – Holz früh, Beton spät. Abgetrennte Teile kippen, zerschellen und zerschlagen, worauf sie fallen. Ab Stufe 4 reißen Einstürze Nachbarn mit (Kettenreaktionen, abschaltbar). Holz, Blätter und Stoff brennen. Hubschrauber kreisen, sobald es kracht. Lose Trümmer verschwinden nach rund 30 Sekunden wieder; größere Schutthaufen bleiben als Ruinen.

Das vollständige Konzept mit allen Zahlen steht in [KONZEPT.md](KONZEPT.md).

### Stand

Spielbar. Geprüft wurde bisher fast nur automatisiert (Durchläufe im Browser mit Bildschirmfotos). Nicht von der KI beurteilbar und daher offen: wie sich die Animationen in Bewegung anfühlen, wie der Ton klingt, die Spielbalance, das Verhalten auf Handy, Gamepad und schwachen Rechnern. Einzelheiten in KONZEPT.md, Abschnitt 16.

---

## Teil 2: Projektüberblick für eine KI

### Regeln des Projekts

1. **Keine Abhängigkeiten, kein Build.** Kein npm, kein Framework, keine Engine, kein CDN. Der Inhalt von `public/` wird unverändert ausgeliefert (Netlify, `netlify.toml`). Grund: möglichst kleine Angriffsfläche.
2. **Strenge Content-Security-Policy** (`public/_headers`): nur eigene Dateien, keine Inline-Skripte, keine Inline-Style-Attribute im Markup (Setzen über `element.style` ist erlaubt), keine Netzwerkzugriffe.
3. **Quellcode englisch,** Spieloberfläche sprachfrei (Emoji als Symbole). Einzige Textstelle ist die Eltern-Ecke, auf Deutsch.
4. **Jeder Prompt des Autors wird wörtlich abgelegt** als `PROMPTS/PROMPTnn.md` (nächste freie Nummer).
5. **KONZEPT.md ist die Spezifikation** und wird bei jeder Änderung mitgeführt, einschließlich ehrlichem Umsetzungsstand in Abschnitt 16.
6. **Kindgerecht:** kein Scheitern, kein Blut, niemand stirbt; Neues wird einzeln eingeführt und vorgemacht.

### Verzeichnis

```
serve.py            lokaler Entwicklungsserver ohne Cache
netlify.toml        veröffentlicht public/
KONZEPT.md          Spielkonzept und Umsetzungsstand
PROMPTS/            alle Prompts des Autors
public/
  index.html, style.css, _headers
  src/              21 ES-Module, siehe unten
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
| `renderer.js` | WebGL2: Voxel-Netze, Würfel-Instanzen, Leuchtpunkte, Himmel; Krümmung, Dunst, Guckloch |
| `destruction.js` | Schadensformen (`sphere`, `capsule`) und Haltprüfung (`flush`): was den Bodenkontakt verliert, wird Bruchstück |
| `stability.js` | Tragkraft-Bilanz je Stockwerk; Schubsen; Schwächung durch Kettenreaktionen; löst Einstürze aus |
| `bodies.js` | Starre Bruchstücke: Fallen, Kontakt mit der Welt, Weiterzerbrechen, Zurückschreiben als Schutt |
| `particles.js` | `Debris` (lose Würfel mit Kollision), `Fx` (Staub, Funken, Rauch …), `GRAVITY`, `launch()` |
| `fire.js` | Brennende Voxel, Ausbreitung, Brandherde |
| `sweeper.js` | Entfernt lose Trümmer nach 30 s, lässt Haufen ab 14 Würfeln stehen |
| `monster.js` | Gelenkmodelle der fünf Figuren je Stufe, Körpersprache (`locomotion`), Steuerung am Boden und in der Luft (`Monster`) |
| `tools.js` | Angriffe: Tabelle `MOVES` je Figur (leicht/schwer, Pose, Wirkung) und die Bausteine dafür (`blow`, `shock`, `bolt`, `ray`, `rocket`, `bomb`, `grab` …) |
| `actors.js` | Bewohner und Hubschrauber |
| `audio.js` | Erzeugter Ton (Web Audio), keine Dateien |
| `input.js` | Maus/Tastatur, Gamepad, Touch → ein gemeinsamer Zustand |
| `hud.js` | Oberfläche aus DOM-Elementen, Vorführ-Hinweise, Weltauswahl, Eltern-Ecke |
| `progress.js` | Spielstand und Einstellungen in `localStorage` |

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
- **Vertex-Positionen sind 16-Bit-Ganzzahlen;** der Farbton je Würfel entsteht erst im Fragment-Shader.
- **Browser-Cache:** siehe „Starten“. Nach Änderungen an mehreren Modulen immer mit `serve.py` testen. Auf Netlify sorgt `Cache-Control: no-cache` in `_headers` dafür, dass der Browser bei jeder Datei nachfragt.
- **Tastatur gehört dem Spiel nur ohne offenes Menü** (`forGame` in `input.js`), sonst wären Regler und Knöpfe der Eltern-Ecke nicht per Tastatur bedienbar.
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
| Veröffentlichter Umfang | Nur `public/`. Konzept, Prompts, README und `serve.py` werden nicht ausgeliefert |

Regeln, damit das so bleibt: kein `innerHTML` und keine Inline-Styles im Markup; jeder neue Adress-Parameter und jedes neue Feld im Spielstand bekommt eine Prüfung in `progress.js`; keine externen Ressourcen.

Bewusst belassen: `window.game` und die Test-Parameter. Beides gibt nur Zugriff auf das, was der Spieler im eigenen Browser ohnehin hat.

### Testen ohne Testframework

- **Adress-Parameter** (speichern keinen Fortschritt): `?world=skyline|blocks|garden|house|toyland|village|park|city|factory|random`, `?stage=7`, `?species=dino|gorilla|robot|tank|jet`, `?tool=<Angriffs-Id>`, `?unlock=1`, `?quality=low`, `?fly=1`.
- **`window.game`** gibt in der Browser-Konsole Zugriff auf alles, z. B. `game.tools.use(game.tool, true)` oder `game.gain += 1e6`.
- Die Module ohne WebGL (`world`, `worldgen`, `destruction`, `bodies`, `particles`, `mesher`) laufen auch in Node, wenn man sie in einen Ordner mit `{"type":"module"}` kopiert.

### Rezepte

- **Neuer Angriff:** in `tools.js` einen Eintrag in `MOVES.<figur>` anlegen: `{ id, icon, stage, light, heavy }`. Jede Fassung hat `wind`, `strike`, `recover` (Sekunden), `pose(j, p, a, b, c, act)` für die Gelenke und eine oder mehrere Wirkungen: `begin`, `tick` (jeden Schritt während des Schlags), `hit` (einmal bei `hitAt`), `end`. `root: true` hält die Füße fest.
- **Neue Figur:** in `monster.js` Eintrag in `SPECIES`, Modell in `buildModel` (Teile mit Drehpunkt und Elternteil), Körpersprache in `locomotion`; in `tools.js` eine Angriffsliste.
- **Neue Welt:** in `worldgen.js` eine Bauplan-Funktion (liefert eine `World`) und einen Eintrag in `WORLDS`. Für Städte genügt ein neuer Parametersatz für `town()`.
- **Neues Material oder neuer Voxel-Typ:** `materials.js`; höchstens 127 Typen.

### Wo der Idle-Modus ansetzen würde

Die gesamte Simulation liest nur den Zustand von `Input` (`forward`, `turn`, `sprint`, `aimX/aimY`, `firePressed`, `heavyPressed`, `jumpHeld`, `actions`). Ein Autopilot kann diese Felder füllen, ohne dass sonst etwas geändert werden muss. Was er zum Entscheiden braucht, liegt vor: die Gebäudeliste mit Lage, Restbestand und Zustand (`game.hud.major`, Felder `x0…z1`, `remaining`, `done`), die freigeschalteten Angriffe (`game.unlockedTools()`) und `game.project()`, um einen Weltpunkt in Bildschirmkoordinaten für das Zielen umzurechnen. Für den Hintergrundbetrieb kämen dazu: Wechsel der Welt bei 100 %, gelegentlicher Wechsel von Figur und Kameraführung.

### Bekannte Lücken

Bruchstücke stoßen nicht miteinander zusammen · keine Schlagschatten · kein fahrender Verkehr · Feuer frisst sich nicht durch Beton- und Glasbauten · Zeitlupe (außer kurz bei schweren Treffern), Zurückspulen und „Welt wehrt sich“ fehlen · Speicherbedarf der Wolkenkratzer-Stadt rund 190 MB · Balance, Ton und Animationen sind nicht von Menschen abgenommen.

# Kaputtmacher

Ein 3D-Voxel-Spiel im Browser, in dem man als Monster, Roboter, Panzer, Flieger, Hubschrauber oder Tentakel eine detailliert gebaute Welt zerlegt. Es gibt kein Ziel, keine Gegner, kein Verlieren – nur Zerstörung, die sich wuchtig anfühlt.

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
| Karte | Knopf 🗺️ oder Taste M: Minimap ein- und ausblenden |
| Gamepad | wird automatisch erkannt (Trigger rechts/links) |
| Handy, Tablet | Steuerknüppel links; rechts Knöpfe für Springen, schnellen und starken Angriff und Angriffswechsel; alles Übrige im Menü ☰ oben rechts. Ins Bild tippen zielt (kurz = schnell, halten = stark) |

**Acht Figuren, acht Arten zu zerstören.** Jede hat vier Angriffe (ab Stufe 1, 3, 5, 7), jeden in einer schnellen und einer starken Fassung:

| Figur | Angriffe |
|---|---|
| 🦖 Dino | Schwanzschlag, Biss, Ansturm, Feuer und Atomstrahl |
| 🦍 Gorilla | Fäuste, Würfe, Stampfen und Sprungschlag, Raserei |
| 🤖 Roboter | Laserklinge, Orbitalschlag, Raketen, Laser |
| 🪖 Panzer | Kanone, Mörser, Rammen, Flammenwerfer und Bunkerbrecher |
| 🚜 Bagger | Schaufel (Graben, Schaufelschlag), Hydraulikhammer (Meißeln, Durchbruch), Schwenken (Schwenkhieb, Karussell), Auskippen und Planierschild – alles am Ende seines Arms; er schießt und klettert nicht |
| ✈️ Flieger | Bordkanone und Bomben, Raketen, Bombenteppich, Brandbomben und Riesenbombe |
| 🚁 Hubschrauber | Bordkanone (Feuerstoß, Kreisflug), Raketen (Paar, Salve), Seilwinde (Haken, der Dinge anhebt und fallen lässt; Abrissbirne), Rotor (Rotorsäge, Tornado) |
| 🐙 Tentakel | Peitsche (Schnalzer, Wirbel), Umschlingen (Zudrücken, Umreißen), Tinte (Strahl, Bombe), Erwachen (Bodenwelle; fünf Tentakel ziehen ein Gebäude in die Tiefe) |

Der Flieger ist immer in Bewegung: A/D lenkt, W/S steigt und sinkt, Umschalt ist der Nachbrenner. Er fliegt durch Häuserschluchten und durch Gebäude hindurch.

Der Hubschrauber schwebt: W/S vor und zurück, A/D dreht die Ansicht, Q/E gleitet seitwärts; solange die Leertaste (am Handy der 🔼-Knopf) gehalten wird, steigt er, sonst sackt er von selbst ab. Die Nase zeigt zum Ziel.

Das Tentakel läuft nicht: Es reist unter der Erde (den Steuerknüppel durchdrücken, oder die Leertaste bzw. der 🕳️-Knopf) und taucht zum Angreifen wieder auf, auch unter einem Haus mitten durch die Stockwerke. Steht es unter der Erde still, sieht man nichts; bewegt es sich, hebt es den Boden über sich an, ab Stufe 3 für immer. Es hat kein Gesicht; über seiner Spitze ploppen Manga-Zeichen mit Tuscherand und Katakana-Lautmalerei auf (ゴゴゴ, ドン!, ズズズ, Zornesader, Schweißtropfen, Rotzblase …).

**20 Welten,** frei wählbar: eine Heimatwelt für jede der acht Figuren (Urzeit-Nekropole, Babel, Neon-Megacity, Festung Titan, Wolkenwerft, Großbaustelle, Hafen, Stadt unter dem Meer), dazu die Wolkenkratzer-Stadt als Hauptszenario (Türme bis 230 m), Bauklotz-Zimmer, Dorf, Vergnügungspark, Stadt, Fabrik, Ritterburgen, Winterwelt, Flughafen, Welt der Riesenbauten, Raumhafen und ein gewürfelter Planet mit Schiebereglern. Große Welten sind Planeten ohne Rand. Figur und Welt wählt man über die Weltkugel oben rechts oder das Gesicht der Figur im Ring oben links; das Spiel führt diese Auswahl nach dem ersten Wachsen vor.

**Was die Zerstörung ausmacht:** Materialien brechen verschieden. Gebäude geben nach, wenn einem Stockwerk zu viel Tragkraft fehlt – Holz früh, Beton spät. Abgetrennte Teile kippen, zerschellen und zerschlagen, worauf sie fallen. Dabei zählt die Masse: Ein Turmstück zerdrückt ein kleines Haus einfach und hüllt es in Staub, an einem anderen Turm bleibt es eher lehnen. Zerstörte Hydranten spritzen eine Weile Wasserfontänen, die Feuer löschen; Lampen sprühen Funken; manche Autos explodieren. Feuer richtet sich nach dem Material: Laub und Holz brennen, Glas platzt, Stein und Blech verrußen.

**Die Welt reagiert:** Beim ersten Schaden kommt ein Polizeiauto, dann mehr, dazu Reporter im Hubschrauber, die Feuerwehr, sobald es brennt, und schließlich das Militär mit Hubschraubern und Kampffliegern. Niemand kann dem Kaputtmacher etwas anhaben; alle lassen sich umwerfen oder vom Himmel holen. Die Alarmstufe (Sterne) steigt mit der Zeit und ebbt wieder ab, wenn man nichts zerstört.

**Erfolge:** 143 kleine Ziele, die beim Erreichen kurz eingeblendet werden. Jede der acht Figuren wächst für sich. Ab Stufe 4 reißen Einstürze Nachbarn mit (Kettenreaktionen, abschaltbar). Holz, Blätter und Stoff brennen. Hubschrauber kreisen, sobald es kracht. Lose Trümmer verschwinden nach rund 30 Sekunden wieder; größere Schutthaufen bleiben als Ruinen.

Das vollständige Konzept mit allen Zahlen steht in [KONZEPT.md](KONZEPT.md).

### Stand

Spielbar. Geprüft wurde bisher fast nur automatisiert (Durchläufe im Browser mit Bildschirmfotos). Nicht von der KI beurteilbar und daher offen: wie sich die Animationen in Bewegung anfühlen, wie der Ton klingt, die Spielbalance, das Verhalten auf Handy, Gamepad und schwachen Rechnern. Einzelheiten in KONZEPT.md, Abschnitt 16.

---

## Teil 2: Projektüberblick für eine KI

### Regeln des Projekts

1. **Keine Abhängigkeiten, kein Build.** Kein npm, kein Framework, keine Engine, kein CDN. Die Musik kommt aus der eigenen, ebenfalls abhängigkeitsfreien Musik-Generator-Suite des Autors; deren Dateien sind eingekopiert (`public/src/vendor/`). Der Inhalt von `public/` wird unverändert ausgeliefert (Netlify, `netlify.toml`). Grund: möglichst kleine Angriffsfläche.
2. **Strenge Content-Security-Policy** (`public/_headers`): nur eigene Dateien, keine Inline-Skripte, keine Inline-Style-Attribute im Markup (Setzen über `element.style` ist erlaubt), keine Netzwerkzugriffe. Einzige Öffnung: ein Worker aus eigener Quelle für die Musik, dessen Adresse nur die Trusted-Types-Policy `kaputtmacher-music` nennen darf.
3. **Quellcode englisch,** Spieloberfläche sprachfrei (Emoji als Symbole). Text gibt es nur an zwei Stellen, beide auf Deutsch: in den Einstellungen und als Link „Impressum & Datenschutz“ (rechtlich nötig, führt zu `public/impressum.html`).
   Wer ändert, was das Spiel speichert oder lädt, muss die Datenschutzerklärung in `public/impressum.html` anpassen – sie beschreibt den Ist-Zustand genau.
4. **Jeder Prompt des Autors wird wörtlich abgelegt** als `PROMPTS/PROMPTnn.md` (nächste freie Nummer).
5. **KONZEPT.md ist die Spezifikation** (mit den Anhängen in `konzept/`) und wird bei jeder Änderung mitgeführt, einschließlich ehrlichem Umsetzungsstand in Abschnitt 16. Sie beschreibt den Ist-Zustand; Geschichte gehört nach VERLAUF.md. `node tools/check.mjs` vergleicht einige Zahlen der Dokumente mit dem Code.
6. **Kindgerecht:** kein Scheitern, kein Blut, niemand stirbt; Neues wird einzeln eingeführt und vorgemacht.

### Verzeichnis

```
serve.py            lokaler Entwicklungsserver ohne Cache
tools/              Prüfwerkzeuge (Node, ohne Pakete): check.mjs, floating.mjs, music.mjs, smoke.mjs, soak.mjs, serve.mjs, browser.mjs, web/ (Testseite und Szenarien)
TESTEN.md           Checkliste für Tests von Hand
VERLAUF.md          was sich von Entwurf zu Entwurf geändert hat
netlify.toml        veröffentlicht public/
KONZEPT.md          Spielkonzept und Umsetzungsstand
konzept/            Anhänge: welten.md, figuren.md, physik.md, musik.md
REFACTORING.md      was als Nächstes verbessert werden sollte, technisch und spielerisch, nach Relevanz geordnet und mit Messwerten
PROMPTS/            alle Prompts des Autors
jsconfig.json       nur für den Editor (Sprung zur Definition); es wird nichts gebaut
public/
  index.html, style.css, _headers
  impressum.html, legal.css, legal.js   Impressum, Datenschutzerklärung und der Knopf zum Löschen des Spielstands
  src/              65 ES-Module (davon 8 in moves/), siehe unten, und vendor/musik-generator/ (eingekopierte Musik-Suite)
```

### Module (`public/src`)

| Datei | Aufgabe |
|---|---|
| `main.js` | Klasse `Game`: besitzt alle Systeme, lädt Welten (`loadWorld` sofort, `loadWorldAway` im Worker), feste Simulationsschritte (1/60 s, `step`), fehlerfeste Hauptschleife (`frame`, `fault`), Zeitmessung je Bild (`perf`). Einstiegspunkt; legt `window.game` an. Die Klasse ist auf vier Dateien verteilt (`mixin.js`): |
| `game-view.js` | … Kamera, Zielstrahl (`pick`), Projektion, Zeichnen eines Bildes, Figur und Geist |
| `game-events.js` | … Rückmeldungen auf Ereignisse (`onDamage`, `onImpact`, `onCollapse`, `onShove` …): Staub, Ton, Wackeln, Kettenreaktionen, Explosionen |
| `game-power.js` | … Macht, Vorrat und Wachstum, fertige Gebäude, Zähler der Erfolge |
| `mixin.js` | Fügt die Methoden mehrerer Klassen zu einer zusammen (für `Game`, `Tools`, `Monster`) |
| `math.js` | Matrizen, Quaternionen, reproduzierbarer Zufall (`makeRng`), `wrapDelta` |
| `materials.js` | Materialien (Festigkeit, Dichte, Machtwert, Klang) und Voxel-Typen (Material + Farbe). Tabellen `TYPE_MAT`, `TYPE_RGBA`, `TYPE_FLAGS` |
| `world.js` | Statisches Voxel-Gitter in 32³-Blöcken; `get`/`set`; Gebäudeliste (`structures`) mit Grundriss-Karte; `finalize()` nach der Erzeugung, davor `weld()` (verschweißt, was sich nur schräg berührt); `isLink` (gehört ein Würfel zu einer Superstruktur?) |
| `worldgen.js` | Baukasten und Baupläne aller Welten; Liste `WORLDS`; Stadtgenerator `town()` |
| `citykit.js` | Großstadt-Baukasten: Wolkenkratzer aus Segmenten, Fassaden, Dächer, Läden, Eingänge |
| `mesher.js` | Voxel → Flächen: nur sichtbare Flächen, Kantenabdunklung, Zusammenfassen gleicher Flächen; eine Fläche = ein Eintrag von 16 Byte (`QUAD_BYTES`); `padChunk` kopiert einen Block mit Rand für die Worker |
| `meshing.js` | Wann welcher Block ein neues Netz bekommt und wo es entsteht: Reihenfolge (getroffene zuerst, dann die nächsten), sofort bei der Figur, sonst in zwei bis drei Workern; Netze großer Bruchstücke (`MeshQueue`) |
| `mesh-worker.js` | Der Vernetzungs-Worker |
| `world-worker.js` | Erzeugt eine Welt beim Reisen im Hintergrund (`Game.loadWorldAway`) |
| `renderer.js` | WebGL2: Voxel-Netze (eine Instanz je Fläche, die Ecken errechnet der Shader), Würfel-Instanzen, Leuchtpunkte, Himmel; Krümmung, Dunst, Sichtfenster um die Figur; Grafikspeicher der Netze (`meshBytes`) |
| `destruction.js` | Schadensformen (`sphere`, `capsule`) und Haltprüfung (`flush`): was den Bodenkontakt verliert, wird Bruchstück |
| `stability.js` | Tragkraft-Bilanz je Stockwerk; Schubsen; Schwächung durch Kettenreaktionen; löst Einstürze aus |
| `bodies.js` | Starre Bruchstücke: Fallen, Kontakt mit der Welt (Wucht nach Masse: Leichtes wird zerdrückt), Weiterzerbrechen, Zurückschreiben als Schutt |
| `particles.js` | `Debris` (lose Würfel mit Kollision), `Fx` (Staub, Funken, Rauch …), `GRAVITY`, `launch()` |
| `fire.js` | Hitze und Flammpunkte je Material (`heat`, `heatSphere`), brennende Voxel, langsame Ausbreitung, Ruß, Brandherde, Staubwolken, Löschen (`douse`) |
| `reactions.js` | Reaktionen zerstörter Dinge: Hydranten-Fontänen, Wasserschwall, Funken an Lampen; Wasser löscht Feuer; Munitionsdepot; der Vulkan erwacht und wirft Lavabomben |
| `sweeper.js` | Entfernt lose Trümmer nach 30 s, lässt Haufen ab 14 Würfeln stehen |
| `monster.js` | Klasse `Monster`: Steuerung am Boden, Springen, Doppelsprung, Stampfattacke, Klettern (`wallFace` stellt die Figur gerade vor die Wand); führt alles aus den folgenden Dateien wieder aus |
| `species.js` | Die Figuren als Daten (`SPECIES`: Bewegungsart, Ketten, Kamera, Geist, Emoticons, Sprungknopf, Macht-Anteil), `specOf`, `motionOf`, Größe und Macht je Stufe (`stageScale`, `stageNeed`) |
| `models.js` | Gelenkmodelle der acht Figuren je Stufe (das Tentakel als Kette aus 14 Gliedern), Emoticons des Tentakels |
| `posing.js` | Körpersprache (`locomotion`), Griff des Tentakels (`reachFor`), Matrix je Modellteil |
| `climb.js` | Hände und Füße an der Wand (`Climber`), Haltung beim Klettern |
| `monster-air.js`, `monster-burrow.js` | Fliegen (`flyPlane`) und Schweben (`hover`); Reisen unter der Erde (`burrow`, `dive`, `surface`) |
| `heave.js` | Der Boden über dem reisenden Tentakel: hebt echte Würfel in einer mitwandernden Kuppel an, ab Stufe 3 bleibend, und lässt jeden zehnten Pflasterstein brechen |
| `tools.js` | Angriffe: wie ein Angriff abläuft (`use`, `updateAct`, Ausholen – Schlag – Erholung), Stampfen, Brüllen, Zeitgeber. Die Angriffstabellen stehen je Figur in `moves/<figur>.js` (gemeinsame Kurven und zwei geteilte Angriffe in `moves/kit.js`), die Bausteine in: |
| `tools-melee.js` | … Schläge, Stoßringe, Schwanz- und Armschwünge, Meißel, Schnitte, Greifen und Werfen |
| `tools-ranged.js` | … Strahlen (gerade im Bild), Feuer, Raketen, Granaten, Bomben, Minen, Schläge aus dem All |
| `tools-chopper.js`, `tools-tentacle.js` | … Bordkanone, Kreisflug, Rotorsäge, Seilwinde und Windhosen des Hubschraubers; Griff, Wirbel, Tinte, Bodenwelle und Erwachen des Tentakels |
| `actors.js` | Bewohner und Einsatzkräfte: Polizeiautos, Feuerwehr, Reporter-, Lösch- und Militär-Hubschrauber, Kampfflieger; Alarmstufe |
| `frail.js` | Standfestigkeit schlanker Bauten: Was mit dem Schwerpunkt neben seiner Standfläche hängt, kippt |
| `rampart.js` | Der Schutzschirm über den Mauern von Festung Titan: keine Figur kommt hinüber, nur durch Tor oder Bresche |
| `spans.js` | Wie Superstrukturen brechen: Seile reißen und schwingen an ihren Festpunkten herab (Kette aus Würfeln, danach als Schutt abgelegt), Träger halten als Kragarm oder brechen an der Stütze, Mauerwerk stürzt feldweise ein, Glas zerspringt; zu schwere Figuren brechen ein |
| `music.js` | Musik, die der Handlung folgt: lässt das Stück der Welt (oder das gewählte) beim Laden in einem Worker komponieren und rendern, beim Weltwechsel ein anderes und steuert den Stem-Player (drei Zustände nach Alarmstufe, Schichten nach Zerstörung); fällt ohne Worker auf `music-classic.js` zurück |
| `music-score.js` | Die Musik als Daten: ein Stück je Welt (Ohrwurm, Tonart, Tempi, Stil, Startwert), daraus die Beschreibung mit Zuständen (Bummeln, Verfolgung, Chaos), Schichten und Übergängen; Zuordnung Alarmstufe → Zustand |
| `music-classic.js` | Die frühere handgeschriebene Electro-Swing-Musik (Rückfall) |
| `vendor/musik-generator/` | Eingekopierte Teile der Musik-Generator-Suite des Autors (MIT): Stem-Player und Stem-Renderer. Nicht hier ändern; `tools/vendor-music.mjs` kopiert neu |
| `achievements.js` | Liste der 143 Erfolge, Zähler (`STATS`), Prüfung |
| `traffic.js` | Straßennetz (`Roads`: Kreuzungen, Rechtsverkehr, Ausweichen, Wenden) und fahrende Autos und Busse (`Traffic`) |
| `landmarks3.js` | Heimatwelten der Figuren (Rohbauten, Haufen, Baucontainer und Steinbruch der Großbaustelle); Mammutbäume, Urwaldpflanzen, Nester, Steinkreise, Vulkan mit Geheimgang, Lavasee, Kristallen und goldenem Götzenbild, Sumpf; Zikkurats, Turm zu Babel, Lehmhäuser, Basar, Obelisken, Ischtar-Tor, Palmen und Feuerschalen; Neon-Türme mit Lichtlinien und Hochstraßen; Flaktürme und Bunker; schwebende Inseln und Luftschiffe; Fachwerkhäuser und Turnierplatz der Ritterburgen; Berg, Grandhotel, Seilbahn, Leuchtturm und Radarmast für Winterwelt, Hafen und Flughafen |
| `links.js` | Superstrukturen: verbindet die Bauten einer Welt zu Netzen über mehrere Höhen, mit Knotenpunkten (Bahnhöfe, Auffahrten, Plattformtürme …) auf Flächen und Dächern (Hochbahn, Skybridge, Superhighway, Lianen, Hängebrücke, Achterbahn, Steinbrücke, Aquädukt auf Arkaden mit Wasserreservoir und Brunnentürmen, Wehrgang, Glasröhre, Rohrleitung, Förderbrücke, Skywalk, Laufsteg, Seilbahn); merkt sich je Verbindung den Verlauf für `spans.js` und je Bodensäule, wo Verbindungen liegen (`world.isLink`) |
| `fortress.js` | Festung Titan: Wüste, Graben, zwei Mauerringe mit Türmen und Geschützen, Vorposten, Hof mit Militärbauten, Riesenmaschinen, Kommandoturm und Munitionsdepot |
| `landmarks.js`, `landmarks2.js` | Besondere Grundstücke für den Stadtgenerator: Fahrgeschäfte, Hafenanlagen, Riesenbauten; Flughafen, Burg, Raumhafen, Winterwelt, Unterwasserstadt |
| `autopilot.js` | Idle-Modus: füllt den Eingabezustand, wählt Ziele, Angriffe und Welten |
| `audio.js` | Erzeugter Ton (Web Audio), keine Dateien |
| `input.js` | Maus/Tastatur, Gamepad, Touch → ein gemeinsamer Zustand |
| `hud.js` | Oberfläche aus DOM-Elementen, Vorführ-Hinweise, Weltauswahl, Einstellungen |
| `minimap.js` | Die Minimap: runder Kartenausschnitt um die Figur, dreht mit der Kamera, markiert Zerstörung rot; ein- und ausblendbar (🗺️, Taste M) |
| `perfmeter.js` | Messanzeige für Tests auf Geräten ohne Konsole (`?perf=1`) |
| `progress.js` | Spielstand und Einstellungen in `localStorage`: Stufe und Macht je Figur, Zähler, Erfolge, Detailstufe |

### Datenmodell

- **Voxel:** ein Byte. 0 = Luft, 1–127 = ursprüngliche Typen, Typ|128 = derselbe Typ als loser Schutt, 254/255 = verkohlt/glühend. Würfelkante = 1 Einheit.
- **Welt:** Blöcke von 32³ als `Uint8Array`; ein Block mit nur einem Wert liegt als einzelnes Byte vor (`uniform`). Planeten haben `wrap = true` und Zweierpotenz-Kanten; `get`/`set` falten x und z selbst.
- **Gebäude (`structure`):** Zuordnung über die Grundriss-Karte `footprint[x + sx*z]`, kein Speicher pro Voxel. Enthält Zählerstände und für `major`-Gebäude Tragkraft `S`, Ursprungs-Tragkraft `S0` und Masse `M` je Höhenschicht.
- **Drei Zustände eines Voxels:** fest im Gitter → Teil eines starren Bruchstücks (`Body`, eigenes kleines Gitter mit Lage und Drehung) → loser Würfel (`Debris`) → zurück ins Gitter als Schutt.
- **Koordinaten:** x/z waagerecht, y nach oben. Vorwärts bei Blickwinkel `yaw` ist `(sin yaw, cos yaw)`; „rechts“ ist dann `(-cos yaw, sin yaw)`.
- **Planeten-Darstellung:** Die Welt ist flach; erst der Vertex-Shader senkt alles um `Abstand² × u_curv` ab. Alles wird relativ zu einem Fokuspunkt (Monster oder Flugkamera) gezeichnet. Der Zielstrahl (`Game.pick`) rechnet diese Krümmung zurück.

### Ablauf

Ein Bild (`Game.frame`, der Rumpf in `frameBody`): Eingabe abfragen → Kamera → Zielstrahl → 0 bis 3 Simulationsschritte → neue Netze (`meshing.js`: getroffene Blöcke bei der Figur sofort, alles andere in Workern; auf Planeten nur im sichtbaren Ausschnitt) → zeichnen. Wirft ein Bild einen Fehler, wird er abgefangen (`Game.fault`), das nächste Bild kommt trotzdem; nach drei Fehlern in zehn Sekunden wird die Welt neu geladen. Während eine Welt im Worker entsteht (`game.loading`), wird nichts gerechnet oder gezeichnet.

Ein Simulationsschritt (`Game.step`), Reihenfolge ist wichtig: Figur bewegen → Angriff starten/fortführen (`tools`) → Bruchstücke → Feuer → Stabilität → Aufräumen → **Haltprüfung (`destruction.flush`)** → lose Würfel → Effekte → Bewohner/Hubschrauber → Explosionen → Macht und Zähler.

### Invarianten und Fallstricke

- **Jede Änderung der Welt läuft über `world.set`.** Dort hängen Zähler, Macht, Tragkraft-Bilanz und die Markierung zum Neuvernetzen. Wer Voxel entfernt, ruft danach `destruction.addSeeds(x, y, z)`, sonst bleibt Abgetrenntes in der Luft stehen.
- **Die Simulation benutzt `game.rng`,** nie `Math.random` (nur Kamerawackeln und Ton dürfen das; das Wackeln verschiebt nur das gezeichnete Bild, `cam.drawVp`, nie den Zielstrahl). Der Autopilot hat einen eigenen Generator (`?seed=`). Feste Zeitschritte und reproduzierbarer Zufall sind Voraussetzung für Zeitlupe und Zurückspulen; der Vergleichslauf (`hash` in `tools/web/scenarios/measure.js`) prüft es: Ein Umbau, der nichts am Verhalten ändert, behält die Prüfsumme.
- **Keine Speicheranforderung im Spielverlauf,** wo es sich vermeiden lässt: Schutt, Effekte und Zwischenpuffer sind feste Vorräte.
- **Zusammengefasste Flächen sind auf Planeten waagerecht höchstens 4 Würfel lang** (`meshChunk`), sonst klaffen sie durch die Krümmung auseinander.
- **Strahlen verlaufen gerade im Bild, nicht in der Welt** (`Tools.trace`, `toPicture`/`toWorld`). Wer eine neue Strahlenwaffe baut, benutzt `bolt` oder `ray` und liest Treffpunkt und Richtung aus `this.hit` und `rdx/rdy/rdz`, statt selbst entlang einer Weltgeraden zu rechnen.
- **Eine Fläche ist ein Eintrag von 16 Byte** (`mesher.js`): Ecke als 16-Bit-Ganzzahlen, Ausdehnung als Bytes (höchstens 255), Seite und Kantenabdunklung, Farbe. Der Vertex-Shader baut daraus die vier Ecken (`gl_VertexID`); der Farbton je Würfel entsteht erst im Fragment-Shader. Wer das Format ändert, ändert `meshPadded` und `VOXEL_VS` zusammen.
- **Netze entstehen in Workern.** Nur `meshing.js` legt Netze von Blöcken an. `world.set` markiert geänderte Blöcke in `world.dirty` und `world.hot`; die Worker bekommen eine Kopie mit Rand (`padChunk`) und die Farbtabelle der Welt (bei jedem Weltwechsel neu, weil Nachtwelten ihr Glas markieren). Ein Ergebnis gilt nur, wenn sein Auftrag der neueste für diesen Block ist.
- **Eine Welt ist reine Daten** (keine Funktionen, keine eigenen Klassen außer `World` selbst), damit sie im Worker entstehen und herübergereicht werden kann (`world-worker.js`). Wer im Generator etwas an die Welt hängt, hängt Tabellen an, keine Funktionen (Beispiel: `world.roads`).
- **Was eine Figur ausmacht, steht in `SPECIES`** (`species.js`): Bewegungsart, Ketten, Kamera, Geist, Emoticons, Sprungknopf. Statt `species === 'chopper'` fragt der Code `motionOf(species) === 'hover'` oder `specOf(species).…`; nur Modelle und Körpersprache unterscheiden nach Namen.
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
| Fremder Code | Es gibt keinen: keine Abhängigkeiten, kein CDN, kein Build (die eingekopierte Musik-Suite stammt vom Autor selbst und hat ihrerseits keine Abhängigkeiten). `public/_headers` erlaubt per Content-Security-Policy nur eigene Skripte und Styles, keine Inline-Skripte, keine Netzwerkzugriffe, keine Einbettung in fremde Seiten |
| Text → HTML | Kommt nicht vor (`innerHTML`, `eval` und Verwandte werden nirgends benutzt; die Oberfläche entsteht über `createElement` und `textContent`). Die Policy erzwingt das zusätzlich über Trusted Types. Zugelassen sind nur drei Policies, und keine wandelt etwas um: Jede gibt unabhängig von der Eingabe die feste Adresse eines eigenen Workers zurück (`kaputtmacher-music` in `music.js`, `kaputtmacher-mesh` in `meshing.js`, `kaputtmacher-world` in `main.js`). Ein neuer Worker braucht eine eigene Policy und einen Eintrag in `public/_headers` |
| Adresszeile | Die Test-Parameter (`?stage=` …) werden gegen Wertebereiche und feste Listen geprüft (`cleanStage`, `cleanSpecies`, `cleanDetail`, `cleanSeed` in `progress.js`) und nie gespeichert. Ein präparierter Link kann das Spiel weder zum Absturz bringen noch Speicher fressen lassen |
| Spielstand | `localStorage` gilt als nicht vertrauenswürdig: `sanitize()` in `progress.js` baut aus beliebigem Inhalt einen gültigen Spielstand; Unbekanntes wird verworfen. Ein beschädigter Spielstand kann das Spiel nicht dauerhaft lahmlegen |
| Gerätefunktionen | Per Permissions-Policy abgeschaltet, bis auf Gamepad und Vollbild |
| Spielstand löschen | Knopf auf der Seite „Impressum & Datenschutz“ (`legal.js`, zwei Schritte) und als „Von vorn beginnen“ in den Einstellungen. Der Schlüssel `kaputtmacher.v1` steht in `progress.js` und in `legal.js` – wird er umbenannt, dann an beiden Stellen |
| Veröffentlichter Umfang | Nur `public/`. Konzept, Prompts, README, `serve.py` und `tools/` werden nicht ausgeliefert |

Regeln, damit das so bleibt: kein `innerHTML` und keine Inline-Styles im Markup; jeder neue Adress-Parameter und jedes neue Feld im Spielstand bekommt eine Prüfung in `progress.js`; keine externen Ressourcen.

Bewusst belassen: `window.game` und die Test-Parameter. Beides gibt nur Zugriff auf das, was der Spieler im eigenen Browser ohnehin hat.

### Testen ohne Testframework

- **Adress-Parameter** (speichern keinen Fortschritt): `?world=primeval|babel|neon|fortress|skyyard|site|skyline|blocks|village|funfair|city|factory|castle|winter|airport|harbour|giants|reef|spaceport|random` (ohne Angabe: die Heimatwelt der Figur oder die für sie gewählte Welt), `?stage=7`, `?species=dino|gorilla|robot|tank|digger|jet|chopper|tentacle`, `?tool=<Angriffs-Id>`, `?unlock=1`, `?quality=1…5` (Detailstufe; `low` und `high` gehen weiter), `?fly=1`, `?idle=1`, `?seed=<Zahl>` (Startwert des Autopiloten), `?perf=1` (Messanzeige: wohin die Zeit eines Bildes geht).
- **`window.game`** gibt in der Browser-Konsole Zugriff auf alles, z. B. `game.tools.use(game.tool, true)` oder `game.gain += 1e6`.
- **`tools/`** (siehe `tools/README.md`): `node tools/check.mjs` prüft ohne Browser Spielstand-Laden, Erfolgsliste, die Erzeugung aller Welten und einige Zahlen der Dokumente; `node tools/smoke.mjs` spielt in eigenen Headless-Browsern jede Welt und rund 30 längere Szenarien durch, meldet Skriptfehler, prüft die Reproduzierbarkeit (Vergleichslauf zweimal) und die Rechenzeit pro Bild; `node tools/soak.mjs` lässt das Selbstspiel lange laufen. Nach jeder größeren Änderung `check.mjs` und `smoke.mjs` laufen lassen.
- **Reine Umbauten belegen:** Der Vergleichslauf (`#hash`) liefert eine Prüfsumme über die ganze Welt nach 40 Sekunden Spielzeit mit festen Eingaben; bleibt sie vor und nach einem Umbau gleich, hat sich am Verhalten nichts geändert. Bilder vergleichen: `#still` hält das Bild ohne Oberfläche an.
- **Messen statt schätzen:** `node tools/browser.mjs name "world=skyline&stage=6&idle=1&run=55000" income 58000` liefert die Macht pro Sekunde im Selbstspiel; daraus sind die Stufen-Schwellen (`NEED` in `species.js`) abgeleitet.
- **Von Hand:** `TESTEN.md`.

### Rezepte

- **Neuer Angriff:** in `moves/<figur>.js` einen Eintrag anlegen (die Form steht als `Move` in `tools.js`): `{ id, icon, stage, light, heavy }`. Jede Fassung hat `wind`, `strike`, `recover` (Sekunden), `pose(j, p, a, b, c, act)` für die Gelenke und eine oder mehrere Wirkungen: `begin`, `tick` (jeden Schritt während des Schlags), `hit` (einmal bei `hitAt`), `end`. `root: true` hält die Füße fest.
- **Neue Figur:** in `species.js` ein Eintrag in `SPECIES` (mit `motion` und den übrigen Eigenschaften, siehe Kommentar dort), Modell in `buildModel` (`models.js`; Teile mit Drehpunkt und Elternteil), Körpersprache in `locomotion` (`posing.js`); eine Angriffsliste `moves/<figur>.js` und ihr Eintrag in `MOVES` (`tools.js`); in `achievements.js` Name und Symbol (`CREATURES`). Eine neue Bewegungsart bekommt einen Wert für `motion`, eine Datei nach dem Vorbild von `monster-air.js` und einen Zweig in `Monster.update`, in `Game.step` (Steuerung) und in `autopilot.js`. Den Schaden an den anderen Figuren messen (`income`, `audit` in `tools/web/scenarios/attacks.js`).
- **Neue Welt:** in `worldgen.js` eine Bauplan-Funktion (liefert eine `World`) und einen Eintrag in `WORLDS`. Für Städte genügt ein neuer Parametersatz für `town()`.
- **Neues Material oder neuer Voxel-Typ:** `materials.js`; höchstens 127 Typen.
- **Neue Welt:** ein Eintrag in `WORLDS` (`worldgen.js`) mit Gewichten je Grundstücksart; neue Grundstücksarten als Funktion in `LOTS` (`landmarks.js`), dazu ein Eintrag in `WORLD_NAMES` (`achievements.js`) und in der Liste von `tools/smoke.mjs`. Jedes Bauteil muss zusammenhängen und den Boden berühren, sonst hängt es in der Luft, bis es angestoßen wird.
- **Wahrzeichen:** ein Eintrag in `BIG` (`landmarks2.js`) mit Größe in Grundstücken, Bodenart und `build`; in der Welt über `big: { name: anzahl }` einschalten. `enlarged(bauplan, 2)` macht aus jedem Grundstücks-Bauplan ein Wahrzeichen in doppelter Größe.
- **Eigene Naturgesetze:** `world.grav` (Schwerkraft relativ), `world.under` (alles unter Wasser), `world.water` (offene Wasserfläche), `world.quiet` (keine Einsatzkräfte); gesetzt im Generator, ausgewertet in `monster.js`, `bodies.js`, `particles.js`, `fire.js`.
- **Neuer Erfolg:** eine Zeile in `achievements.js` (`tiers(zähler, symbol, text, [[schwelle, name], …])`). Ein neuer Zähler kommt zusätzlich in `STATS` und wird im Spiel mit `game.stat(key)` oder `game.statMax(key, wert)` gezählt; nur Zähler aus `STATS` überstehen das Laden.
- **Feuer:** nie Voxel direkt anzünden, sondern Hitze geben (`fire.heatSphere(x, y, z, radius, hitze, versuche)`); Flammpunkte und Brenndauer stehen in `materials.js` (`FLASH`, `BURN`).
- **Neue Einstellung oder Detailgröße:** Schalter in `TOGGLES` und `DEFAULTS` (`progress.js`) und im Einstellungsblatt (`hud.js`); Größen je Detailstufe in der Tabelle `DETAIL` (`main.js`).
- **Neue Reaktion der Welt:** in `reactions.js` den Voxel-Typ in die Tabelle `REACT` eintragen und in `onVoxel` behandeln. Die Funktion läuft für jeden zerstörten Würfel, muss also billig bleiben.
- **Macht bei Einstürzen:** `game.gainScale` ist nur in `bodies.detach` und `stability.collapse` kleiner als 1 (`FALL_GAIN`) und muss danach wieder auf 1 stehen.

### Idle-Modus (`autopilot.js`)

Der Autopilot tut nichts, was ein Spieler nicht auch könnte: Er füllt einmal pro Bild den Zustand von `Input` (`forward`, `turn`, `sprint`, `aimX/aimY`, `firePressed`, `heavyPressed`) und wählt Angriffe über `game.selectTool`. Die Simulation weiß nicht, wer spielt.

- **Ablauf:** nächstes stehendes Gebäude wählen (eines der drei nächsten, jedes dritte Mal ein fernes, damit die Karte erkundet wird) → eine noch feste Stelle daran suchen (`pickSpot`) → hinlaufen oder hinfliegen und über `game.project()` darauf zielen → in Reichweite abwechselnd schnell und stark angreifen → alle 5 bis 11 Sekunden den Angriff wechseln → bei Stillstand springen, dann anderes Ziel.
- **Weltwechsel:** 7 Sekunden nach 100 % oder nach 12 Minuten in derselben Welt (`worldTime`), reihum durch `WORLDS`; die Heimatwelt einer Figur bringt diese Figur mit (`Game.setSpecies(id, false)`). Übernimmt der Spieler, kehrt `Game.setIdle(false)` zu seiner eigenen Figur und Welt zurück.
- **Ein und aus:** `game.setIdle(on)`; Knopf 🍿, Taste I, Adresse `?idle=1`, optional automatisch nach 2 Minuten ohne Eingabe (Einstellungen). Jede echte Eingabe schaltet ab (`input.onActivity`).
- **Zufall:** Der Autopilot zieht seine Entscheidungen aus einem eigenen Generator (`makeRng`, Startwert `?seed=` oder zufällig; `game.autopilot.seed`), getrennt von `game.rng`. Mit gleichem Startwert läuft eine Vorführung gleich ab.
- **Erweitern:** neue Angriffe mit Fernwirkung in die Liste `RANGED` eintragen, sonst läuft der Autopilot damit bis an das Ziel heran.

### Bekannte Lücken

Bruchstücke stoßen nicht miteinander zusammen · keine Schlagschatten · Autos weichen einander nicht aus · Feuer frisst sich nicht durch Beton- und Glasbauten · Zeitlupe (außer kurz bei schweren Treffern), Zurückspulen und „Welt wehrt sich“ fehlen · Speicherbedarf der Wolkenkratzer-Stadt rund 190 MB · Balance, Ton und Animationen sind nicht von Menschen abgenommen.

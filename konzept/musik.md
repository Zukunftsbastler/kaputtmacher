# Kaputtmacher – Musik

Anhang zu [KONZEPT.md](../KONZEPT.md): die Musik je Welt, ihre Zustände und Schichten, und wie sie im Browser entsteht. Die Abschnittsnummern sind die des Konzepts, Verweise wie „(11.4)“ meinen dessen Abschnitte und die übrigen Anhänge.

### 13a Musik

Musik, die der Handlung folgt, vollständig im Browser komponiert und gerendert; es gibt weiterhin keine Audiodateien und keine Netzwerkzugriffe. Seit dem Nachtrag 2 zu Entwurf 12 erzeugt sie die eigene **Musik-Generator-Suite** des Autors (`public/src/vendor/musik-generator/`, MIT, ohne fremden Code).

**Charakter:** beschwingt, zackig, aufgekratzt und augenzwinkernd – fröhliche, antreibende 16-Bit-Musik, wie man sie vom SNES kennt: flinkes Puls-Lead, trockener, präziser Synth-Bass, schnelle Chip-Arpeggios, kurze Akkord-Stabs, knackiges Schlagzeug, kaum Hall. Stil „Arcade“ der Suite, Dur.

**Ein Stück je Welt (Nachtrag 13).** Neben dem ersten Stück („Kaputtmacher“, jetzt in der Wolkenkratzer-Stadt und der Würfelwelt) hat jede Welt ein eigenes (`TRACKS` in `music-score.js`): eigener Ohrwurm, eigene Tonart und Tonleiter, eigene Tempi, eigener Stil der Suite und ein eigener Startwert, der die Besetzung wählt. Die meisten bleiben bei Arcade und Chiptune; wo es zur Welt passt, weicht ein Stück bewusst ab: Synthwave für die Neon-Nacht, Marsch mit Streicher-Pizzicato, Trommeln und Synth-Lead für die Festung, ein Rollenspiel-Orchester (Hörner, Harfe, Pauken, Chor) für die Ritterburg, ein Jig im 6/8-Takt mit Fiddle, Flöte und Bodhrán für Dorf und Hafen. Die Besetzung der Stücke mit Abwahl („variety“) ist so gewählt, dass sie in allen drei Zuständen gleich bleibt (ein gemeinsamer Startwert); die Startwerte wurden nach der Besetzung ausgesucht, die sie ergeben (`node tools/music.mjs` listet sie).

| Welt | Stück | Stil, Tonart | Tempo (Bummeln/Verfolgung/Chaos) | Ohrwurm, Besetzung |
|---|---|---|---|---|
| 🌆 Wolkenkratzer-Stadt, 🎲 Würfelwelt | Kaputtmacher | Arcade, D-Dur | 120/138/152 | das erste Stück |
| 🦕 Urzeit | Dschungelfieber | Arcade, A mixolydisch | 116/130/144 | synkopiert und federnd; Glockenspiel-Melodie, Marimba-Arpeggio |
| 🏛️ Babel | Turmbau | Arcade, E phrygisch | 112/126/140 | eine Figur, die sich um den Grundton windet, mit dem Halbton darüber; Sägezahn-Lead über Marimba |
| 🌃 Neon-Megacity | Neonnacht | Synthwave, Fis dorisch | 112/124/136 | lange, gleitende Töne; Streicherflächen, Sägezahn, Electro-Schlagzeug |
| 🏰 Festung Titan | Sturm auf Titan | Action, d-Moll | 134/146/158 | punktierter Marsch; Pizzicato, Ladder-Bass, Hybrid-Trommeln |
| ☁️ Wolkenwerft | Über den Wolken | Arcade, G lydisch | 126/140/154 | weite Sprünge nach oben, mehr Raum |
| 🚧 Großbaustelle | Baustellen-Boogie | Chiptune, C mixolydisch | 132/144/156 | gehämmerte Tonwiederholungen |
| 🧱 Bauklotz-Zimmer | Bauklotz-Polka | Chiptune, F-Dur | 138/150/162 | flink und spielzeughaft |
| 🏘️ Dorf | Dorftanz | Folk (6/8), G mixolydisch | 150/162/174 | Fiddle, Tin Whistle, Harfe, Bodhrán |
| 🎡 Vergnügungspark | Jahrmarkt | Arcade, C-Dur | 128/142/156 | hüpfend; Glockenspiel, Marimba, E-Piano |
| 🏙️ Stadt | Rushhour | Arcade, B-Dur | 128/140/152 | dreht sich um den Grundton wie Verkehr um einen Platz; E-Piano, Electro-Schlagzeug |
| 🏭 Fabrik | Fließband | Chiptune, e-Moll | 136/148/160 | Oktavsprünge wie eine Maschine |
| 🏰 Burg und Dorf | Ritterturnier | Fantasy, D-Dur | 116/128/140 | Heldenfanfare; Hörner, Streicher, Harfe, Pauken, in der Verfolgung Chor und Flöte |
| ⛄ Winterwelt | Schneegestöber | Arcade, F lydisch | 124/138/150 | glitzernde Läufe; Glockenspiel |
| 🛫 Flughafen | Startfreigabe | Arcade, A-Dur | 130/142/154 | eine Tonleiter, die zur Sexte abhebt |
| ⚓ Hafen | Leinen los | Folk (6/8), D dorisch | 156/168/180 | Seemannslied als Jig |
| 🗿 Riesenbauten | Riesenschritte | Arcade, C mixolydisch | 110/124/138 | große, langsame Schritte; Sub-Bass, viel Wucht |
| 🐠 Unter dem Meer | Tiefseeperlen | Arcade, A dorisch | 118/130/142 | perlende Läufe auf und ab, viel Raum |
| 🚀 Raumhafen | Countdown | Chiptune, Es lydisch | 140/152/164 | ein Countdown-Arpeggio hinab, dann hinauf ins All |

Im Chaos spielt jedes Stück einen Ganzton höher, wie das erste.

**Wechsel:** Wird eine Welt geladen, deren Stück nicht schon spielt, blendet das alte in knapp einer Sekunde aus, wird verworfen, und der Worker rendert das neue; nach ein bis drei Sekunden setzt es ein (gemessen). Es ist immer nur ein Stück im Speicher (höchstens 80 MB dekodiert, das Ritterturnier). **Einstellungen:** „Musikstück“ – „Passend zur Welt“ (Voreinstellung) oder eines der 19 Stücke für alle Welten; die Wahl wird gespeichert.

**Der Ohrwurm** ist vorgegeben (`music-score.js`): ein schneller Lauf über den Dreiklang hinauf zur Oktave, ein synkopierter Schritt zurück, Landung auf der Quinte. Die Suite entwickelt daraus Frage und Antwort (das Motiv, eine Stufe höher wiederholt, Halbschluss, Rückkehr, Ganzschluss) und komponiert Akkorde, Bass, Arpeggio und Schlagzeug dazu.

**Drei Zustände, jeder schneller als der vorige:**

| Zustand | Wann | Musik |
|---|---|---|
| Bummeln | Alarmstufe unter 1 | 120 Schläge pro Minute, D-Dur, 8 Takte. Leise und leichtfüßig |
| Verfolgung | ab dem ersten Stern (Polizei) | 138 Schläge, D-Dur, 16 Takte (A und B), die ganze Band |
| Chaos | ab drei Sternen (Feuerwehr, Hubschrauber, Militär) | 152 Schläge, einen Ganzton höher in E-Dur, 16 Takte, dichter und wuchtiger |

**Was sich im Spiel ändert:**

| Auslöser | Wirkung |
|---|---|
| Erster Tastendruck oder Klick | Die Musik beginnt sanft: nur Akkorde, Arpeggio und Bass, über 2,5 Sekunden eingeblendet |
| Etwas geht kaputt (Zustand Bummeln) | Das Schlagzeug blendet ein, bei anhaltender Zerstörung auch die Melodie; in der Ruhe verschwinden beide wieder |
| Alarmstufe erreicht 1 bzw. 3 | Wechsel zum nächsten Zustand auf dem nächsten Takt, über eine eintaktige Überleitung mit anziehendem Tempo, Trommelwirbel und Riser |
| Alarmstufe ebbt ab (unter 0,6 bzw. 2,5) | Wechsel zurück am Ende einer Viertakt-Phrase, mit Überblendung |
| Schnelle Wechsel | Mindestens 8 Sekunden je Zustand; die letzte Anforderung gewinnt, es flattert nichts |
| Mehr los, etwas bricht | etwas lauter, kurzes Anschwellen |
| Unter Wasser | alles klingt dumpf |
| Menü offen | die Musik tritt zurück |

**Technik:**
- Beim Laden komponiert ein Web Worker die Beschreibung aus `music-score.js` und rendert sie mit 32 kHz in Schleifen aus vier Schichten (Grundierung, Bass, Schlagzeug, Melodie). Der erste Zustand ist nach ein bis zwei Sekunden fertig, alles nach etwa sieben (gemessen auf einem MacBook M3).
- Der Stem-Player der Suite spielt sie taktgenau auf der Uhr des Audiosystems. Dekodiert belegt die Musik etwa 62 MB.
- Dafür ist die Content-Security-Policy an genau einer Stelle geöffnet: `worker-src 'self'` und eine Trusted-Types-Policy `kaputtmacher-music`, die ausschließlich die Adresse dieses einen Workers liefern kann (12.2).
- **Rückfall:** Kann der Worker nicht starten, spielt die handgeschriebene Electro-Swing-Musik der früheren Fassungen (`music-classic.js`), wie bisher mit eigener Tonart je Welt.
- Ein Stück je Welt heißt eine eigene Renderung je Welt: deshalb wird beim Weltwechsel neu gerendert statt alles vorab.
- `node tools/vendor-music.mjs` kopiert die benötigten Dateien aus der Suite neu ein.

Eigener Lautstärkeregler in den Einstellungen (0 = aus). **Stand von Nachtrag 13:** Alle 19 Stücke lassen sich komponieren (geprüft in `tools/check.mjs`: drei Zustände, steigendes Tempo, höchstens 90 MB, kein Ohrwurm doppelt, jede Welt hat ein Stück); im Browser setzt nach einem Weltwechsel das neue Stück ein, die Wahl in den Einstellungen greift sofort, und „Passend zur Welt“ kehrt zurück. **Nicht beurteilt:** wie die neuen Stücke klingen (keines ist von jemandem angehört worden), ob sie fröhlich und SNES-artig genug sind, ob die Abweichungen (Folk, Fantasy, Action, Synthwave) passen. **Stand davor:** Gemessen im Browser unter der Policy von Netlify: Worker und Policy greifen, die Musik startet, beim Einstieg sind Schlagzeug und Melodie stumm, die Wechsel in die schnelleren Zustände laufen ohne Skriptfehler. **Nicht beurteilt:** wie sie klingt, ob der Ohrwurm trägt, ob die Lautstärke zu den Geräuschen passt, das Verhalten auf Handy und Tablet (Renderzeit, Speicher).

**Oberfläche:** unten Werkzeugleiste, rechts unten Springen und Brüllen, oben Welt-Zähler mit den Sternen der Alarmstufe, links oben Macht-Ring mit Stufe und darunter die Einblendungen der Erfolge, rechts oben Weltauswahl, Selbstspiel, Karte und Einstellungen, links unten die Minimap.

**Minimap** (`minimap.js`): ein rundes Fenster auf die Umgebung, damit man trotz des engen Blickfelds den Überblick behält. Sie dreht sich mit der Kamera – oben ist, wohin man schaut –, in der Mitte zeigt ein weißer Pfeil die Figur und ihre Blickrichtung. Der Boden erscheint in seinen gedämpften Farben (Straßen, Wiese, Sand, Wasser), Gebäude hell, je höher, desto heller; je mehr von einem Gebäude fehlt, desto orangener wird es, ein abgerissenes ist dunkelrot. Wo etwas zerstört wurde, liegt ein **roter Fleck**, je mehr, desto kräftiger (gezählt je 4 × 4 Würfel). Darüber Punkte für Feuer (flackernd orange), Polizei (blinkend), Feuerwehr, Hubschrauber und Autos. Der Ausschnitt wächst mit der Figur: mindestens 150 Würfel in jede Richtung, 8 Körperhöhen plus 120 bei großen Figuren, höchstens die halbe Welt. Am Rechner unten links (184 Pixel), auf Handy und kleinen Fenstern klein oben rechts unter dem Menüknopf (96 Pixel). **Ein- und ausblenden:** Knopf 🗺️ oben rechts (auf dem Handy im Menü), Taste **M** oder in den Einstellungen; die Wahl wird gespeichert. Das Bild wird gut sechsmal pro Sekunde neu gezeichnet. Die Liste der Erfolge liegt nicht mehr im Spielfeld, sondern als Pokal in der Weltauswahl und als Knopf in den Einstellungen.

**Einstellungen** (Zahnrad, ein gewöhnlicher Knopf; neben dem Impressum-Link der einzige Ort mit Text): Lautstärke, Musik, Musikstück, Grafik-Regler (12.4), Staub und Rauch, Feuerausbreitung, Einsatzkräfte, Kamerawackeln, Bewohner und Verkehr, Kettenreaktionen, Militär stößt zurück, Selbstspiel nach 2 Minuten, Minimap, alles freischalten, Vollbild, freie Flugkamera – und **„Von vorn beginnen“**. Früher öffnete sich das Zahnrad erst nach drei Sekunden Halten und war blass dargestellt; das wirkte wie abgeschaltet und ließ sich nicht entdecken.

**Spielprotokoll.** In den Einstellungen steht aufklappbar, wie lange jede Stufe jeder Figur gedauert hat (die letzten 60 Einträge, Selbstspiel gekennzeichnet). Es ist das Werkzeug, um die Schwellen aus 5.3 an echtem Spiel auszurichten.

**Spielstand als Datei.** „Spielstand als Datei sichern“ lädt den Stand als JSON-Datei herunter, „aus Datei laden“ liest eine solche Datei ein – etwa für den Umzug auf ein anderes Gerät. Eine geladene Datei durchläuft dieselben Prüfungen wie gespeicherte Daten (12.2); was sie nicht besteht, wird verworfen. Der Stand trägt eine Versionsnummer.

**Pause im Hintergrund.** Ist die Seite verborgen (anderer Tab, Bildschirm aus), verstummt aller Ton und die Simulation steht; die verlorene Zeit wird nicht nachgeholt.

**Sanduhr.** Beim Wechsel der Welt erscheint eine Sanduhr, bevor die Seite für den Aufbau kurz stillsteht.

**Von vorn beginnen.** Auf jedem Gerät lässt sich die Progression neu starten: Der Knopf löscht Stufen und Macht aller Figuren, abgeschlossene Welten, Sticker, Erfolge und Einstellungen auf diesem Gerät, und das Spiel beginnt wieder bei Stufe 1. Er verlangt zwei Schritte („Von vorn beginnen …“, dann „Ja, alles löschen“) und steht zusätzlich auf der Seite „Impressum & Datenschutz“.

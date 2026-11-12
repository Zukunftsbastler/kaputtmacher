# Kaputtmacher – Refactoring-Konzept

Stand: 12. November 2026, nach Nachtrag 18 (Commit `7b912a6`). Dieses Dokument sagt, was am Spiel als Nächstes verbessert werden sollte, technisch und spielerisch, und in welcher Reihenfolge. Es greift die Liste in KONZEPT.md, Abschnitt 14, auf und ordnet sie nach Messungen neu. Was davon umgesetzt ist, steht im folgenden Abschnitt; der Rest des Dokuments ist die Sichtung, wie sie war.

## Umsetzungsstand (12. November 2026)

Der Autor hat die Pakete 0, 1, 3, 4, 6, 7 und 8 freigegeben; Paket 2 hat untergeordnete Priorität, weil die Checkliste von Hand zu einem großen Teil zufriedenstellend war. Aus dem Spieltest kam hinzu: Dass man Figur und Welt wechseln kann, geht unter (Teil von Paket 5).

| Paket | Stand |
|---|---|
| 0 Sicherheitsnetz | **umgesetzt:** Szenarien `perf`, `hash`, `still`, `soak`; Messanzeige `?perf=1`; fehlerfeste Hauptschleife (`Game.fault`); Kamerawackeln nur noch im Bild (`cam.drawVp`), Autopilot mit eigenem Zufall (`?seed=`). Der Vergleichslauf ist reproduzierbar, auch mit dem Autopiloten |
| 1 Vernetzen in Workern | **umgesetzt** (`meshing.js`, `mesh-worker.js`). Neon-Megacity: Rechenzeit pro Bild 5,2 statt 14,2 ms, Bilder über 25 ms 0,1 statt 13 %; Wolkenkratzer-Stadt 3,7 statt 6,3 ms, keine Bilder über 25 ms mehr |
| 2 Spielen, Stellgrößen, Balance | **zurückgestellt** (auf Wunsch des Autors) |
| 3 Idle als Dauerläufer | **umgesetzt:** alte Welt wird vor der neuen freigegeben; `tools/soak.mjs`; dazu wechselt der Idle-Modus mit den Heimatwelten die Figur und kehrt beim Übernehmen zur eigenen zurück; lange Kletterpartien bricht er ab. Ein Dauerlauf über 40 Minuten durch 17 Welten bestand: kein Fehler, nie eine Minute ohne Zerstörung, Speicher je Welt gleichbleibend (keine stetige Zunahme), schlechtestes Bild 21 ms. **Offen:** eine Regie mit mehreren Kameraeinstellungen; ein zweistündiger Lauf auf dem Vorlesungsrechner |
| 4 Ruckler bei Einstürzen | **umgesetzt:** Standfestigkeit schlanker Bauten (`frail.js`) und Haltprüfung schneller bei nachweislich gleichem Ergebnis; große Bruchstücke im Worker vernetzt, ohne zu blinken; kleine Gruppen werden über der Grenze von 36 Bruchstücken gleich zu Schutt. Die Haltprüfung bleibt bewusst nach Würfeln statt nach Zeit begrenzt, sonst wäre die Simulation nicht mehr reproduzierbar. **Offen:** einzelne Spitzen von rund 30 ms, wenn 36 große Bruchstücke zugleich aufschlagen (Zerstörungskugeln an Bruchstücken und Figur) |
| 5 Einstieg für das Kind | **teilweise:** Die Figuren- und Weltwahl wird vorgeführt, das Gesicht im Ring öffnet sie, die Figuren stehen oben, eine Karte zeigt nach jedem Weltwechsel Figur ➜ Welt. **Offen** (Entscheidungen des Autors): Figuren nach und nach freigeben, Weltauswahl in zwei Ebenen, nachsichtiger Stampfer |
| 6 Code-Struktur | **umgesetzt:** `main.js` (1 332 → rund 720 Zeilen, jetzt mit dem Welt-Worker), `tools.js` (1 624 → rund 400) und `monster.js` (1 218 → rund 450) in Themendateien geteilt, Angriffe je Figur in `moves/`, Figuren beschrieben statt abgefragt (`SPECIES`), Testszenarien nach Themen, `jsconfig.json`. Jeder Schritt mit gleicher Prüfsumme für alle acht Figuren gegen den alten Stand belegt. **Nicht gemacht:** lange Zeilen umbrechen (Entscheidung des Autors steht aus); Typprüfung bleibt aus, weil die Klassen über `mixin()` aus mehreren Dateien entstehen, was ein Prüfer nicht verfolgen kann |
| 7 Speicher und Ladezeit | **umgesetzt:** kompaktes Flächenformat (Grafikspeicher rund ein Drittel), Welterzeugung beim Reisen im Worker, automatische Grafikwahl geht auf langsamen Geräten einmal herunter. **Nicht gelungen:** `World.finalize` schneller zu machen (die Zeit steckt im Durchlaufen aller Würfel, nicht in den Abfragen; der Versuch brachte 4 % und wurde zurückgenommen). **Zurückgestellt:** Lauflängen-Kodierung |
| 8 Dokumentation | **umgesetzt:** KONZEPT.md von 173 auf 67 KB, nur noch Ist-Zustand; Einzelheiten in `konzept/`, Geschichte in VERLAUF.md; `check.mjs` vergleicht Zahlen der Dokumente mit dem Code |

Nebenbei behoben: Beim Klettern übernahm die Figur die Sprungrichtung als Wandrichtung und hing nach einem schrägen Sprung schräg, mit der Schulter im Gebäude; beim seitlichen Klettern geriet sie dann ins Gebäude hinein.

## Das Ergebnis in Kürze

1. **Die Simulation ist nicht das Problem, das Vernetzen ist es.** Das Neuvernetzen der Blöcke läuft im selben Thread wie das Spiel und verbraucht im Selbstspiel 64 bis 70 % der Rechenzeit pro Bild. In der Neon-Megacity dauern deshalb 13 % aller Bilder länger als 25 ms – auf einem schnellen Rechner.
2. **Das größte spielerische Risiko ist, dass das Spiel nie von Hand geprüft wurde.** Die Checkliste in TESTEN.md hat 107 Punkte, keiner ist abgehakt. Ton und Musik hat noch niemand gehört. Alle Stufen-Schwellen stammen aus dem Selbstspiel.
3. **Der Idle-Modus ist der Zweck des Projekts und am wenigsten abgesichert.** Ein einziger Skriptfehler hält das Bild für immer an, und kein Lauf ging bisher über Stunden.
4. **Der Code ist tragfähig, aber drei Dateien sind zu groß geworden** (`tools.js`, `monster.js`, `main.js`: zusammen 261 KB), und KONZEPT.md widerspricht mit 173 KB inzwischen an mehreren Stellen dem Code.

Meine Empfehlung: keine neuen Figuren, Welten oder Angriffe, bis die Pakete 0 bis 4 erledigt sind.

| # | Paket | Wirkung | Aufwand |
|---|---|---|---|
| 0 | Sicherheitsnetz: Messanzeige, fehlerfeste Hauptschleife, Vergleichslauf | Voraussetzung für alles Weitere | klein |
| 1 | Vernetzen in Hintergrund-Threads | Flüssiges Bild in jeder Welt und auf jedem Gerät | mittel |
| 2 | Von Hand spielen, Stellgrößen bündeln, Balance nachziehen | Ob das Spiel sich gut anfühlt | mittel, davon ein Teil nur durch Menschen |
| 3 | Idle-Modus als Dauerläufer | Der Hintergrundbetrieb, für den das Spiel gedacht ist | klein bis mittel |
| 4 | Ruckler bei großen Einstürzen | Der Moment, auf den das Spiel hinarbeitet | mittel |
| 5 | Einstieg und Oberfläche für das Kind | „Eins nach dem anderen“ einlösen | klein bis mittel |
| 6 | Code-Struktur: große Dateien teilen, Figuren beschreiben statt abfragen | Weiterarbeit bleibt möglich | mittel bis groß |
| 7 | Speicher und Ladezeit | Schwächere Geräte, Weltwechsel | mittel |
| 8 | Dokumentation entschlacken | Spezifikation stimmt wieder mit dem Code überein | klein bis mittel |

## Wie gesichtet und gemessen wurde

Gelesen: alle zentralen Module (`main.js`, `world.js`, `mesher.js`, `renderer.js`, `destruction.js`, `bodies.js`, `particles.js`, `progress.js`), die übrigen im Überblick, dazu README, KONZEPT, TESTEN und die Prüfwerkzeuge.

Gemessen auf dem Entwicklungsrechner (Apple M3 Pro, Brave ohne Fenster, 1280 × 720):

- Welterzeugung, Speicher und Vernetzen aller 20 Welten in Node.
- Bildzeiten im Selbstspiel, je 25 bis 30 Sekunden, mit einem Aufsatz, der jedes System einzeln stoppt.

**Nicht gemessen:** schwächere Rechner, Handys, die Zeit der Grafikkarte (die Bildfolge blieb im Mittel bei 16,7 ms, sie war also nicht der Engpass), Läufe über mehr als eine halbe Minute. Auf einem langsameren Gerät sind alle Zeiten um ein Mehrfaches höher; die Reihenfolge der Engpässe dürfte dieselbe bleiben, belegt ist das nicht. Der Mess-Aufsatz liegt noch nicht im Projekt; Paket 0 übernimmt ihn.

### Rechenzeit pro Bild im Selbstspiel

| | Wolkenkratzer-Stadt, Detail 4 | Neon-Megacity, Detail 4 | Stadt, Detail 2, Handy-Format |
|---|---|---|---|
| Rechenzeit pro Bild, Mittel | 6,3 ms | 14,2 ms | 4,1 ms |
| davon Neuvernetzen | 4,0 ms (64 %) | 9,8 ms (69 %) | 2,8 ms (70 %) |
| davon Simulation (`step`) | 0,9 ms | 1,9 ms | 0,5 ms |
| davon Zeichnen (nur Befehle absetzen) | 1,1 ms | 2,1 ms | 0,5 ms |
| Bilder über 25 ms Rechenzeit | 46 von 1 454 | 170 von 1 293 | 1 von 1 488 |
| längstes Bild | 65 ms | 65 ms | 46 ms |
| gezeichnete Blöcke pro Bild | 1 568 | 1 740 | 367 |
| Flächen im Grafikspeicher | 3,8 Mio. | 3,7 Mio. | 0,7 Mio. |
| JavaScript-Speicher laut Browser | 320–350 MB | 300–360 MB | 85–115 MB |

Ob der Browser die Würfel-Puffer in dieser Speicherzahl vollständig mitzählt, habe ich nicht geprüft; die Netze im Grafikspeicher zählt er nicht mit.

### Welterzeugung (Detail 4, Planeten mit 1 024 Würfeln Kantenlänge, also 512 m)

| Welt | Erzeugen | `finalize` | Würfel-Speicher | Flächen im Sichtkreis | Scheitelpunkt-Daten |
|---|---|---|---|---|---|
| Wolkenkratzer-Stadt | 1,2 s | 1,8 s | 191 MB | 3,6 Mio. | 171 MB |
| Neon-Megacity | 1,3 s | 1,7 s | 193 MB | 3,4 Mio. | 164 MB |
| Riesenbauten | 1,0 s | 1,2 s | 129 MB | 0,5 Mio. | 25 MB |
| Stadt | 0,8 s | 0,9 s | 97 MB | 1,3 Mio. | 63 MB |
| die übrigen Planeten | 0,5–1,0 s | 0,3–0,9 s | 48–111 MB | 0,1–0,4 Mio. | 5–18 MB |

Ein Block wird in 0,45 bis 0,68 ms vernetzt. Der Sichtkreis der Wolkenkratzer-Stadt braucht beim Start 1,5 Sekunden reine Vernetzungszeit.

---

## Paket 0: Sicherheitsnetz

Klein, aber zuerst. Alle folgenden Pakete brauchen einen Beleg, dass sie wirken und nichts zerbrechen.

**0.1 Messanzeige.** Den Mess-Aufsatz als Szenario `perf` nach `tools/web/` übernehmen: Rechenzeit je System, Bilder über 25 ms mit Aufschlüsselung, offene Blöcke im Sichtkreis, Speicher. `tools/smoke.mjs` bekommt drei Läufe mit Obergrenzen (die Werte der Tabelle oben plus 30 %), damit ein Rückschritt auffällt. Dazu `?perf=1` als kleine Anzeige im Spiel, für Messungen auf dem Handy, wo es keine Konsole gibt.

**0.2 Fehlerfeste Hauptschleife.** `Game.frame` ([main.js:1073](public/src/main.js#L1073)) fordert das nächste Bild erst in seiner letzten Zeile an. Wirft irgendein System einen Fehler, kommt kein Bild mehr, und das Spiel steht bis zum Neuladen. Maßnahme: den Rumpf abfangen, das nächste Bild immer anfordern, den Fehler in `game.lastError` ablegen; nach drei Fehlern in zehn Sekunden die Welt neu laden (im Idle-Modus die nächste). Dem Kind wird nichts angezeigt.

**0.3 Vergleichslauf.** Die Simulation ist auf Wiederholbarkeit angelegt (feste Schritte, `game.rng`), es prüft aber nichts, ob sie wiederholbar ist. Ein Szenario `hash` soll mit festem Startwert 3 000 Schritte von Hand weiterschalten und eine Prüfsumme über Würfel, Figur und Bruchstücke ausgeben. Gleiche Prüfsumme vor und nach einem Umbau heißt: Verhalten unverändert. Dafür zwei Korrekturen:

- Das Kamerawackeln benutzt `Math.random` ([main.js:1003](public/src/main.js#L1003)) und verschiebt das Auge, von dem der Zielstrahl ausgeht (`pick`). Über das Ziel wirkt es in die Simulation hinein. Der Zielstrahl muss von der unverwackelten Kamera ausgehen.
- Der Autopilot braucht einen eigenen Zufallsgenerator mit Startwert statt `Math.random` ([autopilot.js:33](public/src/autopilot.js#L33)).

**Abnahme:** Zwei Läufe mit gleichem Startwert liefern dieselbe Prüfsumme. Ein absichtlich eingebauter Fehler lässt das Bild nicht stehen.

## Paket 1: Vernetzen in Hintergrund-Threads

**Befund.** `Game.remesh` ([main.js:1126](public/src/main.js#L1126)) vernetzt im Haupt-Thread, bis ein Zeitbudget verbraucht ist: 7 ms, und 30 ms, sobald mehr als 150 Blöcke warten ([main.js:1145](public/src/main.js#L1145)). Die zweite Regel erzeugt die langen Bilder: Fast alle Bilder über 25 ms bestehen aus 30 bis 31 ms Vernetzen. Der Bedarf entsteht weniger durch Zerstörung als durch Bewegung. Der Sichtkreis hat bei Detail 4 einen Radius von 400 Würfeln; läuft die Figur 32 Würfel weit, kommen am Rand rund 80 Blocksäulen mit bis zu 16 Lagen neu ins Bild. Bei 0,5 ms je Block schafft das Budget etwa 14 Blöcke pro Bild. Im Selbstspiel in der Neon-Megacity waren am Ende der Messung noch 78 Blöcke im Sichtkreis offen. Dazu kommt, dass Netze 70 Würfel hinter dem Sichtkreis gelöscht und bei der Rückkehr neu berechnet werden.

Das steht schon als Punkt 3 in KONZEPT 14. Die Messung macht daraus den ersten Punkt.

**Maßnahme.**

1. `mesher.js` ist bereits frei von Browser-Zugriffen und arbeitet auf einer Kopie des Blocks mit Rand (34³ Bytes). Zwei bis vier Worker bekommen diese Kopie und liefern den fertigen Puffer zurück, beides ohne Kopieren (übertragbare Puffer). Der Haupt-Thread lädt nur noch hoch (heute 0,04 ms pro Bild).
2. Jeder Block trägt eine Änderungsnummer; ein Ergebnis, das zu einer älteren Nummer gehört, wird verworfen.
3. Reihenfolge: Blöcke, die durch Zerstörung geändert wurden, vor Blöcken vom Rand des Sichtkreises; innerhalb beider Gruppen die nächsten zuerst.
4. Ein Treffer muss sofort zu sehen sein („Der Treffer wirkt dort, wo er trifft“). Blöcke in unmittelbarer Nähe eines Treffers werden deshalb weiter im Haupt-Thread vernetzt, mit einem kleinen Budget von 3 ms. Alles andere geht an die Worker.
5. Die 30-ms-Regel entfällt.
6. Sicherheits-Header: `worker-src 'self'` ist schon erlaubt. Die Trusted-Types-Liste in `public/_headers` bekommt eine zweite Policy für die Adresse des Vernetzungs-Workers, nach dem Muster von `kaputtmacher-music`. Ohne Worker (Fehler beim Start) bleibt der heutige Weg als Rückfall.

**Abnahme.** Im Szenario `perf`: Neuvernetzen und Hochladen im Haupt-Thread unter 1,5 ms im Mittel; in der Neon-Megacity weniger als 1 % der Bilder über 25 ms; drei Sekunden nach dem Stehenbleiben kein offener Block im Sichtkreis. Ein Schlag hinterlässt sein Loch im selben oder im nächsten Bild.

**Risiko.** Veraltete Ergebnisse und die Reihenfolge der Antworten; Puffer, die unterwegs sind, belegen kurz doppelt Speicher. Beides ist mit der Änderungsnummer und einer Obergrenze für gleichzeitig laufende Aufträge beherrschbar.

**Bewusst nicht in diesem Paket:** das kompaktere Flächenformat (7.1). Es ändert den Shader und sollte einzeln gemessen werden.

## Paket 2: Von Hand spielen, Stellgrößen bündeln, Balance nachziehen

**Befund.**

- TESTEN.md: 107 offene Punkte, kein erledigter. KONZEPT 16 führt über mehrere Seiten auf, was „nicht geprüft“ ist, darunter sämtlicher Ton, die Musik, die Bedienung auf einem echten Handy und das Gefühl jeder Animation in Bewegung.
- Die Stufen-Schwellen ([monster.js:52](public/src/monster.js#L52)) lauten 280, 1 600, 8 500, 25 000, 850 000, 2 800 000, 3 200 000, 5 600 000. Zwischen Stufe 4 und 5 liegt der Faktor 34, zwischen Stufe 6 und 7 der Faktor 1,14. Die Schwellen gleichen aus, dass die Einnahmen springen (Dino im Selbstspiel: 136 pro Sekunde auf Stufe 4, 5 700 auf Stufe 5), statt dass die Einnahmen geglättet wären.
- Zwischen den Figuren liegen auf derselben Stufe große Abstände: auf Stufe 4 Panzer 5 300, Gorilla 95 pro Sekunde (KONZEPT 5.3). Die Regel „Stufe N dauert N Minuten“ begrenzt nur nach oben. Eine langsame Figur braucht länger, und niemand weiß, wie lange ein Kind braucht.
- Die Stellgrößen liegen verstreut: Wachstum in `monster.js` und `main.js`, Grundschaden als Formel in `Tools.base` ([tools.js:651](public/src/tools.js#L651)), die Faktoren jedes Angriffs als namenlose Zahlen in den Aufrufen der `MOVES`-Tabelle, Einsturz-Anteil in `bodies.js`, Alarm in `actors.js`.

**Maßnahme.**

1. **Einmal spielen, bevor irgendetwas geändert wird.** Eine halbe Stunde mit TESTEN.md, am besten mit dem Kind. Das kann keine KI übernehmen. Damit es geschieht, TESTEN.md vorher auf etwa 30 Punkte kürzen, nach Risiko sortiert: die ersten fünf Minuten, Ton, Handy, je Figur ein Punkt.
2. **Spielprotokoll auswerten.** Das Spiel schreibt bereits mit, wie lange jede Stufe gedauert hat (`progress.log`), getrennt nach Mensch und Selbstspiel. Ein Werkzeug `tools/log.mjs` liest einen gesicherten Spielstand und stellt die Dauer je Figur und Stufe der Vorgabe gegenüber.
3. **Eine Datei `tuning.js`** für alle Stellgrößen, nach Gruppen: Wachstum, Bewegung, Schaden, Kettenreaktion, Alarm, Grenzen. Die Faktoren der Angriffe bekommen Namen (`{ radius: 0.75, power: 0.9 }` statt `0.75, 0.9`), damit ein Werkzeug sie auflisten kann.
4. **Regler zum Ausprobieren:** `?tune=1` blendet für die Werte aus `tuning.js` Schieberegler ein, die sofort wirken und sich als Text sichern lassen. Damit lässt sich im Spieltest nachstellen, statt für jeden Versuch eine Datei zu ändern. Wie die anderen Test-Parameter speichert der Modus nichts.
5. **Balance-Matrix.** `tools/balance.mjs` lässt das Szenario `income` für alle acht Figuren auf den Stufen 1 bis 9 laufen und gibt die Tabelle aus. Ziel: Jede Figur liegt auf jeder Stufe zwischen 70 und 130 % der Vorgabe. Abweichungen werden an der Quelle behoben (Schaden und Reichweite je Stufe), danach können die Schwellen einer glatten Kurve folgen.

**Abnahme.** Die gekürzte Checkliste ist einmal abgearbeitet; die Matrix liegt im Zielband; die Dauer der Stufen 1 bis 4 aus mindestens einem von Hand gespielten Protokoll liegt bei 1, 2, 3 und 4 Minuten, je ± 30 %.

## Paket 3: Idle-Modus als Dauerläufer

**Befund.** Der Idle-Modus soll in einer Vorlesung über Stunden im Hintergrund laufen. Geprüft ist er „nur automatisiert und kurz“ (KONZEPT 16). Drei Schwächen: Ein Fehler hält das Bild an (0.2). Ein Lauf, in dem etwas schiefgeht, lässt sich nicht wiederholen, weil der Autopilot würfelt (0.3). Beim Weltwechsel erzeugt `loadWorld` die neue Welt, während die alte noch im Speicher liegt; in der Wolkenkratzer-Stadt sind das kurzzeitig zweimal 190 MB.

**Maßnahme.**

1. 0.2 und 0.3 umsetzen. Der Startwert des Autopiloten steht in der Adresse (`?idle=1&seed=…`) und im Fehlerbericht.
2. Vor dem Erzeugen einer neuen Welt die alte freigeben: Welt, Merker der Haltprüfung, Netze.
3. **Dauerlauf** `tools/soak.mjs`: zwei Stunden Selbstspiel reihum durch alle Welten, alle 30 Sekunden Speicher, Bildzeit, Zahl der Netze, Bruchstücke und Zeitgeber protokollieren. Der Lauf fällt durch, wenn Speicher oder Bildzeit über die Welten hinweg stetig steigen oder die Figur länger als 60 Sekunden nichts zerstört.
4. **Regie**, erst danach: Die Kamera des Idle-Modus atmet heute nur zwischen nah und weit. Ein kleiner Vorrat an Einstellungen (Totale von oben, Blick aus Straßenhöhe am Turm hinauf, Fahrt um ein fallendes Gebäude) mit weichen Übergängen würde dem Zusehen mehr geben als jede neue Welt. Zeitlupe bei großen Einstürzen gibt es schon.

**Abnahme.** Der Dauerlauf besteht. Auf dem Rechner, der in der Vorlesung benutzt wird, läuft eine Stunde ohne Eingriff.

## Paket 4: Ruckler bei großen Einstürzen

**Befund.** Das längste Bild in der Wolkenkratzer-Stadt (65 ms) bestand aus 23 ms Haltprüfung und 32 ms im Zeichnen. Im Zeichnen wird für jedes neue Bruchstück sofort ein Netz gebaut, ohne Budget ([main.js:1246](public/src/main.js#L1246)). In einer anderen Messung entstanden in einem einzigen Schritt 346 Bruchstücke; die Obergrenze von 36 ([bodies.js:9](public/src/bodies.js#L9)) greift erst im nächsten Schritt. In der Neon-Megacity kosteten die Bruchstücke in den langen Bildern 6 bis 8 ms, und die Bewegung der Figur einmal 10 ms.

Der Einsturz ist der Höhepunkt des Spiels. Gerade dort stockt das Bild.

**Maßnahme.**

1. **Netze großer Bruchstücke über die Worker** aus Paket 1. Bis das Netz da ist (ein bis zwei Bilder), bleiben die Würfel im Gitter stehen und werden erst dann herausgelöst. Kleine Bruchstücke (unter etwa 2 000 Würfeln) werden wie bisher sofort vernetzt.
2. **Haltprüfung nach Zeit begrenzen** statt nach 700 000 angefassten Würfeln ([destruction.js:7](public/src/destruction.js#L7)): höchstens 4 ms pro Schritt, der Rest im nächsten. Die innere Schleife rechnet für jeden Würfel den Index mit zwei Divisionen in Koordinaten zurück und sucht bei jedem Merker den Block neu; Koordinaten auf dem Stapel mitführen und den zuletzt benutzten Block merken.
3. **Obergrenze an der Quelle:** Sind in einem Schritt schon 36 Bruchstücke entstanden, werden weitere kleine Gruppen gleich zu losem Schutt.
4. Die 10 ms in `Monster.update` mit der Messanzeige eingrenzen (Verdacht: Bodensuche bei großen Figuren).

**Abnahme.** In 30 Sekunden Selbstspiel in der Wolkenkratzer-Stadt und der Neon-Megacity kein Bild über 33 ms. Der Vergleichslauf darf sich hier ändern, weil Bruchstücke später entstehen; die Szenarien `span`, `floaters` und `frail` müssen weiter bestehen.

## Paket 5: Einstieg und Oberfläche für das Kind

**Befund.** Das Konzept verlangt „Eins nach dem anderen“. Tatsächlich sind von Anfang an acht Figuren wählbar; die Weltauswahl zeigt 20 Welten, die Figuren, die Stufenwahl und den Weltenmischer auf einer Seite; im Bild stehen Ring, Zähler, Sterne, Gebäude-Schild, Karte, Erfolgs-Karten und mehrere Knöpfe. Der Stampfer verlangt einen dritten Tastendruck in einem kurzen Zeitfenster am höchsten Punkt des Sprungs. Die Punkte 2 und 9 in KONZEPT 14 und die offene Frage 2 in KONZEPT 15 sagen dasselbe.

**Vorschläge.** Das sind Entscheidungen des Autors; sie sollten nach dem Spieltest aus Paket 2 fallen, nicht davor.

1. **Figuren kommen einzeln, als Geschenk statt als Sperre.** Beginn mit dem Dino. Erreicht eine Figur Stufe 3 (nach etwa drei Minuten), erscheint die nächste in der Auswahl und wird vorgeführt. „Alles freischalten“ bleibt in den Einstellungen; in bestehenden Spielständen bleiben alle schon gespielten Figuren offen.
2. **Weltauswahl in zwei Ebenen:** groß die Heimatwelt und drei empfohlene Welten, alle anderen hinter einer Kachel. Stufenwahl und Weltenmischer wandern in den Elternbereich.
3. **Weniger im Bild:** Sterne nur bei Alarm, die Karte beim ersten Spiel bis Stufe 3 aus, höchstens eine Erfolgs-Karte zugleich.
4. **Nachsichtiger Stampfer:** Der dritte Tastendruck gilt während des ganzen Fallens. Der goldene Schimmer bleibt als Hinweis.
5. **Ein sicherer erster großer Moment:** Der Startplatz jeder Heimatwelt bekommt in Reichweite etwas, das beim ersten Schlag spektakulär nachgibt.

**Abnahme.** Die Punkte „Die ersten fünf Minuten“ in TESTEN.md, mit Kind.

## Paket 6: Code-Struktur

**Befund.** Die Aufteilung in Module ist gut, die Kommentare erklären das Warum, und die Regeln der README (alles über `world.set`, Zufall nur aus `game.rng`, keine Speicheranforderung im Spielverlauf) werden eingehalten. Gewachsen sind drei Dateien:

- `main.js` (1 332 Zeilen, 73 KB): Die Klasse `Game` ist Schleife, Kamera, Zielstrahl, Weltwechsel, Macht-Haushalt und Zeichnen in einem. Dazu 25 Methoden `on…`, die andere Systeme direkt aufrufen und die mit jeder neuen Figur mehr werden (`onWash`, `onBurrow`, `onUndermine`, `onDive`, `onSurface` kamen mit Hubschrauber und Tentakel).
- `tools.js` (1 624 Zeilen, 103 KB): die Angriffstabellen aller acht Figuren und eine Klasse mit rund 60 Methoden, in der auch der Zustand einzelner Figuren liegt (Seil, Haken, Windhosen, die fünf Tentakel).
- `monster.js` (1 218 Zeilen, 86 KB): Modelle, Farben, Emoticons, Körpersprache, Klettern und vier Bewegungsarten. `Monster.update` allein hat 230 Zeilen ([monster.js:954](public/src/monster.js#L954)).

Dazu: 58 Abfragen der Art `species === '…'` in fünf Dateien, 201 Zeilen mit mehr als 200 Zeichen und `tools/web/test.js` mit 64 KB, je Szenario eine Zeile.

**Maßnahme,** in dieser Reihenfolge. Jeder Schritt ändert kein Verhalten und wird mit dem Vergleichslauf (0.3) und `smoke.mjs` belegt.

1. **`main.js` teilen:** `camera.js` (Kamera, Zielstrahl, Projektion), `economy.js` (Macht, Vorrat, Wachstum, fertige Gebäude, Kettenreaktion), `scene.js` (Neuvernetzen, Zeichnen, Figur, Geist), `feedback.js` (die `on…`-Rezepte aus Ton, Staub und Wackeln). `Game` behält Zustand, Weltwechsel und die Reihenfolge eines Schritts.
2. **`tools.js` teilen:** je Figur eine Datei `moves/<figur>.js` mit Tabelle und Posen; der Kern (`use`, `updateAct`, `blow`, `shock`, Strahlen, Geschosse) bleibt; Seilwinde und Windhosen sowie Tinte und Erwachen ziehen in eigene Dateien.
3. **Figuren beschreiben statt abfragen:** Jeder Eintrag in `SPECIES` nennt seine Eigenschaften: Bewegungsart (`walk`, `plane`, `hover`, `burrow`), Ketten, Geist ja oder nein, Kamerahöhe und -abstand, Blickverhalten beim Angriff. `Monster.update` wird zum Verteiler auf vier Bewegungs-Funktionen. Eine neunte Figur braucht dann einen Eintrag und ihre Dateien, keine Änderung an fünf Stellen.
4. **`monster.js` teilen:** Modelle je Figur, Körpersprache, Klettern, Steuerung.
5. **`tools/web/test.js`** in eine Datei je Themengruppe, mit normal umbrochenen Zeilen. `smoke.mjs` startet mehrere Browser nebeneinander (`CDP_PORT` gibt es schon); aus zehn Minuten werden etwa drei.
6. **Typprüfung ohne Build:** eine `jsconfig.json` mit `checkJs` und JSDoc an den Schnittstellen (`World`, `Body`, Eintrag einer Angriffstabelle). Das läuft nur im Editor, ändert nichts an der Auslieferung und fängt beim Umbau vertauschte Argumente ab. Bei Aufrufen mit 16 Zahlen in Folge (`fx.add`) passiert das leicht.

**Entscheidung des Autors:** ob die langen Zeilen einmalig umbrochen werden. Dafür spricht, dass Änderungen lesbar werden; dagegen, dass die Herkunft jeder Zeile im Verlauf überdeckt wird. Mein Vorschlag: ein eigener Commit ohne inhaltliche Änderung, vor Schritt 1.

**Nicht empfohlen:** Bündler, TypeScript, ein Ereignisbus oder ein Entity-Component-System. Die ersten beiden widersprechen der Regel „kein Build“. Die letzten beiden lösen kein gemessenes Problem; die direkten Aufrufe sind schnell und leicht zu verfolgen.

## Paket 7: Speicher und Ladezeit

**Befund.** Siehe Tabelle oben. KONZEPT 12.3 nennt Erzeugungszeiten von 0,3 bis 0,8 Sekunden, und die Regel „Sofort wieder heil“ (KONZEPT 2) verspricht einen Neuaufbau in unter einer Sekunde. Gemessen sind für Planeten bei Detail 4 heute 0,9 bis 3,0 Sekunden für Erzeugen und `finalize`, in denen die Seite nichts zeichnen kann, dazu bis zu 1,5 Sekunden Vernetzen. Nur das Bauklotz-Zimmer bleibt mit 0,05 Sekunden weit darunter. Die beiden Hochhaus-Welten belegen je rund 190 MB für die Würfel und rund 170 MB für die Netze im Sichtkreis.

**Maßnahme.**

1. **Kompaktes Flächenformat.** Heute belegt jede Fläche vier Scheitelpunkte zu 12 Bytes, also 48 Bytes. Als eine Instanz je Fläche (Lage im Block, Breite, Höhe, Seite, Kantenabdunklung, Würfelart) genügen 8 Bytes; die Farbe kommt aus einer Tabelle im Shader. Für die Wolkenkratzer-Stadt hieße das rund 30 statt 171 MB, bei schnellerem Hochladen. Die Markierung der Nachtfenster, heute ein veränderter Farbwert in `TYPE_RGBA`, wird ein Eintrag dieser Tabelle.
2. **Welterzeugung in einem Worker.** Die Generatoren laufen schon ohne Browser (`check.mjs` benutzt sie in Node). Im Worker bliebe die Seite währenddessen lebendig: bewegte Sanduhr, Musik ohne Aussetzer. Die Blöcke kommen als übertragbare Puffer zurück.
3. **`World.finalize` beschleunigen** ([world.js:157](public/src/world.js#L157)): 0,3 bis 1,8 Sekunden für das Zählen jedes Würfels, mit einer Superstruktur-Abfrage je Würfel. Die Abfrage je Säule statt je Würfel vorbereiten.
4. **Detailstufe selbst finden.** Die Automatik wählt nach Touch und Kernzahl ([main.js:169](public/src/main.js#L169)). Zusätzlich die ersten Sekunden messen und bei schlechter Bildrate einmalig eine Stufe heruntergehen. Die laufende Anpassung nimmt nur Teilchen und Auflösung zurück, nie Sichtkreis oder Weltgröße.
5. **Zurückstellen:** Lauflängen-Kodierung ferner Blöcke (KONZEPT 12.3). Auf Handys sind die Welten halb so breit und brauchen ein Viertel des Speichers. Erst angehen, wenn ein echtes Gerät an der Grenze ist.

**Abnahme.** Weltwechsel ohne stehendes Bild; Netze der Hochhaus-Welten bei Detail 4 unter 40 MB; „Welt neu aufbauen“ auf einem normalen Planeten wieder unter einer Sekunde bis zum ersten Bild.

## Paket 8: Dokumentation entschlacken

**Befund.** KONZEPT.md hat 173 KB, 18 Nachträge und einen Abschnitt 16, der chronologisch anwächst. Widersprüche zum Code:

| Stelle | steht dort | tatsächlich |
|---|---|---|
| KONZEPT 12.1 | „rund 4 500 Zeilen in 17 Modulen“ | 14 700 Zeilen in 38 Modulen |
| KONZEPT 5.4 | „Alle sechs Figuren sind von Anfang an wählbar“ | acht |
| KONZEPT 2 und 12.3 | Neuaufbau „in unter einer Sekunde“, Erzeugung in 0,3–0,4 s | 0,9 bis 3,0 s auf Planeten |
| KONZEPT 16, Überschrift | „Entwurf 11“ | Entwurf 12, Nachtrag 18 |
| README, Modultabelle | „131 Erfolge“, „37 ES-Module“ | 143, 38 |
| README, Bekannte Lücken | „kein fahrender Verkehr“ | `traffic.js` gibt es seit Entwurf 11 |

Wer am Code arbeitet, muss die Spezifikation jedes Mal ganz lesen. Für eine KI sind das rund 60 000 Token, bevor die erste Zeile Code gelesen ist.

**Maßnahme.** KONZEPT.md beschreibt nur noch den Ist-Zustand (Ziel: unter 60 KB). Die Geschichte steht in VERLAUF.md, was ungeprüft ist, als eine Tabelle in TESTEN.md. Zahlen, die im Code stehen, prüft `check.mjs` gegen README und KONZEPT (Zahl der Erfolge, Module, Welten, die Tabelle der Detailstufen) und meldet Abweichungen. Weil KONZEPT.md die Spezifikation ist, braucht dieser Umbau die Zustimmung des Autors zum neuen Aufbau, bevor Text gestrichen wird.

---

## Was bewusst nicht vorgeschlagen wird

- **Weniger Zeichenaufrufe.** Das Zeichnen kostet 1 bis 2 ms für 1 500 bis 1 700 Blöcke; auf diesem Rechner ist das kein Engpass. Auf einem Handy neu messen (0.1), dann entscheiden.
- **Die Simulation umschreiben.** Ein Schritt kostet 0,5 bis 1,9 ms. Bruchstücke, Schutt, Feuer und Verkehr sind sparsam gebaut.
- **Schlagschatten, Bruchstücke, die einander stoßen, Zurückspulen, App zum Installieren, weitere Welten** (KONZEPT 14, Punkte 5, 8, 11, 12). Jeder dieser Punkte ist reizvoll; keiner behebt etwas, das heute stört oder ungeprüft ist.

## Reihenfolge

Paket 0 zuerst, es ist in einer Sitzung zu schaffen. Danach laufen zwei Stränge nebeneinander, weil der eine einen Menschen braucht und der andere nicht: Paket 1, 3 und 4 (Technik) und Paket 2 (Spielen). Paket 5 folgt auf den Spieltest. Paket 6 lässt sich in Scheiben zwischen die anderen legen; Schritt 1 und 2 daraus lohnen vor jeder neuen Figur. Paket 7 und 8 haben Zeit, bis ein schwächeres Gerät oder der nächste größere Nachtrag sie nötig macht.

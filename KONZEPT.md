# Kaputtmacher – Spielkonzept (Entwurf 10)

Status: in Umsetzung. Dieser Entwurf nennt überall konkrete Zahlen; sie entsprechen dem Stand im Code. Was fehlt oder abweicht, steht in Abschnitt 16.

**Nachtrag zu Entwurf 10:** Sprung mit Richtung trägt von Dach zu Dach, der Panzer hüpft nur noch (4.2); die Alarmstufe steigt und fällt mit der Zeit, die Polizei fährt ruhiger, stellt sich kleinen Kaputtmachern in den Weg und hält von großen Abstand (8.1).

**Neu gegenüber Entwurf 9:** 117 Erfolge mit Einblendung (18), eigene Progression je Figur (5.4), deutlich sichtbare Macht-Kugeln (5.1), Flieger mit drehbarem Anbauteil statt drehendem Rumpf (9.2), Polizei, Feuerwehr, Reporter und Militär (8), Feuer mit Flammpunkten, Ruß und Löschen (11.7), Grafik-Regler und abschaltbare Effekte (12.4).

**Neu in Entwurf 9 war:** großes Sichtfenster um die Figur (4.3), gleichmäßigere Progression (5.1, 5.3), Wucht fallender Gebäude nach Masse (11.6a), Staubwolken (11.7), Reaktionen der Welt wie Hydranten-Fontänen (11.7a).

**Neu in Entwurf 8 war:** Doppelsprung mit Salto (4.2), Idle-Modus (17), Impressum und Datenschutzerklärung (12.2).

**Neu in Entwurf 7 war:** der Flieger als fünfte Figur (9.2), lose Trümmer räumen sich selbst weg (11.8), geplanter Idle-Modus und der Hintergrund des Projekts (14, README), Entwicklungsserver ohne Cache (16).

**Neu in Entwurf 6 war:** vier Figuren mit völlig verschiedenen Angriffen, jeder in einer schnellen und einer langsamen, starken Fassung (9), Gelenkmodelle und ausgearbeitete Animationen (9.3), Gebäude geben je nach Material früher nach (11.4), Schubsen im Sprint (11.5), Kettenreaktionen als Upgrade (11.6), Hubschrauber (8).

**Neu in Entwurf 5 war:** Schlag mit Ausholen, Sprung wie in einem Jump-and-Run, die Wolkenkratzer-Stadt als Hauptszenario, Einsturzgeräusche je Vorgang, Feuer und Rauch.

**Neu in Entwurf 4 war:** höher fliegende Trümmer, Wolkenkratzer bis 230 m, Kamera blickt bei kleinem Monster an den Fassaden hoch, zusammengefasste Flächen und sparsamere Haltprüfung.

**Neu in Entwurf 3 war:** größere Welten und drei zusätzliche Welttypen, freie Weltauswahl, hohe Schwerkraft und hoher Sprung, sichtbarer Ausschnitt statt ganzer Welt im Grafikspeicher, Zahlen für Stufen, Materialien und Werkzeuge, Feiern bei jedem Viertel.

---

## 1. Die Idee in einem Satz

Du bist ein Monster in einer liebevoll gebauten Voxel-Welt, und alles, was du siehst, kannst du kaputt machen. Je mehr du zerstörst, desto größer und mächtiger wirst du – bis du über einen ganzen Planeten stapfst. Es gibt kein Verlieren, keine Zeit, keinen Zwang.

## 2. Für wen und was daraus folgt

Zielspieler ist ein 5-jähriges Kind, das baut, um zu zerstören.

| Regel | Bedeutung im Spiel |
|---|---|
| Sprachfrei | Kein Text im Spiel. Nur Bilder, Animationen, Ziffern. |
| Zeigen statt erklären | Jede Interaktion wird einmal vorgemacht (Abschnitt 10). |
| Eins nach dem anderen | Am Anfang gibt es genau eine Fähigkeit. Alles Weitere kommt einzeln dazu. |
| Kein Scheitern | Kein Lebensbalken, kein Game Over, kein Timer. Macht geht nie verloren. |
| Freie Wahl | Jede Welt ist von Anfang an wählbar; das Spiel empfiehlt, zwingt aber nicht. |
| Sofort wieder heil | Ein Knopf baut die Welt in unter einer Sekunde neu auf. |
| Je echter, desto besser | Detaillierte, glaubwürdige Bauten: Fenster, Dachziegel, Möbel, Rohre. |
| Kindgerecht | Kein Blut, kein Sterben. Bewohner fliehen und purzeln, kommen aber nie zu Schaden. |
| Sicher | Keine Werbung, keine Links nach außen, kein Konto, kein Netzwerkverkehr nach dem Laden. |
| Jeder Treffer zählt | Auch ein ungezielter Klick löst etwas Sichtbares und Hörbares aus. |

## 3. Spielgefühl: Was „befriedigend“ konkret heißt

1. **Der Treffer wirkt dort, wo er trifft.** Eine Kanonenkugel schlägt ein Loch in Kugelgröße.
2. **Materialien verhalten sich unterschiedlich.** Glas zerspringt, Holz splittert, Ziegel bröckeln, Beton bricht in Brocken, Stahl fällt als Ganzes.
3. **Was den Halt verliert, fällt – und zwar schwer.** Die Schwerkraft ist mit Absicht mehrfach stärker als in echt, damit Trümmer krachen statt schweben (11.1).
4. **Hohes kippt.** Ein am Fuß abgetrennter Turm fällt um wie ein Bauklotz-Turm und zerschellt.
5. **Kettenreaktionen.** Ein fallender Schornstein zerschlägt das Dach darunter. Ein Tank explodiert und reißt die Halle mit.
6. **Trümmer bleiben liegen.** Am Ende steht ein Schutthaufen, kein leerer Platz.
7. **Wucht ist spürbar.** Jeder Treffer schleudert eine Fontäne aus Würfeln mehrere Monsterhöhen in die Luft; gelöste Brocken hüpfen bei Explosionen hoch, bevor sie aufschlagen. Dazu Kamerawackeln, Staubwolken, tiefe Rumms-Geräusche.
8. **Zerstörung macht stärker.** Jeder Einsturz füllt sichtbar die eigene Macht.

## 4. Der Spieler: das Monster

- Dritte-Person-Ansicht von schräg hinten. Fünf Figuren: Dino, Gorilla, Roboter, Panzer, Flieger. Sie sehen nicht nur anders aus, sie zerstören grundverschieden (Abschnitt 9).
- Unverwundbar. Trümmer prallen ab.
- Laufen zerstört bereits: Was schwächer ist als das Monster, bricht beim Durchlaufen.
- **Flugkamera** als zweiter Modus: frei fliegen und direkt feuern. Selten gebraucht, deshalb nicht auf dem Bildschirm, sondern in den Einstellungen (oder Taste Tab). Solange sie an ist, zeigt ein Knopf mit dem Bild der Figur den Weg zurück.

### 4.1 Steuerung

Maus und Tastatur haben Vorrang und werden zuerst abgestimmt; Gamepad und Touch laufen gleichberechtigt mit und werden automatisch erkannt.

| Aktion | Maus + Tastatur | Gamepad | Touch |
|---|---|---|---|
| Vor / zurück | W, S oder Pfeile | Linker Stick | Stick unten links |
| Drehen (Monster und Kamera) | A, D oder Pfeile | Linker Stick | Stick |
| Kamera schwenken | Mittlere Maustaste ziehen | – | – |
| Zielen | Mauszeiger | Rechter Stick bewegt ein Zielkreuz | Antippen |
| **Schneller Angriff** | **Linksklick** | Rechter Trigger | kurz antippen |
| **Starker Angriff** | **Rechtsklick** | Linker Trigger | Finger halten |
| Rennen | Umschalt halten | B halten | Stick ganz durchdrücken |
| Springen und Stampfen | Leertaste | A | Knopf rechts |
| Brüllen | R | X | Knopf rechts |
| Angriff wechseln | Leiste, Tasten 1–4, Mausrad | Schultertasten | Leiste |
| Monster / Flugkamera | Einstellungen, Tab | Select | Einstellungen |
| Flughöhe (Flugkamera) | Q, E | Steuerkreuz | – |
| Weltauswahl | Knopf | – | Knopf |

### 4.1a Bedienung auf dem Handy

Auf Touch-Geräten und in kleinen Fenstern schaltet die Oberfläche in ein kompaktes Layout. Der Grundsatz: Dauerhaft sichtbar ist nur, was die Figur unmittelbar steuert; alles andere liegt hinter einem einzigen Menüknopf.

| Wo | Was |
|---|---|
| Unten links | Steuerknüppel: vor/zurück, drehen; ganz durchgedrückt rennt die Figur. (Auf iPhones blieb die Figur anfangs trotz bewegtem Knüppel stehen: Das Spiel hielt negative Berührungs-Kennungen, wie iOS sie vergibt, für „kein Finger“. Behoben.) |
| Unten rechts, unter dem Daumen | **Springen** (groß; halten = höher, erneut = Doppelsprung, im goldenen Moment = Stampfattacke), **schneller Angriff**, **starker Angriff** (mit Muskelarm-Zeichen), ein kleiner Knopf, der zum **nächsten Angriff** weiterschaltet, und ab Stufe 9 Brüllen |
| Ins Bild tippen | zielt auf die getippte Stelle: kurz = schnell, halten = stark. Die Angriffsknöpfe greifen geradeaus an |
| Oben rechts | ein Menüknopf ☰. Darin: Weltauswahl, Selbstspiel, Einstellungen und der Link zu Impressum & Datenschutz. Ein Tipp auf einen Eintrag oder ins Spielfeld schließt das Menü |
| Oben | Macht-Ring und Welt-Balken verkleinert; die Reihe der Gebäudesymbole entfällt |

Weitere Anpassungen: Vorführ-Hinweise erscheinen oben statt unten, damit sie nicht unter den Daumen liegen; zeigt ein Hinweis auf einen Knopf im Menü, pulsiert der Menüknopf. Alle Ränder berücksichtigen Notch und abgerundete Ecken. Menüs lassen sich mit dem Finger scrollen. Im Hochformat rückt die Kamera weiter zurück, weil das Bild schmal ist.

### 4.2 Bewegung und Sprung

| Größe | Wert |
|---|---|
| Lauftempo | 5 + 0,9 × Körperhöhe (Würfel pro Sekunde): größere Monster sind schneller |
| Stufenhöhe | 30 % der Körperhöhe: Schutt und niedrige Mauern werden einfach überstiegen |
| **Sprunghöhe** | Taste halten: bis **3,2 Körperhöhen**. Kurz tippen: etwa eine Körperhöhe. Loslassen bricht den Aufstieg ab – wie in einem Jump-and-Run |
| Sprungverlauf | Schneller Aufstieg (0,7 s bis zum Scheitel), noch schnellerer Fall (0,55 s); ein voller Sprung dauert bei jeder Größe rund 1,3 Sekunden |
| **Doppelsprung** | Ein zweiter Druck in der Luft gibt noch einmal 2,4 Körperhöhen Auftrieb, und die Figur schlägt in 0,55 Sekunden einen Salto vorwärts. Beide Sprünge zusammen reichen bis knapp fünf Körperhöhen. Einen dritten gibt es erst nach der Landung. Wer von einer Kante fällt, hat diesen einen Luftsprung ebenfalls. Die Landung aus dem Salto trifft ein Drittel härter und breiter |
| **Stampfattacke** (dritter Druck) | Wie der Bodenstampfer aus Jump-and-Run-Spielen. **Der richtige Moment** ist der Scheitel des Doppelsprungs: von der zweiten Hälfte des Saltos, bis die Figur merklich fällt. Dann schimmert sie golden und es tickt kurz. Wer jetzt drückt: Die Figur rollt sich mit einer schnellen Drehung zusammen, hängt 0,2 Sekunden in der Luft und saust dann senkrecht nach unten – Sitzfläche voran, lang gestreckt, Arme hochgerissen. **Lenken ist ab dem Druck nicht mehr möglich.** Der Aufschlag wirkt wie der Stampfer einer Figur **eine Stufe höher**, allein durch Gewicht: Krater, zwei Stoßringe, Zeitlupe; was darunter steht, bekommt einen dreifachen Schubs. Trifft sie ein Gebäude, bricht sie Stockwerk für Stockwerk durch (bis zu acht, jedes etwas schwächer); auf freiem Boden bleibt es bei einem Krater. Danach hockt sie 0,3 Sekunden im Krater. Zu früh oder zu spät gedrückt passiert nichts |
| Steuerung in der Luft | voll: Man kann gezielt auf ein Dach springen |
| **Sprung mit Richtung** | Wer beim Springen eine Richtung hält, fliegt in diese Richtung – mit dem **1,8-Fachen des Lauftempos**, im Sprint entsprechend mehr. So kommt man von einem Dach auf das nächste: Ein einfacher Sprung trägt rund 2,5 Körperlängen weit, über eine normale Straße hinweg; Sprint und Doppelsprung zusammen gut sechs. Je höher der Absprungpunkt, desto länger der Flug und desto größer die Weite. Es ist kein Angriff: Im Flug bricht nur, was auch beim Laufen bricht |
| Dachkante | In der Luft wird eine Kante bis zu einer halben Körperhöhe über den Füßen noch gefasst – ein Sprung, der ein Dach fast erreicht, landet darauf |
| **Panzer** | Springt nicht, er hüpft: 0,7 Körperhöhen hoch, ohne Doppelsprung, ohne Stampfattacke, ohne Schub in der Luft und ohne Krater bei der Landung. Das reicht, um aus einer selbst gegrabenen Kuhle wieder herauszukommen |
| Landung | Springen kann das Monster von Anfang an. Ab Stufe 2 ist jede Landung ein Stampfer mit Krater und Druckwelle; mit Stufe 1 gibt es nur eine Staubwolke |

Damit sich ein 50 Meter hohes Monster nicht träge anfühlt, wächst seine eigene Fallbeschleunigung mit der Körpergröße; sie ist außerdem doppelt so hoch wie die der Trümmer. Beim Fallen wirkt das 1,7-Fache, beim Aufsteigen ohne gedrückte Taste das Dreifache.

### 4.3 Kamera

- Abstand 3,4 Körperhöhen. Auf Planeten richtet sich die Neigung nach der Größe: Ein kleines Monster zwischen hohen Häusern blickt fast waagerecht und an den Fassaden hoch, ein Riese blickt von oben auf seinen Planeten. Mit der rechten Maustaste lässt sich die Neigung jederzeit nachstellen.
- Zum Rand des sichtbaren Ausschnitts hin löst sich alles im Horizontdunst auf, damit hohe Türme nicht plötzlich auftauchen.
- **Sichtfenster:** Was zwischen Kamera und Monster steht (Hochhäuser, Bäume), wird in einem großen Kreis um das Monster ausgeschnitten. Der Kreis reicht gut zwei Körperhöhen plus 8 m in jede Richtung, damit nicht nur die Figur, sondern auch ihre Umgebung frei zu sehen ist. Die inneren 60 % sind ganz offen, zum Rand hin wird das Hindernis in vier Rasterstufen dichter, damit keine harte Kante entsteht.
- Flugkamera: Höhe begrenzt, nie im Boden oder in Gebäuden.

## 5. Macht und Wachstum

### 5.1 Der Kreislauf

Zerstören → Macht sammeln → wachsen → Größeres zerstören können → mehr Macht.

- Jeder zerstörte Würfel gibt Macht nach Material (7.3). Ein vollständig zerstörtes Gebäude gibt 25 % seines Werts als Bonus.
- **Was nur mitfällt, zählt weniger:** Würfel, die das Monster selbst wegschlägt, zählen voll. Würfel, die bei einem Einsturz ihren Halt verlieren oder im nachgebenden Stockwerk zerdrückt werden, zählen nur zu 30 %. Ohne diese Regel brachte ein einziger gefällter Turm samt Kettenreaktion mehrere Stufen auf einmal.
- **Macht ist sichtbar.** Wo etwas zerbricht, platzen leuchtende Kugeln mit Lichthof heraus, fliegen eine Drittelsekunde frei auseinander und ziehen dann zum Monster. Ihre Größe wächst mit dem Monster (0,7 + 4,5 % der Körperhöhe), damit sie auch neben einem Riesen auffallen. Ist ein Gebäude vollständig zerstört, schleudert es 10 bis 28 große Kugeln auf einmal heraus; gibt ein Stockwerk nach, sind es acht.
- **Macht kommt an.** Erreicht eine Kugel das Monster, leuchtet es kurz golden auf, ein Ton steigt an, und ein Funke fliegt vom Monster zum Macht-Ring oben links, der dabei zuckt und sich füllt. So ist zu sehen, wohin die Macht geht und was sie bewirkt.
- Ist der Ring voll, folgt der **Wachstumsmoment**: Brüllen, Aufleuchten, sichtbares Wachsen, Druckwelle, Fanfare. Zwischen zwei Wachstumsmomenten liegen mindestens 2 Sekunden, damit jeder einzeln wirkt.
- Macht geht nie verloren, auch nicht beim Weltwechsel – außer man beginnt in den Einstellungen bewusst von vorn.

### 5.2 Woran man Macht sieht

Größe · detailreicheres Modell je Stufe (Rückenstacheln ab 2, Hörner ab 4, glühende Augen ab 5, Schulterpanzer ab 6, Leuchtstreifen und Aura ab 8) · tiefere Stimme · Schritte, die ab Stufe 4 die Kamera beben lassen und ab Stufe 6 Dellen hinterlassen · stärkere und größere Werkzeuge.

### 5.3 Stufen

| Stufe | Höhe | Macht bis zur nächsten | Neu freigeschaltet |
|---|---|---|---|
| 1 | 1,8 m (Auto) | 1 200 | Laufen, Rennen, Springen, erster Angriff (schnell und stark) |
| 2 | 2,9 m (Garage) | 4 500 | Landung wird zum Stampfer |
| 3 | 4,7 m (Haus) | 12 000 | zweiter Angriff |
| 4 | 6,8 m | 380 000 | **Kettenreaktionen** (Upgrade, abschaltbar) |
| 5 | 10,8 m | 900 000 | dritter Angriff |
| 6 | 16 m (Wohnblock) | 1 500 000 | stärkere Kettenreaktionen |
| 7 | 25 m (Kirchturm) | 2 800 000 | vierter Angriff |
| 8 | 36 m (Hochhaus) | 4 700 000 | Leuchtstreifen, Aura |
| 9 | 54 m | × 1,7 je Stufe | Brüllen als Waffe |
| 10+ | × 1,25 je Stufe | × 1,7 je Stufe | mehr Wucht |

- Das erste Wachstum kommt absichtlich nach rund einer Minute. Danach sind die Schwellen so gewählt, dass jede Stufe ungefähr gleich lang dauert (Ziel: rund 100 Sekunden zügiges Spiel). Grundlage sind Messungen im Idle-Modus in der Wolkenkratzer-Stadt, je 55 Sekunden pro Stufe: etwa 7, 40 und 110 Macht pro Sekunde auf den Stufen 1 bis 3, dann mit den Kettenreaktionen sprunghaft 4 000 (Stufe 4), 7 000 bis 8 000 (5 und 6), 28 000, 47 000 und 82 000 (7 bis 9). Daher der große Schritt von Stufe 3 zu 4. Die Messwerte streuen stark (ein einzelner Turm mehr oder weniger ändert viel); die Schwellen sind also eine begründete Schätzung, kein exakter Abgleich.
- Erreichte Stufen bleiben erhalten. In der Weltauswahl kann jede bereits erreichte kleinere Stufe gewählt werden.
- Grenze: Das Monster wird bei 92 % der Welthöhe gedeckelt. Das sind 58 m auf normalen Planeten, 118 m in der Stadt und 235 m in der Wolkenkratzer-Stadt – dort ist Platz bis etwa Stufe 15.

### 5.4 Jede Figur wächst für sich

Dino, Gorilla, Roboter, Panzer und Flieger haben jeweils eine eigene Stufe und eigene Macht. Wer mit dem Dino Stufe 7 erreicht hat, beginnt mit dem Roboter trotzdem bei Stufe 1 und schaltet dessen Angriffe einzeln frei. Alle fünf Figuren sind von Anfang an wählbar; in der Weltauswahl zeigt jede ihre Stufe. Beim Wechsel wird die Figur sofort mit ihrer eigenen Größe weitergespielt. Ein Spielstand aus der Zeit davor wird der zuletzt gespielten Figur gutgeschrieben.

## 6. Zähler

- **Gebäude-Zähler:** Über dem Gebäude, das gerade zerlegt wird, schwebt sein Symbol mit Balken und Prozentzahl. Bei 100 % Stempel, Fanfare, Macht-Bonus. Ein Gebäude gilt als zerstört, wenn 90 % seiner Würfel nicht mehr an ihrem Platz sind.
- **Welt-Zähler:** Balken oben mit Prozentzahl. Bei bis zu 26 Gebäuden zeigt eine Symbolreihe jedes einzeln mit Haken; bei mehr steht dort „erledigt / gesamt“.
- **Feiern in Vierteln:** Große Welten dauern lange. Bei 25, 50 und 75 % gibt es Feuerwerk und Fanfare.
- **Welt bei 100 %:** Großes Feuerwerk, die Welt bekommt in der Auswahl einen Haken, ein großer Pfeil öffnet die Weltauswahl.
- **Stickeralbum:** jede Gebäudeart, die einmal vollständig zerstört wurde.

## 7. Die Welt

### 7.1 Voxel und Maßstab

Die Würfelgröße ist pro Welt fest: 20 cm im Bauklotz-Zimmer, 25 cm in Garten und Wohnstraße, 50 cm auf Planeten. Innerhalb einer Welt wächst das Monster tatsächlich.

### 7.2 Zwei Weltformen

**Insel** – flach und begrenzt, für kleine, sehr detaillierte Schauplätze.

**Planet** – eine Welt ohne Rand. Intern ein flaches Gitter, dessen Ränder nahtlos ineinander übergehen; erst beim Zeichnen wird es um das Monster herum nach unten gekrümmt. Die Physik rechnet weiter im geraden Gitter.

- Sichtbar ist immer eine runde Kappe von 360 Würfeln Radius (180 m) rund um das Monster. Dahinter liegt der Horizont; die äußeren 20 % lösen sich im Dunst auf.
- Die Größe der sichtbaren Kappe hängt nicht von der Größe der Welt ab. Die Welt kann deshalb viel größer sein als das, was der Rechner gleichzeitig zeichnen muss (12.3).
- Einschränkung: keine echte Kugel, kein Blick von außen auf den ganzen Planeten.
- **Strahlen bleiben gerade.** Weil das Bild gekrümmt wird, sähe ein in der Welt gerader Laserstrahl auf dem Schirm aus wie ein Wasserstrahl. Strahlenwaffen (Laserimpulse, Schneidstrahl, Atomstrahl, Bordwaffen) verlaufen deshalb gerade *im Bild*: Der Strahl wird im Bildraum verfolgt und jeder Punkt für die Trefferprüfung in die Welt zurückgerechnet. Er trifft also genau das, worüber er sichtbar hinwegstreicht, auch die Brenntiefe folgt dieser Linie. Geschosse (Raketen, Granaten, Bomben) fliegen weiterhin in der Welt und beschreiben auf dem Schirm einen leichten Bogen.

### 7.3 Materialien

| Material | Festigkeit | Macht je Würfel | Bruchverhalten |
|---|---|---|---|
| Glas | 0,8 | 1 | zerspringt, Klirren |
| Blätter, Hecke | 0,8 | 0,5 | zerstäubt; **brennbar** |
| Stoff (Betten, Sofas, Markisen) | 1,5 | 0,8 | zerfetzt; **brennbar** |
| Sprengstoff (Tank, Gasflasche, Fass) | 2 | 3 | explodiert, Kettenreaktion |
| Holz, Bauklötze | 3 | 1 | Splitter; **brennbar** |
| Erde, Rasen, Straße | 4 | 0,15 | krümelt, Krater; zählt nicht für den Welt-Zähler |
| Blech (Autos, Hallen) | 4 | 1,5 | scheppert |
| Ziegel, Putz, Dach | 6 | 1,5 | Brocken, roter Staub |
| Beton | 10 | 2 | große Brocken |
| Stahl | 16 | 3 | fällt als Ganzes |

Ein Treffer hat eine Stärke, die zum Rand hin abnimmt. Ist sie größer als die Festigkeit, bricht der Würfel sicher. Ist sie etwas kleiner, bricht er mit einer Wahrscheinlichkeit – so bröckelt auch zu hartes Material bei wiederholten Schlägen, statt gar nicht zu reagieren.

### 7.4 Weltkatalog

| Welt | Form | Kantenlänge | Würfel | Zählbare Würfel | Gebäude | Gebaut für Stufe |
|---|---|---|---|---|---|---|
| 🌆 **Wolkenkratzer-Stadt (Hauptszenario)** | Planet, 256 m hoch | 512 m | 50 cm | 9 100 000 | 249 | 1 |
| 🧱 Bauklotz-Zimmer | Insel | 64 m | 20 cm | 122 000 | 25 | 1 |
| 🌷 Garten | Insel | 96 m | 25 cm | 121 000 | 24 | 2 |
| 🏠 Wohnstraße | Insel | 96 m | 25 cm | 159 000 | 20 | 3 |
| 🧸 Spielzeugland | Planet | 512 m | 50 cm | 6 400 000 | 848 | 4 |
| 🏘️ Dorf | Planet | 512 m | 50 cm | 1 290 000 | 548 | 5 |
| 🌳 Parklandschaft | Planet | 512 m | 50 cm | 2 150 000 | 113 | 5 |
| 🏙️ Stadt | Planet, 128 m hoch | 512 m | 50 cm | 3 970 000 | 233 | 6 |
| 🏭 Fabrik | Planet | 512 m | 50 cm | 2 210 000 | 708 | 8 |
| 🎲 Gewürfelt | Planet | 128–512 m | 50 cm | je nach Mischung | – | – |

Gegenüber Entwurf 2 haben die Inseln die vierfache und die Planeten die vierfache Fläche; die Planeten haben 256 statt 64 Häuserblocks. Auf schwachen Geräten und Handys sind Planeten 256 m groß.

Inhalt:

- **Bauklotz-Zimmer:** 25 Bauten auf einem Teppich – Türme, hohe Türme, Burgen mit Ecktürmchen, Mauern, Bögen, Pyramiden, Treppen.
- **Garten:** Gartenhäuser, Gewächshäuser, Schaukeln, Tische mit Stühlen, Grills mit Gasflasche, Hecken, Blumenbeete, Bäume, Gartenzwerge, Zaun.
- **Wohnstraße:** Sieben Häuser mit Zimmern, Treppen, Möbeln und Dachstuhl, dazu Garagen, Autos, ein Bus, Laternen, Briefkästen, Zäune.
- **Spielzeugland:** ein Planet voller Riesen-Bauklötze, bis 24 Lagen hoch.
- **Dorf:** Häuser mit Gärten, Wohnblocks, Kirchen, Tankstellen, Wassertürme, Parks mit Hügeln.
- **Parklandschaft:** Wälder und hohe Hügel, dazwischen einzelne Häuser.
- **Stadt:** Hochhäuser mit Glasfassaden bis 34 Stockwerke (rund 100 m), Wohnblocks, Baustellen mit Kran.
- **Fabrik:** Hallen mit Maschinen, über 40 m hohe Schornsteine, Tanks, Silos.
- **Wolkenkratzer-Stadt:** das Hauptszenario, eine Szene wie Manhattan oder Tokio; Aufbau in 7.6. Ein neues Spiel beginnt hier, und sie ist die erste Kachel der Weltauswahl.

Alle Welten entstehen aus Bauplänen im Code mit festem Startwert: Wer eine Welt in der Weltauswahl erneut wählt, bekommt dieselbe Welt heil zurück. Einen eigenen Neu-aufbauen-Knopf gibt es nicht mehr.

### 7.5 Weltauswahl

Die nächste Welt bestimmt der Spieler selbst.

- **Jederzeit offen:** Der Weltkugel-Knopf oben rechts ist von der ersten Minute an da. Es gibt keine gesperrten Welten.
- **Kacheln mit zwei Zeichen:** Jede Welt zeigt unten links die Stufe, für die sie gebaut ist – grün, sobald das eigene Monster sie erreicht hat, sonst grau. Oben rechts steht ein Haken, wenn die Welt einmal zu 100 % zerstört wurde.
- **Nach 100 %:** Der große Pfeil öffnet dieselbe Auswahl, statt automatisch weiterzuschalten.
- **Zu früh in eine große Welt?** Erlaubt. Ein kleines Monster kann dort Glas, Autos und Bäume zerlegen und an Mauern knabbern; es wächst dabei weiter.
- **In derselben Auswahl:** Monsterfigur, Monsterstufe (jede erreichte), Weltenmischer mit Würfel-Knopf, Stickeralbum.

### 7.6 Die Wolkenkratzer-Stadt im Einzelnen

**Zentralpark.** In der Mitte liegt ein Park von 128 × 128 m (auf kleinen Geräten 64 × 64 m): Rasen, ein runder gepflasterter Platz mit Laternen, Wege zu allen vier Seiten, ein Brunnen, Bäume in einem lockeren Ring. Die Mitte bleibt frei. Hier startet das Monster und sieht die Hochhäuser aus mindestens 64 m Abstand ringsum aufragen.

**Straßen.** Jede vierte Straße ist eine Allee: doppelt so breit (8 m), mit Mittelstreifen und Bäumen. Dazu Zebrastreifen, Ampeln an jeder Kreuzung, Laternen, Hydranten, Bushaltestellen, geparkte Autos und Busse.

**Boden.** Neben Hochhäusern liegt kein Rasen, sondern ein heller Plattenbelag; Rasen gibt es nur im Park, an der Kirche und auf kleinen Stadtplätzen mit Brunnen.

**Hochhäuser.** Jedes entsteht aus vier unabhängigen Zutaten, die frei kombiniert werden:

| Zutat | Varianten |
|---|---|
| Bauform (12) | Quader · zwei bis drei Rücksprünge, oben wahlweise achteckig · breiter Sockel mit schlankem, eckigem, rundem oder achteckigem Turm · Achteck · Rundturm · Kreuzgrundriss · Stufenpyramide mit bis zu sieben Stufen · schmale Scheibe · schräg abgeschnittene Spitze |
| Fassade (6) | Glas mit schmalen Sprossen · Steinpfeiler mit schmalen Fenstern · Fensterbänder · Lochfassade · Vollglas · kräftige senkrechte Lamellen |
| Material (10) | blauer Beton, Granit mit Bronzeglas, schwarzer Stahl mit Schwarzglas, Marmor, Sandstein, Backstein, Terrakotta, Spiegelglas und weitere |
| Dach (7) | Spitze mit Mast und rotem Licht · hölzerne Wassertanks auf Stahlbeinen · Hubschrauberlandeplatz · Technikaufbauten · Antennenwald · beleuchtete Werbetafel · leuchtender Dachkranz |

Hinzu kommen dunkle Technikgeschosse alle 14 bis 20 Stockwerke und an etwa jedem dritten Haus eine senkrechte Leuchtreklame.

**Erdgeschoss.** Etwa drei von vier Hochhäusern haben einen Haupteingang mit Glastüren im Rahmen – unter einem Vordach auf Stützen, einer schrägen Stoffmarkise oder einem gläsernen Vordach mit Leuchtband. Gut die Hälfte hat Läden: große Schaufenster zwischen Pfeilern, ein Leuchtband darüber und bunte Markisen über dem Gehweg.

**Dazwischen.** Zeilen alter Stadthäuser mit drei bis acht Stockwerken, Laden, Gesims, Feuerleitern und Wassertank oder Werbetafel · Wohnblocks · offene Parkhäuser mit Autos auf den Decks · Stadtplätze mit Brunnen · Baustellen mit Kran · eine Kirche · eine Tankstelle.

**Zwillingstürme mit Brücke.** Sehr selten – etwa drei Paare in der ganzen Stadt – stehen zwei schlanke Türme nebeneinander, verbunden durch eine zweigeschossige verglaste Brücke auf halber bis dreiviertel Höhe.

Die normale Stadt (🏙️) nutzt denselben Baukasten mit niedrigeren Häusern, mehr Wohnblocks und einem kleineren Park.

### 7.7 Weltenmischer (statt Baumodus)

Acht Schieberegler mit Bildsymbolen an beiden Enden: Weltgröße (128 / 256 / 512 m), Bebauung, Gebäudehöhe, Fabrik-Anteil, Autos, Bewohner, Hügel, Grün. Der Würfel-Knopf erzeugt daraus einen neuen Planeten.

## 8. Leben in der Welt

Standardmäßig an; Bewohner und Einsatzkräfte lassen sich in den Einstellungen getrennt abschalten.

- **Bewohner:** bis zu rund 1 000 Figuren pro Planet. Sie spazieren, fliehen mit erhobenen Armen, sobald das Monster näher als etwa drei Körperhöhen kommt, werden von Explosionen weggeschleudert, purzeln, stehen auf und rennen weiter.
- **Einsatzkräfte:** Polizei, Feuerwehr, Reporter und Militär, siehe 8.1.
- Gezeichnet werden nur die Bewohner innerhalb des Horizonts.
- Leben gibt keine Macht und zählt in keinem Zähler.
- Geplant, noch nicht vorhanden: fahrender Verkehr, Vögel, Hunde.

### 8.1 Einsatzkräfte

In Welten mit Bewohnern (Dorf, Park, Stadt, Fabrik, Wolkenkratzer-Stadt, Würfelwelt) reagiert die Welt auf die Zerstörung, ähnlich den Fahndungssternen bekannter Spiele. Die **Alarmstufe** (0 bis 5) steht als Sternenreihe unter dem Welt-Zähler – auf dem Handy nur winzig und halb durchsichtig, damit sie nichts verdeckt.

- **Sie braucht Zeit.** Solange etwas zerstört wird, steigt sie um einen Stern in etwa 8 Sekunden; die erste Streife ist also nicht beim ersten Schlag da (im Test fuhr sie nach knapp 12 Sekunden vor).
- **Sie hat eine Obergrenze**, die davon abhängt, wie viel der Welt zerstört ist (Tabelle).
- **Sie ebbt ab.** Wird 12 Sekunden lang nichts zerstört, sinkt sie um einen Stern alle 14 Sekunden bis auf null; die Fahrzeuge werden dann nach und nach abgezogen, frühestens aber eine halbe Minute nach ihrer Ankunft.

| Alarmstufe | möglich ab | Was kommt |
|---|---|---|
| ⭐ | erstem Schaden | ein Polizeiauto |
| ⭐⭐ | 0,4 % der Welt | drei Polizeiautos, ein Reporter-Hubschrauber |
| ⭐⭐⭐ | 2 % | vier Polizeiautos, bei größeren Bränden ein Lösch-Hubschrauber |
| ⭐⭐⭐⭐ | 6 % | fünf Polizeiautos, zwei Reporter, zwei Militär-Hubschrauber |
| ⭐⭐⭐⭐⭐ | 15 % | sechs Polizeiautos, vier Militär-Hubschrauber, alle 9 bis 17 Sekunden ein oder zwei Kampfflieger im Überflug, zweiter Lösch-Hubschrauber |

- **Polizei:** weiß-blaue Autos mit wechselndem Blaulicht und Martinshorn. Sie fahren ohne Hast am Straßenraster entlang (immer längs einer Achse; ist der Weg versperrt, biegen sie ab), zügig bei der Anfahrt, langsam in Sichtweite, und überlegen sich ihr Ziel nur alle drei bis fünf Sekunden neu, statt jedem Schritt zu folgen.
- **Respekt wächst mit der Größe.** Vor einem Kaputtmacher, der kaum größer ist als ein Auto (unter 9 Einheiten Höhe, also etwa die ersten zwei bis vier Stufen je nach Welt), bildet die Polizei eine **Straßensperre**: Die Wagen stellen sich quer nebeneinander ein paar Wagenlängen vor seine Nase und weichen nicht. Solange er kleiner ist als ein Auto (unter 5 Einheiten), kommt er nicht darüber hinweg und muss sie zerschlagen. Ist er größer, stellen sie sich in einem Ring um ihn auf, dessen Abstand schneller wächst als er selbst, und weichen zurück, wenn er näher kommt. Das Militär hat eine andere Schwelle: Seine Hubschrauber kreisen bei kleinen Kaputtmachern auf gut halbem Abstand der Reporter und halten erst bei Riesen denselben Abstand.
- **Feuerwehr:** kommt unabhängig von der Alarmstufe, sobald etwas brennt – ein Löschzug, bei viel Feuer oder hoher Alarmstufe bis zu drei. Sie fahren bis auf etwa 26 m an den Brand, spritzen einen Wasserbogen darauf und löschen alle 0,35 Sekunden, was im Umkreis von rund 9 m brennt. Der rote Lösch-Hubschrauber mit Wassersack löscht aus der Luft einen Umkreis von über 20 m, fliegt zum Nachfüllen weg und kommt wieder. Lässt man sie in Ruhe, ist ein Brand in wenigen Sekunden aus.
- **Reporter:** die bisherigen Hubschrauber, jetzt erkennbar als Presse (weiß oder blau mit gelbem Streifen und Lampe). Ihr Suchscheinwerfer ist ein breiter, weicher Lichtkegel, der in einem hellen Fleck um den Kaputtmacher endet – kein dünner Strahl, den man für einen Schuss halten könnte.
- **Militär:** olivgrüne Hubschrauber mit Stummelflügeln kreisen enger und feuern alle paar Sekunden eine Leuchtspur-Garbe; Kampfflieger schießen im Überflug zwei Raketen ab. Beides prallt wirkungslos am Kaputtmacher ab (Funken, kleiner Blitz). Es gibt weiterhin kein Scheitern.
- **Alles ist zerstörbar:** Fahrzeuge zerplatzen, wenn ein Schlag in ihrer Nähe landet oder der Kaputtmacher darauf tritt; alles, was fliegt, wird von Schlag, Geschoss, Strahl oder Explosion vom Himmel geholt, trudelt ab und explodiert am Boden. Nachschub kommt nach einigen Sekunden.
- Abschaltbar in den Einstellungen („Einsatzkräfte“); die Detailstufe bestimmt ihre Zahl.

Bewohner und Einsatzkräfte laufen über ein gemeinsames Akteur-System.

## 9. Figuren und ihre Angriffe

### 9.1 Grundregeln

- **Jede Figur zerstört auf ihre Art.** Der Dino mit Körper, Zähnen und Feuer. Der Gorilla mit Fäusten, Würfen und seinem Gewicht. Der Roboter nur mit Licht und Raketen, nie mit der Faust. Der Panzer mit allem, was aus einem Rohr kommt.
- **Jeder Angriff gibt es zweimal:** links die schnelle, schwächere Fassung, rechts die langsame, starke. Das gilt ab Stufe 1 und für jeden später freigeschalteten Angriff.
- **Erst ausholen, dann Wirkung.** Ein Klick löst eine Bewegung aus, keinen Schaden. Der Schaden entsteht, wenn der Schlag ankommt. Starke Angriffe holen 0,4 bis 0,95 Sekunden aus – es ist kein Geschicklichkeitsspiel, die Wucht geht vor.
- **Größe macht langsamer und stärker.** Das Ausholen dauert je Stufe 3,5 % länger. Radius und Stärke wachsen mit der Körperhöhe H und der Stufe S: Grundradius R = 0,24 H + 1,6, Grundstärke P = 4,5 + 1,8 S. Ein starker Dino-Schlag hat auf Stufe 1 einen Radius von rund 3 Würfeln, auf Stufe 7 von rund 15 – also weit mehr als die hundertfache zerstörte Menge.
- **Vier Angriffe je Figur,** freigeschaltet mit Stufe 1, 3, 5 und 7. Dazu für alle: Springen/Stampfen und ab Stufe 9 das Brüllen als Waffe.
- In der Flugkamera gibt es keinen Körper: links ein Laserimpuls, rechts eine Rakete.

### 9.2 Die Angriffe

**🦖 Dino**

| Angriff | Schnell | Stark |
|---|---|---|
| 🌀 Schwanz (Stufe 1) | Schwanzhieb: halbe Drehung, abwechselnd links und rechts | Wirbelschlag: rollt sich zusammen, wirbelt einmal ganz herum, Schwanz voll gestreckt. Reichweite 1,45 H, Radius 1,25 R, Stärke 1,6 P, Druckwelle am Ende |
| 🦷 Biss (3) | Schnappt zu und beißt ein Stück heraus; das meiste wird verschluckt | Reißen: verbeißt sich, schüttelt den Kopf und schleudert einen Brocken von bis zu 0,3 H Radius weg, der wie eine Bombe einschlägt |
| 💨 Ansturm (5) | Kopfstoß: 1,8 H weit nach vorn | Sturmangriff: scharrt, senkt den Kopf und rennt 7 H weit durch alles hindurch; schubst dabei mit 3,5-facher Kraft |
| 🔥 Feuer (7) | Feuerstoß: Flammenfächer, setzt Brennbares in Brand | Atomstrahl: Die Rückenstacheln laden sich auf, dann folgt ein dicker blauer Strahl 1,5 Sekunden lang dem Zielpunkt |

**🦍 Gorilla**

| Angriff | Schnell | Stark |
|---|---|---|
| 👊 Fäuste (1) | Jab, abwechselnd links und rechts, alle 0,36 s | Hammerschlag: beide Fäuste hoch über den Kopf, kleiner Hüpfer, dann nach unten. Radius 1,45 R, Stärke 1,6 P, dazu ein Ring aus sechs Einschlägen im Boden |
| 🪨 Wurf (3) | Reißt einen Brocken heraus und wirft ihn in einer Bewegung | Stemmt einen Felsen von bis zu 0,3 H Radius über den Kopf und schleudert ihn mit 1,8-facher Geschwindigkeit; er explodiert beim Aufschlag. Kleine Dinge (Auto, Baum) werden ganz gepackt |
| 💥 Stampfen (5) | Stampft mit einem Fuß auf: Stoßring ringsum | Sprungschlag: springt in hohem Bogen bis zu 6 H weit auf den Zielpunkt und landet mit beiden Fäusten – Krater und zwei Stoßringe nacheinander |
| 🥁 Raserei (7) | Brusttrommeln: fünf Druckringe, die Glas weit im Umkreis zerspringen lassen | Neun Hammerschläge in 1,7 Sekunden, abwechselnd links und rechts |

**🤖 Roboter**

| Angriff | Schnell | Stark |
|---|---|---|
| ⚡ Laser (1) | Drei kurze Impulse aus der Armkanone: kleine, tiefe Löcher auf beliebige Entfernung | Schneidstrahl: lädt 0,6 s, dann schwenkt der Strahl 1,15 Sekunden lang von links nach rechts durch den Zielpunkt und schneidet eine Linie |
| 🚀 Raketen (3) | Eine Rakete aus dem Schultermagazin | Salve: acht Raketen steigen auf und senken sich gelenkt auf das Zielgebiet |
| ⚔️ Klinge (5) | Ein sauberer Schnitt mit der Laserklinge | Rotorschnitt: zwei volle Drehungen mit ausgestreckter Klinge, die zweite höher als die erste |
| 🛰️ Orbit (7) | Streut drei Plasmaminen mit Zeitzünder | Orbitalschlag: zeigt zum Himmel; ein Ring zieht sich um das Ziel zusammen, dann fährt eine Lichtsäule von oben durch das ganze Gebäude und explodiert am Boden |

**🪖 Panzer**

| Angriff | Schnell | Stark |
|---|---|---|
| 💣 Kanone (1) | Maschinenkanone: sechs kleine Granaten in 0,5 s | Hauptgeschütz: Das Rohr zieht zurück, der Schuss wirft den ganzen Panzer nach hinten. Die Granate durchschlägt drei Hindernisse und explodiert dann |
| ☄️ Mörser (3) | Eine Granate im hohen Bogen | Sperrfeuer: sechs Granaten regnen rund um das Ziel |
| 💨 Rammen (5) | Kurzer Rammstoß | Vollgas: 7 H weit durch alles hindurch, schubst mit 4-facher Kraft |
| 🧨 Schwer (7) | Flammenwerfer | Bunkerbrecher: eine langsame, riesige Rakete mit dem größten Explosionsradius im Spiel (12 + 2,2 S) |

Der Panzer zielt mit dem Turm unabhängig von der Fahrtrichtung.

**✈️ Flieger**

| Angriff | Schnell | Stark |
|---|---|---|
| 🔫 Bordwaffen (1) | Sechs Laserimpulse aus der Nase auf den Zielpunkt | Eine Bombe aus dem Rumpf; sie behält das Tempo des Fliegers und fällt |
| 🚀 Raketen (3) | Eine Rakete von der Tragfläche | Salve: acht gelenkte Raketen |
| 💣 Bombenteppich (5) | Drei Bomben nacheinander | Zwölf Bomben in 1,3 Sekunden entlang der Flugbahn |
| 🔥 Schwer (7) | Drei Brandbomben: kleine Explosion, großes Feuer | Eine Riesenbombe (Radius 14 + 2,4 S) |

Der Flieger steht nie still: A/D lenkt, W/S steigt und sinkt, Umschalt ist der Nachbrenner (Tempo 42 + 1,3 H Würfel pro Sekunde, mit Nachbrenner das 1,7-Fache). **Die Schnauze zeigt immer in Flugrichtung** – der Flieger dreht sich nicht mehr zum Ziel. Stattdessen trägt er unter dem Bauch ein Anbauteil je Waffe: einen Zwillingsgeschützturm (Bordwaffen) und einen Raketenwerfer mit zwei Behältern (Raketen), die sich rundum zum Zielpunkt drehen, der Turm neigt zusätzlich seine Rohre; eine Reihe Bomben (Bombenteppich) und zwei leuchtende Brandbehälter (Brandbomben), die keine Richtung brauchen. Gezeichnet wird nur das Teil der gewählten Waffe; Schüsse und Raketen starten dort. Er legt sich in die Kurve, gleitet über alles, was unter ihm liegt, und bricht mit der Nase durch alles, was vor ihm steht. Über Inseln dreht er am Rand von selbst um. Springen und Brüllen gibt es für ihn nicht.

### 9.3 Animation und Wucht

- **Gelenkmodelle.** Jede Figur besteht aus Teilen mit Gelenken, die aneinanderhängen: Rumpf → Kopf → Kiefer, Rumpf → Arme, Rumpf → Schwanz → Schwanzspitze (Dino), Wanne → Turm → Rohr (Panzer), Rumpf → Raketenmagazine (Roboter). Beugt sich der Rumpf, gehen Kopf und Arme mit; die Beine bleiben stehen.
- **Körpersprache im Leerlauf:** Atmen, Schwanzpendeln, der Kopf (beim Panzer der Turm) folgt dem Zielpunkt. Beim Gehen wippt der Körper; der Gorilla läuft auf den Knöcheln, der Dino vorgebeugt mit nachschwingendem Schwanz, der Roboter steif mit Gegendrehung. Im Sprung werden die Beine angezogen und die Arme hochgerissen. Beim Brüllen Kopf zurück, Kiefer weit auf.
- **Jeder Angriff hat eine eigene Bewegung** aus Ausholen, Schlag und Ausschwingen – mit Gegenbewegung beim Ausholen (zurücklehnen, ducken, einrollen) und Überschwingen danach.
- **Wucht beim Treffer:** Staubring und Blitz, Kameraruck, Trümmerfontäne. Bei schnellen Angriffen hält die Welt 0,045 s still. Bei starken hält sie 0,09 s still und läuft danach rund 0,3 s in Zeitlupe (40 %) weiter.

Spätere Kandidaten: Abrissbirne, Meteor, Tornado, schwarzes Loch, Riesenmagnet.

## 10. Zeigen statt erklären

1. **Start ohne Menü.** Beim ersten Start steht das Monster sofort auf dem Platz im Zentralpark der Wolkenkratzer-Stadt.
2. **Geister-Vorführung.** Ein durchscheinender Zwilling des Monsters macht neben ihm die Handlung vor: laufen, ausholen und zuschlagen (der Dino mit seinem Schwanzschlag), springen, brüllen.
3. **Eingabe-Bild.** Dazu zeigt eine Blase das gerade benutzte Gerät in Aktion: Tasten mit blinkender Taste, eine Maus mit blinkender linker Taste, ein Gamepad-Knopf oder ein tippender Finger.
4. **Nachmachen beendet die Vorführung** dauerhaft.
5. **Sanfte Erinnerung** nach 25 Sekunden ohne Eingabe.
6. **Neues kommt einzeln.** Ein neues Werkzeug springt mit dem Wachstumsmoment in die Leiste, liegt sofort in der Hand und wird vorgeführt.
7. **Wenige Knöpfe.** Auf dem Bildschirm stehen neben der Steuerung nur drei: Weltauswahl, Selbstspiel und Einstellungen.

Reihenfolge: Laufen → Schlag → Springen → Zähler füllt sich → Macht fliegt zum Monster → erstes Wachstum → Stampfen → weitere Angriffe → Weltauswahl bei 100 %.

## 11. Zerstörungs- und Physikmodell

### 11.1 Schwerkraft

- Fallbeschleunigung für Trümmer, Bruchstücke und Geschosse: **85 Würfel pro Sekunde²**. Das sind auf Planeten 42 m/s² (gut das Vierfache der Erde), in Garten und Wohnstraße 21 m/s², im Bauklotz-Zimmer 17 m/s².
- Entwurf 2 rechnete mit 30. Der Wert ist bewusst unrealistisch hoch: Große Dinge wirken in echt träge, und genau diese Trägheit liest ein Kind als „schwebt“.
- Das Monster fällt zusätzlich proportional zu seiner Größe schneller (4.2).

### 11.2 Drei Zustände eines Voxels

1. **Fest** – Teil des Weltgitters, kostet keine Rechenzeit.
2. **Bruchstück** – zusammenhängende Gruppe, die als starrer Körper fällt, sich dreht, aufprallt und weiter zerbricht.
3. **Schutt** – einzelne lose Würfel, die fliegen, abprallen und liegen bleiben.

### 11.3 Ablauf eines Treffers

1. **Einschlag:** Kugel, Linie oder Fächer mit einer Stärke. Brechende Würfel werden zu Schutt und als Fontäne hochgeschleudert: überwiegend nach oben, dazu nach außen und in Schlagrichtung. Die Abwurfgeschwindigkeit ist so gewählt, dass die in Abschnitt 9 genannte Höhe erreicht wird.
2. **Halt prüfen:** Von der Schadstelle aus wird gesucht, ob die Nachbarn noch Bodenkontakt haben. Die Suche läuft bevorzugt nach unten, sodass stehende Gebäude nach wenigen hundert Würfeln bestätigt sind.
3. **Lösen:** Jede Gruppe ohne Bodenkontakt wird zum Bruchstück (bis 600 000 Würfel, das reicht für den größten Wolkenkratzer). Gruppen unter fünf Würfeln werden direkt Schutt. Bei Explosionen und Stampfern bekommen gelöste Stücke einen Stoß nach oben, kleine einen kräftigen, große einen kaum merklichen.
4. **Kippen:** Hohe Bruchstücke bekommen genau den Stoß, der ihren Schwerpunkt über die Kante hebt – in Schlagrichtung.
5. **Aufprall:** Jeder harte Kontakt wirkt als neuer Treffer auf die Welt und auf das Bruchstück selbst, an bis zu fünf Stellen gleichzeitig. Fallende Teile zerschlagen Gebäude, graben sich aber nicht in den Boden; geworfene dürfen Krater schlagen.
6. **Ruhe:** Ruhende Bruchstücke werden als Schutt ins Gitter zurückgeschrieben. Kleine nach 2,5 Sekunden, große spätestens nach 14.

### 11.4 Stabilität: Gebäude geben früher nach

Ein Gebäude muss nicht mehr Würfel für Würfel vom Boden getrennt werden.

- **Bilanz je Stockwerk.** Für jede waagerechte Schicht eines Gebäudes kennt das Spiel die Tragkraft, mit der sie gebaut wurde, und die, die noch übrig ist. Tragkraft zählt nach Material: Stahl 16, Beton 10, Ziegel 6, Holz 3, Glas 0,8. Ein Loch in der Glasfassade schwächt also kaum, ein fehlender Betonkern sehr.
- **Wann eine Schicht nachgibt:** wenn von ihrer Tragkraft weniger übrig ist als ein Mindestanteil. Der hängt vom Material ab, aus dem das Gebäude überwiegend besteht, und davon, wie viel auf der Schicht lastet:

| Überwiegendes Material | Mindestanteil ganz oben | ganz unten |
|---|---|---|
| Holz | 47 % | 78 % |
| Blech | 44 % | 73 % |
| Ziegel | 38 % | 63 % |
| Beton | 32 % | 53 % |
| Stahl | 23 % | 38 % |

  Ein Holzschuppen fällt also, wenn unten ein gutes Fünftel fehlt; ein Betonturm erst, wenn unten fast die Hälfte fehlt. Je höher im Gebäude, desto mehr darf fehlen.
- **Ankündigung:** Erst knackt und ächzt es, Staub rieselt aus der Schicht; nach 0,45 bis 0,95 Sekunden bricht sie.
- **Einsturz:** Die Schicht und ihre beiden Nachbarn werden zerdrückt. Alles darüber verliert den Halt, wird zum Bruchstück und kippt zu der Seite, an der am meisten fehlt.

### 11.5 Schubsen

Rennt das Monster (Umschalt) gegen ein Gebäude, das es nicht einfach durchbricht, schubst es. Der Schubs hebt den Mindestanteil des Gebäudes für rund eine halbe Sekunde an – um bis zu 60 Prozentpunkte, je nachdem, wie groß das Monster im Vergleich zu dem ist, was vom Gebäude noch steht. Ein kleines Monster wirft so einen Schuppen um, ein großes ein angeschlagenes Hochhaus und ein riesiges auch ein unversehrtes. Geschubste Gebäude fallen in Laufrichtung. Ansturm (Dino) und Vollgas (Panzer) schubsen drei- bis vierfach.

### 11.6 Kettenreaktionen (Upgrade)

- **Freischaltung** mit Stufe 4. Es gibt dafür keinen eigenen Knopf mehr (das Kettensymbol war nicht verständlich); ab- und anschalten lassen sie sich in den Einstellungen, dort mit erklärendem Satz.
- **Wirkung:** Stürzt ein Gebäude ein oder ist es vollständig zerstört, läuft nach gut einer halben Sekunde ein Stoß zu den Nachbarn im Umkreis von etwa einem Häuserblock. Er beißt sichtbar in deren Fuß und schwächt sie dauerhaft – um 24 Prozentpunkte auf Stufe 4, bis 55 ab Stufe 10.
- **Domino:** Fällt ein Nachbar dadurch, gibt er den Stoß weiter, jede Generation mit 62 % der Stärke; eine Kette läuft sich so nach drei bis fünf Gebäuden tot. Zusätzlich ermüdet die Kette: Jeder Einsturz kurz nach einem anderen zählt wie eine weitere Generation, egal wodurch das Gebäude fiel (auch durch Trümmer); alle vier Sekunden erholt sie sich um einen Schritt. Vorher gaben von Trümmern gefällte Nachbarn den Stoß wieder mit voller Stärke weiter, und ein Drittel der Stadt fiel in unter einer Minute. Holzbauten fallen schon beim ersten Stoß, Ziegelbauten nach einem starken oder zweien, Betontürme erst, wenn sie angeschlagen sind oder mehrere Nachbarn gefallen sind. Mit jeder Stufe reißt eine Kette also weiter.
- Dazu kommt, was ohnehin gilt: Ein kippender Turm zerschlägt, worauf er fällt (11.6a).

### 11.6a Wucht: Masse entscheidet

Trifft ein fallendes Bruchstück die Welt, zählt nicht nur seine Geschwindigkeit, sondern auch, wie schwer es im Vergleich zu dem ist, worauf es fällt.

- **Schwer auf leicht:** Ist das Bruchstück mehr als zwölfmal so schwer wie das getroffene Gebäude (gemessen an dessen verbliebenen Würfeln), wird das Gebäude einfach zerdrückt: ein großer Biss (Radius 4 bis 24 m je nach Masse) mit voller Kraft, das Gebäude wird zusätzlich dauerhaft geschwächt, und das Bruchstück behält 96 % seines Tempos und bleibt selbst heil. Über dem ganzen Grundriss des zerdrückten Gebäudes steigt Staub auf.
- **Schwer auf schwer:** Bei ähnlich schweren Gegnern beißen sich beide wie bisher an – Radius und Kraft wachsen mit Tempo und Masse (Radius bis 20 m statt bisher 13). Das Bruchstück verliert 20 % Tempo, kann zerbrechen oder am Nachbarturm lehnen bleiben.
- **Totes Gewicht:** Liegt ein Bruchstück über 4 000 Masse auf einem viel leichteren Gebäude, drückt es dieses alle 0,2 Sekunden weiter ein, bis es am Boden ankommt. Ein Turmstück bleibt also nicht auf einem Kiosk liegen.
- Eine echte Stoßrechnung zwischen Bruchstücken gibt es weiterhin nicht (Abschnitt 16).

### 11.7 Feuer, Hitze und Rauch

Feuer richtet sich nach dem Material. Flammen, Strahlen, Explosionen und brennende Nachbarn geben **Hitze** an einzelne Würfel ab; ein Würfel reagiert, sobald er mehr Hitze aufgenommen hat, als sein **Flammpunkt** verlangt. Nicht erneuerte Hitze klingt ab (0,15 pro Sekunde).

| Material | Flammpunkt | Was passiert |
|---|---|---|
| Blätter, Stoff, Sprengstoff | 1 | Fangen beim ersten Funken Feuer; Sprengstoff explodiert |
| Holz | 2,5 | Brennt 4,5 bis 9 Sekunden; in der Hälfte der Fälle bleibt ein verkohlter Würfel, sonst nichts |
| Boden (Gras, Straße, Pflaster) | 3 | Wird schwarz versengt |
| Glas | 4 | Platzt |
| Blech (Autos, Dächer) | 5 | Verrußt: ausgebrannt und schwarz, bleibt aber stehen |
| Ziegel | 6 | Verrußt |
| Beton | 7 | Verrußt |
| Stahl | 9 | Verrußt erst unter Dauerfeuer |

- **Hitzequellen:** Explosion 4 (im 1,4-fachen Radius), Flammenstrahl 3,2 je Treffer, Laserstrahl 3,5, Laserimpuls 2, Brandbombe 8, Brandherd 1,6, brennendes Holz 1,5 und brennendes Laub 1,1 je Übertragung, die Aura ab Stufe 8 1,5 und ab Stufe 10 3,5.
- **Ausbreitung, langsam und begrenzt:** Ein brennender Würfel gibt seine Hitze an zufällige Nachbarn ab, bevorzugt nach oben – Laub 2,6-mal pro Sekunde, Holz 0,9-mal. Laub zündet sofort, darum brennt ein Baum in etwa fünf Sekunden ab. Holz braucht zwei Übertragungen kurz nacheinander; ein Holzhaus brennt deshalb nur dort weiter, wo mehrere Würfel nebeneinander brennen, und ein einzelner Funke geht meist wieder aus. Über Straßen, Stein und Glas springt Feuer nicht.
- **Zerstörung ist sichtbar:** Verbranntes ist weg oder verkohlt, was darauf stand, stürzt ein. Verrußte Würfel zählen als zerstört, geben Macht und tragen nicht mehr mit – ein Gebäude, das lange im Flammenstrahl steht, wird also schwarz und schwächer. Flammenwerfer, Feueratem, Brandbomben und Laser hinterlassen damit erkennbare Spuren, auch an Beton und auf der Straße.
- **Brennende Figur:** Ab Stufe 8 glüht der Kaputtmacher und versengt den Boden unter sich; ab Stufe 10 schlagen Flammen aus ihm, er zündet an, was er streift, und hinterlässt eine schwarze Spur.
- **Brandherde:** Wo nichts brennen kann, etwa im Krater einer Rakete im Betonturm, brennt 5 bis 12 Sekunden ein Brandherd mit Flammen und dichtem schwarzem Rauch; er versengt, worauf er steht.
- **Löschen:** Wasser löscht (Hydranten 11.7a, Feuerwehr 8.1). Gelöschtes Holz bleibt verkohlt stehen.
- **Abschaltbar:** „Feuer breitet sich aus“ in den Einstellungen; ohne Ausbreitung brennt nur, was direkt getroffen wird. Wie viele Würfel gleichzeitig brennen dürfen (150 bis 1 500), bestimmt die Detailstufe.
- **Staub:** Schwere Trümmer (ab 600 Würfeln) werfen beim Aufschlag sofort einen Staubstoß auf und hinterlassen meist eine helle Staubwolke, die 3 bis 6 Sekunden steht. Gibt ein Stockwerk nach, steigen über dem Grundriss drei solche Wolken auf, bei einem zerdrückten Gebäude zwei und dazu sieben Staubstöße. Staub ist hell (Mauerwerk), Rauch dunkel (Feuer). Abschaltbar („Staub- und Rauchwolken“).

### 11.7a Die Welt reagiert

Manche Dinge antworten, wenn sie zerstört werden, und wirken aufeinander (`reactions.js`):

| Was | Reaktion |
|---|---|
| **Hydrant** (an vier von fünf Kreuzungen der Großstädte, an gut jeder dritten in kleinen Orten) | Eine hohe Wasserfontäne für 9 bis 14 Sekunden; zum Ende lässt der Druck nach. Dazu Zischen |
| **Wasser** (Brunnen, Wasserturm – der ist jetzt gefüllt) | Ein kurzer Schwall von 2,5 Sekunden an der Bruchstelle |
| **Wasser trifft Feuer** | Jede Fontäne löscht alle 0,3 Sekunden, was im Umkreis von 15 m brennt; Brandherde werden zu Dampf |
| **Laternen, Scheinwerfer, Leuchtreklame** | Funkenregen und Knistern |
| **Autos** | Etwa jedes dritte hat Benzin im Tank und explodiert, wenn es zerstört wird – das kann Bäume und Markisen anzünden, die ein Hydrant daneben wieder löscht |

Höchstens acht Wasserquellen laufen gleichzeitig; neue an derselben Stelle verlängern die laufende.

### 11.8 Die Stadt räumt sich selbst auf

Lose Trümmer bleiben nicht ewig liegen. Jeder Würfel, der als Schutt zur Ruhe kommt, wird 30 Sekunden später geprüft: Hängt er mit weniger als 14 anderen Schuttwürfeln zusammen, verschwindet das Häufchen. Größere zusammenhängende Schutthaufen und alle größeren zurückgeschriebenen Bruchstücke bleiben als Ruinen stehen. Das hält die Zahl verstreuter Würfel – und damit Speicher und Zeichenaufwand – auch bei langem Spiel begrenzt, was besonders für den geplanten Idle-Modus wichtig ist.

### 11.9 Leistungsgrenzen

- Höchstens 36 Bruchstücke gleichzeitig, 9 000 Schuttwürfel, 3 000 Effektteilchen (schwache Geräte: 2 200 und 1 000), 900 brennende Würfel, 36 Brandherde.
- Die Haltprüfung darf pro Rechenschritt 700 000 Würfel anfassen, der Rest folgt im nächsten.
- Automatische Qualitätsanpassung: Über 26 ms pro Bild werden Schutt, Effekte und Auflösung reduziert, nie die Zerstörung selbst.

## 12. Technik

### 12.1 Grundsatz: keine Abhängigkeiten

| Bereich | Entscheidung |
|---|---|
| Plattform | Webbrowser, reine statische Dateien |
| Bibliotheken | Keine. Kein npm, kein Framework, keine Engine, kein CDN |
| Build-Schritt | Keiner (native ES-Module) |
| Grafik | WebGL2 direkt, eigener Voxel-Renderer |
| Physik | Eigenentwicklung |
| Ton | Web Audio API, vollständig erzeugt |
| Inhalte | Welten und Figuren aus Code, Symbole sind Emoji des Geräts |
| Netzwerk | Nach dem Laden keine Anfrage |
| Speicherstand | Nur lokal im Browser |
| Quellcode | Englisch, rund 4 500 Zeilen in 17 Modulen |

### 12.2 Netlify

- Veröffentlicht wird der Ordner `public/` unverändert (`netlify.toml`). Konzept und Prompts liegen außerhalb.
- `public/_headers` setzt eine Content-Security-Policy, die nur eigene Dateien erlaubt (mit Trusted Types), schaltet ungenutzte Gerätefunktionen ab und lässt den Browser jede Datei beim Server nachfragen, damit sich nach einem Update nie alte und neue Dateien mischen.
- **Impressum und Datenschutzerklärung** stehen in `public/impressum.html`, im Spiel jederzeit erreichbar über einen kleinen Textlink unter dem Macht-Ring. Das ist neben den Einstellungen die einzige Textstelle; die Regel „sprachfrei“ tritt hier hinter die gesetzliche Pflicht zurück. **Spielstand löschen:** Auf der Seite „Impressum & Datenschutz“ steht dort, wo die Speicherung erklärt wird, ein Knopf, der alles entfernt, was das Spiel im Browser gespeichert hat. Er ist über den Link im Spiel jederzeit zu finden, liegt aber auf einer eigenen Textseite und verlangt zwei Schritte (erst „löschen …“, dann „Ja, endgültig löschen“ – „Abbrechen“ ist vorausgewählt). Denselben Zweck erfüllt „Von vorn beginnen“ in den Einstellungen.
- Eingaben von außen – Adress-Parameter und der Spielstand im Browser – werden vor der Verwendung geprüft; Einzelheiten in der README, Abschnitt „Sicherheit“.

### 12.3 Speicher und große Welten

| Verfahren | Stand | Wirkung |
|---|---|---|
| Blöcke von 32³ Würfeln | vorhanden | Nur Betroffenes wird angefasst |
| Einheitliche Blöcke als ein Wert | vorhanden | Luft und massiver Boden kosten fast nichts |
| Ein Byte pro Würfel über eine gemeinsame Typ-Tabelle | vorhanden | 127 Würfelarten plus je eine Schutt-Variante |
| Bauplan statt Speicherstand | vorhanden | Welten werden in 0,3–0,4 s neu erzeugt, nichts wird gespeichert |
| Nur sichtbare Flächen | vorhanden | Verdeckte Würfelseiten entfallen |
| **Sichtbarer Ausschnitt** | **neu, vorhanden** | Auf Planeten haben nur die Blöcke innerhalb der Kappe ein Gitternetz; was hinter den Horizont fällt, wird aus dem Grafikspeicher entfernt und bei Rückkehr neu aufbereitet |
| Feste Vorräte | vorhanden | Schutt und Effekte erzeugen keinen Speichermüll |
| Lauflängen-Kodierung ferner Blöcke | offen | würde den Arbeitsspeicher großer Planeten etwa halbieren; für die Wolkenkratzer-Stadt am wichtigsten |
| **Zusammengefasste Flächen** | **neu, vorhanden** | Gleichartige, gleich beleuchtete Nachbarflächen werden zu einem Rechteck. Bauklotz-Zimmer: 18 000 statt 153 000 Flächen; Dorf: 1,8 statt 3,1 Millionen. Die leichte Farbabweichung von Würfel zu Würfel entsteht erst beim Zeichnen. Auf Planeten sind Rechtecke waagerecht höchstens 4 Würfel lang, sonst klaffen sie durch die Krümmung auseinander |
| **Haltprüfung mit Merkern pro Block** | **neu, vorhanden** | Merker gibt es nur für Blöcke, die eine Suche berührt hat – vorher zwei Bit für jeden möglichen Würfel der Welt (33 MB, bei 256 m Höhe wären es 134 MB gewesen) |
| Vereinfachte Ferne | offen | erlaubt eine größere sichtbare Kappe |

Gemessen (Arbeitsspeicher für die Würfel): Inseln 4 bis 7 MB, normale Planeten 50 bis 72 MB, Stadt 90 MB, Wolkenkratzer-Stadt 191 MB. Erzeugung 0,3 bis 0,8 s. Gezeichnet werden gleichzeitig 600 bis 2 900 Blöcke.

Nächste Größenstufe: 1 km Kantenlänge braucht die Lauflängen-Kodierung, sonst rund 400 MB für normale Planeten und fast 1 GB für die Wolkenkratzer-Stadt.

### 12.4 Geräte und Grafik-Regler

In den Einstellungen gibt es einen einzigen Regler „Schnell ⟷ Schön“ mit fünf Stufen. Niemand muss wissen, was sein Gerät kann: Ruckelt es, schiebt man nach links. Solange „Grafik automatisch wählen“ angehakt ist, nimmt das Spiel Stufe 2 auf Geräten mit Touch-Bedienung oder höchstens vier Prozessorkernen und sonst Stufe 4.

| Stufe | Planet | Sichtbare Kappe | Schuttwürfel | Effektteilchen | Bewohner | Einsatzkräfte | Staub, Rauch, Gischt | Brennende Würfel | Auflösung |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 256 m | 95 m | 1 200 | 500 | 25 % | 50 % | 35 % | 150 | 70 % |
| 2 | 256 m | 125 m | 2 200 | 1 000 | 40 % | 70 % | 60 % | 300 | 85 % |
| 3 | 512 m | 150 m | 5 000 | 2 000 | 70 % | 100 % | 80 % | 600 | 100 % |
| 4 | 512 m | 180 m | 9 000 | 3 000 | 100 % | 100 % | 100 % | 900 | 100 % |
| 5 | 512 m | 215 m | 14 000 | 5 000 | 130 % | 140 % | 130 % | 1 500 | 100 % |

Daneben lassen sich die teuren Effekte einzeln abschalten: Staub- und Rauchwolken, Feuerausbreitung, Einsatzkräfte, Bewohner, Kettenreaktionen. Unabhängig davon nimmt die automatische Anpassung (11.9) bei schlechter Bildrate weiter Teilchen und Auflösung zurück. Ein Wechsel der Stufe baut die Welt neu auf.

## 13. Bild, Ton und Oberfläche

**Bild:** Spielzeug-Look mit kräftigen Farben, Kantenabdunklung, Sonnenlicht, Himmelsverlauf, Dunst zur Ferne. Staub in Materialfarbe, Funken, Explosionsblitz, Feuerwerk.

**Ton:** Bruchklang je Materialfamilie, abhängig von der Größe des Ereignisses. Ein Einsturz klingt nach seinen Vorgängen: **Beton knackt**, wenn sich ein großes Teil löst; **Stahl ächzt** mit einem langen, schwankenden Ton, solange ein großes Teil fällt; beim Aufschlag **bröckelt Mauerwerk** in vielen kurzen Stößen auf einem tiefen Schlag, **Glasfassaden regnen** als Klirr-Schauer herab, Blech und Stahl scheppern, Holz kracht. Welche Geräusche fallen, richtet sich danach, woraus das Bruchstück tatsächlich besteht. Dazu Feuerknistern, das mit der Menge des Brennenden lauter wird, Schritte, Brüllen, Rufe der Bewohner, Fanfaren.

**Oberfläche:** unten Werkzeugleiste, rechts unten Springen und Brüllen, oben Welt-Zähler mit den Sternen der Alarmstufe, links oben Macht-Ring mit Stufe und darunter die Einblendungen der Erfolge, rechts oben Weltauswahl, Selbstspiel, Erfolge und Einstellungen.

**Einstellungen** (Zahnrad, ein gewöhnlicher Knopf; neben dem Impressum-Link der einzige Ort mit Text): Lautstärke, Grafik-Regler (12.4), Staub und Rauch, Feuerausbreitung, Einsatzkräfte, Kamerawackeln, Bewohner, Kettenreaktionen, Selbstspiel nach 2 Minuten, alles freischalten, Vollbild, freie Flugkamera – und **„Von vorn beginnen“**. Früher öffnete sich das Zahnrad erst nach drei Sekunden Halten und war blass dargestellt; das wirkte wie abgeschaltet und ließ sich nicht entdecken.

**Von vorn beginnen.** Auf jedem Gerät lässt sich die Progression neu starten: Der Knopf löscht Stufen und Macht aller Figuren, abgeschlossene Welten, Sticker, Erfolge und Einstellungen auf diesem Gerät, und das Spiel beginnt wieder bei Stufe 1. Er verlangt zwei Schritte („Von vorn beginnen …“, dann „Ja, alles löschen“) und steht zusätzlich auf der Seite „Impressum & Datenschutz“.

## 14. Nächste Schritte

Reihenfolge nach Wirkung auf das Spielgefühl:

| # | Schritt | Warum |
|---|---|---|
| 1 | Spielen lassen und Balance nachziehen | Wachstumstempo, Werkzeugstärken und Sprung sind bisher geschätzt |
| 2 | Feinabstimmung der Stabilität | Die Schwellen je Material (11.4) sind geschätzt |
| 3 | Bruchstücke stoßen einander | Trümmer stapeln sich glaubwürdiger |
| 4 | Fahrender Verkehr, Vögel, Hunde | Mehr Leben |
| 5 | Schlagschatten | Tiefe und Größe werden lesbarer |
| 6 | Lauflängen-Kodierung, vereinfachte Ferne | Voraussetzung für 1-km-Planeten und größere Monster |
| 7 | Idle-Modus verfeinern: Kamerafahrten, Wechsel der Figur, klügere Zielwahl | Der Modus ist da (Abschnitt 17); ob er beim Zusehen trägt, muss sich im Einsatz zeigen |
| 8 | Zeitlupe, Zurückspulen; Feuer auch an fallenden Bruchstücken | Vom Auftraggeber als spätere Optionen gewünscht |
| 9 | „Welt wehrt sich“ | Zuschaltbare Herausforderung, klar nachrangig |

## 15. Entscheidungen

**Getroffen:** Planet als gekrümmte Rundum-Welt · Bewohner kommen nie zu Schaden · Maus und Tastatur haben Vorrang · Macht bleibt dauerhaft · Wachstum schaltet Werkzeuge frei · 90 % gelten als zerstört · Ziffern in Zählern sind in Ordnung · Wachstum ohne feste Obergrenze · freie Weltauswahl · hohe Schwerkraft.

**Offen:**

| # | Frage | Meine Empfehlung |
|---|---|---|
| 1 | **Wie groß ist „groß genug“?** 512 m sind umgesetzt. 1 km ist machbar, kostet aber die Arbeiten aus 12.3. | Erst spielen; 512 m bedeuten 236 bis 848 Gebäude pro Planet |
| 2 | **Soll die Weltauswahl für das Kind vereinfacht werden?** Sie enthält jetzt Welten, Figur, Stufe und Mischer auf einer Seite. | Mischer hinter einen eigenen Würfel-Knopf legen, sobald es stört |
| 3 | **191 MB für die Wolkenkratzer-Stadt** sind für einen Rechner in Ordnung, für ältere Geräte viel. Lauflängen-Kodierung vorziehen? | Ja, sobald die Welt auf einem eurer Geräte ruckelt oder nicht lädt; auf Handys ist sie schon jetzt nur 256 m groß (51 MB) |
| 4 | **Sprunghöhe mit Halten steuern** (kurz tippen = kleiner Hüpfer)? | Nein, ein Sprung ist für einen 5-Jährigen leichter zu lernen |

## 16. Umsetzungsstand (9. Oktober 2026, Entwurf 10)

**Starten:** im Projektordner `python3 serve.py` ausführen und `http://localhost:8000` öffnen. Der mitgelieferte Server verbietet dem Browser das Zwischenspeichern; mit einem gewöhnlichen Dateiserver kann nach einem Update eine alte Quelldatei neben einer neuen im Cache bleiben, und das Spiel bleibt mit „… is not a function“ stehen.

**Testhilfen in der Adresse** (speichern keinen Fortschritt): `?world=blocks|garden|house|toyland|village|park|city|factory|skyline|random`, `?stage=1…`, `?unlock=1`, `?tool=rocket`, `?quality=low`, `?fly=1`.

**Vorhanden:** alles, was in den Abschnitten 4 bis 13 beschrieben ist, mit den dort genannten Zahlen – außer den folgenden Punkten.

**Stand der Neuerungen aus Entwurf 9:** Sichtfenster und Hydranten-Fontäne (samt Löschen eines Brandherds) sind auf Standbildern geprüft, die Progression über Messläufe je Stufe (5.3). Das Zerdrücken kleiner Gebäude, das tote Gewicht, die Staubwolken, die Funken an Lampen, explodierende Autos und das Zischen des Wassers liefen in den Messläufen fehlerfrei mit, wurden aber nicht einzeln begutachtet. Ein durchgehender Lauf von Stufe 1 bis 9 mit den neuen Schwellen wurde nicht gemessen.

**Stand der Neuerungen aus Entwurf 10:** In automatisierten Durchläufen ohne Fehler gelaufen und auf Standbildern gesehen: Einblendung und Liste der Erfolge, Sterne der Alarmstufe, Polizeiautos, Feuerwehr, Reporter-, Lösch- und Militär-Hubschrauber, Leuchtspur, das Anbauteil des Fliegers bei gerader Flugrichtung, die Einstellungen mit Regler. Gemessen: Ein angezündeter Baum brennt in rund fünf Sekunden ab (43 Würfel) und das Feuer erlischt von selbst; in 55 Sekunden Selbstspiel auf Stufe 8 in der Stadt wurde Alarmstufe 5 erreicht. **Nicht begutachtet:** wie die Fahrzeuge in Bewegung wirken (ob sie sich festfahren), das Löschen durch die Feuerwehr im Bild, der Überflug der Kampfflieger, Ruß an Beton unter dem Flammenwerfer, alle neuen Töne, die Darstellung auf dem Handy, und ob Detailstufe 1 auf einem schwachen Gerät wirklich flüssig läuft. Die Schwellen der Erfolge sind geschätzt; im Test fielen bei einem Start auf Stufe 6 in 50 Sekunden 41 Erfolge – von Stufe 1 an verteilt es sich, aber das ist nicht gemessen.

**Fehlt oder weicht ab:**

| Punkt | Stand |
|---|---|
| Stabilität | Vorhanden als Stockwerks-Bilanz (11.4); keine echte Statik: Ein Gebäude, das nur noch an einer Ecke hängt, fällt, weil dem Stockwerk Tragkraft fehlt, nicht weil es kippt |
| Bruchstücke untereinander | Stoßen nur mit der Welt zusammen. Die Wucht-Regel (11.6a) vergleicht Massen, rechnet aber keinen echten Stoß |
| Verkehr und Tiere | Fehlen; Autos stehen |
| Geister-Vorführung | Der Geist macht die Bewegung vor, zerstört dabei aber nichts zur Vorschau |
| Schatten | Keine Schlagschatten |
| Wolkenkratzer-Stadt unter Volllast | Im Test mit Stufe-9-Monster, Dauerraketen und 5 400 fliegenden Würfeln 18 bis 19 ms pro Bild, also knapp unter 60 Bildern pro Sekunde; die Qualitätsanpassung greift dann ein |
| Brüllen vor Stufe 9 | Die Taste R brüllt schon, aber ohne Wirkung und ohne Knopf |
| Speicherverfahren | Drei Punkte offen, siehe 12.3 |
| Idle-Modus | Vorhanden, siehe Abschnitt 17; nur automatisiert und kurz geprüft, nicht über Stunden |
| Zeitlupe, Zurückspulen, „Welt wehrt sich“ | Nicht begonnen; feste Zeitschritte und Akteur-System sind als Vorbereitung da |
| Feuer in Hochhäusern | Beton und Stahl brennen nicht, sie verrußen nur; Glas platzt in der Hitze. Ein Feuer frisst sich also nicht durch einen Betonturm |
| Verkehr | Nur Einsatzfahrzeuge fahren; die übrigen Autos stehen. Die Fahrzeuge kennen keine Straßenkarte, sie tasten sich am Raster entlang |

**Geprüft in diesem Stand:** alle 16 Angriffe der vier Figuren in beiden Fassungen liefen in automatisierten Durchläufen ohne Fehler; Standbilder zeigen die Modelle von Roboter und Panzer, den Wirbelschlag des Dinos, einstürzende Hochhäuser nach einem Sprint durch die Stadt (15 Gebäude in 7 Sekunden auf Stufe 7, davon mehrere durch Kettenreaktion) und kreisende Hubschrauber. Bei diesem Massen-Einsturz lag die Bildzeit kurz bei 26 ms. **Nicht begutachtet:** die Animationen in Bewegung – ich sehe nur Standbilder – und das Rotorgeräusch.

**Geprüft** (automatisierte Browser-Durchläufe mit Bildschirmfotos auf dem Entwicklungsrechner, dabei 60 Bilder pro Sekunde): alle Welttypen erzeugen und zeichnen, Laufen über einen Planeten mit Nachladen der Oberfläche, Faust, Raketen, Stampfen und Sprung, Wachstum, Weltauswahl, Welt-Abschluss, Handy-Bildformat, Betrieb unter den Sicherheits-Headern, Einsturz und Kippen unter der neuen Schwerkraft, Trümmerfontänen bei Faust, Stampfen, Dynamit und Raketen, Wolkenkratzer-Stadt aus Straßenhöhe mit Stufe 1 und als Riese mit Stufe 9, Start im Zentralpark, Allee und Ladenzeile, Schwanzschlag im Bauklotz-Zimmer, Sprung, Feuer und Rauch nach Raketen im Garten.

**Nicht geprüft:** Spielen von Hand, **sämtlicher Ton** (die neuen Einsturz- und Feuergeräusche sind erzeugt, aber von niemandem angehört worden), echtes Handy, echtes Gamepad, echte Touch-Bedienung, schwächere Rechner. Greifen/Werfen, Schwert, Laserstrahl und Brüllen liefen fehlerfrei durch, ihre Wirkung wurde aber nicht einzeln begutachtet. Die Spielbalance ist geschätzt.

## 17. Idle-Modus: das Spiel spielt sich selbst

**Zweck.** Das Spiel soll als bewegter Hintergrund laufen können, etwa auf einem zweiten Bildschirm oder während einer Vorlesung. Dahinter steht die Vermutung, dass Veränderung, der man zusehen kann, beruhigt und anregt – beim Aufbau (Fördeland) wie bei der Zerstörung.

**Ein und aus.**

| | |
|---|---|
| Einschalten | Popcorn-Knopf oben rechts, Taste I, oder `?idle=1` in der Adresse |
| Ausschalten | jede eigene Eingabe: Taste, Klick ins Spiel, Berührung, Gamepad. Mausbewegung allein schaltet nicht ab |
| Von selbst | optional nach 2 Minuten ohne Eingabe (Einstellungen, standardmäßig aus) |
| Bildschirm | bleibt im Idle-Modus wach, soweit der Browser es erlaubt |

**Was der Autopilot tut.** Er benutzt dieselbe Steuerung wie ein Spieler und kann nichts, was ein Spieler nicht kann.

1. Er wählt eines der drei nächsten Gebäude, die noch stehen – und etwa jedes dritte Mal stattdessen ein weiter entferntes (70 bis 230 m), damit die Figur reist und die ganze Karte zu sehen ist. Unterwegs trampelt sie nieder, was im Weg steht.
2. Er sucht daran eine Stelle, die noch fest ist – für Nahangriffe in Reichweite der Figur, für Fernangriffe irgendwo am Gebäude – und sucht alle ein bis zwei Sekunden eine neue.
3. Er läuft hin (weit entfernt im Sprint) und zielt auf die Stelle. Auch Figuren mit Fernangriff gehen bis auf wenige Körperlängen heran und schlendern beim Feuern weiter auf ihr Ziel zu; der Flieger hält sich knapp über Dachhöhe, feuert im Anflug und wirft Bomben, wenn er nah ist.
4. In Reichweite greift er an: zu 60 % schnell, zu 40 % stark.
5. Alle 5 bis 11 Sekunden wechselt er auf einen anderen freigeschalteten Angriff, damit alle zu sehen sind.
6. Alle 9 bis 19 Sekunden springt er aus Freude – mit Doppelsprung und Salto, in sechs von zehn Fällen mit anschließender Stampfattacke, manchmal mit Gebrüll.
7. Kommt er nicht voran, springt er; hilft das zweimal nicht, nimmt er ein anderes Gebäude. An einem Gebäude bleibt er höchstens 30 Sekunden.
8. Sieben Sekunden nach 100 % – oder nach 12 Minuten in derselben Welt – reist er in die nächste Welt der Liste.

Macht und Stufen wachsen dabei ganz normal und werden gespeichert. Figur und Stufe bleiben, wie der Spieler sie gewählt hat. Vorführ-Hinweise und Geister-Monster sind im Idle-Modus ausgeblendet.

**Zurückgelegter Weg** in 36 Sekunden Selbstspiel: Roboter in der Wolkenkratzer-Stadt 230 m (12 Gebäude), Panzer im Dorf 370 m (28 Gebäude), Dino in der Stadt 860 m (25 Gebäude). Vor dieser Änderung blieben Roboter und Panzer praktisch stehen.

**Gemessen** (je 30 bis 45 Sekunden Selbstspiel, älterer Stand): Bauklotz-Zimmer mit Dino ab Stufe 3: 68 % der Welt, dabei auf Stufe 4 gewachsen. Dorf mit Roboter auf Stufe 5: 12 Gebäude. Stadt mit Flieger auf Stufe 5: 3 Gebäude. Wolkenkratzer-Stadt mit Panzer ab Stufe 6: 31 Gebäude, dabei brach die Bildrate unter der Last der Einstürze zeitweise auf unter 30 Bilder pro Sekunde ein.

**Grenzen.**
- Auf Stufe 1 in der Wolkenkratzer-Stadt passiert lange wenig: Die Figur braucht eine Viertelminute aus dem Park heraus und kratzt dann mit schwachen Schlägen an Beton. Für den Hintergrundbetrieb lohnt eine höhere Stufe.
- Ohne vorherige Eingabe (Start über `?idle=1`) bleibt das Spiel stumm, weil Browser Ton erst nach einer Nutzeraktion erlauben. Beim Start über den Knopf ist der Ton an.
- In einem Tab, der nicht sichtbar ist, hält der Browser das Spiel an.
- Die Kamera folgt wie im normalen Spiel; es gibt keine eigenen Kamerafahrten.

## 18. Erfolge

117 kleine Ziele, jedes eine Schwelle auf einem Zähler: zerstörte Würfel insgesamt und nach Material, Gebäude und Hochhäuser, Einstürze, zerdrückte Häuser, die längste Kettenreaktion, mehrere Gebäude in zehn Sekunden, zerstörte Welten (auch jede einzeln), erreichte Stufen (insgesamt, je Figur, mit allen Figuren), Explosionen, Brände, Hydranten, Lampen, umgeworfene Polizei- und Feuerwehrautos, abgeschossene Reporter-, Militär-Hubschrauber und Kampfflieger, die Alarmstufe, Sprünge, Saltos, Stampfbomben, Brüller, Rempler, zurückgelegte Strecke, durch die Luft gewirbelte Bewohner, Angriffe, gesammelte Macht, Zeit im Selbstspiel und Spielzeit, Sticker und die Zahl der Erfolge selbst.

- **Einblendung:** Wird ein Erfolg erreicht, schiebt sich links unter dem Macht-Ring für gut vier Sekunden eine Karte herein: großes Symbol, Name, ein Satz dazu, ein Pokal an der Ecke, dazu ein kurzer heller Klang. Höchstens zwei Karten zugleich; warten mehr als drei, bleibt jede nur knapp zwei Sekunden.
- **Lesen ist freiwillig.** Die Karten sind der einzige Text im Spielfeld. Wer nicht lesen kann, sieht Symbol und Pokal und hört den Klang; für das Spielen braucht man den Text nie.
- **Liste:** Der Pokal-Knopf oben rechts öffnet alle Erfolge. Erreichte sind farbig, die übrigen grau mit einem Balken, der zeigt, wie weit es noch ist.
- **Zähler** werden in der Simulation nur hochgezählt und zweimal pro Sekunde ausgewertet. Sie gelten für alle Figuren gemeinsam, liegen im Spielstand und werden mit „Von vorn beginnen“ gelöscht. Auch das Selbstspiel sammelt Erfolge.
- Die Liste steht in `achievements.js`; ein neuer Erfolg ist eine Zeile.

# Kaputtmacher – Spielkonzept (Entwurf 12)

Status: in Umsetzung. Dieser Entwurf nennt überall konkrete Zahlen; sie entsprechen dem Stand im Code. Was fehlt oder abweicht, steht in Abschnitt 16.

**Nachtrag 3 zu Entwurf 12:** Heimatwelten für alle fünf Figuren (7.4b); Klettern mit festen Griffen für Hände und Füße, doppelt so schnell (4.2).

**Nachtrag 10 zu Entwurf 12:** Superstrukturen mit Knotenpunkten (Bahnhöfe, Spiral-Auffahrten, Plattformtürme, Lifttürme, Aussichts- und Wachtürme, Kuppeln …), die auch auf Dächern stehen; Netze dürfen in andere Netze münden, Pfeiler stützen sich auf überbrückte Dächer; Neon-Megacity viel dichter vernetzt; Vergnügungspark mit viel mehr Höhe (7.4c, 7.4).

**Nachtrag 9 zu Entwurf 12:** Beim Bagger tauschen Hammer (jetzt Stufe 3) und Schwenken (jetzt Stufe 5) die Plätze; der Hammer ist deutlich stärker und erschüttert Gebäude (9.2).

**Nachtrag 8 zu Entwurf 12:** Lange Fahrzeuge folgen der Krümmung des Planeten (7.2).

**Nachtrag 7 zu Entwurf 12:** eine sechste Figur, der Bagger, mit beweglichem Arm, vier Angriffen am Ende des Arms und der Großbaustelle als Heimatwelt (9.2, 7.4b).

**Nachtrag 6 zu Entwurf 12:** Superstrukturen verbinden die Bauten der Welten zu Netzen über mehrere Höhenebenen: Hochbahnen, Skybridges, Superhighways, Lianen, Hängebrücken, Riesenachterbahnen und mehr (7.4c).

**Nachtrag 5 zu Entwurf 12:** Garten, Wohnstraße, Spielzeugland und Parklandschaft gestrichen; die Heimatwelten stehen vorn, und jede Figur beginnt in ihrer (7.4); Ritterburgen als echtes Mittelalter mit Rittern, Bauern und Burgfrauen (7.4); Winterwelt, Flughafen und Hafen mit viel mehr Höhe (7.4); weniger Staub (11.7); Festung Titan als Wüstenfestung mit Mauerringen, Vorposten, feuernden Geschützen und einem Munitionsdepot, das in die Luft fliegt (7.4b); der Macht-Vorrat fasst eine ganze Stufe (5.1).

**Nachtrag 4 zu Entwurf 12:** Minimap (13); Stufe N dauert N Minuten, das Tempo ist nach oben begrenzt (5.1, 5.3); Waffen des Roboters neu geordnet, das Schwert zuerst (9.2); die Neon-Megacity wirklich bei Nacht mit Start an einer Kreuzung, Urzeit-Nekropole und Babel ohne Straßenlaternen, Autos und Polizei, dafür mit eigenen Bauten, Bewohnern und Tieren (7.4b).

**Neu gegenüber Entwurf 11:** Klettermodus an Wänden (4.2), Welten mit eigenen Naturgesetzen und Meeresbewohnern (11.1a, 8.2), Großgrundstücke mit Wahrzeichen, Hafenbecken, Stadtviertel, eingerichtete Häuser und Büros, versteckte Fundstücke (7.4a), Standfestigkeit schlanker Bauten (11.4a), Musik, die der Handlung folgt (13a), gezieltes Abschießen von Fliegendem (8.1), der Flieger prallt ab (9.2), der Affe hebt immer etwas auf (9.2), die Feuerwehr lässt Bränden Zeit (8.1).

**Neu in Entwurf 11 war:** Festhalten und Klettern an Hauswänden (4.2), fahrender Verkehr auf einem Straßennetz (8.2), acht neue Welten (7.4), sanft einsetzende Kettenreaktionen mit neuen Schwellen (5.3, 11.6), Dachlandung ohne Krater (4.2), Spielprotokoll und Spielstand als Datei (13), ruhigeres Selbstspiel (17), Testwerkzeuge im Projekt (16). Der Verlauf aller früheren Entwürfe steht in [VERLAUF.md](VERLAUF.md).

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

- Dritte-Person-Ansicht von schräg hinten. Sechs Figuren: Dino, Gorilla, Roboter, Panzer, Bagger, Flieger. Sie sehen nicht nur anders aus, sie zerstören grundverschieden (Abschnitt 9).
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
| Minimap ein/aus | M, Knopf 🗺️ | – | Knopf 🗺️ im Menü |
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
| **Sprung mit Richtung** | Wer beim Springen eine Richtung hält, fliegt in diese Richtung: beim ersten Sprung mit dem **2-Fachen**, nach dem zweiten Sprung mit dem **3,4-Fachen des Lauftempos**, im Sprint jeweils das 1,75-Fache davon. Kleine Figuren laufen langsam und sind nur kurz in der Luft; für sie gilt ein Mindesttempo von 12 (erster Sprung) und 21 (zweiter Sprung) Welt-Einheiten pro Sekunde. Gemessen: Doppelsprung ohne Sprint rund 40 Würfel auf Stufe 1, 48 auf Stufe 2, 60 auf Stufe 3 – eine normale Straße ist 8, eine Allee 16 Würfel breit, dazu die Gehwege. Ein einfacher Sprung trägt 15 bis 27 Würfel. Ohne Richtung geht es senkrecht hoch; die Stampfattacke (dritter Druck) bricht den Flug ab. Je höher der Absprungpunkt, desto länger der Flug. Es ist kein Angriff: Im Flug bricht nur, was auch beim Laufen bricht |
| Dachkante | In der Luft wird eine Kante bis zu einer halben Körperhöhe über den Füßen noch gefasst – ein Sprung, der ein Dach fast erreicht, landet darauf |
| **Festhalten an der Wand** | Ein Sprung, der an der Wand eines Gebäudes endet, reißt nicht einfach ein Loch hinein: Die Figur **krallt sich fest** (Arme hoch, Beine angezogen) und ist damit im **Klettermodus**. Beim Zupacken bricht ein Stück heraus – eine Delle bei einer kleinen Figur, ein richtiges Loch bei einer großen (Radius 9 % der Körperhöhe plus 0,8 Würfel) |
| **Klettern** | Dieselbe Steuerung wie am Boden, nur an der Wand: **vorwärts = hinauf, rückwärts = hinunter, links und rechts = seitlich an der Wand entlang**. Am Handy ist das der Stick. An einer Hausecke geht es von selbst um die Ecke herum auf die nächste Seite, in einer Innenecke auf die Querwand. Oben zieht sich die Figur aufs Dach oder auf einen Sims; unten steht sie wieder auf dem Boden. Tempo: 8 + 2,2 × Körperhöhe Würfel pro Sekunde, gedrosselt, während eine Hand umgreift. Die Kamera stellt sich hinter die Figur |
| Klettermodus verlassen | Nur auf drei Arten: Es gibt nichts mehr zum Greifen (die Wand ist weg), die Füße stehen (Boden, Dach, Sims), oder man drückt die Sprungtaste. Wer rennt (Umschalt), krallt sich gar nicht erst fest, sondern bricht wie bisher durch die Wand |
| Sprung von der Wand | Die Sprungtaste stößt die Figur **nach oben und ein Stück nach hinten** ab (2,4 Körperhöhen hoch). Wer danach wieder nach vorn drückt, landet weiter oben erneut an der Wand; der Doppelsprung ist danach wieder frei |
| Gewicht | Ab Stufe 3 reißen die Krallen beim Klettern jede Sekunde weiter Stücke heraus. Gibt die Wand nach, fällt die Figur |
| Angriff | An der Wand hängend kann man zuschlagen |
| Wer klettert | Alle Figuren außer Panzer und Flieger, auch im Selbstspiel (dort klettert die Figur einfach hinauf). An Bäumen, Laternen und Kleinkram hält sich niemand fest |
| **Panzer** | Springt nicht, er hüpft: 0,7 Körperhöhen hoch, ohne Doppelsprung, ohne Stampfattacke, ohne Schub in der Luft und ohne Krater bei der Landung. Das reicht, um aus einer selbst gegrabenen Kuhle wieder herauszukommen |
| Landung | Springen kann das Monster von Anfang an. Ab Stufe 2 ist jede Landung am Boden ein Stampfer – aber einer unter vielen Angriffen, nicht der stärkste: ein Krater von rund einem Drittel der Körperbreite (Radius 0,28 Körperhöhen plus 0,5 m, Stärke 3 + 0,9 × Stufe) und ein mäßiger Stoßring. Mit Stufe 1 gibt es nur eine Staubwolke. **Auf einem Dach** gibt es den Krater nur, solange die Sprungtaste bei der Landung gehalten wird |

Damit sich ein 50 Meter hohes Monster nicht träge anfühlt, wächst seine eigene Fallbeschleunigung mit der Körpergröße; sie ist außerdem doppelt so hoch wie die der Trümmer. Beim Fallen wirkt das 1,7-Fache, beim Aufsteigen ohne gedrückte Taste das Dreifache.

### 4.3 Kamera

- Abstand 3,4 Körperhöhen. Auf Planeten richtet sich die Neigung nach der Größe: Ein kleines Monster zwischen hohen Häusern blickt fast waagerecht und an den Fassaden hoch, ein Riese blickt von oben auf seinen Planeten. Mit der rechten Maustaste lässt sich die Neigung jederzeit nachstellen.
- Zum Rand des sichtbaren Ausschnitts hin löst sich alles im Horizontdunst auf, damit hohe Türme nicht plötzlich auftauchen.
- **Sichtfenster:** Was zwischen Kamera und Monster steht (Hochhäuser, Bäume), wird in einem großen Kreis um das Monster ausgeschnitten. Der Kreis reicht gut zwei Körperhöhen plus 8 m in jede Richtung, damit nicht nur die Figur, sondern auch ihre Umgebung frei zu sehen ist. Die inneren 60 % sind ganz offen, zum Rand hin wird das Hindernis in vier Rasterstufen dichter, damit keine harte Kante entsteht.
- **Zielen durch das Sichtfenster:** Was das Sichtfenster ausblendet, fängt auch den Zeiger nicht mehr ab. Man zielt auf das, was man sieht, und der Schlag geht dorthin – auch auf die andere Seite der Figur, wenn die Kamera hinter einer Hauswand steht.
- Flugkamera: Höhe begrenzt, nie im Boden oder in Gebäuden.

## 5. Macht und Wachstum

### 5.1 Der Kreislauf

Zerstören → Macht sammeln → wachsen → Größeres zerstören können → mehr Macht.

- Jeder zerstörte Würfel gibt Macht nach Material (7.3). Ein vollständig zerstörtes Gebäude gibt 25 % seines Werts als Bonus.
- **Was nur mitfällt, zählt weniger:** Würfel, die das Monster selbst wegschlägt, zählen voll. Würfel, die bei einem Einsturz ihren Halt verlieren oder im nachgebenden Stockwerk zerdrückt werden, zählen nur zu 20 %. Ohne diese Regel brachte ein einziger gefällter Turm samt Kettenreaktion mehrere Stufen auf einmal.
- **Macht ist sichtbar.** Wo etwas zerbricht, platzen leuchtende Kugeln mit Lichthof heraus, fliegen eine Drittelsekunde frei auseinander und ziehen dann zum Monster. Ihre Größe wächst mit dem Monster (0,7 + 4,5 % der Körperhöhe), damit sie auch neben einem Riesen auffallen. Ist ein Gebäude vollständig zerstört, schleudert es 10 bis 28 große Kugeln auf einmal heraus; gibt ein Stockwerk nach, sind es acht.
- **Macht kommt an.** Erreicht eine Kugel das Monster, leuchtet es kurz golden auf, ein Ton steigt an, und ein Funke fliegt vom Monster zum Macht-Ring oben links, der dabei zuckt und sich füllt. So ist zu sehen, wohin die Macht geht und was sie bewirkt.
- **Macht fließt im Tempo der Stufe** auf den Ring (5.3): höchstens so schnell, dass Stufe N N Minuten dauert; was darüber hinaus anfällt, wartet in einem Vorrat (bis zu einer ganzen Stufe), Überschuss darüber verfällt.
- Ist der Ring voll, folgt der **Wachstumsmoment**: Brüllen, Aufleuchten, sichtbares Wachsen, Druckwelle, Fanfare. Zwischen zwei Wachstumsmomenten liegen mindestens 2 Sekunden, damit jeder einzeln wirkt.
- Macht auf dem Ring geht nie verloren, auch nicht beim Weltwechsel – außer man beginnt in den Einstellungen bewusst von vorn. (Nur was über den vollen Vorrat hinaus anfällt, verfällt; der Vorrat selbst gilt nur für die laufende Sitzung und Figur.)

### 5.2 Woran man Macht sieht

Größe · detailreicheres Modell je Stufe (Rückenstacheln ab 2, Hörner ab 4, glühende Augen ab 5, Schulterpanzer ab 6, Leuchtstreifen und Aura ab 8) · tiefere Stimme · Schritte, die ab Stufe 4 die Kamera beben lassen und ab Stufe 6 Dellen hinterlassen · stärkere und größere Werkzeuge.

### 5.3 Stufen

| Stufe | Höhe | Macht bis zur nächsten | Neu freigeschaltet |
|---|---|---|---|
| 1 | 1,8 m (Auto) | 280 | Laufen, Rennen, Springen, erster Angriff (schnell und stark) |
| 2 | 2,9 m (Garage) | 1 600 | Landung wird zum Stampfer |
| 3 | 4,7 m (Haus) | 8 500 | zweiter Angriff; **Kettenreaktionen** setzen schwach ein (abschaltbar) |
| 4 | 6,8 m | 25 000 | Kettenreaktionen werden mit jeder Stufe stärker |
| 5 | 10,8 m | 850 000 | dritter Angriff |
| 6 | 16 m (Wohnblock) | 2 800 000 | Schulterpanzer |
| 7 | 25 m (Kirchturm) | 3 200 000 | vierter Angriff |
| 8 | 36 m (Hochhaus) | 5 600 000 | Leuchtstreifen, Aura |
| 9 | 54 m | × 1,6 je Stufe | Brüllen als Waffe |
| 10+ | × 1,25 je Stufe | × 1,6 je Stufe | mehr Wucht |

- **Stufe N dauert N Minuten:** die erste eine Minute, die zweite zwei, die dritte drei und so weiter. Schneller geht es nie: Was zerstört wird, kommt zuerst in einen **Vorrat**, und aus ihm fließt die Macht höchstens so schnell auf den Ring, dass eine Stufe N Minuten braucht (`PACE` in `main.js`). Der Vorrat fasst eine ganze Stufe (anfangs waren es 30 %; in der Festung, wo Zerstörung in Schüben kommt, ging dabei der größte Teil verloren); ein großer Einsturz füllt den Ring also eine Weile weiter, statt die Figur mehrere Stufen auf einmal wachsen zu lassen. Die Kugeln fliegen weiterhin sofort. Die Schwellen sind so gesetzt, dass stetige Zerstörung dieses Tempo bei den meisten Figuren erreicht. Gemessen im Selbstspiel in der Wolkenkratzer-Stadt, Macht pro Sekunde (Dino / Gorilla / Roboter / Panzer / Flieger): Stufe 1: 6 / – / 6 / 56 / 13, Stufe 2: 28 / 12 / 25 / 38 / 107, Stufe 3: 52 / 46 / 225 / 644 / 254, Stufe 4: 136 / 95 / 1 100 / 5 300 / 320, Stufe 5: 5 700 / 2 900 / 4 100 / 6 800 / 5 800, Stufe 8: 37 000 / 11 600 / 21 000 / 15 000 / 21 500. Sieben Minuten Selbstspiel ab Stufe 1 ergaben (Sekunden für Stufe 1, 2, 3): Dino 62, 120, 184; Panzer 74, 120, 180; Gorilla 123, 215; Roboter 71, 288 – danach wurden die Schwellen der Stufen 1 und 2 für Gorilla und Roboter noch gesenkt (nicht nachgemessen). Die langsamste Figur einer Stufe braucht bis etwa anderthalbmal so lange. Die Messwerte streuen stark; das Spielprotokoll in den Einstellungen (13) zeigt, wie lange die Stufen im echten Spiel dauern.
- Erreichte Stufen bleiben erhalten. In der Weltauswahl kann jede bereits erreichte kleinere Stufe gewählt werden.
- Grenze: Das Monster wird bei 92 % der Welthöhe gedeckelt. Das sind 58 m auf normalen Planeten, 118 m in der Stadt und 235 m in der Wolkenkratzer-Stadt – dort ist Platz bis etwa Stufe 15.

### 5.4 Jede Figur wächst für sich

Dino, Gorilla, Roboter, Panzer, Bagger und Flieger haben jeweils eine eigene Stufe und eigene Macht. Wer mit dem Dino Stufe 7 erreicht hat, beginnt mit dem Roboter trotzdem bei Stufe 1 und schaltet dessen Angriffe einzeln frei. Alle sechs Figuren sind von Anfang an wählbar; in der Weltauswahl zeigt jede ihre Stufe. Beim Wechsel wird die Figur sofort mit ihrer eigenen Größe weitergespielt. Ein Spielstand aus der Zeit davor wird der zuletzt gespielten Figur gutgeschrieben.

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

**Planet** – eine Welt ohne Rand. Intern ein flaches Gitter, dessen Ränder nahtlos ineinander übergehen; erst beim Zeichnen wird es um das Monster herum nach unten gekrümmt. Die Physik rechnet weiter im geraden Gitter. Gekrümmt wird jede Ecke einzeln, auch bei allem, was aus beweglichen Quadern besteht (Fahrzeuge, Bewohner, Trümmer): Früher wurde nur der Mittelpunkt jedes Quaders verschoben, und ein langer Wagenkasten (Bus, Löschzug) lag starr waagerecht, während der Boden unter ihm abfiel – er schien auf einer Achse zu fahren, die andere in der Luft (Nachtrag 8).

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
| 🦕 **Urzeit-Nekropole** (Heimat des Dinos) | Planet, 144 m hoch | 512 m | 50 cm | rund 4 500 000 | rund 230 | 6 |
| 🏛️ **Babel** (Heimat des Affen) | Planet, 160 m hoch | 512 m | 50 cm | rund 3 200 000 | rund 410 | 7 |
| 🌃 **Neon-Megacity** (Heimat des Roboters) | Planet, 176 m hoch | 512 m | 50 cm | rund 9 400 000 | rund 690 (mit Verbindungen und Knoten) | 8 |
| 🏰 **Festung Titan** (Heimat des Panzers) | Planet, 128 m hoch | 512 m | 50 cm | rund 1 600 000 | rund 80 | 7 |
| ☁️ **Wolkenwerft** (Heimat des Fliegers) | Planet, 128 m hoch | 512 m | 50 cm | rund 2 300 000 | rund 700 | 6 |
| 🚧 **Großbaustelle** (Heimat des Baggers) | Planet, 128 m hoch | 512 m | 50 cm | rund 6 200 000 | rund 400 | 3 |
| 🌆 **Wolkenkratzer-Stadt** | Planet, 256 m hoch | 512 m | 50 cm | 9 100 000 | 249 | 1 |
| 🧱 Bauklotz-Zimmer | Insel | 64 m | 20 cm | 122 000 | 25 | 1 |
| 🏘️ Dorf | Planet | 512 m | 50 cm | 1 290 000 | 548 | 5 |
| 🎡 **Vergnügungspark** | Planet, 112 m hoch | 512 m | 50 cm | rund 670 000 | rund 350 | 4 |
| 🏙️ Stadt | Planet, 128 m hoch | 512 m | 50 cm | 3 970 000 | 233 | 6 |
| 🏭 Fabrik | Planet | 512 m | 50 cm | 2 210 000 | 708 | 8 |
| 🏰 **Ritterburgen** | Planet | 512 m | 50 cm | rund 1 800 000 | rund 390 | 5 |
| ⛄ **Winterwelt** | Planet, 144 m hoch | 512 m | 50 cm | rund 2 700 000 | rund 190 | 5 |
| 🛫 **Flughafen** | Planet, 128 m hoch | 512 m | 50 cm | rund 1 400 000 | rund 190 | 6 |
| ⚓ **Hafen** | Planet, 128 m hoch | 512 m | 50 cm | rund 2 400 000 | rund 280 | 7 |
| 🗿 **Welt der Riesenbauten** | Planet, 192 m hoch | 512 m | 50 cm | rund 5 300 000 | rund 230 | 9 |
| 🐠 **Stadt unter dem Meer** | Planet | 512 m | 50 cm | rund 800 000 | rund 560 | 7 |
| 🚀 **Raumhafen** | Planet, 128 m hoch | 512 m | 50 cm | rund 2 200 000 | rund 320 | 8 |
| 🎲 Gewürfelt | Planet | 128–512 m | 50 cm | je nach Mischung | – | – |

Die Reihenfolge ist die der Weltauswahl: die fünf Heimatwelten zuerst. **Gestartet wird in der Heimatwelt der Figur**, solange der Spieler für diese Figur keine andere Welt gewählt hat; wählt er eine Welt in der Weltauswahl, merkt sich das Spiel sie für diese Figur (`pick` im Spielstand), und beim nächsten Start oder Figurenwechsel geht es dorthin. Das Selbstspiel reist durch die Liste, ändert die gemerkte Wahl aber nicht. Wer die Figur wechselt, reist sofort in deren Welt. Jede Welt hat einen festen Startwert (`seed`), damit sie beim Umsortieren der Liste gleich bleibt.

Gestrichen (Nachtrag 5): Garten und Wohnstraße (zu klein), Spielzeugland (Riesenbauklötze in einer Stadt passten nicht zusammen; das Bauklotz-Zimmer macht es besser) und die Parklandschaft (Natur, aber viele Straßen, Zerstören machte wenig Spaß). Erfolge für diese Welten gibt es nicht mehr; ein Spielstand, der in einer davon stand, beginnt in der Heimatwelt.

Gegenüber Entwurf 2 haben die Inseln die vierfache und die Planeten die vierfache Fläche; die Planeten haben 256 statt 64 Häuserblocks. Auf schwachen Geräten und Handys sind Planeten 256 m groß.

Inhalt:

- **Bauklotz-Zimmer:** 25 Bauten auf einem Teppich – Türme, hohe Türme, Burgen mit Ecktürmchen, Mauern, Bögen, Pyramiden, Treppen.
- **Dorf:** Häuser mit Gärten, Wohnblocks, Kirchen, Tankstellen, Wassertürme, Parks mit Hügeln.
- **Stadt:** Hochhäuser mit Glasfassaden bis 34 Stockwerke (rund 100 m), Wohnblocks, Baustellen mit Kran.
- **Fabrik:** Hallen mit Maschinen, über 40 m hohe Schornsteine, Tanks, Silos.
- **Vergnügungspark:** Riesenräder mit Gondeln, Achterbahnen auf Holzgerüsten mit Zug, Karussells und Zirkuszelte mit gestreiften Stoffdächern (brennen gut), Budenreihen mit Markisen, Lichtern und Luftballons, die davonfliegen, wenn man sie losreißt, Freifalltürme. **In die Höhe (Nachtrag 10):** Kettenflieger-Türme bis rund 95 Würfel (Mast mit Leuchtringen, Krone mit gestreiftem Dach, Sitze an schrägen Ketten), Aussichtstürme bis 160 Würfel mit einem gläsernen Kabinenring, Loopings (ein senkrechter Gleiskreis auf einem Gerüst), Freifalltürme und Riesenräder doppelter Größe, dazu die Lifttürme der Riesenachterbahnen (bis 100 Würfel). Die Welt ist dafür 224 statt 128 Würfel hoch. Viele Besucher.
- **Ritterburgen:** Mittelalter aus einem Guss. Feldwege statt Straßen, ohne Laternen, Hydranten, Ampeln und parkende Autos; kein Verkehr. Burgen mit Ringmauer, Zinnen, vier Rundtürmen mit Spitzdach, Torhaus und hohem Bergfried samt Schatz (eine davon doppelt so groß); **Fachwerkhäuser** mit vorkragenden Obergeschossen, dunklem Balkenwerk, Ziegel- oder Strohdach und Schornstein; Windmühlen mit Stoffsegeln; Bauernhöfe mit Holzscheune und Heuballen, die wie Zunder brennen; ein Markt mit Ständen und Brunnen; ein **Turnierplatz** mit Schranke, überdachter Tribüne, Fahnen und gestreiften Zelten; Kirchen, Wald und Hügel. Statt Passanten **Bauern** in Kittel und Beinlingen und hin und wieder eine **Burgfrau** im langen Kleid mit Spitzhut. Statt der Polizei reiten **Ritter** aus (Pferd, Schabracke und Wappenrock in Rot oder Blau, Helm mit Federbusch, Lanze mit Wimpel, Schild), statt der Feuerwehr kommt ein **Wasserkarren** mit Fass. Keine Sirenen, keine Hubschrauber, keine Kampfflieger. Wird ein Ritter getroffen, fliegen Rüstungsteile und Holz, und er purzelt davon wie die Bewohner – es explodiert nichts.
- **Winterwelt** (bis rund 170 Würfel hoch): Schnee statt Rasen, verschneite Tannen statt Laubbäumen. Ein **Berg** auf einem Großgrundstück: ein zerklüfteter Kegel aus Fels mit Schneekappe und Gipfelkreuz, hohl wie der Vulkan. **Grandhotels** bis 140 Würfel: Steinsockel, Stockwerke aus dunklem Holz, die alle fünf Etagen zurückspringen, Balkone, Schnee auf jeder Terrasse, Fahne auf dem Dach. **Seilbahnen**: Gittermasten bis 110 Würfel mit Querträger, zwei Seile ins Tal, rote und blaue Gondeln, Talstation. Skisprungschanzen, eine davon doppelt so groß (rund 120 Würfel), Holzhäuser unter Schnee, Riesenschneemänner, Eisbahnen, Iglus, ein zugefrorener See.
- **Flughafen** (bis rund 210 Würfel hoch): Verkehrsflugzeuge auf dem Vorfeld (mit Treibstoff in den Flügeln), Rollbahnen mit blauen Randfeuern und Kleinflugzeugen, gläserne Abfertigungshallen mit Fluggastbrücken, Kontrolltürme mit Radar, ein **Kontrollturm doppelter Größe** (rund 130 Würfel), **Radarmasten** bis 100 Würfel in Rot und Weiß mit Warnlichtern, **Flughafenhotels** als Hochhäuser, ein Parkhaus, Hangars mit Tonnendach, ein Tanklager.
- **Stadt unter dem Meer:** Meeresboden statt Rasen, dunkelblaues Wasser, ringsum steigen Luftblasen auf. Glaskuppeln mit Wohnmodul und Verbindungsröhren, verzweigte Korallen mit leuchtenden Spitzen, Tangwälder, ein gelbes U-Boot auf seinem Gestell, versunkene Frachter, Bohrinseln auf vier Beinen mit Tanks und Bohrturm. Hier gibt es weder Einsatzkräfte noch Verkehr.
- **Raumhafen:** Raketen von rund 50 m auf der Startrampe, randvoll mit Treibstoff, neben dem Startturm – ein Treffer, und sie explodieren Stück für Stück nach oben; Radioteleskope mit großer Schüssel, eine riesige hohle Montagehalle, das Kontrollzentrum mit Antennen, Tanklager.
- **Hafen** (bis rund 180 Würfel hoch): Containerberge bis fünf Lagen, Portalkräne mit Ausleger und Container am Haken, ein **Portalkran doppelter Größe**, Frachter in Hafenbecken mit Decksladung, Brücke und Schornstein, Lagerhallen, Silos und **Silos doppelter Größe**, **Leuchttürme** bis 130 Würfel in roten und weißen Ringen mit Galerie und Laterne, **Hafenbüros** als Hochhäuser, Baukräne – und Tanklager aus je vier Treibstofftanks, die einander hochjagen.
- **Welt der Riesenbauten:** für Kaputtmacher, denen gewöhnliche Häuser zu klein geworden sind. Wenige, gewaltige Bauwerke: Stufenpyramiden mit Schatzkammer, über 50 m hohe Kühltürme, Fernsehtürme bis rund 150 m mit Kanzel und Antenne, Glaskuppeln mit Garten, Stadien mit bunten Rängen und Flutlichtmasten, Kolossalstatuen eines Roboters mit erhobenen Fäusten (67 m), dazu die höchsten Hochhäuser.
- **Wolkenkratzer-Stadt:** eine Szene wie Manhattan oder Tokio; Aufbau in 7.6. Früher begann jedes neue Spiel hier; jetzt beginnt jede Figur in ihrer Heimatwelt.

Alle Welten entstehen aus Bauplänen im Code mit festem Startwert: Wer eine Welt in der Weltauswahl erneut wählt, bekommt dieselbe Welt heil zurück. Einen eigenen Neu-aufbauen-Knopf gibt es nicht mehr.

### 7.4b Heimatwelten

Jede der sechs Figuren hat eine Welt, die auf das zugeschnitten ist, was sie am besten kann (`landmarks3.js`). In der Weltauswahl trägt ihre Kachel das Symbol der Figur. Alle sind hoch – 180 bis 250 Würfel – und voller Schwachstellen, von denen aus ein Einsturz um sich greift.

| Welt | Was dort steht | Wie es fällt |
|---|---|---|
| 🦕 Urzeit-Nekropole (Dino) | Ein Urwald ohne Straßen auf Moos- und Schlammboden. **Mammutbäume** bis gut 200 Würfel hoch: ein Stamm mit Wurzelfuß, Plattformen in drei Höhen mit je drei Baumhütten, Streben, Geländer, Leiter, oben eine Krone aus riesigen Laubballen. Auf einem Großgrundstück vier solche Bäume, verbunden durch **Hängebrücken** in zwei Höhen, die in der Mitte durchhängen. Dazwischen **Riesenskelette** (Wirbelsäule, Rippenbögen, Schädel) und Tempelruinen mit einem Altar, **Farnhaine** mit Findlingen und einem umgestürzten Stamm, **Nester** mit sechs Rieseneiern, **Steinkreise** mit Decksteinen und Altar. Statt gewöhnlicher Bäume wachsen Urwaldriesen mit Schirmkrone und Lianen, Baumfarne und Palmfarne. Großgrundstücke: ein rauchender **Vulkan** (hohler Kegel aus dunklem Gestein, Lavasee im Krater, Lavaströme an der Flanke) und ein **Sumpf** mit trübem Wasser, Schilf, Seerosenblättern, Pfahlhütten und dem halb versunkenen Skelett eines Langhalses. Es leben dort ein Stamm in Fell und Leder und kleine Saurier, die flinker fliehen als Menschen; oben kreisen **Flugsaurier**. Keine Laternen, keine Autos, keine Boote, keine Einsatzkräfte | Wer den Stamm durchtrennt, bringt den ganzen Baum samt Dorf herunter; die Brücken reißen mit. Ist der Krater zerstört, hört der Vulkan auf zu rauchen |
| 🏛️ Babel (Affe) | **Zikkurats**: Stufen um Stufe eine Halle voller Pfeiler unter schwerer Decke, mit Torbögen und einem goldenen Schrein oben. Der **Turm zu Babel** auf einem Großgrundstück: runde Stockwerke, jedes schmaler, mit Pfeilern, Bogenfenstern, einer Rampe außen herum und Gärten auf jeder Terrasse, bis rund 250 Würfel hoch. Dazu **Aquädukte** mit Wasserrinne und **hängende Gärten** mit Palmen und Ranken; Sandboden. Die Straßen sind aus Steinplatten ohne Markierung, an den Ecken stehen **Feuerschalen** statt Laternen. Gewohnt wird in **Lehmhäusern** mit Flachdach, Brüstung, kleinen Fenstern, Balkenköpfen, Sonnensegel oder Krügen auf der Dachterrasse. Dazu ein **Basar** mit gestreiften Markisen, Krügen, Teppichen und Brunnen, **Obelisken** mit goldener Spitze und eine Reihe **Sphingen**, einmal das blau glasierte **Ischtar-Tor** mit goldenen Tieren und Stadtmauer und ein öffentlicher **Brunnen** unter einem Dach. Statt Laubbäumen Dattelpalmen. Die Menschen tragen bodenlange Gewänder und Kopftücher; keine Autos, keine Polizei | Die Decken sind die Böden der Stufe darüber: Wer sie von oben zerstampft oder die Pfeiler wegschlägt, lässt die Etagen aufeinander fallen |
| 🌃 Neon-Megacity (Roboter) | **Bei Nacht**: Alles ist dunkel und violett, beleuchtet nur vom Schein der Stadt – rosa und türkis in breiten Wellen über die Karte, am stärksten unten auf der Straße. Leuchtreklamen, Lampen und Scheinwerfer leuchten voll; Fahrbahnmarkierungen glimmen; von den Fenstern ist etwa jedes achte Feld erleuchtet (warm, kalt oder rosa), der Rest ist dunkles Glas. Rauch und Staub sind dunkle Schatten. Die Figur selbst bleibt heller, damit man sie sieht. Gestartet wird nicht im Park, sondern **mitten auf einer Kreuzung zweier Prachtstraßen**, an deren vier Ecken Leuchtreklame-Türme stehen; der Blick geht die Straßenschlucht hinunter. Türme bis rund 300 Würfel mit **riesigen Leuchtreklamen** an der Fassade, **Lichtlinien**, die vom Bürgersteig bis zum Dach an der Fassade hinauflaufen und Rücksprünge mitgehen, **Hochstraßen** in zwei Ebenen auf Stelzen mit Autos und Laternen, eine **Arkologie** (eine Stadt in einem Gebäude, bis 230 Würfel), Zwillingstürme mit Brücken | Ein Laserschnitt quer durch einen Turm lässt den oberen Teil abrutschen; Hochstraßen hängen an wenigen Pfeilern |
| 🏰 Festung Titan (Panzer) | Eine **Festung in der Wüste** (`fortress.js`), in die man eindringen muss. Start auf der leeren Sandebene vor dem Tor, Dünen, Kakteen. Auf der Ebene **Vorposten** – Bunker mit Sandsäcken, hölzerne Wachtürme, Zeltlager mit Treibstofffässern und Funkmast –, die für Stufe 2 reichen. Dann ein **trockener Graben** mit einem Damm zum Tor und die **äußere Mauer** (40 Würfel hoch, sechs dick, Zinnen, Strebepfeiler) mit Rundtürmen an den Ecken und in den Seitenmitten und einem Torhaus mit Stahltor. Im Hof zwischen den Mauern stehen Reihen von **Kasernen**, **Flaktürmen**, **Bunkern**, **Radarmasten**, Lagerhallen, Hangars und **Tanklagern**, in den Ecken ein **Riesenpanzer** und ein **Riesenjet**. Dahinter die **innere Mauer** (54 Würfel), und in der Zitadelle der dreistufige **Kommandoturm** (rund 140 Würfel), ein **Riesenroboter** (rund 120 Würfel) und das **Munitionsdepot**: ein Bunker voller Granaten und Fässer hinter Panzertüren. **Jedes Geschütz** auf Türmen, Torhäusern, Flaktürmen, Vorposten und dem Kommandoturm (rund 60) ist ein Schütze: Kommt die Figur näher als 150 Würfel plus drei Körperhöhen, feuert es Leuchtspur (Maschinengewehre, drei Schuss) oder Raketen (schwere Geschütze). Wie beim Militär richtet das keinen Schaden an (außer „Militär stößt zurück“ ist an). Ein zerstörtes Geschütz schweigt. Keine Polizei, keine Feuerwehr, kein Verkehr; es laufen Soldaten mit Helm herum | Geht im Depot das erste Fass hoch, explodiert das ganze Depot: sieben Explosionen rollen durch den Bunker, dann eine riesige (bis Radius 48) mit Zeitlupe. Die Mauern sind dick und müssen Stück für Stück aufgebrochen werden |
| ☁️ Wolkenwerft (Flieger) | Ein offenes Meer ohne Straßen, darüber **schwebende Inseln** in 50 bis 190 Würfeln Höhe mit Häuschen, Funkmast und Baum, **Felsnadeln** mit einer Insel obenauf, **Luftschiffe** an Ankermasten, und auf einem Großgrundstück ein **Luftschiffhafen**: eine große Insel mit Hangar und angedocktem Luftschiff, verbunden durch eine **Seilbahn** mit zwei Gondeln mit einer kleineren Insel | Die Inseln schweben nicht von selbst: Sie hängen an zwei leuchtenden **Schwebestrahlen** aus Triebwerken unter der Insel und an zwei **Stahlseilen** zu Ankerblöcken im Meer. Sind alle gekappt, stürzt die Insel ab. Ein Luftschiff hängt nur mit der Nase am Mast |
| 🚧 Großbaustelle (Bagger) | Rohbau-Hochhäuser bis rund 190 Würfel: nackte Betondecken auf Stützen, oben nur noch Stützen mit herausstehendem Bewehrungsstahl, unten stellenweise ausgemauert, ein Gerüst an einer Seite und ein gelber Bauaufzug an einer anderen; Turmdrehkräne und Baustellen; **Kies- und Sandhaufen**; Baucontainer zu zweit gestapelt mit Treppe, Toilettenhäuschen, ein Zementsilo; auf einem Großgrundstück ein **Steinbruch**: ein Felsmassiv in Bermen wie eine Stufenpyramide mit Fahrweg, Findlingen und einem Brecher mit Förderband. Laufstege verbinden die Rohbauten (7.4c). Sandboden, Straßen mit Verkehr, Bauarbeiter in Warnwesten mit Helm | Die Rohbauten haben kaum Wände: Wer die Stützen eines Stockwerks wegschlägt, lässt die Decken darüber fallen. Haufen und Steinbruch sind zum Abtragen da |

**Grenzen:** Das Licht der Nacht ist ein Schein, keine echte Beleuchtung: Leuchtreklamen werfen kein Licht auf ihre Umgebung, und Schatten gibt es nicht. Ein zerbrochenes Fenster wird zu dunklem Schutt. Die Hochstraßen enden an den Rändern ihres Grundstücks. In der Festung gibt es entlang der Klippen keine Laternen und geparkten Autos; Polizei und Feuerwehr fahren dort noch Autos von heute. In Urzeit und Babel gibt es ohne Einsatzkräfte auch keine Alarmsterne. Ein Zusammenhang zwischen Figur und Heimatwelt besteht außer dem Symbol nicht (kein Bonus).

### 7.4c Superstrukturen: Netze zwischen den Bauten

Bisher standen viele Bauten für sich. Jetzt verbinden **Superstrukturen** sie zu Netzen (`links.js`). Für jede Welt ist festgelegt, welcher Stil zu ihr passt und welche Bauten mitmachen; daraus entsteht ein Netz:

- **Knoten** sind die passenden Bauten, die hoch genug sind. **Zuerst** werden die nächstgelegenen Paare verbunden, bis alles Erreichbare zusammenhängt (ein aufspannender Baum, nie zwei Verbindungen in dieselbe Gruppe); **danach** schließen einige zusätzliche Verbindungen Schleifen. Kein Bau bekommt mehr als vier.
- **Verschiedene Höhen:** Jede Verbindung beginnt und endet an der Fassade ihrer beiden Bauten, auf einer Höhe, die für jeden Bau einzeln gewählt wird (innerhalb eines Bands seiner Höhe), und steigt oder fällt dazwischen – so steil, wie der Stil es zulässt. Bauten mit Plattformen (die Mammutbäume) verbinden ihre Plattformen. So entstehen Netze über mehrere Ebenen, nicht eine flache Lage.
- **Freie Bahn:** Gebaut wird nur, wo der Weg frei ist: nie durch einen dritten Bau oder einen Hügel, nie auf derselben Höhe durch eine andere Verbindung. Pfeiler landen nicht auf Straßen.
- **Echte Bauten:** Jede Verbindung ist ein eigenes Bauwerk – sie zählt, steht auf der Minimap, lässt sich zerstören und hängt an den Bauten, die sie verbindet; fällt ein Bau, reißt sie mit oder hängt am anderen Ende. Das Selbstspiel lässt Verbindungen, die hoch über der Figur schweben, in Ruhe.

| Welt | Stil |
|---|---|
| 🌆 Wolkenkratzer-Stadt, 🏙️ Stadt | **Hochbahn** auf Betonträger und Pfeilern zwischen Hochhäusern, Wohnblocks, Läden und Parkhäusern, höchstens 46 bzw. 40 Würfel über dem Boden, mit Zügen aus drei Wagen; dazu **Skybridges** (gläserne Röhren mit Stahlrippen) zwischen hohen Türmen |
| 🌃 Neon-Megacity | **Skybridges** mit leuchtenden Kanten zwischen Türmen und Arkologie in allen Höhen, dazu **Superhighways**: 13 Würfel breit, Leitplanken mit Neon, Fahrbahnmarkierung, Autos, auf hohen Pfeilern zwischen Türmen und Hochstraßen |
| 🦕 Urzeit-Nekropole | **Lianengeflechte**: drei durchhängende Stränge mit Blätterbüscheln und herabhängenden Ranken zwischen den Kronen der Urwaldriesen und Mammutbäume; **Hängebrückensysteme** zwischen den Baumhaus-Plattformen aller Mammutbäume, von Plattform zu Plattform auf verschiedenen Höhen |
| 🎡 Vergnügungspark | **Riesenachterbahnen** von Fahrgeschäft zu Fahrgeschäft: steile Buckel, zwei rote Schienen auf Schwellen, Gitterstützen, ein bunter Zug |
| 🏛️ Babel | **Steinerne Brücken** mit Brüstung und Blumen auf hohen Pfeilern zwischen Zikkurats, Turm, Gärten, Aquädukten und Tor |
| 🏰 Ritterburgen | **Wehrgänge** mit Zinnen auf Steinpfeilern zwischen Burgen, Kirchen und Windmühlen |
| 🐠 Stadt unter dem Meer | **Glasröhren** mit Stahlrippen zwischen Kuppeln, U-Booten, Bohrinseln und Wracks |
| 🏭 Fabrik | **Rohrleitungen** (zwei Rohre auf Stahlrahmen) zwischen Hallen, Tanks, Schornsteinen, Silos und Wassertürmen |
| ⚓ Hafen | **Förderbrücken** (überdachtes Stahlfachwerk mit Band) zwischen Silos, Lagerhallen, Kränen, Tanks, Bürotürmen und Leuchttürmen |
| 🛫 Flughafen | **Skywalks** (weiße Glasgänge auf Pfeilern) zwischen Terminals, Tower, Hotels, Hangars, Radar und Parkhaus |
| ⛄ Winterwelt | **Seilbahnen**: zwei Seile mit Gondeln zwischen Hotels, Liftmasten, Berg, Schanzen und Kirche |
| 🚀 Raumhafen, 🏰 Festung Titan | **Laufstege** aus Stahlgitter mit Geländer zwischen Raketen, Montagehalle, Kontrollzentrum, Schüsseln bzw. Türmen, Flaktürmen, Kommandoturm, Radar und Toren |
| ☁️ Wolkenwerft | **Hängebrücken** zwischen den Inseln und Felsnadeln, dazu **Seilbahnen** |
| 🗿 Riesenbauten | **Superhighways** und **Skybridges** zwischen den Riesen |

Bei voller Weltgröße entstehen so je Welt zwischen rund 17 (Festung) und 130 (Urzeit) Verbindungen. Dorf und Bauklotz-Zimmer bleiben ohne.

**Knotenpunkte (Nachtrag 10).** Damit die Netze nicht nur zwischen Gebäuden hängen, sondern irgendwo anfangen, enden und sich verzweigen, stellt jedes Netz eigene **Knotenpunkte** auf: auf freie, ebene Flächen (nicht ins Wasser, nicht auf den Start), manche auch über die Straße (Bahnhöfe auf Stelzen, Auffahrten an Kreuzungen) und manche **auf das Dach** eines niedrigen Gebäudes, das damit Teil des Netzes wird. Ein Knotenpunkt hat Plattformen auf mehreren Höhen; dort setzen die Verbindungen an. Knotenpunkte werden bevorzugt verbunden (als lägen sie halb so weit weg), dürfen auch aus der Nähe angefahren werden, bis zu sieben Verbindungen tragen, und zu ihnen darf es zweieinhalbmal so steil gehen – eine Rampe ist dafür da. Das Gebäude wählt seine Höhe zuerst, der Knoten bietet die nächstgelegene Plattform.

| Knoten | Wo | Aussehen |
|---|---|---|
| 🚉 Bahnhof | Hochbahn (Städte, Neon) | Bahnsteig auf vier Pfeilern, 16–26 Würfel hoch, Dach, Treppe hinunter zur Straße |
| 🗼 Plattformturm | Skybridges (Neon, Wolkenkratzer-Stadt, Riesenbauten) | schlanker dunkler Schaft mit leuchtenden Kanten, alle 24 Würfel eine Plattform mit Leuchtrand, 90–220 Würfel hoch, Antenne |
| 🌀 Spiral-Auffahrt | Superhighways (Neon, Riesenbauten) | eine Rampe, die von der Straße bis 110–220 Würfel hinaufwindet, mit einem Ring auf jeder Ebene, an dem Highways und Skybridges ansetzen |
| 🎢 Liftturm | Riesenachterbahnen | roter Gitterturm 45–100 Würfel mit Plattform, unten ein gestreiftes Stationsdach |
| 🛖 Aussichtsturm | Hängebrücken der Urzeit | Holzturm auf vier Beinen, Plattformen mit Geländer, Strohdach |
| 🏛️ Treppenturm | Babel | Sandsteinschacht mit Absätzen und Pflanzen, Zinnen |
| 🏰 Wachturm | Ritterburgen | runder Steinturm mit Zinnen |
| 🫧 Kuppel | Unterwasser | Glaskugel auf vier Beinen, in der die Röhren zusammenlaufen |
| 🔧 Rohrbrücke | Fabrik | Stahlgerüst mit Böden alle 8 Würfel |
| 🏗️ Umlenkturm | Hafen | Stahlgerüst mit verkleidetem Haus obenauf |
| 🛗 Aufzugsturm | Flughafen | weißer Glasschacht mit Absätzen |
| 🗼 Gitterturm | Raumhafen, Großbaustelle, Festung | gelber Gittermast mit Plattformen alle 15 Würfel |
| 🚡 Seilbahnstation | Winterwelt | Gittermast mit Stationsplattform unter einem Dach |

**Netze in Netzen.** Ein Netz darf in ein früher gebautes münden: In der Neon-Megacity enden Skybridges auf den Decks der Superhighways und auf anderen Skybridges (jeweils in deren Mitte), und sie nutzen die Spiral-Auffahrten mit. **Überbrücken:** Verbindungen führen über niedrigere Bauten hinweg, und ihre Pfeiler dürfen sich auf deren Dächer stützen – so werden auch Bauten, die selbst kein Ende einer Verbindung sind, Teil des Netzes.

**Neon-Megacity** ist am dichtesten vernetzt: Superhighways mit drei Spiral-Auffahrten je 512 × 512 Würfel, Skybridges in drei Höhenbändern (unten 8–35 %, Mitte 35–65 %, oben 65–97 % der Turmhöhe) mit zwölf Plattformtürmen je 512 × 512, und eine Hochbahn mit Bahnhöfen. Bei voller Weltgröße: rund 390 Verbindungen und 66 Knotenpunkte (vorher 98 Verbindungen); Skybridges enden rund 35-mal auf Highways und rund 150-mal auf anderen Skybridges oder Auffahrten. In den anderen Welten (volle Größe): Urzeit 195, Wolkenkratzer-Stadt 119, Fabrik 91, Stadt 78, Unterwasser 75, Babel 72, Hafen und Großbaustelle je 65, Riesenbauten 64, Flughafen und Raumhafen je 54, Vergnügungspark 49, Ritterburgen 45, Winterwelt 40, Festung 26 – mit je 8 bis 24 Knotenpunkten.

**Grenzen:** Eine einzelne Verbindung führt gerade von Ende zu Ende (mit Durchhang, Buckeln oder Steigung); verzweigt wird an Knotenpunkten. Züge, Autos und Gondeln stehen still. Wer an einem Bahnhof oder einer Auffahrt über die Straße geht, durch dessen Pfeiler fährt der Verkehr hindurch. Nicht jeder Knotenpunkt bekommt eine Verbindung; wo keine passt, steht er für sich. Wo ein Bau an der gewählten Höhe hohl ist, endet die Verbindung an seiner Außenwand, ohne Durchgang ins Innere.

### 7.4a Großgrundstücke, Viertel und Innenleben

**Großgrundstücke.** Der Stadtgenerator kann mehrere Grundstücke zu einem zusammenlegen; die Straßen dazwischen entfallen (auch auf der Straßenkarte). Darauf stehen die Wahrzeichen einer Welt, deutlich größer als alles andere:

| Welt | Wahrzeichen (je 2 × 2 Grundstücke, rund 58 × 58 m) |
|---|---|
| Vergnügungspark | **Verschlungene Achterbahn** (siehe unten), Riesenrad in doppelter Größe |
| Burg und Dorf | Große Burg: die Burg in doppelter Größe, Mauern zwei Würfel dick, Bergfried rund 40 m |
| Flughafen | Jumbojets (doppelte Größe) auf eigenem Vorfeld; Großterminal mit Kontrollturm |
| Hafen | Ozeanriesen im Meer (siehe weite Flächen) |
| Raumhafen | Große Montagehalle, großes Radioteleskop |
| Winterwelt | Schneemann in doppelter Größe (rund 50 m) |
| Stadt unter dem Meer | Große Kuppel |
| Welt der Riesenbauten | Große Pyramide, großes Stadion |
| Stadt, Wolkenkratzer-Stadt | Stadion |

Die doppelte Größe entsteht ohne eigene Baupläne: Ein Stellvertreter des Generators vergrößert alles, was ein Bauplan zeichnet, um einen ganzen Faktor; jeder Würfel wird zu einem Block aus 2 × 2 × 2. Dadurch werden auch Wände dicker und halten mehr aus.

**Die verschlungene Achterbahn.** Sie ist kein Fahrgeschäft für sich, sondern windet sich um die anderen: Ihre Strecke ist eine liegende Acht, eine Schleife um ein Riesenrad, die andere um Zirkuszelt und Karussell. Die Höhe folgt drei überlagerten Wellen – ein langer Anstieg mit Abfahrt, drei Hügel und eine Welle, die dafür sorgt, dass an der Kreuzung der Acht ein Strang hoch und der andere tief liegt – dazu ein einzelner hoher Buckel an zufälliger Stelle und eine leichte seitliche Schlängelung. Stützen reichen jeweils bis zu dem, was darunter liegt. Keine zwei Bahnen sind gleich.

**Das Meer im Hafen.** Eine ausgehobene Fläche, 5 m tief, gefüllt mit Wasser. Das Wasser besteht nicht aus Würfeln: Es ist eine durchscheinende Fläche, die das Spiel über das Becken legt, und lässt sich deshalb nicht zerstören. Man kann hineinsteigen und hindurchwaten; kleine Kaputtmacher verschwinden darin ganz, große stehen bis zu den Knien drin. Solange das Wasser über Kniehöhe reicht, geht es nur mit 60 % des Tempos voran, und es spritzt. Im Becken liegen zwei Ozeanriesen (Frachter in doppelter Größe, über 45 m lang, der Rumpf steht auf dem Grund), dazu Bojen; auf dem Wasser kreuzen je drei Boote (ein Fährschiff, zwei Schlepper), die sich versenken lassen. Bewohner laufen nicht ins Becken.

**Weite Flächen.** Jede Planetenwelt hat eine große offene Fläche, auf der das Auge ausruhen und in die Ferne schauen kann – je nach Weltgröße rund 100 bis 160 m im Quadrat, etwa ein Siebtel der Oberfläche:

| Welt | Weite Fläche |
|---|---|
| Hafen | **Das Meer:** statt eines Beckens eine große Wasserfläche (rund 220 × 190 m, auf kleinen Geräten 125 × 90 m) mit Ozeanriesen in Reihen und bis zu neun Booten |
| Flughafen | **Das Rollfeld:** eine Startbahn von 22 m Breite und bis zu 280 m Länge mit Mittellinie, Randlinien, Schwellenbalken und blauen Randfeuern, Grasstreifen beiderseits, dahinter Vorfelder mit Verkehrsflugzeugen in weitem Abstand |
| Dorf, Parklandschaft, Burg, Spielzeugland, Vergnügungspark, Stadt unter dem Meer | Eine Wiese (unter dem Meer eine Sandebene) mit einem Teich und wenigen Bäumen am Rand |
| Winterwelt | Ein zugefrorener See mit einer einsamen Eisfischer-Hütte |
| Fabrik, Raumhafen, Welt der Riesenbauten | Ein gepflasterter Platz mit einem Denkmal in der Mitte |
| Wolkenkratzer-Stadt, Stadt | Der Zentralpark (7.6) |

**Viertel.** Wolkenkratzer-Stadt, Stadt und Dorf sind in Viertel geteilt: Um zufällige Mittelpunkte herum bevorzugt jedes Viertel seine eigenen Grundstücksarten. In der Wolkenkratzer-Stadt gibt es Hochhausviertel (Türme und Zwillingstürme dreimal so häufig, kaum Flachbauten), Geschäfts- und Wohnviertel (Ladenzeilen, Wohnblocks, Parkhäuser, Plätze, nur halb so viele Türme) und gemischte Viertel. In der Stadt kommen Viertel mit Einfamilienhäusern und Parks dazu.

**Innenleben.** Wer ein Gebäude zerlegt, sieht, was darin ist:

- **Wohnhäuser** in allen Planetenwelten haben zu drei Vierteln Zimmer mit Möbeln: Tisch, Bett, Sofa, Regal, Küchenzeile, Badewanne – und neu Fernseher mit leuchtendem Bild, Schreibtisch mit Computer und Stuhl, Kleiderschrank, Topfpflanze.
- **Bürotürme** haben auf jedem zweiten Stockwerk Schreibtische mit leuchtenden Bildschirmen und Bürostuhl, Aktenschränke, Topfpflanzen und hier und da ein Sofa.
- **Versteckte Fundstücke.** In etwa jedem vierzehnten Wohnhaus und in den Schatzkammern von Burg und Pyramide steckt etwas Unerwartetes: eine Gummiente, ein goldener Pokal, eine kleine Kaputtmacher-Statue, ein Klavier, eine Schatztruhe, eine Diskokugel. Jedes hat einen goldenen Würfel im Kern. Wer ihn zerbricht, bekommt einen Goldregen, ein kleines Feuerwerk, einen Klang und Macht (400 × Stufe²); es zählt für die Erfolge „Entdecker“, „Schatzsucher“ und „Spürnase“.

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
- **Verkehr:** siehe 8.2.
- Geplant, noch nicht vorhanden: Vögel, Hunde.

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
- **Abziehen:** Sinkt die Alarmstufe, ziehen alle überzähligen Hubschrauber gleichzeitig und zügig ab (spätestens nach neun Sekunden sind sie weg), ebenso die überzähligen Fahrzeuge. Vorher gingen sie einzeln, und Militärhubschrauber blieben teils hängen.
- **Die Feuerwehr lässt Bränden Zeit.** Sie rückt erst aus, wenn es neun Sekunden gebrannt hat; ein Schlauch löscht höchstens fünf Würfel pro halber Sekunde im Umkreis von gut 3 m, der Lösch-Hubschrauber kommt erst bei großen, lange brennenden Feuern. Auch die Hydranten-Fontäne löscht nur noch die nächste Umgebung. So kann ein Feuer sich erst einmal ausbreiten.
- **Gezielt abschießen:** Was fliegt oder schwimmt, lässt sich anvisieren. Liegt ein Hubschrauber, Kampfflieger, U-Boot oder Boot nahe am Zielstrahl (großzügig bemessen, weil sie sich bewegen) und vor der Wand dahinter, wird es zum Ziel: Schüsse und Strahlen gehen genau dorthin, Raketen verfolgen es. Auch Schläge und Explosionen in der Nähe holen Fliegendes herunter.
- **Alles ist zerstörbar:** Fahrzeuge zerplatzen, wenn ein Schlag in ihrer Nähe landet oder der Kaputtmacher darauf tritt; alles, was fliegt, wird von Schlag, Geschoss, Strahl oder Explosion vom Himmel geholt, trudelt ab und explodiert am Boden. Nachschub kommt nach einigen Sekunden.
- Abschaltbar in den Einstellungen („Einsatzkräfte“); die Detailstufe bestimmt ihre Zahl.

- **Militär stößt zurück (Schalter, standardmäßig aus):** Wer mag, kann einschalten, dass eine Rakete den Kaputtmacher ein Stück zurückschiebt und kurz zusammenzucken lässt. Mehr nicht; scheitern kann man weiterhin nicht.

Bewohner und Einsatzkräfte laufen über ein gemeinsames Akteur-System.

### 8.2 Straßennetz und Verkehr

Jede Planetenwelt ist auf einem Raster aus Grundstücken gebaut; daraus ergibt sich die Straßenkarte: eine Straße an jeder Grundstücksgrenze, außer im Stadtpark. Der Generator gibt diese Karte an die Welt weiter (`world.roads`), und alles, was fährt, benutzt sie (`traffic.js`).

- **Fahren nach Karte:** Ein Fahrzeug hält sich rechts, entscheidet an jeder Kreuzung neu, weicht einem Hindernis auf die Gegenspur aus und wendet, wenn nach anderthalb Sekunden nichts frei wird (Trümmer, zugeparkte Straße).
- **Verkehr:** Je nach Welt und Detailstufe sind rund 5 bis 35 Autos und Busse rund um den Kaputtmacher unterwegs (in der Stadt auf Detailstufe 4: 21). Sie fahren meist geradeaus und biegen gelegentlich ab. Kommt der Kaputtmacher näher als gut zwei Körperhöhen, geben sie Gas und nehmen an jeder Kreuzung den Weg von ihm weg. Wer zurückbleibt, verschwindet; voraus taucht ein neues Auto auf.
- **Zerstörbar:** Ein Schlag in der Nähe oder ein Tritt (sobald der Kaputtmacher größer ist als ein Auto) lässt sie in Teile zerplatzen; jedes vierte explodiert. Die geparkten Autos aus Würfeln bleiben daneben bestehen.
- **Einsatzkräfte** kommen über das Straßennetz und biegen an jeder Kreuzung zum Ziel hin ab; erst das letzte Stück fahren sie querfeldein.
- Verkehr gehört zum Schalter „Bewohner und Verkehr“.
- **Grenzen:** Autos weichen einander nicht aus und können sich durchdringen; Ampeln und Vorfahrt gibt es nicht.
- **Unter dem Meer** fährt nichts auf den Straßen, dafür schwimmt der Verkehr: Haie, die den Kaputtmacher umkreisen, Wale hoch oben, Fischschwärme und kleine U-Boote mit Scheinwerfer, zusammen rund 16. Sie weichen Gebäuden aus. Tieren kann man nichts tun – ein Schlag in ihrer Nähe lässt sie davonschießen –, U-Boote zerplatzen wie Autos.
- **Im Hafen** kreuzen Boote auf dem Becken (7.4a).

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

**Was der Affe wirft.** Er hebt immer etwas auf, und zwar bevorzugt etwas, das nach einem Gegenstand aussieht: zuerst das nächste Ding in gut einer Armlänge (1,3 Körperhöhen plus 3 m), das er im Ganzen heben kann – je nach Größe ein Gartenzwerg, ein Auto, ein Baum –, und dreht sich dorthin. Gibt es keins, reißt er einen Brocken aus dem Gebäude vor sich. Steht er im Freien, bleibt ein Klumpen Boden vor seinen Füßen. Mit leeren Händen wirft er nie.

**🤖 Roboter**

| Angriff | Schnell | Stark |
|---|---|---|
| ⚔️ Klinge (1) | Ein sauberer Schnitt mit der Laserklinge, so weit der Arm reicht | Rotorschnitt: zwei volle Drehungen mit ausgestreckter Klinge, die zweite höher als die erste |
| 🛰️ Orbit (3) | Streut drei Plasmaminen mit Zeitzünder | Orbitalschlag: zeigt zum Himmel; ein Ring zieht sich um das Ziel zusammen, dann fährt eine Lichtsäule von oben durch das ganze Gebäude und explodiert am Boden |
| 🚀 Raketen (5) | Eine Rakete aus dem Schultermagazin | Salve: acht Raketen steigen auf und senken sich gelenkt auf das Zielgebiet |
| ⚡ Laser (7) | Drei kurze Impulse aus der Armkanone: kleine, tiefe Löcher auf beliebige Entfernung | Schneidstrahl: lädt 0,6 s, dann schwenkt der Strahl 1,15 Sekunden lang von links nach rechts durch den Zielpunkt und schneidet eine Linie |

Der Roboter beginnt mit der Klinge, die nur so weit reicht wie sein Arm; was aus der Ferne wirkt, kommt später, der Schneidstrahl zuletzt. Früher war der Laser der erste Angriff: Damit holte ein Roboter auf Stufe 2 rund hundertmal so viel Macht wie der Dino und sprang in kurzer Zeit mehrere Stufen hinauf. Die Klinge schneidet jetzt nach Stufe: anfangs Glas, Holz und Mauerwerk, Beton nur zum Teil, Stahl erst ab etwa Stufe 5 (Schneidkraft 1,25 × Schlagkraft der Stufe, vorher fest 80, also alles).

**🪖 Panzer**

| Angriff | Schnell | Stark |
|---|---|---|
| 💣 Kanone (1) | Maschinenkanone: sechs kleine Granaten in 0,5 s | Hauptgeschütz: Das Rohr zieht zurück, der Schuss wirft den ganzen Panzer nach hinten. Die Granate durchschlägt drei Hindernisse und explodiert dann |
| ☄️ Mörser (3) | Eine Granate im hohen Bogen | Sperrfeuer: sechs Granaten regnen rund um das Ziel |
| 💨 Rammen (5) | Kurzer Rammstoß | Vollgas: 7 H weit durch alles hindurch, schubst mit 4-facher Kraft |
| 🧨 Schwer (7) | Flammenwerfer | Bunkerbrecher: eine langsame, riesige Rakete mit dem größten Explosionsradius im Spiel (12 + 2,2 S) |

Der Panzer zielt mit dem Turm unabhängig von der Fahrtrichtung.

**🚜 Bagger**

Ein Hydraulikbagger: Kettenfahrwerk mit Planierschild, ein Oberwagen mit Kabine, Gegengewicht, Motorhaube, Auspuff, Scheinwerfern und Rundumleuchte, der sich auf seinem Drehkranz **rundum** dreht, und ein Arm aus **Ausleger, Stiel und Schaufel** mit drei Gelenken und Hydraulikzylindern. Gelb, mit den Stufen dunkler; ab Stufe 3 Geländer, ab 5 ein Schutzgitter über der Kabine, ab 7 eine gepanzerte Schaufel und Warnstreifen.

| Angriff | Schnell | Stark |
|---|---|---|
| 🪣 Schaufel (1) | Graben: Die Schaufel öffnet sich weit draußen, der Stiel zieht sie heran, sie rollt sich ein und reißt dabei dreimal heraus, was sie trifft | Schaufelschlag: Der Ausleger fährt ganz hoch, dann kommt die Schaufel mit dem ganzen Arm auf das Ziel herunter, mit Druckwelle |
| 🔨 Hammer (3) | Hydraulikhammer statt Schaufel: zehn schnelle Meißelschläge; jeder lässt die getroffene Wand abbröckeln und treibt ein Loch tief hinein, jeder dritte schickt Risse durch die Wand. Kommt früh durch Beton (Kraft rund 2 × Stufe) | Durchbruch: 1,5 Sekunden Dauerhämmern mit 16 breiteren Schlägen, die den Meißel Schlag für Schlag tiefer treiben, jeder zweite mit Rissen |
| 🔄 Schwenken (5) | Schwenkhieb: Der Oberwagen schwenkt mit ausgestrecktem Arm quer durch das Ziel | Karussell: eine volle Umdrehung des Oberwagens mit dem Arm auf voller Länge |

**Der Hammer erschüttert das Gebäude.** Jeder Schlag schwächt den getroffenen Bau dauerhaft ein wenig (0,4 % beim schnellen, 0,8 % beim starken Angriff, wie bei Kettenreaktionen, 11.6): Nach langem Hämmern kann ein Haus von selbst einstürzen. Hammer und Schwenken haben die Plätze getauscht (Nachtrag 9): Vorher war der Hammer als dritter Angriff der mit Abstand schwächste. Gemessen auf Stufe 4, erster Einsatz gegen ein Gebäude: schneller Hammer 18 Würfel, starker 91, starkes Schwenken über 1 000. Jetzt auf Stufe 3: schneller Hammer 107 bis 128 Würfel (Graben 28 bis 36), starker Hammer 180 Würfel an einem Gebäude der Stadt, an einem Hochhaus der Wolkenkratzer-Stadt brachte er es zum Einsturz (rund 44 000). Einnahmen im Selbstspiel: 105 Macht pro Sekunde auf Stufe 3, 104 auf Stufe 4.
| 🏗️ Laden (7) | Auskippen: eine volle Schaufel vom Boden vor ihm, hochgeschwenkt und auf das Ziel gekippt (ein Brocken bis zu einem Drittel seiner Größe) | Planierschild: Schild runter, Vollgas, sechs Körperhöhen weit durch alles hindurch |

**Wie ein echter Bagger:** Er fährt auf Ketten und behält seine Fahrtrichtung; nur der Oberwagen dreht sich zum Ziel, langsamer als ein Panzerturm. Der Arm folgt der Höhe des Zielpunkts (hoch zu Dachkanten, tief zum Boden) und ist beim Fahren eingeklappt. Alles geschieht am Ende des Arms: Er reicht rund anderthalb Körperhöhen weit, nie weiter, und **schießt nicht**. Er **klettert nicht**, schwimmt nicht und springt nicht: Die Sprungtaste lässt ihn sich mit dem Arm vom Boden abstemmen, ein kurzer Hüpfer wie beim Panzer, genug, um aus einer Grube zu kommen. Je nach Angriff sitzt am Stiel die Schaufel oder der Hydraulikhammer; gezeichnet wird nur das gewählte Werkzeug. Die Planierfahrt nutzt dieselbe Bewegung wie Ansturm und Rammen. Gemessen im Selbstspiel in der Wolkenkratzer-Stadt: 5, 12 und 3 742 Macht pro Sekunde auf den Stufen 1, 2 und 5, also im Bereich der anderen Figuren (nach einer Verstärkung der Schaufel; vorher 1 auf Stufe 1).

**✈️ Flieger**

| Angriff | Schnell | Stark |
|---|---|---|
| 🔫 Bordwaffen (1) | Sechs Laserimpulse aus der Nase auf den Zielpunkt | Eine Bombe aus dem Rumpf; sie behält das Tempo des Fliegers und fällt |
| 🚀 Raketen (3) | Eine Rakete von der Tragfläche | Salve: acht gelenkte Raketen |
| 💣 Bombenteppich (5) | Drei Bomben nacheinander | Zwölf Bomben in 1,3 Sekunden entlang der Flugbahn |
| 🔥 Schwer (7) | Drei Brandbomben: kleine Explosion, großes Feuer | Eine Riesenbombe (Radius 14 + 2,4 S) |

Der Flieger steht nie still: A/D lenkt, W/S steigt und sinkt, Umschalt ist der Nachbrenner (Tempo 42 + 1,3 H Würfel pro Sekunde, mit Nachbrenner das 1,7-Fache). **Die Schnauze zeigt immer in Flugrichtung** – der Flieger dreht sich nicht mehr zum Ziel. Stattdessen trägt er unter dem Bauch ein Anbauteil je Waffe: einen Zwillingsgeschützturm (Bordwaffen) und einen Raketenwerfer mit zwei Behältern (Raketen), die sich rundum zum Zielpunkt drehen, der Turm neigt zusätzlich seine Rohre; eine Reihe Bomben (Bombenteppich) und zwei leuchtende Brandbehälter (Brandbomben), die keine Richtung brauchen. Gezeichnet wird nur das Teil der gewählten Waffe; Schüsse und Raketen starten dort. **Der Flieger zählt weniger.** Er ist schnell, muss nirgends hinlaufen und bombt von oben: Mit vollem Wert verdiente er im Selbstspiel auf den Stufen 1 bis 3 das Sieben- bis Vierzigfache des Dinos und rauschte durch die Stufen. Was er zerstört, zählt deshalb nur anteilig, am wenigsten, solange er klein ist: 5 % auf Stufe 1, 17 % auf Stufe 3, 51 % auf Stufe 5, 90 % ab Stufe 6. Nachgemessen: 8, 143 und 8 950 Macht pro Sekunde auf den Stufen 1, 3 und 6 – auf den frühen Stufen bleibt er dem Dino knapp voraus, später gleichauf. **Durch Gebäude fliegen geht nicht mehr.** Trifft die Nase etwas Festes, schlägt der Flieger eine Delle von seiner eigenen Größe hinein (Rammen ist ein Missgeschick, keine Waffe) und **prallt ab**: Eine Dreiviertelsekunde lang wird er herumgeworfen, steigt und reagiert nicht auf die Steuerung. Im Test prallte er in 14 Sekunden Geradeausflug dreimal ab und steckte nur in 2 % der Zeit in etwas Festem. **Unter die Erde** kommt er nicht mehr: Er fliegt nie tiefer als knapp über dem Boden, und sein Aufprall schont den Boden. Er legt sich in die Kurve, gleitet über alles, was unter ihm liegt, und bricht mit der Nase durch alles, was vor ihm steht. Über Inseln dreht er am Rand von selbst um. Springen und Brüllen gibt es für ihn nicht.

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

### 11.1a Naturgesetze je Welt

Die meisten Welten teilen dieselben Regeln. Wo das nicht passt, hat die Welt eigene:

| Regel | Überall sonst | Stadt unter dem Meer |
|---|---|---|
| Schwerkraft | 85 | 30 % davon, für Figur, Trümmer und Bruchstücke |
| Widerstand | keiner | Wasser bremst alles: Trümmer sinken, statt zu krachen |
| Springen | Sprung, Doppelsprung, Stampfattacke | Der Sprung ist hoch und langsam. **Jeder weitere Druck in der Schwebe ist ein Schwimmzug** nach oben (1,3 Körperhöhen), beliebig oft, mit Blasenring. Sinken ist langsam |
| Feuer | nach Flammpunkten (11.7) | Nichts brennt, nichts verrußt. Sprengstoff explodiert trotzdem; statt Flammen steigen Blasen auf, statt eines Brandherds bleibt eine Schlickwolke |
| Hydranten | Wasserfontäne | Es gibt keine, und nichts spritzt |
| Ton | klar | dumpf (Tiefpass) |
| Leben | Bewohner, Verkehr, Einsatzkräfte | Bewohner als Taucher; Meerestiere und U-Boote statt Autos (8.2); keine Einsatzkräfte |
| Umgebung | – | Ringsum steigen Luftblasen auf |

Die anderen Welten wurden daraufhin durchgesehen: Sie brauchen keine eigenen Regeln. In der Winterwelt ändern sich nur Boden und Bäume; ob Schnee Feuer bremsen oder Eis rutschig sein sollte, ist eine offene Frage (Abschnitt 14).

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

### 11.4a Schlanke Bauten: Was auf zu wenig steht, fällt

Die Haltprüfung (11.3) fragt nur, ob ein Stück noch irgendwo den Boden berührt. Für schlanke Dinge reicht das nicht: Eine Baumgruppe mit verwachsenen Kronen hing am letzten Stamm, ein halbes Riesenrad an einem Bein. Zwei Mechanismen kommen dazu; beide berücksichtigen Dicke und Material.

**Standfestigkeit (`frail.js`).** Nach jedem Schaden wird, was dort noch steht, als Ganzes betrachtet (bis 45 000 Würfel; größere Gebäude regelt weiter 11.4): Gewicht, Schwerpunkt und Standfläche. Es fällt, wenn

- der Schwerpunkt weiter neben der Standfläche liegt, als sie breit ist plus eine Nachsicht von 1,5 Würfeln + 0,12 × Wurzel der Tragkraft der Standfläche – ein Stahlfuß verzeiht also mehr Überhang als ein Holzstamm –, oder
- das Gewicht die Tragkraft der Standfläche um mehr als das 160-Fache übersteigt.

Dann bricht die Standfläche, und das Stück kippt in Richtung seines Schwerpunkts. Ein Baum, dem die Nachbarn fehlen, steht weiter; eine Baumgruppe auf einem Stamm kippt.

**Nachgeben beim Auffangen (`bodies.js`).** Ein gefallenes Bruchstück, das zur Ruhe kommt, darf liegen oder lehnen, wenn es massiv ist. Ist es aber ein schlankes Gerippe (Anteil gefüllter Würfel × mittlere Festigkeit unter 2,2 – ein Riesenrad, ein Stück Gleis, ein Kranausleger, ein Baum) und hängt aufgestützt in der Luft statt flach am Boden zu liegen, dann gibt es nach: Kleine Stücke gehen als Schauer von Einzelteilen nieder, große brechen in der Mitte und fallen weiter. Ein dicker Stahlträger hält, dünnes Holz knickt sofort.

**Bäume** stehen in Parks und Wäldern jetzt so weit auseinander, dass sich die Kronen nicht mehr berühren.

**Was fehlt:** Verbiegen. Stücke fallen und brechen, sie verformen sich nicht.

### 11.5 Schubsen

Rennt das Monster (Umschalt) gegen ein Gebäude, das es nicht einfach durchbricht, schubst es. Der Schubs hebt den Mindestanteil des Gebäudes für rund eine halbe Sekunde an – um bis zu 60 Prozentpunkte, je nachdem, wie groß das Monster im Vergleich zu dem ist, was vom Gebäude noch steht. Ein kleines Monster wirft so einen Schuppen um, ein großes ein angeschlagenes Hochhaus und ein riesiges auch ein unversehrtes. Geschubste Gebäude fallen in Laufrichtung. Ansturm (Dino) und Vollgas (Panzer) schubsen drei- bis vierfach.

### 11.6 Kettenreaktionen (Upgrade)

- **Freischaltung** mit Stufe 3, zunächst schwach. Es gibt dafür keinen eigenen Knopf mehr (das Kettensymbol war nicht verständlich); ab- und anschalten lassen sie sich in den Einstellungen, dort mit erklärendem Satz.
- **Wirkung:** Stürzt ein Gebäude ein oder ist es vollständig zerstört, läuft nach gut einer halben Sekunde ein Stoß zu den Nachbarn im Umkreis von etwa einem Häuserblock. Er beißt sichtbar in deren Fuß und schwächt sie dauerhaft – um 12 Prozentpunkte auf Stufe 3 und 6 weitere je Stufe, bis 55 ab Stufe 10. Der sanfte Einstieg soll verhindern, dass die Einnahmen an einer einzigen Stufe springen.
- **Domino:** Fällt ein Nachbar dadurch, gibt er den Stoß weiter, jede Generation mit 62 % der Stärke; eine Kette läuft sich so nach drei bis fünf Gebäuden tot. Zusätzlich ermüdet die Kette: Jeder Einsturz kurz nach einem anderen zählt wie eine weitere Generation, egal wodurch das Gebäude fiel (auch durch Trümmer); alle vier Sekunden erholt sie sich um einen Schritt. Vorher gaben von Trümmern gefällte Nachbarn den Stoß wieder mit voller Stärke weiter, und ein Drittel der Stadt fiel in unter einer Minute. Holzbauten fallen schon beim ersten Stoß, Ziegelbauten nach einem starken oder zweien, Betontürme erst, wenn sie angeschlagen sind oder mehrere Nachbarn gefallen sind. Mit jeder Stufe reißt eine Kette also weiter.
- Dazu kommt, was ohnehin gilt: Ein kippender Turm zerschlägt, worauf er fällt (11.6a).

### 11.6a Wucht: Masse entscheidet

Trifft ein fallendes Bruchstück die Welt, zählt nicht nur seine Geschwindigkeit, sondern auch, wie schwer es im Vergleich zu dem ist, worauf es fällt.

- **Schwer auf leicht:** Ist das Bruchstück mehr als zwölfmal so schwer wie das getroffene Gebäude (gemessen an dessen verbliebenen Würfeln), wird das Gebäude einfach zerdrückt: ein großer Biss (Radius 4 bis 24 m je nach Masse) mit voller Kraft, das Gebäude wird zusätzlich dauerhaft geschwächt, und das Bruchstück behält 96 % seines Tempos und bleibt selbst heil. Über dem ganzen Grundriss des zerdrückten Gebäudes steigt Staub auf.
- **Schwer auf schwer:** Bei ähnlich schweren Gegnern beißen sich beide wie bisher an – Radius und Kraft wachsen mit Tempo und Masse (Radius bis 20 m statt bisher 13). Das Bruchstück verliert 20 % Tempo, kann zerbrechen oder am Nachbarturm lehnen bleiben.
- **Totes Gewicht:** Liegt ein Bruchstück über 4 000 Masse auf einem viel leichteren Gebäude, drückt es dieses alle 0,2 Sekunden weiter ein, bis es am Boden ankommt. Ein Turmstück bleibt also nicht auf einem Kiosk liegen.
- **Was fällt, ist im Weg.** Ein Gebäude, das gerade umkippt, ist schon ein Hindernis, bevor es liegt: Der Kaputtmacher läuft nicht hindurch (er kann es zerschlagen wie jede Wand), Fahrzeuge halten davor oder weichen aus. **Was darunter gerät, wird getroffen:** Autos, Busse, Polizei- und Feuerwehrwagen zerplatzen sofort, Passanten werden durch die Luft gewirbelt und stehen wieder auf.
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
- **Staub:** Schwere Trümmer (ab 600 Würfeln) werfen beim Aufschlag sofort einen Staubstoß auf und hinterlassen meist eine helle Staubwolke, die 1,5 bis 3 Sekunden steht. Gibt ein Stockwerk nach, steigen über dem Grundriss drei solche Wolken auf, bei einem zerdrückten Gebäude zwei und dazu vier Staubstöße. **Seit Nachtrag 5 sparsamer:** Staubstöße haben 40 % weniger Teilchen, sind durchsichtiger, wachsen weniger und vergehen nach gut einer halben Sekunde (vorher fast eine Sekunde), die hängenden Wolken sind halb so lange da, halb so dicht besetzt und blasser – der Staub soll den Einsturz zeigen, nicht verdecken. Staub ist hell (Mauerwerk), Rauch dunkel (Feuer). Abschaltbar („Staub- und Rauchwolken“).

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
- `public/_headers` setzt eine Content-Security-Policy, die nur eigene Dateien erlaubt (mit Trusted Types; einzige Ausnahme ist der Musik-Worker, siehe 13a), schaltet ungenutzte Gerätefunktionen ab und lässt den Browser jede Datei beim Server nachfragen, damit sich nach einem Update nie alte und neue Dateien mischen.
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

### 13a Musik

Musik, die der Handlung folgt, vollständig im Browser komponiert und gerendert; es gibt weiterhin keine Audiodateien und keine Netzwerkzugriffe. Seit dem Nachtrag 2 zu Entwurf 12 erzeugt sie die eigene **Musik-Generator-Suite** des Autors (`public/src/vendor/musik-generator/`, MIT, ohne fremden Code).

**Charakter:** beschwingt, zackig, aufgekratzt und augenzwinkernd – eine retro-futuristische Mischung aus Chiptune und Synth mit modernem Punch: flinkes Puls-Lead, trockener, präziser Synth-Bass, schnelle Chip-Arpeggios, kurze Akkord-Stabs, knackiges Schlagzeug, kaum Hall. Stil „Arcade“ der Suite, Dur.

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
- Die Tonart je Welt entfällt in der neuen Musik: Jede Tonart wäre eine eigene Renderung.
- `node tools/vendor-music.mjs` kopiert die benötigten Dateien aus der Suite neu ein.

Eigener Lautstärkeregler in den Einstellungen (0 = aus). **Stand:** Gemessen im Browser unter der Policy von Netlify: Worker und Policy greifen, die Musik startet, beim Einstieg sind Schlagzeug und Melodie stumm, die Wechsel in die schnelleren Zustände laufen ohne Skriptfehler. **Nicht beurteilt:** wie sie klingt, ob der Ohrwurm trägt, ob die Lautstärke zu den Geräuschen passt, das Verhalten auf Handy und Tablet (Renderzeit, Speicher).

**Oberfläche:** unten Werkzeugleiste, rechts unten Springen und Brüllen, oben Welt-Zähler mit den Sternen der Alarmstufe, links oben Macht-Ring mit Stufe und darunter die Einblendungen der Erfolge, rechts oben Weltauswahl, Selbstspiel, Karte und Einstellungen, links unten die Minimap.

**Minimap** (`minimap.js`): ein rundes Fenster auf die Umgebung, damit man trotz des engen Blickfelds den Überblick behält. Sie dreht sich mit der Kamera – oben ist, wohin man schaut –, in der Mitte zeigt ein weißer Pfeil die Figur und ihre Blickrichtung. Der Boden erscheint in seinen gedämpften Farben (Straßen, Wiese, Sand, Wasser), Gebäude hell, je höher, desto heller; je mehr von einem Gebäude fehlt, desto orangener wird es, ein abgerissenes ist dunkelrot. Wo etwas zerstört wurde, liegt ein **roter Fleck**, je mehr, desto kräftiger (gezählt je 4 × 4 Würfel). Darüber Punkte für Feuer (flackernd orange), Polizei (blinkend), Feuerwehr, Hubschrauber und Autos. Der Ausschnitt wächst mit der Figur: mindestens 150 Würfel in jede Richtung, 8 Körperhöhen plus 120 bei großen Figuren, höchstens die halbe Welt. Am Rechner unten links (184 Pixel), auf Handy und kleinen Fenstern klein oben rechts unter dem Menüknopf (96 Pixel). **Ein- und ausblenden:** Knopf 🗺️ oben rechts (auf dem Handy im Menü), Taste **M** oder in den Einstellungen; die Wahl wird gespeichert. Das Bild wird gut sechsmal pro Sekunde neu gezeichnet. Die Liste der Erfolge liegt nicht mehr im Spielfeld, sondern als Pokal in der Weltauswahl und als Knopf in den Einstellungen.

**Einstellungen** (Zahnrad, ein gewöhnlicher Knopf; neben dem Impressum-Link der einzige Ort mit Text): Lautstärke, Grafik-Regler (12.4), Staub und Rauch, Feuerausbreitung, Einsatzkräfte, Kamerawackeln, Bewohner und Verkehr, Kettenreaktionen, Militär stößt zurück, Selbstspiel nach 2 Minuten, Minimap, alles freischalten, Vollbild, freie Flugkamera – und **„Von vorn beginnen“**. Früher öffnete sich das Zahnrad erst nach drei Sekunden Halten und war blass dargestellt; das wirkte wie abgeschaltet und ließ sich nicht entdecken.

**Spielprotokoll.** In den Einstellungen steht aufklappbar, wie lange jede Stufe jeder Figur gedauert hat (die letzten 60 Einträge, Selbstspiel gekennzeichnet). Es ist das Werkzeug, um die Schwellen aus 5.3 an echtem Spiel auszurichten.

**Spielstand als Datei.** „Spielstand als Datei sichern“ lädt den Stand als JSON-Datei herunter, „aus Datei laden“ liest eine solche Datei ein – etwa für den Umzug auf ein anderes Gerät. Eine geladene Datei durchläuft dieselben Prüfungen wie gespeicherte Daten (12.2); was sie nicht besteht, wird verworfen. Der Stand trägt eine Versionsnummer.

**Pause im Hintergrund.** Ist die Seite verborgen (anderer Tab, Bildschirm aus), verstummt aller Ton und die Simulation steht; die verlorene Zeit wird nicht nachgeholt.

**Sanduhr.** Beim Wechsel der Welt erscheint eine Sanduhr, bevor die Seite für den Aufbau kurz stillsteht.

**Von vorn beginnen.** Auf jedem Gerät lässt sich die Progression neu starten: Der Knopf löscht Stufen und Macht aller Figuren, abgeschlossene Welten, Sticker, Erfolge und Einstellungen auf diesem Gerät, und das Spiel beginnt wieder bei Stufe 1. Er verlangt zwei Schritte („Von vorn beginnen …“, dann „Ja, alles löschen“) und steht zusätzlich auf der Seite „Impressum & Datenschutz“.

## 14. Nächste Schritte

Offen aus der Analyse vom Oktober 2026, nach Wirkung sortiert:

| # | Schritt | Warum / Stand |
|---|---|---|
| 1 | Von Hand testen (TESTEN.md) und Balance nach dem Spielprotokoll nachziehen | Schwellen, Erfolge und Sprungweiten beruhen auf Selbstspiel-Messungen |
| 2 | Entscheiden, ob Figuren erst freigeschaltet werden müssen | Derzeit sind alle fünf von Anfang an wählbar |
| 3 | Meshing in einen Hintergrund-Thread | Würde Masseneinstürze und schwache Geräte am meisten entlasten; größerer Umbau |
| 4 | Speicherbedarf der großen Welten senken (12.3) | Rund 190 MB in der Wolkenkratzer-Stadt |
| 5 | Bruchstücke stoßen einander | Trümmer stapeln sich glaubwürdiger |
| 6 | Ruß ohne Nebenwirkung | Verrußte Würfel zählen als zerstört und schwächen das Gebäude; sauberer wäre eine reine Färbung |
| 7 | Verkehr verfeinern: Ausweichen, Ampeln; Vögel, Hunde | Autos durchdringen sich noch |
| 8 | Als App installierbar, offline spielbar | Braucht ein App-Symbol und eine saubere Versionierung des Zwischenspeichers |
| 9 | Oberfläche ausdünnen | Ring, Zähler, Sterne, Karten und vier Knöpfe stehen im Bild |
| 10 | Stellgrößen bündeln, `main.js` und `tools.js` teilen | Beide Dateien haben rund 1 000 Zeilen |
| 11 | Schlagschatten; Zeitlupe und Zurückspulen; Feuer an fallenden Bruchstücken | Ältere Wünsche |
| 12a | Verbiegen statt Brechen; rutschiges Eis und Schnee, der Feuer bremst | Aus der Durchsicht der Naturgesetze je Welt (11.1a, 11.4a) |
| 12 | Weitere Welten | Ideen: Wüste mit Oase und Pyramidenfeld, Vulkaninsel, Wildwest-Stadt mit Eisenbahn, Süßigkeitenland, Mondbasis |

## 15. Entscheidungen

**Getroffen:** Planet als gekrümmte Rundum-Welt · Bewohner kommen nie zu Schaden · Maus und Tastatur haben Vorrang · Macht bleibt dauerhaft · Wachstum schaltet Werkzeuge frei · 90 % gelten als zerstört · Ziffern in Zählern sind in Ordnung · Wachstum ohne feste Obergrenze · freie Weltauswahl · hohe Schwerkraft.

**Offen:**

| # | Frage | Meine Empfehlung |
|---|---|---|
| 1 | **Wie groß ist „groß genug“?** 512 m sind umgesetzt. 1 km ist machbar, kostet aber die Arbeiten aus 12.3. | Erst spielen; 512 m bedeuten 236 bis 848 Gebäude pro Planet |
| 2 | **Soll die Weltauswahl für das Kind vereinfacht werden?** Sie enthält jetzt Welten, Figur, Stufe und Mischer auf einer Seite. | Mischer hinter einen eigenen Würfel-Knopf legen, sobald es stört |
| 3 | **191 MB für die Wolkenkratzer-Stadt** sind für einen Rechner in Ordnung, für ältere Geräte viel. Lauflängen-Kodierung vorziehen? | Ja, sobald die Welt auf einem eurer Geräte ruckelt oder nicht lädt; auf Handys ist sie schon jetzt nur 256 m groß (51 MB) |
| 4 | **Sprunghöhe mit Halten steuern** (kurz tippen = kleiner Hüpfer)? | Nein, ein Sprung ist für einen 5-Jährigen leichter zu lernen |

## 16. Umsetzungsstand (9. Oktober 2026, Entwurf 11)

**Starten:** im Projektordner `python3 serve.py` ausführen und `http://localhost:8000` öffnen. Der mitgelieferte Server verbietet dem Browser das Zwischenspeichern; mit einem gewöhnlichen Dateiserver kann nach einem Update eine alte Quelldatei neben einer neuen im Cache bleiben, und das Spiel bleibt mit „… is not a function“ stehen.

**Testhilfen in der Adresse** (speichern keinen Fortschritt): `?world=skyline|blocks|garden|house|toyland|village|park|funfair|castle|winter|city|airport|factory|harbour|reef|spaceport|giants|primeval|babel|neon|fortress|skyyard|random`, `?stage=1…`, `?unlock=1`, `?tool=rocket`, `?quality=low`, `?fly=1`.

**Vorhanden:** alles, was in den Abschnitten 4 bis 13 beschrieben ist, mit den dort genannten Zahlen – außer den folgenden Punkten.

**Stand der Neuerungen aus Entwurf 9:** Sichtfenster und Hydranten-Fontäne (samt Löschen eines Brandherds) sind auf Standbildern geprüft, die Progression über Messläufe je Stufe (5.3). Das Zerdrücken kleiner Gebäude, das tote Gewicht, die Staubwolken, die Funken an Lampen, explodierende Autos und das Zischen des Wassers liefen in den Messläufen fehlerfrei mit, wurden aber nicht einzeln begutachtet. Ein durchgehender Lauf von Stufe 1 bis 9 mit den neuen Schwellen wurde nicht gemessen.

**Prüfwerkzeuge.** Im Ordner `tools/` (wird nicht veröffentlicht) liegen `check.mjs` (ohne Browser: Laden beschädigter Spielstände, Erfolgsliste, Erzeugung aller Welten) und `smoke.mjs` (spielt in einem eigenen Headless-Browser alle 18 Welten und sechs längere Szenarien durch). Beide liefen mit diesem Stand fehlerfrei. Was nur ein Mensch beurteilen kann, steht als Checkliste in `TESTEN.md`; sie ist noch nicht abgearbeitet.

**Nachtrag zu Entwurf 12:** Auf Standbildern gesehen: das Rollfeld und das Hafenmeer. Gemessen: die Einnahmen von Dino und Flieger (5.3, 9.2). **Nicht geprüft:** das Zielen durch ausgeblendete Wände in der Praxis, ob fallende Gebäude wirklich im Weg sind und Fahrzeuge treffen (die Abfragen laufen fehlerfrei mit, beobachtet habe ich es nicht), die neue Musik (nie gehört), ob sich das langsamere Wachstum richtig anfühlt.

**Stand der Neuerungen aus Entwurf 12:** Gemessen: Klettern auf Stufe 2 (hinauf, hinunter, seitlich um eine Ecke, Sprung von der Wand und erneutes Greifen), auf den Stufen 5 und 7 mit Einschränkungen (große Figuren reißen die Wand ein und fallen; an einem Sims wechselte die Figur ins Gebäude); Schwimmen unter dem Meer (sechs Züge, 35 Würfel Höhe) mit zwölf Meerestieren und U-Booten; der Flieger prallt ab und bleibt über dem Boden; eine Baumgruppe mit durchtrennten Stämmen fällt; alle 18 Welten werden mit Großgrundstücken erzeugt. Auf Standbildern gesehen: die verschlungene Achterbahn um ein Riesenrad, das Hafenbecken mit durchscheinendem Wasser und Ozeanriesen. **Nicht geprüft oder nicht begutachtet:** die Musik (nie gehört), das Anvisieren von Hubschraubern in der Praxis, der Wurf des Affen, das Abziehen der Hubschrauber bei sinkendem Alarm, das Nachgeben aufgefangener Gerippe (ein Riesenrad ließ sich im Test nicht zum Kippen bringen, weil seine Fußbalken breit sind), Waten und Boote, Büros und Möbel im Bild, Fundstücke, das Klettern im Selbstspiel, die große Burg und die Jumbojets im Bild.

**Stand der Neuerungen aus Entwurf 11:** Auf Standbildern gesehen: alle acht neuen Welten (Riesenrad, Achterbahn, Zelte, Buden; Schiffe, Tanklager, Containerberge; Statue, Kühltürme, Stadion; Burgen, Windmühle; Schanze, Schneemann, Eisbahn, Tannen; Flugzeuge, Hangars, Kontrollturm; Kuppeln, Korallen, Tang, Bohrinsel; Raketen samt Explosion beim ersten Treffer, Montagehalle); das Festhalten an der Wand ist gemessen (Griff, Halten, Klettern, Loslassen auf den Stufen 1, 3, 6 und 8), aber nicht im Bild begutachtet; fahrende Autos auf den Straßen. Gemessen: Im Stadtverkehr warteten Autos in 3 bis 6 % der Zeit vor einem Hindernis, keines stand neben der Straße; die Einnahmen je Stufe (5.3). **Nicht begutachtet:** wie der Verkehr in Bewegung aussieht (Abbiegen, Ausweichen, Durchdringen), ob Einsatzfahrzeuge über das Straßennetz sauber ans Ziel kommen, die Dachlandung, die Selbstspiel-Kamera, Ballons, das Zurückstoßen durch das Militär, Sichern und Laden des Spielstands als Datei (die Prüfung der Daten ist getestet, der Dialog des Browsers nicht), die Pause im Hintergrund. Die Schwellen der Erfolge sind weiter geschätzt.

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
| Verkehr | Autos weichen einander nicht aus; keine Ampeln, keine Vorfahrt |

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
- **Kamera:** Sie folgt der Figur wie im normalen Spiel, atmet dabei aber langsam zwischen einer nahen und einer weiten Einstellung (Abstand 0,85- bis 1,65-fach, ein Zyklus rund 80 Sekunden) und neigt sich leicht. Bei einem großen Einsturz läuft höchstens alle neun Sekunden knapp eine Sekunde Zeitlupe. Echte Kamerafahrten um die Figur herum gibt es nicht, weil der Autopilot über das Bild zielt.
- **Ruhe:** Im Selbstspiel sind die Karten der Erfolge und die Sterne ausgeblendet, die Sirenen leiser. Das Selbstspiel sammelt Macht, aber **keine Erfolge und keine Zähler** – die sind für den Spieler.

## 18. Erfolge

135 kleine Ziele, jedes eine Schwelle auf einem Zähler: zerstörte Würfel insgesamt und nach Material, Gebäude und Hochhäuser, Einstürze, zerdrückte Häuser, die längste Kettenreaktion, mehrere Gebäude in zehn Sekunden, zerstörte Welten (auch jede der 19 einzeln), erreichte Stufen (insgesamt, je Figur, mit allen Figuren), Explosionen, Brände, Hydranten, Lampen, erwischte fahrende Autos, umgeworfene Polizei- und Feuerwehrautos, abgeschossene Reporter-, Militär-Hubschrauber und Kampfflieger, die Alarmstufe, Sprünge, Saltos, Stampfbomben, Brüller, Rempler, zurückgelegte Strecke, durch die Luft gewirbelte Bewohner, Angriffe, gesammelte Macht, Zeit im Selbstspiel und Spielzeit, Sticker und die Zahl der Erfolge selbst.

- **Einblendung:** Wird ein Erfolg erreicht, schiebt sich links unter dem Macht-Ring für gut vier Sekunden eine Karte herein: großes Symbol, Name, ein Satz dazu, ein Pokal an der Ecke, dazu ein kurzer heller Klang. Höchstens zwei Karten zugleich; warten mehr als drei, bleibt jede nur knapp zwei Sekunden.
- **Lesen ist freiwillig.** Die Karten sind der einzige Text im Spielfeld. Wer nicht lesen kann, sieht Symbol und Pokal und hört den Klang; für das Spielen braucht man den Text nie.
- **Liste:** Der Pokal in der Weltauswahl (und ein Knopf in den Einstellungen) öffnet alle Erfolge. Erreichte sind farbig, die übrigen grau mit einem Balken, der zeigt, wie weit es noch ist.
- **Zähler** werden in der Simulation nur hochgezählt und zweimal pro Sekunde ausgewertet. Sie gelten für alle Figuren gemeinsam, liegen im Spielstand und werden mit „Von vorn beginnen“ gelöscht. Im Selbstspiel wird nicht gezählt (außer der Zeit im Selbstspiel).
- Die Liste steht in `achievements.js`; ein neuer Erfolg ist eine Zeile.

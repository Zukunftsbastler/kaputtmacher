# Kaputtmacher – Spielkonzept (Entwurf 12, Stand 12. November 2026)

Status: spielbar. Diese Datei beschreibt den **Ist-Zustand** mit den Zahlen, die im Code stehen. Was davon automatisch geprüft ist und was nur ein Mensch beurteilen kann, steht in Abschnitt 16.

Ausführliche Teile stehen in Anhängen, damit man nur liest, was man braucht:

| Anhang | Inhalt |
|---|---|
| [konzept/welten.md](konzept/welten.md) | alle Welten im Einzelnen: Katalog, Heimatwelten, Superstrukturen, Großgrundstücke und Innenleben (7.4 bis 7.4c) |
| [konzept/figuren.md](konzept/figuren.md) | jeder Angriff jeder Figur in beiden Fassungen, Entwurf und Ausgleich von Hubschrauber und Tentakel (9.2, 9.4) |
| [konzept/physik.md](konzept/physik.md) | das Zerstörungs- und Physikmodell (11) |
| [konzept/musik.md](konzept/musik.md) | die Musik je Welt (13a) |

Wie das Spiel zu diesem Stand kam, steht in [VERLAUF.md](VERLAUF.md); was als Nächstes verbessert werden sollte, mit Messwerten, in [REFACTORING.md](REFACTORING.md); was von Hand zu prüfen ist, in [TESTEN.md](TESTEN.md).



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

- Dritte-Person-Ansicht von schräg hinten. Acht Figuren: Dino, Gorilla, Roboter, Panzer, Bagger, Flieger, Hubschrauber, Tentakel. Sie sehen nicht nur anders aus, sie zerstören grundverschieden (Abschnitt 9).
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
| **Festhalten an der Wand** | Ein Sprung, der an der Wand eines Gebäudes endet, reißt nicht einfach ein Loch hinein: Die Figur **krallt sich fest** (Arme hoch, Beine angezogen) und ist damit im **Klettermodus**. Sie hängt immer gerade vor der Wandfläche, auch nach einem schrägen Sprung, und mit Armlänge Abstand (`Monster.wallFace`; bis November 2026 übernahm sie die Sprungrichtung und hing schräg, mit der Schulter im Gebäude). Beim Zupacken bricht ein Stück heraus – eine Delle bei einer kleinen Figur, ein richtiges Loch bei einer großen (Radius 9 % der Körperhöhe plus 0,8 Würfel) |
| **Klettern** | Dieselbe Steuerung wie am Boden, nur an der Wand: **vorwärts = hinauf, rückwärts = hinunter, links und rechts = seitlich an der Wand entlang**. Am Handy ist das der Stick. An einer Hausecke geht es von selbst um die Ecke herum auf die nächste Seite, in einer Innenecke auf die Querwand. Oben zieht sich die Figur aufs Dach oder auf einen Sims; unten steht sie wieder auf dem Boden. Tempo: 8 + 2,2 × Körperhöhe Würfel pro Sekunde, gedrosselt, während eine Hand umgreift. Die Kamera stellt sich hinter die Figur |
| Klettermodus verlassen | Nur auf drei Arten: Es gibt nichts mehr zum Greifen (die Wand ist weg), die Füße stehen (Boden, Dach, Sims), oder man drückt die Sprungtaste. Wer rennt (Umschalt), krallt sich gar nicht erst fest, sondern bricht wie bisher durch die Wand |
| Sprung von der Wand | Die Sprungtaste stößt die Figur **nach oben und ein Stück nach hinten** ab (2,4 Körperhöhen hoch). Wer danach wieder nach vorn drückt, landet weiter oben erneut an der Wand; der Doppelsprung ist danach wieder frei |
| Gewicht | Ab Stufe 3 reißen die Krallen beim Klettern jede Sekunde weiter Stücke heraus. Gibt die Wand nach, fällt die Figur |
| Angriff | An der Wand hängend kann man zuschlagen |
| Wer klettert | Alle Figuren außer Panzer, Bagger, Flieger, Hubschrauber und Tentakel, auch im Selbstspiel (dort klettert die Figur einfach hinauf). An Bäumen, Laternen und Kleinkram hält sich niemand fest |
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

Dino, Gorilla, Roboter, Panzer, Bagger, Flieger, Hubschrauber und Tentakel haben jeweils eine eigene Stufe und eigene Macht. Wer mit dem Dino Stufe 7 erreicht hat, beginnt mit dem Roboter trotzdem bei Stufe 1 und schaltet dessen Angriffe einzeln frei. Alle sechs Figuren sind von Anfang an wählbar; in der Weltauswahl zeigt jede ihre Stufe. Beim Wechsel wird die Figur sofort mit ihrer eigenen Größe weitergespielt. Ein Spielstand aus der Zeit davor wird der zuletzt gespielten Figur gutgeschrieben.

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
| Festungsmauerwerk (Mauern, Türme, Torhäuser von Festung Titan) | 22 | 3 | große Brocken; nur mit Wucht zu brechen |
| Fels (Berg der Winterwelt, Vulkan) | 16 | 2 | zäh, aber zu brechen: in acht starken Schwanzhieben gräbt ein Dino auf Stufe 3 ein halb so tiefes Loch, wie die Wand dick ist (885 Würfel), auf Stufe 5 ist er durch (seit Nachtrag 15; mit 40 kam auch Stufe 4 kaum hinein) |

Ein Treffer hat eine Stärke, die zum Rand hin abnimmt. Ist sie größer als die Festigkeit, bricht der Würfel sicher. Ist sie etwas kleiner, bricht er mit einer Wahrscheinlichkeit – so bröckelt auch zu hartes Material bei wiederholten Schlägen, statt gar nicht zu reagieren.

### 7.4 Weltkatalog (Kurzfassung; alles Weitere in [konzept/welten.md](konzept/welten.md))

20 Welten, alle von Anfang an wählbar. Fast alle sind Planeten mit 512 m Kantenlänge (1 024 Würfel zu 50 cm; auf Handys und schwachen Geräten 256 m), das Bauklotz-Zimmer ist eine Insel von 64 m mit Würfeln zu 20 cm. Die Zahl im Kästchen der Weltauswahl ist die Stufe, für die eine Welt gebaut ist.

| Welt | Heimat von | Stufe | | Welt | Heimat von | Stufe |
|---|---|---|---|---|---|---|
| 🦕 Urzeit-Nekropole | 🦖 Dino | 6 | | 🏘️ Dorf | | 5 |
| 🏛️ Babel | 🦍 Gorilla | 7 | | 🎡 Vergnügungspark | | 4 |
| 🌃 Neon-Megacity (Nacht) | 🤖 Roboter | 8 | | 🏙️ Stadt | | 6 |
| 🏰 Festung Titan | 🪖 Panzer | 7 | | 🏭 Fabrik | | 8 |
| ☁️ Wolkenwerft | ✈️ Flieger | 6 | | 🏰 Ritterburgen | | 5 |
| 🚧 Großbaustelle | 🚜 Bagger | 3 | | ⛄ Winterwelt | | 5 |
| ⚓ Hafen | 🚁 Hubschrauber | 7 | | 🛫 Flughafen | | 6 |
| 🐠 Stadt unter dem Meer | 🐙 Tentakel | 7 | | 🗿 Welt der Riesenbauten | | 9 |
| 🌆 Wolkenkratzer-Stadt (Hauptszenario) | | 1 | | 🚀 Raumhafen | | 8 |
| 🧱 Bauklotz-Zimmer | | 1 | | 🎲 Gewürfelt (Weltenmischer, 7.7) | | – |

**Jede Figur beginnt in ihrer Heimatwelt**, bis der Spieler für sie eine andere wählt; das Spiel merkt sich die Wahl je Figur. Die Bauten einer Welt sind durch **Superstrukturen** verbunden (Hochbahnen, Skybridges, Superhighways, Lianen, Hängebrücken, Achterbahnen, Aquädukte, Wehrgänge, Glasröhren, Seilbahnen …), mit Knotenpunkten auf Flächen und Dächern. **Großgrundstücke** tragen Wahrzeichen in doppelter Größe (Riesenrad, verschlungene Achterbahn, Hafenbecken, Berg mit Goldbergwerk, Vulkan mit Geheimgang); Häuser und Büros sind eingerichtet, und in manchen Bauten liegen Fundstücke, die etwas auslösen (Lawine, Vulkanausbruch).

### 7.5 Weltauswahl

Die nächste Welt bestimmt der Spieler selbst.

- **Jederzeit offen:** Der Weltkugel-Knopf oben rechts ist von der ersten Minute an da. Es gibt keine gesperrten Welten.
- **Kacheln mit zwei Zeichen:** Jede Welt zeigt unten links die Stufe, für die sie gebaut ist – grün, sobald das eigene Monster sie erreicht hat, sonst grau. Oben rechts steht ein Haken, wenn die Welt einmal zu 100 % zerstört wurde.
- **Nach 100 %:** Der große Pfeil öffnet dieselbe Auswahl, statt automatisch weiterzuschalten.
- **Zu früh in eine große Welt?** Erlaubt. Ein kleines Monster kann dort Glas, Autos und Bäume zerlegen und an Mauern knabbern; es wächst dabei weiter.
- **In derselben Auswahl,** von oben nach unten: die acht Figuren (zuoberst und größer: das ist, was Spieler am meisten übersehen), die Welten, die Monsterstufe (jede erreichte), Weltenmischer mit Würfel-Knopf, Stickeralbum, Erfolge.
- **Geöffnet** über den Weltkugel-Knopf oder das Gesicht der Figur im Macht-Ring.

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

### 9.2 Die Angriffe (Kurzfassung; jede Fassung mit Reichweite und Stärke in [konzept/figuren.md](konzept/figuren.md))

Jede Figur hat vier Angriffe, freigeschaltet auf den Stufen 1, 3, 5 und 7, jeden in einer schnellen und einer starken Fassung.

| Figur | Bewegung | Angriffe |
|---|---|---|
| 🦖 Dino | läuft, springt, klettert | Schwanz, Biss, Ansturm, Feuer und Atomstrahl |
| 🦍 Gorilla | läuft auf den Knöcheln, klettert | Fäuste, Würfe, Stampfen und Sprungschlag, Raserei |
| 🤖 Roboter | läuft, klettert | Laserklinge, Orbitalschlag, Raketen, Laser |
| 🪖 Panzer | Ketten, hüpft nur | Kanone, Mörser, Rammen, Flammenwerfer und Bunkerbrecher |
| 🚜 Bagger | Ketten, Arm statt Sprung | Schaufel, Hydraulikhammer, Schwenken, Auskippen und Planierschild |
| ✈️ Flieger | fliegt immer vorwärts | Bordkanone und Bomben, Raketen, Bombenteppich, Brandbomben und Riesenbombe |
| 🚁 Hubschrauber | schwebt, steigt bei gehaltener Sprungtaste | Bordkanone, Raketen, Seilwinde mit Haken und Abrissbirne, Rotorsäge und Tornado |
| 🐙 Tentakel | reist unter der Erde | Peitsche, Umschlingen, Tinte, Erwachen der Tiefe |

Was eine Figur ausmacht, steht als Eigenschaften in `SPECIES` (`species.js`): Bewegungsart, Ketten, Kamera, ob der Geist ihre Angriffe vormachen kann, Emoticons, Sprungknopf, Macht-Anteil.

### 9.3 Animation und Wucht

- **Gelenkmodelle.** Jede Figur besteht aus Teilen mit Gelenken, die aneinanderhängen: Rumpf → Kopf → Kiefer, Rumpf → Arme, Rumpf → Schwanz → Schwanzspitze (Dino), Wanne → Turm → Rohr (Panzer), Rumpf → Raketenmagazine (Roboter). Beugt sich der Rumpf, gehen Kopf und Arme mit; die Beine bleiben stehen.
- **Körpersprache im Leerlauf:** Atmen, Schwanzpendeln, der Kopf (beim Panzer der Turm) folgt dem Zielpunkt. Beim Gehen wippt der Körper; der Gorilla läuft auf den Knöcheln, der Dino vorgebeugt mit nachschwingendem Schwanz, der Roboter steif mit Gegendrehung. Im Sprung werden die Beine angezogen und die Arme hochgerissen. Beim Brüllen Kopf zurück, Kiefer weit auf.
- **Jeder Angriff hat eine eigene Bewegung** aus Ausholen, Schlag und Ausschwingen – mit Gegenbewegung beim Ausholen (zurücklehnen, ducken, einrollen) und Überschwingen danach.
- **Wucht beim Treffer:** Staubring und Blitz, Kameraruck, Trümmerfontäne. Bei schnellen Angriffen hält die Welt 0,045 s still. Bei starken hält sie 0,09 s still und läuft danach rund 0,3 s in Zeitlupe (40 %) weiter.

Spätere Kandidaten: Abrissbirne, Meteor, Tornado, schwarzes Loch, Riesenmagnet.

### 9.4 Hubschrauber und Tentakel

Die beiden jüngsten Figuren bewegen sich anders als alle anderen und sind deshalb ausführlich in [konzept/figuren.md](konzept/figuren.md) beschrieben, samt Ausgleich ihres Schadens gegenüber den übrigen Figuren. Kurz: Der Hubschrauber schwebt, gleitet mit Trägheit, steigt nur bei gehaltener Sprungtaste und richtet die Nase zum Ziel. Das Tentakel hat kein Gesicht, sondern Manga-Emoticons über der Spitze; es reist unsichtbar unter der Erde, hebt dabei die echten Würfel über sich an (ab Stufe 3 bleibend) und bricht zum Angreifen durch Straßen und Häuser nach oben. Im Spieltest fanden nicht alle sie so gut wie die anderen Figuren, andere waren große Fans: Sie decken andere Vorlieben ab und bleiben.

## 10. Zeigen statt erklären

1. **Start ohne Menü.** Beim ersten Start steht das Monster sofort auf dem Platz im Zentralpark der Wolkenkratzer-Stadt.
2. **Geister-Vorführung.** Ein durchscheinender Zwilling des Monsters macht neben ihm die Handlung vor: laufen, ausholen und zuschlagen (der Dino mit seinem Schwanzschlag), springen, brüllen.
3. **Eingabe-Bild.** Dazu zeigt eine Blase das gerade benutzte Gerät in Aktion: Tasten mit blinkender Taste, eine Maus mit blinkender linker Taste, ein Gamepad-Knopf oder ein tippender Finger.
4. **Nachmachen beendet die Vorführung** dauerhaft.
5. **Sanfte Erinnerung** nach 25 Sekunden ohne Eingabe.
6. **Neues kommt einzeln.** Ein neues Werkzeug springt mit dem Wachstumsmoment in die Leiste, liegt sofort in der Hand und wird vorgeführt.
7. **Wenige Knöpfe.** Auf dem Bildschirm stehen neben der Steuerung nur drei: Weltauswahl, Selbstspiel und Einstellungen.
8. **Figur und Welt wechseln wird vorgeführt.** Im Spieltest übersahen die meisten, dass es acht Figuren und zwanzig Welten gibt. Deshalb pulsiert nach dem ersten Wachsen (spätestens nach drei Minuten) der Weltkugel-Knopf, und die Blase zeigt alle acht Figuren, die hintereinander hüpfen. Auch das Gesicht der Figur im Macht-Ring öffnet die Auswahl. Nach jedem Weltwechsel steht für drei Sekunden eine Karte im Bild: Figur ➜ Welt.

Reihenfolge: Laufen → Schlag → Springen → Zähler füllt sich → Macht fliegt zum Monster → erstes Wachstum → Figuren- und Weltwahl → Stampfen → weitere Angriffe → Weltauswahl bei 100 %.

## 11. Zerstörungs- und Physikmodell (Kurzfassung; alles Weitere in [konzept/physik.md](konzept/physik.md))

- **Schwerkraft** ist absichtlich mehrfach stärker als echt (85 Würfel/s²), damit Trümmer krachen statt schweben. Einige Welten haben eigene Naturgesetze (unter dem Meer sinkt alles langsam, nichts brennt, die Figur schwimmt).
- **Drei Zustände eines Würfels:** fest im Gitter → Teil eines starren Bruchstücks → loser Würfel → zurück ins Gitter als Schutt.
- **Treffer** entfernen Würfel nach Material und Wucht; die **Haltprüfung** sucht danach, was keinen Boden mehr berührt, und löst es als Bruchstück heraus. **Nichts schwebt:** schräg gezeichnete Teile werden beim Erzeugen verschweißt.
- **Stabilität:** Gebäude führen Buch über Tragkraft und Last je Stockwerk und geben nach, wenn einem Stockwerk zu viel fehlt – Holz früh, Beton spät. **Schlanke Bauten** (Bäume, Riesenräder, Stützen) kippen, wenn ihr Schwerpunkt über die Standfläche hinausragt. **Superstrukturen** brechen nach ihrem Material: Seile reißen und schwingen herab, Träger halten als Kragarm, Steinbrücken stürzen feldweise ein.
- **Wucht nach Masse:** Ein Turmstück zerdrückt ein kleines Haus, an einem großen bleibt es lehnen. **Kettenreaktionen** ab Stufe 3 (abschaltbar) schwächen die Nachbarn eines einstürzenden Gebäudes.
- **Feuer** richtet sich nach dem Material (Laub und Holz brennen, Glas platzt, Stein und Blech verrußen); Wasser aus zerstörten Hydranten löscht. **Die Welt reagiert:** Funken, explodierende Autos und Tanks, Munitionsdepot, Lawine, Vulkanausbruch.
- **Aufräumen:** Lose Trümmer verschwinden nach 30 Sekunden, Schutthaufen ab 14 Würfeln bleiben als Ruinen.
- **Grenzen:** höchstens 36 Bruchstücke zugleich (ist die Grenze erreicht, werden kleine Gruppen gleich zu losem Schutt), 9 000 Schuttwürfel und 3 000 Effektteilchen auf Detailstufe 4. Die Simulation ist reproduzierbar: feste Schritte, eigener Zufall (`game.rng`), und das Kamerawackeln beeinflusst das Zielen nicht.

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
| Quellcode | Englisch, rund 15 000 Zeilen in 65 Modulen (ohne die eingekopierte Musik-Suite) |
| Threads | Spiel und Zeichnen im Haupt-Thread; Vernetzen (zwei bis drei Worker), Welterzeugung beim Reisen und Musik in eigenen Workern (12.5) |

### 12.2 Netlify

- Veröffentlicht wird der Ordner `public/` unverändert (`netlify.toml`). Konzept und Prompts liegen außerhalb.
- `public/_headers` setzt eine Content-Security-Policy, die nur eigene Dateien erlaubt (mit Trusted Types; die einzigen Ausnahmen sind die eigenen Worker für Musik, Vernetzen und Welterzeugung, deren Adressen je eine benannte Policy nennen darf), schaltet ungenutzte Gerätefunktionen ab und lässt den Browser jede Datei beim Server nachfragen, damit sich nach einem Update nie alte und neue Dateien mischen.
- **Impressum und Datenschutzerklärung** stehen in `public/impressum.html`, im Spiel jederzeit erreichbar über einen kleinen Textlink unter dem Macht-Ring. Das ist neben den Einstellungen die einzige Textstelle; die Regel „sprachfrei“ tritt hier hinter die gesetzliche Pflicht zurück. **Spielstand löschen:** Auf der Seite „Impressum & Datenschutz“ steht dort, wo die Speicherung erklärt wird, ein Knopf, der alles entfernt, was das Spiel im Browser gespeichert hat. Er ist über den Link im Spiel jederzeit zu finden, liegt aber auf einer eigenen Textseite und verlangt zwei Schritte (erst „löschen …“, dann „Ja, endgültig löschen“ – „Abbrechen“ ist vorausgewählt). Denselben Zweck erfüllt „Von vorn beginnen“ in den Einstellungen.
- Eingaben von außen – Adress-Parameter und der Spielstand im Browser – werden vor der Verwendung geprüft; Einzelheiten in der README, Abschnitt „Sicherheit“.

### 12.3 Speicher und große Welten

| Verfahren | Stand | Wirkung |
|---|---|---|
| Blöcke von 32³ Würfeln | vorhanden | Nur Betroffenes wird angefasst |
| Einheitliche Blöcke als ein Wert | vorhanden | Luft und massiver Boden kosten fast nichts |
| Ein Byte pro Würfel über eine gemeinsame Typ-Tabelle | vorhanden | 127 Würfelarten plus je eine Schutt-Variante |
| Bauplan statt Speicherstand | vorhanden | Nichts wird gespeichert: Welten entstehen bei jedem Laden neu, auf Planeten in 0,9 bis 3 s (Erzeugen und Zählen), das Bauklotz-Zimmer in 0,05 s |
| **Welterzeugung im Worker** | **vorhanden** | Beim Reisen entsteht die neue Welt in einem Worker (`world-worker.js`), die Seite bleibt lebendig; vorher wird die alte Welt freigegeben, damit nicht zwei zugleich im Speicher liegen |
| Nur sichtbare Flächen | vorhanden | Verdeckte Würfelseiten entfallen |
| **Sichtbarer Ausschnitt** | **neu, vorhanden** | Auf Planeten haben nur die Blöcke innerhalb der Kappe ein Gitternetz; was hinter den Horizont fällt, wird aus dem Grafikspeicher entfernt und bei Rückkehr neu aufbereitet |
| Feste Vorräte | vorhanden | Schutt und Effekte erzeugen keinen Speichermüll |
| Lauflängen-Kodierung ferner Blöcke | offen | würde den Arbeitsspeicher großer Planeten etwa halbieren; für die Wolkenkratzer-Stadt am wichtigsten |
| **Zusammengefasste Flächen** | **neu, vorhanden** | Gleichartige, gleich beleuchtete Nachbarflächen werden zu einem Rechteck. Bauklotz-Zimmer: 18 000 statt 153 000 Flächen; Dorf: 1,8 statt 3,1 Millionen. Die leichte Farbabweichung von Würfel zu Würfel entsteht erst beim Zeichnen. Auf Planeten sind Rechtecke waagerecht höchstens 4 Würfel lang, sonst klaffen sie durch die Krümmung auseinander |
| **Haltprüfung mit Merkern pro Block** | **neu, vorhanden** | Merker gibt es nur für Blöcke, die eine Suche berührt hat – vorher zwei Bit für jeden möglichen Würfel der Welt (33 MB, bei 256 m Höhe wären es 134 MB gewesen) |
| **Kompakte Flächen** | **vorhanden** | Eine Fläche ist ein Eintrag von 16 Byte (Ecke, Ausdehnung, Seite, Kantenabdunklung, Farbe), die vier Ecken errechnet der Shader; vorher vier Scheitelpunkte mit zusammen 48 Byte. Wolkenkratzer-Stadt: rund 65 statt 190 MB Grafikspeicher |
| **Vernetzen in Workern** | **vorhanden** | siehe 12.5 |
| Vereinfachte Ferne | offen | erlaubt eine größere sichtbare Kappe |

Gemessen (November 2026, Detailstufe 4): Arbeitsspeicher für die Würfel 4 MB (Bauklotz-Zimmer), 48 bis 129 MB (Planeten), 191 bis 193 MB (Wolkenkratzer-Stadt, Neon-Megacity). Grafikspeicher für die Flächen im Sichtkreis 5 bis 70 MB. Gezeichnet werden gleichzeitig 250 bis 1 750 Blöcke.

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

Daneben lassen sich die teuren Effekte einzeln abschalten: Staub- und Rauchwolken, Feuerausbreitung, Einsatzkräfte, Bewohner, Kettenreaktionen. Unabhängig davon nimmt die automatische Anpassung (11.9) bei schlechter Bildrate weiter Teilchen und Auflösung zurück. Bei automatisch gewählter Grafik geht das Spiel außerdem einmal je Sitzung eine Stufe herunter, wenn es in den ersten 40 Sekunden dauerhaft unter etwa 35 Bildern pro Sekunde bleibt (gespeichert wird das nicht). Ein Wechsel der Stufe baut die Welt neu auf.

### 12.5 Ablauf eines Bildes und Threads

Ein Bild: Eingabe → Kamera und Zielstrahl → 0 bis 3 Simulationsschritte zu 1/60 s → neue Netze → zeichnen. Was ein Bild kostet, zeigt `?perf=1` in der Adresse (Simulation, Vernetzen, Zeichnen, schlechtestes Bild der letzten Sekunde).

- **Vernetzen** (`meshing.js`) ist der teuerste Teil und läuft in zwei bis drei Workern (`mesh-worker.js`). Blöcke, die durch Zerstörung geändert wurden, gehen vor Blöcken, die nur ins Bild kommen; getroffene Blöcke direkt bei der Figur werden sofort vernetzt (höchstens 2 ms je Bild), damit ein Loch im selben Bild zu sehen ist. Große Bruchstücke werden ebenfalls in einem Worker vernetzt; bis ihr Netz da ist, zeigen die Blöcke, aus denen sie stammen, sie noch an ihrem Platz. Ohne Worker vernetzt das Spiel alles selbst, mit einem Zeitbudget je Bild.
- **Gemessen** (30 Sekunden Selbstspiel, Detailstufe 4, Apple M3 Pro): Rechenzeit pro Bild 3,7 ms in der Wolkenkratzer-Stadt und 5,2 ms in der Neon-Megacity (vorher 6,3 und 14,2 ms); Bilder über 25 ms: 0 bzw. 0,1 % (vorher 3 und 13 %).
- **Fehlerfest:** Ein Fehler in einem Bild hält das Spiel nicht an; nach drei Fehlern in zehn Sekunden wird die Welt neu aufgebaut (im Idle-Modus die nächste geladen).

## 13. Bild, Ton und Oberfläche

**Bild:** Spielzeug-Look mit kräftigen Farben, Kantenabdunklung, Sonnenlicht, Himmelsverlauf, Dunst zur Ferne. Staub in Materialfarbe, Funken, Explosionsblitz, Feuerwerk.

**Ton:** Bruchklang je Materialfamilie, abhängig von der Größe des Ereignisses. Ein Einsturz klingt nach seinen Vorgängen: **Beton knackt**, wenn sich ein großes Teil löst; **Stahl ächzt** mit einem langen, schwankenden Ton, solange ein großes Teil fällt; beim Aufschlag **bröckelt Mauerwerk** in vielen kurzen Stößen auf einem tiefen Schlag, **Glasfassaden regnen** als Klirr-Schauer herab, Blech und Stahl scheppern, Holz kracht. Welche Geräusche fallen, richtet sich danach, woraus das Bruchstück tatsächlich besteht. Dazu Feuerknistern, das mit der Menge des Brennenden lauter wird, Schritte, Brüllen, Rufe der Bewohner, Fanfaren.

### 13a Musik (Kurzfassung; alles Weitere in [konzept/musik.md](konzept/musik.md))

Jede Welt hat ihr eigenes Stück aus der Musik-Generator-Suite des Autors, komponiert und gerendert in einem Worker beim Laden der Welt – ohne Audiodateien. Die Musik folgt der Handlung: drei Zustände nach Alarmstufe (Bummeln, Verfolgung, Chaos) mit steigendem Tempo, Schichten, die mit der Zerstörung dazukommen, Überleitungen im Takt. In den Einstellungen lässt sich ein Stück für alle Welten wählen. Im Spieltest wurde die Musik durchweg als hervorragend gelungen beurteilt.

## 14. Nächste Schritte

Die Sichtung vom November 2026 mit Messwerten und Rangfolge steht in [REFACTORING.md](REFACTORING.md); was davon umgesetzt ist, steht dort am Anfang. Aus der älteren Liste bleiben offen, nach Wirkung sortiert:

| # | Schritt | Warum / Stand |
|---|---|---|
| 1 | Balance nach dem Spielprotokoll nachziehen | Schwellen, Erfolge und Sprungweiten beruhen auf Selbstspiel-Messungen (REFACTORING.md, Paket 2) |
| 2 | Entscheiden, ob Figuren erst nach und nach dazukommen | Derzeit sind alle acht von Anfang an wählbar; seit die Auswahl vorgeführt wird, ist das vielleicht nicht mehr nötig (REFACTORING.md, Paket 5) |
| 3 | Speicher der Würfel großer Welten senken (12.3) | Rund 190 MB in den Hochhaus-Welten; der Grafikspeicher ist bereits auf ein Drittel gesunken |
| 4 | Bruchstücke stoßen einander | Trümmer stapeln sich glaubwürdiger |
| 5 | Ruß ohne Nebenwirkung | Verrußte Würfel zählen als zerstört und schwächen das Gebäude; sauberer wäre eine reine Färbung |
| 6 | Verkehr verfeinern: Ausweichen, Ampeln; Vögel, Hunde | Autos durchdringen sich noch |
| 7 | Als App installierbar, offline spielbar | Braucht ein App-Symbol und eine saubere Versionierung des Zwischenspeichers |
| 8 | Oberfläche ausdünnen | Ring, Zähler, Sterne, Karten und vier Knöpfe stehen im Bild |
| 9 | Schlagschatten; Zeitlupe und Zurückspulen; Feuer an fallenden Bruchstücken | Ältere Wünsche; die Simulation ist inzwischen reproduzierbar, die Voraussetzung für das Zurückspulen |
| 10 | Verbiegen statt Brechen; rutschiges Eis und Schnee, der Feuer bremst | Aus der Durchsicht der Naturgesetze je Welt |
| 11 | Weitere Welten | Ideen: Wüste mit Oase und Pyramidenfeld, Vulkaninsel, Wildwest-Stadt mit Eisenbahn, Süßigkeitenland, Mondbasis |

## 15. Entscheidungen

**Getroffen:** Planet als gekrümmte Rundum-Welt · Bewohner kommen nie zu Schaden · Maus und Tastatur haben Vorrang · Macht bleibt dauerhaft · Wachstum schaltet Werkzeuge frei · 90 % gelten als zerstört · Ziffern in Zählern sind in Ordnung · Wachstum ohne feste Obergrenze · freie Weltauswahl · hohe Schwerkraft.

**Offen:**

| # | Frage | Meine Empfehlung |
|---|---|---|
| 1 | **Wie groß ist „groß genug“?** 512 m sind umgesetzt. 1 km ist machbar, kostet aber die Arbeiten aus 12.3. | Erst spielen; 512 m bedeuten 236 bis 848 Gebäude pro Planet |
| 2 | **Soll die Weltauswahl für das Kind vereinfacht werden?** Sie enthält jetzt Welten, Figur, Stufe und Mischer auf einer Seite. | Mischer hinter einen eigenen Würfel-Knopf legen, sobald es stört |
| 3 | **191 MB für die Wolkenkratzer-Stadt** sind für einen Rechner in Ordnung, für ältere Geräte viel. Lauflängen-Kodierung vorziehen? | Ja, sobald die Welt auf einem eurer Geräte ruckelt oder nicht lädt; auf Handys ist sie schon jetzt nur 256 m groß (51 MB) |
| 4 | **Sprunghöhe mit Halten steuern** (kurz tippen = kleiner Hüpfer)? | Nein, ein Sprung ist für einen 5-Jährigen leichter zu lernen |

## 16. Umsetzungsstand (12. November 2026)

**Vorhanden:** alles, was dieses Konzept und seine Anhänge beschreiben. Die Prüfprotokolle der einzelnen Entwürfe bis Nachtrag 18 stehen in [VERLAUF.md](VERLAUF.md), Anhang.

**Von Hand gespielt:** Die Checkliste in TESTEN.md ist vom Autor und weiteren Testspielern zu einem großen Teil zufriedenstellend durchgespielt worden; was auffiel, waren Kleinigkeiten. Die Musik ist durchweg gelungen. Tentakel, Hubschrauber und Bagger spielen sich für den Autor nicht ganz so gut wie die übrigen Figuren, haben aber unter anderen Testspielern große Fans. Was tatsächlich unterging: dass man Figur und Welt überhaupt wechseln kann – wer es gezeigt bekam, war begeistert. Seitdem führt das Spiel die Auswahl vor (13), das Gesicht im Macht-Ring öffnet sie, und der Idle-Modus zeigt reihum alle Figuren (17). Beim Klettern drehte sich die Figur nach einem schrägen Sprung teilweise ins Gebäude; behoben (4.2).

**Automatisch geprüft** (`tools/`, siehe dort): alle Welten werden ohne Fehler erzeugt, fast nichts schwebt darin; jede Welt und rund 30 längere Szenarien laufen im Browser ohne Skriptfehler; die Simulation ist reproduzierbar (zwei Läufe mit gleichem Startwert, geskriptet und mit dem Autopiloten, ergeben dieselbe Prüfsumme); jeder Knopf liegt bei sechs Fenstergrößen sichtbar und frei; Rechenzeit pro Bild in der Wolkenkratzer-Stadt und der Neon-Megacity unter den Grenzwerten (REFACTORING.md).

**Nicht oder nur automatisch geprüft:** echte Handys und Tablets, Gamepad, schwächere Rechner; die neue Vorführung der Figuren- und Weltwahl, die Karte beim Weltwechsel und der Figurenwechsel im Idle-Modus (nur im Test gesehen); Idle-Läufe über Stunden auf dem Vorlesungsrechner.

**Fehlt oder weicht ab:**

| Punkt | Stand |
|---|---|
| Statik | Stockwerks-Bilanz statt echter Statik (11.4) |
| Bruchstücke untereinander | stoßen nur mit der Welt zusammen; die Wucht-Regel vergleicht Massen, rechnet aber keinen Stoß |
| Verkehr | fährt auf einem Straßennetz, Autos weichen einander aber nicht aus; keine Ampeln |
| Schatten | keine Schlagschatten |
| Zeitlupe, Zurückspulen, „Welt wehrt sich“ | Zeitlupe nur kurz nach schweren Treffern und bei großen Einstürzen im Idle-Modus; Zurückspulen nicht begonnen (die reproduzierbare Simulation ist die Voraussetzung) |
| Feuer in Hochhäusern | Beton und Stahl brennen nicht, sie verrußen; ein Feuer frisst sich nicht durch einen Betonturm |
| Geister-Vorführung | macht die Bewegung vor, zerstört dabei aber nichts; für Flieger, Hubschrauber und Tentakel gibt es keinen Geist |

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
8. Sieben Sekunden nach 100 % – oder nach 12 Minuten in derselben Welt – reist er in die nächste Welt der Liste. Ist sie die Heimatwelt einer Figur, kommt diese Figur mit: Die Vorführung geht so reihum durch alle acht Figuren, und wer zusieht, merkt, dass es mehr als eine gibt. Eine Karte zeigt beim Wechsel Figur ➜ Welt.
9. An einer Wand klettert er hinauf; kommt er nicht weiter oder hängt er länger als zwölf Sekunden daran (eine kleine Figur an einem Wolkenkratzer), springt er ab.

Macht und Stufen wachsen dabei ganz normal und werden gespeichert, auch für die Figuren, die er unterwegs spielt. **Sobald der Spieler übernimmt, kehrt das Spiel zu seiner eigenen Figur und Welt zurück** (mit der Sanduhr, während die Welt im Hintergrund entsteht): Figur und Stufe bleiben, wie der Spieler sie gewählt hat. Vorführ-Hinweise und Geister-Monster sind im Idle-Modus ausgeblendet.

**Reproduzierbar:** Der Autopilot zieht seine Entscheidungen aus einem eigenen Zufallsgenerator. Mit `?seed=` in der Adresse läuft eine Vorführung bei gleichem Startwert gleich ab (`game.autopilot.seed` nennt den Startwert eines Laufs); im Test wird das mit einer Prüfsumme nachgewiesen. **Dauerlauf:** `tools/soak.mjs` lässt das Selbstspiel lange laufen und prüft, dass nichts hängt, kein Fehler auftritt und der Speicher nicht stetig wächst. Ein Lauf über 40 Minuten durch 17 Welten bestand (November 2026).

**Zurückgelegter Weg** in 36 Sekunden Selbstspiel: Roboter in der Wolkenkratzer-Stadt 230 m (12 Gebäude), Panzer im Dorf 370 m (28 Gebäude), Dino in der Stadt 860 m (25 Gebäude). Vor dieser Änderung blieben Roboter und Panzer praktisch stehen.

**Gemessen** (je 30 bis 45 Sekunden Selbstspiel, älterer Stand): Bauklotz-Zimmer mit Dino ab Stufe 3: 68 % der Welt, dabei auf Stufe 4 gewachsen. Dorf mit Roboter auf Stufe 5: 12 Gebäude. Stadt mit Flieger auf Stufe 5: 3 Gebäude. Wolkenkratzer-Stadt mit Panzer ab Stufe 6: 31 Gebäude, dabei brach die Bildrate unter der Last der Einstürze zeitweise auf unter 30 Bilder pro Sekunde ein.

**Grenzen.**
- Auf Stufe 1 in der Wolkenkratzer-Stadt passiert lange wenig: Die Figur braucht eine Viertelminute aus dem Park heraus und kratzt dann mit schwachen Schlägen an Beton. Für den Hintergrundbetrieb lohnt eine höhere Stufe.
- Ohne vorherige Eingabe (Start über `?idle=1`) bleibt das Spiel stumm, weil Browser Ton erst nach einer Nutzeraktion erlauben. Beim Start über den Knopf ist der Ton an.
- In einem Tab, der nicht sichtbar ist, hält der Browser das Spiel an.
- **Kamera:** Sie folgt der Figur wie im normalen Spiel, atmet dabei aber langsam zwischen einer nahen und einer weiten Einstellung (Abstand 0,85- bis 1,65-fach, ein Zyklus rund 80 Sekunden) und neigt sich leicht. Bei einem großen Einsturz läuft höchstens alle neun Sekunden knapp eine Sekunde Zeitlupe. Echte Kamerafahrten um die Figur herum gibt es nicht, weil der Autopilot über das Bild zielt.
- **Ruhe:** Im Selbstspiel sind die Karten der Erfolge und die Sterne ausgeblendet, die Sirenen leiser. Das Selbstspiel sammelt Macht, aber **keine Erfolge und keine Zähler** – die sind für den Spieler.

## 18. Erfolge

139 kleine Ziele, jedes eine Schwelle auf einem Zähler: zerstörte Würfel insgesamt und nach Material, Gebäude und Hochhäuser, Einstürze, zerdrückte Häuser, die längste Kettenreaktion, mehrere Gebäude in zehn Sekunden, zerstörte Welten (auch jede der 19 einzeln), erreichte Stufen (insgesamt, je Figur, mit allen Figuren), Explosionen, Brände, Hydranten, Lampen, erwischte fahrende Autos, umgeworfene Polizei- und Feuerwehrautos, abgeschossene Reporter-, Militär-Hubschrauber und Kampfflieger, die Alarmstufe, Sprünge, Saltos, Stampfbomben, Brüller, Rempler, zurückgelegte Strecke, durch die Luft gewirbelte Bewohner, Angriffe, gesammelte Macht, Zeit im Selbstspiel und Spielzeit, Sticker und die Zahl der Erfolge selbst. Seit Nachtrag 11 dazu: abgestürzte Brücken, Bahnen und andere Verbindungen (1 und 25) und ein Vulkanausbruch, seit Nachtrag 14 eine Lawine.

- **Einblendung:** Wird ein Erfolg erreicht, schiebt sich links unter dem Macht-Ring für gut vier Sekunden eine Karte herein: großes Symbol, Name, ein Satz dazu, ein Pokal an der Ecke, dazu ein kurzer heller Klang. Höchstens zwei Karten zugleich; warten mehr als drei, bleibt jede nur knapp zwei Sekunden.
- **Lesen ist freiwillig.** Die Karten sind der einzige Text im Spielfeld. Wer nicht lesen kann, sieht Symbol und Pokal und hört den Klang; für das Spielen braucht man den Text nie.
- **Liste:** Der Pokal in der Weltauswahl (und ein Knopf in den Einstellungen) öffnet alle Erfolge. Erreichte sind farbig, die übrigen grau mit einem Balken, der zeigt, wie weit es noch ist.
- **Zähler** werden in der Simulation nur hochgezählt und zweimal pro Sekunde ausgewertet. Sie gelten für alle Figuren gemeinsam, liegen im Spielstand und werden mit „Von vorn beginnen“ gelöscht. Im Selbstspiel wird nicht gezählt (außer der Zeit im Selbstspiel).
- Die Liste steht in `achievements.js`; ein neuer Erfolg ist eine Zeile.

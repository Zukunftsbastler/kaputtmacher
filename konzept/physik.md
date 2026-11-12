# Kaputtmacher – Zerstörungs- und Physikmodell

Anhang zu [KONZEPT.md](../KONZEPT.md): wie Treffer, Halt, Stabilität, Superstrukturen, Kettenreaktionen, Feuer und die Reaktionen der Welt im Einzelnen funktionieren. Die Abschnittsnummern sind die des Konzepts, Verweise wie „(11.4)“ meinen dessen Abschnitte und die übrigen Anhänge.

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
6. **Ruhe:** Ruhende Bruchstücke werden als Schutt ins Gitter zurückgeschrieben. Kleine nach 2,5 Sekunden, große spätestens nach 14. Seit Nachtrag 12 prüft die Haltsuche jeden abgelegten Würfel noch einmal: Was nicht aufliegt, fällt weiter. Sind mehr als 36 Bruchstücke unterwegs, wird zuerst ein ruhendes abgelegt; liegt keines, zerfällt das kleinste in lose Würfel (vorher froren große Stücke mitten in der Luft ein).

### 11.3a Nichts schwebt (Nachtrag 12)

Die Haltsuche geht nur über Flächen: Zwei Würfel, die sich nur an einer Kante oder Ecke berühren, hängen für sie nicht zusammen. Schräg gezeichnete Teile – Speichen, Ketten, Streben, Kranausleger, Ringe, Wedel – bestanden aber genau daraus. Fiel ihr Halt weg, wurde nur der erste Würfel geprüft, der Rest blieb in der Luft stehen. Und manche Baupläne hatten echte Lücken: Teile, die von Anfang an auf nichts standen, aber nie geprüft wurden, solange nichts in ihrer Nähe zerstört wurde.

- **Verschweißen** (`world.js`, `weld`): Nach dem Erzeugen wird jede Stelle, an der sich zwei Würfel nur schräg berühren, mit einem Würfel (an einer Ecke zwei) auf der Höhe des tieferen gefüllt, in der Art des gebauten. Was zusammenhängend aussieht, hängt zusammen. Geprüft werden nur dünne Würfel (weniger als vier Nachbarn über Flächen); die Welt merkt sich beim Bauen, wo gebaut wurde. Ein Füllwürfel an einer Superstruktur gehört zu ihr (sonst schnitte die Lastregel aus 11.4b schräge Laufstege in Stücke). Kosten: in der größten Welt (Neon-Megacity, volle Größe) rund 0,4 Sekunden beim Laden.
- **Baupläne** korrigiert: Rohbauten (die Stützen der Stockwerke ohne Decke standen einen Würfel über der Stütze darunter), Pyramide (über jeder hohlen Stufe schwebte alles), Looping (der Ring hing frei; jetzt mit Pfosten und Querträger), Aussichtsturm und Fernsehturm (Mast über hohlem Schaft), Freifallturm (der Ring hing an nichts), Raketen-Startturm, Kontrollzentrum (Antennen und Schüssel über dem Dach), Gondeln und Seilbahnkabinen (eine Lücke zum Seil), Seilbahnseile (jetzt mit Querjochen an den Enden), Tempelruine (der Sturz lag auf zu kurzen Säulen), Farne, Baumfarne und Palmen (Wedel in Stücken), Lianen und Rankenbüschel, Eier, Seerosen (jetzt mit Stängel), Obelisk-Hieroglyphen, Dachaufbauten der Hochhäuser, Rohrleitungen im Tanklager (jetzt auf Pfosten), Flakturm (Munition auf offenem Schacht), Korallenspitzen, Hotelfahne, Stuhl am Schreibtisch – und die Vorposten der Festung, die wegen vertauschter Werte in zufälliger Höhe standen.
- **Prüfung:** `tools/floating.mjs` findet in einer frisch erzeugten Welt alles, was nicht über Flächen mit dem Boden verbunden ist; `tools/check.mjs` schlägt fehl, wenn es in einer Welt mehr als 100 Würfel sind. Stand: in 18 Welten keiner, in Babel 8, in der Urzeit 53 (einzelne Blätter am Rand der Baumkronen und an Lianen). Vorher waren es zusammen rund 160 000, die meisten in der Pyramide.

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

**Ausnahmen:** Superstrukturen (11.4b) und gewachsener Fels – Berg und Vulkan (seit Nachtrag 14) – haben keine Stockwerke. Ein Berg gibt nicht stockwerksweise nach; er verliert, was zerstört wird oder keinen Halt mehr hat.

### 11.4a Schlanke Bauten: Was auf zu wenig steht, fällt

Die Haltprüfung (11.3) fragt nur, ob ein Stück noch irgendwo den Boden berührt. Für schlanke Dinge reicht das nicht: Eine Baumgruppe mit verwachsenen Kronen hing am letzten Stamm, ein halbes Riesenrad an einem Bein. Zwei Mechanismen kommen dazu; beide berücksichtigen Dicke und Material.

**Standfestigkeit (`frail.js`).** Nach jedem Schaden wird, was dort noch steht, als Ganzes betrachtet (bis 45 000 Würfel; größere Gebäude regelt weiter 11.4): Gewicht, Schwerpunkt und Standfläche. Es fällt, wenn

- der Schwerpunkt weiter neben der Standfläche liegt, als sie breit ist plus eine Nachsicht von 1,5 Würfeln + 0,12 × Wurzel der Tragkraft der Standfläche – ein Stahlfuß verzeiht also mehr Überhang als ein Holzstamm –, oder
- das Gewicht die Tragkraft der Standfläche um mehr als das 160-Fache übersteigt.

Dann bricht die Standfläche, und das Stück kippt in Richtung seines Schwerpunkts. Ein Baum, dem die Nachbarn fehlen, steht weiter; eine Baumgruppe auf einem Stamm kippt.

**Nachgeben beim Auffangen (`bodies.js`).** Ein gefallenes Bruchstück, das zur Ruhe kommt, darf liegen oder lehnen, wenn es massiv ist. Ist es aber ein schlankes Gerippe (Anteil gefüllter Würfel × mittlere Festigkeit unter 2,2 – ein Riesenrad, ein Stück Gleis, ein Kranausleger, ein Baum) und hängt aufgestützt in der Luft statt flach am Boden zu liegen, dann gibt es nach: Kleine Stücke gehen als Schauer von Einzelteilen nieder, große brechen in der Mitte und fallen weiter. Ein dicker Stahlträger hält, dünnes Holz knickt sofort.

**Bäume** stehen in Parks und Wäldern jetzt so weit auseinander, dass sich die Kronen nicht mehr berühren.

**Was fehlt:** Verbiegen. Stücke fallen und brechen, sie verformen sich nicht.

### 11.4b Superstrukturen brechen nach ihrem Material (Nachtrag 11)

Brücken, Bahnen und Seile (7.4c) verhalten sich beim Zerstören wie das, woraus sie gebaut sind (`spans.js`). Jede Verbindung kennt ihren Verlauf, ihre Pfeiler und das, woran ihre Enden im Bau festhängen (ihre **Festpunkte**). Wird in ihrer Nähe etwas zerstört, sieht das Spiel nach: Wie viel ist von jedem Querschnitt noch da, verglichen mit dem Bau? Stehen die Pfeiler noch, durchgehend und auf ihrem Grund? Halten die Festpunkte noch (mindestens 20 % von dem, was das Ende umgab)? Die Festpunkte werden zusätzlich ständig reihum geprüft, denn ein Turm kann auch von unten fallen.

| Art | Stile | Verhalten |
|---|---|---|
| **Seil** | Hängebrücken, Lianen, Seilbahnseile | Nimmt nur Zug auf. Durchtrennt, durchgebrannt oder an einem Festpunkt abgerissen, **schwingt jeder Teil an dem Festpunkt herab, der ihm bleibt**, und hängt dann senkrecht daran – an der Hauswand, am Baumstamm. Ein Teil ohne Festpunkt fällt als Ganzes herunter und bleibt liegen. Die Kabinen einer durchtrennten Seilbahn stürzen ab |
| **Träger** | Superhighways, Hochbahnen, Skybridges, Skywalks, Förderbrücken, Rohrleitungen, Laufstege, Achterbahnen | Steif. Ein Teil, dem die Stütze fehlt, bleibt als **Kragarm** stehen, solange er kurz genug ist; ist er zu lang, knirscht es, Staub rieselt, und nach einer halben bis knappen Sekunde bricht er an seiner letzten Stütze ab. Ein Feld, dessen Pfeiler verloren ist, stürzt ein, wenn es dadurch zu lang wird. Ein Querschnitt, von dem fast nichts mehr übrig ist, reißt ganz durch |
| **Mauerwerk** | Steinbrücken, Wehrgänge, Aquädukte | Stein nimmt keinen Zug auf: Schaden irgendwo in einem Feld zwischen zwei Stützen, ein verlorener Pfeiler oder ein verlorenes Widerlager bringt das **ganze Feld** herunter, in Blöcken; die Pfeiler bleiben stehen. Beim Aquädukt bricht das Feld samt Bögen bis zum Boden heraus, das Wasser schwallt aus der Rinne |
| **Glas** | Röhren unter dem Meer | Ein Riss läuft vom Bruch aus mit 70 Würfeln pro Sekunde durch die **ganze Röhre**, sie zerspringt in Scherben |

Grenzwerte je Stil (Würfel): Anteil eines Querschnitts, der bleiben muss; längster Kragarm; längstes Feld nach Verlust eines Pfeilers; größte Figur (Höhe), die darauf stehen kann – in Klammern die höchste Stufe, die das bei 2 Würfeln je Meter noch ist.

| Stil | bleibt | Kragarm | Feld | trägt bis |
|---|---|---|---|---|
| Superhighway | 30 % | 24 | 50 | 60 (Stufe 7) |
| Hochbahn | 30 % | 16 | 38 | 40 (Stufe 6) |
| Skybridge | 30 % | 14 | – | 22 (Stufe 5) |
| Skywalk | 30 % | 12 | 34 | 18 (Stufe 4) |
| Förderbrücke, Rohrleitung | 30 % | 10 bzw. 12 | 28 bzw. 24 | 14 (Stufe 4) |
| Laufsteg | 40 % | 7 | – | 10 (Stufe 3) |
| Achterbahn | 40 % | 6 | 22 | 12 (Stufe 3) |
| Steinbrücke, Aquädukt, Wehrgang | 60 % | – | – | 30 bzw. 35 beim Wehrgang (Stufe 5 bzw. 6) |
| Glasröhre | 50 % | – | – | 16 (Stufe 4) |
| Hängebrücke | 50 % | – | – | 8 (Stufe 2) |
| Liane | 40 % | – | – | 5 (Stufe 1) |
| Seilbahnseil | 50 % | – | – | nichts |

- **Gewicht:** Steht eine Figur, die größer ist als „trägt bis“, eine knappe Drittelsekunde auf einer Verbindung, knackt es, und sie bricht unter ihren Füßen auf drei Würfeln Länge durch; dann gilt die Tabelle. Ein Dino auf Stufe 1 läuft über Lianen und Hängebrücken, ab Stufe 2 reißen die Lianen, ab Stufe 3 die Hängebrücken unter ihm.
- **Schwingen:** Ein Seilstück wird für einige Sekunden zu einer Kette aus Gliedern (alle 2 Würfel), die in der senkrechten Ebene der Verbindung schwingt, mit 80 % der Schwerkraft, gedämpft, ohne durch Wände oder Boden zu gehen. Kommt sie zur Ruhe (oder nach 7 Sekunden), wird sie als loser Schutt in die Welt gelegt, Strang für Strang ohne Lücke: Planken und Seile, Lianenstränge, Stahlseile. Was so hängt, zählt nicht mehr und lässt sich weiter zerschlagen.
- **Brücken halten keine Gebäude:** Die Haltprüfung (11.3) lässt Last nur vom Gebäude in die Verbindung fließen, nie zurück. Ein Turm, dessen Stockwerk nachgibt, fällt also, statt an seiner Skybridge zu hängen; die Skybridge verliert dabei ihren Festpunkt. Die Standfestigkeit (11.4a) sieht Bäume ohne ihre Lianen an, und Würfel einer Verbindung, die über ein Gebäude läuft, zählen nicht zu dessen Stockwerken. Welche Würfel zu einer Verbindung gehören, merkt sich die Welt beim Bau je Bodensäule als Höhenbereich.
- **Verbindungen auf Verbindungen:** Bricht ein Träger, lassen die Verbindungen los, die auf ihm enden (eine Skybridge auf einem Highway).
- **Kein Stoß:** Eine eingestürzte Verbindung gibt keinen Kettenreaktions-Stoß weiter (11.6) – sie ist lang, ihr Stoß hätte halbe Wälder gefällt.
- **Was fehlt:** Seile schwingen nur in der Ebene ihrer Verbindung, nicht seitlich, und verdrehen sich nicht. Träger verbiegen sich nicht, Kragarme sinken nicht ab; Lasten werden nicht gerechnet, die Grenzwerte sind fest je Stil. Verbindungen, die aneinander lehnen oder sich berühren, ohne aufeinander zu enden, halten einander fest. Fahrende Züge und Autos auf den Trägern sind Teil des Bauwerks und fallen mit.

### 11.5 Schubsen

Rennt das Monster (Umschalt) gegen ein Gebäude, das es nicht einfach durchbricht, schubst es. Der Schubs hebt den Mindestanteil des Gebäudes für rund eine halbe Sekunde an – um bis zu 60 Prozentpunkte, je nachdem, wie groß das Monster im Vergleich zu dem ist, was vom Gebäude noch steht. Ein kleines Monster wirft so einen Schuppen um, ein großes ein angeschlagenes Hochhaus und ein riesiges auch ein unversehrtes. Geschubste Gebäude fallen in Laufrichtung. Ansturm (Dino) und Vollgas (Panzer) schubsen drei- bis vierfach.

### 11.6 Kettenreaktionen (Upgrade)

- **Freischaltung** mit Stufe 3, zunächst schwach. Es gibt dafür keinen eigenen Knopf mehr (das Kettensymbol war nicht verständlich); ab- und anschalten lassen sie sich in den Einstellungen, dort mit erklärendem Satz.
- **Wirkung:** Stürzt ein Gebäude ein oder ist es vollständig zerstört, läuft nach gut einer halben Sekunde ein Stoß zu den Nachbarn im Umkreis von etwa einem Häuserblock. Er beißt sichtbar in deren Fuß und schwächt sie dauerhaft – um 12 Prozentpunkte auf Stufe 3 und 6 weitere je Stufe, bis 55 ab Stufe 10. Der sanfte Einstieg soll verhindern, dass die Einnahmen an einer einzigen Stufe springen.
- **Domino:** Fällt ein Nachbar dadurch, gibt er den Stoß weiter, jede Generation mit 62 % der Stärke; eine Kette läuft sich so nach drei bis fünf Gebäuden tot. Zusätzlich ermüdet die Kette: Jeder Einsturz kurz nach einem anderen zählt wie eine weitere Generation, egal wodurch das Gebäude fiel (auch durch Trümmer); alle vier Sekunden erholt sie sich um einen Schritt. Vorher gaben von Trümmern gefällte Nachbarn den Stoß wieder mit voller Stärke weiter, und ein Drittel der Stadt fiel in unter einer Minute. Holzbauten fallen schon beim ersten Stoß, Ziegelbauten nach einem starken oder zweien, Betontürme erst, wenn sie angeschlagen sind oder mehrere Nachbarn gefallen sind. Mit jeder Stufe reißt eine Kette also weiter.
- Dazu kommt, was ohnehin gilt: Ein kippender Turm zerschlägt, worauf er fällt (11.6a).
- Superstrukturen geben keinen Stoß weiter (11.4b).

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
| **Lawine** (Berg der Winterwelt, Nachtrag 14) | Wird der Schatz im Berg gehoben oder hat der Berg mehr als 12 % verloren: gut eine Sekunde Grollen, dann rutscht die Schneekappe von oben nach unten ab (vier Sekunden), Schneebrocken springen bis zum doppelten Bergradius hinaus und reißen um, was sie treffen (Radius 2,5 bis 5, ohne Feuer), eine weiße Wolke rollt die Hänge hinab. Jeder Berg einmal |
| **Geschütz** (Festung Titan, Nachtrag 12) | Explodiert mit seiner Munition, sobald es zerstört ist: Radius 8 (Raketenwerfer 10), Feuerball, drei kleinere Nachexplosionen |
| **Vulkan** (Urzeit, Nachtrag 11) | Wird das goldene Götzenbild in seinem Inneren zerschlagen oder hat der Berg mehr als 30 % verloren, **erwacht** er: zwei Sekunden Grollen und Beben mit aufsteigendem Rauch, dann fliegt die Spitze weg (Explosion bis 30 Würfel Radius, Zeitlupe). Zehn Sekunden lang schleudert er alle 0,08 bis 0,14 Sekunden eine **Lavabombe** (2,5 bis 6 Würfel groß) in hohem Bogen bis zum dreifachen Bergradius hinaus; sie glüht, zieht eine Rauchspur und explodiert, wo sie aufschlägt – im Urwald brennt es danach an vielen Stellen. Dazu eine Fontäne aus glühender Lava und eine dunkle Aschesäule. Jeder Vulkan bricht einmal aus |

Höchstens acht Wasserquellen laufen gleichzeitig; neue an derselben Stelle verlängern die laufende.

### 11.8 Die Stadt räumt sich selbst auf

Lose Trümmer bleiben nicht ewig liegen. Jeder Würfel, der als Schutt zur Ruhe kommt, wird 30 Sekunden später geprüft: Hängt er mit weniger als 14 anderen Schuttwürfeln zusammen, verschwindet das Häufchen. Größere zusammenhängende Schutthaufen und alle größeren zurückgeschriebenen Bruchstücke bleiben als Ruinen stehen. Das hält die Zahl verstreuter Würfel – und damit Speicher und Zeichenaufwand – auch bei langem Spiel begrenzt, was besonders für den geplanten Idle-Modus wichtig ist.

### 11.9 Leistungsgrenzen

- Höchstens 36 Bruchstücke gleichzeitig, 9 000 Schuttwürfel, 3 000 Effektteilchen (schwache Geräte: 2 200 und 1 000), 900 brennende Würfel, 36 Brandherde.
- Die Haltprüfung darf pro Rechenschritt 700 000 Würfel anfassen, der Rest folgt im nächsten.
- Automatische Qualitätsanpassung: Über 26 ms pro Bild werden Schutt, Effekte und Auflösung reduziert, nie die Zerstörung selbst.

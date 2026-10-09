# Werkzeuge zum Prüfen

Dieser Ordner wird nicht veröffentlicht (Netlify liefert nur `public/` aus). Alles läuft mit Node, ohne zusätzliche Pakete.

| Befehl | Was es prüft |
|---|---|
| `node --experimental-default-type=module tools/check.mjs` | Ohne Browser: beschädigte und manipulierte Spielstände, Stimmigkeit der Erfolgsliste, Erzeugung aller Welten |
| `node tools/smoke.mjs` | Mit Browser: spielt in jeder Welt ein kurzes Szenario und einige längere (Selbstspiel, Verkehr, alle Angriffe, Handy-Format, niedrigste Detailstufe) und meldet Skriptfehler. Dauert rund sechs Minuten; `quick` nur die Welten |
| `node tools/serve.mjs` | Startet das Spiel auf `http://127.0.0.1:8766` mit denselben Sicherheits-Headern wie auf Netlify |
| `node tools/browser.mjs <name> "<adress-parameter>" <szenario> [ms] [breite] [höhe]` | Ein einzelnes Szenario; gibt den Zustand des Spiels als JSON aus und legt ein Bildschirmfoto in `tools/out/` ab. Braucht den laufenden Server |

Die Szenarien stehen in `web/test.js`: je eine Zeile, die Eingaben auslöst und am Ende Messwerte in `window.__extra` schreibt. Beispiele:

```
node tools/browser.mjs jahrmarkt "world=funfair&stage=5" walk 5000
node tools/browser.mjs einnahmen "world=skyline&stage=6&idle=1&run=55000" income 58000
node tools/browser.mjs sprung "world=skyline&stage=2" leapfar 12000
```

Der Browser wird mit einem eigenen Profil im Temp-Ordner gestartet; der Browser, den man selbst benutzt, bleibt unberührt. Gesucht wird Chrome, Brave oder Chromium; mit `BROWSER=/pfad` lässt sich ein anderer angeben.

Was diese Werkzeuge nicht können: beurteilen, wie sich etwas anfühlt, aussieht oder anhört. Dafür gibt es `TESTEN.md` im Projektordner.

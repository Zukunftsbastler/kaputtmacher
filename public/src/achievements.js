// Achievements: a long list of small goals. Each one is a threshold on a counter ("stat").
// The game only counts (game.stat / game.statMax); this module knows what the numbers mean,
// checks them a few times per second and reports what has just been reached.
// The names are German like the rest of the texts for grown-ups; nobody has to read them to play.

// Counters kept in the save. Everything else an achievement looks at is derived from the progress.
export const STATS = ['vox', 'glass', 'wood', 'stone', 'steel', 'leaf', 'buildings', 'towers', 'collapses', 'crushed', 'chain', 'multi',
  'explosions', 'fires', 'hydrants', 'lamps', 'eggs', 'cars', 'news', 'police', 'trucks', 'army', 'fighters', 'wanted',
  'jumps', 'flips', 'pounds', 'roars', 'shoves', 'dist', 'people', 'light', 'heavy', 'power', 'idle', 'time'];

const fmt = (n) => (n >= 1e6 ? (n / 1e6).toLocaleString('de-DE') + ' Mio.' : n.toLocaleString('de-DE'));
const CREATURES = { dino: ['🦖', 'Dino'], gorilla: ['🦍', 'Gorilla'], robot: ['🤖', 'Roboter'], tank: ['🪖', 'Panzer'], jet: ['✈️', 'Flieger'] };
const WORLD_NAMES = { skyline: ['🌆', 'Wolkenkratzer-Stadt', 'Skyline-Schreck'], blocks: ['🧱', 'Bauklotz-Zimmer', 'Aufräumen? Nö!'], garden: ['🌷', 'Garten', 'Maulwurf XXL'],
  house: ['🏠', 'Haus', 'Hausbesuch'], toyland: ['🧸', 'Spielzeugland', 'Spielverderber'], village: ['🏘️', 'Dorf', 'Dorfschreck'], park: ['🌳', 'Park', 'Parkverbot'],
  city: ['🏙️', 'Stadt', 'Stadtbummel'], funfair: ['🎡', 'Vergnügungspark', 'Kirmesschreck'], harbour: ['⚓', 'Hafen', 'Leinen los'], giants: ['🗿', 'Welt der Riesenbauten', 'Riesentöter'], castle: ['🏰', 'Burg und Dorf', 'Raubritter'], winter: ['⛄', 'Winterwelt', 'Tauwetter'], airport: ['🛫', 'Flughafen', 'Flug gestrichen'], reef: ['🐠', 'Stadt unter dem Meer', 'Seeungeheuer'], spaceport: ['🚀', 'Raumhafen', 'Fehlstart'], factory: ['🏭', 'Fabrik', 'Feierabend'], random: ['🎲', 'Würfelwelt', 'Glückswurf'] };

export const ACHIEVEMENTS = [];
// One stat, several thresholds: [n, name] pairs. text(n) describes the goal.
// one: the wording for a threshold of exactly one.
function tiers(stat, icon, text, list, one) {
  for (const [n, name] of list) ACHIEVEMENTS.push({ id: stat + ':' + n, icon, name, stat, n, text: n === 1 && one ? one : text(fmt(n)) });
}

tiers('vox', '🧱', (n) => `${n} Würfel zerstört`, [[100, 'Erster Krümel'], [1e3, 'Kleinholz'], [1e4, 'Abrissbirne'], [1e5, 'Großbaustelle'], [1e6, 'Millionenschaden'], [1e7, 'Stadtfresser']]);
tiers('glass', '🪟', (n) => `${n} Glaswürfel zerschlagen`, [[500, 'Scherben bringen Glück'], [2e4, 'Glaser gesucht']]);
tiers('wood', '🪵', (n) => `${n} Holzwürfel zerlegt`, [[500, 'Holzwurm'], [2e4, 'Sägewerk']]);
tiers('stone', '🪨', (n) => `${n} Würfel aus Stein und Beton zerbrochen`, [[1e3, 'Steinbeißer'], [1e5, 'Betonknacker']]);
tiers('steel', '🔩', (n) => `${n} Würfel aus Stahl und Blech verbogen`, [[500, 'Schrottsammler'], [5e4, 'Stahlbieger']]);
tiers('leaf', '🌳', (n) => `${n} Blätter und Blumen gerupft`, [[300, 'Heckenschere'], [1e4, 'Gärtnerschreck']]);
tiers('buildings', '🏚️', (n) => `${n} Gebäude vollständig zerstört`, [[1, 'Das erste Haus'], [5, 'Fünf auf einen Streich'], [25, 'Abrissfirma'], [100, 'Stadtplaner'], [500, 'Bauamt-Albtraum']], 'Ein Gebäude vollständig zerstört');
tiers('towers', '🏢', (n) => `${n} Hochhäuser vollständig zerstört`, [[1, 'Hoch hinaus'], [10, 'Skyline-Friseur'], [50, 'Turmschreck']], 'Ein Hochhaus vollständig zerstört');
tiers('collapses', '🏗️', (n) => `${n} Gebäude zum Einsturz gebracht`, [[1, 'Achtung, Baum fällt!'], [20, 'Statik ist nur ein Vorschlag'], [200, 'Einsturzexperte']], 'Ein Gebäude zum Einsturz gebracht');
tiers('crushed', '🥞', (n) => `${n} kleine Gebäude unter Trümmern zerdrückt`, [[1, 'Platt gemacht'], [100, 'Pfannkuchenbäcker']], 'Ein kleines Gebäude unter Trümmern zerdrückt');
tiers('chain', '🁢', (n) => `Kettenreaktion mit ${n} Einstürzen`, [[4, 'Domino'], [10, 'Dominoeffekt'], [20, 'Lawine']]);
tiers('multi', '🎳', (n) => `${n} Gebäude in zehn Sekunden zerstört`, [[3, 'Dreierpack'], [8, 'Alle Neune (fast)'], [16, 'Kehraus']]);
tiers('worlds', '🌍', (n) => `${n} verschiedene Welten vollständig zerstört`, [[1, 'Eine Welt weniger'], [3, 'Weltreise'], [6, 'Weltenbummler']], 'Eine Welt vollständig zerstört');
for (const [id, [icon, name, title]] of Object.entries(WORLD_NAMES)) ACHIEVEMENTS.push({ id: 'world:' + id, icon, name: title, stat: 'world:' + id, n: 1, text: `${name} vollständig zerstört` });
tiers('stage', '⬆️', (n) => `Stufe ${n} mit einer Figur erreicht`, [[2, 'Wachstumsschub'], [4, 'Aus dem Gröbsten raus'], [6, 'Größer als das Haus'], [8, 'Über den Dächern'], [10, 'Riesig']]);
for (const [id, [icon, name]] of Object.entries(CREATURES)) {
  ACHIEVEMENTS.push({ id: `stage:${id}:5`, icon, name: `${name}-Lehrling`, stat: 'stage:' + id, n: 5, text: `Stufe 5 mit dem ${name} erreicht` });
  ACHIEVEMENTS.push({ id: `stage:${id}:9`, icon, name: `${name}-Meister`, stat: 'stage:' + id, n: 9, text: `Stufe 9 mit dem ${name} erreicht` });
}
tiers('stageAll', '🎪', (n) => `Stufe ${n} mit allen fünf Figuren erreicht`, [[3, 'Monsterzoo'], [7, 'Monsterparade']]);
tiers('explosions', '💥', (n) => `${n} Explosionen ausgelöst`, [[1, 'Bumm!'], [50, 'Knallfrosch'], [500, 'Feuerwerker']], 'Eine Explosion ausgelöst');
tiers('fires', '🔥', (n) => `${n} Würfel in Brand gesetzt`, [[10, 'Zündler'], [1000, 'Lagerfeuer'], [3e4, 'Heiße Sache']]);
tiers('hydrants', '🚰', (n) => `${n} Hydranten umgeworfen`, [[1, 'Wasser marsch!'], [40, 'Rasensprenger']], 'Einen Hydranten umgeworfen');
tiers('lamps', '💡', (n) => `${n} Lampen und Leuchtreklamen zerschlagen`, [[10, 'Licht aus'], [1000, 'Wackelkontakt']]);
tiers('eggs', '🔎', (n) => `${n} versteckte Fundstücke in Gebäuden entdeckt`, [[1, 'Entdecker'], [10, 'Schatzsucher'], [40, 'Spürnase']], 'Ein verstecktes Fundstück in einem Gebäude entdeckt');
tiers('cars', '🚗', (n) => `${n} fahrende Autos und Busse erwischt`, [[1, 'Blechschaden'], [50, 'Stau'], [500, 'Verkehrsinfarkt']], 'Ein fahrendes Auto erwischt');
tiers('police', '🚓', (n) => `${n} Polizeiautos umgeworfen`, [[1, 'Blaulicht aus'], [10, 'Verkehrssünder'], [50, 'Fahndungsfoto']], 'Ein Polizeiauto umgeworfen');
tiers('trucks', '🚒', (n) => `${n} Feuerwehrautos umgeworfen`, [[1, 'Tatütata'], [10, 'Löschen verboten']], 'Ein Feuerwehrauto umgeworfen');
tiers('news', '📰', (n) => `${n} Reporter-Hubschrauber vom Himmel geholt`, [[1, 'Kein Kommentar'], [10, 'Schlagzeile']], 'Einen Reporter-Hubschrauber vom Himmel geholt');
tiers('army', '🚁', (n) => `${n} Militär-Hubschrauber vom Himmel geholt`, [[1, 'Fliegenklatsche'], [10, 'Luftabwehr']], 'Einen Militär-Hubschrauber vom Himmel geholt');
tiers('fighters', '🛩️', (n) => `${n} Kampfflieger vom Himmel geholt`, [[1, 'Volltreffer'], [10, 'Fliegerass']], 'Einen Kampfflieger vom Himmel geholt');
tiers('wanted', '⭐', (n) => `Alarmstufe ${n} erreicht`, [[1, 'Aufgefallen'], [3, 'Gesucht!'], [5, 'Staatsfeind Nummer eins']]);
tiers('jumps', '🦘', (n) => `${n}-mal gesprungen`, [[10, 'Hüpfer'], [500, 'Flummi']]);
tiers('flips', '🤸', (n) => `${n} Saltos geschlagen`, [[1, 'Salto!'], [100, 'Turnstunde']], 'Einen Salto geschlagen');
tiers('pounds', '☄️', (n) => `${n} Stampfbomben gelandet`, [[1, 'Stampfbombe'], [50, 'Einschlag']], 'Eine Stampfbombe gelandet');
tiers('roars', '🗯️', (n) => `${n}-mal gebrüllt`, [[1, 'Brüller']], 'Einmal gebrüllt');
tiers('shoves', '🤼', (n) => `${n} Gebäude angerempelt`, [[5, 'Schubser']]);
tiers('dist', '👣', (n) => `${n} Würfel weit gelaufen oder geflogen`, [[1000, 'Spaziergang'], [2e4, 'Wanderer'], [2e5, 'Marathon']]);
tiers('people', '🙀', (n) => `${n} Bewohner durch die Luft gewirbelt (keinem ist etwas passiert)`, [[10, 'Huch!'], [2000, 'Flugstunde']]);
tiers('light', '👆', (n) => `${n} schnelle Angriffe`, [[100, 'Flinke Finger'], [5000, 'Dauerfeuer']]);
tiers('heavy', '💪', (n) => `${n} starke Angriffe`, [[50, 'Kraftprotz'], [1000, 'Schwergewicht']]);
tiers('power', '⚡', (n) => `${n} Macht gesammelt`, [[1e4, 'Aufgeladen'], [1e6, 'Hochspannung'], [1e8, 'Kraftwerk']]);
tiers('idle', '🍿', (n) => `${n} Sekunden zugeschaut, wie das Spiel sich selbst spielt`, [[60, 'Zurücklehnen'], [1800, 'Kinoabend']]);
tiers('time', '⏱️', (n) => `${n} Sekunden gespielt`, [[600, 'Zehn Minuten Chaos'], [3600, 'Eine Stunde Krach']]);
tiers('stickers', '📒', (n) => `${n} verschiedene Gebäudearten zerstört`, [[5, 'Sammler']]);
tiers('achieved', '🏅', (n) => `${n} Erfolge erreicht`, [[25, 'Auf den Geschmack gekommen'], [50, 'Halbzeit'], [100, 'Fast alles kaputt']]);

// Current value of a stat: a stored counter or something derived from the progress.
function value(p, stat) {
  if (stat === 'stage') return Math.max(...Object.values(p.creatures).map((c) => c.stage), p.stage);
  if (stat === 'stageAll') return Math.min(...Object.entries(p.creatures).map(([id, c]) => (id === p.species ? p.stage : c.stage)));
  if (stat === 'worlds') return p.completed.length;
  if (stat === 'stickers') return p.stickers.length;
  if (stat === 'achieved') return p.achieved.length;
  if (stat.startsWith('stage:')) { const id = stat.slice(6); return id === p.species ? p.stage : p.creatures[id]?.stage ?? 0; }
  if (stat.startsWith('world:')) return p.completed.includes(stat.slice(6)) ? 1 : 0;
  return p.stats[stat] ?? 0;
}

// Returns the achievements that have just been reached and marks them in the progress.
export function checkAchievements(p) {
  let fresh = null;
  for (const a of ACHIEVEMENTS) {
    if (p.achieved.includes(a.id) || value(p, a.stat) < a.n) continue;
    p.achieved.push(a.id);
    (fresh ??= []).push(a);
  }
  return fresh;
}

// 0..1: how far an achievement has come, for the list.
export const achievementProgress = (p, a) => Math.min(1, value(p, a.stat) / a.n);

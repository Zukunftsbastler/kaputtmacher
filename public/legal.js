// Lets visitors delete everything the game has stored in this browser, right where the privacy
// notice explains it. Two deliberate steps, so it cannot happen with a stray click.

const KEY = 'kaputtmacher.v1'; // the single entry the game writes (see src/progress.js)

const box = document.getElementById('save');
const status = document.getElementById('save-status');
const ask = document.getElementById('save-delete');
const confirmRow = document.getElementById('save-confirm');
const yes = document.getElementById('save-yes');
const no = document.getElementById('save-no');

function stored() {
  try { return localStorage.getItem(KEY) !== null; } catch { return false; }
}

function show() {
  const has = stored();
  status.textContent = has
    ? 'Auf diesem Gerät ist in diesem Browser ein Spielstand gespeichert.'
    : 'Auf diesem Gerät ist in diesem Browser kein Spielstand gespeichert.';
  ask.hidden = !has;
  confirmRow.hidden = true;
}

ask.addEventListener('click', () => { ask.hidden = true; confirmRow.hidden = false; no.focus(); });
no.addEventListener('click', show);
yes.addEventListener('click', () => {
  try { localStorage.removeItem(KEY); } catch { /* storage blocked: nothing was stored either */ }
  show();
  status.textContent = 'Der Spielstand wurde gelöscht. Das Spiel beginnt beim nächsten Start von vorn.';
});

box.hidden = false; // the box only appears when this script runs
show();

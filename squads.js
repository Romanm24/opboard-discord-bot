// squads.js
// Roster structure — mirrors the OpBoard web sign-up (Alpha–Foxtrot + Bench, 35 core + 5 bench).
// Edit SQUADS here to change squad names, roles, or sizes; everything else reads from this.

const fs = require('fs');
const path = require('path');

const STATE_PATH = path.join(__dirname, 'state.json');

const SQUADS = [
  { key: 'alpha',   name: 'Alpha',   role: 'Assault 1 — incl. 1 medic/defib', size: 5 },
  { key: 'bravo',   name: 'Bravo',   role: 'Assault 2 — incl. 1 medic/defib', size: 5 },
  { key: 'charlie', name: 'Charlie', role: 'Recon', size: 5 },
  { key: 'delta',   name: 'Delta',   role: 'Support — incl. 1 medic/defib', size: 5 },
  { key: 'echo',    name: 'Echo',    role: 'FOB / Base Defense + QRF (5 full-time, 5 hybrid)', size: 10 },
  { key: 'foxtrot', name: 'Foxtrot', role: 'Logistics — Air + Ground', size: 5 },
  { key: 'bench',   name: 'Bench',   role: 'Reserve — subs in if someone has to step out', size: 5 },
];

function squadByKey(key) {
  return SQUADS.find((s) => s.key === key);
}

// ---- Per-guild state ----
// { "<guildId>": { "<channelId>-<messageId>": { squads: { alpha: [userId,...], ... }, leaders: { alpha: userId, ... } } } }
// Simplest reliable key for "which board is this": we key state per-guild, one active board per guild for now.
// { "<guildId>": { squads: {...}, leaders: {...}, messageId, channelId } }

function loadAllState() {
  if (!fs.existsSync(STATE_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
  } catch (e) {
    console.error('Failed to parse state.json, starting fresh.', e);
    return {};
  }
}

function saveAllState(all) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(all, null, 2));
}

function emptySquads() {
  const squads = {};
  for (const s of SQUADS) squads[s.key] = new Array(s.size).fill(null);
  return squads;
}

function emptyLeaders() {
  const leaders = {};
  for (const s of SQUADS) {
    if (s.key === 'bench') continue;
    leaders[s.key] = null;
  }
  return leaders;
}

function getGuildState(guildId) {
  const all = loadAllState();
  if (!all[guildId]) {
    all[guildId] = {
      squads: emptySquads(),
      leaders: emptyLeaders(),
      streamers: [],
      channelId: null,
      messageId: null,
      boardAdminRoleId: null,
    };
    saveAllState(all);
  }
  return all[guildId];
}

function updateGuildState(guildId, mutateFn) {
  const all = loadAllState();
  if (!all[guildId]) {
    all[guildId] = { squads: emptySquads(), leaders: emptyLeaders(), streamers: [], channelId: null, messageId: null, boardAdminRoleId: null };
  }
  mutateFn(all[guildId]);
  saveAllState(all);
  return all[guildId];
}

function totalFilled(state) {
  let n = 0;
  for (const s of SQUADS) {
    if (s.key === 'bench') continue;
    n += state.squads[s.key].filter(Boolean).length;
  }
  return n;
}

function totalCore() {
  return SQUADS.filter((s) => s.key !== 'bench').reduce((sum, s) => sum + s.size, 0);
}

module.exports = {
  SQUADS,
  squadByKey,
  getGuildState,
  updateGuildState,
  totalFilled,
  totalCore,
};

// Tiny JSON-file datastore. All access goes through this module, so swapping it for
// MongoDB (as in the deck's suggested stack) only means re-implementing these few functions.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'db.json');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');

let state = null;

function init() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  if (fs.existsSync(FILE)) state = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  else state = { users: [], products: [] };
  return state;
}
const db = () => state || init();

function save() {
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, FILE); // atomic replace
}

const newId = (prefix) => prefix + '_' + crypto.randomBytes(6).toString('hex');

module.exports = { db, save, newId, init, DATA_DIR, UPLOAD_DIR };

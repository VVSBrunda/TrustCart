#!/usr/bin/env node
// One-command launcher: starts the Python ML service and the Node backend together.
//   node run.js            -> both services (app at http://localhost:4000)
//   node run.js --no-ml    -> backend only (uploads are then marked "Not checked")
const { spawn, spawnSync } = require('child_process');
const path = require('path');

const procs = [];
const run = (name, cmd, args, cwd, env = {}) => {
  const p = spawn(cmd, args, { cwd: path.join(__dirname, cwd), stdio: 'inherit', env: { ...process.env, ...env } });
  p.on('exit', (code) => { if (code) console.error(`[${name}] exited with code ${code}`); });
  procs.push(p);
};

if (!process.argv.includes('--no-ml')) {
  const py = ['python3', 'python'].find((c) => spawnSync(c, ['--version']).status === 0);
  if (!py) console.warn('Python not found - starting without the ML service (uploads will be marked "Not checked").');
  else if (spawnSync(py, ['-c', 'import flask, cv2, PIL, numpy']).status !== 0)
    console.warn(`Python packages missing. Run:  ${py} -m pip install -r ml-service/requirements.txt\nStarting without the ML service for now.`);
  else run('ml', py, ['app.py'], 'ml-service');
}
run('api', process.execPath, ['server.js'], 'backend');

const stop = () => { procs.forEach((p) => p.kill()); process.exit(0); };
process.on('SIGINT', stop); process.on('SIGTERM', stop);

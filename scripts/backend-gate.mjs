import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const mode = process.argv[2] || 'check';

const resolvePython = () => {
  const winVenv = resolve('.venv/Scripts/python.exe');
  const posixVenv = resolve('.venv/bin/python');
  if (existsSync(winVenv)) return winVenv;
  if (existsSync(posixVenv)) return posixVenv;
  return 'python';
};

const python = resolvePython();

const run = (args) => {
  const result = spawnSync(python, args, { stdio: 'inherit', shell: false, cwd: 'backend', env: process.env });
  return result.status;
};

if (mode === 'typecheck') {
  run(['-m', 'mypy', '--config-file', '../mypy.ini', 'main.py', 'analytics.py']);
  process.exit(0);
}

if (mode === 'check') {
  run(['-m', 'pytest', 'tests/', '-v', '--tb=short']);
  run(['-m', 'mypy', '--config-file', '../mypy.ini', 'main.py', 'analytics.py']);
  process.exit(0);
}

if (mode === 'quick') {
  run(['-m', 'pytest', 'tests/test_api.py', '-q']);
  run(['-m', 'mypy', '--config-file', '../mypy.ini', 'main.py', 'analytics.py']);
  process.exit(0);
}

console.error(`Unsupported mode: ${mode}. Use 'check' or 'typecheck'.`);
process.exit(2);

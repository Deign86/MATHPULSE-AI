import { spawnSync } from 'node:child_process';

const CHECKPOINT_MESSAGE = 'chore(checkpoint): auto-save large change set';
const DEFAULT_THRESHOLD = 18;
const DEFAULT_PROTECTED_BRANCHES = ['main', 'master', 'develop', 'release/*', 'hotfix/*'];

const toPosixPath = (value) => value.replace(/\\/g, '/');

const parseBoolean = (value) => {
  if (!value) return false;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const parseArgs = (argv) => {
  const options = {
    threshold: Number.parseInt(process.env.CHECKPOINT_THRESHOLD ?? String(DEFAULT_THRESHOLD), 10),
    dryRun: false,
    allowProtected: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (arg === '--allow-protected') {
      options.allowProtected = true;
      continue;
    }
    if (arg === '--threshold' && argv[i + 1]) {
      options.threshold = Number.parseInt(argv[i + 1], 10);
      i += 1;
      continue;
    }
    if (arg.startsWith('--threshold=')) {
      options.threshold = Number.parseInt(arg.split('=')[1], 10);
    }
  }

  if (!Number.isInteger(options.threshold) || options.threshold <= 0) {
    options.threshold = DEFAULT_THRESHOLD;
  }

  return options;
};

const runGit = (args, opts = {}) => {
  const result = spawnSync('git', args, {
    encoding: 'utf8',
    shell: false,
    env: opts.env ?? process.env,
  });

  if (!opts.allowFailure && result.status !== 0) {
    const stderr = (result.stderr || '').trim();
    throw new Error(`git ${args.join(' ')} failed${stderr ? `: ${stderr}` : ''}`);
  }

  return result;
};

const gitLines = (args) => {
  const result = runGit(args);
  return (result.stdout || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(toPosixPath);
};

const branchMatchesPattern = (branch, pattern) => {
  if (pattern.endsWith('/*')) {
    const prefix = pattern.slice(0, -2);
    return branch.startsWith(`${prefix}/`);
  }
  return branch === pattern;
};

const unsafePathMatchers = [
  (path) => /(^|\/)\.env($|\.)/i.test(path),
  (path) => /(^|\/)serviceAccountKey\.json$/i.test(path),
  (path) => /(^|\/)(node_modules|build|dist|out|\.tmp|tmp|__pycache__)\//i.test(path),
  (path) => /(^|\/)functions\/lib\//i.test(path),
  (path) => /\.(pem|key|p12|crt|cer|jks|keystore)$/i.test(path),
  (path) => /(^|\/)(secrets?|credentials?|private[-_]?keys?)($|\/)/i.test(path),
  (path) => /\.log$/i.test(path),
];

const filterSafeFiles = (files) =>
  files.filter((path) => {
    if (!path || path.startsWith('.git/')) return false;
    return !unsafePathMatchers.some((matcher) => matcher(path));
  });

const getTrackedChangedFiles = () => {
  const unstaged = gitLines(['diff', '--name-only', '--diff-filter=ACDMRTUXB']);
  const staged = gitLines(['diff', '--cached', '--name-only', '--diff-filter=ACDMRTUXB']);
  return [...new Set([...unstaged, ...staged])];
};

const logList = (title, files) => {
  console.log(title);
  for (const file of files) {
    console.log(`  - ${file}`);
  }
};

const main = () => {
  const options = parseArgs(process.argv.slice(2));

  if (parseBoolean(process.env.CHECKPOINT_DISABLED) || parseBoolean(process.env.CHECKPOINT_IN_PROGRESS)) {
    console.log('checkpoint: skipped (CHECKPOINT_DISABLED or CHECKPOINT_IN_PROGRESS is enabled).');
    return;
  }

  const protectedBranchPatterns = (process.env.CHECKPOINT_PROTECTED_BRANCHES || DEFAULT_PROTECTED_BRANCHES.join(','))
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const branch = runGit(['rev-parse', '--abbrev-ref', 'HEAD']).stdout.trim();
  const isProtectedBranch = protectedBranchPatterns.some((pattern) => branchMatchesPattern(branch, pattern));

  if (isProtectedBranch && !options.allowProtected) {
    console.log(`checkpoint: skipped (branch ${branch} is protected).`);
    return;
  }

  const lastSubject = runGit(['log', '-1', '--pretty=%s']).stdout.trim();
  if (lastSubject.startsWith(CHECKPOINT_MESSAGE)) {
    console.log('checkpoint: skipped (last commit is already an auto-checkpoint).');
    return;
  }

  const changedTrackedFiles = getTrackedChangedFiles();
  if (changedTrackedFiles.length === 0) {
    console.log('checkpoint: skipped (no tracked changes).');
    return;
  }

  const safeFiles = filterSafeFiles(changedTrackedFiles);
  const excludedFiles = changedTrackedFiles.filter((file) => !safeFiles.includes(file));

  if (safeFiles.length < options.threshold) {
    console.log(
      `checkpoint: skipped (safe tracked changed files: ${safeFiles.length}, threshold: ${options.threshold}).`,
    );
    if (excludedFiles.length > 0) {
      console.log(`checkpoint: ${excludedFiles.length} file(s) excluded by safety filters.`);
    }
    return;
  }

  console.log(
    `checkpoint: trigger reached on branch ${branch} (${safeFiles.length} safe tracked files, threshold ${options.threshold}).`,
  );

  if (excludedFiles.length > 0) {
    logList('checkpoint: excluded files (safety filter):', excludedFiles);
  }

  if (options.dryRun) {
    logList('checkpoint: dry-run files to include:', safeFiles);
    console.log('checkpoint: dry-run only. No commit created.');
    return;
  }

  runGit(['add', '-A', '--', ...safeFiles]);

  const stagedSafeFiles = gitLines(['diff', '--cached', '--name-only', '--', ...safeFiles]);
  if (stagedSafeFiles.length === 0) {
    console.log('checkpoint: skipped (no stageable safe files after filtering).');
    return;
  }

  const commitResult = runGit(
    ['commit', '-m', CHECKPOINT_MESSAGE, '--', ...safeFiles],
    {
      allowFailure: true,
      env: {
        ...process.env,
        CHECKPOINT_IN_PROGRESS: '1',
      },
    },
  );

  if (commitResult.status !== 0) {
    const stderr = (commitResult.stderr || '').trim();
    const stdout = (commitResult.stdout || '').trim();
    const combined = [stdout, stderr].filter(Boolean).join('\n');
    if (/nothing to commit/i.test(combined)) {
      console.log('checkpoint: skipped (nothing to commit after staging).');
      return;
    }
    throw new Error(combined || 'checkpoint: git commit failed.');
  }

  console.log(`checkpoint: created local commit \"${CHECKPOINT_MESSAGE}\".`);
  console.log('checkpoint: no push performed.');
};

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`checkpoint: failed - ${message}`);
  process.exit(1);
}

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const STOPWORDS = new Set([
  'src',
  'app',
  'apps',
  'component',
  'components',
  'index',
  'main',
  'file',
  'files',
  'config',
  'configs',
  'workflow',
  'workflows',
  'github',
  'docs',
  'doc',
  'readme',
  'test',
  'tests',
  'spec',
  'specs',
  'page',
  'pages',
  'module',
  'modules',
  'service',
  'services',
  'utils',
  'util',
  'lib',
  'build',
  'dist',
  'data',
  'styles',
  'style',
  'new',
  'old',
  'temp',
  'tmp',
  'misc'
]);

const TYPE_TO_COMMIT_PREFIX = {
  feature: 'feat',
  fix: 'fix',
  hotfix: 'fix',
  refactor: 'refactor',
  docs: 'docs',
  chore: 'chore',
  release: 'chore'
};

const TYPE_PRIORITY = ['hotfix', 'docs', 'chore', 'refactor', 'feature', 'fix'];

function parseArgs(argv) {
  const args = {
    config: path.resolve(__dirname, '..', 'config', 'change-scope-map.json'),
    branch: process.env.CURRENT_BRANCH || process.env.GITHUB_REF_NAME || '',
    summary: process.env.SUMMARY || process.env.GITHUB_EVENT_HEAD_COMMIT_MESSAGE || '',
    issue: process.env.ISSUE_NUMBER || '',
    taskType: process.env.AGENT_TASK_TYPE || '',
    changedFilesJson: process.env.CHANGED_FILES_JSON || '',
    outputFile: process.env.OUTPUT_FILE || '',
    writeGithubOutput: process.env.WRITE_GITHUB_OUTPUT === '1',
    baseRef: process.env.BASE_REF || '',
    headRef: process.env.HEAD_REF || ''
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--config' && next) {
      args.config = path.resolve(next);
      i += 1;
    } else if (arg === '--branch' && next) {
      args.branch = next;
      i += 1;
    } else if (arg === '--summary' && next) {
      args.summary = next;
      i += 1;
    } else if (arg === '--issue' && next) {
      args.issue = next;
      i += 1;
    } else if (arg === '--task-type' && next) {
      args.taskType = next;
      i += 1;
    } else if (arg === '--changed-files-json' && next) {
      args.changedFilesJson = next;
      i += 1;
    } else if (arg === '--output-file' && next) {
      args.outputFile = path.resolve(next);
      i += 1;
    } else if (arg === '--write-github-output') {
      args.writeGithubOutput = true;
    } else if (arg === '--base-ref' && next) {
      args.baseRef = next;
      i += 1;
    } else if (arg === '--head-ref' && next) {
      args.headRef = next;
      i += 1;
    }
  }

  return args;
}

function runGit(args) {
  const result = spawnSync('git', args, {
    encoding: 'utf8',
    shell: false
  });
  if (result.status !== 0) {
    return [];
  }
  return String(result.stdout || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/\\/g, '/'));
}

function parseJsonArray(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((value) => String(value).replace(/\\/g, '/')).filter(Boolean);
  } catch {
    return [];
  }
}

function getChangedFiles(args) {
  const fromJson = parseJsonArray(args.changedFilesJson);
  if (fromJson.length > 0) {
    return [...new Set(fromJson)];
  }

  if (args.baseRef && args.headRef) {
    return [...new Set(runGit(['diff', '--name-only', '--diff-filter=ACDMRTUXB', `${args.baseRef}...${args.headRef}`]))];
  }

  const unstaged = runGit(['diff', '--name-only', '--diff-filter=ACDMRTUXB']);
  const staged = runGit(['diff', '--cached', '--name-only', '--diff-filter=ACDMRTUXB']);
  return [...new Set([...unstaged, ...staged])];
}

function normalizeBranchName(value) {
  return String(value || '').trim().replace(/^refs\/heads\//, '');
}

function globToRegex(pattern) {
  const normalized = String(pattern || '').replace(/\\/g, '/');
  const escaped = normalized
    .replace(/[|\\{}()[\]^$+?.]/g, '\\$&')
    .replace(/\*\*/g, '::DOUBLE_STAR::')
    .replace(/\*/g, '[^/]*')
    .replace(/::DOUBLE_STAR::/g, '.*');
  return new RegExp(`^${escaped}$`, 'i');
}

function createMatcher(patterns) {
  const regexes = (patterns || []).map(globToRegex);
  return (file) => regexes.some((regex) => regex.test(file));
}

function tokenize(input) {
  return String(input || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

function inferIssueNumber(args, branch, summary, files) {
  const direct = String(args.issue || '').trim();
  if (/^\d+$/.test(direct)) {
    return direct;
  }

  const haystack = [branch, summary, ...files].join(' ');
  const hashMatch = haystack.match(/#(\d{1,7})/);
  if (hashMatch) return hashMatch[1];

  const namedMatch = haystack.match(/(?:issue|task|bug|ticket)[-_\s]?(\d{1,7})/i);
  if (namedMatch) return namedMatch[1];
  return '';
}

function matchScopes(config, files, summary) {
  const matched = [];
  for (const scope of config.scopes || []) {
    const matchesPattern = createMatcher(scope.patterns || []);
    const keywordSet = (scope.fileKeywordsAny || []).map((word) => String(word).toLowerCase());
    const summaryKeywordSet = (scope.summaryKeywordsAny || []).map((word) => String(word).toLowerCase());

    let count = 0;
    for (const file of files) {
      if (!matchesPattern(file)) continue;
      if (keywordSet.length > 0) {
        const lower = file.toLowerCase();
        if (!keywordSet.some((word) => lower.includes(word))) {
          continue;
        }
      }
      count += 1;
    }

    if (count === 0 && summaryKeywordSet.length > 0) {
      const lowerSummary = summary.toLowerCase();
      if (summaryKeywordSet.some((word) => lowerSummary.includes(word))) {
        count = 1;
      }
    }

    if (count > 0) {
      matched.push({
        ...scope,
        matchCount: count
      });
    }
  }

  return matched.sort((a, b) => b.matchCount - a.matchCount);
}

function getUnion(listOfLists) {
  const bucket = new Set();
  for (const list of listOfLists) {
    for (const value of list || []) {
      if (value) bucket.add(String(value));
    }
  }
  return [...bucket];
}

function detectRiskLevel(config, files, matchedScopes) {
  const highMatcher = createMatcher((config.riskRules && config.riskRules.high) || []);
  const mediumMatcher = createMatcher((config.riskRules && config.riskRules.medium) || []);

  const highRiskFiles = files.filter((file) => highMatcher(file));
  if (highRiskFiles.length > 0 || matchedScopes.some((scope) => scope.riskLevel === 'high')) {
    return { riskLevel: 'high', highRiskFiles };
  }

  const mediumRiskFiles = files.filter((file) => mediumMatcher(file));
  if (mediumRiskFiles.length > 0 || matchedScopes.some((scope) => scope.riskLevel === 'medium')) {
    return { riskLevel: 'medium', highRiskFiles: [] };
  }

  return { riskLevel: 'low', highRiskFiles: [] };
}

function isGenericBranch(branch, genericNames) {
  const normalized = normalizeBranchName(branch).toLowerCase();
  if (!normalized) return true;
  if ((genericNames || []).map((value) => String(value).toLowerCase()).includes(normalized)) {
    return true;
  }
  if (/^(branch|my-branch|new-branch|tmp|temp|wip)([-/].*)?$/i.test(normalized)) {
    return true;
  }
  if (/^patch-\d+$/i.test(normalized)) {
    return true;
  }
  return false;
}

function isProtectedBranch(branch, protectedPatterns) {
  const normalized = normalizeBranchName(branch);
  for (const pattern of protectedPatterns || []) {
    if (String(pattern).endsWith('/*')) {
      const prefix = String(pattern).slice(0, -2);
      if (normalized.startsWith(`${prefix}/`)) {
        return true;
      }
    } else if (normalized === String(pattern)) {
      return true;
    }
  }
  return false;
}

function inferType(args, branch, summary, files, matchedScopes) {
  const normalizedBranch = normalizeBranchName(branch).toLowerCase();
  const summaryLower = String(summary || '').toLowerCase();
  const taskType = String(args.taskType || '').toLowerCase();

  const branchPrefix = normalizedBranch.includes('/') ? normalizedBranch.split('/')[0] : '';
  if (TYPE_PRIORITY.includes(branchPrefix)) {
    return branchPrefix;
  }

  if (/\b(hotfix|critical|sev1|urgent|prod-incident)\b/.test(summaryLower) || taskType === 'release_prep') {
    return 'hotfix';
  }

  const matchedNames = matchedScopes.map((scope) => scope.name);
  if (matchedNames.length > 0 && matchedNames.every((name) => name === 'docs')) {
    return 'docs';
  }

  if (matchedNames.length > 0 && matchedNames.every((name) => name === 'workflow-config')) {
    return 'chore';
  }

  if (/\b(refactor|cleanup|clean-up|rename|restructure|simplify)\b/.test(summaryLower) || taskType === 'repo_standardization') {
    return 'refactor';
  }

  if (/\b(doc|docs|documentation|readme|guide)\b/.test(summaryLower) || taskType === 'docs_update') {
    return 'docs';
  }

  if (/\b(add|new|implement|introduce|feature|enhance)\b/.test(summaryLower)) {
    return 'feature';
  }

  if (/\b(fix|bug|error|issue|patch|regression|broken|crash)\b/.test(summaryLower) || taskType === 'bug_audit' || taskType === 'ui_fix') {
    return 'fix';
  }

  if (matchedScopes[0] && matchedScopes[0].defaultType) {
    return matchedScopes[0].defaultType;
  }

  if (files.length === 0) {
    return 'chore';
  }

  return 'fix';
}

function extractTopTokens(files, matchedScopes, summary, issueNumber) {
  const freq = new Map();

  for (const scope of matchedScopes) {
    for (const token of scope.slugTokens || []) {
      const normalized = String(token).toLowerCase();
      if (!normalized) continue;
      freq.set(normalized, (freq.get(normalized) || 0) + 4);
    }
  }

  const sourceText = [summary, ...files].join(' ');
  for (const token of tokenize(sourceText)) {
    if (token.length < 3) continue;
    if (STOPWORDS.has(token)) continue;
    if (/^\d+$/.test(token)) continue;
    freq.set(token, (freq.get(token) || 0) + 1);
  }

  const ordered = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([token]) => token);

  const picked = ordered.slice(0, 7);
  if (issueNumber) {
    picked.unshift(`issue-${issueNumber}`);
  }

  if (picked.length === 0) {
    return ['repo', 'updates'];
  }

  return picked;
}

function createSlug(tokens, branchType) {
  const normalized = [];
  for (const token of tokens) {
    const safe = String(token)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24);
    if (!safe) continue;
    if (!normalized.includes(safe)) {
      normalized.push(safe);
    }
  }

  if (!normalized.includes('fixes') && (branchType === 'fix' || branchType === 'hotfix')) {
    normalized.push('fixes');
  }

  const slug = normalized.join('-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
  if (!slug) return 'repo-updates';
  if (slug.length <= 62) return slug;

  return slug.slice(0, 62).replace(/-+$/g, '');
}

function isCompliantBranch(branch, allowedPattern, genericNames) {
  const normalized = normalizeBranchName(branch);
  if (!normalized) return false;
  if (isGenericBranch(normalized, genericNames)) return false;
  return new RegExp(allowedPattern).test(normalized);
}

function conventionalCommitStatus(summary) {
  const trimmed = String(summary || '').trim();
  if (!trimmed) {
    return { isConventional: false, reason: 'missing summary' };
  }
  const conventional = /^(feat|fix|chore|docs|refactor|test|build|ci)(\([^)]+\))?:\s.+/.test(trimmed);
  return {
    isConventional: conventional,
    reason: conventional ? 'ok' : 'summary is not conventional commit format'
  };
}

function buildReport(output) {
  const lines = [
    '## Branch Normalization Report',
    '',
    `- Current branch: ${output.currentBranch || '(not provided)'}`,
    `- Branch compliant: ${output.isCurrentBranchCompliant ? 'yes' : 'no'}`,
    `- Suggested branch: ${output.suggestedBranch}`,
    `- Suggested commit title: ${output.suggestedCommitTitle}`,
    `- Changed files: ${output.changedFilesCount}`,
    `- Dominant scope: ${output.dominantScope || 'none'}`,
    `- Matched scopes: ${output.matchedScopes.join(', ') || 'none'}`,
    `- Recommended labels: ${output.labels.join(', ') || 'none'}`,
    `- Recommended CI targets: ${output.ciTargets.join(', ') || 'none'}`,
    `- Risk level: ${output.riskLevel}`
  ];

  if (output.highRiskFiles.length > 0) {
    lines.push('- High-risk files:');
    for (const file of output.highRiskFiles) {
      lines.push(`  - ${file}`);
    }
  }

  lines.push('');
  lines.push('### Next Steps');
  for (const step of output.nextActions) {
    lines.push(`- ${step}`);
  }

  return lines.join('\n');
}

function writeGithubOutput(output) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) return;

  const lines = [];
  const scalar = {
    suggested_branch: output.suggestedBranch,
    branch_type: output.branchType,
    slug: output.slug,
    is_compliant: String(output.isCurrentBranchCompliant),
    risk_level: output.riskLevel,
    dominant_scope: output.dominantScope || '',
    suggested_commit_title: output.suggestedCommitTitle
  };

  for (const [key, value] of Object.entries(scalar)) {
    lines.push(`${key}=${String(value).replace(/\r?\n/g, ' ')}`);
  }

  lines.push(`labels=${JSON.stringify(output.labels)}`);
  lines.push(`ci_targets=${JSON.stringify(output.ciTargets)}`);
  lines.push(`reviewers=${JSON.stringify(output.reviewers)}`);
  lines.push(`matched_scopes=${JSON.stringify(output.matchedScopes)}`);

  lines.push('report_markdown<<EOF');
  lines.push(output.reportMarkdown);
  lines.push('EOF');

  fs.appendFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const configRaw = fs.readFileSync(args.config, 'utf8');
  const config = JSON.parse(configRaw);

  const branch = normalizeBranchName(args.branch || runGit(['rev-parse', '--abbrev-ref', 'HEAD'])[0] || '');
  const summary = String(args.summary || '').trim();
  const changedFiles = getChangedFiles(args);
  const matchedScopes = matchScopes(config, changedFiles, summary);
  const labels = getUnion(matchedScopes.map((scope) => scope.labels));
  const ciTargets = getUnion(matchedScopes.map((scope) => scope.ciTargets));
  const reviewers = getUnion(matchedScopes.map((scope) => scope.reviewers));
  const issueNumber = inferIssueNumber(args, branch, summary, changedFiles);
  const branchType = inferType(args, branch, summary, changedFiles, matchedScopes);
  const tokens = extractTopTokens(changedFiles, matchedScopes, summary, issueNumber);
  const slug = createSlug(tokens, branchType);
  const suggestedBranch = `${branchType}/${slug}`;
  const commitPrefix = TYPE_TO_COMMIT_PREFIX[branchType] || 'chore';
  const suggestedCommitTitle = `${commitPrefix}: ${slug.replace(/-/g, ' ')}`;
  const commitStatus = conventionalCommitStatus(summary);
  const { riskLevel, highRiskFiles } = detectRiskLevel(config, changedFiles, matchedScopes);
  const currentCompliant = isCompliantBranch(branch, config.branch.allowedPattern, config.branch.genericNames);
  const protectedBranch = isProtectedBranch(branch, config.branch.protectedPatterns);

  const nextActions = [];
  if (!currentCompliant) {
    nextActions.push(`Open or rename work to branch ${suggestedBranch}.`);
    nextActions.push(`If using GitHub Desktop, create a new branch named ${suggestedBranch}, then publish it and continue there.`);
  } else {
    nextActions.push('Current branch already follows naming policy.');
  }

  if (!commitStatus.isConventional) {
    nextActions.push(`Use conventional commit style, for example: ${suggestedCommitTitle}`);
  }

  if (protectedBranch) {
    nextActions.push('Do not push directly to protected branches. Open a pull request from a work branch.');
  }

  if (riskLevel === 'high') {
    nextActions.push('High-risk change detected. Request an explicit review before merge.');
  }

  const output = {
    currentBranch: branch,
    isCurrentBranchCompliant: currentCompliant,
    protectedBranch,
    suggestedBranch,
    branchType,
    slug,
    issueNumber,
    changedFilesCount: changedFiles.length,
    changedFiles,
    dominantScope: matchedScopes[0] ? matchedScopes[0].name : '',
    matchedScopes: matchedScopes.map((scope) => scope.name),
    scopeBreakdown: matchedScopes.map((scope) => ({
      name: scope.name,
      count: scope.matchCount
    })),
    labels,
    ciTargets,
    reviewers,
    riskLevel,
    highRiskFiles,
    commitSummary: summary,
    commitIsConventional: commitStatus.isConventional,
    suggestedCommitTitle,
    nextActions
  };

  output.reportMarkdown = buildReport(output);

  if (args.outputFile) {
    fs.writeFileSync(args.outputFile, JSON.stringify(output, null, 2), 'utf8');
  }

  if (args.writeGithubOutput) {
    writeGithubOutput(output);
  }

  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`suggest-branch-name: failed - ${message}\n`);
  process.exit(1);
}

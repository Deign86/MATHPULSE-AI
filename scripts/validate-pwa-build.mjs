#!/usr/bin/env node
/**
 * Validate the production PWA output without assuming a particular Vite PWA
 * plugin. The build directory may be supplied as the first argument.
 */

import fs from 'node:fs';
import path from 'node:path';

const outputDir = path.resolve(process.argv[2] || process.env.PWA_BUILD_DIR || 'build');
const errors = [];
const warnings = [];
const files = [];

function walk(directory, relative = '') {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const relativePath = path.posix.join(relative, entry.name);
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolutePath, relativePath);
    else files.push(relativePath);
  }
}

function fail(message) {
  errors.push(message);
}

function read(relativePath) {
  try {
    return fs.readFileSync(path.join(outputDir, relativePath), 'utf8');
  } catch {
    return null;
  }
}

function exists(relativePath) {
  return fs.existsSync(path.join(outputDir, relativePath));
}

function normalizeAssetReference(source, baseDirectory = '') {
  if (typeof source !== 'string' || !source.trim()) return null;
  const value = source.trim();
  if (/^(?:data|blob|https?):/i.test(value)) return null;
  const withoutQuery = value.split(/[?#]/, 1)[0];
  const relativePath = withoutQuery.startsWith('/')
    ? withoutQuery.slice(1)
    : path.posix.join(baseDirectory, withoutQuery);
  return path.posix.normalize(relativePath).replace(/^\.\//, '');
}

function findManifest() {
  const preferred = ['manifest.webmanifest', 'manifest.json'];
  for (const candidate of preferred) if (files.includes(candidate)) return candidate;
  return files.find((file) => /(?:^|\/)manifest\.(?:webmanifest|json)$/i.test(file));
}

function findServiceWorkers() {
  const configured = new Set();
  const registrationPattern = /serviceWorker\.register\(\s*['"]([^'"]+)['"]/g;
  for (const file of files.filter((item) => /\.(?:js|html)$/i.test(item))) {
    const content = read(file) || '';
    for (const match of content.matchAll(registrationPattern)) {
      const reference = normalizeAssetReference(match[1]);
      if (reference) configured.add(reference);
    }
  }

  for (const file of files) {
    if (/(?:^|\/)(?:sw|service-worker)(?:[-.][^/]*)?\.js$/i.test(file)) {
      configured.add(file);
    }
  }
  return [...configured].sort();
}

function validateServiceWorkerDependencies(workerPath) {
  const content = read(workerPath) || '';
  const workerDirectory = path.posix.dirname(workerPath) === '.' ? '' : path.posix.dirname(workerPath);
  const importPattern = /importScripts\(\s*(['"])(.*?)\1\s*\)/g;
  for (const match of content.matchAll(importPattern)) {
    const reference = normalizeAssetReference(match[2], workerDirectory);
    if (reference && !exists(reference)) {
      fail(`${workerPath} imports missing local asset: ${match[2]}`);
    }
  }

  // Validate literal same-origin precache entries. Generated lists are checked
  // separately from the emitted pwa-config.js asset list below.
  const precacheStart = content.indexOf('PRECACHE_URLS');
  const precacheEnd = precacheStart >= 0 ? content.indexOf('];', precacheStart) : -1;
  const precacheSource = precacheStart >= 0 && precacheEnd >= 0
    ? content.slice(precacheStart, precacheEnd)
    : '';
  const pathPattern = /['"](\/[^'"\s]+)['"]/g;
  for (const match of precacheSource.matchAll(pathPattern)) {
    const reference = normalizeAssetReference(match[1]);
    if (reference && !exists(reference)) {
      fail(`${workerPath} precaches missing asset: ${match[1]}`);
    }
  }
}

function validatePwaConfig() {
  const configPath = files.find((file) => /(?:^|\/)pwa-config\.js$/i.test(file));
  if (!configPath) return;
  const content = read(configPath) || '';
  const assetPattern = /['"](\/assets\/[^'"\s]+)['"]/g;
  for (const match of content.matchAll(assetPattern)) {
    const reference = normalizeAssetReference(match[1]);
    if (reference && !exists(reference)) {
      fail(`${configPath} references missing generated asset: ${match[1]}`);
    }
  }
}

function validate() {
  if (!fs.existsSync(outputDir)) {
    fail(`Build output directory does not exist: ${outputDir}`);
  } else {
    walk(outputDir);
  }

  const manifestPath = findManifest();
  let manifest = null;
  let iconCount = 0;
  if (!manifestPath) {
    fail('No web app manifest found in the build output');
  } else {
    try {
      manifest = JSON.parse(read(manifestPath));
    } catch (error) {
      fail(`Manifest is not valid JSON (${manifestPath}): ${error.message}`);
    }
    if (manifest && typeof manifest === 'object' && !Array.isArray(manifest)) {
      if (!(manifest.name || manifest.short_name)) fail('Manifest requires name or short_name');
      if (typeof manifest.start_url !== 'string' || !manifest.start_url) fail('Manifest requires start_url');
      if (typeof manifest.display !== 'string' || !manifest.display) fail('Manifest requires display');
      if (!Array.isArray(manifest.icons) || manifest.icons.length === 0) {
        fail('Manifest requires at least one icon');
      } else {
        iconCount = manifest.icons.length;
        const manifestDirectory = path.posix.dirname(manifestPath) === '.' ? '' : path.posix.dirname(manifestPath);
        for (const icon of manifest.icons) {
          const reference = normalizeAssetReference(icon && icon.src, manifestDirectory);
          if (!reference) fail('Manifest icon has no local src');
          else if (!exists(reference)) fail(`Manifest icon is missing from build output: ${icon.src}`);
        }
      }
    }
  }

  const serviceWorkers = findServiceWorkers();
  if (serviceWorkers.length === 0) {
    warnings.push('No service worker was detected; validation treated the PWA as manifest-only');
  } else {
    for (const workerPath of serviceWorkers) {
      if (!exists(workerPath)) fail(`Configured service worker is missing: ${workerPath}`);
      else validateServiceWorkerDependencies(workerPath);
    }
  }
  validatePwaConfig();

  const summary = [
    '## PWA Build Validation',
    `- Build output directory: \`${path.relative(process.cwd(), outputDir) || '.'}\``,
    `- Manifest path: \`${manifestPath || 'missing'}\``,
    `- Service-worker path(s): ${serviceWorkers.length ? serviceWorkers.map((item) => `\`${item}\``).join(', ') : 'none detected'}`,
    `- Detected icon count: ${iconCount}`,
    `- Validation outcome: **${errors.length ? 'FAILED' : 'PASSED'}**`,
  ];
  if (warnings.length) summary.push(`- Notes: ${warnings.join(' ')}`);
  process.stdout.write(`${summary.join('\n')}\n`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary.join('\n')}\n`);
  }
  if (errors.length) {
    process.stderr.write(`\n${errors.map((error) => `ERROR: ${error}`).join('\n')}\n`);
    process.exitCode = 1;
  }
}

validate();

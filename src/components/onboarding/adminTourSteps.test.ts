// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { adminPageTour, adminTourPages, adminTourSteps } from './adminTourSteps';

function productionSource(dir: string): string {
  return readdirSync(dir, { withFileTypes: true }).map(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return productionSource(path);
    // Step configs name anchors without rendering them, so they cannot satisfy their own check.
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) && !/TourSteps\.ts$/.test(entry.name) ? readFileSync(path, 'utf8') : '';
  }).join('\n');
}

const source = productionSource(join(__dirname, '..', '..'));
const allSteps = adminTourSteps.concat(adminTourPages.flatMap(page => [page.overview, ...page.steps]));
const selectors = [...new Set(allSteps.flatMap(step => (step.target ? step.target.split(/,(?![^[]*\])/).map(option => option.trim()) : [])))];

describe('admin guide configuration', () => {
  it.each(selectors)('%s is anchored in production source', selector => {
    const anchor = selector.match(/^\[(data-tour(?:-nav|-group)?|aria-label)="([^"]+)"\]$/);
    expect(anchor, 'selectors must be a single attribute anchor').not.toBeNull();
    const [, attribute, value] = anchor ?? [];
    // Admin nav entries are anchored literally in the phone nav; the shared sidebar uses item labels.
    expect(source).toContain(`${attribute}="${value}"`);
  });

  it('spotlights features, never bare page headings', () => {
    for (const step of allSteps) expect(step.target ?? '').not.toMatch(/\bh[1-6]\b/);
  });

  it('keeps every page guide on a real admin tab', () => {
    const tabs = source.match(/const ADMIN_TABS = \[([^\]]+)\]/)?.[1] ?? '';
    for (const page of adminTourPages) {
      expect(tabs).toContain(`'${page.tab}'`);
      expect(page.overview.tab).toBe(page.tab);
      expect(page.steps.every(step => step.tab === page.tab)).toBe(true);
      expect(adminPageTour(page.tab)).toBe(page);
    }
  });

  it('keeps the first-use guide general and points to page guides', () => {
    expect(adminTourSteps).toHaveLength(adminTourPages.length + 2);
    expect(adminTourSteps[0].description).toMatch(/step-by-step guide/);
    expect(adminTourSteps.at(-1)?.target).toBe('[data-tour="page-guide"]');
  });
});

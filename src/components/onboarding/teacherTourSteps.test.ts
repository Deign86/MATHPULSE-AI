// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { teacherPageTour, teacherTourPages, teacherTourSteps } from './teacherTourSteps';

function productionSource(dir: string): string {
  return readdirSync(dir, { withFileTypes: true }).map(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return productionSource(path);
    // Step configs name anchors without rendering them, so they cannot satisfy their own check.
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) && !/TourSteps\.ts$/.test(entry.name) ? readFileSync(path, 'utf8') : '';
  }).join('\n');
}

const source = productionSource(join(__dirname, '..', '..'));
const allSteps = teacherTourSteps.concat(teacherTourPages.flatMap(page => [page.overview, ...page.steps]));
const selectors = [...new Set(allSteps.flatMap(step => (step.target ? step.target.split(/,(?![^[]*\])/).map(option => option.trim()) : [])))];

describe('teacher guide configuration', () => {
  it.each(selectors)('%s is anchored in production source', selector => {
    const anchor = selector.match(/^\[(data-tour(?:-nav|-group)?|aria-label)="([^"]+)"\]$/);
    expect(anchor, 'selectors must be a single attribute anchor').not.toBeNull();
    const [, attribute, value] = anchor ?? [];
    if (attribute === 'data-tour-nav') {
      // Sidebar items pass the view id through NavItem's tourNav prop; phone menus set it directly.
      expect(source).toContain(`tourNav="${value}"`);
      expect(source).toContain(`data-tour-nav="${value}"`);
    } else {
      expect(source).toContain(`${attribute}="${value}"`);
    }
  });

  it('spotlights features, never bare page headings', () => {
    for (const step of allSteps) expect(step.target ?? '').not.toMatch(/\bh[1-6]\b/);
  });

  it('keeps every page guide on its own view and never opens the Intervention Center', () => {
    for (const page of teacherTourPages) {
      expect(page.overview.tab).toBe(page.tab);
      expect(page.steps.every(step => step.tab === page.tab)).toBe(true);
      expect(teacherPageTour(page.tab)).toBe(page);
    }
    expect(allSteps.some(step => step.tab === 'intervention')).toBe(false);
  });

  it('keeps the first-use guide general and points to page guides', () => {
    expect(teacherTourSteps).toHaveLength(teacherTourPages.length + 1);
    expect(teacherTourSteps[0].description).toMatch(/step-by-step guide/);
    expect(teacherTourSteps.at(-1)?.target).toBe('[data-tour="page-guide"]');
    expect(teacherTourSteps[0].optional).toBeFalsy();
  });
});

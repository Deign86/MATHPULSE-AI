// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { studentPageTour, studentTourPages, studentTourSteps } from './studentTourSteps';

function productionSource(dir: string): string {
  return readdirSync(dir, { withFileTypes: true }).map(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return productionSource(path);
    // Step configs name anchors without rendering them, so they cannot satisfy their own check.
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) && !/TourSteps\.ts$/.test(entry.name) ? readFileSync(path, 'utf8') : '';
  }).join('\n');
}

const source = productionSource(join(__dirname, '..', '..'));
const selectors = [...new Set(studentTourSteps.concat(studentTourPages.flatMap(page => page.steps)).flatMap(step => step.target ? step.target.split(/,(?![^[]*\])/).map(option => option.trim()) : []))];

describe('student guide configuration', () => {
  it.each(selectors)('%s is anchored in production source', selector => {
    const anchor = selector.match(/^\[(data-tour(?:-nav|-group)?|aria-label)="([^"]+)"\]$/);
    expect(anchor, 'selectors must be a single attribute anchor').not.toBeNull();
    const [, attribute, value] = anchor ?? [];
    const moduleTab = value.match(/^module-tab-(\w+)$/);
    if (moduleTab) {
      expect(source).toContain('data-tour={`module-tab-${tab.id}`}');
      expect(source).toContain(`id: '${moduleTab[1]}'`);
    } else if (attribute === 'data-tour-nav') {
      // Sidebar and phone nav set these from item labels or literals.
      expect(source.includes(`data-tour-nav="${value}"`) || source.includes(`label: '${value}'`)).toBe(true);
    } else {
      expect(source).toContain(`${attribute}="${value}"`);
    }
  });

  it('spotlights features, never bare page headings', () => {
    for (const step of studentTourSteps) expect(step.target ?? '').not.toMatch(/\bh[1-6]\b/);
  });

  it('gives every page guide steps that stay on that page', () => {
    for (const page of studentTourPages) {
      expect(page.steps.length).toBeGreaterThan(0);
      expect(page.steps.every(step => step.tab === page.tab)).toBe(true);
      expect(studentPageTour(page.tab)).toBe(page);
    }
  });

  it('opens and closes the full guide on a feature that always renders', () => {
    expect(studentTourSteps[0].optional).toBeFalsy();
    expect(studentTourSteps.at(-1)?.optional).toBeFalsy();
  });
});

describe('first-use guide', () => {
  it('stays general: one overview per page, opening and closing with a pointer to page guides', () => {
    expect(studentTourSteps).toHaveLength(studentTourPages.length + 2);
    expect(studentTourSteps[0].description).toMatch(/step-by-step guide/);
    expect(studentTourSteps.at(-1)?.target).toBe('[data-tour="page-guide"]');
    for (const page of studentTourPages) {
      expect(page.overview.tab).toBe(page.tab);
      expect(page.steps.length).toBeGreaterThan(1);
    }
  });
});

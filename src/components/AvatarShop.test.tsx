// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { getEquipQuotes } from './AvatarShop';

describe('AvatarShop equipment dialogue fallback', () => {
  it('returns a category phrase for unrecognized item identifiers', () => {
    expect(getEquipQuotes('custom-top', 'top')).toContain('Looking sharp in this top!');
  });
});

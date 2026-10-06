import { describe, expect, it } from 'vitest';
import { hasUnsavedProfileChanges } from '../profileDirtyState';
import type { ProfileData } from '../../components/SettingsPage';

const baseline: ProfileData = {
  name: 'Ada Lovelace',
  phone: '+639123456789',
  photo: 'https://cdn.example.com/old.jpg',
  gender: 'female',
};

describe('hasUnsavedProfileChanges', () => {
  it('ignores a photo-only difference (photo persists on upload)', () => {
    expect(
      hasUnsavedProfileChanges({ ...baseline, photo: 'https://cdn.example.com/new.jpg' }, baseline),
    ).toBe(false);
  });

  it('flags a renamed profile as dirty', () => {
    expect(hasUnsavedProfileChanges({ ...baseline, name: 'Grace Hopper' }, baseline)).toBe(true);
  });

  it('is clean when nothing differs', () => {
    expect(hasUnsavedProfileChanges({ ...baseline }, baseline)).toBe(false);
  });

  it('flags a newly added phone number as dirty', () => {
    const { phone: _dropped, ...withoutPhone } = baseline;
    expect(hasUnsavedProfileChanges(baseline, withoutPhone)).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { getOptimisticAdminStatus } from '../adminUserStatus';

describe('getOptimisticAdminStatus', () => {
  it('maps activation and deactivation actions to their saved account status', () => {
    expect(getOptimisticAdminStatus('activate')).toBe('Active');
    expect(getOptimisticAdminStatus('deactivate')).toBe('Inactive');
  });

  it('accepts only known statuses for a change-status action', () => {
    expect(getOptimisticAdminStatus('change_status', 'Inactive')).toBe('Inactive');
    expect(getOptimisticAdminStatus('change_status', 'pending')).toBeUndefined();
  });
});

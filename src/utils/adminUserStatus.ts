import type { AdminBulkActionType } from '../services/adminService';

export type AdminAccountStatus = 'Active' | 'Inactive';

export function getOptimisticAdminStatus(
  action: AdminBulkActionType,
  requestedStatus?: string,
): AdminAccountStatus | undefined {
  if (action === 'activate') return 'Active';
  if (action === 'deactivate') return 'Inactive';
  if (action === 'change_status' && (requestedStatus === 'Active' || requestedStatus === 'Inactive')) {
    return requestedStatus;
  }
  return undefined;
}

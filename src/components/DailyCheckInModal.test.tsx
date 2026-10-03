// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DailyCheckInModal from './DailyCheckInModal';

describe('DailyCheckInModal visibility', () => {
  it('does not render an inaccessible closed check-in dialog', () => {
    render(<DailyCheckInModal isOpen={false} onClose={vi.fn()} onClaim={vi.fn()} weekRewards={[]} todayReward={null} canClaim={false} isClaiming={false} claimedDays={[]} currentDayIndex={0} timeUntilReset="12 hours" />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

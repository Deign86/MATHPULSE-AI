/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import CompositeAvatar from '../CompositeAvatar';
import DashboardAvatar from '../DashboardAvatar';
import MathPulseLoader from '../ui/MathPulseLoader';

afterEach(cleanup);

describe('CompositeAvatar and DashboardAvatar', () => {
  it('renders CompositeAvatar with head base, horns, and eyes', () => {
    const { getByAltText } = render(
      <CompositeAvatar
        layers={{ top: 'top_blue', bottom: 'bot_black', shoes: 'shoe_black', accessory: 'acc_blue_cap' }}
      />
    );
    expect(getByAltText('base body')).toBeInTheDocument();
    expect(getByAltText('left horn')).toBeInTheDocument();
    expect(getByAltText('right horn')).toBeInTheDocument();
    expect(getByAltText('Avatar Eyes')).toBeInTheDocument();
    expect(getByAltText('top')).toBeInTheDocument();
    expect(getByAltText('bottom')).toBeInTheDocument();
    expect(getByAltText('shoes')).toBeInTheDocument();
    expect(getByAltText('accessory')).toBeInTheDocument();
  });

  it('renders DashboardAvatar with head base, left horn, right horn, and eyes', () => {
    const { getByAltText } = render(
      <DashboardAvatar
        layers={{ top: 'top_blue', bottom: 'bot_black', shoes: 'shoe_black', accessory: 'acc_crown' }}
      />
    );
    expect(getByAltText('Avatar Body')).toBeInTheDocument();
    expect(getByAltText('Left Horn')).toBeInTheDocument();
    expect(getByAltText('Right Horn')).toBeInTheDocument();
    expect(getByAltText('Avatar Eyes')).toBeInTheDocument();
    expect(getByAltText('Avatar Head')).toBeInTheDocument();
    expect(getByAltText('Uniform')).toBeInTheDocument();
    expect(getByAltText('Pants')).toBeInTheDocument();
    expect(getByAltText('Shoes')).toBeInTheDocument();
    expect(getByAltText('Accessory')).toBeInTheDocument();
  });
});

describe('MathPulseLoader and AppLoadingScreen', () => {
  it('renders animated puppet head, horns, eyes, title and subtitle', () => {
    const { getByText, getByAltText, getByRole } = render(
      <MathPulseLoader
        title="Loading lesson from DepEd curriculum..."
        subtitle="This may take a moment while the AI retrieves curriculum content."
        fullScreen={false}
      />
    );
    expect(getByText('Loading lesson from DepEd curriculum...')).toBeInTheDocument();
    expect(getByText('This may take a moment while the AI retrieves curriculum content.')).toBeInTheDocument();
    expect(getByAltText('MathPulse mascot')).toBeInTheDocument();
    expect(getByAltText('left horn')).toBeInTheDocument();
    expect(getByAltText('right horn')).toBeInTheDocument();
    expect(getByAltText('Avatar eyes')).toBeInTheDocument();
    expect(getByRole('status')).toBeInTheDocument();
  });

  it('renders AppLoadingScreen with unified MathPulseLoader mascot and message', async () => {
    const { default: AppLoadingScreen } = await import('../AppLoadingScreen');
    const { getByText, getByAltText, getByRole } = render(
      <AppLoadingScreen message="Loading dashboard..." />
    );
    expect(getByText('Loading dashboard...')).toBeInTheDocument();
    expect(getByText('Preparing your MathPulse AI experience...')).toBeInTheDocument();
    expect(getByAltText('MathPulse mascot')).toBeInTheDocument();
    expect(getByRole('status')).toBeInTheDocument();
  });
});


describe('Personalized Equip Dialogue', () => {
  it('returns tailored dialogue for blue uniform, pink uniform, and slippers', async () => {
    const { getEquipQuotes, ITEM_EQUIP_DIALOGUE } = await import('../AvatarShop');
    expect(getEquipQuotes('top_blue', 'top')).toContain('Wow! I love blue!');
    expect(getEquipQuotes('top_pink', 'top')).toContain('Ooh, pretty in pink!');
    expect(getEquipQuotes('shoe_slippers', 'shoes')).toContain('Cozy study mode activated!');
    expect(getEquipQuotes('acc_crown', 'accessory')).toContain('Royal mathematician! Crown of mastery! 👑');
    expect(getEquipQuotes('unknown_item', 'top')).toEqual(
      expect.arrayContaining(['Looking sharp in this top!'])
    );
    expect(ITEM_EQUIP_DIALOGUE.top_blue).toBeDefined();
    expect(ITEM_EQUIP_DIALOGUE.acc_traffic_cone).toBeDefined();
  });
});

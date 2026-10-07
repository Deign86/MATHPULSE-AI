// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProfileModal from './ProfileModal';

describe('ProfileModal', () => {
  it('keeps the editor open when saving the profile fails', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('Save failed'));

    render(
      <ProfileModal
        isOpen
        onClose={vi.fn()}
        profileData={{
          name: 'Admin User',
          email: 'admin@example.com',
          phone: '09171234567',
          photo: '',
          role: 'admin',
        }}
        onSave={onSave}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /edit profile/i }));
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
  });
});

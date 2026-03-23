import React from 'react';

interface AddFriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Social features were removed. Keep a no-op component to prevent stale editor diagnostics.
const AddFriendsModal: React.FC<AddFriendsModalProps> = () => null;

export default AddFriendsModal;

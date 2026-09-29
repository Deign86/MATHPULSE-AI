# src/contexts/

## Responsibility
Expose cross-screen client state for authentication and tutoring chat.

## Design
`AuthContext.tsx` exports `AuthProvider`, `AuthContextType`, and `useAuth`; it observes Firebase auth and profile state. `ChatContext.tsx` exports `ChatProvider`, `useChatContext`, `Message`, and `ChatSession`, encapsulating chat state and response continuation/repair behavior.

## Flow
`main.tsx` mounts `AuthProvider`; authenticated app composition mounts `ChatProvider`. Consumers read provider state through hooks; chat actions dynamically load `services/apiService.ts` and `services/chatService.ts`.

## Integration
Auth uses `services/authService.ts` and Firebase from `lib/firebase.ts`. Notification state is provided separately by `src/features/notifications`; server data otherwise belongs in TanStack Query rather than context.

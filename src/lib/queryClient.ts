import { QueryClient } from '@tanstack/react-query';

const FIVE_MINUTES_MS = 5 * 60 * 1000;
const THIRTY_MINUTES_MS = 30 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: FIVE_MINUTES_MS,
      gcTime: THIRTY_MINUTES_MS,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const clearQueryClientCache = async (): Promise<void> => {
  await queryClient.cancelQueries();
  queryClient.clear();
};

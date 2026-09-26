import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clearAllHistory, getRecentRooms, removeRoom, type RoomEntry } from "../lib/history";
import { BILLS_QUERY_KEY } from "./useBillsQuery";

export const ROOMS_QUERY_KEY = ["recentRooms"] as const;

/**
 * React Query hook to fetch and cache recent split rooms.
 */
export function useRecentRoomsQuery() {
  return useQuery<RoomEntry[]>({
    queryKey: ROOMS_QUERY_KEY,
    queryFn: getRecentRooms,
  });
}

/**
 * Mutation hook to remove a room from history with automatic cache invalidation.
 */
export function useRemoveRoomMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (code: string) => removeRoom(code),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ROOMS_QUERY_KEY });
    },
  });
}

/**
 * Mutation hook to clear all rooms and receipt history.
 */
export function useClearAllRoomsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: clearAllHistory,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ROOMS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: BILLS_QUERY_KEY });
    },
  });
}

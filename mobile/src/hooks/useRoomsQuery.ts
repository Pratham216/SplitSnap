import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRecentRooms, removeRoom, type RoomEntry } from "../lib/history";

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

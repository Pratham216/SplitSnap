import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteBill, getBill, getBillImageUrl, getRecentServerBills } from "../api/bills";
import { createRoom } from "../api/rooms";
import { getBillDisplayTotal } from "../lib/billTotals";
import {
  getRecentReceipts,
  removeReceipt,
  saveReceipt,
  saveRoom,
  type ReceiptEntry,
} from "../lib/history";

export const BILLS_QUERY_KEY = ["recentReceipts"] as const;

/**
 * React Query hook to fetch and cache recent receipts.
 * Synchronizes server bills from MongoDB with local device storage.
 */
export function useRecentReceiptsQuery() {
  return useQuery<ReceiptEntry[]>({
    queryKey: BILLS_QUERY_KEY,
    queryFn: async () => {
      const serverBills = await getRecentServerBills();
      return serverBills.map((sb) => {
        const total = getBillDisplayTotal(sb);
        return {
          billId: sb.id,
          restaurantName: sb.restaurantName || "Receipt",
          billDate: sb.billDate,
          total: total || 0,
          roomCode: sb.roomCode,
          savedAt: sb.createdAt || new Date().toISOString(),
          imageUrl: sb.imageUrl
            ? getBillImageUrl(sb.imageUrl)
            : sb.hasImage
            ? getBillImageUrl(sb.id)
            : undefined,
        };
      });
    },
  });
}

/**
 * Mutation hook to delete a receipt from history with automatic cache invalidation.
 */
export function useRemoveReceiptMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (billId: string) => {
      await removeReceipt(billId).catch(() => {});
      await deleteBill(billId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: BILLS_QUERY_KEY });
    },
  });
}

/**
 * Mutation hook to create and host a split room from an existing receipt.
 * Automatically updates history storage and invalidates both bills and rooms caches.
 */
export function useCreateSplitRoomMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      billId,
      hostName,
      hostUpiId,
      fallbackRestaurantName,
    }: {
      billId: string;
      hostName: string;
      hostUpiId?: string;
      fallbackRestaurantName?: string;
    }) => {
      const bill = await getBill(billId);
      const room = await createRoom(billId, hostName, hostUpiId);
      const total = getBillDisplayTotal(bill);

      const restaurant =
        bill.restaurantName || fallbackRestaurantName || "Receipt";

      await saveReceipt({
        billId,
        restaurantName: restaurant,
        total,
        roomCode: room.code,
      });

      await saveRoom({
        code: room.code,
        role: "host",
        restaurantName: restaurant,
      });

      return room;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: BILLS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ["recentRooms"] });
    },
  });
}

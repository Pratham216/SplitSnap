import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import ScreenContainer from "../layout/ScreenContainer";
import Button from "../ui/Button";
import GradientGoldText from "../ui/GradientGoldText";
import type { TaxBreakdown } from "@zaptab/shared";
import { deleteBillItem, type Bill, type BillItem } from "../../api/bills";
import { createRoom } from "../../api/rooms";
import { useDebouncedCallback } from "../../hooks/useDebouncedCallback";
import {
  applyItemFieldUpdate,
  getTotalTaxFromBill,
  recalcBillFromItems,
  recalcGrandTotal,
  sumItemPrices,
} from "../../lib/billTotals";
import {
  billsMatchForSave,
  createTempItemId,
  hasPendingSync,
  isTempItemId,
  mergeDraftWithServer,
  persistBillToServer,
  validateBillItems,
} from "../../lib/billSync";
import { colors, fontSize, spacing } from "../../theme";
import {
  BillHostSection,
  BillItemsSection,
  BillMetaSection,
  BillTotalsSection,
} from "./editor";

interface BillEditorProps {
  initialBill: Bill;
  onScanAnother: () => void;
  onRoomCreated: (code: string) => void;
  onBillChange?: (bill: Bill) => void;
  focusSplit?: boolean;
  defaultHostName?: string;
  defaultHostUpiId?: string;
}

export default function BillEditor({
  initialBill,
  onScanAnother,
  onRoomCreated,
  onBillChange,
  focusSplit = false,
  defaultHostName = "",
  defaultHostUpiId = "",
}: BillEditorProps) {
  const [draft, setDraft] = useState(initialBill);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hostName, setHostName] = useState(defaultHostName);
  const [hostUpiId, setHostUpiId] = useState(defaultHostUpiId);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [focusItemId, setFocusItemId] = useState<string | null>(null);
  const hostNameInputRef = useRef<TextInput>(null);

  const draftRef = useRef(draft);
  const lastSavedRef = useRef(initialBill);
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const onBillChangeRef = useRef(onBillChange);

  draftRef.current = draft;
  onBillChangeRef.current = onBillChange;

  function notifyBillChange(bill: Bill) {
    onBillChangeRef.current?.(recalcBillFromItems(bill));
  }

  const notifyHistory = useDebouncedCallback(() => {
    notifyBillChange(draftRef.current);
  }, 150);

  const scheduleSave = useDebouncedCallback(() => {
    void flushSave();
  }, 400);

  useEffect(() => {
    if (defaultHostName) setHostName(defaultHostName);
  }, [defaultHostName]);

  useEffect(() => {
    if (defaultHostUpiId) setHostUpiId(defaultHostUpiId);
  }, [defaultHostUpiId]);

  useEffect(() => {
    if (!focusSplit) return;
    hostNameInputRef.current?.focus();
  }, [focusSplit]);

  useEffect(() => {
    return () => {
      notifyHistory.cancel();
      scheduleSave.cancel();
      void flushSave({ force: true });
    };
  }, []);

  async function flushSave(options?: { force?: boolean }) {
    const shouldSave =
      options?.force ||
      dirtyRef.current ||
      hasPendingSync(draftRef.current, lastSavedRef.current);
    if (!shouldSave || savingRef.current) return;

    const snapshot = draftRef.current;
    savingRef.current = true;
    setSaving(true);
    setSaveError(null);

    try {
      const { serverBill, syncedTempIds } = await persistBillToServer(
        lastSavedRef.current,
        snapshot
      );
      lastSavedRef.current = serverBill;
      const merged = mergeDraftWithServer(serverBill, snapshot, syncedTempIds);

      if (billsMatchForSave(draftRef.current, merged)) {
        dirtyRef.current = hasPendingSync(merged, serverBill);
        setDraft(merged);
        notifyBillChange(merged);
        if (dirtyRef.current) scheduleSave();
      } else {
        scheduleSave();
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  function updateDraft(updater: (current: Bill) => Bill) {
    dirtyRef.current = true;
    setDraft((current) => {
      const next = updater(current);
      draftRef.current = next;
      notifyHistory();
      return next;
    });
    scheduleSave();
  }

  function handleItemChange(
    itemId: string,
    data: { name?: string; price?: number; quantity?: number }
  ) {
    setRoomError(null);
    updateDraft((current) => {
      const items = current.items.map((item) =>
        item.id === itemId ? applyItemFieldUpdate(item, data) : item
      );
      return recalcBillFromItems({ ...current, items });
    });
  }

  function handleBillFieldChange(
    fields: Partial<
      Pick<
        Bill,
        "restaurantName" | "billDate" | "serviceCharge" | "subtotal" | "grandTotal"
      >
    >
  ) {
    updateDraft((current) =>
      recalcGrandTotal({ ...current, ...fields, isManuallyModified: true })
    );
  }

  function handleTaxesChange(newTaxes: TaxBreakdown[]) {
    updateDraft((current) => {
      const next = { ...current, taxes: newTaxes, isManuallyModified: true };
      return recalcGrandTotal(next);
    });
  }

  function handleAddItem() {
    const newItemId = createTempItemId();
    setRoomError(null);
    updateDraft((current) =>
      recalcBillFromItems({
        ...current,
        isManuallyModified: true,
        items: [
          ...current.items,
          { id: newItemId, name: "", price: 0, quantity: 1 },
        ],
      })
    );
    setFocusItemId(newItemId);
  }

  async function handleDeleteItem(itemId: string) {
    if (isTempItemId(itemId)) {
      setRoomError(null);
      updateDraft((current) =>
        recalcBillFromItems({
          ...current,
          isManuallyModified: true,
          items: current.items.filter((item) => item.id !== itemId),
        })
      );
      return;
    }

    try {
      const serverBill = await deleteBillItem(draft.id, itemId);
      lastSavedRef.current = serverBill;
      setDraft((current) => {
        const temps = current.items.filter((item) => isTempItemId(item.id));
        const next = recalcBillFromItems({
          ...serverBill,
          isManuallyModified: true,
          items: [...serverBill.items, ...temps],
        });
        notifyBillChange(next);
        return next;
      });
      dirtyRef.current = hasPendingSync(draftRef.current, serverBill);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to delete item");
    }
  }

  const itemsTotal = sumItemPrices(draft.items);
  const displaySubtotal = draft.subtotal ?? itemsTotal;
  const totalTax = getTotalTaxFromBill(draft);
  const displayGrandTotal =
    draft.grandTotal ?? displaySubtotal + totalTax + draft.serviceCharge;

  async function handleCreateRoom() {
    if (!hostName.trim()) {
      setRoomError("Enter your name to create the room");
      return;
    }

    const itemError = validateBillItems(draft.items);
    if (itemError) {
      setRoomError(itemError);
      return;
    }

    if (dirtyRef.current || hasPendingSync(draft, lastSavedRef.current)) {
      await flushSave();
    }

    const postSaveError = validateBillItems(draftRef.current.items);
    if (postSaveError) {
      setRoomError(postSaveError);
      return;
    }

    setRoomError(null);
    setCreatingRoom(true);
    try {
      const room = await createRoom(
        draft.id,
        hostName.trim(),
        hostUpiId.trim() || undefined
      );
      onRoomCreated(room.code);
    } catch (err) {
      setRoomError(err instanceof Error ? err.message : "Failed to create room");
    } finally {
      setCreatingRoom(false);
    }
  }

  return (
    <ScreenContainer scroll contentStyle={styles.screenContent}>
      <View style={styles.header}>
        <GradientGoldText size="title">Review your bill</GradientGoldText>
        <Text style={styles.subtitle}>
          Fix any mistakes before sharing with friends.
        </Text>
        {saving ? <Text style={styles.savingText}>Saving…</Text> : null}
      </View>

      <BillMetaSection
        restaurantName={draft.restaurantName}
        billDate={draft.billDate}
        onRestaurantNameChange={(v) => handleBillFieldChange({ restaurantName: v })}
        onBillDateChange={(v) => handleBillFieldChange({ billDate: v })}
      />

      <BillItemsSection
        items={draft.items}
        onAddItem={handleAddItem}
        onItemChange={handleItemChange}
        onDeleteItem={handleDeleteItem}
        focusItemId={focusItemId}
        onNameFocused={() => setFocusItemId(null)}
      />

      <BillTotalsSection
        taxes={draft.taxes ?? []}
        serviceCharge={draft.serviceCharge}
        subtotal={displaySubtotal}
        grandTotal={displayGrandTotal}
        isManuallyModified={draft.isManuallyModified}
        onTaxesChange={handleTaxesChange}
        onFieldChange={handleBillFieldChange}
      />

      <BillHostSection
        grandTotal={displayGrandTotal}
        hostName={hostName}
        onHostNameChange={setHostName}
        hostUpiId={hostUpiId}
        onHostUpiIdChange={setHostUpiId}
        hostNameInputRef={hostNameInputRef}
        creatingRoom={creatingRoom}
        onCreateRoom={handleCreateRoom}
        roomError={roomError}
        saveError={saveError}
      />

      <View style={styles.actions}>
        <Button
          label="Scan another bill"
          variant="ghost"
          fullWidth
          onPress={onScanAnother}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingBottom: spacing.xxxl,
  },
  header: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    lineHeight: 22,
    fontWeight: "500",
  },
  savingText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  actions: {
    marginTop: spacing.sm,
  },
});

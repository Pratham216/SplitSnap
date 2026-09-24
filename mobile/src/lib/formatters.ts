/**
 * Formats a monetary amount into standard INR currency string (₹).
 *
 * @param value - The numeric amount in INR.
 * @returns Formatted currency string, e.g. "₹1,250.00", or "—" if invalid.
 *
 * @example
 * formatMoney(450.5) // "₹450.50"
 * formatMoney(undefined) // "—"
 */
export function formatMoney(value?: number): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `₹${value.toFixed(2)}`;
}

/**
 * Formats a monetary amount to a rounded integer without decimal places.
 *
 * @param value - The numeric amount in INR.
 * @returns Formatted currency string without decimals, e.g. "₹450".
 */
export function formatMoneyInt(value?: number): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `₹${Math.round(value)}`;
}

/**
 * Formats an ISO date string into a full "Day Month Year | Time" string.
 *
 * @param iso - The ISO date string (e.g., "2026-09-21T16:58:00.000Z").
 * @returns Formatted string e.g. "21 September 2026 | 4:58 pm".
 */
export function formatDateTime(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;

  const day = d.getDate();
  const month = d.toLocaleDateString("en-US", { month: "long" });
  const year = d.getFullYear();

  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? "pm" : "am";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutesStr = minutes < 10 ? `0${minutes}` : minutes;

  return `${day} ${month} ${year} | ${hours}:${minutesStr} ${ampm}`;
}

/**
 * Formats an ISO date into relative readable time if recent, otherwise month and day.
 *
 * @param iso - The ISO date string.
 * @returns "Today, 4:58 pm", "Yesterday, 8:20 pm", or "Sep 21".
 */
export function formatRelativeDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;

  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
  );

  const timeStr = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  if (diffDays === 0 && now.getDate() === d.getDate()) {
    return `Today, ${timeStr}`;
  }
  if (diffDays <= 1 && now.getDate() - d.getDate() === 1) {
    return `Yesterday, ${timeStr}`;
  }
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/**
 * Formats an ISO date into compact date-time display for receipts.
 *
 * @param iso - The ISO date string.
 * @returns e.g. "Sep 21, 2026, 4:58 PM"
 */
export function formatSavedAt(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Formats room expiration time into a remaining duration string.
 *
 * @param expiresAtIso - The expiration ISO timestamp.
 * @returns "Expires in 2h 15m", "Expires in 8m", "Expired", or null.
 */
export function formatExpiresIn(expiresAtIso?: string): string | null {
  if (!expiresAtIso) return null;
  const exp = new Date(expiresAtIso).getTime();
  if (Number.isNaN(exp)) return null;

  const diffMs = exp - Date.now();
  if (diffMs <= 0) return "Expired";

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `Expires in ${hours}h ${mins}m`;
  return `Expires in ${mins}m`;
}

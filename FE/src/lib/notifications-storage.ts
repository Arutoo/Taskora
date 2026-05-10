export type StoredNotification = {
  id?: string;
  message: string;
  created_at?: string;
};

const NOTIFICATION_KEY = "taskora.notifications";
const UNREAD_KEY = "taskora.notifications.unread";
const MAX_NOTIFICATIONS = 50;

export function readStoredNotifications(): StoredNotification[] {
  try {
    const raw = localStorage.getItem(NOTIFICATION_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item.message === "string");
  } catch {
    return [];
  }
}

export function writeStoredNotifications(list: StoredNotification[]) {
  try {
    localStorage.setItem(NOTIFICATION_KEY, JSON.stringify(list.slice(0, MAX_NOTIFICATIONS)));
  } catch {
    // Ignore storage errors.
  }
}

export function pushStoredNotification(note: StoredNotification) {
  const next = [note, ...readStoredNotifications()].slice(0, MAX_NOTIFICATIONS);
  writeStoredNotifications(next);
  setUnreadCount(readUnreadCount() + 1);
  return next;
}

export function readUnreadCount(): number {
  try {
    const raw = localStorage.getItem(UNREAD_KEY);
    const value = raw ? Number(raw) : 0;
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

export function setUnreadCount(count: number) {
  try {
    localStorage.setItem(UNREAD_KEY, String(Math.max(0, Math.floor(count))));
  } catch {
    // Ignore storage errors.
  }
}

export function clearUnreadCount() {
  setUnreadCount(0);
}

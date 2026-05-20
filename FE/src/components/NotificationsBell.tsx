import { Bell, Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../lib/api/notifications";
import type { ApiNotification, ApiPaginated } from "../lib/api/types";

type NotificationEventDetail = {
  notification?: ApiNotification;
};

const PAGE_SIZE = 8;

function timeLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NotificationsBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ApiPaginated<ApiNotification> | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.total / data.limit));
  }, [data]);

  const loadPage = useCallback(async (nextPage: number) => {
    try {
      setIsLoading(true);
      setError(null);
      const next = await listNotifications(nextPage, PAGE_SIZE);
      setData(next);
      setUnreadCount(next.items.filter((item) => !item.is_read).length);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load notifications";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPage(1);
  }, [loadPage]);

  useEffect(() => {
    const handleNotification = (event: Event) => {
      const custom = event as CustomEvent<NotificationEventDetail>;
      const notification = custom.detail?.notification;
      if (!notification) {
        void loadPage(page);
        return;
      }

      setUnreadCount((current) => current + 1);
      setData((current) => {
        if (!current || current.page !== 1) return current;
        const exists = current.items.some((item) => item.id === notification.id);
        if (exists) return current;
        return {
          ...current,
          total: current.total + 1,
          items: [notification, ...current.items].slice(0, current.limit),
        };
      });
    };

    window.addEventListener("taskora:notification", handleNotification);
    return () => {
      window.removeEventListener("taskora:notification", handleNotification);
    };
  }, [loadPage, page]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const openNotifications = () => {
    setIsOpen(true);
    void loadPage(page);
  };

  const goToPage = (nextPage: number) => {
    const bounded = Math.min(totalPages, Math.max(1, nextPage));
    setPage(bounded);
    void loadPage(bounded);
  };

  const handleMarkRead = async (notification: ApiNotification) => {
    if (notification.is_read) return;
    try {
      await markNotificationRead(notification.id);
      setData((current) => current
        ? {
            ...current,
            items: current.items.map((item) =>
              item.id === notification.id ? { ...item, is_read: true } : item
            ),
          }
        : current);
      setUnreadCount((current) => Math.max(0, current - 1));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update notification";
      setError(message);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setData((current) => current
        ? { ...current, items: current.items.map((item) => ({ ...item, is_read: true })) }
        : current);
      setUnreadCount(0);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update notifications";
      setError(message);
    }
  };

  const notificationDialog = isOpen && typeof document !== "undefined"
    ? createPortal(
        <div
          className="notificationOverlay"
          role="dialog"
          aria-modal="true"
          aria-label="Notifications"
          onClick={() => setIsOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="notificationModal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="notificationHeader">
              <div>
                <p className="notificationKicker">Notifications</p>
                <p className="notificationTitle">Activity feed</p>
              </div>
              <div className="notificationActions">
                <button
                  className="ghostBtn iconOnlyBtn"
                  type="button"
                  title="Mark all read"
                  aria-label="Mark all read"
                  onClick={handleMarkAllRead}
                  disabled={unreadCount === 0}
                >
                  <Check size={15} />
                </button>
                <button
                  className="ghostBtn iconOnlyBtn"
                  type="button"
                  title="Close"
                  aria-label="Close notifications"
                  onClick={() => setIsOpen(false)}
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {error ? (
              <div className="notificationEmpty">
                <p className="muted" style={{ margin: 0 }}>{error}</p>
              </div>
            ) : isLoading && !data ? (
              <div className="notificationList" aria-label="Loading notifications">
                <div className="skeletonLine" />
                <div className="skeletonLine" />
                <div className="skeletonLine" />
              </div>
            ) : !data || data.items.length === 0 ? (
              <div className="notificationEmpty">
                <p className="emptyStateTitle">No notifications yet</p>
                <p className="emptyStateText">Assigned tasks, replies, and deadline reminders will appear here.</p>
              </div>
            ) : (
              <>
                <div className="notificationList">
                  {data.items.map((note) => (
                    <button
                      key={note.id}
                      className={note.is_read ? "notificationItem read" : "notificationItem unread"}
                      type="button"
                      onClick={() => handleMarkRead(note)}
                    >
                      <div className="notificationIcon" aria-hidden="true">
                        {note.type.split("_").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="notificationMessage">{note.message}</p>
                        <p className="notificationTime">{timeLabel(note.created_at)}</p>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="notificationPager">
                  <button
                    className="ghostBtn iconOnlyBtn"
                    type="button"
                    aria-label="Previous notification page"
                    onClick={() => goToPage(page - 1)}
                    disabled={page <= 1 || isLoading}
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <span className="font-mono">{page}/{totalPages}</span>
                  <button
                    className="ghostBtn iconOnlyBtn"
                    type="button"
                    aria-label="Next notification page"
                    onClick={() => goToPage(page + 1)}
                    disabled={page >= totalPages || isLoading}
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <button
        className="iconBtn"
        type="button"
        aria-label="Notifications"
        title="Notifications"
        onClick={openNotifications}
      >
        <Bell size={18} />
        {unreadCount > 0 ? (
          <span className="badgeDot" aria-label={`${unreadCount} unread notifications`} />
        ) : null}
      </button>

      {notificationDialog}
    </>
  );
}

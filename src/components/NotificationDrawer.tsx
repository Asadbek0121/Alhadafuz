"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { X, Bell } from "lucide-react";
import styles from "./NotificationDrawer.module.css";
import { Link } from "@/navigation";
import { useUIStore } from "@/store/useUIStore";
import { useScrollLock } from "@/hooks/useScrollLock";

/** Bildirishnoma drawer — savatcha drawer'iga o'xshash o'ngdan ochiladi. */
export default function NotificationDrawer() {
  const activeMenu = useUIStore((s) => s.activeMenu);
  const closeAllMenus = useUIStore((s) => s.closeAllMenus);
  const isOpen = activeMenu === "notifications";
  const t = useTranslations("Header");
  const tNotif = useTranslations("Notifications");
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;

  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const fetchN = async () => {
      if (!isAuthenticated) return;
      try {
        const res = await fetch("/api/user/notifications", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setNotifications(data);
            setUnreadCount(data.filter((n: any) => !n.isRead).length);
          }
        }
      } catch (e) { /* quiet */ }
    };
    fetchN();
    const iv = setInterval(fetchN, 60000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [isOpen, isAuthenticated]);

  // Ochilganda unread -> read
  useEffect(() => {
    if (isOpen && unreadCount > 0) {
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      fetch("/api/user/notifications", { method: "PUT" }).catch(() => {});
    }

  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.overlay} onClick={closeAllMenus}></div>
      <div className={styles.drawer} role="dialog" aria-modal="true" aria-label={t("bildirishnoma")}>
        <div className={styles.header}>
          <h3>{t("bildirishnoma")}</h3>
          <button onClick={closeAllMenus} className={styles.closeBtn} aria-label={t("yopish")}><X size={24} /></button>
        </div>

        <div className={styles.list}>
          {!isAuthenticated || notifications.length === 0 ? (
            <div className={styles.empty}>
              <img src="/icons/no-messages.svg" alt="" width={160} height={160} style={{ marginBottom: 24 }} />
              <h3>{tNotif("empty_title")}</h3>
              <p>{tNotif("empty_desc")}</p>
              <Link href="/profile/notifications" onClick={closeAllMenus}>{t("bildirishnomalarni_boshqarish")}</Link>
            </div>
          ) : (
            notifications.map((n: any) => (
              <div key={n.id} className={`${styles.item} ${n.isRead ? "" : styles.unread}`}>
                <div className={styles.iconBadge}><Bell size={18} /></div>
                <div className={styles.itemBody}>
                  <p className={styles.itemTitle}>{n.title}</p>
                  <p className={styles.itemMsg}>{n.message}</p>
                  <p className={styles.itemTime}>{new Date(n.createdAt).toLocaleString("uz-UZ")}</p>
                </div>
                {!n.isRead && <span className={styles.dot}></span>}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

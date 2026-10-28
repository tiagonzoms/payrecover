import { getDb } from "./db";
import { notifications } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";

export type NotificationType = "payment_recovered" | "campaign_completed" | "payment_failed" | "alert" | "info";

export interface NotificationPayload {
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  read?: boolean;
}

/**
 * Cria uma notificação para um usuário
 */
export async function createNotification(payload: NotificationPayload) {
  const db = await getDb();
  if (!db) {
    console.warn("[Notifications] Database not available");
    return null;
  }

  try {
    const result = await db.insert(notifications).values({
      userId: payload.userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      data: payload.data ?? null,
      read: payload.read || false,
      createdAt: new Date(),
    });

    return result;
  } catch (error) {
    console.error("[Notifications] Failed to create notification:", error);
    return null;
  }
}

/**
 * Obtém notificações de um usuário
 */
export async function getUserNotifications(userId: number, limit: number = 20) {
  const db = await getDb();
  if (!db) {
    console.warn("[Notifications] Database not available");
    return [];
  }

  try {
    const result = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);

    return result.map((n) => ({
      ...n,
      data: n.data ?? {},
    }));
  } catch (error) {
    console.error("[Notifications] Failed to get notifications:", error);
    return [];
  }
}

/**
 * Marca uma notificação como lida
 */
export async function markNotificationAsRead(notificationId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Notifications] Database not available");
    return null;
  }

  try {
    const result = await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, notificationId));

    return result;
  } catch (error) {
    console.error("[Notifications] Failed to mark as read:", error);
    return null;
  }
}

/**
 * Marca todas as notificações de um usuário como lidas
 */
export async function markAllNotificationsAsRead(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Notifications] Database not available");
    return null;
  }

  try {
    const result = await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.userId, userId));

    return result;
  } catch (error) {
    console.error("[Notifications] Failed to mark all as read:", error);
    return null;
  }
}

/**
 * Deleta uma notificação
 */
export async function deleteNotification(notificationId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Notifications] Database not available");
    return null;
  }

  try {
    const result = await db
      .delete(notifications)
      .where(eq(notifications.id, notificationId));

    return result;
  } catch (error) {
    console.error("[Notifications] Failed to delete notification:", error);
    return null;
  }
}

/**
 * Conta notificações não lidas de um usuário
 */
export async function getUnreadNotificationCount(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Notifications] Database not available");
    return 0;
  }

  try {
    const result = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId));

    return result.filter((n) => !n.read).length;
  } catch (error) {
    console.error("[Notifications] Failed to count unread:", error);
    return 0;
  }
}

/**
 * Envia notificação de pagamento recuperado
 */
export async function notifyPaymentRecovered(
  userId: number,
  companyName: string,
  amount: number,
  customerEmail: string
) {
  return createNotification({
    userId,
    type: "payment_recovered",
    title: "Paiement Recuperado! 🎉",
    message: `${companyName} recuperou ${amount}€ de ${customerEmail}`,
    data: {
      companyName,
      amount,
      customerEmail,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Envia notificação de campanha completada
 */
export async function notifyCampaignCompleted(
  userId: number,
  campaignName: string,
  totalRecovered: number,
  successRate: number
) {
  return createNotification({
    userId,
    type: "campaign_completed",
    title: "Campanha Completada! ✅",
    message: `${campaignName} foi completada com ${successRate}% de sucesso, recuperando ${totalRecovered}€`,
    data: {
      campaignName,
      totalRecovered,
      successRate,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Envia notificação de alerta
 */
export async function notifyAlert(
  userId: number,
  title: string,
  message: string,
  data?: Record<string, any>
) {
  return createNotification({
    userId,
    type: "alert",
    title,
    message,
    data,
  });
}

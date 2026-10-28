import { protectedProcedure, router } from "../\_core/trpc";
import { z } from "zod";
import {
  createNotification,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadNotificationCount,
  notifyPaymentRecovered,
  notifyCampaignCompleted,
  notifyAlert,
} from "../notifications";

export const notificationsRouter = router({
  /**
   * Obter notificações do usuário autenticado
   */
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      return await getUserNotifications(ctx.user.id, input.limit);
    }),

  /**
   * Obter contagem de notificações não lidas
   */
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    return await getUnreadNotificationCount(ctx.user.id);
  }),

  /**
   * Marcar notificação como lida
   */
  markAsRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await markNotificationAsRead(input.id);
    }),

  /**
   * Marcar todas as notificações como lidas
   */
  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    return await markAllNotificationsAsRead(ctx.user.id);
  }),

  /**
   * Deletar notificação
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await deleteNotification(input.id);
    }),

  /**
   * Criar notificação de pagamento recuperado
   */
  notifyPaymentRecovered: protectedProcedure
    .input(
      z.object({
        companyName: z.string(),
        amount: z.number(),
        customerEmail: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await notifyPaymentRecovered(
        ctx.user.id,
        input.companyName,
        input.amount,
        input.customerEmail
      );
    }),

  /**
   * Criar notificação de campanha completada
   */
  notifyCampaignCompleted: protectedProcedure
    .input(
      z.object({
        campaignName: z.string(),
        totalRecovered: z.number(),
        successRate: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await notifyCampaignCompleted(
        ctx.user.id,
        input.campaignName,
        input.totalRecovered,
        input.successRate
      );
    }),

  /**
   * Criar notificação de alerta customizado
   */
  sendAlert: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        message: z.string(),
        data: z.record(z.string(), z.any()).optional(),

      })
    )
    .mutation(async ({ ctx, input }) => {
      return await notifyAlert(
        ctx.user.id,
        input.title,
        input.message,
        input.data
      );
    }),
});

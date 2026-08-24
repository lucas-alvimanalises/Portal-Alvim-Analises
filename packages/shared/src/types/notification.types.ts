// Notificação in-app (sino do app mobile) — disparada por eventos reais do
// sistema (ex.: técnico alocado num serviço). Sem e-mail/push nesta fase.
export interface NotificationDto {
  id: string;
  type: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationRequest {
  notificationId: string
  recipient: string
  subject?: string
  message: string
  metadata?: unknown
  organizationId: string
  correlationId?: string
}

export interface NotificationResult {
  success: boolean
  providerMessageId?: string
  errorMessage?: string
}

export interface INotificationProvider {
  readonly channelType: string
  send(request: NotificationRequest): Promise<NotificationResult>
  validateRecipient(recipient: string): boolean
}

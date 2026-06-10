export type NotificationType =
  | 'order_created'
  | 'order_status_changed'
  | 'payment_received'
  | 'product_review'
  | 'seller_message'
  | 'job_application'
  | 'travel_booking'
  | 'system_alert';

export interface NotificationDto {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  icon?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
  read: boolean;
  readAt?: string;
  createdAt: string;
}

export interface SendNotificationRequest {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  icon?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export interface PushTokenDto {
  id: string;
  userId: string;
  platform: 'ios' | 'android';
  token: string;
  userAgent?: string;
  registeredAt: string;
  lastUsedAt?: string;
}

export interface MessageDto {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
  attachments?: {
    url: string;
    type: string;
    size: number;
  }[];
  readAt?: string;
  createdAt: string;
}

export interface SendMessageRequest {
  chatId: string;
  text: string;
  attachments?: string[];
}

export interface ChatDto {
  id: string;
  buyerId: string;
  sellerId: string;
  productId?: string;
  orderId?: string;
  lastMessage?: MessageDto;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

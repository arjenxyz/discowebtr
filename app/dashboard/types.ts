// Ortak Section tipi
export type Section = 'overview' | 'store' | 'transactions' | 'tracking' | 'profile' | 'settings' | 'notifications' | 'mail';
export type Notification = {
  id: string;
  title: string;
  body: string;
  type: 'announcement' | 'mail';
  created_at: string;
  author_name?: string | null;
  author_avatar_url?: string | null;
  is_read?: boolean;
  details_url?: string | null;
  image_url?: string | null;
};

export type MailItem = {
  id: string;
  title: string;
  body: string;
  category: 'announcement' | 'maintenance' | 'sponsor' | 'update' | 'lottery' | 'reward' | string;
  status?: 'published' | 'draft';
  created_at: string;
  author_name?: string | null;
  author_avatar_url?: string | null;
  is_read?: boolean;
};

export type MemberProfile = {
  username: string;
  nickname: string | null;
  displayName: string | null;
  avatarUrl: string;
  roles: Array<{ id: string; name: string; color: number }>;
  about: string | null;
  guildName?: string | null;
  guildIcon?: string | null;
};

export type StoreItem = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  status: 'active' | 'inactive';
  role_id: string | null;
  duration_days: number;
  created_at: string;
};

export type CartItem = {
  itemId: string;
  title: string;
  price: number;
  qty: number;
  appliedDiscount?: {
    id: string;
    code: string;
    percent: number;
    discountAmount: number;
    finalPrice: number;
  } | null;
};

export type Order = {
  id: string;
  amount: number;
  status: 'paid' | 'pending' | 'refunded' | 'failed';
  expires_at?: string | null;
  created_at: string;
  can_refund?: boolean;
  failure_reason?: string | null;
  item_title?: string | null;
  role_id?: string | null;
  duration_days?: number | null;
};

export type OverviewStats = {
  joinedAt: string | null;
  serverMessages: number;
  serverVoiceMinutes: number;
  userMessages: number;
  userVoiceMinutes: number;
};

export type OrderStats = {
  paidTotal: number;
  pendingCount: number;
  refundedCount: number;
  failedCount: number;
  totalCount: number;
};

export type PurchaseFeedback = Record<
  string,
  { status: 'success' | 'error'; message: string } | undefined
>;

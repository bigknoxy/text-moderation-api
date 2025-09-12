export interface ModeratorAction {
  actionId: string;
  userId: string;
  contentId: string;
  actionType: 'approve' | 'reject' | 'review';
  reason?: string;
  timestamp: number;
}

export type AdvisorConversation = {
  family_id: string;
  student_name: string;
  last_message: string | null;
  last_message_at: string | null;
  last_sender_id: string | null;
  unread_count: number;
};

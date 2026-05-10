export const CHAT_BODY_MAX = 2000;
export const CHAT_INITIAL_PAGE = 50;

export type ChatMessage = {
  id: string;
  family_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

"use server";

import { createClient } from "@/lib/supabase/server";
import { assertDefined } from "@/lib/assert";
import { CHAT_BODY_MAX, type ChatMessage } from "@/lib/chat";
import { friendlyError } from "@/lib/errors";

type SendResult =
  | { ok: true; message: ChatMessage }
  | { ok: false; error: string };

type ActionResult = { ok: true } | { ok: false; error: string };

export async function sendChatMessage(
  familyId: string,
  body: string,
): Promise<SendResult> {
  const trimmed = body.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "Mensaje vacío." };
  }
  if (trimmed.length > CHAT_BODY_MAX) {
    return { ok: false, error: "Mensaje demasiado largo." };
  }
  if (!/^[0-9a-f-]{36}$/i.test(familyId)) {
    return { ok: false, error: "Familia inválida." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  assertDefined(user, "user");

  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      family_id: familyId,
      sender_id: user.id,
      body: trimmed,
    })
    .select("id, family_id, sender_id, body, created_at")
    .single();

  if (error || !data) {
    return { ok: false, error: friendlyError(error) };
  }
  return { ok: true, message: data as ChatMessage };
}

export async function markChatSeen(familyId: string): Promise<ActionResult> {
  if (!/^[0-9a-f-]{36}$/i.test(familyId)) {
    return { ok: false, error: "Familia inválida." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  assertDefined(user, "user");

  const { error } = await supabase
    .from("chat_seen")
    .upsert(
      { user_id: user.id, family_id: familyId, last_seen_at: new Date().toISOString() },
      { onConflict: "user_id,family_id" },
    );

  if (error) {
    return { ok: false, error: friendlyError(error) };
  }
  return { ok: true };
}

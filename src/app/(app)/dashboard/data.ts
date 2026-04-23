import type {
  Item,
  CurrentDoc,
  Comment,
} from "@/components/student/ChecklistItem";

type DocRow = {
  id: string;
  checklist_item_id: string;
  filename: string;
  size_bytes: number;
  created_at: string;
  storage_path: string;
};

type CommentRow = {
  id: string;
  checklist_item_id: string;
  author_id: string;
  body: string;
  created_at: string;
};

type ViewRow = {
  checklist_item_id: string;
  last_seen_at: string;
};

export function buildDocByItem(docs: DocRow[]): Map<string, CurrentDoc> {
  const out = new Map<string, CurrentDoc>();
  for (const d of docs) {
    out.set(d.checklist_item_id, {
      id: d.id,
      filename: d.filename,
      size_bytes: d.size_bytes,
      created_at: d.created_at,
      storage_path: d.storage_path,
    });
  }
  return out;
}

export function buildCommentsAndUnread(
  rawComments: CommentRow[],
  views: ViewRow[],
  userId: string,
): {
  commentsByItem: Map<string, Comment[]>;
  unreadByItem: Map<string, number>;
} {
  const lastSeenByItem = new Map<string, string>();
  for (const v of views) lastSeenByItem.set(v.checklist_item_id, v.last_seen_at);

  const commentsByItem = new Map<string, Comment[]>();
  const unreadByItem = new Map<string, number>();

  for (const c of rawComments) {
    const arr = commentsByItem.get(c.checklist_item_id) ?? [];
    arr.push({ id: c.id, body: c.body, created_at: c.created_at });
    commentsByItem.set(c.checklist_item_id, arr);

    if (c.author_id === userId) continue;
    const lastSeen = lastSeenByItem.get(c.checklist_item_id);
    if (lastSeen && new Date(c.created_at) <= new Date(lastSeen)) continue;
    unreadByItem.set(
      c.checklist_item_id,
      (unreadByItem.get(c.checklist_item_id) ?? 0) + 1,
    );
  }

  return { commentsByItem, unreadByItem };
}

export function groupByCategory(items: Item[]): Record<string, Item[]> {
  return items.reduce<Record<string, Item[]>>((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {});
}

export function computeProgress(items: Item[]): {
  total: number;
  done: number;
  pct: number;
} {
  const total = items.length;
  const done = items.filter((i) => i.status === "approved").length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return { total, done, pct };
}

export function findNextAction(
  items: Item[],
  docByItem: Map<string, CurrentDoc>,
): { nextAction: Item | undefined; count: number } {
  const pending = items.filter(
    (i) => i.status !== "approved" && !docByItem.has(i.id),
  );
  return { nextAction: pending[0], count: pending.length };
}

const STALE_MS = 7 * 24 * 60 * 60 * 1000;

export function isStaleSubmitted(item: Item, doc: CurrentDoc | null): boolean {
  if (item.status !== "submitted" || !doc) return false;
  return Date.now() - new Date(doc.created_at).getTime() >= STALE_MS;
}

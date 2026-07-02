"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const MAX_NOTE = 1000;

interface Props {
  matchId: string;
  userId: string;
  initialNote: string | null;
  onSave?: (newNote: string) => void;
}

export default function MatchNoteEditor({ matchId, userId, initialNote, onSave }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(initialNote ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  function handleOpen() {
    setDraft(initialNote ?? "");
    setMessage(null);
    setOpen(true);
  }

  function handleClose() {
    setDraft(initialNote ?? "");
    setMessage(null);
    setOpen(false);
  }

  async function handleSave() {
    if (draft.length > MAX_NOTE) return;
    setSaving(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.from("match_notes").upsert(
      {
        match_id: matchId,
        user_id: userId,
        note: draft.trim(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "match_id,user_id" }
    );
    if (error) {
      setMessage({ type: "error", text: "儲存備註失敗，請稍後再試" });
    } else {
      setMessage({ type: "success", text: "備註已儲存" });
      onSave?.(draft.trim());
      setOpen(false);
    }
    setSaving(false);
  }

  if (!open) {
    return (
      <div className="mt-1">
        {initialNote && (
          <p className="mb-0.5 text-xs text-slate-500">
            📝 {initialNote.slice(0, 60)}
            {initialNote.length > 60 ? "…" : ""}
          </p>
        )}
        <button
          onClick={handleOpen}
          className="text-xs text-slate-500 transition-colors hover:text-slate-300"
        >
          {initialNote ? "✏️ 編輯備註" : "+ 新增備註"}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-lg border border-slate-700 bg-slate-800/50 p-3">
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        maxLength={MAX_NOTE}
        rows={3}
        placeholder="記錄對這場對局的想法…"
        className="w-full resize-none rounded bg-slate-900 px-2 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-indigo-500"
      />
      <div className="mt-1 flex items-center justify-between gap-2">
        <span className="text-xs text-slate-600">
          {draft.length}/{MAX_NOTE}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setDraft("")}
            className="text-xs text-slate-500 transition-colors hover:text-slate-300"
          >
            清空
          </button>
          <button
            onClick={handleClose}
            className="rounded px-2 py-0.5 text-xs text-slate-400 transition-colors hover:text-white"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving || draft.length > MAX_NOTE}
            className="rounded bg-indigo-600 px-2 py-0.5 text-xs font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
          >
            {saving ? "…" : "儲存"}
          </button>
        </div>
      </div>
      {message && (
        <p
          className={`mt-1 text-xs ${message.type === "error" ? "text-red-400" : "text-green-400"}`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}

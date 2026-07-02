"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MAX_BIO = 160;

interface Props {
  userId: string;
  currentBio: string | null;
}

export default function BioEditor({ userId, currentBio }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(currentBio ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  function startEdit() {
    setDraft(currentBio ?? "");
    setMessage(null);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setMessage(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (draft.length > MAX_BIO) return;
    setSaving(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ bio: draft.trim() || null, updated_at: new Date().toISOString() })
      .eq("id", userId);
    if (error) {
      setMessage({ type: "error", text: "更新個人資料失敗，請稍後再試" });
    } else {
      setMessage({ type: "success", text: "個人資料已更新" });
      setEditing(false);
      router.refresh();
    }
    setSaving(false);
  }

  if (!editing) {
    return (
      <div className="mt-3">
        {currentBio ? (
          <p className="whitespace-pre-line text-sm text-slate-300">{currentBio}</p>
        ) : (
          <p className="text-sm text-slate-500">還沒有個人簡介</p>
        )}
        <button
          onClick={startEdit}
          className="mt-2 rounded-md px-2.5 py-1 text-xs text-indigo-400 ring-1 ring-indigo-700 transition-colors hover:bg-indigo-900/40"
        >
          {currentBio ? "編輯簡介" : "新增簡介"}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="mt-3">
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={3}
        maxLength={MAX_BIO}
        placeholder="介紹自己，最多 160 字…"
        className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
      />
      <div className="mt-1 flex items-center justify-between">
        <span
          className={`text-xs ${draft.length > MAX_BIO ? "text-red-400" : "text-slate-600"}`}
        >
          {draft.length}/{MAX_BIO}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={cancelEdit}
            className="rounded-lg px-3 py-1.5 text-xs text-slate-400 transition-colors hover:text-white"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={saving || draft.length > MAX_BIO}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
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
    </form>
  );
}

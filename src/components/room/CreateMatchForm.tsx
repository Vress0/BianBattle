"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface CreateMatchFormProps {
  mode: "debate" | "banter";
  currentUserId: string | null;
}

export default function CreateMatchForm({ mode, currentUserId }: CreateMatchFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDebate = mode === "debate";
  const btnCls = isDebate
    ? "bg-indigo-600 hover:bg-indigo-500"
    : "bg-amber-600 hover:bg-amber-500";
  const inputFocusCls = isDebate
    ? "focus:border-indigo-500 focus:ring-indigo-500"
    : "focus:border-amber-500 focus:ring-amber-500";
  const titlePlaceholder = isDebate
    ? "e.g. 正式辯論：AI 與司法"
    : "e.g. 貓咪 vs 狗狗誰更棒？";
  const topicPlaceholder = isDebate
    ? "e.g. AI 應取代人類法官嗎？"
    : "e.g. 貓咪還是狗狗？";

  if (!currentUserId) {
    return (
      <Link
        href="/auth/login"
        className={`rounded-lg px-4 py-1.5 text-sm font-medium ${
          isDebate ? "text-indigo-400 ring-1 ring-indigo-700" : "text-amber-400 ring-1 ring-amber-700"
        } transition-colors hover:bg-slate-800`}
      >
        登入後建立房間
      </Link>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={`rounded-lg px-4 py-1.5 text-sm font-semibold text-white transition-colors ${btnCls}`}
      >
        + 建立房間
      </button>
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error: createErr } = await supabase
      .from("matches")
      .insert({
        title: title.trim(),
        topic: topic.trim() || null,
        mode,
        format: "1v1",
        created_by: currentUserId,
      })
      .select("id")
      .single();

    if (createErr || !data) {
      setError("建立失敗，請稍後再試。");
      setLoading(false);
      return;
    }

    router.push(`/matches/${data.id}`);
  }

  return (
    <form
      onSubmit={handleCreate}
      className="w-full rounded-xl border border-slate-800 bg-slate-900 p-4 sm:max-w-sm"
    >
      <p className="mb-3 text-sm font-semibold text-white">建立新房間</p>
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-slate-400" htmlFor="match-title">
            房間名稱 *
          </label>
          <input
            id="match-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder={titlePlaceholder}
            maxLength={60}
            className={`w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:ring-1 ${inputFocusCls}`}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400" htmlFor="match-topic">
            辯題（選填）
          </label>
          <input
            id="match-topic"
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={topicPlaceholder}
            maxLength={120}
            className={`w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:ring-1 ${inputFocusCls}`}
          />
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${btnCls}`}
          >
            {loading ? "建立中…" : "建立房間"}
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setError(null);
            }}
            className="rounded-lg px-3 py-1.5 text-sm text-slate-400 transition-colors hover:text-white"
          >
            取消
          </button>
        </div>
      </div>
    </form>
  );
}

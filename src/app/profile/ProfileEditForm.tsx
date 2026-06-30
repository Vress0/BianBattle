"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

interface ProfileEditFormProps {
  userId: string;
  currentNickname: string | null;
}

export default function ProfileEditForm({ userId, currentNickname }: ProfileEditFormProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState(currentNickname ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  function startEdit() {
    setNickname(currentNickname ?? "");
    setMessage(null);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setMessage(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!USERNAME_RE.test(nickname)) {
      setMessage({ type: "error", text: "用戶名只能使用英文、數字、底線，長度 3～20 字元。" });
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ nickname, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (error) {
      if (error.code === "23505") {
        setMessage({ type: "error", text: "此用戶名已被使用，請換一個。" });
      } else {
        setMessage({ type: "error", text: "儲存失敗，請稍後再試。" });
      }
    } else {
      setMessage({ type: "success", text: "用戶名已更新！" });
      setEditing(false);
      router.refresh();
    }

    setLoading(false);
  }

  if (!editing) {
    return (
      <div className="mt-3 flex items-center gap-3">
        <span className="text-sm text-slate-400">
          用戶名：
          <span className="ml-1 font-medium text-white">
            {currentNickname ?? <span className="italic text-slate-500">尚未設定</span>}
          </span>
        </span>
        <button
          onClick={startEdit}
          className="rounded-md px-2.5 py-1 text-xs text-indigo-400 ring-1 ring-indigo-700 transition-colors hover:bg-indigo-900/40"
        >
          修改
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="mt-3">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          required
          minLength={3}
          maxLength={20}
          placeholder="英文、數字、底線，3～20 字元"
          className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          autoFocus
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
        >
          {loading ? "…" : "儲存"}
        </button>
        <button
          type="button"
          onClick={cancelEdit}
          className="rounded-lg px-3 py-1.5 text-sm text-slate-400 transition-colors hover:text-white"
        >
          取消
        </button>
      </div>
      {message && (
        <p
          className={`mt-2 text-xs ${
            message.type === "error" ? "text-red-400" : "text-green-400"
          }`}
        >
          {message.text}
        </p>
      )}
    </form>
  );
}

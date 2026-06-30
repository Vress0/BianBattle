"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

export default function RecoverPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newCode, setNewCode] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!USERNAME_RE.test(username.trim())) {
      setError("用戶名格式不正確。");
      return;
    }

    if (!recoveryCode.trim()) {
      setError("請輸入恢復代碼。");
      return;
    }

    if (newPassword.length < 6) {
      setError("新密碼至少需要 6 個字元。");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("兩次密碼不一致，請重新確認。");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/auth/recover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: username.trim(),
        recoveryCode: recoveryCode.trim(),
        newPassword,
      }),
    });

    const data = await res.json().catch(() => ({})) as { ok?: boolean; error?: string; recoveryCode?: string };

    if (!res.ok || !data.ok) {
      setError(data.error ?? "重設失敗，請稍後再試。");
    } else {
      setNewCode(data.recoveryCode ?? null);
    }

    setLoading(false);
  }

  if (newCode) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <div className="w-full max-w-sm">
          <div className="mb-6 text-center">
            <Link href="/" className="text-2xl font-bold text-white">
              Bian<span className="text-indigo-400">Battle</span>
            </Link>
          </div>
          <div className="rounded-2xl border border-yellow-700/60 bg-slate-900 p-6">
            <div className="mb-4 flex items-center gap-2">
              <span className="text-2xl">🔑</span>
              <h2 className="text-lg font-bold text-white">密碼已重設！</h2>
            </div>
            <p className="mb-3 text-sm text-slate-300">
              這是你的<span className="font-semibold text-yellow-400">新恢復代碼</span>，請妥善保存。
              <span className="font-semibold text-white">系統不會再次顯示。</span>
            </p>
            <pre className="mb-4 select-all rounded-xl bg-slate-800 px-4 py-3 text-center font-mono text-lg font-bold tracking-widest text-yellow-300">
              {newCode}
            </pre>
            <ul className="mb-5 space-y-1 text-xs text-slate-400">
              <li>• 請截圖或手動抄下這組代碼</li>
              <li>• 舊恢復代碼已失效</li>
              <li>• 不要分享給任何人</li>
            </ul>
            <button
              onClick={() => router.push("/auth/login")}
              className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
            >
              我已保存，回登入頁
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-bold text-white">
            Bian<span className="text-indigo-400">Battle</span>
          </Link>
          <p className="mt-2 text-slate-400">重設密碼</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm text-slate-300" htmlFor="rec-username">
                用戶名
              </label>
              <input
                id="rec-username"
                name="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="輸入你的用戶名"
                autoComplete="username"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-slate-300" htmlFor="rec-code">
                恢復代碼
              </label>
              <input
                id="rec-code"
                name="recoveryCode"
                type="text"
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value)}
                required
                placeholder="BB-XXXX-XXXX-XXXX-XXXX"
                autoComplete="off"
                spellCheck={false}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 font-mono text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-slate-300" htmlFor="rec-new-password">
                新密碼
              </label>
              <input
                id="rec-new-password"
                name="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="至少 6 個字元"
                minLength={6}
                autoComplete="new-password"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-slate-300" htmlFor="rec-confirm">
                確認新密碼
              </label>
              <input
                id="rec-confirm"
                name="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="再次輸入新密碼"
                minLength={6}
                autoComplete="new-password"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-900/40 px-3 py-2 text-sm text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
            >
              {loading ? "驗證中…" : "重設密碼"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-slate-400">
            <Link href="/auth/login" className="text-indigo-400 hover:underline">
              返回登入
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

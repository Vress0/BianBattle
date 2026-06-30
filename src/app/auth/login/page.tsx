"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
const LS_KEY = "bianbattle_remembered_username";

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);

  // Login state — initialize username from localStorage if available
  const [loginUsername, setLoginUsername] = useState(() => {
    if (typeof window === "undefined") return "";
    try { return localStorage.getItem(LS_KEY) ?? ""; } catch { return ""; }
  });
  const [loginPassword, setLoginPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  // Register state
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");

  const recoveryCodeRef = useRef<HTMLPreElement>(null);

  function switchMode() {
    setIsRegister((v) => !v);
    setMessage(null);
    setRecoveryCode(null);
    setLoginPassword("");
    setRegUsername("");
    setRegPassword("");
    setRegConfirm("");
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      if (rememberMe) {
        localStorage.setItem(LS_KEY, loginUsername.trim());
      } else {
        localStorage.removeItem(LS_KEY);
      }
    } catch {
      // localStorage unavailable
    }

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: loginUsername.trim(), password: loginPassword }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage({
        type: "error",
        text: (data as { error?: string }).error ?? "登入失敗，請稍後再試。",
      });
    } else {
      router.push("/profile");
      router.refresh();
    }

    setLoading(false);
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!USERNAME_RE.test(regUsername)) {
      setMessage({ type: "error", text: "用戶名只能使用英文、數字、底線，長度 3～20 字元。" });
      return;
    }

    if (regPassword.length < 6) {
      setMessage({ type: "error", text: "密碼至少需要 6 個字元。" });
      return;
    }

    if (regPassword !== regConfirm) {
      setMessage({ type: "error", text: "兩次密碼不一致，請重新確認。" });
      return;
    }

    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: regUsername.trim(), password: regPassword }),
    });

    const data = await res.json().catch(() => ({})) as { ok?: boolean; error?: string; recoveryCode?: string };

    if (!res.ok || !data.ok) {
      setMessage({ type: "error", text: data.error ?? "帳號建立失敗，請稍後再試。" });
    } else {
      setRecoveryCode(data.recoveryCode ?? null);
      router.refresh();
    }

    setLoading(false);
  }

  function handleSavedCode() {
    router.push("/profile");
    router.refresh();
  }

  // Post-registration: show recovery code
  if (recoveryCode) {
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
              <h2 className="text-lg font-bold text-white">帳號建立成功！</h2>
            </div>
            <p className="mb-3 text-sm text-slate-300">
              這是你的<span className="font-semibold text-yellow-400">恢復代碼</span>，請妥善保存。
              忘記密碼時需要使用它，<span className="font-semibold text-white">系統不會再次顯示。</span>
            </p>
            <pre
              ref={recoveryCodeRef}
              className="mb-4 select-all rounded-xl bg-slate-800 px-4 py-3 text-center font-mono text-lg font-bold tracking-widest text-yellow-300"
            >
              {recoveryCode}
            </pre>
            <ul className="mb-5 space-y-1 text-xs text-slate-400">
              <li>• 請截圖或手動抄下這組代碼</li>
              <li>• 存放在安全的地方（密碼管理器、紙本）</li>
              <li>• 不要分享給任何人</li>
            </ul>
            <button
              onClick={handleSavedCode}
              className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
            >
              我已保存，進入個人資料
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
          <p className="mt-2 text-slate-400">
            {isRegister ? "建立帳號，開始辯論之旅" : "登入以繼續對戰"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          {isRegister ? (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm text-slate-300" htmlFor="reg-username">
                  用戶名
                </label>
                <input
                  id="reg-username"
                  name="username"
                  type="text"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  required
                  placeholder="例：debate_master"
                  minLength={3}
                  maxLength={20}
                  autoComplete="username"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                <p className="mt-1 text-xs text-slate-500">
                  3～20 字元，只能使用英文、數字、底線
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-slate-300" htmlFor="reg-password">
                  密碼
                </label>
                <input
                  id="reg-password"
                  name="password"
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                  placeholder="至少 6 個字元"
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-slate-300" htmlFor="reg-confirm">
                  確認密碼
                </label>
                <input
                  id="reg-confirm"
                  name="confirmPassword"
                  type="password"
                  value={regConfirm}
                  onChange={(e) => setRegConfirm(e.target.value)}
                  required
                  placeholder="再次輸入密碼"
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {message && (
                <p className="rounded-lg bg-red-900/40 px-3 py-2 text-sm text-red-400">
                  {message.text}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
              >
                {loading ? "建立中…" : "建立帳號"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm text-slate-300" htmlFor="login-username">
                  用戶名
                </label>
                <input
                  id="login-username"
                  name="username"
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  required
                  placeholder="輸入用戶名"
                  autoComplete="username"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-sm text-slate-300" htmlFor="login-password">
                    密碼
                  </label>
                  <Link href="/auth/recover" className="text-xs text-indigo-400 hover:underline">
                    忘記密碼？
                  </Link>
                </div>
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  placeholder="輸入密碼"
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-400">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-600 bg-slate-800 text-indigo-500"
                />
                記住我的用戶名
              </label>

              {message && (
                <p className="rounded-lg bg-red-900/40 px-3 py-2 text-sm text-red-400">
                  {message.text}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
              >
                {loading ? "處理中…" : "登入"}
              </button>
            </form>
          )}

          <p className="mt-4 text-center text-sm text-slate-400">
            {isRegister ? "已有帳號？" : "還沒有帳號？"}
            <button
              type="button"
              onClick={switchMode}
              className="ml-1 text-indigo-400 hover:underline"
            >
              {isRegister ? "前往登入" : "免費註冊"}
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

function translateError(msg: string): string {
  if (msg.includes("Invalid login credentials")) return "帳號或密碼錯誤，請再試一次。";
  if (msg.includes("Email not confirmed")) return "信箱尚未驗證，請先點擊驗證信中的連結。";
  if (msg.includes("already registered") || msg.includes("already been registered"))
    return "此信箱已註冊，請直接登入。";
  if (msg.includes("Password should be")) return "密碼至少需要 6 個字元。";
  return msg;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  function switchMode() {
    setIsRegister((v) => !v);
    setMessage(null);
    setUsername("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (isRegister && !USERNAME_RE.test(username)) {
      setMessage({
        type: "error",
        text: "用戶名只能使用英文、數字、底線，長度 3～20 字元。",
      });
      return;
    }

    setLoading(true);
    const supabase = createClient();

    if (isRegister) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { nickname: username },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setMessage({ type: "error", text: translateError(error.message) });
      } else {
        setMessage({
          type: "success",
          text: "帳號建立成功！請確認信箱，點擊驗證連結後即可登入。",
        });
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage({ type: "error", text: translateError(error.message) });
      } else {
        router.push("/profile");
        router.refresh();
      }
    }

    setLoading(false);
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
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="mb-1.5 block text-sm text-slate-300" htmlFor="username">
                  用戶名
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="例：debate_master"
                  minLength={3}
                  maxLength={20}
                  pattern="[a-zA-Z0-9_]+"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                <p className="mt-1 text-xs text-slate-500">
                  3～20 字元，只能使用英文、數字、底線
                </p>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm text-slate-300" htmlFor="email">
                {isRegister ? "Email" : "帳號信箱"}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-slate-300" htmlFor="password">
                密碼
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="至少 6 個字元"
                minLength={6}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {message && (
              <p
                className={`rounded-lg px-3 py-2 text-sm ${
                  message.type === "error"
                    ? "bg-red-900/40 text-red-400"
                    : "bg-green-900/40 text-green-400"
                }`}
              >
                {message.text}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
            >
              {loading ? "處理中…" : isRegister ? "建立帳號" : "登入"}
            </button>
          </form>

          {/* Google login — TODO: enable once OAuth configured */}
          {/* <button className="mt-3 w-full rounded-lg border border-slate-700 py-2 text-sm text-slate-300 hover:bg-slate-800">
            使用 Google 登入
          </button> */}

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

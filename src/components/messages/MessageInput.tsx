"use client";

import { useState } from "react";

interface Props {
  onSend: (body: string) => void;
  disabled?: boolean;
  error?: string | null;
}

export default function MessageInput({ onSend, disabled, error }: Props) {
  const [text, setText] = useState("");

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function submit() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
  }

  return (
    <div className="border-t border-slate-800 bg-slate-950 p-3">
      {error && <p className="mb-2 text-xs text-red-400">{error}</p>}
      <div className="flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="輸入訊息… (Enter 送出，Shift+Enter 換行)"
          rows={1}
          maxLength={1000}
          className="flex-1 resize-none rounded-xl bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
          style={{ minHeight: "42px", maxHeight: "120px" }}
        />
        <button
          onClick={submit}
          disabled={!text.trim() || disabled}
          className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-40"
        >
          送出
        </button>
      </div>
      <p className="mt-1 text-right text-[11px] text-slate-600">{text.length}/1000</p>
    </div>
  );
}

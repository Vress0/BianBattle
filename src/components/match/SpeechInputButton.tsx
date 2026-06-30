"use client";

import { useState, useRef, useEffect } from "react";

// Minimal TypeScript declarations for Web Speech API
interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: { transcript: string };
    };
  };
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: Event & { error: string }) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

interface SpeechInputButtonProps {
  // Only sends the NEW final transcript fragment — parent appends with functional update
  onAppendTranscript: (text: string) => void;
  // Parent tracks interim text (for display + clearing on send)
  onInterimTranscriptChange?: (text: string) => void;
  disabled?: boolean;
}

// Combined mount state — null on both server and client first render → consistent hydration
type MountState = { isSupported: boolean } | null;

export default function SpeechInputButton({
  onAppendTranscript,
  onInterimTranscriptChange,
  disabled,
}: SpeechInputButtonProps) {
  const [mountState, setMountState] = useState<MountState>(null);
  const [listening, setListening] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  // Dedup guard — prevents the same final phrase being appended twice
  const lastFinalTextRef = useRef("");

  // Detect browser support after hydration. setState must be inside a callback
  // to satisfy react-hooks/set-state-in-effect.
  useEffect(() => {
    const w = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const supported = Boolean(w.SpeechRecognition ?? w.webkitSpeechRecognition);
    const id = setTimeout(() => {
      setMountState({ isSupported: supported });
    }, 0);
    return () => clearTimeout(id);
  }, []);

  // Abort on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  // Stop recognition when externally disabled (e.g., message send in flight).
  // Only calls rec.stop() — no setState in effect body; setListening(false) happens via onend.
  useEffect(() => {
    if (disabled !== true || !listening) return;
    const rec = recognitionRef.current;
    if (rec) {
      rec.stop();
      recognitionRef.current = null;
    }
  }, [disabled, listening]);

  const mounted = mountState !== null;
  const isSupported = mountState?.isSupported ?? false;

  function getSR(): SpeechRecognitionConstructor | null {
    const w = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
  }

  function startListening() {
    const SR = getSR();
    if (!SR) return;
    setPermissionError(null);
    lastFinalTextRef.current = ""; // clear dedup on each new session

    const recognition = new SR();
    recognition.lang = "zh-TW";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognitionRef.current = recognition;

    recognition.onresult = (e: SpeechRecognitionEventLike) => {
      let interimText = "";
      let finalText = "";

      // Start from e.resultIndex — only process NEW results since last event
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0]?.transcript ?? "";
        if (e.results[i].isFinal) {
          finalText += transcript;
        } else {
          interimText += transcript;
        }
      }

      if (interimText.trim()) {
        onInterimTranscriptChange?.(interimText.trim());
      }

      if (finalText.trim()) {
        const cleanedFinal = finalText.trim();
        // Always clear interim when final text arrives
        onInterimTranscriptChange?.("");
        // Dedup: skip if same phrase was just appended
        if (cleanedFinal !== lastFinalTextRef.current) {
          lastFinalTextRef.current = cleanedFinal;
          onAppendTranscript(cleanedFinal);
        }
      }
    };

    recognition.onerror = (e: Event & { error: string }) => {
      if (e.error === "not-allowed" || e.error === "permission-denied") {
        setPermissionError("麥克風權限被拒絕，請在瀏覽器設定中允許麥克風存取。");
      } else if (e.error !== "aborted" && e.error !== "no-speech") {
        setPermissionError("語音辨識錯誤，請再試一次。");
        console.warn("[SpeechInput] error:", e.error);
      }
      setListening(false);
      onInterimTranscriptChange?.("");
    };

    recognition.onend = () => {
      setListening(false);
      onInterimTranscriptChange?.("");
    };

    try {
      recognition.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }

  function stopListening() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
    onInterimTranscriptChange?.("");
  }

  function handleClick() {
    if (listening) stopListening();
    else startListening();
  }

  // Consistent title — same on server and client first render (both have mounted=false)
  const title = !mounted
    ? "正在檢查語音輸入支援"
    : !isSupported
      ? "此瀏覽器不支援語音輸入，建議使用 Chrome 或 Safari"
      : listening
        ? "停止語音輸入"
        : "語音輸入（中文）";

  // Always boolean — never undefined
  const isDisabled = !mounted || !isSupported || disabled === true;

  // Single render path — no early-return branch that differs server vs client
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isDisabled}
        title={title}
        className={`shrink-0 rounded-lg px-3 py-2 text-sm transition-colors disabled:opacity-50 ${
          listening
            ? "animate-pulse bg-red-700 text-white hover:bg-red-600"
            : "border border-slate-700 bg-slate-800 text-slate-300 hover:border-indigo-600 hover:text-white"
        }`}
      >
        {listening ? "⏹ 停止" : "🎙️"}
      </button>

      {mounted && !isSupported && (
        <p className="text-xs text-slate-500">不支援語音輸入，請用 Chrome 或 Safari</p>
      )}

      {permissionError && (
        <p className="text-xs text-red-400">{permissionError}</p>
      )}
    </div>
  );
}

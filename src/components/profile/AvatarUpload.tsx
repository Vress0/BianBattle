"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/ui/Avatar";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_SIZE = 2 * 1024 * 1024;

interface Props {
  userId: string;
  currentAvatarUrl: string | null;
  displayName: string;
}

export default function AvatarUpload({ userId, currentAvatarUrl, displayName }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [localUrl, setLocalUrl] = useState(currentAvatarUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("僅支援 PNG、JPG、WebP 格式");
      return;
    }
    if (file.size > MAX_SIZE) {
      setError("圖片大小不得超過 2MB");
      return;
    }

    setUploading(true);

    const supabase = createClient();
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${userId}/${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadErr) {
      setError("頭像上傳失敗，請稍後再試");
      setUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);

    const { error: updateErr } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (updateErr) {
      setError("更新頭像失敗，請稍後再試");
    } else {
      setLocalUrl(publicUrl);
      router.refresh();
    }

    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <Avatar src={localUrl} name={displayName} size="lg" />
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
            <span className="text-xs text-white">…</span>
          </div>
        )}
      </div>
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-400 transition-colors hover:bg-slate-800 hover:text-white disabled:opacity-50"
      >
        {uploading ? "上傳中…" : "更換頭像"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

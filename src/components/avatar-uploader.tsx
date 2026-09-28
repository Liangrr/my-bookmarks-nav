"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface AvatarUploaderProps {
  userId: string;
  avatarUrl: string | null;
  displayName: string;
  onAvatarChange: (url: string | null) => void;
}

const btnStyle: React.CSSProperties = {
  fontSize: "12px",
  padding: "6px 12px",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--border)",
  background: "var(--bg-card)",
  color: "var(--text-secondary)",
  cursor: "pointer",
  fontFamily: "inherit",
  transition: "var(--transition)",
  whiteSpace: "nowrap",
};

/**
 * 头像上传：文件 -> Supabase Storage(avatars/{uid}/) -> publicUrl
 * 每次上传会先清理该用户旧头像，保证目录下只有一张。
 */
export function AvatarUploader({
  userId,
  avatarUrl,
  displayName,
  onAvatarChange,
}: AvatarUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const removeOldAvatars = async () => {
    const supabase = createClient();
    const { data: list } = await supabase.storage.from("avatars").list(userId);
    if (list && list.length) {
      await supabase.storage
        .from("avatars")
        .remove(list.map((f) => `${userId}/${f.name}`));
    }
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("只支持图片文件（png/jpg/webp/gif）");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("图片大小不能超过 5MB");
      return;
    }
    setError("");
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${userId}/${Date.now()}.${ext}`;
      const supabase = createClient();
      await removeOldAvatars();
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { cacheControl: "3600" });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      onAvatarChange(data.publicUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "上传失败，请重试");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    setUploading(true);
    setError("");
    try {
      await removeOldAvatars();
      onAvatarChange(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "移除失败，请重试");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
      <div style={{ position: "relative", flexShrink: 0 }}>
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt="头像"
            width={48}
            height={48}
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              objectFit: "cover",
              border: "1px solid var(--border)",
            }}
          />
        ) : (
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
              fontWeight: "700",
              background: "var(--accent)",
              color: "white",
            }}
          >
            {displayName}
          </div>
        )}
        {uploading && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: "rgba(0, 0, 0, 0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "11px",
              color: "white",
            }}
          >
            上传中
          </div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          style={{ ...btnStyle, opacity: uploading ? "0.6" : "1" }}
        >
          更换头像
        </button>
        {avatarUrl && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={uploading}
            style={{ ...btnStyle, color: "#ef4444", opacity: uploading ? "0.6" : "1" }}
          >
            移除头像
          </button>
        )}
        {error && (
          <span style={{ fontSize: "12px", color: "#ef4444" }}>{error}</span>
        )}
      </div>
    </div>
  );
}

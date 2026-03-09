"use client";

import { useRef, useState } from "react";

interface UploadZoneProps {
  onFile: (file: File) => void;
  preview: string | null;
}

export default function UploadZone({ onFile, preview }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (file: File) => {
    if (file.type.startsWith("image/")) onFile(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div
      className="w-full max-w-md mx-auto rounded-2xl border-2 border-dashed transition-colors cursor-pointer overflow-hidden"
      style={{
        borderColor: dragging ? "#c6dbe4" : "#673F27",
        backgroundColor: dragging ? "#c6dbe4/10" : "transparent",
        minHeight: "200px",
      }}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      {preview ? (
        <img
          src={preview}
          alt="preview"
          className="w-full h-full object-cover rounded-2xl"
          style={{ maxHeight: "300px" }}
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 p-10 h-full">
          <div className="text-4xl">📷</div>
          <p
            className="text-[#673F27]/60 text-sm text-center"
            style={{ fontFamily: "var(--font-inter), sans-serif" }}
          >
            drag & drop a craft photo, or click to upload
          </p>
        </div>
      )}
    </div>
  );
}

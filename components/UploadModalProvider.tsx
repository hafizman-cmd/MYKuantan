"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
} from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { supabase, SUPABASE_PHOTOS_TABLE } from "@/lib/supabase";
import { KUANTAN_LOCATIONS, getCoordinatesByName } from "@/lib/locations";
import { toTitleCase } from "@/lib/format";

interface UploadModalContextValue {
  open: () => void;
  close: () => void;
  isOpen: boolean;
}

const UploadModalContext = createContext<UploadModalContextValue | null>(null);

export function useUploadModal(): UploadModalContextValue {
  const ctx = useContext(UploadModalContext);
  if (!ctx) {
    throw new Error("useUploadModal must be used within an UploadModalProvider");
  }
  return ctx;
}

const SUPABASE_STORAGE_BUCKET = "kuantan-photos";
const COMPRESS_MAX_DIM = 1920;
const COMPRESS_QUALITY = 0.8;

type Status = "idle" | "compressing" | "submitting" | "success" | "error";

async function compressImage(
  file: File,
  maxDim: number = COMPRESS_MAX_DIM,
  quality: number = COMPRESS_QUALITY
): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;

  let targetW = width;
  let targetH = height;
  if (width > maxDim || height > maxDim) {
    if (width >= height) {
      targetW = maxDim;
      targetH = Math.round((height / width) * maxDim);
    } else {
      targetH = maxDim;
      targetW = Math.round((width / height) * maxDim);
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close?.();
    throw new Error("Canvas 2D context unavailable");
  }
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  bitmap.close?.();

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Canvas toBlob failed"))),
      "image/jpeg",
      quality
    );
  });
  if (!blob || blob.size === 0) {
    throw new Error("Compression produced an empty blob");
  }
  const baseName = file.name.replace(/\.[^.]+$/, "");
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
}

export default function UploadModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photographer, setPhotographer] = useState("");
  const [location, setLocation] = useState("");
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [caption, setCaption] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  const revokePreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, []);

  const open = useCallback(() => setIsOpen(true), []);

  const close = useCallback(() => {
    setIsOpen(false);
    setStatus("idle");
    setErrorMsg(null);
    revokePreview();
    setPreviewUrl(null);
    setFile(null);
  }, [revokePreview]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, close]);

  useEffect(() => {
    return () => {
      revokePreview();
    };
  }, [revokePreview]);

  const resetForm = () => {
    revokePreview();
    setPreviewUrl(null);
    setFile(null);
    setPhotographer("");
    setLocation("");
    setCoords(null);
    setCaption("");
    setStatus("idle");
    setErrorMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setErrorMsg("Please select an image file.");
      setStatus("error");
      return;
    }
    setErrorMsg(null);
    setStatus("idle");
    setFile(f);

    revokePreview();
    const preview = URL.createObjectURL(f);
    previewUrlRef.current = preview;
    setPreviewUrl(preview);
  };

  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0] ?? null);
  };

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files?.[0] ?? null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErrorMsg("Add an image first.");
      setStatus("error");
      return;
    }
    if (!photographer.trim() || !location.trim()) {
      setErrorMsg("Photographer and location are required.");
      setStatus("error");
      return;
    }

    setStatus("compressing");
    setErrorMsg(null);

    try {
      const compressed = await compressImage(file, COMPRESS_MAX_DIM, COMPRESS_QUALITY);

      setStatus("submitting");

      const baseName = compressed.name.replace(/\.[^.]+$/, "");
      const filePath = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${baseName}.jpg`;

      const { error: upErr } = await supabase.storage
        .from(SUPABASE_STORAGE_BUCKET)
        .upload(filePath, compressed, {
          contentType: "image/jpeg",
          cacheControl: "3600",
          upsert: false,
        });

      if (upErr) throw upErr;

      const { data } = supabase.storage
        .from(SUPABASE_STORAGE_BUCKET)
        .getPublicUrl(filePath);
      const image_url = data.publicUrl;

      const { error: insertErr } = await supabase
        .from(SUPABASE_PHOTOS_TABLE)
        .insert({
          image_url,
          photographer: toTitleCase(photographer),
          location: location.trim(),
          caption: caption.trim(),
          latitude: coords ? coords[0] : null,
          longitude: coords ? coords[1] : null,
          status: "pending",
        });

      if (insertErr) throw insertErr;

      setStatus("success");
      resetForm();
      window.setTimeout(() => close(), 1400);
    } catch (err) {
      console.error("upload error", err);
      setErrorMsg(
        err instanceof Error ? err.message : "Upload failed. Please try again."
      );
      setStatus("error");
    }
  };

  const submitLabel =
    status === "compressing"
      ? "Optimizing..."
      : status === "submitting"
        ? "Uploading..."
        : status === "success"
          ? "Submitted"
          : "Publish Frame";

  return (
    <UploadModalContext.Provider value={{ open, close, isOpen }}>
      {children}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6"
            role="dialog"
            aria-modal="true"
            aria-label="Submit a photo"
          >
            <button
              type="button"
              aria-label="Close dialog"
              onClick={close}
              className="absolute inset-0 bg-[#0F3460]/60 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem] bg-[#F5F0E8] shadow-[0_24px_80px_rgba(15,52,96,0.35)] border border-stone-900/5"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between px-7 md:px-10 py-5 bg-[#F5F0E8]/95 backdrop-blur-md border-b border-stone-900/5">
                <div>
                  <span className="block text-[10px] uppercase tracking-[0.3em] text-[#0F3460] font-semibold mb-1">
                    Contribute
                  </span>
                  <h2 className="font-display text-stone-900 text-2xl md:text-3xl font-extrabold leading-none">
                    Submit a Frame
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close"
                  className="rounded-full w-9 h-9 flex items-center justify-center text-stone-500 hover:text-stone-900 hover:bg-stone-900/5 transition-colors"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="px-7 md:px-10 py-7 md:py-9 flex flex-col gap-6">
                <label
                  onDragOver={(e: DragEvent<HTMLLabelElement>) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                  className={`relative w-full rounded-[1.5rem] border-2 border-dashed transition-colors duration-300 cursor-pointer overflow-hidden ${
                    dragging
                      ? "border-[#0F3460] bg-[#0F3460]/5"
                      : "border-stone-300 hover:border-[#0F3460]/60 bg-white/50"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={onInputChange}
                    className="sr-only"
                  />

                  {previewUrl ? (
                    <div className="relative w-full aspect-[16/10]">
                      <Image
                        src={previewUrl}
                        alt="Selected preview"
                        fill
                        sizes="(max-width: 768px) 100vw, 640px"
                        className="object-cover"
                        unoptimized
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <span className="absolute left-4 bottom-4 rounded-full bg-white/85 backdrop-blur-md px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-stone-800 font-semibold">
                        {file?.name}
                      </span>
                      <span className="absolute right-4 bottom-4 rounded-full bg-white/85 backdrop-blur-md px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-[#0F3460] font-semibold pointer-events-none">
                        Click to replace
                      </span>
                    </div>
                  ) : (
                    <div className="w-full aspect-[16/10] flex flex-col items-center justify-center text-center px-6 py-10">
                      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#0F3460]/10 text-[#0F3460]">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                      </span>
                      <span className="font-display text-stone-900 text-lg font-semibold mb-1">
                        Drop image here
                      </span>
                      <span className="text-stone-500 text-sm">
                        or click to browse · JPG, PNG, WebP
                      </span>
                    </div>
                  )}
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field label="Photographer" required>
                    <input
                      type="text"
                      value={photographer}
                      onChange={(e) => setPhotographer(e.target.value)}
                      placeholder="Your name"
                      required
                      className="w-full rounded-xl border border-stone-300 bg-white/70 px-4 py-3 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#0F3460] focus:ring-2 focus:ring-[#0F3460]/15 transition"
                    />
                  </Field>
                  <Field label="Location" required>
                    <select
                      value={location}
                      onChange={(e) => {
                        const name = e.target.value;
                        setLocation(name);
                        setCoords(name ? getCoordinatesByName(name) : null);
                      }}
                      required
                      className="w-full rounded-xl border border-stone-300 bg-white/70 px-4 py-3 text-stone-900 focus:outline-none focus:border-[#0F3460] focus:ring-2 focus:ring-[#0F3460]/15 transition"
                    >
                      <option value="" disabled>
                        Select a location
                      </option>
                      {KUANTAN_LOCATIONS.map((l) => (
                        <option key={l.name} value={l.name}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <Field label="Caption">
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="A line or two about this frame..."
                    rows={3}
                    className="w-full rounded-xl border border-stone-300 bg-white/70 px-4 py-3 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#0F3460] focus:ring-2 focus:ring-[#0F3460]/15 transition resize-none"
                  />
                </Field>

                {errorMsg && (
                  <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 break-words whitespace-normal leading-relaxed max-w-full">
                    {errorMsg}
                  </p>
                )}

                <div className="flex items-center justify-end gap-3 pt-1">
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-full px-6 py-3 text-[12px] uppercase tracking-[0.2em] font-semibold text-stone-600 hover:text-stone-900 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={status === "compressing" || status === "submitting" || status === "success"}
                    className="inline-flex items-center gap-2 rounded-full bg-[#0F3460] px-7 py-3 text-[12px] uppercase tracking-[0.2em] text-[#F5F0E8] font-semibold hover:bg-[#1A4A7A] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    {submitLabel}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </UploadModalContext.Provider>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[11px] uppercase tracking-[0.22em] text-stone-600 font-semibold">
        {label}
        {required && <span className="text-[#0F3460]"> *</span>}
      </span>
      {children}
    </label>
  );
}
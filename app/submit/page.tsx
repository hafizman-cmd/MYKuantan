"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient, type Session } from "@supabase/supabase-js";
import { SUPABASE_PHOTOS_TABLE } from "@/lib/supabase";
import { KUANTAN_LOCATIONS, getCoordinatesByName } from "@/lib/locations";
import { toTitleCase } from "@/lib/format";

const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

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

function GoogleGIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.04-3.711H.957v2.332A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.96 10.71A5.41 5.41 0 0 1 3.682 9c0-.588.102-1.16.278-1.71V4.958H.957A9 9 0 0 0 0 9c0 1.452.347 2.827.957 4.042l3.003-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A9 9 0 0 0 .957 4.958L3.96 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
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
    <label className="block">
      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-600">
        {label}
        {required ? <span className="text-[#0F3460]"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

export default function SubmitPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [location, setLocation] = useState("");
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [oauthLoading, setOauthLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const loadedUserIdRef = useRef<string | null>(null);

  const user = session?.user ?? null;

  useEffect(() => {
    let mounted = true;
    supabaseClient.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
        setAuthReady(true);
      }
    });
    const { data: subData } = supabaseClient.auth.onAuthStateChange(
      (_event, newSession) => {
        if (mounted) {
          setSession(newSession);
          setAuthReady(true);
        }
      }
    );
    return () => {
      mounted = false;
      subData.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    if (loadedUserIdRef.current === user.id) return;
    loadedUserIdRef.current = user.id;
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const raw =
      typeof meta.full_name === "string"
        ? meta.full_name
        : typeof meta.name === "string"
          ? meta.name
          : "";
    setDisplayName(toTitleCase(raw));
  }, [user]);

  const revokePreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, []);

  useEffect(() => () => revokePreview(), [revokePreview]);

  const resetForm = useCallback(() => {
    revokePreview();
    setPreviewUrl(null);
    setFile(null);
    setLocation("");
    setCoords(null);
    setCaption("");
    setStatus("idle");
    setErrorMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [revokePreview]);

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

  const handleSignIn = async () => {
    setOauthLoading(true);
    setErrorMsg(null);
    try {
      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin + "/submit" },
      });
      if (error) throw error;
    } catch (err) {
      setOauthLoading(false);
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Google sign-in failed. Please try again."
      );
    }
  };

  const handleSignOut = async () => {
    await supabaseClient.auth.signOut();
    loadedUserIdRef.current = null;
    setDisplayName("");
    resetForm();
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) {
      setErrorMsg("Add an image first.");
      setStatus("error");
      return;
    }
    const cleanName = toTitleCase(displayName);
    if (!cleanName || !location.trim()) {
      setErrorMsg("Contributor name and location are required.");
      setStatus("error");
      return;
    }

    setStatus("compressing");
    setErrorMsg(null);

    try {
      const compressed = await compressImage(file);
      setStatus("submitting");

      const baseName = compressed.name.replace(/\.[^.]+$/, "");
      const filePath = `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 9)}-${baseName}.jpg`;

      const { error: upErr } = await supabaseClient.storage
        .from(SUPABASE_STORAGE_BUCKET)
        .upload(filePath, compressed, {
          contentType: "image/jpeg",
          cacheControl: "3600",
          upsert: false,
        });

      if (upErr) throw upErr;

      const { data } = supabaseClient.storage
        .from(SUPABASE_STORAGE_BUCKET)
        .getPublicUrl(filePath);
      const image_url = data.publicUrl;

      const { error: insertErr } = await supabaseClient
        .from(SUPABASE_PHOTOS_TABLE)
        .insert({
          image_url,
          photographer: cleanName,
          location: location.trim(),
          caption: caption.trim(),
          latitude: coords ? coords[0] : null,
          longitude: coords ? coords[1] : null,
          status: "pending",
        });

      if (insertErr) throw insertErr;

      setStatus("success");
      setErrorMsg(null);
      window.setTimeout(() => router.push("/"), 1200);
    } catch (err) {
      console.error("submit error", err);
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

  const inputClass =
    "w-full rounded-xl border border-stone-300 bg-white/80 px-4 py-3 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#0F3460] focus:ring-2 focus:ring-[#0F3460]/15 transition";

  if (!authReady) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#FAF8F5] px-6">
        <div className="flex flex-col items-center gap-4">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-[#0F3460]" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-stone-500">
            Checking session
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-[#FAF8F5]">
        <header className="mx-auto w-full max-w-[1600px] px-6 pt-10 md:px-16 md:pt-14">
          <a
            href="/"
            className="font-display text-3xl font-extrabold leading-none tracking-tight text-stone-900 select-none md:text-4xl"
          >
            Kuantan
          </a>
        </header>
        <main className="flex flex-1 items-center justify-center px-6 py-16 md:py-24">
          <div className="w-full max-w-md text-center">
            <span className="mb-4 block text-[11px] font-semibold uppercase tracking-[0.3em] text-[#0F3460]">
              Contributor Access
            </span>
            <h1 className="mb-4 font-display text-4xl font-extrabold leading-tight text-stone-900 md:text-5xl">
              Contribute to the Archive
            </h1>
            <p className="mx-auto mb-10 max-w-sm text-base leading-relaxed text-stone-600 md:text-lg">
              Sign in with Google to submit your frames of Kuantan. Each
              contribution is reviewed before it joins the lookbook.
            </p>
            <button
              type="button"
              onClick={handleSignIn}
              disabled={oauthLoading}
              className="inline-flex items-center gap-3 rounded-full border border-stone-300 bg-white px-7 py-3.5 text-[13px] font-semibold uppercase tracking-[0.18em] text-stone-800 transition-all duration-300 hover:border-[#0F3460] hover:text-[#0F3460] hover:shadow-[0_8px_30px_rgba(15,52,96,0.12)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <GoogleGIcon />
              {oauthLoading ? "Redirecting…" : "Continue with Google"}
            </button>
            {errorMsg && (
              <p className="mt-6 break-words rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-700">
                {errorMsg}
              </p>
            )}
            <a
              href="/"
              className="mt-10 inline-block text-[12px] font-semibold uppercase tracking-[0.2em] text-stone-500 transition-colors hover:text-[#0F3460]"
            >
              ← Back to lookbook
            </a>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#FAF8F5]">
      <header className="mx-auto flex w-full max-w-[1600px] items-center justify-between px-6 pt-10 md:px-16 md:pt-14">
        <a
          href="/"
          className="font-display text-3xl font-extrabold leading-none tracking-tight text-stone-900 select-none md:text-4xl"
        >
          Kuantan
        </a>
        <button
          type="button"
          onClick={handleSignOut}
          className="rounded-full px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500 transition-colors hover:bg-stone-900/5 hover:text-[#0F3460]"
        >
          Sign out
        </button>
      </header>

      <main className="mx-auto w-full max-w-[1600px] flex-1 px-6 py-10 md:px-16 md:py-14">
        <div className="mx-auto w-full max-w-2xl">
          <div className="mb-8">
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.3em] text-[#0F3460]">
              Contribute
            </span>
            <h1 className="font-display text-3xl font-extrabold leading-tight text-stone-900 md:text-4xl">
              Submit a Frame
            </h1>
            <p className="mt-2 text-sm text-stone-600">
              Signed in{user.email ? ` as ${user.email}` : ""}.
            </p>
          </div>

          {status === "success" ? (
            <div className="rounded-[2rem] border border-stone-200/70 bg-white/60 p-10 text-center shadow-[0_18px_60px_rgba(15,52,96,0.06)] backdrop-blur-sm md:p-14">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#0F3460]/10 text-[#0F3460]">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2 className="mb-2 font-display text-2xl font-bold text-stone-900">
                Frame submitted
              </h2>
              <p className="text-sm text-stone-600">
                Your contribution is in the queue for review. Taking you home…
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="rounded-[2rem] border border-stone-200/70 bg-white/60 p-7 shadow-[0_18px_60px_rgba(15,52,96,0.06)] backdrop-blur-sm md:p-10"
            >
              <label
                onDragOver={(e: DragEvent<HTMLLabelElement>) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={`relative block w-full cursor-pointer overflow-hidden rounded-[1.5rem] border-2 border-dashed transition-colors duration-300 ${
                  dragging
                    ? "border-[#0F3460] bg-[#0F3460]/5"
                    : "border-stone-300 bg-white/50 hover:border-[#0F3460]/60"
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
                    <span className="absolute bottom-4 left-4 rounded-full bg-white/85 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-800 backdrop-blur-md">
                      {file?.name}
                    </span>
                    <span className="pointer-events-none absolute bottom-4 right-4 rounded-full bg-white/85 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#0F3460] backdrop-blur-md">
                      Click to replace
                    </span>
                  </div>
                ) : (
                  <div className="flex w-full aspect-[16/10] flex-col items-center justify-center px-6 py-10 text-center">
                    <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#0F3460]/10 text-[#0F3460]">
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </span>
                    <span className="mb-1 font-display text-lg font-semibold text-stone-900">
                      Drop image here
                    </span>
                    <span className="text-sm text-stone-500">
                      or click to browse · JPG, PNG, WebP
                    </span>
                  </div>
                )}
              </label>

              <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Contributor Display Name" required>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                    required
                    className={inputClass}
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
                    className={inputClass}
                  >
                    <option value="" disabled>
                      Select a location
                    </option>
                    {[...KUANTAN_LOCATIONS]
                      .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
                      .map((l) => (
                        <option key={l.name} value={l.name}>
                          {l.name}
                        </option>
                      ))}
                  </select>
                </Field>
              </div>

              <div className="mt-5">
                <Field label="Caption">
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="A line or two about this frame..."
                    rows={3}
                    className={`${inputClass} resize-none`}
                  />
                </Field>
              </div>

              {errorMsg && (
                <p className="mt-5 break-words rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-700">
                  {errorMsg}
                </p>
              )}

              <div className="mt-7 flex items-center justify-end gap-3">
                <a
                  href="/"
                  className="rounded-full px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.2em] text-stone-600 transition-colors hover:text-stone-900"
                >
                  Cancel
                </a>
                <button
                  type="submit"
                  disabled={
                    status === "compressing" || status === "submitting"
                  }
                  className="inline-flex items-center gap-2 rounded-full bg-[#0F3460] px-7 py-3 text-[12px] font-semibold uppercase tracking-[0.2em] text-[#F5F0E8] transition-colors hover:bg-[#1A4A7A] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitLabel}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

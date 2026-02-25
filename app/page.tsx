"use client";

import { useState, useCallback, useRef } from "react";
import { AnalysisResult } from "./api/analyze/route";

// Compress and resize image client-side before sending to API
// Keeps payloads well under Vercel's 4.5MB function limit
function compressImage(file: File, maxDimension = 1200, quality = 0.85): Promise<{ base64: string; mimeType: string; previewUrl: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const { width, height } = img;
      const scale = Math.min(1, maxDimension / Math.max(width, height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      resolve({
        base64: dataUrl.split(",")[1],
        mimeType: "image/jpeg",
        previewUrl: dataUrl,
      });
    };
    img.onerror = reject;
    img.src = objectUrl;
  });
}

type AppState =
  | "landing"
  | "uploading"
  | "consent"
  | "analyzing"
  | "generating"
  | "result"
  | "error";

interface ErrorInfo {
  title: string;
  message: string;
  emoji: string;
}

const PROCESSING_MESSAGES = [
  "Consulting the Nonna...",
  "Applying premium silver fox serum...",
  "Sourcing the perfect lighting...",
  "Aging like fine mozzarella...",
  "Channeling distinguished energy...",
  "Warming up the oven...",
  "Perfecting the bone structure...",
  "Adding a touch of Sinatra...",
];

// Williamsburg Pizza SVG Logo
function WPLogo({ size = 80 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="60" cy="60" r="58" fill="#9B1D20" />
      <circle cx="60" cy="60" r="52" fill="none" stroke="#FFF5E6" strokeWidth="1.5" />
      <path d="M60 30 L85 75 L35 75 Z" fill="#FFF5E6" opacity="0.9" />
      <circle cx="60" cy="55" r="5" fill="#C8952A" />
      <circle cx="72" cy="68" r="3.5" fill="#C8952A" />
      <circle cx="48" cy="67" r="3.5" fill="#C8952A" />
      <path d="M35 75 Q60 85 85 75" fill="none" stroke="#C8952A" strokeWidth="5" strokeLinecap="round" />
      <path id="topArc" d="M 18 60 A 42 42 0 0 1 102 60" fill="none" />
      <text fill="#FFF5E6" fontSize="11" fontFamily="Anton, Impact, sans-serif" letterSpacing="2">
        <textPath href="#topArc" startOffset="50%" textAnchor="middle">WILLIAMSBURG</textPath>
      </text>
      <path id="bottomArc" d="M 20 65 A 40 40 0 0 0 100 65" fill="none" />
      <text fill="#FFF5E6" fontSize="13" fontFamily="Anton, Impact, sans-serif" letterSpacing="3">
        <textPath href="#bottomArc" startOffset="50%" textAnchor="middle">PIZZA</textPath>
      </text>
    </svg>
  );
}

function PizzaSpinner() {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="animate-pizza-spin" style={{ fontSize: "72px" }}>
        🍕
      </div>
      <div className="flex gap-2">
        <div className="loading-dot w-3 h-3 rounded-full bg-[#9B1D20]" />
        <div className="loading-dot w-3 h-3 rounded-full bg-[#9B1D20]" />
        <div className="loading-dot w-3 h-3 rounded-full bg-[#9B1D20]" />
      </div>
    </div>
  );
}

export default function Home() {
  const [state, setState] = useState<AppState>("landing");
  const [uploadedImage, setUploadedImage] = useState<{
    base64: string;
    mimeType: string;
    previewUrl: string;
  } | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null);
  const [processingMessage, setProcessingMessage] = useState(PROCESSING_MESSAGES[0]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const processingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startProcessingMessages = useCallback(() => {
    let index = 0;
    processingIntervalRef.current = setInterval(() => {
      index = (index + 1) % PROCESSING_MESSAGES.length;
      setProcessingMessage(PROCESSING_MESSAGES[index]);
    }, 2500);
  }, []);

  const stopProcessingMessages = useCallback(() => {
    if (processingIntervalRef.current) {
      clearInterval(processingIntervalRef.current);
    }
  }, []);

  const handleFile = useCallback(async (file: File) => {
    // HEIC/HEIF files from iPhones can't be decoded by the browser canvas
    const isHeic = file.type === "image/heic" || file.type === "image/heif"
      || file.name.toLowerCase().endsWith(".heic")
      || file.name.toLowerCase().endsWith(".heif");

    if (isHeic) {
      setErrorInfo({
        title: "iPhone photo detected",
        message: "HEIC files can't be processed directly. In your Photos app, share the photo and choose \"Most Compatible\" format (JPG) before uploading.",
        emoji: "📱",
      });
      setState("error");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrorInfo({
        title: "That's not a pizza",
        message: "Please upload an image file (JPG, PNG, WebP, etc.)",
        emoji: "🤨",
      });
      setState("error");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setErrorInfo({
        title: "Photo too thicc",
        message: "Please upload an image under 20MB.",
        emoji: "📦",
      });
      setState("error");
      return;
    }

    try {
      const compressed = await compressImage(file);
      setUploadedImage(compressed);
      setState("consent");
    } catch {
      setErrorInfo({
        title: "Couldn't read that photo",
        message: "Something went wrong loading the image. Try a different file.",
        emoji: "📷",
      });
      setState("error");
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) void handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const runPipeline = async () => {
    if (!uploadedImage || !consentChecked) return;

    setState("analyzing");
    startProcessingMessages();

    try {
      // Step 1: Analyze with Claude
      const analyzeRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: uploadedImage.base64,
          mimeType: uploadedImage.mimeType,
        }),
      });

      if (!analyzeRes.ok) throw new Error("Analysis failed");
      const { analysis: analysisData } = await analyzeRes.json();

      // Safety checks
      if (!analysisData.face_detected) {
        throw new Error("no_face");
      }
      if (analysisData.appears_minor) {
        throw new Error("minor_detected");
      }
      if (!analysisData.safe_to_process) {
        throw new Error("unsafe_content");
      }

      setAnalysis(analysisData);
      setState("generating");

      // Step 2: Generate with Gemini
      const generateRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: uploadedImage.base64,
          mimeType: uploadedImage.mimeType,
          analysis: analysisData,
        }),
      });

      if (!generateRes.ok) throw new Error("Generation failed");
      const { imageBase64: genBase64, mimeType: genMime } =
        await generateRes.json();

      setGeneratedImage(`data:${genMime};base64,${genBase64}`);
      stopProcessingMessages();
      setState("result");
    } catch (err) {
      stopProcessingMessages();
      const message = err instanceof Error ? err.message : "unknown";

      if (message === "no_face") {
        setErrorInfo({
          title: "No face found",
          message:
            "We couldn't spot a face in this photo. Try one where your grandpa is front and center!",
          emoji: "🔍",
        });
      } else if (message === "minor_detected") {
        setErrorInfo({
          title: "Gotta be 18+",
          message:
            "This tool is for adults only. We can only hot-ify grown-ups.",
          emoji: "🚫",
        });
      } else if (message === "unsafe_content") {
        setErrorInfo({
          title: "Can't process this one",
          message:
            "This image didn't pass our safety check. Please try a different photo.",
          emoji: "⚠️",
        });
      } else {
        setErrorInfo({
          title: "Something went sideways",
          message:
            "Even the best pizzerias have off nights. Try again in a moment.",
          emoji: "😬",
        });
      }
      setState("error");
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    const a = document.createElement("a");
    a.href = generatedImage;
    a.download = "hot-grandpa-by-williamsburg-pizza.png";
    a.click();
  };

  const handleShare = async () => {
    if (!generatedImage) return;

    const response = await fetch(generatedImage);
    const blob = await response.blob();
    const file = new File([blob], "hot-grandpa.png", { type: "image/png" });

    if (
      typeof navigator !== "undefined" &&
      navigator.share &&
      navigator.canShare({ files: [file] })
    ) {
      try {
        await navigator.share({
          files: [file],
          title: "My Hot Grandpa — by Williamsburg Pizza",
          text: "If they can make my grandpa this hot, imagine what they do to their pizza. 🍕",
        });
      } catch {
        // User cancelled — no action needed
      }
    } else {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        alert("Image copied to clipboard! Paste anywhere to share.");
      } catch {
        handleDownload();
      }
    }
  };

  const reset = () => {
    setState("landing");
    setUploadedImage(null);
    setConsentChecked(false);
    setAnalysis(null);
    setGeneratedImage(null);
    setErrorInfo(null);
  };

  return (
    <div className="min-h-screen stripe-bg">
      {/* Header */}
      <header
        style={{ backgroundColor: "#9B1D20" }}
        className="py-4 px-6 flex items-center justify-between shadow-lg"
      >
        <div className="flex items-center gap-3">
          <WPLogo size={52} />
          <div>
            <div
              className="text-white tracking-wider"
              style={{ fontSize: "18px", fontFamily: "Anton, Impact, sans-serif" }}
            >
              WILLIAMSBURG PIZZA
            </div>
            <div className="text-white text-xs opacity-75 tracking-widest uppercase">
              Brooklyn, NY
            </div>
          </div>
        </div>
        <div
          className="hidden md:block text-white text-sm italic opacity-80"
          style={{ fontFamily: "Georgia, serif" }}
        >
          &ldquo;We keep things hot.&rdquo;
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* LANDING */}
        {state === "landing" && (
          <div className="animate-fade-in">
            <div className="text-center mb-12">
              <h1
                className="mb-4 leading-none"
                style={{
                  fontFamily: "Anton, Impact, sans-serif",
                  fontSize: "clamp(48px, 8vw, 96px)",
                  color: "#9B1D20",
                  textShadow: "3px 3px 0px rgba(155, 29, 32, 0.15)",
                }}
              >
                HOT GRANDPA
                <br />
                <span style={{ color: "#2C1A0E" }}>GENERATOR</span>
              </h1>
              <p
                className="text-xl md:text-2xl mb-2 max-w-xl mx-auto leading-relaxed"
                style={{ color: "#6B1015", fontFamily: "Georgia, serif", fontStyle: "italic" }}
              >
                If we can make your grandpa hot,
                <br />
                we can make your pizza hot.
              </p>
              <p className="text-sm opacity-60 mt-3" style={{ color: "#2C1A0E" }}>
                Powered by AI · Made in Brooklyn · No grandpas were harmed
              </p>
            </div>

            {/* Upload Zone */}
            <div
              className={`relative border-4 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 drop-zone-pattern ${
                isDragging
                  ? "border-[#9B1D20] scale-[1.02]"
                  : "border-[#9B1D20]/30 hover:border-[#9B1D20]/60"
              }`}
              style={{
                backgroundColor: isDragging ? "rgba(155, 29, 32, 0.08)" : "rgba(255,245,230,0.8)",
              }}
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
              <div style={{ fontSize: "64px" }} className="mb-4">
                👴
              </div>
              <h2
                className="text-2xl md:text-3xl mb-3"
                style={{ fontFamily: "Anton, Impact, sans-serif", color: "#9B1D20" }}
              >
                UPLOAD YOUR GRANDPA
              </h2>
              <p className="text-base mb-2" style={{ color: "#2C1A0E" }}>
                (or grandma, or that uncle who&apos;s basically a grandpa)
              </p>
              <p className="text-sm opacity-50" style={{ color: "#2C1A0E" }}>
                Drag &amp; drop or click · JPG, PNG, WebP · Up to 10MB
              </p>

              {isDragging && (
                <div className="absolute inset-0 rounded-2xl flex items-center justify-center bg-[#9B1D20]/10">
                  <p style={{ fontFamily: "Anton, Impact, sans-serif", color: "#9B1D20", fontSize: "32px" }}>
                    DROP IT HOT 🔥
                  </p>
                </div>
              )}
            </div>

            {/* How it works */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { emoji: "📸", step: "1", title: "Upload a photo", desc: "Any person, any age — the older the canvas, the hotter the result." },
                { emoji: "🧠", step: "2", title: "AI works its magic", desc: "Our two-model pipeline analyzes and transforms with surgical charm." },
                { emoji: "🔥", step: "3", title: "Behold the hotness", desc: "Download or share. Show your family. Order a pizza. Reflect." },
              ].map(({ emoji, step, title, desc }) => (
                <div
                  key={step}
                  className="rounded-xl p-6 text-center"
                  style={{ backgroundColor: "#fff", border: "1px solid rgba(155, 29, 32, 0.15)" }}
                >
                  <div style={{ fontSize: "36px" }} className="mb-3">{emoji}</div>
                  <div
                    className="text-xs tracking-widest mb-2"
                    style={{ fontFamily: "Anton, Impact, sans-serif", color: "#9B1D20", opacity: 0.6 }}
                  >
                    STEP {step}
                  </div>
                  <h3
                    className="text-lg mb-2"
                    style={{ fontFamily: "Anton, Impact, sans-serif", color: "#2C1A0E" }}
                  >
                    {title.toUpperCase()}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "#5C3D2E", opacity: 0.8 }}>
                    {desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CONSENT */}
        {state === "consent" && uploadedImage && (
          <div className="animate-slide-up">
            <h2
              className="text-4xl md:text-5xl text-center mb-8"
              style={{ fontFamily: "Anton, Impact, sans-serif", color: "#9B1D20" }}
            >
              LOOKING GOOD ALREADY
            </h2>

            <div className="grid md:grid-cols-2 gap-8 items-start mb-8">
              <div>
                <div
                  className="rounded-2xl overflow-hidden shadow-xl"
                  style={{ border: "4px solid #9B1D20" }}
                >
                  <img
                    src={uploadedImage.previewUrl}
                    alt="Your upload"
                    className="w-full object-cover"
                    style={{ maxHeight: "400px", objectPosition: "top" }}
                  />
                </div>
                <p className="text-center text-sm mt-3 opacity-60" style={{ color: "#2C1A0E" }}>
                  Before
                </p>
              </div>

              <div className="flex flex-col justify-center gap-6">
                <div
                  className="rounded-xl p-6"
                  style={{ backgroundColor: "#fff", border: "1px solid rgba(155, 29, 32, 0.2)" }}
                >
                  <h3
                    className="text-xl mb-4"
                    style={{ fontFamily: "Anton, Impact, sans-serif", color: "#2C1A0E" }}
                  >
                    BEFORE WE HOT-IFY THIS PERSON
                  </h3>
                  <label className="flex gap-3 cursor-pointer items-start">
                    <input
                      type="checkbox"
                      className="mt-1 w-5 h-5 cursor-pointer"
                      style={{ accentColor: "#9B1D20" }}
                      checked={consentChecked}
                      onChange={(e) => setConsentChecked(e.target.checked)}
                    />
                    <span className="text-sm leading-relaxed" style={{ color: "#5C3D2E" }}>
                      I confirm I have the right to upload and transform this
                      photo. I understand this is AI-generated satire for
                      entertainment purposes. No grandpas will be emotionally
                      damaged.
                    </span>
                  </label>
                </div>

                <button
                  onClick={runPipeline}
                  disabled={!consentChecked}
                  className="w-full py-5 rounded-xl text-white text-2xl tracking-wider transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    fontFamily: "Anton, Impact, sans-serif",
                    backgroundColor: "#9B1D20",
                    boxShadow: consentChecked ? "0 4px 20px rgba(155, 29, 32, 0.4)" : "none",
                  }}
                >
                  🔥 MAKE IT HOT
                </button>

                <button
                  onClick={reset}
                  className="w-full py-3 rounded-xl text-sm transition-all"
                  style={{ color: "#9B1D20", border: "1px solid rgba(155, 29, 32, 0.3)" }}
                >
                  Choose a different photo
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PROCESSING */}
        {(state === "analyzing" || state === "generating") && (
          <div className="text-center py-20 animate-fade-in">
            <PizzaSpinner />

            <div className="mt-10">
              <h2
                className="text-3xl md:text-4xl mb-4"
                style={{ fontFamily: "Anton, Impact, sans-serif", color: "#9B1D20" }}
              >
                {state === "analyzing" ? "READING THE VIBE" : "APPLYING THE HEAT"}
              </h2>
              <p
                className="text-lg transition-all duration-500"
                style={{ color: "#5C3D2E", fontFamily: "Georgia, serif", fontStyle: "italic" }}
              >
                {processingMessage}
              </p>

              <div className="flex justify-center gap-4 mt-8">
                {[
                  { label: "Analyzing", active: state === "analyzing", done: (state as string) === "generating" || (state as string) === "result" },
                  { label: "Generating", active: state === "generating", done: (state as string) === "result" },
                ].map(({ label, active, done }) => (
                  <div
                    key={label}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-sm"
                    style={{
                      backgroundColor: done ? "#9B1D20" : active ? "rgba(155, 29, 32, 0.15)" : "rgba(155, 29, 32, 0.05)",
                      color: done ? "#fff" : "#9B1D20",
                      border: `1px solid ${active || done ? "#9B1D20" : "rgba(155, 29, 32, 0.2)"}`,
                      opacity: active || done ? 1 : 0.4,
                    }}
                  >
                    {done ? "✓" : active ? "⏳" : "○"} {label}
                  </div>
                ))}
              </div>
            </div>

            {uploadedImage && (
              <div className="mt-10 flex justify-center">
                <div
                  className="w-24 h-24 rounded-full overflow-hidden opacity-40"
                  style={{ border: "3px solid #9B1D20" }}
                >
                  <img
                    src={uploadedImage.previewUrl}
                    alt=""
                    className="w-full h-full object-cover object-top"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* RESULT */}
        {state === "result" && uploadedImage && generatedImage && (
          <div className="animate-slide-up">
            <h2
              className="text-4xl md:text-6xl text-center mb-3"
              style={{ fontFamily: "Anton, Impact, sans-serif", color: "#9B1D20" }}
            >
              🔥 CERTIFIED HOT 🔥
            </h2>
            <p
              className="text-center mb-10 text-lg"
              style={{ color: "#5C3D2E", fontFamily: "Georgia, serif", fontStyle: "italic" }}
            >
              {analysis?.gender_presentation === "female"
                ? "Behold: the hottest grandma in Brooklyn."
                : "Behold: the hottest grandpa in Brooklyn."}
            </p>

            <div className="grid grid-cols-2 gap-4 md:gap-8 mb-8">
              <div>
                <div
                  className="rounded-xl overflow-hidden shadow-lg"
                  style={{ border: "3px solid rgba(155, 29, 32, 0.3)" }}
                >
                  <img
                    src={uploadedImage.previewUrl}
                    alt="Before"
                    className="w-full object-cover"
                    style={{ maxHeight: "400px", objectPosition: "top" }}
                  />
                </div>
                <p
                  className="text-center text-sm mt-2 tracking-widest"
                  style={{ fontFamily: "Anton, Impact, sans-serif", color: "#9B1D20", opacity: 0.5 }}
                >
                  BEFORE
                </p>
              </div>

              <div>
                <div
                  className="rounded-xl overflow-hidden shadow-2xl animate-reveal-wipe animate-pulse-glow"
                  style={{ border: "3px solid #9B1D20" }}
                >
                  <img
                    src={generatedImage}
                    alt="Hot grandpa result"
                    className="w-full object-cover"
                    style={{ maxHeight: "400px", objectPosition: "top" }}
                  />
                </div>
                <p
                  className="text-center text-sm mt-2 tracking-widest"
                  style={{ fontFamily: "Anton, Impact, sans-serif", color: "#9B1D20" }}
                >
                  🔥 AFTER 🔥
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <button
                onClick={handleDownload}
                className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-white font-semibold text-lg transition-all hover:opacity-90"
                style={{
                  backgroundColor: "#9B1D20",
                  boxShadow: "0 4px 20px rgba(155, 29, 32, 0.4)",
                }}
              >
                ⬇️ Download
              </button>

              <button
                onClick={handleShare}
                className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:bg-[#9B1D20] hover:text-white"
                style={{
                  color: "#9B1D20",
                  border: "2px solid #9B1D20",
                  backgroundColor: "transparent",
                }}
              >
                📤 Share
              </button>
            </div>

            {/* Brand CTA */}
            <div
              className="rounded-2xl p-8 text-center"
              style={{ backgroundColor: "#9B1D20" }}
            >
              <div className="flex justify-center mb-4">
                <WPLogo size={60} />
              </div>
              <h3
                className="text-2xl md:text-3xl text-white mt-0 mb-2"
                style={{ fontFamily: "Anton, Impact, sans-serif" }}
              >
                IF WE CAN MAKE YOUR GRANDPA HOT...
              </h3>
              <p className="text-white text-lg opacity-90 mb-6" style={{ fontFamily: "Georgia, serif", fontStyle: "italic" }}>
                Imagine what we do to our pizza.
              </p>
              <a
                href="https://williamsburgpizza.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-8 py-3 rounded-xl font-semibold text-lg transition-all hover:opacity-90"
                style={{ backgroundColor: "#FFF5E6", color: "#9B1D20" }}
              >
                Order Now 🍕
              </a>
            </div>

            <div className="text-center mt-6">
              <button
                onClick={reset}
                className="text-sm underline opacity-50 hover:opacity-100 transition-opacity"
                style={{ color: "#9B1D20" }}
              >
                Try another photo
              </button>
            </div>
          </div>
        )}

        {/* ERROR */}
        {state === "error" && errorInfo && (
          <div className="text-center py-20 animate-slide-up">
            <div style={{ fontSize: "72px" }} className="mb-6">
              {errorInfo.emoji}
            </div>
            <h2
              className="text-4xl mb-4"
              style={{ fontFamily: "Anton, Impact, sans-serif", color: "#9B1D20" }}
            >
              {errorInfo.title.toUpperCase()}
            </h2>
            <p className="text-lg mb-10 max-w-md mx-auto leading-relaxed" style={{ color: "#5C3D2E" }}>
              {errorInfo.message}
            </p>
            <button
              onClick={reset}
              className="px-10 py-4 rounded-xl text-white font-semibold text-lg hover:opacity-90 transition-all"
              style={{ backgroundColor: "#9B1D20" }}
            >
              Try Again
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer
        className="mt-16 py-8 text-center text-sm"
        style={{ backgroundColor: "#2C1A0E", color: "rgba(255, 245, 230, 0.5)" }}
      >
        <p>© Williamsburg Pizza · Hot Grandpa Generator · For entertainment only</p>
        <p className="mt-1 text-xs opacity-60">
          AI-generated images · All transformations are fictional
        </p>
      </footer>
    </div>
  );
}

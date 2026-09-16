"use client";

import { useState, useEffect, useRef } from "react";
import { extractOcr, submitOcrVerification } from "@/lib/api";
import { OcrResult } from "@/lib/types";

type UploadStage = "idle" | "processing" | "verified" | "submitted";

interface StepInfo {
  step: number;
  label: string;
  description: string;
}

const PIPELINE_STEPS: StepInfo[] = [
  {
    step: 1,
    label: "Scanning layout anomalies...",
    description: "Detecting document skew, seal locations, column boundaries, and handwriting noise",
  },
  {
    step: 2,
    label: "Extracting regional terminology...",
    description: "Parsing Khewat / Khatauni / Khasra numbers for Punjab, Patta / Chitta for Tamil Nadu",
  },
  {
    step: 3,
    label: "Cross-referencing cadastral boundaries...",
    description: "Reconciling extracted RoR area against georeferenced GIS survey polygon coordinates",
  },
];

export default function OcrUpload({
  onVerificationComplete,
}: {
  onVerificationComplete?: (ulpid: string) => void;
}) {
  const [stage, setStage] = useState<UploadStage>("idle");
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [fileDetails, setFileDetails] = useState<{ name: string; size: string } | null>(null);
  const [ocrData, setOcrData] = useState<OcrResult | null>(null);
  const [formData, setFormData] = useState<{
    owner: string;
    survey_no: string;
    area: number;
    khewat_no?: string;
    patta_no?: string;
    notes?: string;
  }>({
    owner: "",
    survey_no: "",
    area: 0,
    khewat_no: "",
    patta_no: "",
    notes: "",
  });
  const [auditReceipt, setAuditReceipt] = useState<{
    status: string;
    audit_hash: string;
    timestamp: string;
    action_summary: string;
  } | null>(null);
  const [submittingAction, setSubmittingAction] = useState<boolean>(false);
  const [highlightedField, setHighlightedField] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Trigger simulated multi-step AI pipeline progression
  const runPipeline = async (
    fileArg: File | { name: string; preset?: "punjab_jamabandi" | "tamil_nadu_patta" },
    displayName: string,
    displaySize: string
  ) => {
    setFileDetails({ name: displayName, size: displaySize });
    setStage("processing");
    setCurrentStep(0);
    setProgress(15);

    // Step 1: Scanning layout
    await new Promise((r) => setTimeout(r, 650));
    setCurrentStep(1);
    setProgress(45);

    // Step 2: Regional extraction
    await new Promise((r) => setTimeout(r, 800));
    setCurrentStep(2);
    setProgress(80);

    // Step 3: Cadastral cross-referencing & API extraction
    const result = await extractOcr(fileArg);
    await new Promise((r) => setTimeout(r, 650));
    setCurrentStep(3);
    setProgress(100);

    await new Promise((r) => setTimeout(r, 350));
    if (result) {
      setOcrData(result);
      setFormData({
        owner: result.owner,
        survey_no: result.survey_no,
        area: result.area,
        khewat_no: result.khewat_no || "",
        patta_no: result.patta_no || "",
        notes: "",
      });
      setStage("verified");
    } else {
      setStage("idle");
    }
  };

  const handleFile = (file: File) => {
    const sizeStr = `${(file.size / 1024).toFixed(1)} KB`;
    runPipeline(file, file.name, sizeStr);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleVerificationDecision = async (decision: "confirmed" | "flagged_mismatch") => {
    if (!ocrData) return;
    setSubmittingAction(true);

    const receipt = await submitOcrVerification({
      ulpid: ocrData.ulpid ?? "PB-LDH-0042",
      decision,
      officer_id: "OFF-102",
      notes: formData.notes || (decision === "confirmed" ? "Verified via surveyor OCR pipeline" : "Area mismatch detected between RoR and Cadastre"),
      extracted_data: {
        ...ocrData,
        owner: formData.owner,
        survey_no: formData.survey_no,
        area: formData.area,
      },
    });

    setSubmittingAction(false);
    setAuditReceipt(receipt);
    setStage("submitted");
    onVerificationComplete?.(ocrData.ulpid ?? "PB-LDH-0042");
  };

  const resetUpload = () => {
    setStage("idle");
    setCurrentStep(0);
    setProgress(0);
    setFileDetails(null);
    setOcrData(null);
    setAuditReceipt(null);
    setHighlightedField(null);
  };

  return (
    <div className="w-full">
      {/* =================================================================== */}
      {/* STAGE 1: Drag-and-Drop Surveyor Upload Zone */}
      {/* =================================================================== */}
      {stage === "idle" && (
        <div className="plot-border bg-parchment p-8 sm:p-10 shadow-[4px_4px_0_rgba(20,33,61,0.12)]">
          <div className="flex flex-col items-center text-center">
            {/* Surveyor Seal Crest */}
            <div className="flex h-14 w-14 items-center justify-center rounded-full survey-stamp font-serif text-lg font-semibold shadow-sm">
              OCR
            </div>

            <h3 className="mt-4 font-serif text-2xl font-semibold text-ink">
              AI Cadastral Document Ingestion
            </h3>
            <p className="mt-1 max-w-lg text-sm text-ink/70">
              Drag and drop scanned Jamabandi, Patta/Chitta, or Sale Deeds.
              The AI pipeline detects regional land formats, validates titleholders,
              and cross-checks boundary extents against GIS cadastre layers.
            </p>

            {/* Interactive Drop Box */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`mt-6 w-full max-w-xl cursor-pointer rounded-sm border-2 border-dashed p-8 transition-all ${
                dragActive
                  ? "border-ochre bg-ochre/10 scale-[1.01]"
                  : "border-ink/25 bg-white/40 hover:border-ink/50 hover:bg-white/70"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/png,image/jpeg,image/webp,image/tiff"
                onChange={handleInputChange}
                className="hidden"
              />
              <div className="flex flex-col items-center gap-2 text-ink/70">
                <span className="text-3xl">📄</span>
                <span className="font-medium text-sm text-ink">
                  Click to browse or drop land document here
                </span>
                <span className="font-mono text-xs text-ink/50">
                  Supports scanned PDF, PNG, JPG, or TIFF (up to 25 MB)
                </span>
              </div>
            </div>

            {/* Quick Demo Pre-load Buttons */}
            <div className="mt-6 flex flex-col sm:flex-row items-center gap-2.5">
              <span className="font-mono text-xs text-ink/50 uppercase tracking-wider">
                Or load test records:
              </span>
              <button
                onClick={() =>
                  runPipeline(
                    { name: "Punjab_Jamabandi_RoR_2026.pdf", preset: "punjab_jamabandi" },
                    "Punjab_Jamabandi_RoR_2026.pdf",
                    "420 KB"
                  )
                }
                className="rounded-sm border border-ink/20 bg-parchment-dark/70 px-3 py-1.5 text-xs font-medium text-ink hover:bg-ink hover:text-parchment transition"
              >
                🌾 Punjab Jamabandi (Khasra 142/3)
              </button>
              <button
                onClick={() =>
                  runPipeline(
                    { name: "TamilNadu_Patta_Chitta_84102.pdf", preset: "tamil_nadu_patta" },
                    "TamilNadu_Patta_Chitta_84102.pdf",
                    "385 KB"
                  )
                }
                className="rounded-sm border border-ink/20 bg-parchment-dark/70 px-3 py-1.5 text-xs font-medium text-ink hover:bg-ink hover:text-parchment transition"
              >
                📜 Tamil Nadu Patta (Survey 284/1B)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* STAGE 2: Animated AI Pipeline Processing States */}
      {/* =================================================================== */}
      {stage === "processing" && (
        <div className="plot-border bg-parchment p-8 sm:p-12 shadow-[4px_4px_0_rgba(20,33,61,0.12)]">
          <div className="mx-auto max-w-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-ink/15 pb-4">
              <div>
                <span className="font-mono text-xs text-ochre-dark uppercase font-bold tracking-wider">
                  AI Extraction Engine Active
                </span>
                <h4 className="font-serif text-xl font-semibold text-ink mt-0.5">
                  Analyzing {fileDetails?.name}
                </h4>
              </div>
              <span className="font-mono text-xs text-ink/50 bg-ink/5 px-2.5 py-1 rounded">
                {fileDetails?.size}
              </span>
            </div>

            {/* Visual Animated Progress Bar */}
            <div className="mt-6">
              <div className="flex items-center justify-between text-xs font-mono text-ink/60 mb-1.5">
                <span>Inference Pipeline</span>
                <span className="font-bold text-ink">{progress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-ink/10">
                <div
                  className="h-full bg-gradient-to-r from-ochre to-land transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Step-by-Step Progress Trackers */}
            <div className="mt-8 space-y-4">
              {PIPELINE_STEPS.map((stepItem, idx) => {
                const isComplete = currentStep > stepItem.step;
                const isCurrent = currentStep === stepItem.step;

                return (
                  <div
                    key={stepItem.step}
                    className={`flex items-start gap-3.5 rounded-sm p-3.5 transition-all ${
                      isCurrent
                        ? "bg-white/80 plot-border-solid shadow-sm scale-[1.01]"
                        : isComplete
                        ? "bg-land/5 opacity-80"
                        : "opacity-40"
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isComplete ? (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-land text-white text-[11px] font-bold">
                          ✓
                        </div>
                      ) : isCurrent ? (
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-ochre border-t-transparent" />
                      ) : (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full border border-ink/30 text-ink/50 text-xs font-mono">
                          {stepItem.step}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-sm text-ink flex items-center gap-2">
                        <span>{stepItem.label}</span>
                        {isCurrent && (
                          <span className="inline-block h-2 w-2 rounded-full bg-ochre animate-pulse" />
                        )}
                      </div>
                      <p className="text-xs text-ink/65 mt-0.5 leading-relaxed">
                        {stepItem.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* STAGE 3: Side-by-Side Verification Screen */}
      {/* =================================================================== */}
      {stage === "verified" && ocrData && (
        <div className="plot-border bg-parchment shadow-[5px_5px_0_rgba(20,33,61,0.18)]">
          {/* Top Status Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-ink/15 bg-white/40 px-6 py-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-ink/50">
                  DOCUMENT VERIFICATION DESK
                </span>
                <span className="rounded-full border border-land/50 bg-land/10 px-2.5 py-0.5 text-xs font-medium text-land">
                  Parsed: {ocrData.record_type}
                </span>
              </div>
              <h3 className="font-serif text-2xl font-semibold text-ink mt-0.5">
                Review Extracted Record of Rights
              </h3>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={resetUpload}
                className="rounded-sm border border-ink/20 px-3 py-1.5 text-xs font-medium text-ink hover:bg-ink/5 transition"
              >
                ← Ingest Another
              </button>
            </div>
          </div>

          {/* Split Screen Container */}
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-ink/15">
            {/* ============================================================= */}
            {/* LEFT SIDE: Stylized Land Document Preview with Bounding Boxes */}
            {/* ============================================================= */}
            <div className="lg:col-span-6 p-6 sm:p-8 bg-parchment-dark/30 flex flex-col items-center justify-center">
              <div className="w-full max-w-md">
                <div className="flex items-center justify-between text-xs text-ink/60 mb-2">
                  <span className="font-mono uppercase">Deed Canvas Preview</span>
                  <span className="text-[11px]">Hover boxes to trace OCR field</span>
                </div>

                {/* Simulated Scanned Land Record Sheet */}
                <div className="relative min-h-[460px] w-full rounded-sm bg-[#FAF8EE] p-6 shadow-md border border-ink/20 overflow-hidden font-serif">
                  {/* Subtle paper watermark texture */}
                  <div className="absolute inset-0 bg-grid-lines bg-grid opacity-20 pointer-events-none" />

                  {/* Top Seal Stamp */}
                  <div className="flex items-center justify-between border-b-2 border-ink/20 pb-4">
                    <div className="text-left">
                      <div className="text-[10px] uppercase font-mono tracking-widest text-ink/60">
                        GOVERNMENT OF {ocrData.state?.toUpperCase() ?? "PUNJAB"}
                      </div>
                      <div className="text-sm font-bold text-ink tracking-tight">
                        REVENUE &amp; LAND GOVERNANCE DEPT.
                      </div>
                      <div className="text-[10px] text-ink/70 font-mono">
                        {ocrData.record_type}
                      </div>
                    </div>
                    <div className="h-11 w-11 rounded-full survey-stamp flex items-center justify-center text-[10px] font-bold shrink-0">
                      SEAL
                    </div>
                  </div>

                  {/* Simulated Record Typography & OCR Overlays */}
                  <div className="mt-4 space-y-4 text-xs text-ink/80 leading-relaxed font-mono">
                    <div className="flex justify-between border-b border-ink/10 pb-1.5">
                      <span className="text-ink/50">ULPIN LINKAGE:</span>
                      <span className="font-bold text-ink">{ocrData.ulpid}</span>
                    </div>

                    <div className="border-b border-ink/10 pb-1.5">
                      <span className="text-ink/50 block text-[10px]">RECORD IDENTIFIER:</span>
                      <span className="font-semibold text-ink">
                        {ocrData.state === "Tamil Nadu"
                          ? `Patta No: ${ocrData.patta_no} · ${ocrData.sub_division}`
                          : `Khewat: ${ocrData.khewat_no} · Khatauni: ${ocrData.khatauni_no}`}
                      </span>
                    </div>

                    <div className="border-b border-ink/10 pb-1.5">
                      <span className="text-ink/50 block text-[10px]">REGISTERED HOLDER / MALIK:</span>
                      <span className="font-semibold text-ink">{formData.owner}</span>
                    </div>

                    <div className="border-b border-ink/10 pb-1.5">
                      <span className="text-ink/50 block text-[10px]">SURVEY / KHASRA NUMBER:</span>
                      <span className="font-semibold text-ink">{formData.survey_no}</span>
                    </div>

                    <div className="border-b border-ink/10 pb-1.5">
                      <span className="text-ink/50 block text-[10px]">DEED RECORDED EXTENT:</span>
                      <span className="font-bold text-ink">
                        {formData.area.toLocaleString()} sqm
                      </span>
                    </div>

                    <div className="pt-2 text-[10px] text-ink/50 italic font-sans">
                      Certified authentic copy verified by Revenue Officer Seal.
                    </div>
                  </div>

                  {/* Interactive Overlaid Bounding Boxes */}
                  {ocrData.bounding_boxes?.map((box) => {
                    const isHovered = highlightedField === box.field;
                    return (
                      <div
                        key={box.field}
                        onMouseEnter={() => setHighlightedField(box.field)}
                        onMouseLeave={() => setHighlightedField(null)}
                        style={{
                          top: box.top,
                          left: box.left,
                          width: box.width,
                          height: box.height,
                        }}
                        className={`absolute rounded border-2 transition-all cursor-pointer ${
                          isHovered
                            ? "border-ochre bg-ochre/25 shadow-lg scale-105 z-20"
                            : "border-land/70 bg-land/10 hover:border-ochre z-10"
                        }`}
                      >
                        <span className="absolute -top-3 left-1 rounded bg-ink px-1 font-mono text-[9px] text-parchment font-semibold">
                          {box.label}: {(box.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] text-ink/60 font-mono">
                  <span>File: {fileDetails?.name}</span>
                  <span>Confidence: {(ocrData.confidence * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* ============================================================= */}
            {/* RIGHT SIDE: Interactive Pre-Filled Form & Verification Desk */}
            {/* ============================================================= */}
            <div className="lg:col-span-6 p-6 sm:p-8 flex flex-col justify-between">
              <div>
                {/* Confidence Meter Badge */}
                <div className="flex items-center justify-between rounded bg-white/70 p-3 plot-border-solid mb-5">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-ink/50">
                      OCR Model Accuracy
                    </span>
                    <div className="font-serif text-lg font-bold text-ink flex items-center gap-2">
                      <span>{(ocrData.confidence * 100).toFixed(1)}% Confidence</span>
                      <span className="h-2 w-2 rounded-full bg-land" />
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-ink/50 uppercase block">
                      Target Parcel
                    </span>
                    <span className="font-mono text-xs font-bold text-ink bg-parchment px-2 py-0.5 rounded border border-ink/20">
                      {ocrData.ulpid}
                    </span>
                  </div>
                </div>

                {/* Cadastral Cross-Reference Analysis Banner */}
                {ocrData.area_discrepancy_sqm && ocrData.area_discrepancy_sqm > 0 ? (
                  <div className="rounded border-l-4 border-l-brick bg-brick/10 p-3 text-xs mb-5">
                    <div className="font-bold text-brick flex items-center gap-1.5">
                      <span>⚠️ Cadastral Area Discrepancy Detected</span>
                    </div>
                    <p className="mt-1 text-ink/80 leading-relaxed">
                      Deed records <strong>{formData.area} sqm</strong>, but georeferenced GIS
                      survey polygon measures <strong>{ocrData.cadastral_survey_area} sqm</strong>.
                      Variance: <span className="font-bold text-brick">+{ocrData.area_discrepancy_sqm} sqm</span>.
                    </p>
                  </div>
                ) : (
                  <div className="rounded border-l-4 border-l-land bg-land/10 p-3 text-xs mb-5">
                    <div className="font-bold text-land flex items-center gap-1.5">
                      <span>✓ Exact Cadastral Alignment</span>
                    </div>
                    <p className="mt-1 text-ink/80 leading-relaxed">
                      Deed area ({formData.area} sqm) aligns with digitized GIS polygon boundary.
                    </p>
                  </div>
                )}

                {/* Interactive Editable Form */}
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block font-mono text-[11px] font-semibold text-ink/70 uppercase mb-1">
                      Registered Owner / Pattadhar Name
                    </label>
                    <input
                      type="text"
                      value={formData.owner}
                      onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                      className="w-full rounded-sm bg-white/80 p-2.5 plot-border text-ink font-medium text-sm outline-none focus:border-ink"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-mono text-[11px] font-semibold text-ink/70 uppercase mb-1">
                        Survey / Khasra No.
                      </label>
                      <input
                        type="text"
                        value={formData.survey_no}
                        onChange={(e) => setFormData({ ...formData, survey_no: e.target.value })}
                        className="w-full rounded-sm bg-white/80 p-2.5 plot-border text-ink font-mono text-sm outline-none focus:border-ink"
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-[11px] font-semibold text-ink/70 uppercase mb-1">
                        Total Extracted Area (sqm)
                      </label>
                      <input
                        type="number"
                        value={formData.area}
                        onChange={(e) => setFormData({ ...formData, area: Number(e.target.value) })}
                        className="w-full rounded-sm bg-white/80 p-2.5 plot-border text-ink font-mono text-sm outline-none focus:border-ink"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {ocrData.state === "Tamil Nadu" ? (
                      <div>
                        <label className="block font-mono text-[11px] font-semibold text-ink/70 uppercase mb-1">
                          Patta Number
                        </label>
                        <input
                          type="text"
                          value={formData.patta_no}
                          onChange={(e) => setFormData({ ...formData, patta_no: e.target.value })}
                          className="w-full rounded-sm bg-white/80 p-2.5 plot-border text-ink font-mono text-sm outline-none focus:border-ink"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block font-mono text-[11px] font-semibold text-ink/70 uppercase mb-1">
                          Khewat / Khatauni No.
                        </label>
                        <input
                          type="text"
                          value={formData.khewat_no}
                          onChange={(e) => setFormData({ ...formData, khewat_no: e.target.value })}
                          className="w-full rounded-sm bg-white/80 p-2.5 plot-border text-ink font-mono text-sm outline-none focus:border-ink"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block font-mono text-[11px] font-semibold text-ink/70 uppercase mb-1">
                        Jurisdiction / State
                      </label>
                      <input
                        type="text"
                        disabled
                        value={ocrData.state ?? "Punjab"}
                        className="w-full rounded-sm bg-ink/5 p-2.5 plot-border text-ink/70 font-medium text-sm cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-mono text-[11px] font-semibold text-ink/70 uppercase mb-1">
                      Surveyor Verification Notes
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Verified against original Jamabandi register volume 24..."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full rounded-sm bg-white/80 p-2.5 plot-border text-ink text-sm outline-none focus:border-ink placeholder:text-ink/40"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons: Confirm & Sync vs Flag Mismatch */}
              <div className="mt-8 pt-5 border-t border-ink/15 flex flex-col sm:flex-row gap-3">
                <button
                  disabled={submittingAction}
                  onClick={() => handleVerificationDecision("confirmed")}
                  className="flex-1 rounded-sm bg-land px-4 py-3 text-center text-sm font-semibold text-parchment hover:bg-land-light transition disabled:opacity-50 shadow"
                >
                  {submittingAction ? "Hashing & Syncing..." : "✓ Confirm & Sync to Cadastre"}
                </button>
                <button
                  disabled={submittingAction}
                  onClick={() => handleVerificationDecision("flagged_mismatch")}
                  className="flex-1 rounded-sm border border-brick bg-brick/10 px-4 py-3 text-center text-sm font-semibold text-brick hover:bg-brick/20 transition disabled:opacity-50"
                >
                  {submittingAction ? "Hashing..." : "⚠️ Flag Mismatch to Officer Queue"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* STAGE 4: SHA-256 Tamper-Evident Audit Hash Receipt */}
      {/* =================================================================== */}
      {stage === "submitted" && auditReceipt && (
        <div className="plot-border bg-parchment p-8 shadow-[5px_5px_0_rgba(20,33,61,0.18)]">
          <div className="mx-auto max-w-xl text-center">
            <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-land/10 border-2 border-land text-land text-2xl font-bold">
              ✓
            </div>

            <h3 className="font-serif text-2xl font-semibold text-ink mt-3">
              Tamper-Evident Audit Hash Committed
            </h3>
            <p className="mt-1 text-sm text-ink/70">
              {auditReceipt.action_summary}
            </p>

            {/* Cryptographic Hash Card */}
            <div className="mt-6 rounded-sm bg-ink p-5 text-left text-parchment font-mono text-xs shadow-inner space-y-2">
              <div className="flex items-center justify-between border-b border-parchment/15 pb-2 text-[11px] text-ochre">
                <span>STATUS: {auditReceipt.status.toUpperCase()}</span>
                <span>SHA-256 CHAINED PROVENANCE</span>
              </div>
              <div>
                <span className="text-parchment/50 block text-[10px]">RECORD AUDIT HASH:</span>
                <span className="font-bold text-ochre-light break-all select-all">
                  {auditReceipt.audit_hash}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-parchment/60 pt-1">
                <span>TIMESTAMP: {auditReceipt.timestamp}</span>
                <span>SIGNER: OFF-102</span>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={resetUpload}
                className="w-full sm:w-auto rounded-sm bg-ink px-5 py-2.5 text-xs font-semibold text-parchment hover:bg-ink-light transition"
              >
                Ingest Another Document
              </button>
              <a
                href={`/parcel/${ocrData?.ulpid ?? "PB-LDH-0042"}`}
                className="w-full sm:w-auto rounded-sm border border-ink/20 px-5 py-2.5 text-xs font-semibold text-ink hover:bg-ink/5 transition text-center"
              >
                Inspect Live Cadastral Deed Record →
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

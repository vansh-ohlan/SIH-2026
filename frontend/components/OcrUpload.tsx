"use client";

import { useState, useEffect, useRef } from "react";
import { extractOcr, getDecisionSupport, postMutationDecision } from "@/lib/api";
import { OcrResult, DecisionSupportReport, DecisionSupportFinding } from "@/lib/types";
import {
  FileCheck2,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Copy,
  Check,
  Hash,
  HelpCircle,
  Loader2,
  FileText,
  Info,
} from "lucide-react";

type UploadStage = "idle" | "processing" | "verified" | "submitted";

interface StepInfo {
  step: number;
  label: string;
  description: string;
}

const PIPELINE_STEPS: StepInfo[] = [
  {
    step: 1,
    label: "Scanning layout and resolution...",
    description: "Detecting document skew, seal locations, column boundaries, and text clarity",
  },
  {
    step: 2,
    label: "Extracting regional RoR terminology...",
    description: "Parsing Khewat / Khatauni / Khasra numbers for Punjab, Patta / Chitta for Tamil Nadu",
  },
  {
    step: 3,
    label: "Generating explainable decision support...",
    description: "Reconciling extracted fields against PostGIS parcel database and cadastral survey geometry",
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
  const [decisionReport, setDecisionReport] = useState<DecisionSupportReport | null>(null);
  const [formData, setFormData] = useState<{
    owner: string;
    survey_no: string;
    area: number;
    khewat_no?: string;
    patta_no?: string;
    notes: string;
    decision: "approved" | "rejected" | "needs_review";
  }>({
    owner: "",
    survey_no: "",
    area: 0,
    khewat_no: "",
    patta_no: "",
    notes: "Verified extracted fields against ground survey and historical Jamabandi volume.",
    decision: "needs_review",
  });
  const [auditReceipt, setAuditReceipt] = useState<{
    status: string;
    audit_hash: string;
    timestamp: string;
    action_summary: string;
  } | null>(null);
  const [submittingAction, setSubmittingAction] = useState<boolean>(false);
  const [highlightedField, setHighlightedField] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Trigger multi-step AI pipeline progression
  const runPipeline = async (
    fileArg: File | { name: string; preset?: "punjab_jamabandi" | "tamil_nadu_patta" | "blurry_ror" | "owner_mismatch" },
    displayName: string,
    displaySize: string
  ) => {
    setFileDetails({ name: displayName, size: displaySize });
    setStage("processing");
    setCurrentStep(0);
    setProgress(15);

    // Step 1: Scanning layout
    await new Promise((r) => setTimeout(r, 550));
    setCurrentStep(1);
    setProgress(45);

    // Step 2: Regional extraction
    await new Promise((r) => setTimeout(r, 650));
    setCurrentStep(2);
    setProgress(75);

    // Step 3: Cadastral cross-referencing & Decision Support
    const result = await extractOcr(fileArg);
    await new Promise((r) => setTimeout(r, 500));
    setCurrentStep(3);
    setProgress(100);

    await new Promise((r) => setTimeout(r, 300));
    if (result) {
      setOcrData(result);
      const targetUlpid = result.ulpid || "PB-LDH-0042";

      // Call decision support engine
      const report = await getDecisionSupport(targetUlpid, result);
      setDecisionReport(report);

      setFormData({
        owner: result.owner,
        survey_no: result.survey_no,
        area: result.area,
        khewat_no: result.khewat_no || "",
        patta_no: result.patta_no || "",
        notes: report.anomalies.length > 0
          ? `Discrepancy flagged: ${report.anomalies.map((a) => a.description).join("; ")}`
          : "Verified against original Jamabandi register. No anomalies detected.",
        decision: report.recommended_review_status === "approved_candidate" ? "approved" : "needs_review",
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

  const handleOfficerSubmission = async () => {
    if (!ocrData) return;
    setSubmittingAction(true);

    try {
      const targetUlpid = ocrData.ulpid || "PB-LDH-0042";
      const receipt = await postMutationDecision(targetUlpid, {
        decision: formData.decision,
        officer_id: "OFF-102",
        notes: formData.notes,
      });

      setAuditReceipt({
        status: receipt.status,
        audit_hash: receipt.audit_hash,
        timestamp: receipt.timestamp,
        action_summary: `Mutation decision (${formData.decision.toUpperCase().replace("_", " ")}) sealed in PostgreSQL ledger for ${targetUlpid}.`,
      });
      setStage("submitted");
      onVerificationComplete?.(targetUlpid);
    } catch (err: any) {
      alert(`Error submitting mutation: ${err?.message || "Unknown error"}`);
    } finally {
      setSubmittingAction(false);
    }
  };

  const resetUpload = () => {
    setStage("idle");
    setCurrentStep(0);
    setProgress(0);
    setFileDetails(null);
    setOcrData(null);
    setDecisionReport(null);
    setAuditReceipt(null);
    setHighlightedField(null);
  };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
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

            <div className="mt-4 flex items-center gap-2">
              <span className="font-mono text-xs text-ochre-dark font-bold uppercase tracking-wider">
                DOCUMENT INTELLIGENCE &amp; AI DECISION SUPPORT
              </span>
              <span className="rounded bg-ochre/20 px-2 py-0.5 text-[10px] font-mono font-bold text-ink">
                Prototype OCR / Demo Processing
              </span>
            </div>

            <h3 className="mt-2 font-serif text-2xl font-semibold text-ink">
              Cadastral RoR Ingestion &amp; Verification Desk
            </h3>
            <p className="mt-1 max-w-xl text-xs sm:text-sm text-ink/70">
              Upload scanned Jamabandi, Patta/Chitta, or Deed records.
              The pipeline extracts structured land parameters, reconciles against the PostGIS
              database, and generates explainable anomaly decision support for the officer.
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
                  Supports scanned PDF, PNG, JPG, or TIFF (Max 10 MB)
                </span>
              </div>
            </div>

            {/* Quick Demo Pre-load Buttons */}
            <div className="mt-6 flex flex-col items-center gap-2">
              <span className="font-mono text-xs text-ink/50 uppercase tracking-wider">
                Or test with sample case fixtures:
              </span>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={() =>
                    runPipeline(
                      { name: "Punjab_Jamabandi_PB-LDH-0042.pdf", preset: "punjab_jamabandi" },
                      "Punjab_Jamabandi_PB-LDH-0042.pdf",
                      "420 KB"
                    )
                  }
                  className="rounded-sm border border-ink/20 bg-parchment-dark/70 px-3 py-1.5 text-xs font-medium text-ink hover:bg-ink hover:text-parchment transition"
                >
                  🌾 Punjab Jamabandi (Area Mismatch)
                </button>
                <button
                  onClick={() =>
                    runPipeline(
                      { name: "Blurry_LowResolution_Scan.jpg", preset: "blurry_ror" },
                      "Blurry_LowResolution_Scan.jpg",
                      "290 KB"
                    )
                  }
                  className="rounded-sm border border-amber-400 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-600 hover:text-white transition"
                >
                  ⚠️ Blurry Scan (&lt;0.60 Low Confidence)
                </button>
                <button
                  onClick={() =>
                    runPipeline(
                      { name: "Mismatched_Owner_Deed.pdf", preset: "owner_mismatch" },
                      "Mismatched_Owner_Deed.pdf",
                      "350 KB"
                    )
                  }
                  className="rounded-sm border border-brick/40 bg-brick/10 px-3 py-1.5 text-xs font-medium text-brick hover:bg-brick hover:text-white transition"
                >
                  ⚠️ Mismatched Titleholder
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
                  📜 Tamil Nadu Patta (Clean Match)
                </button>
              </div>
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
                  Document Intelligence Active
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
                <span>Inference &amp; Cross-Check Pipeline</span>
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
              {PIPELINE_STEPS.map((stepItem) => {
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
      {/* STAGE 3: Document Verification, Explainable Decision Support & Adjudication */}
      {/* =================================================================== */}
      {stage === "verified" && ocrData && (
        <div className="plot-border bg-parchment shadow-[5px_5px_0_rgba(20,33,61,0.18)] space-y-0">
          {/* Top Status Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-ink/15 bg-white/40 px-6 py-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-ink/50">
                  OFFICER VERIFICATION DESK
                </span>
                <span className="rounded-full border border-land/50 bg-land/10 px-2.5 py-0.5 text-xs font-medium text-land">
                  Parsed: {ocrData.record_type || "Jamabandi (RoR)"}
                </span>
                <span className="rounded bg-ochre/20 px-2 py-0.5 text-[10px] font-mono font-bold text-ink">
                  Rule-based prototype decision support
                </span>
              </div>
              <h3 className="font-serif text-2xl font-semibold text-ink mt-0.5">
                Record of Rights Verification &amp; Statutory Adjudication
              </h3>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={resetUpload}
                className="rounded-sm border border-ink/20 px-3 py-1.5 text-xs font-medium text-ink hover:bg-ink/5 transition"
              >
                ← Ingest Another Document
              </button>
            </div>
          </div>

          {/* Low vs Acceptable Confidence Banner */}
          <div className="px-6 pt-5">
            {ocrData.confidence < 0.60 ? (
              <div className="rounded-lg border-2 border-amber-400 bg-amber-50 p-4 text-amber-950 flex items-start gap-3 shadow-sm">
                <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-sm text-amber-900 flex items-center gap-2">
                    <span>Manual verification required</span>
                    <span className="bg-amber-200 text-amber-900 font-mono text-xs px-2 py-0.5 rounded">
                      Confidence: {(ocrData.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-xs text-amber-900/90 leading-relaxed">
                    OCR extraction confidence is below 60.0% due to scan artifacts or resolution limits.
                    The document is <strong>not automatically rejected</strong>; please review and correct the extracted values in the form below before statutory adjudication.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-land/40 bg-land/10 p-3.5 text-ink flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-land shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="font-bold text-xs text-land flex items-center gap-2">
                    <span>Extraction confidence acceptable for review</span>
                    <span className="font-mono font-bold text-ink text-[11px]">
                      ({(ocrData.confidence * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <p className="text-[11px] text-ink/70">
                    Document quality is clear. AI provides advisory decision support; authorized government officers hold final legal authority.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Split Screen Container */}
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-ink/15 p-6 gap-6 lg:gap-0">
            {/* ============================================================= */}
            {/* LEFT SIDE: Deed Preview & Structured Extracted Fields */}
            {/* ============================================================= */}
            <div className="lg:col-span-6 lg:pr-6 space-y-6">
              <div>
                <div className="flex items-center justify-between text-xs text-ink/60 mb-2">
                  <span className="font-mono uppercase font-semibold">1. Extracted Document Fields</span>
                  <span className="text-[11px] font-mono">File: {fileDetails?.name}</span>
                </div>

                {/* Simulated Scanned Sheet */}
                <div className="rounded-lg bg-[#FAF8EE] p-5 shadow-sm border border-ink/20 font-mono text-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-ink/15 pb-2">
                    <div>
                      <div className="text-[10px] uppercase text-ink/50 font-mono">Document Title</div>
                      <div className="font-bold text-ink">{ocrData.record_type || "Jamabandi (RoR)"}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase text-ink/50 font-mono">Target ULPID</div>
                      <div className="font-bold text-ochre-dark">{ocrData.ulpid || "PB-LDH-0042"}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="bg-white/70 p-2.5 rounded border border-ink/10">
                      <span className="text-ink/50 text-[10px] block">EXTRACTED OWNER:</span>
                      <span className="font-bold text-ink text-xs">{formData.owner}</span>
                    </div>
                    <div className="bg-white/70 p-2.5 rounded border border-ink/10">
                      <span className="text-ink/50 text-[10px] block">SURVEY / KHASRA NO:</span>
                      <span className="font-bold text-ink text-xs">{formData.survey_no || "N/A (Missing)"}</span>
                    </div>
                    <div className="bg-white/70 p-2.5 rounded border border-ink/10">
                      <span className="text-ink/50 text-[10px] block">EXTRACTED AREA:</span>
                      <span className="font-bold text-ink text-xs">{formData.area.toLocaleString()} sqm</span>
                    </div>
                    <div className="bg-white/70 p-2.5 rounded border border-ink/10">
                      <span className="text-ink/50 text-[10px] block">EXTRACTION CONFIDENCE:</span>
                      <span className="font-bold text-ink text-xs">{(ocrData.confidence * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Editable Form for Officer Verification */}
              <div className="bg-white/60 p-5 rounded-lg border border-ink/15 space-y-4 text-xs">
                <div className="font-bold text-ink text-xs uppercase font-mono flex items-center gap-1.5">
                  <FileCheck2 className="w-4 h-4 text-ochre-dark" />
                  <span>2. Verify / Correct Document Parameters</span>
                </div>

                <div>
                  <label className="block font-mono text-[11px] font-semibold text-ink/70 uppercase mb-1">
                    Titleholder Name
                  </label>
                  <input
                    type="text"
                    value={formData.owner}
                    onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                    className="w-full rounded bg-white p-2.5 plot-border text-ink font-medium text-xs focus:outline-none focus:border-ink"
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
                      className="w-full rounded bg-white p-2.5 plot-border text-ink font-mono text-xs focus:outline-none focus:border-ink"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[11px] font-semibold text-ink/70 uppercase mb-1">
                      Stated Extent Area (sqm)
                    </label>
                    <input
                      type="number"
                      value={formData.area}
                      onChange={(e) => setFormData({ ...formData, area: Number(e.target.value) })}
                      className="w-full rounded bg-white p-2.5 plot-border text-ink font-mono text-xs focus:outline-none focus:border-ink"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ============================================================= */}
            {/* RIGHT SIDE: Explainable Anomaly Cards & Statutory Adjudication */}
            {/* ============================================================= */}
            <div className="lg:col-span-6 lg:pl-6 space-y-6">
              {/* Explainable Decision Support Findings */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs uppercase font-semibold text-ink/70">
                    3. Cross-Data Validation Findings
                  </span>
                  <span className="text-[10px] font-mono text-ink/50">
                    {decisionReport?.anomalies.length || 0} Issue(s) Flagged
                  </span>
                </div>

                {decisionReport?.anomalies && decisionReport.anomalies.length > 0 ? (
                  <div className="space-y-3">
                    {decisionReport.anomalies.map((item, idx) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-lg border text-xs space-y-2 ${
                          item.severity === "high"
                            ? "bg-brick/10 border-brick/30 text-brick-dark"
                            : item.severity === "medium"
                            ? "bg-amber-50 border-amber-300 text-amber-950"
                            : "bg-ink/5 border-ink/20 text-ink"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs uppercase flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>{item.type.replace(/_/g, " ")}</span>
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              item.severity === "high"
                                ? "bg-brick/20 text-brick"
                                : item.severity === "medium"
                                ? "bg-amber-200 text-amber-900 border border-amber-400"
                                : "bg-ink/10 text-ink"
                            }`}
                          >
                            Severity: {item.severity}
                          </span>
                        </div>

                        <p className="font-medium leading-snug">{item.description}</p>

                        {/* Explainability Breakdown */}
                        <div className="pt-2 border-t border-ink/10 space-y-1 text-[11px] font-mono">
                          <div>
                            <strong className="text-ink/60 font-sans font-semibold">What was compared: </strong>
                            <span>{item.what_compared}</span>
                          </div>
                          <div>
                            <strong className="text-ink/60 font-sans font-semibold">What differs: </strong>
                            <span className="font-bold">{item.what_differs}</span>
                          </div>
                          <div>
                            <strong className="text-ink/60 font-sans font-semibold">Why flagged: </strong>
                            <span className="text-ink/80 font-sans">{item.why_flagged}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-land/10 border border-land/30 rounded-lg p-4 text-xs text-land space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>All Cross-Data Checks Aligned</span>
                    </div>
                    <p className="text-ink/75 text-[11px]">
                      Document fields match official PostGIS registry and digitized cadastral survey extents.
                    </p>
                  </div>
                )}
              </div>

              {/* Statutory Adjudication Form */}
              <div className="bg-white/70 p-5 rounded-lg border border-ink/20 space-y-4 text-xs">
                <div className="font-bold text-ink text-xs uppercase font-mono flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-ochre-dark" />
                  <span>4. Statutory Adjudication Determination</span>
                </div>

                {/* Decision Options */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "needs_review", label: "Needs Review", icon: Clock },
                    { id: "approved", label: "Approve", icon: CheckCircle2 },
                    { id: "rejected", label: "Reject", icon: XCircle },
                  ].map((opt) => {
                    const active = formData.decision === opt.id;
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, decision: opt.id as any })}
                        className={`p-2.5 rounded border text-center transition-all flex flex-col items-center gap-1 ${
                          active
                            ? "bg-ink text-parchment border-ink font-bold shadow-sm"
                            : "bg-parchment border-ink/20 text-ink hover:border-ink/50"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-[11px]">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div>
                  <label className="block font-mono text-[11px] font-semibold text-ink/70 uppercase mb-1">
                    Officer Verification Notes (Mandatory)
                  </label>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full rounded bg-white p-2.5 plot-border text-ink text-xs focus:outline-none focus:border-ink leading-relaxed"
                    placeholder="Enter statutory verification findings..."
                    required
                  />
                </div>

                <button
                  type="button"
                  disabled={submittingAction}
                  onClick={handleOfficerSubmission}
                  className="w-full rounded-md bg-ink py-3 text-center text-xs font-bold text-parchment hover:bg-ink-light transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {submittingAction ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Recording Statutory Decision &amp; Hashing…</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-ochre" />
                      <span>Submit Statutory Decision &amp; Seal SHA-256 Hash</span>
                    </>
                  )}
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
          <div className="mx-auto max-w-xl text-center space-y-4">
            <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-land/10 border-2 border-land text-land text-2xl font-bold">
              ✓
            </div>

            <h3 className="font-serif text-2xl font-semibold text-ink">
              Tamper-Evident Audit Hash Committed
            </h3>
            <p className="text-xs text-ink/70">
              {auditReceipt.action_summary}
            </p>

            {/* Cryptographic Hash Card */}
            <div className="rounded-sm bg-ink p-5 text-left text-parchment font-mono text-xs shadow-inner space-y-2.5">
              <div className="flex items-center justify-between border-b border-parchment/15 pb-2 text-[11px] text-ochre">
                <span>STATUS: {auditReceipt.status.toUpperCase()}</span>
                <span>SHA-256 CHAINED PROVENANCE</span>
              </div>
              <div>
                <span className="text-parchment/50 block text-[10px]">RECORD AUDIT HASH:</span>
                <span className="font-bold text-ochre-light break-all select-all font-mono">
                  {auditReceipt.audit_hash}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-parchment/60 pt-1">
                <span>TIMESTAMP: {auditReceipt.timestamp}</span>
                <button
                  onClick={() => copyHash(auditReceipt.audit_hash)}
                  className="text-ochre hover:underline flex items-center gap-1 font-mono text-[10px]"
                >
                  {copiedHash ? <Check className="w-3 h-3 text-land" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedHash ? "Copied" : "Copy Hash"}</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={resetUpload}
                className="w-full sm:w-auto rounded bg-ink px-5 py-2.5 text-xs font-semibold text-parchment hover:bg-ink-light transition"
              >
                Ingest Another Document
              </button>
              <a
                href={`/citizen/parcel/${ocrData?.ulpid ?? "PB-LDH-0042"}`}
                className="w-full sm:w-auto rounded border border-ink/20 px-5 py-2.5 text-xs font-semibold text-ink hover:bg-ink/5 transition text-center"
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

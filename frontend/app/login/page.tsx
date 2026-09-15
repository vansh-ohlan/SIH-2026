"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/authContext";
import { UserRole } from "@/lib/types";
import {
  UserCheck,
  ShieldCheck,
  Building,
  FileCheck2,
  Lock,
  ArrowRight,
  Info,
  Loader2,
  CheckCircle2,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { user, role: currentRole, login, isLoading } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole>("revenue_officer");
  const [customName, setCustomName] = useState("");
  const [customId, setCustomId] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const roleOptions: {
    role: UserRole;
    title: string;
    description: string;
    defaultId: string;
    defaultName: string;
    icon: any;
    badgeColor: string;
    permissions: string[];
  }[] = [
    {
      role: "citizen",
      title: "Citizen / Landholder",
      description: "Public access for titleholders, buyers, and surveyors to inspect parcels and cadastral maps.",
      defaultId: "CIT-101",
      defaultName: "Citizen User",
      icon: UserCheck,
      badgeColor: "bg-ink/10 text-ink border-ink/20",
      permissions: ["Search & View Parcels", "Inspect GIS Boundaries", "View Public Inconsistencies", "Read Only"],
    },
    {
      role: "revenue_officer",
      title: "Revenue Officer (Patwari / Tehsildar)",
      description: "Adjudicates land mutation requests, reviews spatial conflict flags, and seals determinations.",
      defaultId: "OFF-102",
      defaultName: "Officer Sharma",
      icon: FileCheck2,
      badgeColor: "bg-ochre/20 text-ochre-dark border-ochre/30",
      permissions: ["View All Parcels", "Review Conflict Matrix", "Submit Mutation Decisions", "SHA-256 Audit Signing"],
    },
    {
      role: "registrar",
      title: "Sub-Registrar (NGDRS / IGRS)",
      description: "Deed registration authority verifying transaction validity against PostGIS spatial cadastre.",
      defaultId: "REG-201",
      defaultName: "Sub-Registrar Verma",
      icon: Building,
      badgeColor: "bg-land/20 text-land border-land/30",
      permissions: ["Deed Registration Review", "Title Mutation Approval", "Spatial Consistency Check", "Audit Ledger Access"],
    },
    {
      role: "admin",
      title: "System Administrator",
      description: "Full administrative public infrastructure configuration, audit inspections, and overrides.",
      defaultId: "ADM-999",
      defaultName: "System Administrator",
      icon: ShieldCheck,
      badgeColor: "bg-brick/20 text-brick border-brick/30",
      permissions: ["All Officer Permissions", "System Configuration", "Full Ledger Override", "Audit Log Inspection"],
    },
  ];

  const handleLogin = async (roleToLogin: UserRole) => {
    setLoggingIn(true);
    try {
      await login(roleToLogin, {
        userId: customId || undefined,
        name: customName || undefined,
      });

      if (roleToLogin === "citizen") {
        router.push("/citizen");
      } else {
        router.push("/officer");
      }
    } catch (err) {
      console.error("Login failed:", err);
    } finally {
      setLoggingIn(false);
    }
  };

  return (
    <main className="min-h-screen bg-parchment flex flex-col justify-between">
      <Navbar />

      <div className="mx-auto max-w-4xl px-6 py-12 w-full">
        {/* Header */}
        <div className="text-center max-w-xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 font-mono text-xs font-semibold text-ochre-dark uppercase mb-2">
            <Lock className="w-3.5 h-3.5" />
            <span>DEVELOPMENT AUTHENTICATION</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink">
            Prototype Role Switcher
          </h1>
          <p className="text-xs text-ink/70 mt-2 leading-relaxed">
            Select a stakeholder persona to demonstrate role-based access control (RBAC),
            authenticated mutation adjudication, and public citizen verification.
          </p>
        </div>

        {/* 4 Role Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {roleOptions.map((opt) => {
            const isSelected = selectedRole === opt.role;
            const isCurrent = user?.role === opt.role;
            const Icon = opt.icon;

            return (
              <div
                key={opt.role}
                onClick={() => setSelectedRole(opt.role)}
                className={`p-6 rounded-xl cursor-pointer transition-all border-2 flex flex-col justify-between ${
                  isSelected
                    ? "bg-parchment-dark/60 border-ink shadow-md"
                    : "bg-parchment border-ink/15 hover:border-ink/40 hover:shadow-sm"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-ink text-parchment flex items-center justify-center font-bold">
                        <Icon className="w-5 h-5 text-ochre" />
                      </div>
                      <div>
                        <h3 className="font-serif font-bold text-base text-ink">
                          {opt.title}
                        </h3>
                        <div className="font-mono text-[10px] text-ink/50">
                          {opt.defaultId} · {opt.defaultName}
                        </div>
                      </div>
                    </div>

                    {isCurrent && (
                      <span className="text-[10px] bg-land/20 text-land border border-land/30 px-2 py-0.5 rounded-full font-bold">
                        Active
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-ink/70 leading-relaxed mb-4">
                    {opt.description}
                  </p>

                  <div className="space-y-1.5 border-t border-ink/10 pt-3 text-[11px] text-ink/80">
                    {opt.permissions.map((perm, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-ochre-dark shrink-0" />
                        <span>{perm}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-ink/10">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLogin(opt.role);
                    }}
                    disabled={loggingIn}
                    className={`w-full py-2.5 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      isSelected
                        ? "bg-ink text-parchment hover:bg-ink-light"
                        : "bg-parchment border border-ink/20 text-ink hover:bg-ink hover:text-parchment"
                    }`}
                  >
                    {loggingIn && selectedRole === opt.role ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Authenticating with JWT…</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In as {opt.title.split(" ")[0]}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Prototype Disclaimer Card */}
        <div className="bg-ink/5 border border-ink/10 rounded-xl p-5 text-xs text-ink/75 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-ink">
            <Info className="w-4 h-4 text-ochre-dark" />
            <span>SIH 2026 Prototype Authentication Architecture</span>
          </div>
          <p className="leading-relaxed">
            This prototype uses standard JWT Bearer token generation via the backend development endpoint (<code>POST /api/auth/dev-token</code>). In a live deployment, this gateway interfaces with MeriPehchaan (National SSO) and state revenue departmental SSO. Aadhaar and DigiLocker credentials are intentionally omitted for SIH compliance.
          </p>
        </div>
      </div>

      <footer className="border-t border-ink/10 py-6 px-6 text-xs text-ink/50 text-center">
        Bhu-Setu · SIH 2026 — Integrated GIS based Digital Public Infrastructure for Land Governance
      </footer>
    </main>
  );
}

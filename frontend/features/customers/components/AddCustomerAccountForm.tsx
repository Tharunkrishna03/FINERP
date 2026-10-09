"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "@/services/toast";
import { Button } from "@/components/ui/Button";
import Loader from "@/components/ui/Loader";
import { fetchApi } from "@/services/api/client";
import type { Customer, CustomerProfile } from "../types/customer.types";

const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

export default function AddCustomerAccountForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const profileId = searchParams.get("profileId");
  const accountId = searchParams.get("accountId");
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [sno, setSno] = useState("");
  const [ano, setAno] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [interestRate, setInterestRate] = useState("2.5");
  const [tenure, setTenure] = useState("12");
  const [itemType, setItemType] = useState("");
  const [metalType, setMetalType] = useState("");
  const [purity, setPurity] = useState("");
  const [weight, setWeight] = useState("");
  const [numStones, setNumStones] = useState("0");
  const [remark, setRemark] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);

  useEffect(() => {
    if (!profileId && !accountId) {
      toast.warning("Select a customer before adding an account.");
      router.replace("/customer-list");
      return;
    }
    let cancelled = false;
    const load = async () => {
      let customerProfileId = profileId;
      if (accountId) {
        const accountResponse = await fetchApi(`/api/customers/${accountId}/`);
        if (!accountResponse.ok) throw new Error("Unable to load this account.");
        const account: Customer = await accountResponse.json();
        if (!account.profile) throw new Error("This account is not linked to a customer profile.");
        customerProfileId = String(account.profile);
        if (!cancelled) {
          setSno(account.sno || "");
          setAno(account.ano || "");
          setAmount(account.amount || "");
          setDate(account.date || today());
          setInterestRate(account.interest_rate || "2.5");
          setTenure(String(account.tenure || 12));
          setItemType(account.item_type || "");
          setMetalType(account.metal_type || "");
          setPurity(account.purity || "");
          setWeight(account.weight || "");
          setNumStones(String(account.num_stones ?? 0));
          setRemark(account.remark || "");
        }
      } else {
        const profileSettingsRes = await fetchApi("/api/profile/");
        if (profileSettingsRes.ok) {
          const profileSettings = await profileSettingsRes.json();
          if (!cancelled) {
            setSno(profileSettings.next_sno || "");
            setAno(profileSettings.next_ano || "");
          }
        }
      }
      const response = await fetchApi(`/api/customer-profiles/${customerProfileId}/`);
      if (!response.ok) throw new Error("Unable to load this customer.");
      const data: CustomerProfile = await response.json();
      if (!cancelled) setProfile(data);
    };
    load()
      .catch(() => {
        toast.warning("Unable to load this customer. Try again.");
        router.replace("/customer-list");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accountId, profileId, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile || (!profileId && !accountId)) return;
    setSaving(true);
    try {
      const form = new FormData();
      form.append("profile", String(profile.id));
      form.append("customer_name", profile.customer_name);
      form.append("guardian_name", profile.guardian_name);
      form.append("customer_id_no", profile.customer_id_no || "");
      form.append("phone", profile.phone);
      form.append("address", profile.address || "");
      if (sno) form.append("sno", sno);
      if (ano) form.append("ano", ano);
      form.append("amount", amount);
      form.append("date", date);
      form.append("interest_rate", interestRate);
      form.append("tenure", tenure);
      form.append("item_type", itemType);
      form.append("metal_type", metalType);
      form.append("purity", purity);
      form.append("weight", weight);
      form.append("num_stones", numStones);
      form.append("remark", remark);
      if (photo) form.append("photo", photo);

      const response = await fetchApi(accountId ? `/api/customers/${accountId}/` : "/api/customers/", {
        method: accountId ? "PATCH" : "POST",
        body: form,
      });
      if (!response.ok) {
        toast.warning("Unable to save this account. Check the details and try again.");
        return;
      }
      const account: { id: number } = await response.json();
      toast.success(accountId ? "Account updated." : "Account added.");
      router.push(`/transaction/${account.id}`);
    } catch {
      toast.warning("Service is temporarily unavailable. Try again shortly.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;
  if (!profile) return null;

  return (
    <div>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <h1 className="text-blue-600 font-normal text-base" style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <Link href="/dashboard" className="breadcrumb-link">Dashboard</Link>
          <span>/</span>
          <Link href="/customer-list" className="breadcrumb-link">Customer List</Link>
          <span>/</span>
          <span className="breadcrumb-active">{accountId ? "Edit Account" : "Add Account"}</span>
        </h1>
      </div>

      {/* Customer Info Card */}
      <div
        className="card"
        style={{
          width: "100%",
          marginBottom: 24,
          padding: "20px 24px",
          borderRadius: 16,
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "#e0f2fe", color: "#0284c7", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
              {profile.customer_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ color: "#64748b", fontSize: 12, fontWeight: 500 }}>Selected Customer</div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>{profile.customer_name}</h2>
              <div style={{ color: "#64748b", fontSize: 13, marginTop: 2 }}>
                {profile.customer_id_no || "No customer ID"} · {profile.phone}
              </div>
            </div>
          </div>
          <div style={{ color: "#475569", fontSize: 13, textAlign: "left" }}>
            <div style={{ fontWeight: 600 }}>{profile.guardian_name}</div>
            {profile.address && <div style={{ color: "#64748b" }}>{profile.address}</div>}
          </div>
        </div>
      </div>

      {/* Account Details Form Card */}
      <form className="card" onSubmit={handleSubmit} style={{ width: "100%", padding: "32px", borderRadius: 16 }}>
        {/* Form Card Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28, borderBottom: "1px solid #e2e8f0", paddingBottom: 18 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
              <rect x="2" y="5" width="20" height="14" rx="2"></rect>
              <line x1="2" y1="10" x2="22" y2="10"></line>
            </svg>
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#0f172a" }}>
              {accountId ? "Edit Loan Account" : "Add Loan Account"}
            </h2>
          </div>
        </div>

        {/* Section 1: Loan Details */}
        <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#334155", display: "flex", alignItems: "center", justifyContent: "flex-start", textAlign: "left", gap: 8 }}>
          <span style={{ width: 6, height: 16, borderRadius: 3, background: "#2563eb", display: "inline-block" }}></span>
          Loan details
        </h3>
        <div className="responsive-form-grid" style={{ gap: "20px", marginBottom: 32 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b", marginBottom: "6px", display: "block" }}>SNO</label>
            <div className="input-wrap">
              <input
                className="input"
                type="text"
                value={sno}
                readOnly
                aria-readonly="true"
                placeholder="Generated SNO"
                style={{ backgroundColor: "#f8fafc", cursor: "not-allowed", color: "#475569", fontWeight: 500, borderRadius: 8 }}
              />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b", marginBottom: "6px", display: "block" }}>ANO</label>
            <div className="input-wrap">
              <input
                className="input"
                type="text"
                value={ano}
                readOnly
                aria-readonly="true"
                placeholder="Generated ANO"
                style={{ backgroundColor: "#f8fafc", cursor: "not-allowed", color: "#475569", fontWeight: 500, borderRadius: 8 }}
              />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b", marginBottom: "6px", display: "block" }}>
              Amount borrowed (Rs.) <span className="required" style={{ color: "#dc2626" }}>*</span>
            </label>
            <div className="input-wrap">
              <input className="input" type="number" min="0.01" step="0.01" required value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Enter amount" style={{ borderRadius: 8 }} />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b", marginBottom: "6px", display: "block" }}>
              Account date <span className="required" style={{ color: "#dc2626" }}>*</span>
            </label>
            <div className="input-wrap">
              <input className="input" type="date" required value={date} onChange={(event) => setDate(event.target.value)} style={{ borderRadius: 8 }} />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b", marginBottom: "6px", display: "block" }}>Monthly interest rate (%)</label>
            <div className="input-wrap">
              <input className="input" type="number" min="0" step="0.01" required value={interestRate} onChange={(event) => setInterestRate(event.target.value)} style={{ borderRadius: 8 }} />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b", marginBottom: "6px", display: "block" }}>Tenure (months)</label>
            <div className="input-wrap">
              <input className="input" type="number" min="1" step="1" required value={tenure} onChange={(event) => setTenure(event.target.value)} style={{ borderRadius: 8 }} />
            </div>
          </div>
        </div>

        {/* Section 2: Jewel Details */}
        <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#334155", display: "flex", alignItems: "center", justifyContent: "flex-start", textAlign: "left", gap: 8 }}>
          <span style={{ width: 6, height: 16, borderRadius: 3, background: "#0284c7", display: "inline-block" }}></span>
          Jewel details
        </h3>
        <div className="responsive-form-grid" style={{ gap: "20px" }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b", marginBottom: "6px", display: "block" }}>
              Item type <span className="required" style={{ color: "#dc2626" }}>*</span>
            </label>
            <div className="input-wrap">
              <input className="input" required value={itemType} onChange={(event) => setItemType(event.target.value)} placeholder="E.g. Necklace" style={{ borderRadius: 8 }} />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b", marginBottom: "6px", display: "block" }}>
              Metal type <span className="required" style={{ color: "#dc2626" }}>*</span>
            </label>
            <div className="input-wrap">
              <input className="input" required value={metalType} onChange={(event) => setMetalType(event.target.value)} placeholder="E.g. Gold" style={{ borderRadius: 8 }} />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b", marginBottom: "6px", display: "block" }}>
              Purity / karat <span className="required" style={{ color: "#dc2626" }}>*</span>
            </label>
            <div className="input-wrap">
              <input className="input" required value={purity} onChange={(event) => setPurity(event.target.value)} placeholder="E.g. 22K" style={{ borderRadius: 8 }} />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b", marginBottom: "6px", display: "block" }}>
              Weight (grams) <span className="required" style={{ color: "#dc2626" }}>*</span>
            </label>
            <div className="input-wrap">
              <input className="input" type="number" min="0" step="0.01" required value={weight} onChange={(event) => setWeight(event.target.value)} style={{ borderRadius: 8 }} />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b", marginBottom: "6px", display: "block" }}>Number of stones</label>
            <div className="input-wrap">
              <input className="input" type="number" min="0" step="1" value={numStones} onChange={(event) => setNumStones(event.target.value)} style={{ borderRadius: 8 }} />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b", marginBottom: "6px", display: "block" }}>Jewel photo</label>
            <div className="input-wrap">
              <input className="input" type="file" accept="image/*" onChange={(event) => setPhoto(event.target.files?.[0] || null)} style={{ borderRadius: 8 }} />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0, gridColumn: "1 / -1" }}>
            <label className="form-label" style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b", marginBottom: "6px", display: "block" }}>Remark</label>
            <div className="input-wrap">
              <textarea className="input" rows={3} value={remark} onChange={(event) => setRemark(event.target.value)} placeholder="Optional notes" style={{ resize: "vertical", height: "auto", padding: "10px 14px", borderRadius: 8 }} />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 32, borderTop: "1px solid #f1f5f9", paddingTop: 20 }}>
          <Button type="button" className="btn btn-secondary" onClick={() => router.push("/customer-list")}>Cancel</Button>
          <Button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : accountId ? "Save Account" : "Create Account"}
          </Button>
        </div>
      </form>
    </div>
  );
}

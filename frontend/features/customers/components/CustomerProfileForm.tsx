"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "@/services/toast";
import { Button } from "@/components/ui/Button";
import Loader from "@/components/ui/Loader";
import { fetchApi } from "@/services/api/client";
import type { CustomerProfile } from "../types/customer.types";

const getTodayDate = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

export type ProfileFields = Pick<CustomerProfile, "customer_name" | "guardian_name" | "phone" | "address"> & {
  customer_id_no?: string | null;
  date?: string;
};

const emptyFields: ProfileFields = {
  customer_name: "",
  guardian_name: "",
  phone: "",
  address: "",
  customer_id_no: "",
  date: getTodayDate(),
};

export interface CustomerProfileFormProps {
  profileId?: string | null;
  onSuccess?: () => void;
  onCancel?: () => void;
  isEmbedded?: boolean;
}

/**
 * Reusable Customer Details Form Fields
 * Can be used inside modals, drawers, or embedded within other forms.
 */
export function CustomerDetailsFormFields({
  fields,
  onChange,
}: {
  fields: ProfileFields;
  onChange: (key: keyof ProfileFields, value: string) => void;
}) {
  return (
    <div className="responsive-form-grid" style={{ gap: "20px" }}>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label" style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b", marginBottom: "6px", display: "block" }}>
          Customer name <span className="required" style={{ color: "#dc2626" }}>*</span>
        </label>
        <div className="input-wrap">
          <input
            type="text"
            className="input"
            required
            value={fields.customer_name}
            onChange={(e) => onChange("customer_name", e.target.value)}
            placeholder="Enter customer full name"
            style={{ borderRadius: 8 }}
          />
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label" style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b", marginBottom: "6px", display: "block" }}>
          Guardian name <span className="required" style={{ color: "#dc2626" }}>*</span>
        </label>
        <div className="input-wrap">
          <input
            type="text"
            className="input"
            required
            value={fields.guardian_name}
            onChange={(e) => onChange("guardian_name", e.target.value)}
            placeholder="Enter guardian or spouse name"
            style={{ borderRadius: 8 }}
          />
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label" style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b", marginBottom: "6px", display: "block" }}>
          Customer ID
        </label>
        <div className="input-wrap">
          <input
            type="text"
            className="input"
            value={fields.customer_id_no || ""}
            readOnly
            aria-readonly="true"
            placeholder="Auto-generated from settings"
            style={{ backgroundColor: "#f8fafc", cursor: "not-allowed", color: "#475569", fontWeight: 500, borderRadius: 8 }}
          />
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label" style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b", marginBottom: "6px", display: "block" }}>
          Date <span className="required" style={{ color: "#dc2626" }}>*</span>
        </label>
        <div className="input-wrap">
          <input
            type="date"
            className="input"
            required
            value={fields.date || getTodayDate()}
            onChange={(e) => onChange("date", e.target.value)}
            style={{ borderRadius: 8 }}
          />
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label" style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b", marginBottom: "6px", display: "block" }}>
          Phone number <span className="required" style={{ color: "#dc2626" }}>*</span>
        </label>
        <div className="input-wrap">
          <input
            type="tel"
            className="input"
            inputMode="numeric"
            maxLength={10}
            pattern="[0-9]{10}"
            required
            value={fields.phone}
            onChange={(e) => onChange("phone", e.target.value.replace(/\D/g, ""))}
            placeholder="10-digit mobile number"
            style={{ borderRadius: 8 }}
          />
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: 0, gridColumn: "1 / -1" }}>
        <label className="form-label" style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b", marginBottom: "6px", display: "block" }}>
          Address
        </label>
        <div className="input-wrap">
          <textarea
            className="input"
            value={fields.address || ""}
            onChange={(e) => onChange("address", e.target.value)}
            placeholder="Enter complete address details"
            rows={3}
            style={{ resize: "vertical", height: "auto", padding: "10px 14px", borderRadius: 8 }}
          />
        </div>
      </div>
    </div>
  );
}

export default function CustomerProfileForm({
  profileId: propProfileId,
  onSuccess,
  onCancel,
  isEmbedded = false,
}: CustomerProfileFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlProfileId = searchParams?.get("profileId");
  const profileId = propProfileId !== undefined ? propProfileId : urlProfileId;

  const [fields, setFields] = useState<ProfileFields>(emptyFields);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (profileId) {
        const response = await fetchApi(`/api/customer-profiles/${profileId}/`);
        if (!response.ok) throw new Error("Unable to load this customer.");
        const profile: CustomerProfile = await response.json();
        if (!cancelled) {
          setFields({
            customer_name: profile.customer_name || "",
            guardian_name: profile.guardian_name || "",
            phone: profile.phone || "",
            address: profile.address || "",
            customer_id_no: profile.customer_id_no || "",
            date: profile.created_at ? profile.created_at.substring(0, 10) : getTodayDate(),
          });
        }
        return;
      }

      const response = await fetchApi("/api/profile/");
      if (!response.ok) throw new Error("Unable to load the customer ID format.");
      const profileSettings = await response.json();
      if (!cancelled) {
        setFields((current) => ({
          ...current,
          customer_id_no: profileSettings.next_customer_id_no || "",
        }));
      }
    };

    load()
      .catch(() => toast.warning("Unable to load this customer. Try again."))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  const update = (key: keyof ProfileFields, value: string) => {
    setFields((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetchApi(
        profileId ? `/api/customer-profiles/${profileId}/` : "/api/customer-profiles/",
        {
          method: profileId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fields),
        }
      );
      if (!response.ok) {
        toast.warning("Unable to save customer details. Check the details and try again.");
        return;
      }
      toast.success(profileId ? "Customer details updated." : "Customer added.");
      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/customer-list");
      }
    } catch {
      toast.warning("Service is temporarily unavailable. Try again shortly.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelClick = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.push("/customer-list");
    }
  };

  if (loading) return <Loader />;

  const formCard = (
    <form className="card" onSubmit={handleSubmit} style={{ width: "100%", padding: "32px", borderRadius: 16 }}>
      {/* Form Card Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28, borderBottom: "1px solid #e2e8f0", paddingBottom: 18 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#0f172a" }}>Customer Details</h2>
        </div>
      </div>

      {/* Reusable Form Fields */}
      <CustomerDetailsFormFields
        fields={fields}
        onChange={update}
      />

      {/* Actions */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 32, borderTop: "1px solid #f1f5f9", paddingTop: 20 }}>
        <Button type="button" className="btn btn-secondary" onClick={handleCancelClick}>
          Cancel
        </Button>
        <Button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : profileId ? "Save Changes" : "Add Customer"}
        </Button>
      </div>
    </form>
  );

  if (isEmbedded) {
    return formCard;
  }

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <h1 className="text-blue-600 font-normal text-base" style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <Link href="/dashboard" className="breadcrumb-link">Dashboard</Link>
          <span>/</span>
          <Link href="/customer-list" className="breadcrumb-link">Customer List</Link>
          <span>/</span>
          <span className="breadcrumb-active">{profileId ? "Edit Customer" : "Add Customer"}</span>
        </h1>
      </div>

      {formCard}
    </div>
  );
}

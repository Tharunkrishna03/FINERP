"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Loader from "@/components/ui/Loader";
import { fetchApi } from "@/services/api/client";
import type { Customer, CustomerProfile } from "../types/customer.types";

const money = (value: string | number | null | undefined) =>
  (Number(value) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function AccountList({ title, accounts, emptyText, onOpen }: {
  title: string;
  accounts: Customer[];
  emptyText: string;
  onOpen: (accountId: number) => void;
}) {
  return (
    <section className="card" style={{ padding: "18px 20px", marginBottom: 16 }}>
      <h2 style={{ margin: "0 0 14px", fontSize: 18 }}>{title}</h2>
      {accounts.length === 0 ? (
        <div style={{ color: "#64748b", padding: "14px 0" }}>{emptyText}</div>
      ) : (
        <div className="table-scroll">
          <table className="data-table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>SNO</th>
                <th>ANO</th>
                <th>Amount borrowed</th>
                <th>Date</th>
                <th>Jewel</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr
                  key={account.id}
                  onClick={() => onOpen(account.id)}
                  style={{ cursor: "pointer" }}
                  className="hover:bg-gray-50"
                >
                  <td>{account.sno || "–"}</td>
                  <td>{account.ano || "–"}</td>
                  <td>Rs. {money(account.amount)}</td>
                  <td>{account.date}</td>
                  <td>{[account.item_type, account.metal_type, account.purity, account.weight ? `${account.weight} g` : ""]
                    .filter(Boolean).join(" · ") || "–"}</td>
                  <td>{account.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function CustomerAccountsPage({ profileId }: { profileId: string }) {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      setLoading(true);
      setLoadFailed(false);
      try {
        const response = await fetchApi(`/api/customer-profiles/${encodeURIComponent(profileId)}/`);
        if (!response.ok) throw new Error("Unable to load customer accounts.");
        const data = await response.json();
        if (!cancelled) setProfile(data as CustomerProfile);
      } catch (error) {
        console.error("Failed to fetch customer profile", error instanceof Error ? error.message : String(error));
        if (!cancelled) {
          setProfile(null);
          setLoadFailed(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadProfile();
    return () => { cancelled = true; };
  }, [profileId]);

  if (loading) return <Loader />;
  if (!profile) {
    return (
      <div style={{ padding: 24, textAlign: "center", marginTop: 40, color: "#64748b" }}>
        {loadFailed ? "Unable to load this customer." : "Customer not found."}
      </div>
    );
  }

  const activeAccounts = profile.accounts.filter((account) => account.status === "Active");
  const inactiveAccounts = profile.accounts.filter((account) => account.status !== "Active");

  return (
    <div>
      <div className="page-header">
        <h1 className="text-blue-600 font-normal text-base" style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <Link href="/customer-list" className="breadcrumb-link">Customers</Link>
          <span>/</span>
          <span className="breadcrumb-active">{profile.customer_name}</span>
        </h1>
      </div>

      <AccountList
        title="Active accounts"
        accounts={activeAccounts}
        emptyText="No active accounts."
        onOpen={(accountId) => router.push("/transaction/" + accountId)}
      />
      <AccountList
        title="Non-active accounts"
        accounts={inactiveAccounts}
        emptyText="No non-active accounts."
        onOpen={(accountId) => router.push("/transaction/" + accountId)}
      />
    </div>
  );
}

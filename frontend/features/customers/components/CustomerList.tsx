"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Table } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import Loader from "@/components/ui/Loader";
import toast from "@/services/toast";
import { fetchApi } from "@/services/api/client";
import type { CustomerProfile } from "../types/customer.types";

const money = (value: string | number | null | undefined) =>
  (Number(value) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function CustomerList() {
  const [profiles, setProfiles] = useState<CustomerProfile[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Inactive">("All");
  const [dateFilter, setDateFilter] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [accountsModalProfileId, setAccountsModalProfileId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadProfiles = useCallback(async () => {
    try {
      const response = await fetchApi("/api/customer-profiles/");
      if (!response.ok) throw new Error("Unable to load customers.");
      setProfiles(await response.json());
    } catch (error) {
      console.error("Failed to fetch customers", error instanceof Error ? error.message : String(error));
      toast.warning("Unable to load customers. Try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // This effect synchronizes the initial customer list with the backend.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadProfiles(); }, [loadProfiles]);

  const filteredProfiles = useMemo(() => {
    const query = search.trim().toLowerCase();
    return profiles.filter((profile) => {
      if (statusFilter === "Active" && profile.status !== "Active") return false;
      if (statusFilter === "Inactive" && profile.status !== "Inactive") return false;

      if (dateFilter) {
        const profileCreated = profile.created_at ? profile.created_at.substring(0, 10) : "";
        const matchesProfileDate = profileCreated === dateFilter;
        const matchesAccountDate = profile.accounts.some(
          (acc) => acc.date === dateFilter || (acc.created_at && acc.created_at.substring(0, 10) === dateFilter)
        );
        if (!matchesProfileDate && !matchesAccountDate) return false;
      }

      if (query) {
        const identity = [profile.customer_id_no, profile.customer_name, profile.guardian_name, profile.phone, profile.address];
        const accountNumbers = profile.accounts.flatMap((account) => [account.sno, account.ano]);
        const matchesSearch = [...identity, ...accountNumbers].some((value) => String(value || "").toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [profiles, search, statusFilter, dateFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredProfiles.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleProfiles = filteredProfiles.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getPageNumbers = () => {
    const pages = [];
    let start = Math.max(1, currentPage - 1);
    const end = Math.min(totalPages, start + 2);
    if (end - start < 2 && start > 1) {
      start = Math.max(1, end - 2);
    }
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  const activeCount = profiles.filter((profile) => profile.account_count > 0).length;
  const inactiveCount = profiles.length - activeCount;
  const totalAccounts = profiles.reduce((total, profile) => total + profile.account_count, 0);

  const accountsModalProfile = useMemo(
    () => profiles.find((p) => p.id === accountsModalProfileId) || null,
    [profiles, accountsModalProfileId]
  );

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAccountsModalProfileId(null);
    };
    if (accountsModalProfileId !== null) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [accountsModalProfileId]);

  const deleteProfile = async () => {
    if (deleteId === null) return;
    try {
      const response = await fetchApi("/api/customer-profiles/" + deleteId + "/", { method: "DELETE" });
      if (!response.ok) throw new Error("Delete failed");
      setProfiles((current) => current.filter((profile) => profile.id !== deleteId));
      setAccountsModalProfileId(null);
      toast.success("Customer deleted.");
    } catch {
      toast.warning("Unable to delete this customer. Try again.");
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div>
      {loading && <Loader />}
      <div className="page-header">
        <h1 className="text-blue-600 font-normal text-base" style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <Link href="/dashboard" className="breadcrumb-link">Dashboard</Link><span>/</span>
          <span className="breadcrumb-active">Customers</span>
        </h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 20 }}>
        <div className="card" style={{ padding: "18px 20px", margin: 0 }}>
          <div style={{ color: "#64748b", fontSize: 13 }}>All customers</div>
          <div style={{ fontWeight: 600, fontSize: 24, color: "#1e293b" }}>{profiles.length}</div>
        </div>
        <div className="card" style={{ padding: "18px 20px", margin: 0 }}>
          <div style={{ color: "#64748b", fontSize: 13 }}>Active · has account</div>
          <div style={{ fontWeight: 600, fontSize: 24, color: "#059669" }}>{activeCount}</div>
        </div>
        <div className="card" style={{ padding: "18px 20px", margin: 0 }}>
          <div style={{ color: "#64748b", fontSize: 13 }}>Inactive · no accounts</div>
          <div style={{ fontWeight: 600, fontSize: 24, color: "#64748b" }}>{inactiveCount}</div>
        </div>
        <div className="card" style={{ padding: "18px 20px", margin: 0 }}>
          <div style={{ color: "#64748b", fontSize: 13 }}>Total accounts</div>
          <div style={{ fontWeight: 600, fontSize: 24, color: "#334155" }}>{totalAccounts}</div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", padding: "18px 20px", borderBottom: "1px solid var(--color-border)" }}>
          <div>
            <h2 style={{ margin: "0 0 4px", fontSize: 20 }}>Customer list</h2>
            <span style={{ fontSize: 13, color: "#64748b" }}>Search across account numbers and customer details.</span>
          </div>
          <Button type="button" className="btn btn-primary" onClick={() => router.push("/add-customer")} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span aria-hidden="true">＋</span> Add customer
          </Button>
        </div>

        <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", background: "#f8fafc", borderBottom: "1px solid var(--color-border)" }}>
          <div className="search-field" style={{ margin: 0, flex: "1 1 240px", maxWidth: 400 }}>
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="search" value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} placeholder="Search SNO, ANO, customer ID, name, or phone" aria-label="Search customers" />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setPage(1); setStatusFilter(e.target.value as "All" | "Active" | "Inactive"); }}
            aria-label="Filter by status"
            style={{ height: 38, padding: "0 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", fontSize: 13, color: "#334155", fontWeight: 500, cursor: "pointer" }}
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>

          {/* Date Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => { setPage(1); setDateFilter(e.target.value); }}
              aria-label="Filter by date"
              style={{ height: 38, padding: "0 10px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", fontSize: 13, color: "#334155" }}
            />
            {dateFilter && (
              <button
                type="button"
                onClick={() => setDateFilter("")}
                style={{ border: "none", background: "transparent", color: "#dc2626", cursor: "pointer", fontSize: 13, fontWeight: 600, padding: "2px 6px" }}
                title="Clear date filter"
              >
                ✕
              </button>
            )}
          </div>

          {/* Rows Per Page */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
            <span style={{ fontSize: 13, color: "#64748b" }}>Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => { setPage(1); setPageSize(Number(e.target.value)); }}
              aria-label="Rows per page"
              style={{ height: 38, padding: "0 10px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", fontSize: 13, color: "#334155", fontWeight: 500, cursor: "pointer" }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={999999}>All</option>
            </select>
          </div>

          <span style={{ color: "#64748b", fontSize: 13 }}>{filteredProfiles.length} customer{filteredProfiles.length === 1 ? "" : "s"}</span>
        </div>

        <div className="table-scroll" style={{ margin: 0 }}>
          <Table className="data-table compact-table" style={{ margin: 0 }}>
            <thead><tr>
              <th>Customer ID</th><th>Customer</th><th>Guardian</th><th>Phone</th><th>Address</th><th>Accounts</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {!loading && visibleProfiles.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: "54px 20px", color: "#64748b" }}>
                  <div style={{ fontSize: 17, color: "#334155", fontWeight: 600 }}>{search ? "No matching customers" : "No customers yet"}</div>
                  <div style={{ margin: "6px 0 18px" }}>{search ? "Try another customer name, phone, ID, SNO, or ANO." : "Add a customer profile, then create loan accounts when needed."}</div>
                  {!search && <Button type="button" className="btn btn-primary" onClick={() => router.push("/add-customer")}>Add customer</Button>}
                </td></tr>
              ) : visibleProfiles.map((profile) => (
                <tr key={profile.id}>
                  <td>{profile.customer_id_no || "–"}</td>
                  <td style={{ fontWeight: 600 }}>{profile.customer_name}</td>
                  <td>{profile.guardian_name || "–"}</td>
                  <td>{profile.phone}</td>
                  <td className="max-w-[220px] overflow-hidden truncate" title={profile.address || ""}>{profile.address || "–"}</td>
                  <td onClick={(event) => event.stopPropagation()} style={{ textAlign: "center" }}>
                    <button type="button" onClick={() => setAccountsModalProfileId(profile.id)} aria-label={"Show accounts for " + profile.customer_name} style={{ border: "none", background: "transparent", color: "#1e3a5f", cursor: "pointer", fontWeight: 600, padding: 0 }}>
                      {profile.account_count || "–"}
                    </button>
                  </td>
                  <td><span style={{ display: "inline-flex", borderRadius: 20, padding: "4px 10px", fontSize: 12, fontWeight: 600, background: profile.status === "Active" ? "#dcfce7" : "#f1f5f9", color: profile.status === "Active" ? "#166534" : "#475569" }}>{profile.status}</span></td>
                  <td onClick={(event) => event.stopPropagation()}>
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <Button type="button" className="btn-icon" title="View history" aria-label="View history" onClick={() => router.push("/customer-list/" + profile.id)} style={{ border: "none", background: "transparent", width: 32, height: 32, padding: 0, color: "#0284c7", borderRadius: 6, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M12 7v5l4 2"></path></svg>
                      </Button>
                      <Button type="button" className="btn-icon" title="Add account" aria-label="Add account" onClick={() => router.push("/add-account?profileId=" + profile.id)} style={{ border: "none", background: "transparent", width: 32, height: 32, padding: 0, color: "#2563eb", borderRadius: 6, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                      </Button>
                      <Button type="button" className="btn-icon" title="Edit customer" aria-label="Edit customer" onClick={() => router.push("/add-customer?profileId=" + profile.id)} style={{ border: "none", background: "transparent", width: 32, height: 32, padding: 0, color: "#475569", borderRadius: 6, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                      </Button>
                      <Button type="button" className="btn-icon" title="Delete customer" aria-label="Delete customer" onClick={() => setDeleteId(profile.id)} style={{ border: "none", background: "transparent", width: 32, height: 32, padding: 0, color: "#dc2626", borderRadius: 6, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
        {/* Pagination */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", padding: "16px 20px", borderTop: "1px solid var(--color-border)", background: "#fff" }}>
          <div style={{ fontSize: "14px", color: "var(--color-text-subtle, #666)" }}>
            Showing {filteredProfiles.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredProfiles.length)} of {filteredProfiles.length} entries
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <Button type="button" className="btn btn-ghost btn-sm" disabled={currentPage === 1} onClick={() => setPage(Math.max(1, currentPage - 1))} title="Previous" style={{ padding: "0 8px" }}>
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </Button>
            {getPageNumbers().map((pageNum) => (
              <Button
                key={pageNum}
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setPage(pageNum)}
                style={pageNum === currentPage ? { color: "var(--color-primary)", fontWeight: 800 } : {}}
              >
                {pageNum}
              </Button>
            ))}
            <Button type="button" className="btn btn-ghost btn-sm" disabled={currentPage === totalPages} onClick={() => setPage(Math.min(totalPages, currentPage + 1))} title="Next" style={{ padding: "0 8px" }}>
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </Button>
          </div>
        </div>
      </div>

      {accountsModalProfile && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.4)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
          onClick={() => setAccountsModalProfileId(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="accounts-modal-title"
        >
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: "16px",
              width: "95%",
              maxWidth: "1150px",
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "18px 24px",
                borderBottom: "1px solid var(--color-border)",
              }}
            >
              <div>
                <h3 id="accounts-modal-title" style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#0f172a" }}>
                  Accounts ({accountsModalProfile.account_count})
                </h3>
                <span style={{ fontSize: 13, color: "#64748b" }}>
                  {accountsModalProfile.customer_name} {accountsModalProfile.customer_id_no ? `(${accountsModalProfile.customer_id_no})` : ""}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setAccountsModalProfileId(null);
                    router.push("/add-account?profileId=" + accountsModalProfile.id);
                  }}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  <span>Add account</span>
                </Button>
                <button
                  type="button"
                  onClick={() => setAccountsModalProfileId(null)}
                  aria-label="Close popup"
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: 4,
                    color: "#64748b",
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            </div>

            <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
              {accountsModalProfile.accounts.length === 0 ? (
                <div style={{ padding: "32px 12px", textAlign: "center", background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: 8, color: "#64748b" }}>
                  No accounts yet. Add an account when the customer borrows against a jewel.
                </div>
              ) : (
                <div className="table-scroll" style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8 }}>
                  <table className="data-table" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th>SNO</th>
                        <th>ANO</th>
                        <th>Amount borrowed</th>
                        <th>Date</th>
                        <th>Jewel</th>
                        <th>Account status</th>
                        <th>Transaction</th>
                      </tr>
                    </thead>
                      <tbody>
                        {accountsModalProfile.accounts.map((account) => (
                          <tr
                            key={account.id}
                            onClick={() => {
                              setAccountsModalProfileId(null);
                              router.push("/transaction/" + account.id);
                            }}
                            style={{ cursor: "pointer" }}
                            className="hover:bg-gray-50"
                          >
                            <td>{account.sno || "–"}</td>
                            <td>{account.ano || "–"}</td>
                            <td>Rs. {money(account.amount)}</td>
                            <td>{account.date}</td>
                            <td>{account.item_type || "–"} · {account.metal_type || "–"} · {account.purity || "–"} · {account.weight || "0"} g · {account.num_stones || 0} stones</td>
                            <td>{account.status}</td>
                            <td onClick={(event) => event.stopPropagation()}>
                              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                                <Button
                                  type="button"
                                  className="btn-icon"
                                  title="Edit account"
                                  aria-label="Edit account"
                                  onClick={() => {
                                    setAccountsModalProfileId(null);
                                    router.push("/add-account?profileId=" + accountsModalProfile.id + "&accountId=" + account.id);
                                  }}
                                  style={{ border: "none", background: "transparent", width: 32, height: 32, padding: 0, color: "#475569", borderRadius: 6, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                                >
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                </Button>
                                <Button
                                  type="button"
                                  className="btn-icon"
                                  title="Open passbook"
                                  aria-label="Open passbook"
                                  onClick={() => {
                                    setAccountsModalProfileId(null);
                                    router.push("/transaction/" + account.id);
                                  }}
                                  style={{ border: "none", background: "transparent", width: 32, height: 32, padding: 0, color: "#2563eb", borderRadius: 6, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                                >
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={deleteProfile}
        title="Delete customer"
        description="Deleting this customer also deletes all of their loan accounts, schedules, and payments. This cannot be undone."
        confirmText="Delete customer"
        isDestructive
      />
    </div>
  );
}

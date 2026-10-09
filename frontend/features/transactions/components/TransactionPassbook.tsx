"use client";
import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Loader from "@/components/ui/Loader";
import { Button } from "@/components/ui/Button";
import { Customer } from "../../customers/types/customer.types";
import toast from "@/services/toast";
import { fetchApi } from '@/services/api/client';

export default function TransactionPassbook({ id }: { id: string }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  
  // Payment Form State
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()));
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [remarks, setRemarks] = useState("");

  const router = useRouter();

  const fetchCustomer = useCallback(async () => {
    try {
      const res = await fetchApi(`/api/customers/${id}/`);
      if (res.ok) {
        const data = await res.json();
        setCustomer(data);
      }
    } catch (e) {
      console.error("Failed to fetch customer", e instanceof Error ? e.message : String(e));
    } finally {
      setIsFetching(false);
    }
  }, [id]);

  useEffect(() => {
    // Async data loading is the external synchronization for this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchCustomer();
  }, [fetchCustomer]);

  if (isFetching && !customer) return <Loader />;
  if (!customer) return <div style={{ padding: 16, textAlign: 'center', marginTop: 30, color: '#64748b' }}>Customer not found</div>;

  const outstandingBalance = Math.max(0, parseFloat(customer.total_payable) - parseFloat(customer.amount_paid));
  const initialPrincipal = parseFloat(String(customer.amount)) || 0;
  const installmentRows = [...(customer.installments || [])]
    .sort((a, b) => a.month_number - b.month_number)
    .reduce<Array<{ installment: NonNullable<Customer["installments"]>[number]; remainingPrincipal: number }>>((rows, installment) => {
      const openingPrincipal = rows.length
        ? rows[rows.length - 1].remainingPrincipal
        : initialPrincipal;
      const interest = parseFloat(String(installment.interest_due)) || 0;
      const closeAmount = parseFloat(String(installment.total_due)) || 0;
      const remainingPrincipal = Math.max(
        Math.round(((openingPrincipal + interest) - closeAmount) * 100) / 100,
        0,
      );
      return [...rows, { installment, remainingPrincipal }];
    }, []);
  const todayDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parseFloat(paymentAmount) <= 0) {
      toast.warning("Enter a payment amount greater than zero.");
      return;
    }
    if (parseFloat(paymentAmount) > outstandingBalance) {
      toast.warning("Payment cannot exceed the outstanding balance.");
      return;
    }

    setIsPaying(true);
    try {
      const res = await fetchApi(`/api/customers/${id}/payments/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_amount: paymentAmount,
          payment_date: paymentDate,
          payment_mode: paymentMode,
          reference_number: referenceNumber,
          remarks: remarks
        })
      });

      if (res.ok) {
        toast.success("Payment recorded successfully");
        setIsPaymentModalOpen(false);
        setPaymentAmount("");
        setReferenceNumber("");
        setRemarks("");
        fetchCustomer(); // Refresh all data from backend
      } else {
        toast.warning("Unable to record the payment. Check the details and try again.");
      }
    } catch (err) {
      console.error("Payment error", err instanceof Error ? err.message : String(err));
      toast.warning("Service is temporarily unavailable. Try again shortly.");
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <div className="w-full">
      {(isFetching || isPaying) && <Loader />}
      
      <div className="page-header flex flex-wrap justify-between items-center gap-2" style={{ marginBottom: "16px" }}>
        <div>
          <h1 className="text-blue-600 font-normal text-base" style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px", fontWeight: "normal", fontSize: "15px", color: "#2563eb" }}>
            <Link href="/dashboard" className="breadcrumb-link" style={{ textDecoration: "none", color: "inherit" }}>Dashboard</Link>
            <span style={{ fontSize: "0.9em", color: "inherit" }}>/</span>
            <Link href="/transaction" className="breadcrumb-link" style={{ textDecoration: "none", color: "inherit" }}>Transaction</Link>
            <span style={{ fontSize: "0.9em", color: "inherit" }}>/</span>
            <span className="breadcrumb-active" style={{ color: "inherit" }}>Passbook</span>
          </h1>
        </div>
        <Button onClick={() => router.push("/transaction")} className="btn btn-secondary w-full sm:w-auto" style={{ display: "flex", gap: "6px", alignItems: "center", justifyContent: "center", padding: "6px 14px", fontSize: "13px" }}>
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          Back to List
        </Button>
      </div>

      {/* Customer Identity Card */}
      <div className="card hover:shadow-md transition-all duration-300" style={{ padding: "14px 18px", marginBottom: "16px", background: "#ffffff" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: "normal", margin: "0 0 10px 0", color: "#1e293b", borderBottom: "1px solid #e2e8f0", paddingBottom: "8px" }}>
          {customer.customer_name}
          {customer.status === 'Completed' && (
            <span style={{ marginLeft: "10px", background: "#dcfce7", color: "#166534", fontSize: "0.75rem", padding: "2px 8px", borderRadius: "12px", verticalAlign: "middle", fontWeight: "normal" }}>
              Loan Fully Paid
            </span>
          )}
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "10px 16px" }}>
          <div><span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: "normal" }}>Customer ID</span><br/><span style={{ fontSize: "13px", fontWeight: "normal" }}>{customer.customer_id_no || "-"}</span></div>
          <div><span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: "normal" }}>Guardian</span><br/><span style={{ fontSize: "13px", fontWeight: "normal" }}>{customer.guardian_name || "-"}</span></div>
          <div><span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: "normal" }}>Phone</span><br/><span style={{ fontSize: "13px", fontWeight: "normal" }}>{customer.phone || "-"}</span></div>
          <div><span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: "normal" }}>Address</span><br/><span style={{ fontSize: "13px", fontWeight: "normal" }} className="inline-block max-w-full break-words" title={customer.address || ""}>{customer.address || "-"}</span></div>
          <div><span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: "normal" }}>Metal Type</span><br/><span style={{ fontSize: "13px", fontWeight: "normal" }}>{customer.metal_type || "-"}</span></div>
          <div><span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: "normal" }}>Item Type</span><br/><span style={{ fontSize: "13px", fontWeight: "normal" }}>{customer.item_type || "-"}</span></div>
          <div><span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: "normal" }}>Weight</span><br/><span style={{ fontSize: "13px", fontWeight: "normal" }}>{customer.weight} g</span></div>
          <div><span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: "normal" }}>Date</span><br/><span style={{ fontSize: "13px", fontWeight: "normal" }}>{customer.date}</span></div>
        </div>
      </div>

      {/* Financial Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "12px", marginBottom: "16px" }}>
        <div className="card text-center" style={{ padding: "10px 12px" }}>
          <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "normal", textTransform: "uppercase" }}>Principal</div>
          <div style={{ fontSize: "1.1rem", fontWeight: "normal", color: "#1e293b", marginTop: "2px" }}>Rs. {parseFloat(String(customer.amount) || '0').toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div className="card text-center" style={{ padding: "10px 12px" }}>
          <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "normal", textTransform: "uppercase" }}>Total Interest</div>
          <div style={{ fontSize: "1.1rem", fontWeight: "normal", color: "#1e293b", marginTop: "2px" }}>Rs. {parseFloat(String(customer.total_interest) || '0').toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "2px", fontWeight: "normal" }}>({customer.interest_rate}% x {customer.tenure}m)</div>
        </div>
        <div className="card text-center" style={{ padding: "10px 12px" }}>
          <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "normal", textTransform: "uppercase" }}>Total Payable</div>
          <div style={{ fontSize: "1.1rem", fontWeight: "normal", color: "#0ea5e9", marginTop: "2px" }}>Rs. {parseFloat(String(customer.total_payable) || '0').toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div className="card text-center" style={{ padding: "10px 12px" }}>
          <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "normal", textTransform: "uppercase" }}>Amount Paid</div>
          <div style={{ fontSize: "1.1rem", fontWeight: "normal", color: "#059669", marginTop: "2px" }}>Rs. {parseFloat(String(customer.amount_paid) || '0').toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div className="card text-center" style={{ padding: "10px 12px", background: outstandingBalance > 0 ? "#fff1f2" : "#f0fdf4", border: outstandingBalance > 0 ? "1px solid #fecdd3" : "1px solid #bbf7d0" }}>
          <div style={{ fontSize: "0.75rem", color: outstandingBalance > 0 ? "#be123c" : "#166534", fontWeight: "normal", textTransform: "uppercase" }}>Outstanding Balance</div>
          <div style={{ fontSize: "1.1rem", fontWeight: "normal", color: outstandingBalance > 0 ? "#e11d48" : "#15803d", marginTop: "2px" }}>Rs. {outstandingBalance.toFixed(2)}</div>
        </div>
      </div>

      {/* Action Trigger */}
      {customer.status !== 'Completed' && (
        <div className="flex justify-end mb-4 w-full">
          <Button onClick={() => setIsPaymentModalOpen(true)} className="btn btn-primary w-full sm:w-auto" style={{ padding: "8px 24px", fontSize: "0.9rem", borderRadius: "6px", display: "flex", gap: "6px", alignItems: "center", justifyContent: "center" }}>
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle><path d="M6 12h.01M18 12h.01"></path></svg>
            Receive Payment
          </Button>
        </div>
      )}

      {/* Installment Table Card */}
      <div className="card hover:shadow-md transition-all duration-300" style={{ padding: "14px 18px", marginBottom: "16px" }}>
        <h3 style={{ marginBottom: "10px", fontWeight: "normal", fontSize: "1rem" }}>Installment Schedule</h3>
        <div className="table-scroll overflow-x-auto w-full">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th>Month</th>
                <th>Due Date</th>
                <th>Principal</th>
                <th>Interest</th>
                <th>Total Due</th>
                <th>Paid</th>
                <th>Remaining Principal</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {installmentRows.map(({ installment: inst, remainingPrincipal }) => {
                const bal = Math.max(0, parseFloat(inst.total_due) - parseFloat(inst.amount_paid));
                const displayStatus = inst.status === "Paid"
                  ? "Paid"
                  : bal > 0 && inst.due_date < todayDate
                    ? "Overdue"
                    : inst.status;
                let statusColor = "#64748b";
                let statusBg = "#f1f5f9";
                if (displayStatus === 'Paid') {
                  statusColor = "#166534";
                  statusBg = "#dcfce7";
                } else if (displayStatus === 'Partially Paid') {
                  statusColor = "#b45309";
                  statusBg = "#fef3c7";
                } else if (displayStatus === 'Overdue') {
                  statusColor = "#b91c1c";
                  statusBg = "#fee2e2";
                }
                
                return (
                  <tr key={inst.id} className="hover:bg-gray-50 transition-colors">
                    <td>{inst.month_number}</td>
                    <td style={{ fontWeight: "normal" }}>{inst.due_date}</td>
                    <td>Rs. {parseFloat(String(inst.principal_due) || '0').toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>Rs. {parseFloat(String(inst.interest_due) || '0').toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td style={{ fontWeight: "normal" }}>Rs. {parseFloat(String(inst.total_due) || '0').toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td style={{ color: "#059669", fontWeight: "normal" }}>Rs. {parseFloat(String(inst.amount_paid) || '0').toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td style={{ color: "#64748b", fontWeight: "normal" }}>Rs. {remainingPrincipal.toFixed(2)}</td>
                    <td>
                      <span style={{ padding: "2px 8px", background: statusBg, color: statusColor, borderRadius: "10px", fontSize: "0.75rem", fontWeight: "normal", display: "inline-block" }}>
                        {displayStatus}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment History Card */}
      <div className="card hover:shadow-md transition-all duration-300" style={{ padding: "14px 18px" }}>
        <h3 style={{ marginBottom: "10px", fontWeight: "normal", fontSize: "1rem" }}>Payment History</h3>
        {customer.payments && customer.payments.length > 0 ? (
          <div className="table-scroll overflow-x-auto w-full">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Total Paid</th>
                  <th>Principal Portion</th>
                  <th>Interest Portion</th>
                  <th>Mode</th>
                  <th>Reference</th>
                </tr>
              </thead>
              <tbody>
                {customer.payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td>{p.payment_date}</td>
                    <td style={{ fontWeight: "normal", color: "#059669" }}>Rs. {parseFloat(String(p.payment_amount) || '0').toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>Rs. {parseFloat(String(p.principal_portion) || '0').toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>Rs. {parseFloat(String(p.interest_portion) || '0').toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>{p.payment_mode}</td>
                    <td>{p.reference_number || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ color: "#64748b", padding: "12px 0", textAlign: "center", fontSize: "13px" }}>No payments recorded yet.</div>
        )}
      </div>

      {/* Payment Modal */}
      {isPaymentModalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "16px", backdropFilter: "blur(4px)" }}>
          <div style={{ backgroundColor: "#fff", padding: "20px", borderRadius: "10px", width: "100%", maxWidth: "460px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }}>
            <h2 style={{ marginTop: 0, marginBottom: "6px", fontSize: "1.15rem", fontWeight: "normal", color: "#1e293b" }}>Receive Payment</h2>
            <p style={{ color: "#64748b", marginBottom: "16px", fontSize: "0.85rem" }}>Outstanding Balance: <span style={{ fontWeight: "normal", color: "#e11d48" }}>Rs. {outstandingBalance.toFixed(2)}</span></p>
            
            <form onSubmit={handlePaymentSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: "normal", fontSize: "12px" }}>Payment Amount (Rs.) <span style={{ color: "red" }}>*</span></label>
                  <input type="number" step="0.01" max={outstandingBalance} className="input" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} required autoFocus placeholder="Enter amount to pay" style={{ fontSize: "0.95rem", padding: "8px 12px" }} />
                </div>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: "normal", fontSize: "12px" }}>Payment Date <span style={{ color: "red" }}>*</span></label>
                  <input type="date" className="input" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} required style={{ padding: "8px 12px" }} />
                </div>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: "normal", fontSize: "12px" }}>Payment Mode <span style={{ color: "red" }}>*</span></label>
                  <select className="input" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} required style={{ padding: "8px 12px" }}>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="UPI">UPI</option>
                    <option value="Card">Card / POS</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: "normal", fontSize: "12px" }}>Reference Number</label>
                  <input type="text" className="input" value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} placeholder="Txn ID, Cheque No, etc." style={{ padding: "8px 12px" }} />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: "normal", fontSize: "12px" }}>Remarks</label>
                  <textarea className="input" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional transaction notes" rows={2} style={{ padding: "8px 12px" }}></textarea>
                </div>
              </div>
              
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", flexWrap: "wrap" }}>
                <Button type="button" className="btn btn-secondary w-full sm:w-auto" onClick={() => setIsPaymentModalOpen(false)} style={{ padding: "6px 16px", fontSize: "13px" }}>Cancel</Button>
                <Button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={isPaying} style={{ padding: "6px 16px", fontSize: "13px" }}>Process Payment</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Table } from "@/components/ui/Table";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "@/services/toast";
import Loader from "@/components/ui/Loader";
import { Modal } from "@/components/ui/Modal";
import { fetchApi } from '@/services/api/client';

type TransactionRow = {
  id: number;
  amount: string;
  date: string;
  databaseId?: number;
};

type AdditionalJewel = {
  id: number;
  itemType: string;
  selectedMetals: string[];
  purity: string;
  weight: string;
  numStones: string;
  photo: File | null;
  remark: string;
};

function AdditionalJewelCard({
  jewel,
  serialNumber,
  onUpdate,
}: {
  jewel: AdditionalJewel;
  serialNumber: number;
  onUpdate: (updates: Partial<Omit<AdditionalJewel, "id">>) => void;
}) {
  const [isMetalOpen, setIsMetalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsMetalOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMetalToggle = (metal: string) => {
    onUpdate({
      selectedMetals: jewel.selectedMetals.includes(metal)
        ? jewel.selectedMetals.filter((selectedMetal) => selectedMetal !== metal)
        : [...jewel.selectedMetals, metal],
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsMetalOpen(!isMetalOpen);
    }
  };

  return (
    <div className="card hover:shadow-lg hover:-translate-y-1 transition-all duration-300" style={{ marginBottom: 24 }}>
      <h3 style={{ marginBottom: 16 }}>Jewel Details - {serialNumber}</h3>
      <div className="responsive-form-grid">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Item Type <span className="required">*</span></label>
          <div className="input-wrap">
            <input type="text" className="input" placeholder="Enter Item Type" style={{ borderLeft: "3px solid #6ce2cfff" }} value={jewel.itemType} onChange={(e) => onUpdate({ itemType: e.target.value })} />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Metal Type <span className="required">*</span></label>
          <div className="input-wrap" ref={dropdownRef} style={{ position: "relative" }}>
            <div 
              className="input" 
              style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: "42px", borderLeft: "3px solid #6ce2cfff" }} 
              onClick={() => setIsMetalOpen(!isMetalOpen)}
              onKeyDown={handleKeyDown}
              tabIndex={0}
              role="combobox"
              aria-expanded={isMetalOpen}
            >
              <span style={{ color: jewel.selectedMetals.length ? "inherit" : "#999", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {jewel.selectedMetals.length ? jewel.selectedMetals.join(", ") : "Choose metal type"}
              </span>
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isMetalOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>

            {isMetalOpen && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: "4px", background: "var(--bg-card, #fff)", border: "1px solid var(--border-color, #e2e8f0)", borderRadius: "6px", padding: "8px 0", zIndex: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", maxHeight: "200px", overflowY: "auto" }}>
                {["Gold", "Silver", "Platinum", "Diamond"].map((metal) => (
                  <label key={metal} style={{ display: "flex", alignItems: "center", padding: "8px 16px", cursor: "pointer", gap: "8px" }}>
                    <input type="checkbox" checked={jewel.selectedMetals.includes(metal)} onChange={() => handleMetalToggle(metal)} style={{ cursor: "pointer" }} />
                    <span>{metal}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Purity / Karat <span className="required">*</span></label>
          <div className="input-wrap">
            <input type="text" className="input" placeholder="Enter Purity / Karat" style={{ borderLeft: "3px solid #6ce2cfff" }} value={jewel.purity} onChange={(e) => onUpdate({ purity: e.target.value })} />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Weight (grams) <span className="required">*</span></label>
          <div className="input-wrap">
            <input type="number" className="input" placeholder="Enter Weight" min="0" step="0.01" style={{ borderLeft: "3px solid #6ce2cfff" }} value={jewel.weight} onChange={(e) => onUpdate({ weight: e.target.value })} />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">No. of Stones <span className="required">*</span></label>
          <div className="input-wrap">
            <input type="number" className="input" placeholder="Enter No. of Stones" min="0" step="1" style={{ borderLeft: "3px solid #6ce2cfff" }} value={jewel.numStones} onChange={(e) => onUpdate({ numStones: e.target.value })} />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Jewelry Photo <span className="required">*</span></label>
          <div className="input-wrap">
            <input type="file" className="input file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#E8EDF3] file:text-[#1E3A5F] hover:file:bg-[#CBD2DB] file:cursor-pointer file:transition-colors" accept="image/*" style={{ padding: "4px", borderLeft: "3px solid #6ce2cfff" }} onChange={(e) => onUpdate({ photo: e.target.files?.[0] || null })} />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Remark <span className="required">*</span></label>
          <div className="input-wrap">
            <textarea className="input" placeholder="Enter Remark" style={{ minHeight: "42px", height: "42px", resize: "vertical", padding: "10px 14px", borderLeft: "3px solid #6ce2cfff" }} value={jewel.remark} onChange={(e) => onUpdate({ remark: e.target.value })}></textarea>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddCustomerForm() {
  const [isMetalOpen, setIsMetalOpen] = useState(false);
  const [selectedMetals, setSelectedMetals] = useState<string[]>([]);
  const [transactionAmount, setTransactionAmount] = useState("");
  const [transactionDate, setTransactionDate] = useState(() => new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()));
  
  // New State variables
  const [sno, setSno] = useState("");
  const [ano, setAno] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [customerIdNo, setCustomerIdNo] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [itemType, setItemType] = useState("");
  const [purity, setPurity] = useState("");
  const [weight, setWeight] = useState("");
  const [numStones, setNumStones] = useState("");
  const [remark, setRemark] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [additionalTransactions, setAdditionalTransactions] = useState<TransactionRow[]>([]);
  const [additionalJewels, setAdditionalJewels] = useState<AdditionalJewel[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [transactionToDelete, setTransactionToDelete] = useState<number | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const nextAdditionalItemId = useRef(1);
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerId = searchParams.get("customerId");

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsMetalOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    async function loadInitialData() {
      setIsFetching(true);
      
      // Fetch Automatic Numbers
      try {
        const res = await fetchApi("/api/profile/");
        if (res.ok) {
          const data = await res.json();
          if (data.next_sno) setSno(data.next_sno);
          if (data.next_ano) setAno(data.next_ano);
          if (!customerId && data.next_customer_id_no) setCustomerIdNo(data.next_customer_id_no);
        }
      } catch (err) {
        console.error("Failed to fetch automatic numbers", err instanceof Error ? err.message : String(err));
      }

      // Fetch Customer Details if editing
      if (customerId) {
        try {
          const res = await fetchApi(`/api/customers/${customerId}/`);
          if (res.ok) {
            const data = await res.json();
            setCustomerName(data.customer_name || "");
            setGuardianName(data.guardian_name || "");
            setCustomerIdNo(data.customer_id_no || "");
            setPhone(data.phone || "");
            setAddress(data.address || "");
          }
        } catch (err) {
          console.error("Failed to fetch customer details", err instanceof Error ? err.message : String(err));
        }
      }
      
      setIsFetching(false);
    }
    
    loadInitialData();
  }, [customerId]);

  const handleMetalToggle = (metal: string) => {
    setSelectedMetals(prev => 
      prev.includes(metal) ? prev.filter(m => m !== metal) : [...prev, metal]
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsMetalOpen(!isMetalOpen);
    }
  };

  const handleAddTransactionAndJewel = () => {
    const id = nextAdditionalItemId.current++;

    setAdditionalTransactions((transactions) => [
      ...transactions,
      { id, amount: transactionAmount, date: transactionDate },
    ]);
    setAdditionalJewels((jewels) => [
      ...jewels,
      {
        id,
        itemType: "",
        selectedMetals: [],
        purity: "",
        weight: "",
        numStones: "",
        photo: null,
        remark: "",
      },
    ]);
  };

  const handleUpdateAdditionalJewel = (
    id: number,
    updates: Partial<Omit<AdditionalJewel, "id">>,
  ) => {
    setAdditionalJewels((jewels) => jewels.map((jewel) => (
      jewel.id === id ? { ...jewel, ...updates } : jewel
    )));
  };

  const confirmDeleteTransaction = async () => {
    if (transactionToDelete === null) return;
    const id = transactionToDelete;
    const transaction = additionalTransactions.find((row) => row.id === id);

    if (transaction?.databaseId) {
      try {
        const response = await fetchApi(`/api/transactions/${transaction.databaseId}/`, {
          method: "DELETE",
        });

        if (!response.ok) {
          toast.warning("Unable to delete the transaction. Try again.");
          return;
        }
      } catch {
        toast.warning("Service is temporarily unavailable. Try again shortly.");
        return;
      }
    }

    setAdditionalTransactions((transactions) => transactions.filter((row) => row.id !== id));
    setAdditionalJewels((jewels) => jewels.filter((jewel) => jewel.id !== id));
    setTransactionToDelete(null);
  };

  const handleSave = async () => {
    setLoading(true);
    let createdCustomerId: number | null = null;

    try {
      const formData = new FormData();
      formData.append("sno", sno);
      formData.append("ano", ano);
      formData.append("amount", transactionAmount || "0");
      formData.append("date", transactionDate);
      formData.append("customer_name", customerName);
      formData.append("guardian_name", guardianName);
      formData.append("customer_id_no", customerIdNo);
      formData.append("phone", phone);
      formData.append("address", address);
      formData.append("item_type", itemType);
      formData.append("metal_type", selectedMetals.join(", "));
      formData.append("purity", purity);
      formData.append("weight", weight || "0");
      formData.append("num_stones", numStones || "0");
      formData.append("remark", remark);
      if (photo) {
        formData.append("photo", photo);
      }

      const response = await fetchApi("/api/customers/", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const customer: { id: number } = await response.json();
        createdCustomerId = customer.id;
        const savedTransactions = await Promise.all(
          additionalTransactions
            .filter((transaction) => !transaction.databaseId)
            .map(async (transaction) => {
              const jewel = additionalJewels.find((item) => item.id === transaction.id);
              if (!jewel) {
                throw new Error("Missing jewel details.");
              }

              const additionalTransactionData = new FormData();
              additionalTransactionData.append("amount", transaction.amount || "0");
              additionalTransactionData.append("date", transaction.date);
              additionalTransactionData.append("item_type", jewel.itemType);
              additionalTransactionData.append("metal_type", jewel.selectedMetals.join(", "));
              additionalTransactionData.append("purity", jewel.purity);
              additionalTransactionData.append("weight", jewel.weight || "0");
              additionalTransactionData.append("num_stones", jewel.numStones || "0");
              additionalTransactionData.append("remark", jewel.remark);
              if (jewel.photo) {
                additionalTransactionData.append("photo", jewel.photo);
              }

              const transactionResponse = await fetchApi(`/api/customers/${customer.id}/transactions/`, {
                method: "POST",
                body: additionalTransactionData,
              });

              if (!transactionResponse.ok) {
                throw new Error("Customer transaction save failed.");
              }

              const savedTransaction: { id: number } = await transactionResponse.json();
              return { localId: transaction.id, databaseId: savedTransaction.id };
            }),
        );

        setAdditionalTransactions((transactions) => transactions.map((transaction) => {
          const savedTransaction = savedTransactions.find((item) => item.localId === transaction.id);
          return savedTransaction ? { ...transaction, databaseId: savedTransaction.databaseId } : transaction;
        }));
        toast.success("Customer saved successfully!");
        router.push(`/transaction/${customer.id}`);
      } else {
        toast.warning("Unable to save the customer. Check the details and try again.");
      }
    } catch {
      if (createdCustomerId !== null) {
        try {
          await fetchApi(`/api/customers/${createdCustomerId}/`, { method: "DELETE" });
        } catch (rollbackError) {
          console.error("Unable to roll back incomplete customer creation", rollbackError);
        }
      }
      toast.warning("Unable to save the customer. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {isFetching && <Loader />}
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <h1 className="text-blue-600 font-normal text-base" style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px", fontWeight: "normal", fontSize: "16px", color: "#2563eb" }}>
            <Link href="/dashboard" className="breadcrumb-link" style={{ textDecoration: "none", color: "inherit" }}>Dashboard</Link>
            <span style={{ fontSize: "0.9em", color: "inherit" }}>/</span>
            <span className="breadcrumb-active" style={{ color: "inherit" }}>Add Customer</span>
          </h1>
        </div>
        <div>
          <Button type="button" onClick={() => router.push("/customer-list")} className="hover:text-blue-600 hover:bg-gray-100 p-2 rounded-full transition-all duration-200" title="Customer List" style={{ background: "transparent", border: "none", cursor: "pointer", display: "flex" }}>
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
          </Button>
        </div>
      </div>

      {/* Section 1: Customer Details */}
      <div className="card hover:shadow-lg hover:-translate-y-1 transition-all duration-300" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16 }}>Customer Details</h3>
        <div className="responsive-form-grid">
          
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">SNO</label>
            <div className="input-wrap">
              <input type="text" className="input" placeholder="Enter SNO" pattern="^[a-zA-Z0-9_-]+$" title="Alphanumeric characters, dashes, and underscores only" value={sno} readOnly style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">ANO</label>
            <div className="input-wrap">
              <input type="text" className="input" placeholder="Enter ANO" pattern="^[a-zA-Z0-9]+$" title="Alphanumeric characters only" value={ano} readOnly style={{ backgroundColor: 'transparent', border: 'none', cursor: 'not-allowed' }} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Customer ID No</label>
            <div className="input-wrap">
              <input type="text" className="input" placeholder="Enter Customer ID No" value={customerIdNo} onChange={(e) => setCustomerIdNo(e.target.value)} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">
              Amount <span className="required" style={{ color: "var(--color-danger)" }}>*</span>
            </label>
            <div className="input-wrap">
              <input 
                type="number" 
                className="input" 
                placeholder="Enter Amount" 
                min="0.01"
                step="0.01" 
                style={{ borderLeft: "3px solid #6ce2cfff" }}
                value={transactionAmount}
                onChange={(e) => setTransactionAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">
              Date <span className="required">*</span>
            </label>
            <div className="input-wrap">
              <input 
                type="date" 
                className="input" 
                style={{ borderLeft: "3px solid #6ce2cfff" }}
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">
              Customer Name <span className="required">*</span>
            </label>
            <div className="input-wrap">
              <input type="text" className="input" placeholder="Enter Customer Name" style={{ borderLeft: "3px solid #6ce2cfff" }} value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">
              Guardian Name <span className="required">*</span>
            </label>
            <div className="input-wrap">
              <input type="text" className="input" placeholder="Enter Guardian Name" style={{ borderLeft: "3px solid #6ce2cfff" }} value={guardianName} onChange={(e) => setGuardianName(e.target.value)} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">
              Phone Number <span className="required">*</span>
            </label>
            <div className="input-wrap">
              <input type="tel" className="input" placeholder="Enter Phone Number" maxLength={10} pattern="^[0-9]{10}$" title="Must be exactly 10 digits" style={{ borderLeft: "3px solid #6ce2cfff" }} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} />
            </div>
            <span className="form-hint">Enter a valid 10-digit mobile number.</span>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Address</label>
            <div className="input-wrap" style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <textarea className="input" placeholder="Enter Address" style={{ minHeight: "42px", height: "42px", resize: "vertical", padding: "10px 14px", flex: 1 }} value={address} onChange={(e) => setAddress(e.target.value)}></textarea>
              <Button type="button" onClick={handleAddTransactionAndJewel} className="icon-btn add-action-btn" style={{ flexShrink: 0, marginTop: "2px" }} title="Add Transaction and Jewel">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Transaction Card */}
      <div className="card hover:shadow-lg hover:-translate-y-1 transition-all duration-300" style={{ marginBottom: 24, overflow: 'hidden' }}>
        <h3 style={{ marginBottom: 16 }}>Transaction Card</h3>
        
        <div className="table-scroll w-full overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          <Table className="data-table w-full min-w-[600px]">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Amount <span className="required" style={{ color: "var(--color-danger)" }}>*</span></th>
                <th>Date</th>
                <th>Interest Amount</th>
                <th>Tenure</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td style={{ minWidth: 150 }}>
                  <span style={{ fontWeight: 500 }}>{transactionAmount ? `Rs. ${transactionAmount}` : "-"}</span>
                </td>
                <td style={{ minWidth: 150 }}>
                  <span style={{ fontWeight: 500 }}>{transactionDate || "-"}</span>
                </td>
                <td>
                  <span style={{ fontWeight: 600 }}>Rs. {transactionAmount ? (parseFloat(transactionAmount) * 2.5 / 100).toFixed(2) : "0.00"}</span>
                </td>
                <td>
                  <span style={{ fontWeight: 600 }}>12 months</span>
                </td>
                <td>
                  <Button type="button" className="icon-btn hover:text-blue-600 hover:bg-gray-100 p-2 rounded-full transition-all duration-200" title="Action" style={{ background: "transparent", border: "none", cursor: "pointer", display: "inline-flex" }}>
                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                  </Button>
                </td>
              </tr>
              {additionalTransactions.map((transaction, index) => (
                <tr key={transaction.id}>
                  <td>{index + 2}</td>
                  <td style={{ minWidth: 150 }}>
                    <span style={{ fontWeight: 500 }}>{transaction.amount ? `Rs. ${transaction.amount}` : "-"}</span>
                  </td>
                  <td style={{ minWidth: 150 }}>
                    <span style={{ fontWeight: 500 }}>{transaction.date || "-"}</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600 }}>Rs. {transaction.amount ? (parseFloat(transaction.amount) * 2.5 / 100).toFixed(2) : "0.00"}</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600 }}>12 months</span>
                  </td>
                  <td>
                    <Button type="button" onClick={() => setTransactionToDelete(transaction.id)} className="icon-btn hover:text-blue-600 hover:bg-gray-100 p-2 rounded-full transition-all duration-200" title="Delete" style={{ background: "transparent", border: "none", cursor: "pointer", display: "inline-flex" }}>
                      <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </div>

      {/* Section 3: Jewel Details */}
      <div className="card hover:shadow-lg hover:-translate-y-1 transition-all duration-300" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16 }}>Jewel Details - 1</h3>
        <div className="responsive-form-grid">
          
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Item Type <span className="required">*</span></label>
            <div className="input-wrap">
              <input type="text" className="input" placeholder="Enter Item Type" style={{ borderLeft: "3px solid #6ce2cfff" }} value={itemType} onChange={(e) => setItemType(e.target.value)} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Metal Type <span className="required">*</span></label>
            <div className="input-wrap" ref={dropdownRef} style={{ position: "relative" }}>
              <div 
                className="input" 
                style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: "42px", borderLeft: "3px solid #6ce2cfff" }}
                onClick={() => setIsMetalOpen(!isMetalOpen)}
                onKeyDown={handleKeyDown}
                tabIndex={0}
                role="combobox"
                aria-expanded={isMetalOpen}
              >
                <span style={{ color: selectedMetals.length ? "inherit" : "#999", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {selectedMetals.length ? selectedMetals.join(", ") : "Choose metal type"}
                </span>
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isMetalOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}><polyline points="6 9 12 15 18 9"></polyline></svg>
              </div>
              
              {isMetalOpen && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: "4px", background: "var(--bg-card, #fff)", border: "1px solid var(--border-color, #e2e8f0)", borderRadius: "6px", padding: "8px 0", zIndex: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", maxHeight: "200px", overflowY: "auto" }}>
                  {["Gold", "Silver", "Platinum", "Diamond"].map(metal => (
                    <label key={metal} style={{ display: "flex", alignItems: "center", padding: "8px 16px", cursor: "pointer", gap: "8px" }}>
                      <input 
                        type="checkbox" 
                        checked={selectedMetals.includes(metal)}
                        onChange={() => handleMetalToggle(metal)}
                        style={{ cursor: "pointer" }}
                      />
                      <span>{metal}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Purity / Karat <span className="required">*</span></label>
            <div className="input-wrap">
              <input type="text" className="input" placeholder="Enter Purity / Karat" style={{ borderLeft: "3px solid #6ce2cfff" }} value={purity} onChange={(e) => setPurity(e.target.value)} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Weight (grams) <span className="required">*</span></label>
            <div className="input-wrap">
              <input type="number" className="input" placeholder="Enter Weight" min="0" step="0.01" style={{ borderLeft: "3px solid #6ce2cfff" }} value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">No. of Stones <span className="required">*</span></label>
            <div className="input-wrap">
              <input type="number" className="input" placeholder="Enter No. of Stones" min="0" step="1" style={{ borderLeft: "3px solid #6ce2cfff" }} value={numStones} onChange={(e) => setNumStones(e.target.value)} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Jewelry Photo <span className="required">*</span></label>
            <div className="input-wrap">
              <input 
                type="file" 
                className="input file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#E8EDF3] file:text-[#1E3A5F] hover:file:bg-[#CBD2DB] file:cursor-pointer file:transition-colors" 
                accept="image/*" 
                style={{ padding: "4px", borderLeft: "3px solid #6ce2cfff" }}
                onChange={(e) => setPhoto(e.target.files?.[0] || null)}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Remark <span className="required">*</span></label>
            <div className="input-wrap">
              <textarea className="input" placeholder="Enter Remark" style={{ minHeight: "42px", height: "42px", resize: "vertical", padding: "10px 14px", borderLeft: "3px solid #6ce2cfff" }} value={remark} onChange={(e) => setRemark(e.target.value)}></textarea>
            </div>
          </div>

        </div>
      </div>

      {additionalJewels.map((jewel, index) => (
        <AdditionalJewelCard
          key={jewel.id}
          jewel={jewel}
          serialNumber={index + 2}
          onUpdate={(updates) => handleUpdateAdditionalJewel(jewel.id, updates)}
        />
      ))}

      {/* Section 4: Actions */}
      <div style={{ display: "flex", justifyContent: "flex-start", gap: "12px", marginTop: 24 }}>
        <Button type="button" onClick={() => router.push("/customer-list")} className="btn btn-secondary" style={{ color: "#ef4444" }}>Cancel</Button>
        <Button type="button" onClick={handleSave} disabled={loading} className="btn btn-success transition-colors">
          {loading ? "Saving..." : "Save Customer"}
        </Button>
      </div>

      <Modal
        isOpen={transactionToDelete !== null}
        onClose={() => setTransactionToDelete(null)}
        onConfirm={confirmDeleteTransaction}
        title="Delete Transaction"
        description="Are you sure you want to delete this transaction? This will also remove the associated jewelry details."
        confirmText="Delete"
        isDestructive={true}
      />
    </div>
  );
}

export default AddCustomerForm;

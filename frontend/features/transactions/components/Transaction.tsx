"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Loader from "@/components/ui/Loader";
import { Button } from "@/components/ui/Button";
import { Table } from "@/components/ui/Table";
import { Customer } from "../../customers/types/customer.types";
import { fetchApi } from '@/services/api/client';

export default function Transaction() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const router = useRouter();

  useEffect(() => {
    async function fetchCustomers() {
      setIsFetching(true);
      try {
        const res = await fetchApi("/api/customers/");
        if (res.ok) {
          const data = await res.json();
          setCustomers(data);
        }
      } catch (e) {
        console.error("Failed to fetch data", e instanceof Error ? e.message : String(e));
      } finally {
        setIsFetching(false);
      }
    }
    fetchCustomers();
  }, []);

  const filteredCustomers = customers.filter(c => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (c.customer_name?.toLowerCase().includes(query)) ||
      (c.customer_id_no?.toLowerCase().includes(query)) ||
      (String(c.ano || "").toLowerCase().includes(query)) ||
      (c.guardian_name?.toLowerCase().includes(query))
    );
  });

  // Reset pagination if search or rows per page changes
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentCustomers = filteredCustomers.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

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

  return (
    <div>
      {isFetching && <Loader />}
      <div className="page-header">
        <div>
          <h1 className="text-blue-600 font-normal text-base" style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px", fontWeight: "normal", fontSize: "16px", color: "#2563eb" }}>
            <Link href="/dashboard" className="breadcrumb-link" style={{ textDecoration: "none", color: "inherit" }}>Dashboard</Link>
            <span style={{ fontSize: "0.9em", color: "inherit" }}>/</span>
            <span className="breadcrumb-active" style={{ color: "inherit" }}>Transaction</span>
          </h1>
        </div>
      </div>
      
      <div className="card" style={{ padding: "0", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        
        {/* Unified Search/Filter Toolbar */}
        <div style={{ padding: "16px 20px", display: "flex", gap: "12px", borderBottom: "1px solid var(--color-border)", background: "#f8fafc", flexWrap: "wrap", alignItems: "center" }}>
          <div className="search-field" style={{ margin: 0 }}>
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" placeholder="Search transactions..." value={searchQuery} onChange={(e) => { setCurrentPage(1); setSearchQuery(e.target.value); }} />
          </div>

          {/* Rows Per Page */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
            <span style={{ fontSize: 13, color: "#64748b" }}>Rows:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => { setCurrentPage(1); setItemsPerPage(Number(e.target.value)); }}
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
        </div>
        
        {/* Data Table */}
        <div className="table-scroll" style={{ margin: 0, flex: 1, minHeight: "400px" }}>
          <Table className="data-table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>SNO</th>
                <th>ANO</th>
                <th>Customer ID</th>
                <th>Customer</th>
                <th>Guardian</th>
                <th>Address</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 && !isFetching ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "60px 20px" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
                      <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>
                        <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                      </div>
                      <div style={{ color: "#475569" }}>
                        <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600 }}>No Transactions Found</h3>
                        <p style={{ margin: "4px 0 16px", fontSize: "0.9rem" }}>There are currently no records matching your criteria.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                currentCustomers.map((c) => (
                  <tr key={c.id} onClick={() => router.push(`/transaction/${c.id}`)} style={{ cursor: 'pointer' }} className="hover:bg-gray-50 transition-colors">
                    <td>{c.sno || "-"}</td>
                    <td>{c.ano || "-"}</td>
                    <td>{c.customer_id_no || "-"}</td>
                    <td>{c.customer_name}</td>
                    <td>{c.guardian_name || "-"}</td>
                    <td className="max-w-[150px] overflow-hidden truncate" title={c.address || ""}>{c.address || "-"}</td>
                    <td className="font-medium">Rs. {parseFloat(String(c.amount) || "0").toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>{c.date}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <Button type="button" onClick={() => router.push(`/add-customer?customerId=${c.id}`)} className="btn btn-secondary" style={{ padding: "6px", display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none" }} title="Add">
                          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>

        {/* Pagination */ }
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", padding: "16px 20px", borderTop: "1px solid var(--color-border)", background: "#fff" }}>
          <div style={{ fontSize: "14px", color: "var(--color-text-subtle, #666)" }}>
            Showing {filteredCustomers.length === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredCustomers.length)} of {filteredCustomers.length} entries
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <Button type="button" className="btn btn-ghost btn-sm" disabled={currentPage === 1} onClick={() => handlePageChange(currentPage - 1)} title="Previous" style={{ padding: "0 8px" }}>
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </Button>
            {getPageNumbers().map(pageNum => (
              <Button 
                key={pageNum} 
                type="button" 
                className="btn btn-ghost btn-sm" 
                onClick={() => handlePageChange(pageNum)}
                style={pageNum === currentPage ? { color: "var(--color-primary)", fontWeight: 800 } : {}}
              >
                {pageNum}
              </Button>
            ))}
            <Button type="button" className="btn btn-ghost btn-sm" disabled={currentPage === totalPages} onClick={() => handlePageChange(currentPage + 1)} title="Next" style={{ padding: "0 8px" }}>
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

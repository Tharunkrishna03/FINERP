"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import Loader from "@/components/ui/Loader";
import { Button } from "@/components/ui/Button";
import { Table } from "@/components/ui/Table";
import { fetchApi } from '@/services/api/client';
import { Customer } from "../../customers/types/customer.types";

interface CollectionItem {
  id: string;
  date: string;
  customer_name: string;
  customer_id_no: string;
  amount: number;
}

export default function OverallCollection() {
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  // Pagination & Row Filter State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    async function fetchCollections() {
      try {
        const res = await fetchApi("/api/customers/");
        if (res.ok) {
          const data: Customer[] = await res.json();
          const items: CollectionItem[] = [];
          
          data.forEach(customer => {
            if (customer.payments) {
              customer.payments.forEach((payment) => {
                if (payment.payment_mode?.toLowerCase() === "upfront deduction" || !payment.payment_date) {
                  return;
                }
                items.push({
                  id: `${customer.id}-${payment.id}`,
                  date: payment.payment_date,
                  customer_name: customer.customer_name,
                  customer_id_no: customer.customer_id_no || "–",
                  amount: parseFloat(payment.payment_amount || "0"),
                });
              });
            }
          });
          
          items.sort((a, b) => b.date.localeCompare(a.date));
          setCollections(items);
        }
      } catch (err) {
        console.error("Failed to fetch collections", err);
      } finally {
        setIsFetching(false);
      }
    }
    fetchCollections();
  }, []);

  const totalPages = Math.max(1, Math.ceil(collections.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const visibleCollections = collections.slice(startIndex, startIndex + itemsPerPage);

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
            <span className="breadcrumb-active" style={{ color: "inherit" }}>Overall Collection</span>
          </h1>
        </div>
      </div>

      <div className="card hover:shadow-lg transition-all duration-300" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "20px 24px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", borderBottom: "1px solid var(--color-border)" }}>
          <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "bold" }}>Amount Collected by Date</h2>
          
          {/* Rows Per Page Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
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
        
        <div className="table-scroll" style={{ margin: 0 }}>
          <Table className="data-table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Customer ID</th>
                <th>Customer Name</th>
                <th>Total Collected (Rs.)</th>
              </tr>
            </thead>
            <tbody>
              {visibleCollections.length === 0 && !isFetching ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: "40px" }}>
                    <div className="empty-state" style={{ margin: 0 }}>
                      <p>No collections recorded yet.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                visibleCollections.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td style={{ fontWeight: 500 }}>{c.date}</td>
                    <td>{c.customer_id_no}</td>
                    <td style={{ fontWeight: 600 }}>{c.customer_name}</td>
                    <td style={{ fontWeight: 600, color: "#059669" }}>
                      Rs. {c.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>

        {/* Pagination Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", padding: "16px 20px", borderTop: "1px solid var(--color-border)", background: "#fff" }}>
          <div style={{ fontSize: "14px", color: "var(--color-text-subtle, #666)" }}>
            Showing {collections.length === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + itemsPerPage, collections.length)} of {collections.length} entries
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <Button type="button" className="btn btn-ghost btn-sm" disabled={currentPage === 1} onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} title="Previous" style={{ padding: "0 8px" }}>
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </Button>
            {getPageNumbers().map(pageNum => (
              <Button 
                key={pageNum} 
                type="button" 
                className="btn btn-ghost btn-sm" 
                onClick={() => setCurrentPage(pageNum)}
                style={pageNum === currentPage ? { color: "var(--color-primary)", fontWeight: 800 } : {}}
              >
                {pageNum}
              </Button>
            ))}
            <Button type="button" className="btn btn-ghost btn-sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))} title="Next" style={{ padding: "0 8px" }}>
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

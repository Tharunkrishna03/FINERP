"use client";

import { useState } from "react";
import Link from "next/link";
import MonthlyCollection from "./MonthlyCollection";
import OverallCollection from "./OverallCollection";
import TodayCollection from "./TodayCollection";

export type CollectionView = "today" | "monthly" | "overall";

const collectionTabs: { id: CollectionView; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "monthly", label: "Monthly" },
  { id: "overall", label: "Overall" },
];

export default function CollectionPage({ initialView = "today" }: { initialView?: CollectionView }) {
  const [activeView, setActiveView] = useState<CollectionView>(initialView);
  const [visitedViews, setVisitedViews] = useState<Set<CollectionView>>(() => new Set([initialView]));

  const selectView = (view: CollectionView) => {
    setActiveView(view);
    setVisitedViews((current) => new Set(current).add(view));
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-blue-600 font-normal text-base" style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px", fontWeight: "normal", fontSize: "16px", color: "#2563eb" }}>
            <Link href="/dashboard" className="breadcrumb-link" style={{ textDecoration: "none", color: "inherit" }}>Dashboard</Link>
            <span style={{ fontSize: "0.9em", color: "inherit" }}>/</span>
            <span className="breadcrumb-active" style={{ color: "inherit" }}>Collection</span>
          </h1>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1" role="group" aria-label="Collection reports">
        {collectionTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            aria-pressed={activeView === tab.id}
            onClick={() => selectView(tab.id)}
            className={`rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors ${activeView === tab.id ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {visitedViews.has("today") && <div hidden={activeView !== "today"}><TodayCollection embedded /></div>}
      {visitedViews.has("monthly") && <div hidden={activeView !== "monthly"}><MonthlyCollection embedded /></div>}
      {visitedViews.has("overall") && <div hidden={activeView !== "overall"}><OverallCollection embedded /></div>}
    </div>
  );
}

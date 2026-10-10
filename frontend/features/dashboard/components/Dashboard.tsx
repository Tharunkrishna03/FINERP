"use client";
import React, { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Loader from "@/components/ui/Loader";
import { Customer } from "../../customers/types/customer.types";
import { fetchApi } from '@/services/api/client';
import gsap from "gsap";

const localDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const toLocalISODate = (date: Date) => localDateFormatter.format(date);

export default function Dashboard() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [profile, setProfile] = useState<{ user_name?: string; role?: string }>({});
  const [isFetching, setIsFetching] = useState(true);
  const [activeTab, setActiveTab] = useState<"Today" | "This Week" | "This Month">("Today");
  const [txnFilter, setTxnFilter] = useState<"All" | "Disbursed" | "Payments">("All");
  const [refreshKey, setRefreshKey] = useState(0);
  const [dashboardSlide, setDashboardSlide] = useState<"collections" | "tenure-reminders">("collections");
  const [updatingReminderId, setUpdatingReminderId] = useState<number | null>(null);
  const [reminderActionError, setReminderActionError] = useState("");

  const dashboardRef = useRef<HTMLDivElement>(null);
  const graphLineRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      setIsFetching(true);
      try {
        const [custRes, profRes] = await Promise.all([
          fetchApi("/api/customers/"),
          fetchApi("/api/profile/").catch(() => null)
        ]);

        if (custRes && custRes.ok) {
          const data = await custRes.json();
          setCustomers(data);
        }
        if (profRes && profRes.ok) {
          const profData = await profRes.json();
          setProfile(profData);
        }
      } catch (e) {
        console.error("Failed to load dashboard data", e instanceof Error ? e.message : String(e));
      } finally {
        setIsFetching(false);
      }
    }
    fetchDashboardData();
  }, [refreshKey]);

  // GSAP Entrance Animations
  useEffect(() => {
    if (!isFetching && dashboardRef.current) {
      const ctx = gsap.context(() => {
        gsap.from(".bento-card, .dashboard-header", {
          y: 18,
          opacity: 0,
          duration: 0.55,
          stagger: 0.04,
          ease: "power2.out",
        });

        if (graphLineRef.current) {
          const pathLength = graphLineRef.current.getTotalLength();
          gsap.set(graphLineRef.current, { strokeDasharray: pathLength, strokeDashoffset: pathLength });
          gsap.to(graphLineRef.current, {
            strokeDashoffset: 0,
            duration: 1.1,
            ease: "power3.inOut",
            delay: 0.2
          });
        }
      }, dashboardRef);
      return () => ctx.revert();
    }
  }, [isFetching]);

  const todayStr = toLocalISODate(new Date());

  const dashboardData = useMemo(() => {
    const addDays = (dateString: string, days: number) => {
      const date = new Date(dateString + "T12:00:00Z");
      date.setUTCDate(date.getUTCDate() + days);
      return date.toISOString().slice(0, 10);
    };
    const currentMonthStr = todayStr.substring(0, 7);
    const yesterdayStr = addDays(todayStr, -1);

    let activeLoanAmount = 0;
    let todaysCollection = 0;
    let thisMonthsCollection = 0;
    let thisMonthsReceiptCount = 0;
    let overallCollection = 0;
    let pendingDues = 0;
    let totalGoldWeight = 0;
    let totalSilverWeight = 0;
    let activeBorrowersCount = 0;
    let overdueAccountsCount = 0;
    let cashRecoveries = 0;
    let nonCashRecoveries = 0;
    let todayReceiptsCount = 0;
    let yesterdayCollection = 0;
    const collectionByDate: Record<string, number> = {};

    type DashboardTransaction = {
      id: string | number;
      customerId?: number;
      sno: string;
      ano: string;
      customerIdNo: string;
      borrower: string;
      guardian: string;
      address: string;
      ticket: string;
      packet: string;
      metal: string;
      collateralDetail: string;
      weight: number;
      txnType: string;
      amount: number;
      isCredit: boolean;
      status: "Settled" | "Disbursed" | "Auction Notice" | "Pledge Released";
      date: string;
    };
    const dbTransactions: DashboardTransaction[] = [];

    customers.forEach((customer) => {
      const loanAmount = Number(customer.amount) || 0;
      const amountPaid = Number(customer.amount_paid) || 0;
      const due = Math.max(0, (Number(customer.total_payable) || 0) - amountPaid);
      const weight = Number(customer.weight) || 0;
      const metal = (customer.metal_type || "").toLowerCase();
      const ticket = customer.sno || String(customer.id);
      const packet = customer.ano || "#" + customer.id;

      pendingDues += due;
      if (customer.status !== "Completed") {
        activeBorrowersCount += 1;
        activeLoanAmount += loanAmount;
      }
      if ((customer.installments || []).some((installment) =>
        installment.status !== "Paid" &&
        installment.due_date < todayStr &&
        Number(installment.total_due) > Number(installment.amount_paid)
      )) {
        overdueAccountsCount += 1;
      }

      if (customer.status !== "Completed" && (metal.includes("gold") || metal.includes("au") || metal.includes("22k") || metal.includes("24k"))) {
        totalGoldWeight += weight;
      } else if (customer.status !== "Completed" && (metal.includes("silver") || metal.includes("ag") || metal.includes("999"))) {
        totalSilverWeight += weight;
      }

      (customer.payments || []).forEach((payment) => {
        const amount = Number(payment.payment_amount) || 0;
        const paymentDate = payment.payment_date;
        const mode = (payment.payment_mode || "").toLowerCase();
        const isUpfrontDeduction = mode === "upfront deduction";
        if (!isUpfrontDeduction) {
          overallCollection += amount;
          if (paymentDate === todayStr) {
            todaysCollection += amount;
            if (mode.includes("cash")) cashRecoveries += amount;
            else nonCashRecoveries += amount;
            todayReceiptsCount += 1;
          }
          if (paymentDate === yesterdayStr) yesterdayCollection += amount;
          if (paymentDate && paymentDate.startsWith(currentMonthStr)) {
            thisMonthsCollection += amount;
            thisMonthsReceiptCount += 1;
          }
          if (paymentDate) collectionByDate[paymentDate] = (collectionByDate[paymentDate] || 0) + amount;
        }

        dbTransactions.push({
          id: payment.id,
          customerId: customer.id,
          sno: customer.sno || "-",
          ano: customer.ano || "-",
          customerIdNo: customer.customer_id_no || "-",
          borrower: customer.customer_name,
          guardian: customer.guardian_name || "-",
          address: customer.address || "-",
          ticket: "GL-" + ticket,
          packet: "Packet " + packet,
          metal: metal.includes("silver") || metal.includes("ag") ? "Silver" :
            metal.includes("gold") || metal.includes("au") ? "Gold" : customer.metal_type || "Unclassified",
          collateralDetail: customer.item_type || "Jewel",
          weight,
          txnType: isUpfrontDeduction ? "Upfront Interest Deduction" :
            "Payment (" + (payment.payment_mode || "Unspecified mode") + ")",
          amount,
          isCredit: !isUpfrontDeduction,
          status: "Settled",
          date: paymentDate || customer.date,
        });
      });

      dbTransactions.push({
        id: "disb-" + customer.id,
        customerId: customer.id,
        sno: customer.sno || "-",
        ano: customer.ano || "-",
        customerIdNo: customer.customer_id_no || "-",
        borrower: customer.customer_name,
        guardian: customer.guardian_name || "-",
        address: customer.address || "-",
        ticket: "GL-" + ticket,
        packet: "Packet " + packet,
        metal: metal.includes("silver") || metal.includes("ag") ? "Silver" :
          metal.includes("gold") || metal.includes("au") ? "Gold" : customer.metal_type || "Unclassified",
        collateralDetail: customer.item_type || "Jewel",
        weight,
        txnType: "Loan Disbursement",
        amount: loanAmount,
        isCredit: false,
        status: "Disbursed",
        date: customer.date,
      });

      (customer.transactions || []).forEach((transaction) => {
        const jewel = transaction.jewel;
        const transactionMetal = (jewel?.metal_type || "").toLowerCase();
        const transactionWeight = Number(jewel?.weight) || 0;
        if (customer.status !== "Completed") {
          if (transactionMetal.includes("gold") || transactionMetal.includes("au") || transactionMetal.includes("22k") || transactionMetal.includes("24k")) {
            totalGoldWeight += transactionWeight;
          } else if (transactionMetal.includes("silver") || transactionMetal.includes("ag") || transactionMetal.includes("999")) {
            totalSilverWeight += transactionWeight;
          }
        }
        dbTransactions.push({
          id: "transaction-" + transaction.id,
          customerId: customer.id,
          sno: customer.sno || "-",
          ano: customer.ano || "-",
          customerIdNo: customer.customer_id_no || "-",
          borrower: customer.customer_name,
          guardian: customer.guardian_name || "-",
          address: customer.address || "-",
          ticket: "GL-" + ticket + "-T" + transaction.id,
          packet: "Packet " + packet + " / Transaction " + transaction.id,
          metal: transactionMetal.includes("silver") || transactionMetal.includes("ag") ? "Silver" :
            transactionMetal.includes("gold") || transactionMetal.includes("au") ? "Gold" : jewel?.metal_type || "Unclassified",
          collateralDetail: jewel?.item_type || "Additional loan item",
          weight: transactionWeight,
          txnType: "Additional Loan Disbursement",
          amount: Number(transaction.amount) || 0,
          isCredit: false,
          status: "Disbursed",
          date: transaction.date,
        });
      });
    });

    const totalTodayReceipts = cashRecoveries + nonCashRecoveries;
    const cashPct = totalTodayReceipts ? Math.round((cashRecoveries / totalTodayReceipts) * 100) : 0;
    const nonCashPct = totalTodayReceipts ? 100 - cashPct : 0;
    const cashAmt = cashRecoveries;
    const nonCashAmt = nonCashRecoveries;
    const collectionChange = yesterdayCollection > 0
      ? ((todaysCollection >= yesterdayCollection ? "+" : "") +
        ((todaysCollection - yesterdayCollection) / yesterdayCollection * 100).toFixed(1) + "% vs yesterday")
      : "No prior-day comparison";
    const collectionChangeTone = yesterdayCollection === 0
      ? "bg-slate-50 border-slate-200 text-slate-600"
      : todaysCollection >= yesterdayCollection
        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
        : "bg-rose-50 border-rose-200 text-rose-700";
    const displayTodayCollection = todaysCollection;
    const displayTotalLoans = activeLoanAmount;
    const displayOverallCollection = overallCollection;
    const displayThisMonthCollection = thisMonthsCollection;
    const displayPendingDues = pendingDues;
    const displayGoldWeight = totalGoldWeight;
    const displaySilverWeight = totalSilverWeight;
    const displayActiveBorrowers = activeBorrowersCount;
    const displayOverdueAccounts = overdueAccountsCount;

    const todayTime = new Date(`${todayStr}T00:00:00Z`).getTime();
    const tenureReminders = customers.flatMap((customer) => {
      if (customer.tenure_call_done || customer.status === "Completed") return [];

      const finalInstallment = (customer.installments || []).reduce(
        (latest, installment) =>
          !latest || installment.month_number > latest.month_number ? installment : latest,
        undefined as NonNullable<Customer["installments"]>[number] | undefined,
      );
      if (!finalInstallment?.due_date) return [];

      const dueTime = new Date(`${finalInstallment.due_date}T00:00:00Z`).getTime();
      if (!Number.isFinite(dueTime) || !Number.isFinite(todayTime)) return [];

      const daysUntilDue = Math.ceil((dueTime - todayTime) / 86400000);
      const outstanding = Math.max(
        0,
        (Number(customer.total_payable) || 0) - (Number(customer.amount_paid) || 0),
      );
      if (outstanding <= 0 || daysUntilDue > 10) return [];

      return [{ customer, dueDate: finalInstallment.due_date, daysUntilDue, outstanding }];
    }).sort((a, b) => a.daysUntilDue - b.daysUntilDue);

    return {
      dbTransactions,
      collectionByDate,
      thisMonthsReceiptCount,
      todayReceiptsCount,
      cashPct,
      nonCashPct,
      cashAmt,
      nonCashAmt,
      collectionChange,
      collectionChangeTone,
      displayTodayCollection,
      displayTotalLoans,
      displayOverallCollection,
      displayThisMonthCollection,
      displayPendingDues,
      displayGoldWeight,
      displaySilverWeight,
      displayActiveBorrowers,
      displayOverdueAccounts,
      tenureReminders,
    };
  }, [customers, todayStr]);

  const transactionData = useMemo(() => {
    const addDays = (dateString: string, days: number) => {
      const date = new Date(dateString + "T12:00:00Z");
      date.setUTCDate(date.getUTCDate() + days);
      return date.toISOString().slice(0, 10);
    };

    const periodStart = new Date(`${todayStr}T12:00:00Z`);
    if (activeTab === "This Week") {
      const daysSinceMonday = (new Date(todayStr + "T00:00:00Z").getUTCDay() + 6) % 7;
      periodStart.setTime(new Date(addDays(todayStr, -daysSinceMonday) + "T12:00:00Z").getTime());
    } else if (activeTab === "This Month") {
      periodStart.setTime(new Date(todayStr.slice(0, 7) + "-01T12:00:00Z").getTime());
    }
    const periodStartStr = toLocalISODate(periodStart);
    const filteredTxns = dashboardData.dbTransactions
      .filter((row) => row.date >= periodStartStr && row.date <= todayStr)
      .filter((row) => txnFilter === "All" ||
        (txnFilter === "Disbursed" ? row.status === "Disbursed" : row.status === "Settled"))
      .sort((a, b) => b.date.localeCompare(a.date));

    const chartDays = Array.from({ length: 7 }, (_, index) => {
      const dateString = addDays(todayStr, index - 6);
      const date = new Date(dateString + "T12:00:00Z");
      return { date, dateString, amount: dashboardData.collectionByDate[dateString] || 0 };
    });
    const chartMaximum = Math.max(...chartDays.map((day) => day.amount), 1);
    const chartPoints = chartDays.map((day, index) => ({
      ...day,
      x: 20 + index * 110,
      y: 138 - (day.amount / chartMaximum) * 108,
    }));
    const chartPath = chartPoints
      .map((point, index) => (index === 0 ? "M " : "L ") + point.x + " " + point.y)
      .join(" ");
    const chartAreaPath = chartPath + " L 680 160 L 20 160 Z";
    const peakPoint = chartPoints.reduce(
      (peak, point) => point.amount > peak.amount ? point : peak,
      chartPoints[0],
    );

    return { filteredTxns, chartDays, chartPoints, chartPath, chartAreaPath, peakPoint };
  }, [dashboardData, activeTab, txnFilter, todayStr]);

  const {
    thisMonthsReceiptCount,
    todayReceiptsCount,
    cashPct,
    nonCashPct,
    cashAmt,
    nonCashAmt,
    collectionChange,
    collectionChangeTone,
    displayTodayCollection,
    displayTotalLoans,
    displayOverallCollection,
    displayThisMonthCollection,
    displayPendingDues,
    displayGoldWeight,
    displaySilverWeight,
    displayActiveBorrowers,
    displayOverdueAccounts,
    tenureReminders,
  } = dashboardData;
  const { filteredTxns, chartDays, chartPoints, chartPath, chartAreaPath, peakPoint } = transactionData;

  if (isFetching) return <Loader />;

  const markReminderCallDone = async (customerId: number) => {
    setUpdatingReminderId(customerId);
    setReminderActionError("");
    try {
      const response = await fetchApi(`/api/customers/${customerId}/tenure-reminder/call-done/`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Could not save the call reminder.");
      }
      setCustomers((currentCustomers) => currentCustomers.map((customer) =>
        customer.id === customerId ? { ...customer, tenure_call_done: true } : customer,
      ));
    } catch {
      setReminderActionError("Could not mark the call as done. Please try again.");
    } finally {
      setUpdatingReminderId(null);
    }
  };

  const formatReminderDate = (dateString: string) =>
    new Date(`${dateString}T12:00:00Z`).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });

  const exportTransactions = () => {
    const quote = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const rows = [
      ["Date", "Borrower", "Ticket", "Packet", "Metal", "Collateral", "Weight", "Transaction", "Amount", "Status"],
      ...filteredTxns.map((row) => [
        row.date, row.borrower, row.ticket, row.packet, row.metal, row.collateralDetail, row.weight,
        row.txnType, row.amount, row.status,
      ]),
    ];
    const csv = rows.map((row) => row.map(quote).join(",")).join("\r\n");
    const objectUrl = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = "dashboard-transactions.csv";
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  };
  const formatCurrency = (val: number) =>
    val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatIntegerCurrency = (val: number) =>
    val.toLocaleString("en-IN", { maximumFractionDigits: 0 });

  return (
    <div className="dashboard-page-content bg-[#F4F6FA] text-slate-800 font-sans" ref={dashboardRef}>
      
      {/* Main Page Layout Container */}
      <div className="w-full max-w-none">
        
        {/* Page Title & Operational Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 dashboard-header">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Overview</h1>
              <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-500 "></span>
                Loan Overview
              </span>
            </div>
            <p className="text-xs text-slate-700 mt-1">
              Welcome back,  {profile.user_name ? profile.user_name.split(' ')[0] : "User"}. 
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Filter Pills */}
            <div className="bg-white border border-slate-200 rounded-xl p-1 shadow-sm flex items-center gap-1">
              {(["Today", "This Week", "This Month"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    activeTab === tab
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            <Link
              href="/add-customer"
              className="px-3.5 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-xs font-medium rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
              Add Customer
            </Link>
      <Link
  href="/transaction"
  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-xl transition-all shadow-md shadow-blue-200 flex items-center gap-1.5"
  style={{ color: "#fff" }}
>
  <svg
    className="w-3.5 h-3.5 text-white"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.5"
      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
    />
  </svg>
  Disburse Loan
</Link>
          </div>
        </div>
        <div className="grid min-w-0 grid-cols-1 xl:grid-cols-12 gap-4 mb-4">
          
          {/* ================= LEFT COLUMN (SPAN 8) ================= */}
          <div className="min-w-0 flex flex-col gap-4 xl:col-span-8">
            
              {/* Today's Collection Card with Curve Chart */}
            <div className="bento-card w-full bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-sm flex flex-col gap-3 relative overflow-hidden">
              
              <div className="flex flex-wrap items-start justify-between gap-2 z-10">
                <div className="min-w-0">
                  {dashboardSlide === "collections" ? (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-700">TODAY&apos;S COLLECTIONS</span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Recorded
                        </span>
                      </div>
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mt-1">
                        <span className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
                          Rs. {formatCurrency(displayTodayCollection)}
                        </span>
                        <span className={`text-xs font-medium border px-2 py-0.5 rounded-md flex items-center gap-1 ${collectionChangeTone}`}>{collectionChange}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-700">TENURE REMINDERS</span>
                      <p className="text-xs text-slate-600 mt-1">Unpaid loans due within 10 days or already overdue</p>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1" role="group" aria-label="Dashboard slides">
                    <button type="button" aria-pressed={dashboardSlide === "collections"} onClick={() => setDashboardSlide("collections")} className={`rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors ${dashboardSlide === "collections" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>
                      Collections
                    </button>
                    <button type="button" aria-pressed={dashboardSlide === "tenure-reminders"} onClick={() => setDashboardSlide("tenure-reminders")} className={`rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors ${dashboardSlide === "tenure-reminders" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>
                      Tenure calls{tenureReminders.length > 0 ? ` (${tenureReminders.length})` : ""}
                    </button>
                  </div>
                  <button type="button" aria-label="Refresh dashboard" onClick={() => setRefreshKey((key) => key + 1)} className="w-8 h-8 rounded-full border border-slate-200 text-slate-700 flex items-center justify-center hover:bg-slate-50 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </button>
                </div>
              </div>

              {dashboardSlide === "collections" ? (
                <>
              {/* Curved SVG Chart */}
              <div className="relative w-full dashboard-collection-chart my-0">
                <div className="dashboard-chart-summary">
                  {peakPoint.amount > 0 ? `Peak Rs. ${formatIntegerCurrency(peakPoint.amount)} on ${peakPoint.dateString}` : "No collections recorded"}
                </div>
                <svg viewBox="0 0 700 160" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="chartGradientFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366F1" stopOpacity="0.22" />
                      <stop offset="100%" stopColor="#6366F1" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Curve Path */}
                  <path
                    d={chartPath}
                    fill="none"
                    stroke="#4F46E5"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    ref={graphLineRef}
                  />

                  {/* Gradient Area under curve */}
                  <path
                    d={chartAreaPath}
                    fill="url(#chartGradientFill)"
                  />

                  {/* Dynamic Tooltip / Node Marker at Peak */}
                  <g transform={`translate(${peakPoint.x}, ${peakPoint.y})`}>
                    <g className="dashboard-chart-callout">
                    {/* Dark callout badge */}
                    <rect x="-80" y="-34" width="160" height="24" rx="6" fill="#0F172A" />
                    <text x="0" y="-18" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="bold">
                      {peakPoint.amount > 0 ? `Peak Rs. ${formatIntegerCurrency(peakPoint.amount)} on ${peakPoint.dateString}` : "No collections recorded"}
                    </text>
                    </g>
                    <circle cx="0" cy="0" r="5" fill="#FFFFFF" stroke="#4F46E5" strokeWidth="3" />
                  </g>
                </svg>

                {/* Day Labels Along Bottom */}
                <div className="flex justify-between items-center text-[11px] font-medium text-slate-700 uppercase tracking-wider px-2 mt-2">
                  {chartDays.map((day) => (
                    <span key={day.dateString} className={day.dateString === todayStr ? "bg-indigo-50 border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded font-semibold" : ""}>
                      {day.date.toLocaleDateString("en-IN", { weekday: "short", timeZone: "Asia/Kolkata" }).toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>

              {/* Bottom Breakdown Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 mt-0 text-xs">
                <div>
                  <p className="text-slate-700 mb-0.5">Cash Recoveries</p>
                  <p className="text-sm font-semibold text-slate-900">
                    ₹{formatIntegerCurrency(cashAmt)} <span className="text-slate-700 font-normal">({cashPct}%)</span>
                  </p>
                </div>
                <div>
                  <p className="text-slate-700 mb-0.5">Non-cash Recoveries</p>
                  <p className="text-sm font-semibold text-slate-900">
                    ₹{formatIntegerCurrency(nonCashAmt)} <span className="text-slate-700 font-normal">({nonCashPct}%)</span>
                  </p>
                </div>
                <div>
                  <p className="text-slate-700 mb-0.5">Total Receipts Count</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {todayReceiptsCount} Receipts
                  </p>
                </div>
              </div>
                </>
              ) : (
                <div className="min-h-[240px]">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-slate-600">Call 10 days before the final tenure date; reminders stay here until marked done.</p>
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-medium text-amber-800">
                      {tenureReminders.length} unpaid {tenureReminders.length === 1 ? "loan" : "loans"}
                    </span>
                  </div>

                  {reminderActionError && (
                    <p role="alert" className="mb-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                      {reminderActionError}
                    </p>
                  )}

                  {tenureReminders.length === 0 ? (
                    <div className="flex min-h-[175px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 text-center text-sm text-slate-600">
                      No unpaid loans are within 10 days of their final tenure date or overdue.
                    </div>
                  ) : (
                    <div className="max-h-[250px] divide-y divide-slate-100 overflow-y-auto pr-1">
                      {tenureReminders.map(({ customer, dueDate, daysUntilDue, outstanding }) => (
                        <div key={customer.id} className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-900">{customer.customer_name}</p>
                            <p className="mt-0.5 text-xs text-slate-600">
                              {customer.sno ? `S.No. ${customer.sno} · ` : ""}
                              {customer.phone || "No phone recorded"}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-700">
                              Final tenure: {formatReminderDate(dueDate)} · {daysUntilDue < 0 ? `Overdue by ${Math.abs(daysUntilDue)} ${Math.abs(daysUntilDue) === 1 ? "day" : "days"}` : daysUntilDue === 0 ? "Due today" : `Due in ${daysUntilDue} ${daysUntilDue === 1 ? "day" : "days"}`}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
                            <span className="text-xs font-semibold text-rose-700">Rs. {formatIntegerCurrency(outstanding)} due</span>
                            {customer.phone && (
                              <a href={`tel:${customer.phone.replace(/[^\d+]/g, "")}`} className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700 hover:bg-indigo-100">
                                Call
                              </a>
                            )}
                            <button
                              type="button"
                              disabled={updatingReminderId === customer.id}
                              onClick={() => markReminderCallDone(customer.id)}
                              className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60"
                            >
                              {updatingReminderId === customer.id ? "Saving..." : "Call done"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* 4 Metric Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-3">
              
              {/* Card 1: This Month */}
              <div className="bento-card w-full bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-[10px] font-medium text-slate-700 uppercase tracking-widest">MONTHLY COLLECTIONS</p>
                  <p className="text-lg font-semibold text-slate-900 tracking-tight mt-0.5">
                    Rs. {formatIntegerCurrency(displayThisMonthCollection)}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-700">Recorded receipts</span>
                  <span className="font-medium text-slate-900">{thisMonthsReceiptCount}</span>
                </div>
              </div>

              {/* Card 2: Pending Dues */}
              <div className="bento-card w-full bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-[10px] font-medium text-slate-700 uppercase tracking-widest">PENDING DUES</p>
                  <p className="text-lg font-semibold text-rose-600 tracking-tight mt-0.5">
                    Rs. {formatIntegerCurrency(displayPendingDues)}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-700">{displayOverdueAccounts} Accounts Overdue</span>
                  <Link href="/customer-list" className="font-medium text-indigo-600 hover:underline flex items-center gap-0.5">
                    View customers
                  </Link>
                </div>
              </div>

              {/* Card 3: Gold Reserve */}
              <div className="bento-card w-full bg-white rounded-2xl border border-amber-300/80 p-4 shadow-sm flex flex-col justify-between relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-white font-semibold text-sm flex items-center justify-center shadow-md shadow-amber-200">
                    Au
                  </div>
                  <span className="text-[10px] font-medium text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">Recorded gold</span>
                </div>
                <div className="mt-3">
                  <p className="text-[10px] font-medium text-slate-700 uppercase tracking-widest">TOTAL GOLD WEIGHT</p>
                  <p className="text-lg font-semibold text-slate-900 tracking-tight mt-0.5">
                    {displayGoldWeight.toFixed(2)} g
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-amber-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-700">Active Gold Collateral</span>
                </div>
              </div>

              {/* Card 4: Silver Reserve */}
              <div className="bento-card w-full bg-white rounded-2xl border border-slate-300 p-4 shadow-sm flex flex-col justify-between relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-slate-700 text-white font-semibold text-sm flex items-center justify-center shadow-md shadow-slate-200">
                    Ag
                  </div>
                  <span className="text-[10px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">Recorded silver</span>
                </div>
                <div className="mt-3">
                  <p className="text-[10px] font-medium text-slate-700 uppercase tracking-widest">TOTAL SILVER WEIGHT</p>
                  <p className="text-lg font-semibold text-slate-900 tracking-tight mt-0.5">
                    {displaySilverWeight.toFixed(2)} g
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-700">Active Silver Collateral</span>
                </div>
              </div>

            </div>

            {/* Table: Recent Transactions */}
            <div className="bento-card w-full bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 tracking-tight">Recent Transactions</h3>
                  <p className="text-xs text-slate-700 mt-0.5">Recent loan disbursements and repayment records</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="bg-slate-100 rounded-lg p-0.5 flex items-center text-xs font-medium">
                    {(["All", "Disbursed", "Payments"] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setTxnFilter(filter)}
                        className={`px-3 py-1 rounded-md transition-all ${
                          txnFilter === filter ? "bg-white text-slate-900 shadow-sm" : "text-slate-700 hover:text-slate-900"
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>

                  <button type="button" onClick={exportTransactions} className="px-3 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Export CSV
                  </button>
                </div>
              </div>

              {/* Data Table */}
              <div className="table-scroll overflow-x-auto">
                <table className="min-w-full w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-medium uppercase tracking-wider text-slate-700">
                      <th className="py-2.5 px-3">SNO</th>
                      <th className="py-2.5 px-3">ANO</th>
                      <th className="py-2.5 px-3">CUSTOMER ID</th>
                      <th className="py-2.5 px-3">CUSTOMER</th>
                      <th className="py-2.5 px-3">GUARDIAN</th>
                      <th className="py-2.5 px-3">ADDRESS</th>
                      <th className="py-2.5 px-3 text-right">AMOUNT</th>
                      <th className="py-2.5 px-3">DATE</th>
                      <th className="py-2.5 px-3 text-center">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTxns.length === 0 ? (
                      <tr><td colSpan={9} className="py-6 text-center text-slate-500">No transactions match the current filters.</td></tr>
                    ) : filteredTxns.slice(0, 5).map((row) => (
                      <tr key={row.id} onClick={() => row.customerId && router.push(`/transaction/${row.customerId}`)} style={{ cursor: 'pointer' }} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-medium text-slate-900 text-xs">{row.sno}</td>
                        <td className="py-3 px-3 text-slate-800 text-xs">{row.ano}</td>
                        <td className="py-3 px-3 text-slate-800 text-xs">{row.customerIdNo}</td>
                        <td className="py-3 px-3 font-semibold text-slate-900 text-xs">{row.borrower}</td>
                        <td className="py-3 px-3 text-slate-800 text-xs">{row.guardian}</td>
                        <td className="py-3 px-3 text-slate-800 text-xs max-w-[150px] overflow-hidden truncate" title={row.address}>{row.address}</td>
                        <td className="py-3 px-3 text-right font-semibold text-xs text-slate-900">Rs. {formatCurrency(row.amount)}</td>
                        <td className="py-3 px-3 text-slate-800 text-xs">{row.date}</td>
                        <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <Link href={row.customerId ? `/transaction/${row.customerId}` : "/transaction"} className="text-indigo-600 hover:text-indigo-800 font-medium text-xs">
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Table Footer */}
              <div className="flex flex-col items-start gap-2 pt-3 mt-2 border-t border-slate-100 text-xs sm:flex-row sm:items-center sm:justify-between">
                <span className="text-slate-700">
                  Showing {Math.min(5, filteredTxns.length)} of {filteredTxns.length} transactions in the selected period
                </span>
                <Link href="/transaction" className="font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                  View All Transactions
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                </Link>
              </div>

            </div>

          </div>

          {/* ================= RIGHT COLUMN (SPAN 4) ================= */}
          <div className="min-w-0 flex flex-col gap-4 xl:col-span-4">
            
            {/* Total Active Loans Card */}
            <div className="bento-card w-full bg-slate-50 text-slate-900 rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-widest text-slate-600">TOTAL ACTIVE LOANS</p>
                  <p className="text-2xl sm:text-3xl font-semibold tracking-tight mt-1">
                    Rs. {formatIntegerCurrency(displayTotalLoans)}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <span className="bg-white border border-slate-200 text-slate-700 px-3 py-1 rounded-lg text-xs font-medium">
                  {displayActiveBorrowers} Active Borrowers
                </span>
                <span className="text-xs font-semibold text-emerald-700">
                  {displayOverdueAccounts} Overdue Accounts
                </span>
              </div>
            </div>

            {/* Overall Collection Card */}
            <div className="bento-card w-full bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-widest text-slate-700">OVERALL COLLECTIONS</p>
                  <p className="text-2xl font-semibold text-slate-900 tracking-tight mt-1">
                    Rs. {formatIntegerCurrency(displayOverallCollection)}
                  </p>
                  <p className="text-xs text-slate-700 mt-1">Total payment collections across all customer accounts</p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                </div>
              </div>
            </div>

            {/* Portfolio Summary Card */}
            <div className="bento-card w-full bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
              
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Portfolio Summary</h3>
                  <p className="text-[11px] text-slate-700">Customer and collateral statistics</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <p className="text-[10px] text-slate-700">Active Customers</p>
                  <p className="font-semibold text-slate-900 mt-0.5">{displayActiveBorrowers}</p>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <p className="text-[10px] text-slate-700">Overdue Accounts</p>
                  <p className="font-semibold text-rose-600 mt-0.5">{displayOverdueAccounts}</p>
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* Footer Bar */}
        <footer className="pt-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-700 font-medium">
          <div>
          
          </div>
          <span>Developed by <span className="font-semibold text-slate-900">TK Infotechsoft</span></span>
        </footer>

      </div>
    </div>
  );
}

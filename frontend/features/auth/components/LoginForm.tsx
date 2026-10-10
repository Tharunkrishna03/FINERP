"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import toast from "@/services/toast";
import { fetchApi } from '@/services/api/client';

function GoldLoanIllustration() {
  return (
    <svg
      className="gold-loan-illustration"
      viewBox="0 0 700 560"
      role="img"
      aria-label="Gold jewelry, coins, and a gold loan document"
      focusable="false"
    >
      <defs>
        <linearGradient id="loan-blue-blob" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#dbeafe" />
          <stop offset="1" stopColor="#93c5fd" />
        </linearGradient>
        <linearGradient id="loan-gold" x1="0" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="#fff3b0" />
          <stop offset="0.45" stopColor="#f6c453" />
          <stop offset="1" stopColor="#c98216" />
        </linearGradient>
        <linearGradient id="loan-gold-dark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e9a72e" />
          <stop offset="1" stopColor="#a95f0b" />
        </linearGradient>
        <filter id="loan-art-shadow" x="-30%" y="-30%" width="160%" height="170%">
          <feDropShadow dx="0" dy="12" stdDeviation="12" floodColor="#1e3a8a" floodOpacity="0.16" />
        </filter>
      </defs>

      <path d="M91 106C140 40 260 46 328 83c61 34 112 9 166 37 70 37 101 132 64 197-31 54-12 96-67 143-51 44-119 34-178 37-77 4-160 39-218-13-57-51-26-118-53-177-29-64-6-149 49-201Z" fill="url(#loan-blue-blob)" />
      <circle cx="112" cy="160" r="25" fill="#fff" opacity="0.48" />
      <circle cx="552" cy="133" r="16" fill="#fff" opacity="0.58" />
      <circle cx="594" cy="355" r="22" fill="#bfdbfe" opacity="0.9" />
      <circle cx="146" cy="404" r="13" fill="#fff" opacity="0.65" />
      <ellipse cx="353" cy="473" rx="213" ry="28" fill="#2563eb" opacity="0.13" />

      {/* Gold loan document */}
      <g filter="url(#loan-art-shadow)" transform="rotate(5 466 253)">
        <rect x="391" y="168" width="150" height="197" rx="16" fill="#fff" />
        <path d="M407 194h118" stroke="#dbeafe" strokeWidth="3" />
        <circle cx="466" cy="241" r="29" fill="#eff6ff" />
        <circle cx="466" cy="241" r="21" fill="url(#loan-gold)" />
        <text x="466" y="250" textAnchor="middle" fontSize="25" fontWeight="700" fill="#8a4b0a">₹</text>
        <text x="466" y="292" textAnchor="middle" fontSize="12" fontWeight="700" letterSpacing="1.5" fill="#1e3a8a">GOLD LOAN</text>
        <path d="M420 310h91M420 325h69M420 340h78" stroke="#bfdbfe" strokeWidth="5" strokeLinecap="round" />
        <circle cx="520" cy="183" r="4" fill="#60a5fa" />
      </g>

      {/* Gold coin stacks */}
      <g filter="url(#loan-art-shadow)">
        <path d="M138 369v-65c0-11 27-20 60-20s60 9 60 20v65c0 12-27 21-60 21s-60-9-60-21Z" fill="url(#loan-gold-dark)" />
        <ellipse cx="198" cy="304" rx="60" ry="21" fill="#f8d879" />
        <path d="M138 325c0 12 27 21 60 21s60-9 60-21M138 347c0 12 27 21 60 21s60-9 60-21" fill="none" stroke="#fff0ad" strokeWidth="4" />
        <ellipse cx="198" cy="304" rx="45" ry="13" fill="none" stroke="#d09220" strokeWidth="2" />
        <text x="198" y="311" textAnchor="middle" fontSize="19" fontWeight="700" fill="#9a5b0e">₹</text>

        <path d="M226 403v-49c0-9 23-16 50-16s50 7 50 16v49c0 10-23 17-50 17s-50-7-50-17Z" fill="url(#loan-gold-dark)" />
        <ellipse cx="276" cy="354" rx="50" ry="17" fill="#ffe49a" />
        <path d="M226 377c0 10 23 17 50 17s50-7 50-17" fill="none" stroke="#fff0ad" strokeWidth="4" />
      </g>

      {/* Necklace and pendant */}
      <path d="M209 205c40-41 143-48 193-3 40 36 36 89-7 124-15 12-31 21-46 30" fill="none" stroke="#bd7614" strokeWidth="12" strokeLinecap="round" />
      <path d="M209 201c43-39 140-43 188 1 36 33 33 80-7 113-14 12-30 21-45 30" fill="none" stroke="url(#loan-gold)" strokeWidth="8" strokeLinecap="round" />
      <g fill="#fff1b8" stroke="#d08a1d" strokeWidth="2">
        <circle cx="226" cy="189" r="5" /><circle cx="250" cy="177" r="5" />
        <circle cx="277" cy="169" r="5" /><circle cx="306" cy="166" r="5" />
        <circle cx="336" cy="169" r="5" /><circle cx="365" cy="178" r="5" />
        <circle cx="389" cy="195" r="5" />
      </g>
      <path d="m342 332 12-20 12 20-12 26-12-26Z" fill="#60a5fa" stroke="#b97312" strokeWidth="5" />
      <circle cx="354" cy="312" r="7" fill="#fff1b8" stroke="#b97312" strokeWidth="3" />

      {/* Gold bangles */}
      <g transform="rotate(-18 333 402)" filter="url(#loan-art-shadow)">
        <ellipse cx="333" cy="403" rx="61" ry="24" fill="none" stroke="#b96e0b" strokeWidth="17" />
        <ellipse cx="333" cy="393" rx="61" ry="24" fill="none" stroke="url(#loan-gold)" strokeWidth="14" />
        <ellipse cx="333" cy="384" rx="61" ry="24" fill="none" stroke="#f8d879" strokeWidth="8" />
        <path d="M282 378c24-16 78-18 102-2" fill="none" stroke="#fff5c4" strokeWidth="3" strokeLinecap="round" />
      </g>

      {/* Gold bar */}
      <g filter="url(#loan-art-shadow)">
        <path d="m323 428 94-14 43 24-93 18-44-28Z" fill="#c98216" />
        <path d="m323 428 94-14 43 24-93 18-44-28Z" fill="url(#loan-gold)" />
        <path d="m323 428 94-14v18l-50 24-44-28Z" fill="#e5a733" />
        <path d="m417 414 43 24-93 18v-18l50-24Z" fill="#c98216" opacity="0.75" />
        <text x="388" y="438" textAnchor="middle" fontSize="10" fontWeight="700" letterSpacing="1" fill="#8a4b0a">22K GOLD</text>
      </g>
    </svg>
  );
}

export default function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetchApi("/api/token/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Save tokens to localStorage
        localStorage.setItem("access_token", data.access);
        localStorage.setItem("refresh_token", data.refresh);
        // Redirect to dashboard
        toast.success("Login successful!");
        router.push("/dashboard");
      } else {
        toast.warning("Unable to sign in. Check your credentials and try again.");
      }
    } catch {
      toast.warning("Service is temporarily unavailable. Try again shortly.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Left Partition - Brand and Gold Loan Illustration */}
      <div className="login-brand-panel">
        <div className="login-brand-logo">
          <img src="/logo.png" alt="TK Infotechsoft" />
        </div>
        <div className="login-illustration-wrap">
          <GoldLoanIllustration />
        </div>
      </div>

      {/* Right Partition - Login Form */}
      <div className="login-form-panel">
        <div className="login-card">
          <h1>Welcome back</h1>
          <p className="subtitle">Please enter your details to sign in.</p>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label" htmlFor="username">
                Username <span className="required">*</span>
              </label>
              <div className="input-wrap">
                <input
                  type="text"
                  id="username"
                  className="input"
                  placeholder="Enter your username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">
                Password <span className="required">*</span>
              </label>
              <div className="input-wrap">
                <input
                  type="password"
                  id="password"
                  className="input"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="form-footer">
              <Button type="button" disabled aria-label="Password reset is not configured; contact an administrator" title="Password reset is not configured; contact an administrator" className="btn btn-ghost" style={{ paddingLeft: 0, fontSize: "13px" }}>
                Forgot Password?
              </Button>
            </div>

            <div className="form-actions">
              <Button type="button" onClick={() => { setUsername(""); setPassword(""); }} className="btn btn-secondary">
                Cancel
              </Button>
              <Button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
                {loading ? "Logging in..." : "Login"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

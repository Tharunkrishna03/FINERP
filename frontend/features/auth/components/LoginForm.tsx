"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import toast from "@/services/toast";
import DotGrid from "@/components/ui/DotGrid/DotGrid";
import { fetchApi } from '@/services/api/client';

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
      {/* Left Partition - Logo & DotGrid */}
      <div className="login-brand-panel">
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, width: '100%', height: '100%' }}>
          <DotGrid
            dotSize={16}
            gap={32}
            baseColor="#5227FF"
            activeColor="#5227FF"
            proximity={150}
            speedTrigger={100}
            shockRadius={250}
            shockStrength={5}
            maxSpeed={5000}
            resistance={750}
            returnDuration={1.5}
            style={{ position: 'absolute', inset: 0 }}
          />
        </div>
        <div className="login-brand-card">
          <img src="/logo.png" alt="Logo" />
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

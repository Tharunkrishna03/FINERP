"use client";

import { useCallback, useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import toast from "@/services/toast";
import Loader from "@/components/ui/Loader";
import { fetchApi } from "@/services/api/client";
import { APP_MODULES, type AppModuleKey, getModuleLabel } from "@/services/moduleAccess";

interface AppUser {
  id: number;
  username: string;
  is_superuser: boolean;
  is_active: boolean;
  date_joined: string;
  visible_modules: AppModuleKey[];
}

export default function Settings() {
  const [userName, setUserName] = useState("");
  const [role, setRole] = useState("Administrator");
  const [snoFormat, setSnoFormat] = useState("1");
  const [anoFormat, setAnoFormat] = useState("1");
  const [customerIdNoFormat, setCustomerIdNoFormat] = useState("1");
  const [photo, setPhoto] = useState<File | null>(null);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string>("");

  const [loading, setLoading] = useState(false);

  const [oldPassword, setOldPassword] = useState("");
  const [isOldPasswordVerified, setIsOldPasswordVerified] = useState(false);
  const [verifyingOldPwd, setVerifyingOldPwd] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);

  const [isFetching, setIsFetching] = useState(true);

  // User Management State
  const [newUsername, setNewUsername] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserModules, setNewUserModules] = useState<AppModuleKey[]>([]);
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [isSuperuser, setIsSuperuser] = useState(false);

  // Active Tab State
  const [activeTab, setActiveTab] = useState<"profile" | "security" | "users">("profile");

  const fetchUsers = useCallback(async (showLoading = true) => {
    if (showLoading) setUsersLoading(true);
    try {
      const res = await fetchApi("/api/users/");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
        setIsSuperuser(true);
      } else {
        setIsSuperuser(false);
      }
    } catch {
      setIsSuperuser(false);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetchApi("/api/profile/");
        if (res.ok) {
          const data = await res.json();
          setUserName(data.user_name || "");
          setRole(data.role || "Administrator");
          setSnoFormat(data.sno_format || "1");
          setAnoFormat(data.ano_format || "1");
          setCustomerIdNoFormat(data.customer_id_no_format || "1");
          setCurrentPhotoUrl(data.profile_image || "");
          setIsSuperuser(Boolean(data.is_superuser));
        }
      } catch (err) {
        console.error("Failed to fetch profile", err instanceof Error ? err.message : String(err));
      } finally {
        setIsFetching(false);
      }
    }
    fetchProfile();
    // This call starts an asynchronous user-list request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUsers(false);
  }, [fetchUsers]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setPhoto(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl("");
    }
  };

  const handleCreateUser = async () => {
    if (!newUsername.trim() || !newUserPassword.trim()) {
      toast.warning("Enter a username and password.");
      return;
    }
    if (newUserModules.length === 0) {
      toast.warning("Select at least one module for this user.");
      return;
    }

    setCreateUserLoading(true);
    try {
      const response = await fetchApi("/api/users/create/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newUserPassword,
          visible_modules: newUserModules,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success(data.message || "User created successfully!");
        setNewUsername("");
        setNewUserPassword("");
        setNewUserModules([]);
        fetchUsers();
      } else {
        toast.warning("Unable to create the user. Check the details and try again.");
      }
    } catch {
      toast.warning("Service is temporarily unavailable. Try again shortly.");
    } finally {
      setCreateUserLoading(false);
    }
  };

  const toggleNewUserModule = (moduleKey: AppModuleKey) => {
    setNewUserModules((current) => {
      const selected = new Set(current);
      if (selected.has(moduleKey)) selected.delete(moduleKey);
      else selected.add(moduleKey);
      return APP_MODULES.filter(({ key }) => selected.has(key)).map(({ key }) => key);
    });
  };

  const handleDeleteUser = async (userId: number, username: string) => {
    if (!confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) return;

    try {
      const response = await fetchApi(`/api/users/${userId}/delete/`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (response.ok) {
        toast.success(data.message || "User deleted successfully!");
        fetchUsers();
      } else {
        toast.warning("Unable to delete the user. Try again.");
      }
    } catch {
      toast.warning("Service is temporarily unavailable. Try again shortly.");
    }
  };

  const handleSave = async () => {
    setLoading(true);

    try {
      if (photo) {
        const avatarData = new FormData();
        avatarData.append("image", photo);

        const avatarResponse = await fetchApi("/api/profile/avatar/", {
          method: "POST",
          body: avatarData,
        });

        if (!avatarResponse.ok) {
          toast.warning("Unable to update the profile image. Try again.");
          return;
        }

        const avatar = await avatarResponse.json();
        setCurrentPhotoUrl(avatar.profile_image || "");
      }

      if (!isSuperuser && photo) {
        toast.success("Profile image updated successfully!");
        setTimeout(() => window.location.reload(), 1000);
        return;
      }

      const formData = new FormData();
      formData.append("user_name", userName);
      formData.append("role", role);
      formData.append("sno_format", snoFormat);
      formData.append("ano_format", anoFormat);
      formData.append("customer_id_no_format", customerIdNoFormat);

      const response = await fetchApi("/api/profile/", {
        method: "PUT",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentPhotoUrl(data.profile_image || "");
        toast.success("Profile updated successfully!");
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast.warning("Unable to update the profile. Check the details and try again.");
      }
    } catch {
      toast.warning("Service is temporarily unavailable. Try again shortly.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOldPassword = async () => {
    if (!oldPassword) {
      toast.warning("Enter your current password.");
      return;
    }

    setVerifyingOldPwd(true);

    try {
      const response = await fetchApi("/api/verify-password/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ old_password: oldPassword }),
      });

      const data = await response.json();

      if (response.ok && data.valid) {
        setIsOldPasswordVerified(true);
        toast.success("Old password verified!");
      } else {
        toast.warning("Unable to verify the current password.");
        setIsOldPasswordVerified(false);
      }
    } catch {
      toast.warning("Service is temporarily unavailable. Try again shortly.");
      setIsOldPasswordVerified(false);
    } finally {
      setVerifyingOldPwd(false);
    }
  };

  const handlePasswordSave = async () => {
    if (!newPassword) {
      toast.warning("Enter a new password.");
      return;
    }

    setPwdLoading(true);

    try {
      const response = await fetchApi("/api/change-password/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_password: oldPassword, new_password: newPassword }),
      });

      if (response.ok) {
        toast.success("Password updated successfully!");
        setNewPassword("");
        setOldPassword("");
        setIsOldPasswordVerified(false);
      } else {
        toast.warning("Unable to update the password. Check the details and try again.");
      }
    } catch {
      toast.warning("Service is temporarily unavailable. Try again shortly.");
    } finally {
      setPwdLoading(false);
    }
  };

  const avatarDisplayUrl = previewUrl || currentPhotoUrl;

  return (
    <div style={{ width: "100%", maxWidth: "none", margin: "0 auto" }}>
      {isFetching && <Loader />}

      {/* Breadcrumb Header */}
      <div className="page-header" style={{ marginBottom: "20px" }}>
        <h1 className="text-blue-600 font-normal text-base" style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <Link href="/dashboard" className="breadcrumb-link">Dashboard</Link>
          <span>/</span>
          <span className="breadcrumb-active">Settings</span>
        </h1>
      </div>

      {/* Main Title & Subtitle */}
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>
          Account & System Settings
        </h2>
        <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>
          Manage profile identity, security credentials, sequence number formats, and user access.
        </p>
      </div>

      {/* Tab Bar Navigation */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          borderBottom: "1px solid var(--color-border)",
          marginBottom: "24px",
          background: "#fff",
          padding: "6px 8px 0",
          borderRadius: "12px 12px 0 0",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          style={{
            padding: "10px 20px",
            border: "none",
            background: "transparent",
            fontSize: "14px",
            fontWeight: 600,
            color: activeTab === "profile" ? "#2563eb" : "#64748b",
            borderBottom: activeTab === "profile" ? "2px solid #2563eb" : "2px solid transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            transition: "all 0.15s ease",
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17 }}>
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          Profile & Preferences
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("security")}
          style={{
            padding: "10px 20px",
            border: "none",
            background: "transparent",
            fontSize: "14px",
            fontWeight: 600,
            color: activeTab === "security" ? "#2563eb" : "#64748b",
            borderBottom: activeTab === "security" ? "2px solid #2563eb" : "2px solid transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            transition: "all 0.15s ease",
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17 }}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          Security
        </button>

        {isSuperuser && (
          <button
            type="button"
            onClick={() => setActiveTab("users")}
            style={{
              padding: "10px 20px",
              border: "none",
              background: "transparent",
              fontSize: "14px",
              fontWeight: 600,
              color: activeTab === "users" ? "#2563eb" : "#64748b",
              borderBottom: activeTab === "users" ? "2px solid #2563eb" : "2px solid transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.15s ease",
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17 }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            User Management
          </button>
        )}
      </div>

      {/* Tab 1: Profile & Preferences */}
      {activeTab === "profile" && (
        <div className="card" style={{ padding: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
            <div style={{ padding: 10, background: "#eff6ff", borderRadius: 10, color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#0f172a" }}>Profile Information</h3>
              <span style={{ fontSize: 13, color: "#64748b" }}>Update your display photo, account identity, and role assignment.</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Avatar Uploader Header Box */}
            <div style={{ display: "flex", alignItems: "center", gap: "20px", padding: "16px 20px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
              <div style={{ position: "relative" }}>
                {avatarDisplayUrl ? (
                  <img
                    src={avatarDisplayUrl}
                    alt="Profile Avatar"
                    style={{ width: "76px", height: "76px", borderRadius: "50%", objectFit: "cover", border: "3px solid #2563eb", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}
                  />
                ) : (
                  <div
                    style={{
                      width: "76px",
                      height: "76px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                      color: "#fff",
                      fontSize: "26px",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "3px solid #fff",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    }}
                  >
                    {(userName.charAt(0) || "A").toUpperCase()}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label className="form-label" style={{ margin: 0 }}>Profile Photo</label>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <label
                    style={{
                      padding: "6px 14px",
                      background: "#fff",
                      border: "1px solid #cbd5e1",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#334155",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    <span>Upload new image</span>
                    <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: "none" }} />
                  </label>
                  {photo && <span style={{ fontSize: 12, color: "#059669", fontWeight: 600 }}>{photo.name}</span>}
                </div>
                <span style={{ fontSize: 12, color: "#64748b" }}>JPG, PNG or GIF up to 5MB.</span>
              </div>
            </div>

            {/* Name & Role Fields */}
            <div className="settings-form-row settings-form-row--two">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Full Name</label>
                <div className="input-wrap">
                  <input type="text" className="input" placeholder="Enter full name" value={userName} onChange={(e) => setUserName(e.target.value)} />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Role</label>
                <div className="input-wrap">
                  <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
                    <option value="Administrator">Administrator</option>
                    <option value="Manager">Manager</option>
                    <option value="Staff">Staff</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ width: "100%", height: "1px", backgroundColor: "#e2e8f0", margin: "4px 0" }}></div>

            {/* Auto Sequence Formats */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16, color: "#2563eb" }}>
                  <polyline points="4 7 4 4 20 4 20 7"></polyline>
                  <line x1="9" y1="20" x2="15" y2="20"></line>
                  <line x1="12" y1="4" x2="12" y2="20"></line>
                </svg>
                <h4 style={{ margin: 0, color: "#1e293b", fontSize: "15px", fontWeight: 600 }}>Auto-Sequence Formats</h4>
              </div>
              <p style={{ margin: "0 0 16px 0", color: "#64748b", fontSize: "13px" }}>
                Define the next automatic format values for Serial Numbers (S.No), Application Numbers (A.No), and Customer IDs.
              </p>

              <div className="settings-form-row settings-form-row--three">
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label className="form-label">Next S.No Format</label>
                  <div className="input-wrap">
                    <input type="text" className="input" placeholder="e.g. 1 or SNO-1001" value={snoFormat} onChange={(e) => setSnoFormat(e.target.value)} />
                  </div>
                </div>

                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label className="form-label">Next A.No Format</label>
                  <div className="input-wrap">
                    <input type="text" className="input" placeholder="e.g. 1 or ANO-1001" value={anoFormat} onChange={(e) => setAnoFormat(e.target.value)} />
                  </div>
                </div>

                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label className="form-label">Next Customer ID</label>
                  <div className="input-wrap">
                    <input type="text" className="input" placeholder="e.g. 1 or CUST-1001" value={customerIdNoFormat} onChange={(e) => setCustomerIdNoFormat(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: "12px", display: "flex", justifyContent: "flex-end" }}>
              <Button type="button" onClick={handleSave} disabled={loading} className="btn btn-primary transition-colors">
                {loading ? "Saving changes..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Security */}
      {activeTab === "security" && (
        <div className="card" style={{ padding: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
            <div style={{ padding: 10, background: "#fef3c7", borderRadius: 10, color: "#d97706", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#0f172a" }}>Password & Security</h3>
              <span style={{ fontSize: 13, color: "#64748b" }}>Verify your current password before updating your account login credentials.</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Old Password Verification */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Old Password</label>
              <div className="settings-inline-control">
                <div className="input-wrap" style={{ flex: 1 }}>
                  <input
                    type="password"
                    className="input"
                    placeholder="Enter current password"
                    value={oldPassword}
                    onChange={(e) => {
                      setOldPassword(e.target.value);
                      if (isOldPasswordVerified) setIsOldPasswordVerified(false);
                    }}
                    disabled={isOldPasswordVerified}
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleVerifyOldPassword}
                  disabled={verifyingOldPwd || !oldPassword || isOldPasswordVerified}
                  className="btn btn-secondary"
                  style={{
                    whiteSpace: "nowrap",
                    background: isOldPasswordVerified ? "#dcfce7" : undefined,
                    color: isOldPasswordVerified ? "#166534" : undefined,
                    borderColor: isOldPasswordVerified ? "#bbf7d0" : undefined,
                  }}
                >
                  {verifyingOldPwd ? "Checking..." : isOldPasswordVerified ? "Verified ✓" : "Verify"}
                </Button>
              </div>
              {!isOldPasswordVerified && (
                <span className="form-hint">You must verify your old password before setting a new one.</span>
              )}
            </div>

            <div style={{ width: "100%", height: "1px", backgroundColor: "#e2e8f0", margin: "4px 0" }}></div>

            {/* New Password */}
            <div className="form-group" style={{ marginBottom: 0, opacity: isOldPasswordVerified ? 1 : 0.5 }}>
              <label className="form-label">New Password</label>
              <div className="input-wrap">
                <input
                  type="password"
                  className="input"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={!isOldPasswordVerified}
                />
              </div>
              <span className="form-hint">Enter a secure new password for your account.</span>
            </div>

            <div style={{ marginTop: "12px", display: "flex", justifyContent: "flex-end" }}>
              <Button
                type="button"
                onClick={handlePasswordSave}
                disabled={pwdLoading || !isOldPasswordVerified}
                className="btn btn-primary transition-colors"
              >
                {pwdLoading ? "Updating..." : "Update Password"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: User Management (Superuser) */}
      {activeTab === "users" && isSuperuser && (
        <div className="card" style={{ padding: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
            <div style={{ padding: 10, background: "#ecfdf5", borderRadius: 10, color: "#059669", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#0f172a" }}>User Access & Credentials</h3>
              <span style={{ fontSize: 13, color: "#64748b" }}>Create user accounts, set module visibility permissions, and manage active users.</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Create User Section */}
            <div style={{ padding: "20px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
              <h4 style={{ margin: "0 0 12px 0", fontSize: 15, fontWeight: 600, color: "#1e293b" }}>Create New User Account</h4>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div className="settings-form-row settings-form-row--two">
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label className="form-label">Username</label>
                    <div className="input-wrap">
                      <input
                        type="text"
                        className="input"
                        placeholder="Enter username"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label className="form-label">Password</label>
                    <div className="input-wrap">
                      <input
                        type="password"
                        className="input"
                        placeholder="Enter password"
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <span className="form-label">Allowed Modules <span className="required">*</span></span>
                  <div className="module-visibility-grid" style={{ marginTop: 6 }}>
                    {APP_MODULES.map((module) => (
                      <label key={module.key} className="module-visibility-option">
                        <input
                          type="checkbox"
                          className="checkbox"
                          checked={newUserModules.includes(module.key)}
                          onChange={() => toggleNewUserModule(module.key)}
                        />
                        <span>
                          <strong>{module.label}</strong>
                          <small>{module.description}</small>
                        </span>
                      </label>
                    ))}
                  </div>
                  <span className="form-hint">Select at least one module this user can access after sign-in.</span>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <Button
                    type="button"
                    onClick={handleCreateUser}
                    disabled={createUserLoading || !newUsername.trim() || !newUserPassword.trim() || newUserModules.length === 0}
                    className="btn btn-primary transition-colors"
                  >
                    {createUserLoading ? "Creating..." : "Create User"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Existing Users List */}
            <div>
              <h4 style={{ margin: "0 0 12px 0", color: "#1e293b", fontSize: "15px", fontWeight: 600 }}>Active User Accounts ({users.length})</h4>

              {usersLoading ? (
                <p style={{ color: "#64748b", fontSize: "13px" }}>Loading users...</p>
              ) : users.length === 0 ? (
                <p style={{ color: "#64748b", fontSize: "13px" }}>No users found.</p>
              ) : (
                <div className="table-scroll" style={{ borderRadius: 8, border: "1px solid #e2e8f0" }}>
                  <table className="data-table" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th>Username</th>
                        <th>Role</th>
                        <th>Visible Modules</th>
                        <th>Joined Date</th>
                        <th style={{ textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id}>
                          <td style={{ fontWeight: 600, color: "#1e293b" }}>
                            {user.username}
                            {user.is_superuser && (
                              <span
                                style={{
                                  marginLeft: "8px",
                                  fontSize: "11px",
                                  padding: "2px 8px",
                                  backgroundColor: "#dbeafe",
                                  color: "#1d4ed8",
                                  borderRadius: "12px",
                                  fontWeight: 600,
                                }}
                              >
                                Super Admin
                              </span>
                            )}
                          </td>
                          <td style={{ color: "#64748b" }}>
                            {user.is_superuser ? "Administrator" : "User"}
                          </td>
                          <td style={{ color: "#64748b", minWidth: "180px" }}>
                            {(user.visible_modules || []).map(getModuleLabel).join(", ") || "None"}
                          </td>
                          <td style={{ color: "#64748b" }}>
                            {new Date(user.date_joined).toLocaleDateString()}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {!user.is_superuser ? (
                              <Button
                                type="button"
                                onClick={() => handleDeleteUser(user.id, user.username)}
                                className="btn btn-secondary"
                                style={{ fontSize: "12px", padding: "4px 12px", color: "#dc2626" }}
                              >
                                Delete
                              </Button>
                            ) : (
                              <span style={{ fontSize: "12px", color: "#94a3b8" }}>—</span>
                            )}
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
    </div>
  );
}

"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { fetchApi } from '@/services/api/client';
import { APP_MODULES, normalizeVisibleModules, type AppModuleKey } from "@/services/moduleAccess";

function moduleForPathname(pathname: string): AppModuleKey | null {
  if (pathname === "/dashboard") return "dashboard";
  if (pathname.startsWith("/add-customer") || pathname.startsWith("/add-account") || pathname.startsWith("/customer-list")) return "customers";
  if (pathname.startsWith("/transaction")) return "transactions";
  if (["/today-collection", "/monthly-collection", "/overall-collection"].includes(pathname)) return "collections";
  if (pathname.startsWith("/settings")) return "settings";
  return null;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [customerOpen, setCustomerOpen] = useState(() => pathname.startsWith("/customer-list") || pathname.startsWith("/add-customer") || pathname.startsWith("/add-account"));
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const handleSignOut = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  };

  const handleSidebarToggle = () => {
    if (window.matchMedia("(max-width: 960px)").matches) {
      setSidebarOpen((open) => !open);
      return;
    }

    setDesktopSidebarCollapsed((collapsed) => !collapsed);
  };

  const searchableRoutes: { name: string; href: string; module: AppModuleKey }[] = [
    { name: "Dashboard", href: "/dashboard", module: "dashboard" },
    { name: "Add Customer", href: "/add-customer", module: "customers" },
    { name: "Customer List", href: "/customer-list", module: "customers" },
    { name: "Transaction", href: "/transaction", module: "transactions" },
    { name: "Today Collection", href: "/today-collection", module: "collections" },
    { name: "Monthly Collection", href: "/monthly-collection", module: "collections" },
    { name: "Overall Collection", href: "/overall-collection", module: "collections" },
    { name: "Settings", href: "/settings", module: "settings" }
  ];

  const [profileData, setProfileData] = useState<{
    user_name: string;
    role: string;
    profile_image: string | null;
    visible_modules: AppModuleKey[];
  }>({
    user_name: "",
    role: "",
    profile_image: null,
    visible_modules: [],
  });

  const filteredRoutes = searchableRoutes.filter(route =>
    profileData.visible_modules.includes(route.module) &&
    route.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  React.useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetchApi("/api/profile/");
        if (res.ok) {
          const data = await res.json();
          setProfileData({
            user_name: data.user_name || "",
            role: data.role || "",
            profile_image: data.profile_image || null,
            visible_modules: normalizeVisibleModules(data.visible_modules),
          });
        } else {
          setProfileData((current) => ({
            ...current,
            visible_modules: normalizeVisibleModules(null),
          }));
        }
      } catch (err) {
        console.error("Failed to fetch global profile", err instanceof Error ? err.message : String(err));
        setProfileData((current) => ({
          ...current,
          visible_modules: normalizeVisibleModules(null),
        }));
      } finally {
        setProfileLoaded(true);
      }
    }
    fetchProfile();
  }, []);

  const currentModule = moduleForPathname(pathname);
  const currentModuleAllowed = !currentModule || profileData.visible_modules.includes(currentModule);
  const firstVisibleModule = APP_MODULES.find(({ key }) => profileData.visible_modules.includes(key));

  React.useEffect(() => {
    if (!profileLoaded || currentModuleAllowed || !firstVisibleModule) return;
    router.replace(firstVisibleModule.href);
  }, [currentModuleAllowed, firstVisibleModule, profileLoaded, router]);

  const profileDropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (profileOpen) {
      timeout = setTimeout(() => {
        setProfileOpen(false);
      }, 5000);
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };

    if (profileOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      clearTimeout(timeout);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileOpen]);

  return (
    <div className={`app-shell ${desktopSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <div className="sidebar-logo" style={{ justifyContent: 'center', position: 'relative', marginBottom: '0px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
            <img src="/logo.png" alt="Logo" style={{ width: 96, height: 96, objectFit: "contain" }} />
          </div>
          <Button 
            className="icon-btn mobile-close-btn" 
            onClick={() => setSidebarOpen(false)}
            style={{ position: 'absolute', right: 10, top: 10, background: 'transparent', color: '#fff', border: 'none', cursor: 'pointer', width: 28, height: 28, padding: 0 }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </Button>
        </div>

        <nav className="nav-list">
          {profileData.visible_modules.includes("dashboard") && (
            <Link href="/dashboard" onClick={() => setSidebarOpen(false)} className={`nav-item ${pathname === '/dashboard' ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>
              Dashboard
            </Link>
          )}

          {profileData.visible_modules.includes("customers") && <div className={`nav-group ${customerOpen ? 'is-open' : ''}`}>
            <div className={`nav-item ${pathname.startsWith('/customer-list') || pathname.startsWith('/add-customer') || pathname.startsWith('/add-account') ? 'active' : ''}`}>
              <Link href="/customer-list" onClick={() => { setSidebarOpen(false); setCustomerOpen(true); }} style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, color: 'inherit', textDecoration: 'none' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                Customers
              </Link>
            </div>
            <div className="nav-submenu" style={{ display: 'none' }}>
              <Link href="/add-customer" onClick={() => setSidebarOpen(false)} className={`nav-item ${pathname === '/add-customer' ? 'active' : ''}`}>Add Customer</Link>
              <Link href="/customer-list" onClick={() => setSidebarOpen(false)} className={`nav-item ${pathname === '/customer-list' ? 'active' : ''}`}>Customer List</Link>
            </div>
          </div>}

          {profileData.visible_modules.includes("transactions") && <Link href="/transaction" onClick={() => setSidebarOpen(false)} className={`nav-item ${pathname === '/transaction' ? 'active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            Transaction
          </Link>}

          {profileData.visible_modules.includes("collections") && <div className={`nav-group ${collectionOpen ? 'is-open' : ''}`}>
            <div className="nav-item" onClick={() => setCollectionOpen(!collectionOpen)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
                Collection
              </div>
              <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
            <div className="nav-submenu">
              <Link href="/today-collection" onClick={() => setSidebarOpen(false)} className={`nav-item ${pathname === '/today-collection' ? 'active' : ''}`}>Today Collection</Link>
              <Link href="/monthly-collection" onClick={() => setSidebarOpen(false)} className={`nav-item ${pathname === '/monthly-collection' ? 'active' : ''}`}>Monthly Collection</Link>
              <Link href="/overall-collection" onClick={() => setSidebarOpen(false)} className={`nav-item ${pathname === '/overall-collection' ? 'active' : ''}`}>Overall Collection</Link>
            </div>
          </div>}
        </nav>
      </aside>

      {/* Topbar */}
      <header className="topbar">
        <div className="menubar">
          <Button className="icon-btn" onClick={handleSidebarToggle} style={{ background: "transparent", border: "none", cursor: "pointer" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </Button>
        </div>

        <div className="topbar-actions">
          <div className="search-field" style={{ position: "relative" }}>
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input 
              type="text" 
              placeholder="Search pages..." 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
            />
            {searchOpen && searchQuery && (
              <div className="dropdown-menu is-open" style={{ top: "calc(100% + 8px)", left: 0, right: 0, minWidth: "auto", width: "100%", maxHeight: "300px", overflowY: "auto" }}>
                {filteredRoutes.length > 0 ? (
                  filteredRoutes.map((route) => (
                    <Link key={route.href} href={route.href} style={{ textDecoration: "none", color: "inherit" }} onClick={() => setSearchQuery("")}>
                      <div className="dropdown-item">{route.name}</div>
                    </Link>
                  ))
                ) : (
                  <div className="dropdown-item" style={{ color: "var(--color-text-subtle)", pointerEvents: "none" }}>No pages found</div>
                )}
              </div>
            )}
          </div>

          {/* Notification icon */}
          <Button type="button" disabled aria-label="Notifications are not configured" className="icon-btn">
            
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          </Button>

          {/* User Profile */}
          <div className="dropdown" ref={profileDropdownRef}>
            <div className="profile-trigger" onClick={() => setProfileOpen(!profileOpen)} style={{ cursor: "pointer" }}>
              <div className="profile-avatar" style={{ overflow: "hidden", padding: profileData.profile_image ? "0" : undefined }}>
                {profileData.profile_image ? (
                  <img src={`${profileData.profile_image}`} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  profileData.user_name ? profileData.user_name.split(' ').map(n => n?.[0]).join('').substring(0, 2).toUpperCase() : "U"
                )}
              </div>
              <div className="profile-meta">
                <span className="name">{profileData.user_name || "Profile"}</span>
                <span className="role">{profileData.role || "User"}</span>
              </div>
            </div>
            
            <div className={`dropdown-menu ${profileOpen ? 'is-open' : ''}`}>
              {profileData.visible_modules.includes("settings") && (
                <>
                  <Link href="/settings" style={{ textDecoration: "none", color: "inherit" }}>
                    <div className="dropdown-item">My Profile</div>
                  </Link>
                  <Link href="/settings" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="dropdown-item">Settings</div>
                  </Link>
                </>
              )}
              {profileData.visible_modules.includes("settings") && <div className="dropdown-divider"></div>}
              <Link href="/" onClick={handleSignOut} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="dropdown-item danger">Sign out</div>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {!profileLoaded ? (
          <div className="empty-state" role="status">Loading your workspace…</div>
        ) : currentModuleAllowed ? (
          children
        ) : (
          <div className="empty-state" role="status">Opening a module enabled for your account…</div>
        )}
      </main>
    </div>
  );
}

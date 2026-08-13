import { useEffect, useId, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router";
import { useAuthStore } from "~/lib/authStore";

const navItems = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/upload", label: "Upload" },
  { to: "/wipe", label: "Manage data" },
];

const getNavLinkClass = ({ isActive }: { isActive: boolean }) =>
  `navbar-link${isActive ? " navbar-link-active" : ""}`;

const getMobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
  `navbar-mobile-link${isActive ? " navbar-mobile-link-active" : ""}`;

const Navbar = () => {
  const { isAuthenticated, isLoading, user, logout } = useAuthStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuId = useId();
  const location = useLocation();
  const navigate = useNavigate();
  const firstName = user?.name.trim().split(" ")[0] || "there";
  const userInitial = firstName.charAt(0).toUpperCase() || "U";

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout().catch(() => undefined);
    setIsLoggingOut(false);
    setIsMenuOpen(false);
    navigate("/auth");
  };

  return (
    <nav className="navbar" aria-label="Main navigation">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand" aria-label="HireLens dashboard">
          <span className="navbar-brand-text text-gradient">HireLens</span>
        </Link>

        {isAuthenticated && (
          <div className="navbar-links" aria-label="Primary">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={getNavLinkClass}>
                {item.label}
              </NavLink>
            ))}
          </div>
        )}

        <div className="navbar-actions">
          {isLoading ? (
            <span className="navbar-status" aria-hidden="true" />
          ) : isAuthenticated && user ? (
            <>
              <span className="navbar-user" title={user.email}>
                <span className="navbar-user-avatar" aria-hidden="true">
                  {userInitial}
                </span>
                <span className="navbar-user-name">Hi, {firstName}</span>
              </span>
              <button type="button" onClick={handleLogout} disabled={isLoggingOut} className="navbar-button">
                {isLoggingOut ? "Logging out..." : "Log out"}
              </button>
            </>
          ) : (
            <>
              <NavLink to="/auth" className={getNavLinkClass}>
                Log in
              </NavLink>
              <Link to="/signup" className="navbar-button navbar-button-primary">
                Sign up
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="navbar-menu-button"
          aria-controls={menuId}
          aria-expanded={isMenuOpen}
          aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
            {isMenuOpen ? (
              <path d="M6 6l12 12M18 6L6 18" />
            ) : (
              <>
                <path d="M4 7h16" />
                <path d="M4 12h16" />
                <path d="M4 17h16" />
              </>
            )}
          </svg>
        </button>
      </div>

      {isMenuOpen && (
        <div id={menuId} className="navbar-mobile-menu">
          {isAuthenticated ? (
            <>
              <div className="flex flex-col gap-1">
                {navItems.map((item) => (
                  <NavLink key={item.to} to={item.to} end={item.end} className={getMobileNavLinkClass}>
                    {item.label}
                  </NavLink>
                ))}
              </div>
              {user && (
                <div className="navbar-mobile-user">
                  <span className="navbar-user-avatar" aria-hidden="true">
                    {userInitial}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-white">Hi, {firstName}</span>
                    <span className="block truncate text-xs text-white/45">{user.email}</span>
                  </span>
                </div>
              )}
              <button type="button" onClick={handleLogout} disabled={isLoggingOut} className="navbar-mobile-button">
                {isLoggingOut ? "Logging out..." : "Log out"}
              </button>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <NavLink to="/auth" className={getMobileNavLinkClass}>
                Log in
              </NavLink>
              <Link to="/signup" className="navbar-mobile-button navbar-button-primary">
                Sign up
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;

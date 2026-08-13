import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useAuthStore } from "./authStore";

/**
 * useRequireAuth
 * Verifies the session on mount (via GET /api/auth/me) and redirects to
 * /auth?next=<current path> if the user isn't authenticated once the check
 * completes. Centralizing this fixes a class of bugs the original app had
 * scattered across pages (inconsistent useEffect deps, a malformed
 * `/resume${id}` redirect missing a slash, and `navigate(undefined)` when
 * no `next` param was present).
 */
export function useRequireAuth() {
  const { isAuthenticated, isLoading, checkAuthStatus } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    checkAuthStatus().finally(() => setChecked(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (checked && !isLoading && !isAuthenticated) {
      const next = encodeURIComponent(location.pathname + location.search);
      navigate(`/auth?next=${next}`);
    }
  }, [checked, isLoading, isAuthenticated, location.pathname, location.search, navigate]);

  return { isReady: checked && !isLoading && isAuthenticated, isLoading: isLoading || !checked };
}

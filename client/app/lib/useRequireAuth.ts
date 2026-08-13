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
  const { isAuthenticated, isCheckingAuth, checkAuthStatus } = useAuthStore();

  const navigate = useNavigate();
  const location = useLocation();

  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let mounted = true;

    checkAuthStatus().finally(() => {
      if (mounted) {
        setChecked(true);
      }
    });

    return () => {
      mounted = false;
    };
  }, [checkAuthStatus]);

  useEffect(() => {
    if (checked && !isCheckingAuth && !isAuthenticated) {
      const next = encodeURIComponent(location.pathname + location.search);

      navigate(`/auth?next=${next}`, {
        replace: true,
      });
    }
  }, [
    checked,
    isCheckingAuth,
    isAuthenticated,
    location.pathname,
    location.search,
    navigate,
  ]);

  return {
    isReady: checked && !isCheckingAuth && isAuthenticated,

    isLoading: isCheckingAuth || !checked,
  };
}

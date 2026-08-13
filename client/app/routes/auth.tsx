import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useAuthStore } from "~/lib/authStore";

export const meta = () => [
  { title: "HireLens | Log In" },
  {
    name: "description",
    content: "Log into your account",
  },
];

function getNextPath(search: string): string {
  const params = new URLSearchParams(search);
  const next = params.get("next");

  return next && next.startsWith("/") ? next : "/";
}

const Auth = () => {
  const { isAuthenticated, error, login, clearError } = useAuthStore();

  const location = useLocation();
  const navigate = useNavigate();

  const next = getNextPath(location.search);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(next);
    }
  }, [isAuthenticated, next, navigate]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (submitting) return;

    clearError();
    setSubmitting(true);

    try {
      await login(email, password);
    } catch {
      // Error is already stored in authStore.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main
      id="main-content"
      className="min-h-screen flex items-center justify-center"
    >
      <div className="gradient-border shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
        <section className="flex flex-col gap-8 bg-ink-soft/80 backdrop-blur-xl border border-white/10 rounded-2xl p-10">
          <div className="flex flex-col items-center gap-2 text-center">
            <h1>Welcome to HireLens</h1>
            <h2>Log in to continue your job journey</h2>
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 w-full"
            aria-describedby={error ? "auth-error" : undefined}
          >
            <div className="form-div">
              <label htmlFor="email">Email</label>

              <input
                id="email"
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!error}
                disabled={submitting}
              />
            </div>

            <div className="form-div">
              <label htmlFor="password">Password</label>

              <input
                id="password"
                type="password"
                required
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!error}
                disabled={submitting}
              />
            </div>

            {error && (
              <p id="auth-error" role="alert" className="text-red-400 text-sm">
                {error}
              </p>
            )}

            <button className="auth-button" type="submit" disabled={submitting}>
              <p>{submitting ? "Logging in..." : "Log In"}</p>
            </button>
          </form>

          <p className="text-center text-sm text-white/50">
            Don't have an account?{" "}
            <Link to="/signup" className="font-semibold text-emerald underline">
              Sign up
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
};

export default Auth;

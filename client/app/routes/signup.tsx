import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { useAuthStore } from "~/lib/authStore";

export const meta = () => [
  { title: "HireLens | Sign Up" },
  { name: "description", content: "Create your HireLens account" },
];

const Signup = () => {
  const { isLoading, isAuthenticated, error, signup, clearError } = useAuthStore();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate("/");
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    clearError();
    setSubmitting(true);
    try {
      await signup(name, email, password);
    } catch {
      // error is surfaced from the store below
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main id="main-content" className="min-h-screen flex items-center justify-center">
      <div className="gradient-border shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
        <section className="flex flex-col gap-8 bg-ink-soft/80 backdrop-blur-xl border border-white/10 rounded-2xl p-10">
          <div className="flex flex-col items-center gap-2 text-center">
            <h1>Create your account</h1>
            <h2>Start tracking applications with AI-powered feedback</h2>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full" aria-describedby={error ? "signup-error" : undefined}>
            <div className="form-div">
              <label htmlFor="name">Full name</label>
              <input
                id="name"
                type="text"
                required
                minLength={2}
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={!!error}
              />
            </div>
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
              />
            </div>
            <div className="form-div">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!error}
                aria-describedby="password-hint"
              />
              <p id="password-hint" className="text-xs text-white/30">
                At least 8 characters.
              </p>
            </div>

            {error && (
              <p id="signup-error" role="alert" className="text-red-400 text-sm">
                {error}
              </p>
            )}

            <button className="auth-button" type="submit" disabled={submitting || isLoading}>
              <p>{submitting || isLoading ? "Creating account..." : "Sign Up"}</p>
            </button>
          </form>

          <p className="text-center text-sm text-white/50">
            Already have an account?{" "}
            <Link to="/auth" className="font-semibold text-emerald underline">
              Log in
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
};

export default Signup;

import { useEffect, useState } from "react";
import Navbar from "~/components/Navbar";
import { useRequireAuth } from "~/lib/useRequireAuth";
import { useAuthStore } from "~/lib/authStore";
import { listResumes, deleteResume } from "~/lib/resumeApi";

const WipeApp = () => {
  useRequireAuth();
  const { user } = useAuthStore();
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [wiping, setWiping] = useState(false);
  const [error, setError] = useState("");
  const [deleteOne, setDeleteOne] = useState(false);

  const loadResumes = async () => {
    setLoading(true);
    setError("");
    try {
      setResumes(await listResumes());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load resumes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResumes();
  }, []);

  // Bug fix: the original used `files.forEach(async (f) => await ...)`,
  // which doesn't actually wait for the deletions (forEach ignores
  // returned promises) - flush/reload ran before deletes finished.
  // Promise.all over a map fixes that.
  const handleDelete = async () => {
    const confirmed = window.confirm(
      `This will permanently delete all ${resumes.length} resume(s) and every analysis built on them. This cannot be undone. Continue?`,
    );
    if (!confirmed) return;

    setWiping(true);
    setError("");
    try {
      await Promise.all(resumes.map((r) => deleteResume(r._id)));
      await loadResumes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete data");
    } finally {
      setWiping(false);
    }
  };
  const handleDeleteOne = async (resumeId: string) => {
    setDeleteOne(true);
    setError("");
    try {
      await deleteResume(resumeId);
      await loadResumes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete data");
    } finally {
      setDeleteOne(false);
    }
  };

  return (
    <main id="main-content" className="min-h-screen">
      <Navbar />
      <section className="main-section">
        <div className="page-heading py-16">
          <h1>Manage Your Data</h1>
          <h2>Authenticated as: {user?.email}</h2>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="flex flex-col gap-4 items-center w-full max-w-xl mx-auto">
            {error && <p className="text-red-400">{error}</p>}
            <p className="text-white/60">
              {resumes.length} resume{resumes.length === 1 ? "" : "s"} and all
              associated analyses stored.
            </p>
            <div className="flex flex-col gap-2 w-full">
              {resumes.map((r) => (
                <div
                  key={r._id}
                  className="flex flex-row gap-4 justify-between glass-panel !rounded-xl p-3"
                >
                  <p className="text-sm text-white/80">{r.originalFileName}</p>
                  <button
                    onClick={() => handleDeleteOne(r._id)}
                    className="hover:cursor-pointer text-amber-800 "
                  >
                    delete
                  </button>
                </div>
              ))}
            </div>
            {resumes.length > 0 && (
              <button
                className="rounded-full px-6 py-3 font-semibold text-red-300 border border-red-500/30
                  bg-red-500/10 hover:bg-red-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                onClick={handleDelete}
                disabled={wiping}
                aria-label="Permanently delete all my resumes and analyses"
              >
                {wiping ? "Deleting..." : "Delete All My Data"}
              </button>
            )}
          </div>
        )}
      </section>
    </main>
  );
};

export default WipeApp;

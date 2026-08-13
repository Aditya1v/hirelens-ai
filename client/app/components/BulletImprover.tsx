import { useState } from "react";
import { improveBullet } from "~/lib/resumeApi";
import { ApiError } from "~/lib/apiClient";

// Lets the user paste one resume bullet and get 2-3 grounded rewrites
// (action-verb + specificity focused, without inventing metrics).
const BulletImprover = ({ resumeId, jobTitle }: { resumeId: string; jobTitle?: string }) => {
  const [bullet, setBullet] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ improved: string[]; rationale: string } | null>(null);

  const handleImprove = async () => {
    if (!bullet.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await improveBullet({ bullet, resumeId, jobTitle });
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't improve this bullet right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel w-full p-6 flex flex-col gap-4">
      <div>
        <h3 className="text-2xl font-bold">Improve a Bullet Point</h3>
        <p className="text-sm text-white/50">Paste one line from your resume to get a stronger rewrite.</p>
      </div>

      <textarea
        rows={2}
        className="w-full p-3 inset-shadow rounded-2xl focus:outline-none bg-white/[0.05] text-sm"
        placeholder="e.g. Responsible for improving backend performance"
        value={bullet}
        onChange={(e) => setBullet(e.target.value)}
      />

      <button
        className="primary-button w-fit px-6 py-2 text-sm disabled:opacity-50"
        onClick={handleImprove}
        disabled={loading || !bullet.trim()}
      >
        {loading ? "Improving..." : "Improve"}
      </button>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {result && (
        <div className="flex flex-col gap-2">
          {result.improved.map((s, i) => (
            <div key={i} className="bg-white/[0.05] rounded-2xl p-3 text-sm text-white/80">
              {s}
            </div>
          ))}
          {result.rationale && <p className="text-xs text-white/40 italic">{result.rationale}</p>}
        </div>
      )}
    </div>
  );
};

export default BulletImprover;

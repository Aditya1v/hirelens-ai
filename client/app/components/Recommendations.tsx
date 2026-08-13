// Renders the RAG-grounded recommendations, each showing the resume
// evidence it's based on so the user can see the suggestion isn't
// fabricated - this is the visible half of the hallucination safeguard.

const sourceLabel: Record<string, string> = {
  resume: "From your resume",
  knowledge_base: "ATS best practice",
  job_description: "From the job description",
};

const Recommendations = ({ recommendations }: { recommendations: Recommendation[] }) => {
  if (!recommendations?.length) return null;

  return (
    <div className="glass-panel w-full p-6 flex flex-col gap-4">
      <div>
        <h3 className="text-2xl font-bold">AI Recommendations</h3>
        <p className="text-sm text-white/50">
          Each suggestion is grounded in something specific found in your resume or the job description.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {recommendations.map((rec, i) => (
          <div key={i} className="flex items-start gap-3 bg-white/[0.05] rounded-2xl p-4">
            <div className="flex flex-col gap-1 w-full">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-white/50">{rec.area}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] backdrop-blur-xl border border-white/10 text-white/50">
                  {sourceLabel[rec.source] || "Grounded"}
                </span>
              </div>
              <p className="text-sm text-white/80">{rec.suggestion}</p>
              <p className="text-xs text-white/40 italic">Evidence: {rec.evidence}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Recommendations;

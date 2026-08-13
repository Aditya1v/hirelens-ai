// Displays the hybrid job-match score (semantic + keyword blend) and the
// skill-gap breakdown (matched / missing / high-priority-missing skills).
// Only rendered when a job description was actually analyzed against.

const ScoreBar = ({ label, score }: { label: string; score: number }) => {
  const color = score >= 70 ? "bg-green-500" : score >= 45 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex justify-between text-sm">
        <span className="text-white/60">{label}</span>
        <span className="font-semibold">{score}%</span>
      </div>
      <div className="w-full h-2 bg-white/[0.08] rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${Math.max(4, score)}%` }} />
      </div>
    </div>
  );
};

const SkillChip = ({ label, variant }: { label: string; variant: "matched" | "missing" | "priority" }) => {
  const styles = {
    matched: "bg-emerald/10 text-emerald border-emerald/25",
    missing: "bg-white/[0.05] text-white/60 border-white/10",
    priority: "bg-red-500/10 text-red-300 border-red-500/25",
  }[variant];
  return <span className={`text-xs font-medium px-3 py-1 rounded-full border ${styles}`}>{label}</span>;
};

const JobMatch = ({ resume }: { resume: Resume }) => {
  if (resume.jobMatchScore === null || resume.jobMatchScore === undefined) return null;

  return (
    <div className="glass-panel w-full p-6 flex flex-col gap-5">
      <div>
        <h3 className="text-2xl font-bold">Job Match</h3>
        <p className="text-sm text-white/50">
          Hybrid score combining semantic similarity to the job description with literal keyword overlap.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <ScoreBar label="Overall job match" score={resume.jobMatchScore} />
        {typeof resume.semanticScore === "number" && <ScoreBar label="Semantic similarity" score={resume.semanticScore} />}
        {typeof resume.keywordScore === "number" && <ScoreBar label="Keyword match" score={resume.keywordScore} />}
      </div>

      {!!resume.priorityMissingSkills?.length && (
        <div>
          <p className="text-sm font-semibold text-white/70 mb-2">High-priority missing skills</p>
          <div className="flex flex-wrap gap-2">
            {resume.priorityMissingSkills.map((s) => (
              <SkillChip key={s} label={s} variant="priority" />
            ))}
          </div>
        </div>
      )}

      {!!resume.matchedSkills?.length && (
        <div>
          <p className="text-sm font-semibold text-white/70 mb-2">Matched skills</p>
          <div className="flex flex-wrap gap-2">
            {resume.matchedSkills.map((s) => (
              <SkillChip key={s} label={s} variant="matched" />
            ))}
          </div>
        </div>
      )}

      {!!resume.missingSkills?.length && (
        <div>
          <p className="text-sm font-semibold text-white/70 mb-2">Other missing skills</p>
          <div className="flex flex-wrap gap-2">
            {resume.missingSkills
              .filter((s) => !resume.priorityMissingSkills?.includes(s))
              .map((s) => (
                <SkillChip key={s} label={s} variant="missing" />
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default JobMatch;

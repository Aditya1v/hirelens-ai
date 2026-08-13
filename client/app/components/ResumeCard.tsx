import { useEffect, useState } from "react";
import { Link } from "react-router";
import { apiFetchBlobUrl } from "~/lib/apiClient";
import ScoreCircle from "./ScoreCircle";

const ResumeCard = ({ resume: { id, companyName, jobTitle, feedback, imagePath, jobMatchScore, status } }: { resume: Resume }) => {
  const [resumeUrl, setResumeUrl] = useState("");

  useEffect(() => {
    let cancelled = false;
    let objectUrl = "";

    const loadPreview = async () => {
      if (!imagePath) return;
      try {
        objectUrl = await apiFetchBlobUrl(imagePath);
        if (!cancelled) setResumeUrl(objectUrl);
      } catch {
        // No preview available - card still renders without the thumbnail.
      }
    };
    loadPreview();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imagePath]);

  return (
    <Link to={`/resume/${id}`} className="resume-card animate-in fade-in duration-1000">
      <div className="resume-card-header">
        <div className="flex flex-col gap-2">
          {companyName && <h2 className="text-bold font-bold break-words">{companyName}</h2>}
          {jobTitle && <h3 className="text-lg break-words text-white/50">{jobTitle}</h3>}
          {!companyName && !jobTitle && <h2 className="!text-white font-bold">Resume</h2>}
          {typeof jobMatchScore === "number" && (
            <p className="text-xs font-semibold text-white/50">Job match: {jobMatchScore}%</p>
          )}
          {status === "processing" && <p className="text-xs font-semibold text-amber-500">Processing…</p>}
          {status === "failed" && <p className="text-xs font-semibold text-red-500">Analysis failed</p>}
        </div>
        <div className="flex--shrink-0">
          <ScoreCircle score={feedback?.overallScore ?? 0} />
        </div>
      </div>
      {resumeUrl && (
        <div className="gradient-border animate-in fade-in duration-1000">
          <div className="w-full h-full">
            <img
              src={resumeUrl}
              alt={`Resume preview${companyName ? ` for ${companyName}` : ""}${jobTitle ? ` - ${jobTitle}` : ""}`}
              className="w-full h-[300px] max-sm:h-[200px] object-cover object-top"
            />
          </div>
        </div>
      )}
    </Link>
  );
};

export default ResumeCard;

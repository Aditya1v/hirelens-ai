import { useState, useEffect } from "react";
import { Link, useParams } from "react-router";
import ATS from "~/components/ATS";
import Details from "~/components/Details";
import Summary from "~/components/Summary";
import JobMatch from "~/components/JobMatch";
import Recommendations from "~/components/Recommendations";
import BulletImprover from "~/components/BulletImprover";
import { useRequireAuth } from "~/lib/useRequireAuth";
import { getAnalysis } from "~/lib/resumeApi";
import { apiFetchBlobUrl } from "~/lib/apiClient";

export const meta = () => [
  { title: "HireLens | Review" },
  { name: "description", content: "Detailed overview of your resume" },
];

const Resume = () => {
  useRequireAuth();
  const { id } = useParams();
  const [imageUrl, setImageUrl] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [analysis, setAnalysis] = useState<Resume | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const loadResume = async () => {
      try {
        const data = await getAnalysis(id);
        if (cancelled) return;
        setAnalysis(data);

        const [pdfUrl, imgUrl] = await Promise.all([
          data.resumePath ? apiFetchBlobUrl(data.resumePath) : Promise.resolve(""),
          data.imagePath ? apiFetchBlobUrl(data.imagePath) : Promise.resolve(""),
        ]);
        if (cancelled) return;
        setResumeUrl(pdfUrl);
        setImageUrl(imgUrl);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Failed to load analysis");
      }
    };
    loadResume();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const feedback = analysis?.feedback;

  return (
    // Bug fix: original className was "!pt=0" (equals sign instead of a
    // hyphen), so the Tailwind override never applied.
    <main id="main-content" className="!pt-0">
      <nav className="resume-nav">
        <Link to="/" className="back-button">
          <img src="/icons/back.svg" alt="logo" className="w-2.5 h-2.5" />
          <span className="text-white/80 text-sm font-semibold">Back to Homepage</span>
        </Link>
      </nav>
      <div className="flex flex-row w-full max-lg:flex-col-reverse">
        <section className="feedback-section bg-black/20 lg:h-[100vh] lg:sticky lg:top-0 flex items-center justify-center py-8 lg:py-0">
          {imageUrl && resumeUrl && (
            <div className="animate-in fade-in duration-1000 gradient-border max-sm:m-0 h-[90%] max-xl:h-fit w-fit max-w-full">
              <a href={resumeUrl} target="_blank" rel="noreferrer">
                <img src={imageUrl} className="w-full h-full object-contain rounded-2xl" title="resume" />
              </a>
            </div>
          )}
        </section>
        <section className="feedback-section">
          <h2 className="text-4xl !text-white font-bold">Resume Review</h2>

          {loadError && <p className="text-red-500">{loadError}</p>}

          {analysis?.status === "processing" && (
            <p className="text-amber-600 font-medium">This analysis is still processing…</p>
          )}
          {analysis?.status === "failed" && (
            <p className="text-red-500 font-medium">
              Analysis failed{analysis.errorMessage ? `: ${analysis.errorMessage}` : "."}
            </p>
          )}

          {feedback ? (
            <div className="flex flex-col gap-8 animate-in fade-in duration-1000">
              <Summary feedback={feedback} />
              <ATS score={feedback.ATS.score || 0} suggestions={feedback.ATS.tips || []} />
              <Details feedback={feedback} />
              {analysis && <JobMatch resume={analysis} />}
              {!!analysis?.recommendations?.length && <Recommendations recommendations={analysis.recommendations} />}
              {analysis?.resumeId && <BulletImprover resumeId={analysis.resumeId} jobTitle={analysis.jobTitle} />}
            </div>
          ) : (
            !loadError && <img src="/images/resume-scan-2.gif" className="w-full" alt="Loading" />
          )}
        </section>
      </div>
    </main>
  );
};

export default Resume;

import Navbar from "~/components/Navbar";
import type { Route } from "./+types/home";

import ResumeCard from "~/components/ResumeCard";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useRequireAuth } from "~/lib/useRequireAuth";
import { listAnalyses } from "~/lib/resumeApi";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "HireLens" },
    { name: "description", content: "Smart Feedback for your dream job" },
  ];
}

export default function Home() {
  const { isReady, isLoading: authLoading } = useRequireAuth();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loadingResume, setLoadingResume] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady) return;

    const loadResumes = async () => {
      setLoadingResume(true);
      setLoadError(null);
      try {
        const analyses = await listAnalyses();
        setResumes(analyses);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Failed to load your analysis history");
      } finally {
        setLoadingResume(false);
      }
    };
    loadResumes();
  }, [isReady]);

  if (authLoading) {
    return (
      <main id="main-content" className="min-h-screen flex items-center justify-center">
        <img src="/images/resume-scan-2.gif" className="w-[200px]" alt="Loading" />
      </main>
    );
  }

  return (
    <main id="main-content">
      <Navbar />
      <section className="main-section">
        <div className="page-heading py-16">
          <h1>Track Your Applications & Resume Ratings</h1>
          {!loadingResume && resumes?.length === 0 ? (
            <h2>No resumes found. Upload your first resume to get feedback</h2>
          ) : (
            <h2>Review your submissions and check AI-powered feedback.</h2>
          )}
        </div>

        {loadingResume && (
          <div className="flex flex-col items-center justify-center">
            <img src="/images/resume-scan-2.gif" className="w-[200px]" alt="Loading" />
          </div>
        )}

        {loadError && !loadingResume && (
          <div className="flex flex-col items-center justify-center mt-6 gap-2">
            <p className="text-red-500">{loadError}</p>
          </div>
        )}

        {!loadingResume && resumes.length > 0 && (
          <div className="resumes-section">
            {resumes.map((resume: Resume) => (
              <ResumeCard key={resume.id} resume={resume} />
            ))}
          </div>
        )}

        {!loadingResume && !loadError && resumes?.length === 0 && (
          <div className="flex flex-col items-center justify-center mt-10 gap-4">
            <Link to="/upload" className="primary-button w-fit text-xl font-semibold">
              Upload Resume
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}

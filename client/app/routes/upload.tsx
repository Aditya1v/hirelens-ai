import { useState } from "react";
import type { FormEvent } from "react";
import Navbar from "~/components/Navbar";
import { FileUploader } from "~/components/FileUploader";
import CompanyAutocomplete from "~/components/CompanyAutocomplete";
import { useNavigate } from "react-router";
import { convertPdfToImage } from "~/lib/pdf2img";
import { uploadResume, createAnalysis } from "~/lib/resumeApi";
import { findJobPosting } from "~/lib/jobsApi";
import { useRequireAuth } from "~/lib/useRequireAuth";
import { ApiError } from "~/lib/apiClient";

const Upload = () => {
  useRequireAuth();
  const navigate = useNavigate();

  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [errorText, setErrorText] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  const [isFindingPosting, setIsFindingPosting] = useState(false);
  const [postingSourceUrl, setPostingSourceUrl] = useState<string | null>(null);
  const [postingNotice, setPostingNotice] = useState("");

  const handleFileSelect = (file: File | null) => setFile(file);

  // Job-matching workflow: looks up a matching posting via the backend
  // (Adzuna free tier) and prefills the JD textarea with the excerpt found.
  // The textarea stays fully editable either way - this never blocks
  // manual entry, it's purely a time-saving starting point.
  const handleAutoFill = async () => {
    if (!companyName.trim() || !jobTitle.trim()) return;
    setIsFindingPosting(true);
    setPostingNotice("");
    setPostingSourceUrl(null);
    try {
      const { posting, configured } = await findJobPosting(companyName, jobTitle);
      if (!configured) {
        setPostingNotice("Auto-fill isn't set up on this server yet - enter the job description manually below.");
      } else if (!posting) {
        setPostingNotice(`Couldn't find a matching posting for "${jobTitle}" at ${companyName} - enter it manually below.`);
      } else {
        setJobDescription(posting.description);
        setPostingSourceUrl(posting.sourceUrl);
        setPostingNotice(
          `Auto-filled from a matching listing (an excerpt, not the full posting) - please review and edit before analyzing.`
        );
      }
    } catch {
      setPostingNotice("Couldn't look up a job posting right now - enter the job description manually below.");
    } finally {
      setIsFindingPosting(false);
    }
  };

  // Bug fix (kept from earlier pass): every failure path resets
  // isProcessing so the user is never stuck on the "Analyzing..." screen.
  const handleAnalyze = async ({ file }: { file: File }) => {
    setIsProcessing(true);
    setErrorText("");

    try {
      setStatusText("Rendering preview...");
      const imageResult = await convertPdfToImage(file);
      const previewFile = imageResult.file ?? undefined;

      setStatusText("Uploading and extracting resume data...");
      const resume = await uploadResume(file, previewFile);

      setStatusText("Scoring your resume and matching it to the role (this can take up to a minute)...");
      const analysis = await createAnalysis({
        resumeId: resume._id,
        companyName,
        jobTitle,
        jobDescription,
      });

      setStatusText("Done - redirecting...");
      navigate(`/resume/${analysis.id}`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Something went wrong during analysis.";
      setErrorText(message);
      setStatusText("");
      setIsProcessing(false);
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) return;
    handleAnalyze({ file });
  };

  const canAutoFill = companyName.trim().length > 1 && jobTitle.trim().length > 1 && !isFindingPosting;

  return (
    <main id="main-content">
      <Navbar />
      <section className="main-section">
        <div className="page-heading py-16">
          <h1>Smart feedback for your dream job</h1>
          {isProcessing ? (
            <>
              <h2 role="status" aria-live="polite">
                {statusText}
              </h2>
              <img src="/images/resume-scan.gif" className="w-full max-w-md" alt="" />
            </>
          ) : (
            <h2>Drop your resume for an ATS score and improvement tips</h2>
          )}
          {errorText && !isProcessing && (
            <p role="alert" className="text-red-400 font-medium mt-2">
              {errorText}
            </p>
          )}
          {!isProcessing && (
            <form id="upload-form" onSubmit={handleSubmit} className="flex flex-col gap-4 mt-8 w-full max-w-2xl">
              <div className="form-div">
                <label htmlFor="company-name">Company Name</label>
                <CompanyAutocomplete value={companyName} onChange={setCompanyName} />
              </div>
              <div className="form-div">
                <label htmlFor="job-title">Job Title</label>
                <input
                  type="text"
                  name="job-title"
                  placeholder="Job Title"
                  id="job-title"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                />
              </div>

              <div className="form-div">
                <div className="flex items-center justify-between w-full gap-2">
                  <label htmlFor="job-description" className="!mb-0">
                    Job Description
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoFill}
                    disabled={!canAutoFill}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full border border-emerald/30 text-emerald
                      bg-emerald/10 hover:bg-emerald/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed
                      whitespace-nowrap"
                  >
                    {isFindingPosting ? "Searching..." : "Auto-fill from a job posting"}
                  </button>
                </div>
                <textarea
                  rows={6}
                  name="job-description"
                  placeholder="Job Description - paste one in, or use auto-fill above once you've entered a company and job title"
                  id="job-description"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                />
                {postingNotice && (
                  <p role="status" aria-live="polite" className="text-xs text-white/50">
                    {postingNotice}
                    {postingSourceUrl && (
                      <>
                        {" "}
                        <a href={postingSourceUrl} target="_blank" rel="noreferrer" className="text-emerald underline">
                          View original listing
                        </a>
                      </>
                    )}
                  </p>
                )}
              </div>

              <div className="form-div">
                <label htmlFor="uploader">Upload Resume</label>
                <FileUploader onFileSelect={handleFileSelect} />
              </div>
              <button className="primary-button" type="submit" disabled={!file}>
                Analyze resume
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
};

export default Upload;

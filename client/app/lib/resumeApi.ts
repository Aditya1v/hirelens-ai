import { apiGet, apiSend, apiUpload } from "./apiClient";

/** Uploads the PDF (and optional client-rendered preview PNG) to the backend. */
export async function uploadResume(file: File, previewFile?: File | null): Promise<ResumeRecord> {
  const formData = new FormData();
  formData.append("resume", file);
  if (previewFile) formData.append("preview", previewFile);
  const { resume } = await apiUpload<{ resume: ResumeRecord }>("/api/resumes", formData);
  return resume;
}

export async function listResumes(): Promise<ResumeRecord[]> {
  const { resumes } = await apiGet<{ resumes: ResumeRecord[] }>("/api/resumes");
  return resumes;
}

export async function deleteResume(id: string): Promise<void> {
  await apiSend(`/api/resumes/${id}`, "DELETE");
}

/** Runs the full AI pipeline server-side and returns the saved analysis. */
export async function createAnalysis(params: {
  resumeId: string;
  companyName?: string;
  jobTitle?: string;
  jobDescription?: string;
}): Promise<Resume> {
  const { analysis } = await apiSend<{ analysis: Resume }>("/api/analyses", "POST", params);
  return analysis;
}

export async function listAnalyses(): Promise<Resume[]> {
  const { analyses } = await apiGet<{ analyses: Resume[] }>("/api/analyses");
  return analyses;
}

export async function getAnalysis(id: string): Promise<Resume> {
  const { analysis } = await apiGet<{ analysis: Resume }>(`/api/analyses/${id}`);
  return analysis;
}

export async function deleteAnalysis(id: string): Promise<void> {
  await apiSend(`/api/analyses/${id}`, "DELETE");
}

export async function improveBullet(params: {
  bullet: string;
  resumeId: string;
  jobTitle?: string;
}): Promise<{ improved: string[]; rationale: string }> {
  return apiSend("/api/analyses/improve-bullet", "POST", params);
}

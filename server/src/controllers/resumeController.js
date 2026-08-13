import fs from "fs";
import path from "path";
import Resume from "../models/Resume.js";
import Analysis from "../models/Analysis.js";
import { AppError, asyncHandler } from "../utils/AppError.js";
import { extractTextFromPdf } from "../services/pdfService.js";
import { extractResumeData } from "../services/extractionService.js";
import { embedText } from "../services/embeddingService.js";
import { UPLOAD_ROOT } from "../middleware/upload.js";

/**
 * POST /api/resumes
 * Accepts multipart form-data: "resume" (PDF, required), "preview" (PNG,
 * optional - client-rendered first-page preview). Runs the full backend
 * processing pipeline: text extraction -> LLM structured extraction ->
 * embedding -> persisted Resume document.
 */
export const uploadResume = asyncHandler(async (req, res) => {
  const resumeFile = req.files?.resume?.[0];
  if (!resumeFile) {
    throw new AppError("A resume PDF file is required (field name: resume).", 400);
  }
  const previewFile = req.files?.preview?.[0];

  const buffer = fs.readFileSync(resumeFile.path);
  const rawText = await extractTextFromPdf(buffer);

  const [structuredData, embedding] = await Promise.all([
    extractResumeData(rawText),
    embedText(rawText),
  ]);

  const resume = await Resume.create({
    user: req.user._id,
    originalFileName: resumeFile.originalname,
    filePath: resumeFile.path,
    previewImagePath: previewFile ? previewFile.path : null,
    fileSizeBytes: resumeFile.size,
    rawText,
    structuredData,
    embedding,
  });

  const { rawText: _omit, embedding: _omit2, ...safeResume } = resume.toObject();

  res.status(201).json({ success: true, data: { resume: safeResume } });
});

/**
 * GET /api/resumes
 * Lists the current user's uploaded resumes (metadata only, no raw text).
 */
export const listResumes = asyncHandler(async (req, res) => {
  const resumes = await Resume.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: { resumes } });
});

/**
 * GET /api/resumes/:id/file
 * Streams the original PDF back to its owner only.
 */
export const getResumeFile = asyncHandler(async (req, res) => {
  const resume = await ownedResumeOr404(req);
  res.setHeader("Content-Type", "application/pdf");
  fs.createReadStream(resume.filePath).pipe(res);
});

const PREVIEW_CONTENT_TYPE_BY_EXT = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

/**
 * GET /api/resumes/:id/preview
 * Streams the preview image (if one was uploaded) back to its owner only.
 */
export const getResumePreview = asyncHandler(async (req, res) => {
  const resume = await ownedResumeOr404(req);
  if (!resume.previewImagePath) throw new AppError("No preview image for this resume.", 404);
  const ext = path.extname(resume.previewImagePath).toLowerCase();
  res.setHeader("Content-Type", PREVIEW_CONTENT_TYPE_BY_EXT[ext] || "image/jpeg");
  fs.createReadStream(resume.previewImagePath).pipe(res);
});

/**
 * DELETE /api/resumes/:id
 * Deletes the resume, its files on disk, and any analyses built on it.
 */
export const deleteResume = asyncHandler(async (req, res) => {
  const resume = await ownedResumeOr404(req);

  await Analysis.deleteMany({ resume: resume._id, user: req.user._id });
  await Resume.deleteOne({ _id: resume._id });

  for (const p of [resume.filePath, resume.previewImagePath]) {
    if (p && fs.existsSync(p)) fs.unlink(p, () => {});
  }

  res.status(200).json({ success: true, data: null });
});

async function ownedResumeOr404(req) {
  const resume = await Resume.findOne({ _id: req.params.id, user: req.user._id }).select("+rawText");
  if (!resume) throw new AppError("Resume not found.", 404);

  // Defense-in-depth: file paths are always generated under this user's
  // upload directory, but double-check in case of any data inconsistency.
  const userDir = path.join(UPLOAD_ROOT, String(req.user._id));
  if (!resume.filePath.startsWith(userDir)) {
    throw new AppError("Not authorized to access this file.", 403);
  }
  return resume;
}

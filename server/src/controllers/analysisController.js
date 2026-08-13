import crypto from "crypto";
import Resume from "../models/Resume.js";
import Analysis from "../models/Analysis.js";
import { AppError, asyncHandler } from "../utils/AppError.js";
import { generateFeedback } from "../services/feedbackService.js";
import { computeJobMatch } from "../services/matchService.js";
import { generateRecommendations, retrieveRecommendationContext } from "../services/recommendationService.js";
import { improveBullet as improveBulletService } from "../services/bulletImprovementService.js";

function hashRequest({ resumeId, jobTitle, jobDescription }) {
  return crypto
    .createHash("sha256")
    .update(`${resumeId}|${jobTitle || ""}|${jobDescription || ""}`)
    .digest("hex");
}

/**
 * POST /api/analyses
 * body: { resumeId, companyName?, jobTitle?, jobDescription? }
 *
 * Orchestrates the full pipeline for one analysis run:
 *   0. Fast path: if this exact (resume, jobTitle, jobDescription) was
 *      already analyzed successfully, return the cached result instantly
 *      instead of re-running 3+ LLM calls (handles double-submits/retries).
 *   1. Load the resume (with raw text + embedding).
 *   2. In parallel: generate feedback, compute the hybrid job-match score
 *      + skill gap, AND retrieve RAG context for recommendations (the
 *      retrieval doesn't actually need match.missingSkills to run, only
 *      the final generation call does - running it concurrently instead
 *      of after match resolves removes it from the critical path).
 *   3. Generate RAG-grounded, evidence-checked recommendations using the
 *      already-fetched context.
 *   5. Persist everything as one Analysis document (this IS the history entry).
 */
export const createAnalysis = asyncHandler(async (req, res) => {
  const { resumeId, companyName, jobTitle, jobDescription } = req.body;

  const resume = await Resume.findOne({ _id: resumeId, user: req.user._id }).select("+rawText +embedding");
  if (!resume) throw new AppError("Resume not found.", 404);

  const requestHash = hashRequest({ resumeId, jobTitle, jobDescription });

  const cached = await Analysis.findOne({ user: req.user._id, requestHash, status: "completed" });
  if (cached) {
    return res.status(200).json({ success: true, data: { analysis: toCardDTO(cached, resume), cached: true } });
  }

  let analysis = await Analysis.create({
    user: req.user._id,
    resume: resume._id,
    companyName,
    jobTitle,
    jobDescription,
    requestHash,
    feedback: PLACEHOLDER_FEEDBACK, // overwritten below; satisfies required schema during processing
    status: "processing",
  });

  try {
    const [feedback, match, kbContext] = await Promise.all([
      generateFeedback({ resumeText: resume.rawText, jobTitle, jobDescription }),
      computeJobMatch({
        resumeText: resume.rawText,
        resumeEmbedding: resume.embedding,
        structuredData: resume.structuredData,
        jobDescription,
      }),
      retrieveRecommendationContext({ jobTitle, jobDescription }),
    ]);

    const recommendations = await generateRecommendations({
      resumeText: resume.rawText,
      jobTitle,
      jobDescription,
      missingSkills: match.missingSkills,
      kbContext,
    });

    analysis.feedback = feedback;
    analysis.jobMatchScore = match.jobMatchScore;
    analysis.semanticScore = match.semanticScore;
    analysis.keywordScore = match.keywordScore;
    analysis.matchedSkills = match.matchedSkills;
    analysis.missingSkills = match.missingSkills;
    analysis.priorityMissingSkills = match.priorityMissingSkills;
    analysis.recommendations = recommendations;
    analysis.status = "completed";
    await analysis.save();
  } catch (err) {
    analysis.status = "failed";
    analysis.errorMessage = err.message || "Analysis failed";
    await analysis.save();
    throw new AppError(`Analysis failed: ${analysis.errorMessage}`, err.statusCode || 502);
  }

  res.status(201).json({ success: true, data: { analysis: toCardDTO(analysis, resume) } });
});

/**
 * GET /api/analyses
 * History list, shaped to match the DTO the frontend cards expect.
 */
export const listAnalyses = asyncHandler(async (req, res) => {
  const analyses = await Analysis.find({ user: req.user._id }).populate("resume").sort({ createdAt: -1 });
  res.status(200).json({
    success: true,
    data: { analyses: analyses.map((a) => toCardDTO(a, a.resume)) },
  });
});

/**
 * GET /api/analyses/:id
 */
export const getAnalysis = asyncHandler(async (req, res) => {
  const analysis = await Analysis.findOne({ _id: req.params.id, user: req.user._id }).populate("resume");
  if (!analysis) throw new AppError("Analysis not found.", 404);
  res.status(200).json({ success: true, data: { analysis: toCardDTO(analysis, analysis.resume) } });
});

/**
 * DELETE /api/analyses/:id
 */
export const deleteAnalysis = asyncHandler(async (req, res) => {
  const result = await Analysis.deleteOne({ _id: req.params.id, user: req.user._id });
  if (result.deletedCount === 0) throw new AppError("Analysis not found.", 404);
  res.status(200).json({ success: true, data: null });
});

/**
 * POST /api/analyses/improve-bullet
 * body: { bullet, resumeId, jobTitle? }
 */
export const improveBullet = asyncHandler(async (req, res) => {
  const { bullet, resumeId, jobTitle } = req.body;

  const resume = await Resume.findOne({ _id: resumeId, user: req.user._id }).select("+rawText");
  if (!resume) throw new AppError("Resume not found.", 404);

  const result = await improveBulletService({ bullet, resumeContext: resume.rawText, jobTitle });
  res.status(200).json({ success: true, data: result });
});

// Shapes an Analysis+Resume pair into the DTO the existing frontend
// components expect (id, companyName, jobTitle, imagePath, resumePath,
// feedback), plus the new HireLens fields alongside it.
function toCardDTO(analysis, resume) {
  return {
    id: analysis._id.toString(),
    resumeId: resume?._id?.toString(),
    companyName: analysis.companyName,
    jobTitle: analysis.jobTitle,
    jobDescription: analysis.jobDescription,
    imagePath: resume?.previewImagePath ? `/api/resumes/${resume._id}/preview` : "",
    resumePath: resume ? `/api/resumes/${resume._id}/file` : "",
    feedback: analysis.feedback,
    jobMatchScore: analysis.jobMatchScore,
    semanticScore: analysis.semanticScore,
    keywordScore: analysis.keywordScore,
    matchedSkills: analysis.matchedSkills,
    missingSkills: analysis.missingSkills,
    priorityMissingSkills: analysis.priorityMissingSkills,
    recommendations: analysis.recommendations,
    status: analysis.status,
    errorMessage: analysis.errorMessage,
    createdAt: analysis.createdAt,
  };
}

const PLACEHOLDER_FEEDBACK = {
  overallScore: 0,
  ATS: { score: 0, tips: [] },
  toneAndStyle: { score: 0, tips: [] },
  content: { score: 0, tips: [] },
  structure: { score: 0, tips: [] },
  skills: { score: 0, tips: [] },
};

import mongoose from "mongoose";

const tipSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["good", "improve"], required: true },
    tip: { type: String, required: true },
    explanation: { type: String, default: "" },
  },
  { _id: false }
);

const categorySchema = new mongoose.Schema(
  {
    score: { type: Number, min: 0, max: 100, required: true },
    tips: [tipSchema],
  },
  { _id: false }
);

// Kept structurally identical to the original frontend's `Feedback` type
// (types/index.d.ts) so existing components (Summary, ATS, Details) work
// against this data without modification.
const feedbackSchema = new mongoose.Schema(
  {
    overallScore: { type: Number, min: 0, max: 100, required: true },
    ATS: { type: categorySchema, required: true },
    toneAndStyle: { type: categorySchema, required: true },
    content: { type: categorySchema, required: true },
    structure: { type: categorySchema, required: true },
    skills: { type: categorySchema, required: true },
  },
  { _id: false }
);

// Evidence-grounded recommendation: every suggestion must point back to
// something actually present in the resume (or explicitly say it's a gap),
// which is how we guard against the model inventing experience.
const recommendationSchema = new mongoose.Schema(
  {
    area: { type: String, required: true }, // e.g. "Experience", "Skills", "Summary"
    suggestion: { type: String, required: true },
    evidence: { type: String, default: "" }, // quote/paraphrase from the resume this is grounded in
    source: { type: String, enum: ["resume", "knowledge_base", "job_description"], default: "resume" },
  },
  { _id: false }
);

const analysisSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    resume: { type: mongoose.Schema.Types.ObjectId, ref: "Resume", required: true },

    companyName: { type: String, default: "" },
    jobTitle: { type: String, default: "" },
    jobDescription: { type: String, default: "" },

    // sha256(resumeId|jobTitle|jobDescription) - lets identical repeat
    // requests (double-submits, retries) short-circuit to a cached result
    // instead of re-running the full AI pipeline. See matchService note in
    // analysisController.js.
    requestHash: { type: String, index: true },

    feedback: { type: feedbackSchema, required: true },

    // Hybrid job-match score = weighted blend of semantic + keyword scores.
    jobMatchScore: { type: Number, min: 0, max: 100, default: null },
    semanticScore: { type: Number, min: 0, max: 100, default: null },
    keywordScore: { type: Number, min: 0, max: 100, default: null },

    matchedSkills: [{ type: String }],
    missingSkills: [{ type: String }],
    priorityMissingSkills: [{ type: String }], // subset of missingSkills flagged as high-priority

    recommendations: [recommendationSchema],

    status: {
      type: String,
      enum: ["processing", "completed", "failed"],
      default: "processing",
    },
    errorMessage: { type: String, default: null },
  },
  { timestamps: true }
);

analysisSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("Analysis", analysisSchema);

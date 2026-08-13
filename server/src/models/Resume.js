import mongoose from "mongoose";

// Structured data pulled out of the resume by the LLM extraction step
// (see services/extractionService.js). This is what powers skill-gap
// analysis and semantic matching instead of re-reading raw text every time.
const structuredDataSchema = new mongoose.Schema(
  {
    skills: [{ type: String }],
    technologies: [{ type: String }],
    education: [
      {
        degree: String,
        institution: String,
        year: String,
      },
    ],
    experience: [
      {
        title: String,
        company: String,
        duration: String,
        highlights: [String],
      },
    ],
    projects: [
      {
        name: String,
        description: String,
        technologies: [String],
      },
    ],
    certifications: [{ type: String }],
  },
  { _id: false },
);

const resumeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    originalFileName: { type: String, required: true },
    // Path on disk (server/uploads/...) - never sent to the client directly,
    // files are streamed through an authenticated download route instead.
    filePath: { type: String, required: true },
    previewImagePath: { type: String, default: null },
    fileSizeBytes: { type: Number, required: true },

    rawText: { type: String, required: true, select: false }, // extracted PDF text, large - excluded by default
    structuredData: { type: structuredDataSchema, default: () => ({}) },

    // Embedding of the resume text, used for semantic job-match scoring.
    // Excluded by default since it's a large float array with no UI use.
    embedding: { type: [Number], select: false, default: undefined },
  },
  { timestamps: true },
);

resumeSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("Resume", resumeSchema);

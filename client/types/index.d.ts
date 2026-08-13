interface Job {
  title: string;
  description: string;
  location: string;
  requiredSkills: string[];
}

// One completed (or in-progress) analysis run - the original Resume shape
// is preserved so existing components (ResumeCard, Summary, ATS, Details)
// work unchanged; new fields are additive.
interface Resume {
  id: string;
  resumeId?: string;
  companyName?: string;
  jobTitle?: string;
  jobDescription?: string;
  imagePath: string;
  resumePath: string;
  feedback: Feedback;

  // Hybrid job-match scoring (null until a job description is analyzed against)
  jobMatchScore?: number | null;
  semanticScore?: number | null;
  keywordScore?: number | null;
  matchedSkills?: string[];
  missingSkills?: string[];
  priorityMissingSkills?: string[];

  recommendations?: Recommendation[];

  status?: "processing" | "completed" | "failed";
  errorMessage?: string | null;
  createdAt?: string;
}

interface Recommendation {
  area: string;
  suggestion: string;
  evidence: string;
  source: "resume" | "knowledge_base" | "job_description";
}

interface Feedback {
  overallScore: number;
  ATS: {
    score: number;
    tips: {
      type: "good" | "improve";
      tip: string;
    }[];
  };
  toneAndStyle: {
    score: number;
    tips: {
      type: "good" | "improve";
      tip: string;
      explanation: string;
    }[];
  };
  content: {
    score: number;
    tips: {
      type: "good" | "improve";
      tip: string;
      explanation: string;
    }[];
  };
  structure: {
    score: number;
    tips: {
      type: "good" | "improve";
      tip: string;
      explanation: string;
    }[];
  };
  skills: {
    score: number;
    tips: {
      type: "good" | "improve";
      tip: string;
      explanation: string;
    }[];
  };
}

// Metadata for an uploaded resume file (as returned by /api/resumes),
// distinct from an Analysis - one resume can have many analyses run
// against different job descriptions.
interface ResumeRecord {
  _id: string;
  originalFileName: string;
  fileSizeBytes: number;
  structuredData: {
    skills: string[];
    technologies: string[];
    education: { degree: string; institution: string; year: string }[];
    experience: { title: string; company: string; duration: string; highlights: string[] }[];
    projects: { name: string; description: string; technologies: string[] }[];
    certifications: string[];
  };
  createdAt: string;
}

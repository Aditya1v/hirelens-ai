import { z } from "zod";
import { AppError } from "../utils/AppError.js";

/**
 * validate(schema)
 * Returns Express middleware that parses req.body against a zod schema.
 * On failure, throws a 400 AppError with a readable message instead of
 * letting bad input reach controllers/DB.
 */
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const message = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return next(new AppError(message, 400));
  }
  req.body = result.data;
  next();
};

export const signupSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const analyzeSchema = z.object({
  resumeId: z.string().min(1, "resumeId is required"),
  companyName: z.string().trim().max(200).optional().default(""),
  jobTitle: z.string().trim().max(200).optional().default(""),
  jobDescription: z.string().trim().max(20000).optional().default(""),
});

export const improveBulletSchema = z.object({
  bullet: z.string().trim().min(3, "Bullet text is required").max(1000),
  resumeId: z.string().min(1, "resumeId is required"),
  jobTitle: z.string().trim().max(200).optional().default(""),
});

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import compression from "compression";
import mongoSanitize from "express-mongo-sanitize";
import rateLimit from "express-rate-limit";

import authRoutes from "./routes/authRoutes.js";
import resumeRoutes from "./routes/resumeRoutes.js";
import analysisRoutes from "./routes/analysisRoutes.js";
import jobsRoutes from "./routes/jobsRoutes.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

export function createApp() {
  const app = express();

  // Security headers (CSP, X-Frame-Options, etc). API-only responses, so a
  // restrictive default policy is safe with no risk of breaking inline
  // client assets (the client is a separate app).
  app.use(helmet());
  app.use(compression());

  app.use(
    cors({
      origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
      credentials: true,
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  // Strips any request key starting with "$" or containing "." from
  // req.body/query/params - defense-in-depth against NoSQL operator
  // injection, on top of zod validation and Mongoose's own type coercion.
  app.use(mongoSanitize());
  app.use("/api", globalLimiter);

  app.get("/api/health", (req, res) => {
    res.json({ success: true, data: { status: "ok", time: new Date().toISOString() } });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/resumes", resumeRoutes);
  app.use("/api/analyses", analysisRoutes);
  app.use("/api/jobs", jobsRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

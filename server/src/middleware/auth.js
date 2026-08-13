import { verifyToken } from "../utils/jwt.js";
import { AppError } from "../utils/AppError.js";
import User from "../models/User.js";
import { asyncHandler } from "../utils/AppError.js";

/**
 * requireAuth
 * Reads the JWT from the httpOnly auth cookie, verifies it, and loads the
 * user onto req.user. Used on every protected route (resumes, analyses).
 * Cookie-based (not Authorization header) so the token is never touched by
 * client-side JS, which is the main defense against XSS token theft.
 */
export const requireAuth = asyncHandler(async (req, res, next) => {
  const cookieName = process.env.COOKIE_NAME || "hirelens_token";
  const token = req.cookies?.[cookieName];

  if (!token) {
    throw new AppError("Not authenticated. Please log in.", 401);
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new AppError("Session expired or invalid. Please log in again.", 401);
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    throw new AppError("User no longer exists.", 401);
  }

  req.user = user;
  next();
});

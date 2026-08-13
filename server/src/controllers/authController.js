import User from "../models/User.js";
import { signToken } from "../utils/jwt.js";
import { AppError, asyncHandler } from "../utils/AppError.js";

const cookieOptions = () => {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,

    secure: isProduction,

    /*
     * Production traffic is routed through the Vercel
     * reverse proxy, so the browser sees the API as
     * same-origin.
     *
     * "lax" is preferable when possible.
     */
    sameSite: isProduction ? "lax" : "lax",

    maxAge: 7 * 24 * 60 * 60 * 1000,

    path: "/",
  };
};

function sendAuthResponse(res, statusCode, user) {
  const token = signToken(user._id.toString());

  res.cookie(
    process.env.COOKIE_NAME || "hirelens_token",
    token,
    cookieOptions(),
  );

  res.status(statusCode).json({
    success: true,
    data: {
      user,
    },
  });
}

/**
 * POST /api/auth/signup
 */
export const signup = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email });

  if (existing) {
    throw new AppError("An account with this email already exists.", 409);
  }

  const passwordHash = await User.hashPassword(password);

  const user = await User.create({
    name,
    email,
    passwordHash,
  });

  sendAuthResponse(res, 201, user);
});

/**
 * POST /api/auth/login
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({
    email,
  }).select("+passwordHash");

  if (!user) {
    throw new AppError("Invalid email or password.", 401);
  }

  const valid = await user.comparePassword(password);

  if (!valid) {
    throw new AppError("Invalid email or password.", 401);
  }

  sendAuthResponse(res, 200, user);
});

/**
 * POST /api/auth/logout
 */
export const logout = asyncHandler(async (req, res) => {
  res.clearCookie(process.env.COOKIE_NAME || "hirelens_token", cookieOptions());

  res.status(200).json({
    success: true,
    data: null,
  });
});

/**
 * GET /api/auth/me
 */
export const me = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      user: req.user,
    },
  });
});

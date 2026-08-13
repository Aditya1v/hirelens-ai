import { asyncHandler } from "../utils/AppError.js";
import { suggestCompanies } from "../services/companyService.js";
import { findJobPosting, isJobPostingLookupConfigured } from "../services/jobPostingService.js";

/**
 * GET /api/jobs/companies?q=goo
 */
export const getCompanySuggestions = asyncHandler(async (req, res) => {
  const suggestions = await suggestCompanies(req.query.q);
  res.status(200).json({ success: true, data: { suggestions } });
});

/**
 * GET /api/jobs/find-posting?company=Google&title=Software+Engineer
 * Returns { posting: null } (not an error) if lookup isn't configured or
 * nothing matched - the frontend treats both the same way: fall back to
 * manual entry.
 */
export const getJobPosting = asyncHandler(async (req, res) => {
  const { company, title } = req.query;
  const posting = await findJobPosting({ companyName: company, jobTitle: title });
  res.status(200).json({
    success: true,
    data: { posting, configured: isJobPostingLookupConfigured() },
  });
});

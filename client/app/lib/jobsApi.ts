import { apiGet } from "./apiClient";

export interface CompanySuggestion {
  name: string;
  domain: string | null;
}

export async function suggestCompanies(query: string): Promise<CompanySuggestion[]> {
  if (!query || query.trim().length < 2) return [];
  const { suggestions } = await apiGet<{ suggestions: CompanySuggestion[] }>(
    `/api/jobs/companies?q=${encodeURIComponent(query)}`
  );
  return suggestions;
}

export interface JobPosting {
  title: string;
  company: string;
  description: string;
  sourceUrl: string | null;
  isExcerpt: boolean;
}

export async function findJobPosting(
  company: string,
  title: string
): Promise<{ posting: JobPosting | null; configured: boolean }> {
  return apiGet(`/api/jobs/find-posting?company=${encodeURIComponent(company)}&title=${encodeURIComponent(title)}`);
}

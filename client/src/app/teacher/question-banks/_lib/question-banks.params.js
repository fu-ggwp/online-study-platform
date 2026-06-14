import { ITEMS_PER_PAGE } from "./question-banks.constants";

export function buildQuestionBankParams({ keyword, page, status }) {
  return {
    keyword: keyword.trim() || undefined,
    status: status === "all" ? undefined : status,
    page,
    limit: ITEMS_PER_PAGE,
    sortBy: "updated_at",
    sortOrder: "desc",
  };
}
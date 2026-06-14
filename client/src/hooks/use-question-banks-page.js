"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ITEMS_PER_PAGE } from "@/app/teacher/question-banks/_lib/question-banks.constants";
import { buildQuestionBankParams } from "@/app/teacher/question-banks/_lib/question-banks.params";
import { questionBanksService } from "@/services/question-banks.service";

const defaultPagination = (page) => ({ page, limit: ITEMS_PER_PAGE, total: 0, totalPages: 0 });

export function useQuestionBanksPage() {
  const [questionBanks, setQuestionBanks] = useState([]);
  const [pagination, setPagination] = useState(defaultPagination(1));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [draftKeyword, setDraftKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [draftStatus, setDraftStatus] = useState("all");
  const [appliedStatus, setAppliedStatus] = useState("all");
  const [page, setPage] = useState(1);

  const params = useMemo(
    () => buildQuestionBankParams({ keyword: appliedKeyword, page, status: appliedStatus }),
    [appliedKeyword, appliedStatus, page]
  );

  const fetchQuestionBanks = useCallback(async (activeParams, fallbackPage) => {
    try {
      const data = await questionBanksService.listMine(activeParams);
      setQuestionBanks(data?.items ?? []);
      setPagination(data?.pagination ?? defaultPagination(fallbackPage));
      setError(null);
    } catch (err) {
      setQuestionBanks([]);
      setPagination(defaultPagination(fallbackPage));
      setError(err.response?.data?.message || err.message || "Failed to load question banks.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadQuestionBanks = useCallback(async () => {
    setLoading(true);
    setError(null);
    await fetchQuestionBanks(params, page);
  }, [fetchQuestionBanks, page, params]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchQuestionBanks(params, page);
  }, [fetchQuestionBanks, page, params]);

  function handleKeywordChange(event) {
    setDraftKeyword(event.target.value);
  }

  function applyFilters() {
    const shouldFetch = draftKeyword !== appliedKeyword || draftStatus !== appliedStatus || page !== 1;

    if (shouldFetch) {
      setLoading(true);
    }

    setError(null);
    setAppliedKeyword(draftKeyword);
    setAppliedStatus(draftStatus);
    setPage(1);
  }

  function resetFilters() {
    const shouldFetch = appliedStatus !== "all" || page !== 1;

    if (shouldFetch) {
      setLoading(true);
    }

    setError(null);
    setDraftStatus("all");
    setAppliedStatus("all");
    setPage(1);
  }

  function changePage(nextPage) {
    setLoading(true);
    setError(null);
    setPage(nextPage);
  }

  return {
    draftKeyword,
    draftStatus,
    error,
    handleKeywordChange,
    loading,
    loadQuestionBanks,
    onApplyFilters: applyFilters,
    onPageChange: changePage,
    onResetFilters: resetFilters,
    onStatusChange: (event) => setDraftStatus(event.target.value),
    pagination,
    questionBanks,
  };
}
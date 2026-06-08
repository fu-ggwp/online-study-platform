"use client";

import { useCallback, useEffect, useState } from "react";
import { examsService } from "../services/exams.service";

/**
 * Loads exams owned by the current teacher, or a learner's exam attempts.
 * Backs the /teacher/exams and /learner/exams views.
 */
export function useExams({ mine = true } = {}) {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = mine ? await examsService.listMine() : await examsService.listMyAttempts();
      setExams(data ?? []);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [mine]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { exams, loading, error, reload };
}

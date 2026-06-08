"use client";

import { useCallback, useEffect, useState } from "react";
import { studySetsService } from "../services/study-sets.service";

/**
 * Loads study sets owned by the current user (teacher/learner).
 * Backs the /teacher/study-sets and /learner/study-sets views.
 */
export function useStudySets({ mine = true, classId } = {}) {
  const [studySets, setStudySets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = mine
        ? await studySetsService.listMine()
        : await studySetsService.listAvailable({ classId });
      setStudySets(data ?? []);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [mine, classId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { studySets, loading, error, reload };
}

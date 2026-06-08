"use client";

import { useCallback, useEffect, useState } from "react";
import { classesService } from "../services/classes.service";

/**
 * Loads the current teacher's created/managed classes.
 * Backs the /teacher/classes views.
 */
export function useClasses(params) {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await classesService.listMine(params);
      setClasses(data?.items ?? data ?? []);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { classes, loading, error, reload };
}

"use client";

import { useCallback, useEffect, useState } from "react";
import classesService from "../services/classes.service";

/**
 * Loads the current teacher's created/managed classes.
 * Backs the /teacher/classes views.
 */
export function useClasses() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await classesService.listMine();
      setClasses(data ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { classes, loading, error, reload };
}

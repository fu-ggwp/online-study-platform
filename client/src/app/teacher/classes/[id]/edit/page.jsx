"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import classesService from "@/services/classes.service";
import ClassForm from "@/components/class-form";

/**
 * Edit Class (UC-31 / §2.3.5). Teacher edits the metadata of a class they own.
 * Loads current values, prefills the shared ClassForm, and PATCHes the change.
 * On success shows MSG51. `class_code` is shown read-only and never edited.
 */
export default function EditClassPage() {
  const { id } = useParams();
  const router = useRouter();

  const [initial, setInitial] = useState(null);
  const [classCode, setClassCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const cls = await classesService.getOne(id);
      setClassCode(cls.class_code ?? "");
      setInitial({
        class_name: cls.class_name ?? "",
        grade_level: cls.grade_level ?? "",
        academic_year: cls.academic_year ?? "",
        description: cls.description ?? "",
        learner_capacity: cls.learner_capacity ?? 50,
        join_policy: cls.join_policy ?? "teacher_approval",
        status: cls.status ?? "active",
      });
    } catch (err) {
      setLoadError(err?.response?.data?.error || err.message || "Failed to load class.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(values) {
    setError("");
    setNotice("");
    setSubmitting(true);
    try {
      await classesService.update(id, values);
      // MSG51 — class updated successfully
      setNotice("Class information has been updated successfully.");
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "Failed to update class.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError("");
    try {
      await classesService.remove(id);
      router.replace("/teacher/classes");
    } catch (err) {
      setDeleteError(err?.response?.data?.error || err.message || "Failed to delete class.");
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  return (
    <main className="min-h-screen px-6 py-10">
      <section className="mx-auto w-full max-w-xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-semibold">Edit Class</h1>
          <Link
            href="/teacher/classes"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back
          </Link>
        </div>

        {loading && <p className="text-sm text-muted-foreground/70">Loading class...</p>}

        {!loading && loadError && (
          <div className="rounded-lg bg-error/10 px-4 py-3 text-sm text-error">
            {loadError}{" "}
            <button onClick={load} className="underline">
              Try again
            </button>
          </div>
        )}

        {!loading && !loadError && initial && (
          <>
            {/* Class code is generated and immutable — shown as a disabled field */}
            {classCode && (
              <div className="mb-5">
                <label className="mb-1.5 block text-sm font-semibold text-foreground">
                  Class Code
                </label>
                <input
                  type="text"
                  value={classCode}
                  readOnly
                  disabled
                  title="Class code cannot be changed"
                  className="w-full cursor-not-allowed rounded-lg border border-border bg-muted/50 px-4 py-2.5 font-mono tracking-widest text-muted-foreground/70 opacity-70"
                />
              </div>
            )}

            {notice && (
              <p className="mb-5 rounded-lg bg-success/10 px-4 py-3 text-sm text-success">
                {notice}{" "}
                <Link href="/teacher/classes" className="underline">
                  Back to classes
                </Link>
              </p>
            )}

            <ClassForm
              initialValues={initial}
              onSubmit={handleSubmit}
              submitting={submitting}
              error={error}
              submitLabel="Update Class Information"
              submittingLabel="Saving..."
              showStatus
            />

            {/* Danger zone — delete class (moved here from the class detail page) */}
            <div className="mt-8 rounded-xl border border-error/30 p-5">
              <h2 className="text-sm font-semibold text-error">Delete Class</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Permanently delete this class and all related data (members, join
                requests, assigned study sets, and exam sessions). This action
                cannot be undone.
              </p>
              {deleteError && (
                <p className="mt-3 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
                  {deleteError}
                </p>
              )}
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="mt-4 rounded-lg border border-error/40 px-4 py-2 text-sm font-medium text-error hover:bg-error/10"
              >
                Delete Class
              </button>
            </div>
          </>
        )}
      </section>

      {confirmingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-foreground">Delete this class?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              This class and its related data will be permanently deleted. This
              action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg bg-error px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-error/90 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete Class"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

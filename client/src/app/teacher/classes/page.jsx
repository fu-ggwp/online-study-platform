"use client";

import Link from "next/link";
import { useClasses } from "../../../hooks/use-classes.js";

export default function TeacherClassesPage() {
  const { classes, loading, error, reload } = useClasses();

  return (
    <main className="min-h-screen px-6 py-10">
      <section className="mx-auto w-full max-w-5xl">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-semibold">My Classes</h1>
          <Link
            href="/teacher/classes/create"
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            + Create Class
          </Link>
        </div>

        {/* Loading */}
        {loading && (
          <p className="text-neutral-500">Loading classes...</p>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">
            {error}{" "}
            <button onClick={reload} className="underline">
              Try again
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && classes.length === 0 && (
          <p className="text-neutral-500">
            You haven&apos;t created any classes yet.{" "}
            <Link href="/teacher/classes/create" className="underline">
              Create your first class
            </Link>
          </p>
        )}

        {/* Class list */}
        {!loading && classes.length > 0 && (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {classes.map((cls) => (
              <li key={cls.class_id}>
                <Link
                  href={`/teacher/classes/${cls.class_id}`}
                  className="block rounded-xl border border-neutral-200 p-5 hover:border-neutral-400 transition"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h2 className="font-semibold text-lg leading-tight">
                      {cls.class_name}
                    </h2>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                        cls.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-neutral-100 text-neutral-500"
                      }`}
                    >
                      {cls.status}
                    </span>
                  </div>

                  {cls.subject && (
                    <p className="text-sm text-neutral-500">{cls.subject}</p>
                  )}
                  {cls.grade_level && (
                    <p className="text-sm text-neutral-500">{cls.grade_level}</p>
                  )}

                  <p className="mt-3 text-sm text-neutral-400">
                    {cls.member_count ?? 0} /{" "}
                    {cls.learner_capacity ?? "—"} members
                  </p>

                  <p className="mt-1 text-xs text-neutral-400">
                    Code: <span className="font-mono">{cls.class_code}</span>
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}

      </section>
    </main>
  );
}

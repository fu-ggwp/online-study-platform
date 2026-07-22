"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import classesService from "../../../../services/classes.service";
import { examsService } from "../../../../services/exams.service";
import { studySetsService } from "../../../../services/study-sets.service";
import { AddActivityControl } from "./_components/add-activity-control";

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground/70">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}

const EXAM_STATUS_TONE = {
  active: "bg-success/10 text-success",
  closed: "bg-muted text-muted-foreground",
  draft: "bg-warning/20 text-warning",
};

const VISIBILITY_LABELS = {
  public: "Public",
  private: "Private",
  class_only: "Class Only",
};

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString() : "—";
}

function ExamCard({ exam }) {
  return (
    <Link
      href={`/teacher/exams/${exam.exam_session_id}`}
      className="block h-full rounded-xl border border-border p-5 transition hover:border-ring"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold leading-tight text-foreground">
          {exam.title}
        </h3>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
            EXAM_STATUS_TONE[exam.status] ?? "bg-muted text-muted-foreground"
          }`}
        >
          {exam.status}
        </span>
      </div>

      {exam.description && (
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground/80">
          {exam.description}
        </p>
      )}

      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <div>
          <dt className="text-muted-foreground/70">Start</dt>
          <dd>{formatDateTime(exam.start_at)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground/70">End</dt>
          <dd>{formatDateTime(exam.end_at)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground/70">Duration</dt>
          <dd>{exam.duration_minutes ? `${exam.duration_minutes} min` : "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground/70">Questions</dt>
          <dd>{exam.question_count ?? 0}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground/70">Attempt limit</dt>
          <dd>{exam.attempt_limit ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground/70">Results</dt>
          <dd className="capitalize">
            {(exam.result_visibility ?? "—").replace("_", " ")}
          </dd>
        </div>
      </dl>

      <span className="mt-4 inline-block text-sm font-medium text-foreground">
        View exam →
      </span>
    </Link>
  );
}

function StudySetCard({ set }) {
  return (
    <Link
      href={`/teacher/study-sets/${set.study_set_id}`}
      className="block h-full rounded-xl border border-border p-5 transition hover:border-ring"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold leading-tight text-foreground">
          {set.title}
        </h3>
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {set.question_count ?? 0} Qs
        </span>
      </div>

      {set.subject && (
        <p className="mt-1 text-sm text-muted-foreground/70">{set.subject}</p>
      )}
      {set.description && (
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground/80">
          {set.description}
        </p>
      )}

      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded-full border border-border px-2 py-0.5">
          {VISIBILITY_LABELS[set.visibility] ?? set.visibility}
        </span>
        {set.is_admin_hidden && (
          <span className="rounded-full bg-error/10 px-2 py-0.5 text-error">
            Hidden by admin
          </span>
        )}
      </div>

      <span className="mt-4 inline-block text-sm font-medium text-foreground">
        Open study set →
      </span>
    </Link>
  );
}

export default function ClassDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [cls, setCls] = useState(null);
  const [members, setMembers] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resolving, setResolving] = useState(null); // requestId currently being resolved
  const [activeTab, setActiveTab] = useState("exam");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [clsData, membersData, requestsData] = await Promise.all([
        classesService.getOne(id),
        classesService.listMembers(id),
        classesService.listJoinRequests(id),
      ]);
      setCls(clsData);
      setMembers(membersData);
      setJoinRequests(requestsData);
    } catch (err) {
      setError(
        err?.response?.data?.error || err.message || "Failed to load class.",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadExamOptions = useCallback(async () => {
    const body = await examsService.listMine({ limit: 100 });
    const items = body?.data?.items ?? body?.data ?? [];
    const existing = new Set((cls?.exams ?? []).map((e) => e.exam_session_id));
    return items.filter((e) => !existing.has(e.exam_session_id));
  }, [cls]);

  const loadStudySetOptions = useCallback(async () => {
    const res = await studySetsService.listMine({ limit: 100 });
    const items = res?.data?.items ?? [];
    const existing = new Set((cls?.assigned_study_sets ?? []).map((s) => s.study_set_id));
    return items.filter((s) => !existing.has(s.study_set_id ?? s.id));
  }, [cls]);

  useEffect(() => {
    setTimeout(() => {
      load();
    }, 0);
  }, [load]);

  async function handleResolve(requestId, status) {
    setResolving(requestId);
    try {
      await classesService.resolveJoinRequest(requestId, status);
      // Refresh members + requests
      const [membersData, requestsData] = await Promise.all([
        classesService.listMembers(id),
        classesService.listJoinRequests(id),
      ]);
      setMembers(membersData);
      setJoinRequests(requestsData);
    } catch (err) {
      alert(err?.response?.data?.error || err.message || "Failed to resolve request.");
    } finally {
      setResolving(null);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground/70">Loading...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3">
        <p className="text-sm text-error">{error}</p>
        <button
          onClick={() => router.push("/teacher/classes")}
          className="text-sm text-muted-foreground underline"
        >
          Back to classes
        </button>
      </main>
    );
  }

  const previewMembers = members.slice(0, 5);

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold">{cls.class_name}</h1>
            {cls.description && (
              <p className="text-sm text-muted-foreground">{cls.description}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={`/teacher/classes/${id}/edit`}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              Edit
            </Link>
            <Link
              href="/teacher/classes"
              className="text-sm text-muted-foreground/70 hover:text-foreground"
            >
              ← Back
            </Link>
          </div>
        </div>

        {/* Class Info */}
        <div className="rounded-xl border border-border p-5">
          <h2 className="mb-4 text-sm font-semibold text-foreground">
            Class Info
          </h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
            <InfoRow label="Grade Level" value={cls.grade_level} />
            <InfoRow label="Academic Year" value={cls.academic_year} />
            <InfoRow
              label="Max Students"
              value={String(cls.learner_capacity)}
            />
            <InfoRow
              label="Join Policy"
              value={
                cls.join_policy === "auto_approve"
                  ? "Auto Approve"
                  : "Teacher Approval"
              }
            />
          </div>
        </div>

        {/* Class Code */}
        <div className="rounded-xl border border-border p-5">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground/70">Class Code</span>
              <span className="font-mono text-2xl font-bold tracking-widest text-foreground">
                {cls.class_code}
              </span>
            </div>
            <Link
              href={`/teacher/classes/${id}/invite`}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted"
            >
              View Invite Options
            </Link>
          </div>
        </div>

        {/* Tabs — Exam / Study set / People (Google Classroom style) */}
        <div className="flex gap-6 border-b border-border">
          {[
            { key: "exam", label: "Exam" },
            { key: "studyset", label: "Study set" },
            { key: "people", label: "People" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`-mb-px border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "exam" && (
          <>
            {/* Exams assigned to this class */}
            <div className="rounded-xl border border-border p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              Exams
              <span className="ml-2 text-xs font-normal text-muted-foreground/70">
                {(cls.exams ?? []).length}
              </span>
            </h2>
            <AddActivityControl
              label="exam"
              createHref={`/teacher/exams/create?classId=${id}`}
              loadItems={loadExamOptions}
              getId={(x) => x.exam_session_id}
              getTitle={(x) => x.title}
              getSubtitle={(x) => x.status}
              assign={(examId) => examsService.reassignClass(examId, id)}
              onAdded={load}
            />
          </div>

          {(cls.exams ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground/70">
              No exams created for this class yet.
            </p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {cls.exams.map((exam) => (
                <li key={exam.exam_session_id}>
                  <ExamCard exam={exam} />
                </li>
              ))}
            </ul>
          )}
        </div>

          </>
        )}

        {activeTab === "studyset" && (
          <>
        {/* Study sets assigned to this class */}
        <div className="rounded-xl border border-border p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              Assigned study sets
              <span className="ml-2 text-xs font-normal text-muted-foreground/70">
                {(cls.assigned_study_sets ?? []).length}
              </span>
            </h2>
            <AddActivityControl
              label="study set"
              createHref={`/teacher/study-sets/create?classId=${id}&className=${encodeURIComponent(cls.class_name)}`}
              loadItems={loadStudySetOptions}
              getId={(x) => x.study_set_id ?? x.id}
              getTitle={(x) => x.title}
              getSubtitle={(x) => x.subject || x.visibility}
              assign={(setId) => studySetsService.assignClass(setId, id)}
              onAdded={load}
            />
          </div>

          {(cls.assigned_study_sets ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground/70">
              No study sets assigned to this class yet.
            </p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {cls.assigned_study_sets.map((set) => (
                <li key={set.assignment_id}>
                  <StudySetCard set={set} />
                </li>
              ))}
            </ul>
          )}
        </div>

          </>
        )}

        {activeTab === "people" && (
          <>
        {/* Teachers */}
        <div className="rounded-xl border border-border p-5">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Teachers</h2>
          <div className="flex items-center gap-3 border-t border-border py-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
              {(cls.teacher?.full_name || "T")[0].toUpperCase()}
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">
                {cls.teacher?.full_name || "Teacher"}
              </span>
              <span className="text-xs text-muted-foreground/70">
                {cls.teacher?.email}
              </span>
            </div>
          </div>
        </div>

        {/* Join Requests — only shown when policy is teacher_approval */}
        {cls.join_policy === "teacher_approval" && (
          <div className="rounded-xl border border-border p-5">
            <div className="mb-4 flex items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">
                Join Requests
              </h2>
              {joinRequests.length > 0 && (
                <span className="rounded-full bg-warning/20 px-2 py-0.5 text-xs font-medium text-warning">
                  {joinRequests.length} pending
                </span>
              )}
            </div>

            {joinRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground/70">
                No pending join requests.
              </p>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {joinRequests.map((req) => (
                  <li
                    key={req.join_request_id}
                    className="flex items-center justify-between py-3"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium text-foreground">
                        {req.user?.full_name || req.user?.username || "Unknown"}
                      </span>
                      <span className="text-xs text-muted-foreground/70">
                        {req.user?.email}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          handleResolve(req.join_request_id, "approved")
                        }
                        disabled={resolving === req.join_request_id}
                        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/80 disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() =>
                          handleResolve(req.join_request_id, "rejected")
                        }
                        disabled={resolving === req.join_request_id}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Students */}
        <div className="rounded-xl border border-border p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              Classmates
              <span className="ml-2 text-xs font-normal text-muted-foreground/70">
                {members.length} students
              </span>
            </h2>
            <Link
              href={`/teacher/classes/${id}/members`}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              View all →
            </Link>
          </div>

          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground/70">No members yet.</p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {previewMembers.map((m) => (
                <li
                  key={m.class_member_id}
                  className="flex items-center gap-3 py-2.5"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                    {(m.user?.full_name ||
                      m.user?.username ||
                      "?")[0].toUpperCase()}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-foreground">
                      {m.user?.full_name || m.user?.username || "Unknown"}
                    </span>
                    <span className="text-xs text-muted-foreground/70">
                      {m.user?.email}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {members.length > 5 && (
            <p className="mt-3 text-xs text-muted-foreground/70">
              +{members.length - 5} more —{" "}
              <Link
                href={`/teacher/classes/${id}/members`}
                className="underline hover:text-foreground"
              >
                see all
              </Link>
            </p>
          )}
        </div>

          </>
        )}

      </div>

    </main>
  );
}

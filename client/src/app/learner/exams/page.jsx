"use client";

import { LockKeyhole, Search, SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppPagination } from "@/components/common/app-pagination";

import { Button } from "@/components/ui/button";
import { examsService } from "@/services/exams.service";

const PAGE_SIZE = 5;
const INITIAL_FILTERS = {
  search: "",
  classId: "",
  sortBy: "latest",
};

const SORT_OPTIONS = [
  { value: "latest", label: "Latest updated" },
  { value: "start_asc", label: "Start time ascending" },
  { value: "start_desc", label: "Start time descending" },
  { value: "title_asc", label: "Exam title A-Z" },
];

const COMPLETED_SORT_OPTIONS = [
  { value: "latest_submitted", label: "Latest submitted" },
  { value: "oldest_submitted", label: "Oldest submitted" },
  { value: "score_desc", label: "Score: High to Low" },
  { value: "title_asc", label: "Exam title A-Z" },
];

function formatDateTime(value) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not scheduled";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function formatSubmittedDate(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "N/A";

  const allMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = allMonths[date.getMonth()];
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${month} ${day} ${hours}:${minutes}`;
}

function formatDuration(seconds) {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) return "N/A";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

function getErrorMessage(error) {
  return error?.response?.data?.error || error?.message || "Unable to load exams. Please try again.";
}

export default function LearnerExamsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("available");
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState({ ...INITIAL_FILTERS, page: 1, pageSize: PAGE_SIZE });
  const [exams, setExams] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pageSize: PAGE_SIZE, totalPages: 1, classes: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const queryKey = useMemo(() => JSON.stringify(appliedFilters), [appliedFilters]);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError("");

    const fetchPromise = activeTab === "available"
      ? examsService.listAvailable(JSON.parse(queryKey))
      : examsService.listMyAttempts(JSON.parse(queryKey));

    fetchPromise
      .then((result) => {
        if (ignore) return;
        const data = result?.data ?? {};
        setExams(data.items ?? []);
        setMeta({ total: 0, page: 1, pageSize: PAGE_SIZE, totalPages: 1, classes: [], ...data });
      })
      .catch((loadError) => {
        if (ignore) return;
        setError(getErrorMessage(loadError));
        setExams([]);
      })
      .finally(() => {
        if (ignore) return;
        setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [queryKey, activeTab]);

  function handleTabChange(tab) {
    setActiveTab(tab);
    const defaultSort = tab === "available" ? "latest" : "latest_submitted";
    const newFilters = {
      search: "",
      classId: "",
      sortBy: defaultSort,
    };
    setFilters(newFilters);
    setAppliedFilters({ ...newFilters, page: 1, pageSize: PAGE_SIZE });
  }

  function updateFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function applyFilters() {
    setAppliedFilters({ ...filters, page: 1, pageSize: PAGE_SIZE });
  }

  function resetFilters() {
    const defaultSort = activeTab === "available" ? "latest" : "latest_submitted";
    const cleared = {
      search: "",
      classId: "",
      sortBy: defaultSort,
    };
    setFilters(cleared);
    setAppliedFilters({ ...cleared, page: 1, pageSize: PAGE_SIZE });
  }

  function goToPage(page) {
    setAppliedFilters((current) => ({ ...current, page, pageSize: PAGE_SIZE }));
  }

  function openExam(examId) {
    router.push(`/learner/exams/${examId}`);
  }

  const sortOptions = activeTab === "available" ? SORT_OPTIONS : COMPLETED_SORT_OPTIONS;

  return (
    <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl space-y-6">
        <div className="border-b border-border pb-6">
          <h1 className="text-3xl font-bold tracking-normal">My Exams</h1>
          <p className="mt-2 text-sm text-muted-foreground">View exams assigned to your classes and review your submitted results.</p>
        </div>

        {/* Custom Tabs Navigation */}
        <div className="flex gap-2 border-b border-border pb-px">
          <button
            type="button"
            onClick={() => handleTabChange("available")}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition ${
              activeTab === "available"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Available Exams
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("completed")}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition ${
              activeTab === "completed"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Completed Exams
          </button>
        </div>

        <section className="rounded-md border border-border bg-card p-4 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto]">
            <label className="space-y-2 text-sm font-bold">
              <span>Search Exams</span>
              <input
                value={filters.search}
                onChange={(event) => updateFilter("search", event.target.value)}
                placeholder="Search exams..."
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none"
              />
            </label>
            <label className="space-y-2 text-sm font-bold">
              <span>Class Filter</span>
              <select
                value={filters.classId}
                onChange={(event) => updateFilter("classId", event.target.value)}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none"
              >
                <option value="">All classes</option>
                {(meta.classes ?? []).map((item) => (
                  <option key={item.class_id} value={item.class_id}>{item.class_name}</option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm font-bold">
              <span>Sort By</span>
              <select
                value={filters.sortBy}
                onChange={(event) => updateFilter("sortBy", event.target.value)}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <Button type="button" variant="outline" onClick={applyFilters}>
                <Search className="size-4" />
                Apply
              </Button>
            </div>
            <div className="flex items-center gap-2 lg:col-span-4">
              <Button type="button" variant="ghost" onClick={resetFilters}>
                <SlidersHorizontal className="size-4" />
                Reset Filters
              </Button>
            </div>
          </div>
        </section>

        {error ? <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</div> : null}
        {loading ? <div className="rounded-md border border-border bg-card px-4 py-6 text-sm text-muted-foreground">Loading exams...</div> : null}

        {!loading && !error && exams.length === 0 ? (
          <section className="rounded-md border border-dashed border-border bg-card px-4 py-16 text-center">
            <h2 className="text-base font-bold">
              {activeTab === "available" ? "No available exams yet" : "No completed exams yet"}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              {activeTab === "available"
                ? "You do not have any assigned exams. Join a class first, then exams scheduled by your teacher will appear here."
                : "You have not completed any exams yet."}
            </p>
            {activeTab === "available" && (
              <Button className="mt-5" onClick={() => router.push("/learner/classes/join")}>Join a Class</Button>
            )}
          </section>
        ) : null}

        {!loading && !error && exams.length > 0 ? (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">
                {activeTab === "available" ? "Available Exams" : "Completed Exams"}
              </h2>
              <span className="text-sm font-medium text-muted-foreground">
                {meta.total ?? exams.length} {meta.total === 1 ? "exam" : "exams"} shown
              </span>
            </div>

            <section className="overflow-hidden rounded-md border border-border bg-card shadow-sm">
              <div className="overflow-x-auto">
                {activeTab === "available" ? (
                  <table className="w-full min-w-[860px] table-fixed border-collapse text-left text-sm">
                    <thead className="bg-muted text-xs font-bold uppercase text-muted-foreground">
                      <tr>
                        <th className="w-[35%] px-4 py-3">Exam</th>
                        <th className="w-[20%] px-4 py-3">Class</th>
                        <th className="w-[15%] px-4 py-3">Duration</th>
                        <th className="w-[18%] px-4 py-3">Start time</th>
                        <th className="w-[12%] px-4 py-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {exams.map((exam) => (
                        <tr
                          key={exam.exam_session_id}
                          className="align-middle transition hover:bg-muted/40"
                        >
                          <td className="px-4 py-4 font-bold text-foreground truncate">
                            {exam.title}
                          </td>
                          <td className="px-4 py-4 font-medium text-muted-foreground truncate">
                            {exam.classes?.class_name ?? "Class"}
                          </td>
                          <td className="px-4 py-4 font-medium text-muted-foreground truncate">
                            {exam.duration_minutes} minutes
                          </td>
                          <td className="px-4 py-4 font-medium text-muted-foreground">
                            {formatDateTime(exam.start_at)}
                          </td>
                          <td className="px-4 py-4 text-center">
                            <Button type="button" variant="outline" size="sm" onClick={() => openExam(exam.exam_session_id)}>
                              <LockKeyhole className="size-4" />
                              Enter Code
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full min-w-[860px] table-fixed border-collapse text-left text-sm">
                    <thead className="bg-muted text-xs font-bold uppercase text-muted-foreground">
                      <tr>
                        <th className="w-[35%] px-4 py-3">Exam</th>
                        <th className="w-[18%] px-4 py-3">Class</th>
                        <th className="w-[10%] px-4 py-3">Score</th>
                        <th className="w-[12%] px-4 py-3">Attempt used</th>
                        <th className="w-[13%] px-4 py-3">Submitted</th>
                        <th className="w-[12%] px-4 py-3">Time spent</th>
                        <th className="w-[10%] px-4 py-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {exams.map((attempt) => {
                        const exam = attempt.exam_sessions ?? {};
                        return (
                          <tr
                            key={attempt.exam_attempt_id}
                            className="align-middle transition hover:bg-muted/40"
                          >
                            <td className="px-4 py-4 font-bold text-foreground truncate">
                              {exam.title}
                            </td>
                            <td className="px-4 py-4 font-medium text-muted-foreground truncate">
                              {exam.classes?.class_name ?? "Class"}
                            </td>
                            <td className="px-4 py-4 font-bold text-foreground">
                              {attempt.total_score}/{attempt.max_score ?? 10}
                            </td>
                            <td className="px-4 py-4 font-medium text-muted-foreground">
                              Attempt #{attempt.attempt_number}
                            </td>
                            <td className="px-4 py-4 font-medium text-muted-foreground">
                              {formatSubmittedDate(attempt.submitted_at)}
                            </td>
                            <td className="px-4 py-4 font-medium text-muted-foreground">
                              {formatDuration(attempt.duration_seconds)}
                            </td>
                            <td className="px-4 py-4 text-center">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => router.push(`/learner/exams/${exam.exam_session_id}/result?attempt=${attempt.exam_attempt_id}`)}
                              >
                                View result
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </section>

            <AppPagination
              currentPage={meta.page}
              totalPages={meta.totalPages}
              onPageChange={goToPage}
            />
          </>
        ) : null}
      </section>
    </main>
  );
}

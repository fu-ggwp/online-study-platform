"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Building2,
  CalendarClock,
  ClipboardList,
  GraduationCap,
  PlayCircle,
  Search,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import classesService from "@/services/classes.service";
import { examsService } from "@/services/exams.service";
import { studySetsService } from "@/services/study-sets.service";

const INITIAL_SECTION = { data: [], error: "" };

const QUICK_ACTIONS = [
  {
    label: "Continue Study",
    description: "Resume your latest learning set.",
    href: "/learner/study-sets",
    icon: PlayCircle,
  },
  {
    label: "Join Class",
    description: "Enter a class code from your teacher.",
    href: "/learner/classes/join",
    icon: Building2,
  },
  {
    label: "Browse Study Sets",
    description: "Find public practice materials.",
    href: "/search",
    icon: Search,
  },
  {
    label: "Available Exams",
    description: "Check active assigned exams.",
    href: "/learner/exams",
    icon: GraduationCap,
  },
];

function getErrorMessage(error) {
  return error?.response?.data?.error || error?.message || "Unable to load data.";
}

function getStudySetId(studySet) {
  return studySet.study_set_id ?? studySet.id;
}

function getExamId(exam) {
  return exam.exam_session_id ?? exam.id;
}

function formatDateTime(value) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not scheduled";
  return date.toLocaleString(undefined, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  });
}

function getStudySetLabel(studySet) {
  if (studySet.is_assigned) return studySet.assigned_class?.class_name || "Assigned";
  if (studySet.is_owned) return "Owned";
  return "Self-study";
}

function sortByLastStudied(left, right) {
  return new Date(right.last_studied_at || 0) - new Date(left.last_studied_at || 0);
}

function normalizeStudySets(result) {
  return result?.data ?? [];
}

function normalizeExams(result) {
  const payload = result?.data ?? result;
  const items = payload?.items ?? [];
  const total = payload?.total ?? items.length;
  return { items, total };
}

async function loadDashboardData() {
  const [studySetsResult, classesResult, examsResult] = await Promise.allSettled([
    studySetsService.listLearnerStudySets(),
    classesService.listJoined(),
    examsService.listAvailable({ page: 1, pageSize: 5, sortBy: "latest" }),
  ]);

  const exams =
    examsResult.status === "fulfilled"
      ? normalizeExams(examsResult.value)
      : { items: [], total: 0 };

  return {
    studySets: {
      data: studySetsResult.status === "fulfilled" ? normalizeStudySets(studySetsResult.value) : [],
      error: studySetsResult.status === "rejected" ? getErrorMessage(studySetsResult.reason) : "",
    },
    classes: {
      data: classesResult.status === "fulfilled" ? classesResult.value ?? [] : [],
      error: classesResult.status === "rejected" ? getErrorMessage(classesResult.reason) : "",
    },
    exams: {
      data: exams.items,
      total: exams.total,
      error: examsResult.status === "rejected" ? getErrorMessage(examsResult.reason) : "",
    },
  };
}

export default function LearnerDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState({
    studySets: INITIAL_SECTION,
    classes: INITIAL_SECTION,
    exams: { ...INITIAL_SECTION, total: 0 },
  });

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      const data = await loadDashboardData();
      if (!ignore) {
        setSections(data);
        setLoading(false);
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, []);

  const recentlyStudied = useMemo(
    () =>
      sections.studySets.data
        .filter((studySet) => studySet.is_started && studySet.last_studied_at)
        .sort(sortByLastStudied),
    [sections.studySets.data],
  );

  const orderedStudySets = useMemo(
    () =>
      [...sections.studySets.data].sort((left, right) => {
        if (left.is_started !== right.is_started) return left.is_started ? -1 : 1;
        if (left.is_assigned !== right.is_assigned) return left.is_assigned ? -1 : 1;
        return sortByLastStudied(left, right);
      }),
    [sections.studySets.data],
  );

  const jumpBackIn = recentlyStudied[0] || orderedStudySets.find((item) => item.is_assigned) || orderedStudySets[0];

  const metrics = useMemo(
    () => [
      { label: "Study sets", value: sections.studySets.data.length, icon: BookOpen },
      { label: "In progress", value: recentlyStudied.length, icon: PlayCircle },
      { label: "Classes", value: sections.classes.data.length, icon: Building2 },
      { label: "Exams", value: sections.exams.total, icon: GraduationCap },
    ],
    [recentlyStudied.length, sections],
  );

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl space-y-7">
        <PageHeader />
        <QuickActions jumpBackIn={jumpBackIn} />
        <MetricsGrid loading={loading} metrics={metrics} />

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <JumpBackIn loading={loading} studySet={jumpBackIn} studySets={sections.studySets} />
          <TodayStudyPlan loading={loading} studySets={sections.studySets} studySetsForPlan={recentlyStudied} />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <RecentStudySets loading={loading} studySets={sections.studySets} studySetsForList={orderedStudySets} />
          <AvailableExams exams={sections.exams} loading={loading} />
        </div>

        <JoinedClasses classes={sections.classes} loading={loading} />
      </section>
    </main>
  );
}

function PageHeader() {
  return (
    <div className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold text-primary">Learner Dashboard</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Keep learning where you left off</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Continue recent study sets, check assigned exams, and open your joined classes.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href="/search">Browse Study Sets</Link>
        </Button>
        <Button asChild>
          <Link href="/learner/classes/join">Join Class</Link>
        </Button>
      </div>
    </div>
  );
}

function QuickActions({ jumpBackIn }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {QUICK_ACTIONS.map((action) => {
        const Icon = action.icon;
        const href = action.label === "Continue Study" && jumpBackIn
          ? `/learner/study-sets/${getStudySetId(jumpBackIn)}/flashcards`
          : action.href;

        return (
          <Link
            className="group rounded-lg border border-border bg-card p-4 shadow-sm transition hover:border-ring/50 hover:bg-muted/40"
            href={href}
            key={action.label}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" />
              </span>
              <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
            </div>
            <h2 className="mt-4 text-sm font-bold text-foreground">{action.label}</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{action.description}</p>
          </Link>
        );
      })}
    </div>
  );
}

function MetricsGrid({ loading, metrics }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <MetricCard key={metric.label} loading={loading} metric={metric} />
      ))}
    </div>
  );
}

function MetricCard({ loading, metric }) {
  const Icon = metric.icon;

  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase text-muted-foreground">{metric.label}</p>
          <p className="mt-2 text-3xl font-bold">{loading ? "--" : metric.value}</p>
        </div>
        <span className="flex size-11 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="size-5" />
        </span>
      </div>
    </div>
  );
}

function JumpBackIn({ loading, studySet, studySets }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <SectionHeader
        actionHref="/learner/study-sets"
        actionLabel="All study sets"
        description="Resume a recent study set or open assigned material."
        title="Jump Back In"
      />

      {loading ? <StatePanel message="Loading your study sets..." /> : null}
      {!loading && studySets.error ? <StatePanel icon={AlertCircle} message={studySets.error} tone="error" /> : null}
      {!loading && !studySets.error && !studySet ? (
        <StatePanel actionHref="/search" actionLabel="Browse Study Sets" message="No study activity yet. Start with a public set or join a class." />
      ) : null}

      {!loading && !studySets.error && studySet ? (
        <div className="mt-5 rounded-lg border border-border bg-background p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground">
                  {getStudySetLabel(studySet)}
                </span>
                {studySet.is_started ? (
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                    In progress
                  </span>
                ) : null}
              </div>
              <h2 className="mt-4 truncate text-2xl font-bold text-foreground">{studySet.title || "Untitled study set"}</h2>
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                {studySet.description || studySet.topic || "Open this study set to review questions and practice."}
              </p>
              <p className="mt-3 text-sm font-semibold text-muted-foreground">
                {studySet.question_count ?? 0} questions
                {studySet.last_studied_at ? ` - Last studied ${formatDateTime(studySet.last_studied_at)}` : ""}
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <Button asChild>
                <Link href={`/learner/study-sets/${getStudySetId(studySet)}/flashcards`}>Continue</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/learner/study-sets/${getStudySetId(studySet)}`}>Details</Link>
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function TodayStudyPlan({ loading, studySets, studySetsForPlan }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <SectionHeader
        actionHref="/learner/study-sets"
        actionLabel="View sets"
        description="Recently studied sets from your learning history."
        title="Today Study Plan"
      />

      <div className="mt-5">
        <StudySetList
          emptyMessage="No recent study history yet. Open a study set to build your plan."
          error={studySets.error}
          items={studySetsForPlan}
          loading={loading}
        />
      </div>
    </section>
  );
}

function RecentStudySets({ loading, studySets, studySetsForList }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <SectionHeader
        actionHref="/learner/study-sets"
        actionLabel="View all"
        description="Assigned and self-study materials available to you."
        title="Recent Study Sets"
      />
      <div className="mt-5">
        <StudySetList
          emptyMessage="No study sets found. Browse public study sets or join a class."
          error={studySets.error}
          items={studySetsForList}
          loading={loading}
        />
      </div>
    </section>
  );
}

function AvailableExams({ exams, loading }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <SectionHeader
        actionHref="/learner/exams"
        actionLabel="View exams"
        description="Active exam sessions assigned to your classes."
        title="Available Exams"
      />
      <div className="mt-5">
        <ResourceList
          emptyMessage="No available exams yet."
          error={exams.error}
          getHref={(exam) => `/learner/exams/${getExamId(exam)}`}
          getMeta={(exam) => `${exam.classes?.class_name ?? "Class"} - ${formatDateTime(exam.start_at)}`}
          getTitle={(exam) => exam.title}
          icon={CalendarClock}
          items={exams.data}
          loading={loading}
        />
      </div>
    </section>
  );
}

function JoinedClasses({ classes, loading }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <SectionHeader
        actionHref="/learner/classes"
        actionLabel="View classes"
        description="Classes you have joined and can open for assigned material."
        title="Joined Classes"
      />

      {loading ? <StatePanel message="Loading joined classes..." /> : null}
      {!loading && classes.error ? <StatePanel icon={AlertCircle} message={classes.error} tone="error" /> : null}
      {!loading && !classes.error && classes.data.length === 0 ? (
        <StatePanel actionHref="/learner/classes/join" actionLabel="Join Class" message="No joined classes yet. Join a class to see teacher-assigned materials." />
      ) : null}

      {!loading && !classes.error && classes.data.length > 0 ? (
        <div className="mt-5 overflow-hidden rounded-lg border border-border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] table-fixed text-left text-sm">
              <thead className="bg-muted text-xs font-bold uppercase text-muted-foreground">
                <tr>
                  <th className="w-[36%] px-4 py-3">Class</th>
                  <th className="w-[22%] px-4 py-3">Teacher</th>
                  <th className="w-[18%] px-4 py-3">Members</th>
                  <th className="w-[14%] px-4 py-3">Code</th>
                  <th className="w-[10%] px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {classes.data.slice(0, 5).map((classItem) => (
                  <tr className="align-middle transition hover:bg-muted/40" key={classItem.class_id}>
                    <td className="px-4 py-4">
                      <p className="truncate font-bold text-foreground">{classItem.class_name}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {classItem.grade_level || "No grade level"}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      <span className="line-clamp-1">{classItem.teacher?.full_name || classItem.teacher?.username || "Teacher"}</span>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {classItem.member_count ?? 0} / {classItem.learner_capacity ?? "--"}
                    </td>
                    <td className="px-4 py-4 font-mono text-xs text-muted-foreground">
                      {classItem.class_code || "--"}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Button asChild size="xs" variant="outline">
                        <Link href={`/learner/classes/${classItem.class_id}`}>Open</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function StudySetList({ emptyMessage, error, items, loading }) {
  return (
    <ResourceList
      emptyMessage={emptyMessage}
      error={error}
      getHref={(studySet) => `/learner/study-sets/${getStudySetId(studySet)}`}
      getMeta={(studySet) => {
        const dateText = studySet.last_studied_at ? ` - ${formatDateTime(studySet.last_studied_at)}` : "";
        return `${getStudySetLabel(studySet)} - ${studySet.question_count ?? 0} questions${dateText}`;
      }}
      getTitle={(studySet) => studySet.title}
      icon={BookOpen}
      items={items}
      loading={loading}
    />
  );
}

function ResourceList({ emptyMessage, error, getHref, getMeta, getTitle, icon: Icon, items, loading }) {
  return (
    <div className="space-y-2">
      {loading ? <StatePanel compact message="Loading..." /> : null}
      {!loading && error ? <StatePanel compact icon={AlertCircle} message={error} tone="error" /> : null}
      {!loading && !error && items.length === 0 ? <StatePanel compact message={emptyMessage} /> : null}
      {!loading && !error
        ? items.slice(0, 5).map((item) => (
            <Link
              className="flex items-center gap-3 rounded-lg border border-border bg-background p-3 transition hover:border-ring/50 hover:bg-muted/40"
              href={getHref(item)}
              key={getHref(item)}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-foreground">{getTitle(item) || "Untitled"}</span>
                <span className="block truncate text-xs text-muted-foreground">{getMeta(item)}</span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          ))
        : null}
    </div>
  );
}

function SectionHeader({ actionHref, actionLabel, description, title }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <Button asChild size="sm" variant="outline">
        <Link href={actionHref}>{actionLabel}</Link>
      </Button>
    </div>
  );
}

function StatePanel({ actionHref, actionLabel, compact = false, icon: Icon, message, tone = "muted" }) {
  const toneClass = tone === "error" ? "text-destructive" : "text-muted-foreground";

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-lg border border-dashed border-border bg-background ${
        compact ? "px-3 py-3 text-xs" : "mt-5 px-4 py-6 text-sm"
      } ${toneClass}`}
    >
      <div className="flex min-w-0 items-center gap-2">
        {Icon ? <Icon className="size-4 shrink-0" /> : <ClipboardList className="size-4 shrink-0" />}
        <p className="font-medium">{message}</p>
      </div>
      {actionHref && actionLabel ? (
        <Button asChild size="xs" variant="outline">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      ) : null}
    </div>
  );
}

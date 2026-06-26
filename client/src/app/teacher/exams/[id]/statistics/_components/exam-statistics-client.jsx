"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BarChart3, CheckCircle2, Download, FileSpreadsheet, ListChecks, TrendingUp, Users, AlertTriangle } from "lucide-react";
import * as XLSX from "xlsx";

import { Button } from "@/components/ui/button";
import { examsService } from "@/services/exams.service";

const exportSections = [
  { id: "distribution", label: "Score distribution" },
  { id: "questions", label: "Correct/wrong ratio by question" },
  { id: "scores", label: "Score table" },
];

function getErrorMessage(error) {
  return error?.response?.data?.error || error?.response?.data?.message || error?.message || "Unable to load exam statistics.";
}

function safeSheetName(value) {
  return String(value || "Exam").replace(/[\\/?*:[\]]/g, " ").slice(0, 31);
}

function safeFileName(value) {
  return String(value || "exam-statistics").replace(/[^a-z0-9-_]+/gi, "_").replace(/^_+|_+$/g, "");
}

function percent(value) {
  return `${Number(value || 0).toFixed(0)}%`;
}

function formatScore(value) {
  const number = Number(value || 0);
  return Number.isInteger(number) ? String(number) : number.toFixed(2);
}

function buildScoreSheet(data) {
  const questionHeaders = data.questions.map((question, index) => question.label || `Question ${String(index + 1).padStart(2, "0")}`);
  const rows = [
    [],
    ["No.", "Full name", "Birthdate", "Class", "Group", "Gender", "Score", ...questionHeaders],
    ...data.scoreRows.map((row) => [
      row.index,
      row.name,
      row.birthdate,
      row.className,
      row.groupName,
      row.gender,
      row.score,
      ...row.answers.map((answer) => answer.status),
    ]),
    [
      null,
      null,
      null,
      data.exam?.classes?.class_name || "Free",
      data.exam?.classes?.class_name || "Free",
      null,
      null,
      "Average score",
      formatScore(data.summary.averageScore),
    ],
    [],
  ];

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = [
    { wch: 8 },
    { wch: 24 },
    { wch: 24 },
    { wch: 22 },
    { wch: 22 },
    { wch: 14 },
    { wch: 12 },
    ...questionHeaders.map(() => ({ wch: 14 })),
  ];
  return sheet;
}

function buildDistributionSheet(data) {
  const buckets = data.distribution ?? [];
  const header1 = ["Group", "Class", "Student count", null];
  const header2 = [null, null, "Registered", "Submitted"];

  buckets.forEach((bucket) => {
    header1.push(bucket.label, null);
    header2.push("Count", "%");
  });
  header1.push("Above average (>= 5)", null);
  header2.push("Count", "%");

  const submittedCount = data.summary.submittedLearners || 0;
  const row = [
    data.exam?.classes?.class_name || "Free",
    data.exam?.classes?.class_name || "Free",
    data.summary.registeredCount,
    submittedCount,
  ];

  buckets.forEach((bucket) => {
    row.push(bucket.count, percent(bucket.percentage));
  });
  row.push(data.summary.atLeastFiveCount, submittedCount ? percent((data.summary.atLeastFiveCount / submittedCount) * 100) : "0%");

  const totalRow = ["TOTAL", null, data.summary.registeredCount, submittedCount];
  buckets.forEach((bucket) => totalRow.push(bucket.count, percent(bucket.percentage)));
  totalRow.push(data.summary.atLeastFiveCount, submittedCount ? percent((data.summary.atLeastFiveCount / submittedCount) * 100) : "0%");

  const rows = [header1, header2, row, totalRow, ["TOTAL Exam", null, ...totalRow.slice(2)]];
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = Array.from({ length: rows[0].length }, (_, index) => ({ wch: index < 2 ? 16 : 10 }));
  sheet["!merges"] = [
    { s: { r: 0, c: 2 }, e: { r: 0, c: 3 } },
    ...buckets.map((_, index) => {
      const col = 4 + index * 2;
      return { s: { r: 0, c: col }, e: { r: 0, c: col + 1 } };
    }),
    { s: { r: 0, c: 4 + buckets.length * 2 }, e: { r: 0, c: 5 + buckets.length * 2 } },
  ];
  return sheet;
}

function questionStatsRows(questionStats) {
  return questionStats.map((question) => {
    const optionMap = new Map((question.optionStats ?? []).slice(0, 4).map((option) => [option.label, option]));
    const optionText = ["A", "B", "C", "D"].map((label) => {
      const option = optionMap.get(label);
      if (!option) return null;
      return `Option ${label} - Correct: ${option.correctStudents.length} - Wrong: ${option.wrongStudents.length}`;
    }).filter(Boolean).join("; ");

    return [
      question.label,
      question.totalStudents,
      question.answeredCount,
      question.unansweredCount,
      question.correctCount,
      question.wrongCount,
      optionText,
      `${Number(question.incompleteRate || 0).toFixed(2)}%`,
      question.correctStudents.join(", "),
      optionMap.get("A")?.correctStudents.join(", ") || null,
      optionMap.get("B")?.correctStudents.join(", ") || null,
      optionMap.get("C")?.correctStudents.join(", ") || null,
      optionMap.get("D")?.correctStudents.join(", ") || null,
      question.wrongStudents.join(", "),
      optionMap.get("A")?.wrongStudents.join(", ") || null,
      optionMap.get("B")?.wrongStudents.join(", ") || null,
      optionMap.get("C")?.wrongStudents.join(", ") || null,
      optionMap.get("D")?.wrongStudents.join(", ") || null,
      question.unansweredStudents.join(", "),
      null,
      null,
      null,
      null,
    ];
  });
}

function buildQuestionSheet(data) {
  const headers = [
    "Question",
    "Total submitted students",
    "Answered",
    "Unanswered",
    "Correct",
    "Wrong",
    "Correct/wrong breakdown",
    "Incomplete rate / question",
    "Correct students",
    "Correct students (Option A)",
    "Correct students (Option B)",
    "Correct students (Option C)",
    "Correct students (Option D)",
    "Wrong students",
    "Wrong students (Option A)",
    "Wrong students (Option B)",
    "Wrong students (Option C)",
    "Wrong students (Option D)",
    "Unanswered students",
    "Unanswered students (Option A)",
    "Unanswered students (Option B)",
    "Unanswered students (Option C)",
    "Unanswered students (Option D)",
  ];
  const rows = [
    [],
    [data.exam?.classes?.class_name || "Free"],
    headers,
    ...questionStatsRows(data.questionStats ?? []),
    [],
    [],
    ["Question statistics"],
    headers,
    ...questionStatsRows(data.questionStats ?? []),
  ];
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = headers.map((_, index) => ({ wch: index === 6 ? 64 : index >= 8 ? 42 : 16 }));
  sheet["!merges"] = [
    { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } },
    { s: { r: 5 + (data.questionStats?.length ?? 0), c: 0 }, e: { r: 5 + (data.questionStats?.length ?? 0), c: headers.length - 1 } },
  ];
  return sheet;
}

function exportWorkbook(data, selectedSections) {
  const workbook = XLSX.utils.book_new();
  const title = safeFileName(data.exam?.title);

  if (selectedSections.scores) {
    XLSX.utils.book_append_sheet(workbook, buildScoreSheet(data), "Score Table");
  }
  if (selectedSections.distribution) {
    XLSX.utils.book_append_sheet(workbook, buildDistributionSheet(data), "Score Distribution");
  }
  if (selectedSections.questions) {
    XLSX.utils.book_append_sheet(workbook, buildQuestionSheet(data), safeSheetName("Correct Wrong Ratio"));
  }

  XLSX.writeFile(workbook, `${title || "exam"}_statistics.xlsx`, { compression: true });
}

function StatCard({ icon: Icon, label, value, tone = "blue", badge }) {
  const tones = {
    blue: { accent: "#2563eb", icon: "bg-blue-50 text-blue-700" },
    green: { accent: "#10b981", icon: "bg-emerald-50 text-emerald-700" },
    red: { accent: "#f43f5e", icon: "bg-rose-50 text-rose-700" },
    amber: { accent: "#f59e0b", icon: "bg-amber-50 text-amber-700" },
  };
  const toneConfig = tones[tone] ?? tones.blue;

  return (
    <section className="rounded-md border border-border border-t-4 bg-card p-4 shadow-sm" style={{ borderTopColor: toneConfig.accent }}>
      <div className={`mb-3 grid size-9 place-items-center rounded-md ${toneConfig.icon}`}>
        <Icon className="size-4" />
      </div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">{label}</p>
        </div>
        {badge ? <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">{badge}</span> : null}
      </div>
    </section>
  );
}

function DistributionChart({ distribution }) {
  const maxCount = Math.max(...distribution.map((bucket) => bucket.count), 1);

  return (
    <div className="flex min-h-[260px] items-end gap-3 border-b border-border px-4 pt-8">
      {distribution.map((bucket) => {
        const height = Math.max((bucket.count / maxCount) * 180, bucket.count > 0 ? 22 : 4);
        return (
          <div key={bucket.label} className="flex flex-1 flex-col items-center gap-2">
            <span className="text-xs font-bold text-foreground">{bucket.count}</span>
            <div className="w-full max-w-9 rounded-t bg-blue-700" style={{ height }} />
            <span className="text-xs font-medium text-muted-foreground">{bucket.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function DistributionList({ distribution }) {
  const maxCount = Math.max(...distribution.map((bucket) => bucket.count), 1);

  return (
    <div className="space-y-3">
      {distribution.map((bucket) => (
        <div key={bucket.label} className="grid grid-cols-[44px_1fr_32px] items-center gap-3 text-xs font-bold">
          <span className="text-muted-foreground">{bucket.label}</span>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-blue-700" style={{ width: `${Math.max((bucket.count / maxCount) * 100, bucket.count ? 5 : 0)}%` }} />
          </div>
          <span className="text-right text-foreground">{bucket.count}</span>
        </div>
      ))}
    </div>
  );
}

export function ExamStatisticsClient({ examId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSections, setSelectedSections] = useState({
    distribution: true,
    questions: true,
    scores: true,
  });

  useEffect(() => {
    let ignore = false;

    examsService
      .getStatistics(examId)
      .then((stats) => {
        if (ignore) return;
        setData(stats);
      })
      .catch((loadError) => {
        if (ignore) return;
        setError(getErrorMessage(loadError));
      })
      .finally(() => {
        if (ignore) return;
        setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [examId]);

  const exportDisabled = useMemo(() => !Object.values(selectedSections).some(Boolean) || !data, [data, selectedSections]);

  if (loading) {
    return (
      <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
        <section className="mx-auto max-w-7xl rounded-md border border-border bg-card p-6 text-sm font-medium text-muted-foreground shadow-sm">
          Loading exam statistics...
        </section>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
        <section className="mx-auto max-w-3xl space-y-4 rounded-md border border-border bg-card p-6 shadow-sm">
          <p className="text-sm font-medium text-destructive">{error || "Exam statistics are not available."}</p>
          <Button asChild variant="outline">
            <Link href={`/teacher/exams/${examId}`}>
              <ArrowLeft data-icon="inline-start" />
              Back to exam detail
            </Link>
          </Button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-muted/40 px-4 py-5 text-foreground sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <Link href={`/teacher/exams/${examId}`} className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-4" />
              Back to exam detail
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-normal text-foreground">Exam Statistics</h1>
              <p className="mt-2 text-sm font-medium text-muted-foreground">{data.exam?.title}</p>
            </div>
          </div>
          <Button disabled={exportDisabled} onClick={() => exportWorkbook(data, selectedSections)}>
            <Download data-icon="inline-start" />
            Export Excel
          </Button>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard icon={Users} label="Registered students" value={data.summary.registeredCount} />
          <StatCard icon={CheckCircle2} label="Total attempts" value={data.summary.totalAttempts} tone="green" />
          <StatCard icon={AlertTriangle} label="Not submitted or in progress" value={data.summary.notSubmittedOrInProgress} tone="red" />
          <StatCard icon={ListChecks} label="Students scored below 1" value={data.summary.belowOneCount} tone="amber" />
          <StatCard icon={TrendingUp} label="Students scored at least 5" value={data.summary.atLeastFiveCount} />
        </section>

        <section className="rounded-md border border-border bg-card shadow-sm">
          <div className="border-b border-border px-4 py-3">
            <h2 className="inline-flex items-center gap-2 text-sm font-bold text-foreground">
              <FileSpreadsheet className="size-4 text-emerald-600" />
              Export statistical data to Excel
            </h2>
          </div>
          <div className="flex flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-4">
              {exportSections.map((section) => (
                <label key={section.id} className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <input
                    checked={selectedSections[section.id]}
                    className="size-4 accent-blue-700"
                    onChange={(event) => setSelectedSections((current) => ({ ...current, [section.id]: event.target.checked }))}
                    type="checkbox"
                  />
                  {section.label}
                </label>
              ))}
            </div>
            <Button disabled={exportDisabled} onClick={() => exportWorkbook(data, selectedSections)}>
              <FileSpreadsheet data-icon="inline-start" />
              Export to Excel
            </Button>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-base font-bold uppercase tracking-normal text-foreground">Score Distribution</h2>
          <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
            <section className="rounded-md border border-border bg-card shadow-sm">
              <div className="border-b border-border px-4 py-3">
                <h3 className="inline-flex items-center gap-2 text-sm font-bold text-foreground">
                  <BarChart3 className="size-4 text-blue-700" />
                  Distribution chart
                </h3>
              </div>
              <div className="p-4">
                <h4 className="text-center text-sm font-bold text-foreground">Statistics for {data.exam?.title}</h4>
                <DistributionChart distribution={data.distribution} />
                <p className="mt-4 text-center text-xs font-bold text-muted-foreground">Students</p>
              </div>
            </section>

            <section className="rounded-md border border-border bg-card shadow-sm">
              <div className="border-b border-border px-4 py-3">
                <h3 className="text-sm font-bold text-foreground">Distribution summary</h3>
              </div>
              <div className="space-y-5 p-4">
                <DistributionList distribution={data.distribution} />
                <div className="grid grid-cols-2 gap-3 border-t border-border pt-4 text-center">
                  <div>
                    <p className="text-xl font-bold text-foreground">{formatScore(data.summary.averageScore)}</p>
                    <p className="mt-1 text-xs font-medium text-muted-foreground">Average score</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-foreground">{data.summary.mostCommonScoreBucket}</p>
                    <p className="mt-1 text-xs font-medium text-muted-foreground">Most common score range</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </section>
      </section>
    </main>
  );
}

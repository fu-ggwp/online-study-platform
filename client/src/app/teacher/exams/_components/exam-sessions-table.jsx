"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

import {
  formatDateTime,
  formatClassLabel,
  formatVisibility,
  getStatusClassName,
  getStatusLabel,
} from "./exam-session-options";

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold leading-none ${getStatusClassName(
        status
      )}`}
    >
      {getStatusLabel(status)}
    </span>
  );
}

function VisibilityBadge({ visibility }) {
  return (
    <span className="inline-flex rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-bold leading-none text-muted-foreground">
      {formatVisibility(visibility)}
    </span>
  );
}

export function ExamSessionsTable({ exams }) {
  const router = useRouter();

  function goToExamDetail(examId) {
    router.push(`/teacher/exams/${examId}`);
  }

  function handleRowKeyDown(event, examId) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      goToExamDetail(examId);
    }
  }

  function handleViewDetail(event, examId) {
    event.stopPropagation();
    goToExamDetail(examId);
  }

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full table-auto border-collapse text-left text-sm">
          <thead className="bg-muted text-xs font-bold uppercase text-muted-foreground">
            <tr>
              <th className="w-[35%] px-4 py-3">Exam</th>
              <th className="w-[25%] px-4 py-3">Class</th>
              <th className="w-[18%] px-4 py-3">Start Time</th>
              <th className="w-[10%] px-4 py-3 text-center">Status</th>
              <th className="w-[12%] px-4 py-3 text-center">Visibility</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {exams.map((exam) => (
              <tr
                key={exam.exam_session_id}
                className="align-middle transition hover:bg-muted/40"
                role="button"
                tabIndex={0}
                onClick={() => goToExamDetail(exam.exam_session_id)}
                onKeyDown={(event) => handleRowKeyDown(event, exam.exam_session_id)}
              >
                <td className="max-w-[260px] px-4 py-4 md:max-w-[360px]">
                  <div className="line-clamp-2 font-bold text-foreground">{exam.title}</div>
                  <div className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-muted-foreground">
                    {exam.description || "No description provided."}
                  </div>
                </td>
                <td className="max-w-[220px] px-4 py-4 font-medium text-muted-foreground">
                  <span className="line-clamp-2">{formatClassLabel(exam.classes)}</span>
                </td>
                <td className="px-4 py-4 font-medium text-muted-foreground">
                  {formatDateTime(exam.start_at)}
                </td>
                <td className="px-4 py-4 text-center">
                  <StatusBadge status={exam.status} />
                </td>
                <td className="px-4 py-4 text-center">
                  <VisibilityBadge visibility={exam.result_visibility} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

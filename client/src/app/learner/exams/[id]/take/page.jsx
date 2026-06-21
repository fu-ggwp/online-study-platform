"use client";

import { AlertTriangle, CheckSquare, Home, Menu, RotateCw, Settings, Star } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { examsService } from "@/services/exams.service";

function formatTime(seconds) {
  const safe = Math.max(Number(seconds) || 0, 0);
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}m : ${String(rest).padStart(2, "0")}s`;
}

function getErrorMessage(error) {
  return error?.response?.data?.error || error?.message || "Unable to load exam attempt.";
}

function sameSelection(left = [], right = []) {
  return String(left[0] ?? "") === String(right[0] ?? "");
}

export default function TakeExamPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params?.id;

  const [examData, setExamData] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [needsReturn, setNeedsReturn] = useState(false);
  const [submitted, setSubmitted] = useState(null);

  const startedRef = useRef(false);
  const eventAtRef = useRef({});
  const submittingRef = useRef(false);

  const attempt = examData?.attempt;
  const questions = examData?.questions ?? [];
  const activeQuestion = questions[activeIndex] ?? questions[0];

  const requestExamMode = useCallback(() => {
    if (typeof document === "undefined") return;
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen()
        .then(() => setNeedsReturn(false))
        .catch(() => setNeedsReturn(true));
      return;
    }
    setNeedsReturn(false);
  }, []);

  const recordEvent = useCallback((eventType, message, countWarning = true) => {
    if (!attempt?.exam_attempt_id) return;

    const now = Date.now();
    if (now - (eventAtRef.current[eventType] || 0) < 600) return;
    eventAtRef.current[eventType] = now;

    if (message) setWarning(message);

    if (countWarning) {
      setExamData((current) => current ? {
        ...current,
        attempt: {
          ...current.attempt,
          warning_count: Number(current.attempt?.warning_count || 0) + 1,
        },
      } : current);
    }

    examsService.recordAttemptEventKeepAlive(attempt.exam_attempt_id, { event_type: eventType });

    if (countWarning) requestExamMode();
  }, [attempt?.exam_attempt_id, requestExamMode]);

  const submitAttempt = useCallback(async (isAutoSubmitted = false) => {
    if (!attempt?.exam_attempt_id || submittingRef.current) return;
    submittingRef.current = true;
    try {
      const result = await examsService.submitAttempt(attempt.exam_attempt_id, { is_auto_submitted: isAutoSubmitted });
      setSubmitted(result);
      setWarning(isAutoSubmitted ? "Time is up. Your saved answers were submitted automatically." : "Exam submitted successfully.");
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      submittingRef.current = false;
    }
  }, [attempt?.exam_attempt_id]);

  useEffect(() => {
    if (startedRef.current || !examId) return;
    startedRef.current = true;

    setLoading(true);
    setError("");
    const accessCode = new URLSearchParams(window.location.search).get("code") || "";

    examsService
      .startAttempt(examId, { access_code: accessCode })
      .then((data) => {
        const answerMap = {};
        (data.answers ?? []).forEach((answer) => {
          answerMap[answer.exam_question_id] = answer.selected_exam_option_indexes ?? [];
        });
        setExamData(data);
        setSelectedAnswers(answerMap);
        setRemainingSeconds(data.attempt?.remaining_seconds ?? 0);
        requestExamMode();
      })
      .catch((loadError) => setError(getErrorMessage(loadError)))
      .finally(() => setLoading(false));
  }, [examId, requestExamMode]);

  useEffect(() => {
    if (!attempt?.exam_attempt_id || submitted) return;
    const interval = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          submitAttempt(true);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [attempt?.exam_attempt_id, submitAttempt, submitted]);

  useEffect(() => {
    if (!attempt?.exam_attempt_id || submitted) return undefined;

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        recordEvent("tab_hidden", "Warning: do not leave the exam tab.");
      } else {
        recordEvent("tab_visible", "", false);
        requestExamMode();
      }
    };
    const onBlur = () => recordEvent("window_blur", "Warning: keep the exam window active.");
    const onFocus = () => recordEvent("window_focus", "", false);
    const onFullscreen = () => {
      if (!document.fullscreenElement) {
        recordEvent("fullscreen_exit", "Warning: fullscreen mode is required for this exam.");
      }
    };
    const onKeyDown = (event) => {
      const key = event.key.toLowerCase();
      const blockedDevTools = event.key === "F12" || (event.ctrlKey && event.shiftKey && ["i", "j", "c"].includes(key));
      const blockedZoom = event.ctrlKey && ["-", "_", "="].includes(key);
      if (!blockedDevTools && !blockedZoom) return;
      event.preventDefault();
      recordEvent(blockedZoom ? "zoom_changed" : "window_blur", "Warning: restricted browser action detected.");
    };
    const onWheel = (event) => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      recordEvent("zoom_changed", "Warning: browser zoom changes are not allowed.");
    };
    const onContextMenu = (event) => {
      event.preventDefault();
      recordEvent("window_blur", "Warning: restricted browser action detected.");
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("fullscreenchange", onFullscreen);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("contextmenu", onContextMenu);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("fullscreenchange", onFullscreen);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("contextmenu", onContextMenu);
    };
  }, [attempt?.exam_attempt_id, recordEvent, requestExamMode, submitted]);

  const answeredCount = useMemo(() => {
    return questions.filter((question) => (selectedAnswers[question.exam_question_id] ?? []).length > 0).length;
  }, [questions, selectedAnswers]);

  async function selectOption(questionId, optionIndex) {
    const nextSelection = [optionIndex];
    if (sameSelection(selectedAnswers[questionId], nextSelection)) return;

    setSelectedAnswers((current) => ({ ...current, [questionId]: nextSelection }));
    try {
      await examsService.submitAnswer(attempt.exam_attempt_id, {
        exam_question_id: questionId,
        selected_exam_option_indexes: nextSelection,
      });
    } catch (saveError) {
      setWarning(getErrorMessage(saveError));
    }
  }

  function handleSubmit() {
    if (!window.confirm("Submit this exam? You cannot change answers after submitting.")) return;
    submitAttempt(false);
  }

  if (loading) {
    return <main className="fixed inset-0 z-50 grid place-items-center bg-[#f2f2f2] text-sm text-slate-600">Loading exam...</main>;
  }

  if (error || !examData) {
    return (
      <main className="fixed inset-0 z-50 grid place-items-center bg-[#f2f2f2] p-6">
        <section className="w-full max-w-xl border border-slate-300 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-red-600">{error || "Exam attempt not found."}</p>
          <Button className="mt-4 rounded-sm" variant="outline" onClick={() => router.push(`/learner/exams/${examId}`)}>
            Back to exam
          </Button>
        </section>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="fixed inset-0 z-50 grid place-items-center bg-[#f2f2f2] p-6">
        <section className="w-full max-w-xl border border-slate-300 bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-700">Exam submitted successfully</h1>
          {submitted.result_visibility === "score_only" ? (
            <p className="mt-3 text-sm text-slate-600">Score: {submitted.total_score} / {submitted.max_score}</p>
          ) : (
            <p className="mt-3 text-sm text-slate-600">Your completion status has been saved.</p>
          )}
          <Button className="mt-5 rounded-sm" onClick={() => router.push("/learner/exams")}>Back to exams</Button>
        </section>
      </main>
    );
  }

  return (
    <main className="fixed inset-0 z-50 overflow-auto bg-[#eeeeee] text-slate-700">
      <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm">
        <div className="flex items-center gap-4 text-slate-600">
          <Menu className="size-5" />
          <span className="text-sm font-semibold">FPT Education</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span>{new Date().toLocaleTimeString()}</span>
          <Settings className="size-4" />
          <Home className="size-4" />
        </div>
      </header>

      <section className="border-b border-slate-200 bg-[#f7f7f7] px-4 py-3 text-sm font-semibold text-slate-600">
        Kiem tra ca nhan - {examData.exam?.classes?.class_name || "Class"} - {examData.exam?.title}
      </section>

      {warning ? (
        <div className="mx-4 mt-3 flex items-center gap-2 border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
          <AlertTriangle className="size-4" />
          <span>{warning} Warnings: {examData.attempt?.warning_count ?? 0}</span>
        </div>
      ) : null}

      <section className="grid gap-3 p-4 lg:grid-cols-[305px_1fr]">
        <aside className="border border-slate-300 bg-white p-3 shadow-sm">
          <h2 className="border-b border-slate-200 pb-3 text-center text-sm font-bold text-slate-600">Thong tin phien thi</h2>

          <div className="mx-1 mt-4 border border-slate-100 bg-slate-50">
            <div className="flex items-center justify-between bg-[#f3f3fb] px-4 py-3 text-sm font-semibold text-slate-600">
              <span>Luu y khi lam bai</span>
              <span>^</span>
            </div>
            <ul className="space-y-1 px-8 py-4 text-xs leading-5 text-slate-600">
              <li>Thi sinh chu y thoi gian lam bai</li>
              <li>Tien trinh se duoc luu tu dong</li>
              <li>Khong roi khoi man hinh bai thi</li>
              <li>Lien he can bo coi thi neu co su co</li>
            </ul>
          </div>

          <div className="mx-1 my-4 h-3 border-l-4 border-blue-700 bg-slate-100" />
          <div className="mx-1 border-t border-slate-200 pt-4">
            <p className="text-xs text-slate-500">Thoi gian con lai</p>
            <p className="mt-1 text-base font-bold text-[#53608a]">{formatTime(remainingSeconds)}</p>
          </div>

          <div className="mx-1 mt-6">
            <div className="mb-3 grid grid-cols-5 gap-2">
              {questions.map((question, index) => {
                const answered = (selectedAnswers[question.exam_question_id] ?? []).length > 0;
                const active = index === activeIndex;
                return (
                  <button
                    key={question.exam_question_id}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    className={`h-8 border text-sm font-bold ${active ? "border-blue-700 bg-blue-600 text-white" : answered ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-300 bg-white text-slate-600"}`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>

            <Button className="h-8 w-full rounded-sm border-slate-400 bg-white text-slate-700 hover:bg-slate-50" variant="outline" onClick={handleSubmit}>
              <CheckSquare className="size-4" />
              Nop bai
            </Button>
          </div>
        </aside>

        <section className="min-h-[398px] border border-slate-300 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h1 className="text-sm font-bold text-[#53608a]">CAU HOI {activeIndex + 1} (SINGLECHOICE)</h1>
            <button className="flex h-8 items-center gap-1 border border-yellow-200 px-3 text-xs font-semibold text-yellow-600" type="button">
              <Star className="size-4" />
              Danh dau
            </button>
          </div>

          {activeQuestion ? (
            <div>
              <div className="min-h-[210px] border-b border-slate-200 px-6 py-9">
                <p className="max-w-4xl text-base font-semibold leading-7 text-slate-800">{activeQuestion.question_text}</p>
              </div>

              <div className="space-y-4 px-5 py-5">
                {activeQuestion.answer_options.map((option, index) => {
                  const checked = selectedAnswers[activeQuestion.exam_question_id]?.[0] === option.index;
                  return (
                    <label key={`${activeQuestion.exam_question_id}-${option.index}`} className="flex cursor-pointer items-center gap-3 text-sm text-slate-700">
                      <input
                        checked={checked}
                        name={activeQuestion.exam_question_id}
                        onChange={() => selectOption(activeQuestion.exam_question_id, option.index)}
                        type="radio"
                        className="size-4 accent-[#5368b5]"
                      />
                      <span>({String.fromCharCode(105 + index)})</span>
                      <span>{option.text}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="grid min-h-[360px] place-items-center text-sm text-slate-500">No questions available.</div>
          )}
        </section>
      </section>

      <footer className="fixed bottom-0 left-0 right-0 pointer-events-none flex items-end justify-between px-0 text-xs text-slate-500">
        <div className="bg-orange-300 px-6 py-3 text-2xl font-bold text-white">4. Take an exam</div>
        <div className="pb-2 pr-4">Answered {answeredCount}/{questions.length}</div>
      </footer>

      {needsReturn ? (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/55 p-6">
          <section className="w-full max-w-md border border-amber-300 bg-white p-5 text-center shadow-xl">
            <AlertTriangle className="mx-auto size-8 text-amber-600" />
            <h2 className="mt-3 text-lg font-bold text-slate-800">Return to exam screen</h2>
            <p className="mt-2 text-sm text-slate-600">
              The exam must stay fullscreen and active. Click below to continue.
            </p>
            <Button className="mt-5 rounded-sm" onClick={requestExamMode}>
              Return to exam
            </Button>
          </section>
        </div>
      ) : null}

      <button
        className="fixed bottom-16 right-5 grid size-9 place-items-center border border-slate-300 bg-white text-slate-500 shadow-sm"
        onClick={requestExamMode}
        title="Restore fullscreen"
        type="button"
      >
        <RotateCw className="size-4" />
      </button>
    </main>
  );
}

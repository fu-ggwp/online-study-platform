"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  BookOpen, 
  Layers, 
  User, 
  Calendar, 
  ChevronRight, 
  Sparkles, 
  HelpCircle,
  FileQuestion,
  GraduationCap,
  Star,
  CheckCircle
} from "lucide-react";
import { studySetsService } from "@/services/study-sets.service";
import { Button } from "@/components/ui/button";

export default function LearnerStudySetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id;

  const [studySet, setStudySet] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [difficultQuestionIds, setDifficultQuestionIds] = useState(new Set());
  const [masteredQuestionIds, setMasteredQuestionIds] = useState(new Set());
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("all"); // "all" | "starred"

  useEffect(() => {
    if (!id) return;

    async function loadDetails() {
      setLoading(true);
      try {
        const res = await studySetsService.getOne(id);
        const originalQuestions = res.data?.questions || [];
        setStudySet(res.data || null);

        // Fetch my sessions to determine status of questions
        try {
          const sessionsRes = await studySetsService.listMySessions();
          // Fix for: TypeError: (sessionsRes || []).filter is not a function
          const sessionsList = Array.isArray(sessionsRes) 
            ? sessionsRes 
            : (Array.isArray(sessionsRes?.data) ? sessionsRes.data : []);
            
          const mySessions = sessionsList.filter(s => s.study_set_id === id);
          
          if (mySessions.length > 0) {
            // Sort by started_at descending to find the latest session
            mySessions.sort((a, b) => new Date(b.started_at) - new Date(a.started_at));
            const latestSession = mySessions[0];
            setSessionId(latestSession.practice_attempt_id);
            
            const resultsRes = await studySetsService.getSessionResults(latestSession.practice_attempt_id);
            const answers = Array.isArray(resultsRes)
              ? resultsRes
              : (Array.isArray(resultsRes?.data?.answers)
                ? resultsRes.data.answers
                : Array.isArray(resultsRes?.data)
                  ? resultsRes.data
                  : Array.isArray(resultsRes?.answers)
                    ? resultsRes.answers
                    : []);

            const diffIds = new Set();
            const mastIds = new Set();
            answers.forEach(ans => {
              if (ans.review_status === "marked_for_retry") {
                diffIds.add(ans.question_id);
              } else if (ans.review_status === "mastered") {
                mastIds.add(ans.question_id);
              }
            });
            
            setDifficultQuestionIds(diffIds);
            setMasteredQuestionIds(mastIds);
            setQuestions(originalQuestions);
          } else {
            setQuestions(originalQuestions);
          }
        } catch (sessionErr) {
          console.error("Failed to load session progress:", sessionErr);
          setQuestions(originalQuestions);
        }
        setError(null);
      } catch (err) {
        console.error("Failed to load study set details:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    loadDetails();
  }, [id]);

  useEffect(() => {
    if (difficultQuestionIds.size === 0 && activeTab === "starred") {
      setActiveTab("all");
    }
  }, [difficultQuestionIds, activeTab]);

  // --- Click Star to Toggle Difficulty Directly ---
  const toggleDifficult = async (qId) => {
    try {
      let currentSessionId = sessionId;
      
      // Start session if none exists
      if (!currentSessionId) {
        const sessionRes = await studySetsService.startSession(id, "flashcard");
        const newSessionId = sessionRes?.data?.practice_attempt_id || sessionRes?.practice_attempt_id;
        if (newSessionId) {
          currentSessionId = newSessionId;
          setSessionId(currentSessionId);
        } else {
          console.error("Failed to start session for toggling difficulty");
          return;
        }
      }

      const newDifficult = new Set(difficultQuestionIds);
      const newMastered = new Set(masteredQuestionIds);
      const isDiff = newDifficult.has(qId);
      const status = isDiff ? "unreviewed" : "marked_for_retry";

      if (isDiff) {
        newDifficult.delete(qId);
      } else {
        newDifficult.add(qId);
        newMastered.delete(qId); // If marked difficult, remove from mastered
      }
      
      setDifficultQuestionIds(newDifficult);
      setMasteredQuestionIds(newMastered);

      // Save progress to database
      await studySetsService.submitAnswer(currentSessionId, {
        question_id: qId,
        selected_answer_option_ids: [],
        is_correct: false,
        review_status: status
      });

    } catch (err) {
      console.error("Failed to toggle difficulty:", err);
    }
  };

  const toggleMastered = async (qId) => {
    try {
      let currentSessionId = sessionId;
      
      // Start session if none exists
      if (!currentSessionId) {
        const sessionRes = await studySetsService.startSession(id, "flashcard");
        const newSessionId = sessionRes?.data?.practice_attempt_id || sessionRes?.practice_attempt_id;
        if (newSessionId) {
          currentSessionId = newSessionId;
          setSessionId(currentSessionId);
        } else {
          console.error("Failed to start session for toggling mastered");
          return;
        }
      }

      const newDifficult = new Set(difficultQuestionIds);
      const newMastered = new Set(masteredQuestionIds);
      const isMast = newMastered.has(qId);
      const status = isMast ? "unreviewed" : "mastered";

      if (isMast) {
        newMastered.delete(qId);
      } else {
        newMastered.add(qId);
        newDifficult.delete(qId); // If marked mastered, remove from difficult
      }
      
      setDifficultQuestionIds(newDifficult);
      setMasteredQuestionIds(newMastered);

      // Save progress to database
      await studySetsService.submitAnswer(currentSessionId, {
        question_id: qId,
        selected_answer_option_ids: [],
        is_correct: !isMast,
        review_status: status
      });

    } catch (err) {
      console.error("Failed to toggle mastered:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-3 text-foreground">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-muted-foreground font-medium">Loading study set...</p>
      </div>
    );
  }

  if (error || !studySet) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center space-y-4 text-foreground">
        <HelpCircle className="size-12 text-destructive" />
        <h2 className="text-xl font-bold">Study Set Not Found</h2>
        <p className="text-sm text-muted-foreground max-w-sm">We couldn't retrieve this study set. It may have been deleted or you don't have access.</p>
        <Button onClick={() => router.push("/learner/study-sets")}>Back to My Study Sets</Button>
      </div>
    );
  }

  const hasAssigned = studySet.study_set_assignments && studySet.study_set_assignments.length > 0;
  const creatorName = studySet.teacher?.full_name || "Teacher";
  const formattedDate = new Date(studySet.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <main className="min-h-screen bg-background text-foreground px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        
        {/* Navigation & Header */}
        <div className="space-y-4">
          <Button 
            onClick={() => router.push("/learner/study-sets")} 
            variant="ghost" 
            className="text-muted-foreground hover:text-foreground hover:bg-muted gap-2 pl-2"
          >
            <ArrowLeft className="size-4" />
            <span>My Study Sets</span>
          </Button>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs font-bold bg-primary/10 text-primary px-2.5 py-0.5 rounded-full capitalize">
                  {studySet.visibility?.replace("_", " ")}
                </span>
                {studySet.topic && (
                  <span className="text-xs font-bold bg-muted text-muted-foreground px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-border">
                    <Layers size={10} />
                    {studySet.topic}
                  </span>
                )}
                {hasAssigned && (
                  <span className="text-xs font-bold bg-amber-50 text-amber-600 border border-amber-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <GraduationCap size={10} />
                    Assigned
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                {studySet.title}
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-2xl">
                {studySet.description || "No description provided."}
              </p>
            </div>

            {/* Creator details */}
            <div className="flex items-center gap-3 bg-card border border-border p-3 rounded-2xl shrink-0 shadow-sm">
              <div className="size-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-bold">
                <User size={18} />
              </div>
              <div className="text-xs">
                <p className="text-muted-foreground">Created by</p>
                <p className="font-bold text-foreground">{creatorName}</p>
                <p className="text-[10px] text-muted-foreground">{formattedDate}</p>
              </div>
            </div>
          </div>
        </div>

        {/* STUDY MODE SELECTORS */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-1.5">
            <span>Select Study Mode</span>
          </h2>
          
          <div className="grid gap-4 sm:grid-cols-2">
            
            {/* Flashcard Practice Mode Card */}
            <div 
              onClick={() => router.push(`/learner/study-sets/${id}/flashcards`)}
              className="group relative overflow-hidden rounded-3xl border border-border bg-card p-6 hover:border-primary/50 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md"
            >
              <div className="absolute top-0 right-0 size-28 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all duration-300"></div>
              
              <div className="space-y-4">
                <div className="size-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                  <BookOpen className="size-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                    <span>Flashcards</span>
                    <ChevronRight className="size-4 group-hover:translate-x-1 transition-transform" />
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                    Rotate cards to check terms, mark difficult cards, and review key definitions at your own pace.
                  </p>
                </div>
              </div>
            </div>

            {/* Quiz Practice Mode Card */}
            <div 
              onClick={() => router.push(`/learner/study-sets/${id}/quiz`)}
              className="group relative overflow-hidden rounded-3xl border border-border bg-card p-6 hover:border-emerald-500/50 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md"
            >
              <div className="absolute top-0 right-0 size-28 bg-emerald-50 rounded-full blur-2xl group-hover:bg-emerald-100/10 transition-all duration-300"></div>
              
              <div className="space-y-4">
                <div className="size-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                  <FileQuestion className="size-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground group-hover:text-emerald-600 transition-colors flex items-center gap-1">
                    <span>Practice Quiz</span>
                    <ChevronRight className="size-4 group-hover:translate-x-1 transition-transform" />
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                    Challenge yourself with multiple-choice questions under test conditions and calculate your mastery score.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* QUESTION PREVIEW LIST */}
        <div className="space-y-6 pt-6 border-t border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-foreground">
              Study Set Cards ({questions.length})
            </h2>

            {/* Segment control tabs (All / Starred) */}
            {difficultQuestionIds.size > 0 && (
              <div className="flex bg-neutral-100 p-1 rounded-2xl w-fit border border-neutral-200">
                <button
                  onClick={() => setActiveTab("all")}
                  className={`px-6 py-1.5 text-sm font-semibold rounded-xl transition-all duration-200 ${
                    activeTab === "all"
                      ? "bg-white text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setActiveTab("starred")}
                  className={`px-6 py-1.5 text-sm font-semibold rounded-xl transition-all duration-200 ${
                    activeTab === "starred"
                      ? "bg-white text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Starred
                </button>
              </div>
            )}
          </div>

          {/* Render Helper for Questions */}
          {(() => {
            // Helper function to render a card
            const renderCard = (q) => {
              const isDifficult = difficultQuestionIds.has(q.question_id);
              const isMastered = masteredQuestionIds.has(q.question_id);
              const statusClass = isDifficult 
                ? "border-amber-200 bg-amber-50/20" 
                : isMastered 
                ? "border-emerald-200 bg-emerald-50/20" 
                : "border-border bg-card";

              const originalIdx = questions.findIndex(item => item.question_id === q.question_id);

              return (
                <div 
                  key={q.question_id}
                  className={`relative rounded-2xl border p-6 shadow-sm hover:shadow-md transition-all duration-200 ${statusClass}`}
                >
                  {/* Top-Right Control Buttons (Star & CheckCircle) */}
                  <div className="absolute top-4 right-4 flex items-center gap-1 z-10" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => toggleDifficult(q.question_id)}
                      className="p-1.5 hover:bg-neutral-100 rounded-full transition-colors"
                      title={isDifficult ? "Remove from Difficult" : "Mark as Difficult"}
                    >
                      <Star className={`size-5 ${isDifficult ? "fill-amber-400 text-amber-500" : "text-neutral-300"}`} />
                    </button>
                    <button 
                      onClick={() => toggleMastered(q.question_id)}
                      className="p-1.5 hover:bg-neutral-100 rounded-full transition-colors"
                      title={isMastered ? "Remove from Mastered" : "Mark as Mastered"}
                    >
                      <CheckCircle className={`size-5 ${isMastered ? "fill-emerald-500 text-emerald-600" : "text-neutral-300"}`} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                    {/* Left Column: Question & Options */}
                    <div className="space-y-3 pr-4">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Question {originalIdx + 1}
                      </p>
                      <p className="text-lg font-bold text-foreground leading-relaxed">
                        {q.question_text}
                      </p>
                      {/* Render Options */}
                      <div className="space-y-1.5 pl-1">
                        {(q.answer_options || []).map((opt, oIdx) => (
                          <p key={oIdx} className="text-sm text-foreground/80 leading-relaxed">
                            {String.fromCharCode(97 + oIdx)}. {opt.option_text}
                          </p>
                        ))}
                      </div>
                    </div>

                    {/* Right Column: Correct Answer & Explanation */}
                    <div className="border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6 space-y-3 flex flex-col justify-center">
                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                          Correct Answer
                        </span>
                        {(q.answer_options || []).filter(opt => opt.is_correct).map((opt, oIdx) => (
                          <p key={oIdx} className="text-base font-bold text-emerald-600 leading-relaxed bg-emerald-50/40 border border-emerald-100/50 px-2.5 py-1 rounded-lg inline-block">
                            {opt.option_text}
                          </p>
                        ))}
                      </div>
                      {q.explanation && (
                        <div className="border-t border-dashed border-border/60 pt-2">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                            Explanation
                          </span>
                          <p className="text-sm text-muted-foreground italic leading-relaxed">
                            {q.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            };

            // Filter questions based on tabs and category
            const stillLearningQuestions = questions.filter(
              (q) => !masteredQuestionIds.has(q.question_id) && 
              (activeTab !== "starred" || difficultQuestionIds.has(q.question_id))
            );

            const masteredQuestions = questions.filter(
              (q) => masteredQuestionIds.has(q.question_id) && 
              (activeTab !== "starred" || difficultQuestionIds.has(q.question_id))
            );

            return (
              <div className="space-y-8">
                {/* Still learning list */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                    Still learning ({stillLearningQuestions.length})
                  </h3>
                  {stillLearningQuestions.length > 0 ? (
                    <div className="space-y-3">
                      {stillLearningQuestions.map(q => renderCard(q))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic pl-1">No cards in this section.</p>
                  )}
                </div>

                {/* Mastered list */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                    Mastered ({masteredQuestions.length})
                  </h3>
                  {masteredQuestions.length > 0 ? (
                    <div className="space-y-3">
                      {masteredQuestions.map(q => renderCard(q))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic pl-1">No cards in this section.</p>
                  )}
                </div>
              </div>
            );
          })()}
        </div>

      </div>
    </main>
  );
}

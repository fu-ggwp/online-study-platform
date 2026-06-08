import * as dao from "./analytics.dao.js";

function dbError(error, status = 400) {
  return Object.assign(new Error(error.message), { status });
}
function notFound(message = "Report not found") {
  return Object.assign(new Error(message), { status: 404 });
}

export async function listReports(ownerId) {
  const { data, error } = await dao.findReportsByOwner(ownerId);
  if (error) throw dbError(error, 500);
  return data;
}

export async function getReport(id) {
  const { data, error } = await dao.findReportById(id);
  if (error || !data) throw notFound();
  return data;
}

// Teacher: class performance summary → /teacher/analytics/classes/:classId
export async function generateClassReport(teacherId, classId) {
  const { data: attempts, error } = await dao.examAttemptsByClass(classId);
  if (error) throw dbError(error, 500);

  const total = attempts.length;
  const avgScore = total ? attempts.reduce((sum, a) => sum + (a.score || 0), 0) / total : 0;

  const { data, error: insertError } = await dao.createReport({
    owner_id: teacherId,
    class_id: classId,
    type: "class_performance",
    data: { totalAttempts: total, averageScore: avgScore },
    generated_at: new Date().toISOString(),
  });
  if (insertError) throw dbError(insertError);
  return data;
}

// Learner: personal progress summary → /learner/analytics/progress
export async function generateLearnerReport(learnerId) {
  const [{ data: attempts, error: attemptsErr }, { data: sessions, error: sessionsErr }] = await Promise.all([
    dao.examAttemptsByLearner(learnerId),
    dao.practiceSessionsByLearner(learnerId),
  ]);
  if (attemptsErr) throw dbError(attemptsErr, 500);
  if (sessionsErr) throw dbError(sessionsErr, 500);

  const examCount = attempts.length;
  const avgExamScore = examCount ? attempts.reduce((sum, a) => sum + (a.score || 0), 0) / examCount : 0;
  const sessionCount = sessions.length;

  const { data, error: insertError } = await dao.createReport({
    owner_id: learnerId,
    class_id: null,
    type: "learner_progress",
    data: { examCount, avgExamScore, sessionCount },
    generated_at: new Date().toISOString(),
  });
  if (insertError) throw dbError(insertError);
  return data;
}

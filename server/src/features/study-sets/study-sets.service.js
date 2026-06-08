import * as dao from "./study-sets.dao.js";

function dbError(error, status = 400) {
  return Object.assign(new Error(error.message), { status });
}
function notFound(message = "Study set not found") {
  return Object.assign(new Error(message), { status: 404 });
}

export async function listMine(ownerId) {
  const { data, error } = await dao.findByOwner(ownerId);
  if (error) throw dbError(error, 500);
  return data;
}

export async function listAvailable(classId) {
  const { data, error } = await dao.findPublic({ classId });
  if (error) throw dbError(error, 500);
  return data;
}

export async function getOne(id) {
  const { data, error } = await dao.findById(id);
  if (error || !data) throw notFound();
  return data;
}

export async function create(ownerId, { title, description, visibility, classId, questionBankId }) {
  if (!title?.trim()) throw Object.assign(new Error("Title is required"), { status: 422 });

  const { data, error } = await dao.create({
    owner_id: ownerId,
    title,
    description,
    visibility: visibility || "private",
    class_id: classId || null,
    question_bank_id: questionBankId || null,
  });
  if (error) throw dbError(error);
  return data;
}

export async function update(id, ownerId, changes) {
  const set = await getOne(id);
  if (set.owner_id !== ownerId) throw Object.assign(new Error("Forbidden"), { status: 403 });

  const { data, error } = await dao.update(id, changes);
  if (error) throw dbError(error);
  return data;
}

export async function remove(id, ownerId) {
  const set = await getOne(id);
  if (set.owner_id !== ownerId) throw Object.assign(new Error("Forbidden"), { status: 403 });

  const { error } = await dao.remove(id);
  if (error) throw dbError(error);
}

// Practice sessions (learner studying a set)
export async function startSession(learnerId, studySetId, mode) {
  await getOne(studySetId);
  const { data, error } = await dao.createSession({
    learner_id: learnerId,
    study_set_id: studySetId,
    mode: mode || "flashcards",
    score: 0,
    started_at: new Date().toISOString(),
  });
  if (error) throw dbError(error);
  return data;
}

export async function listMySessions(learnerId) {
  const { data, error } = await dao.listSessionsByLearner(learnerId);
  if (error) throw dbError(error, 500);
  return data;
}

export async function submitAnswer(sessionId, payload) {
  const { data, error } = await dao.recordAnswer({ ...payload, practice_session_id: sessionId });
  if (error) throw dbError(error);
  return data;
}

export async function completeSession(sessionId, score) {
  const { data, error } = await dao.updateSession(sessionId, {
    score,
    completed_at: new Date().toISOString(),
  });
  if (error) throw dbError(error);
  return data;
}

export async function getSessionResults(sessionId) {
  const session = await dao.findSessionById(sessionId);
  if (session.error || !session.data) throw notFound("Practice session not found");

  const { data, error } = await dao.listAnswersBySession(sessionId);
  if (error) throw dbError(error, 500);

  return { session: session.data, answers: data };
}

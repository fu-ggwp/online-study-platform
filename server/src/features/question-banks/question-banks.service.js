import * as dao from "./question-banks.dao.js";

function dbError(error, status = 400) {
  return Object.assign(new Error(error.message), { status });
}
function notFound(message = "Question bank not found") {
  return Object.assign(new Error(message), { status: 404 });
}

export async function listMine(teacherId) {
  const { data, error } = await dao.findByTeacher(teacherId);
  if (error) throw dbError(error, 500);
  return data;
}

export async function getOne(id) {
  const { data, error } = await dao.findById(id);
  if (error || !data) throw notFound();
  return data;
}

export async function create(teacherId, { name, description, subject }) {
  if (!name?.trim()) throw Object.assign(new Error("Name is required"), { status: 422 });

  const { data, error } = await dao.create({ teacher_id: teacherId, name, description, subject });
  if (error) throw dbError(error);
  return data;
}

export async function update(id, teacherId, changes) {
  const bank = await getOne(id);
  if (bank.teacher_id !== teacherId) throw Object.assign(new Error("Forbidden"), { status: 403 });

  const { data, error } = await dao.update(id, changes);
  if (error) throw dbError(error);
  return data;
}

export async function remove(id, teacherId) {
  const bank = await getOne(id);
  if (bank.teacher_id !== teacherId) throw Object.assign(new Error("Forbidden"), { status: 403 });

  const { error } = await dao.remove(id);
  if (error) throw dbError(error);
}

export async function listQuestions(bankId) {
  const { data, error } = await dao.listQuestions(bankId);
  if (error) throw dbError(error, 500);
  return data;
}

export async function addQuestion(bankId, teacherId, payload) {
  const bank = await getOne(bankId);
  if (bank.teacher_id !== teacherId) throw Object.assign(new Error("Forbidden"), { status: 403 });

  const { data, error } = await dao.addQuestion({ ...payload, question_bank_id: bankId });
  if (error) throw dbError(error);
  return data;
}

export async function updateQuestion(questionId, changes) {
  const { data, error } = await dao.updateQuestion(questionId, changes);
  if (error) throw dbError(error);
  return data;
}

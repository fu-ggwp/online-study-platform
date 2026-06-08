import * as classesDao from "./classes.dao.js";
import { buildPaginatedResponse } from "../../utils/pagination.js";

function dbError(error, status = 400) {
  return Object.assign(new Error(error.message), { status });
}

function generateInviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

// "Teacher views/manages their classes" — UC: Class Setup & Management
export async function listMyClasses(teacherId, { page, limit, from, to }) {
  const { data, error, count } = await classesDao.findByTeacher(teacherId, { from, to });
  if (error) throw dbError(error, 500);

  return buildPaginatedResponse({ items: data, count, page, limit });
}

export async function getClass(id, requesterId) {
  const { data, error } = await classesDao.findById(id);
  if (error || !data) throw Object.assign(new Error("Class not found"), { status: 404 });

  return data;
}

export async function createClass(teacherId, { name, description }) {
  if (!name?.trim()) {
    throw Object.assign(new Error("Class name is required"), { status: 422 });
  }

  const { data, error } = await classesDao.create({
    teacher_id: teacherId,
    name: name.trim(),
    description: description ?? null,
    invite_code: generateInviteCode(),
  });
  if (error) throw dbError(error);

  return data;
}

export async function updateClass(id, teacherId, changes) {
  const existing = await getClass(id);
  if (existing.teacher_id !== teacherId) {
    throw Object.assign(new Error("You don't own this class"), { status: 403 });
  }

  const { data, error } = await classesDao.update(id, changes);
  if (error) throw dbError(error);

  return data;
}

export async function deleteClass(id, teacherId) {
  const existing = await getClass(id);
  if (existing.teacher_id !== teacherId) {
    throw Object.assign(new Error("You don't own this class"), { status: 403 });
  }

  const { error } = await classesDao.remove(id);
  if (error) throw dbError(error);
}

export async function listMembers(classId, teacherId) {
  const existing = await getClass(classId);
  if (existing.teacher_id !== teacherId) {
    throw Object.assign(new Error("You don't own this class"), { status: 403 });
  }

  const { data, error } = await classesDao.listMembers(classId);
  if (error) throw dbError(error, 500);

  return data;
}

export async function requestToJoin(classId, learnerId) {
  const { data, error } = await classesDao.createJoinRequest({ classId, learnerId });
  if (error) throw dbError(error);

  return data;
}

export async function resolveJoinRequest(requestId, teacherId, status) {
  if (!["approved", "rejected"].includes(status)) {
    throw Object.assign(new Error("Invalid status"), { status: 422 });
  }

  // In a full implementation, also verify the request's class belongs to teacherId
  const { data, error } = await classesDao.updateJoinRequest(requestId, {
    status,
    resolved_at: new Date().toISOString(),
  });
  if (error) throw dbError(error);

  return data;
}

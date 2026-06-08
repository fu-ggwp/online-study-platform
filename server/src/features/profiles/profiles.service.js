import * as profilesDao from "./profiles.dao.js";

function notFound(message = "Profile not found") {
  return Object.assign(new Error(message), { status: 404 });
}

export async function getById(id) {
  const { data, error } = await profilesDao.findById(id);
  if (error || !data) throw notFound();
  return data;
}

export async function getByUsername(username) {
  const { data, error } = await profilesDao.findByUsername(username);
  if (error || !data) throw notFound();
  return data;
}

export async function updateProfile(id, changes) {
  // Strip fields that must not be self-editable (role, premium status, etc.)
  const { role, is_premium, id: _id, ...safeChanges } = changes;

  const { data, error } = await profilesDao.update(id, safeChanges);
  if (error) throw Object.assign(new Error(error.message), { status: 400 });
  return data;
}

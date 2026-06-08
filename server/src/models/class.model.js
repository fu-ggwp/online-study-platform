// Mirrors the `classes` table.
export const CLASS_TABLE = "classes";

/**
 * @typedef {Object} Class
 * @property {string} id
 * @property {string} teacher_id    - FK -> profiles.id
 * @property {string} name
 * @property {string} description
 * @property {string} invite_code
 * @property {boolean} is_archived
 * @property {string} created_at
 * @property {string} updated_at
 */

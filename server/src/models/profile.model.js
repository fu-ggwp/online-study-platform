// Mirrors the `profiles` table — extends Supabase's auth.users with
// app-specific fields (role, display info).
export const PROFILE_TABLE = "profiles";

export const ProfileRoles = Object.freeze({
  LEARNER: "learner",
  TEACHER: "teacher",
  ADMIN: "admin",
});

/**
 * @typedef {Object} Profile
 * @property {string} id            - matches auth.users.id
 * @property {string} username
 * @property {string} full_name
 * @property {string} avatar_url
 * @property {"learner"|"teacher"|"admin"} role
 * @property {boolean} is_premium
 * @property {string} created_at
 * @property {string} updated_at
 */

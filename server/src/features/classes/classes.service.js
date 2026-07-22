import { randomBytes } from "crypto";
import {
  getClassesByTeacher,
  insertClass,
  updateClassById,
  findClassByCode,
  getClassById,
  getClassMembers,
  getJoinRequests,
  getJoinRequestById,
  updateJoinRequest,
  insertClassMember,
  findClassByInvitationToken,
  findExistingMember,
  findExistingJoinRequest,
  insertJoinRequest,
  getJoinedClasses,
  getClassMemberById,
  removeClassMember,
  getActiveMemberCounts,
  getPendingRequestCounts,
  findMemberByClassAndLearner,
  reactivateClassMember,
  getUserById,
  getClassWithTeacher,
  getActiveMembership,
  getAssignmentsByClass,
  getLearnerAttemptsForStudySets,
  getPublishedExamsByClass,
  getExamsByClass,
  getExamSessionIdsByClass,
  getExamAttemptIdsBySessions,
  deleteAttemptAnswersByExamAttempts,
  deleteExamAttemptsBySessions,
  deleteExamQuestionsBySessions,
  deleteExamSessionsByClass,
  deleteAssignmentsByClass,
  deleteJoinRequestsByClass,
  deleteMembersByClass,
  hardDeleteClass,
} from "./classes.dao.js";
import { ClassJoinPolicy } from "../../models/class.model.js";
import { JoinRequestStatus, ClassMemberStatus } from "../../models/join-request.model.js";
import { StudySetVisibility } from "../../models/study-set.model.js";
import { PracticeAttemptStatus } from "../../models/practice-attempt.model.js";
import { notifyJoinRequestResolved } from "../../utils/notification.service.js";
import {
  notifyLearnerOfJoinRequestResolution,
  notifyTeacherOfJoinRequest,
} from "./classes.notifications.js";
import { logger } from "../../utils/logger.js";

// System message texts (SRS §5.2). Kept here so API error/response messages
// match the SRS exactly for Class Management use cases.
const MSG = {
  MSG02: "Please complete all required information.",
  MSG03: "The information is invalid. Please check and try again.",
  MSG11: "You do not have permission to access or perform this action.",
  MSG20: "You are already a member of this class or already have a pending join request.",
  MSG24: "The class code or invitation link is invalid, expired, or no longer available.",
};

/**
 * Generate a random 6-character uppercase alphanumeric class code (e.g. "AB3X9Z").
 */
function generateClassCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

/**
 * Generate a secure random invitation token.
 */
function generateInvitationToken() {
  return randomBytes(24).toString("hex");
}

/**
 * Tally active class_members rows per class_id.
 */
function tallyByClassId(rows) {
  const counts = {};
  for (const row of rows) {
    counts[row.class_id] = (counts[row.class_id] ?? 0) + 1;
  }
  return counts;
}

/**
 * Return all classes owned by the given teacher.
 * member_count only counts learners with status = "active".
 */
export async function listTeacherClasses(teacherId) {
  const { data, error } = await getClassesByTeacher(teacherId);
  if (error) throw new Error(error.message);

  const classIds = data.map((cls) => cls.class_id);
  const { data: activeRows, error: countError } = await getActiveMemberCounts(classIds);
  if (countError) throw new Error(countError.message);
  const counts = tallyByClassId(activeRows);

  // Pending join-request count per class (UC-29 Other Information).
  const { data: pendingRows, error: pendingError } = await getPendingRequestCounts(classIds);
  if (pendingError) throw new Error(pendingError.message);
  const pendingCounts = tallyByClassId(pendingRows);

  return data.map((cls) => ({
    ...cls,
    member_count: counts[cls.class_id] ?? 0,
    pending_request_count: pendingCounts[cls.class_id] ?? 0,
  }));
}

/**
 * Create a new class for a teacher.
 * Generates a unique class_code (retries up to 5 times) and invitation_token.
 */
export async function createClass({
  teacherId,
  className,
  gradeLevel,
  academicYear,
  description,
  learnerCapacity,
  joinPolicy,
}) {
  // Generate a unique class code
  let classCode = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateClassCode();
    const { data: existing } = await findClassByCode(code);
    if (!existing) {
      classCode = code;
      break;
    }
  }
  if (!classCode) {
    throw new Error("Could not generate a unique class code. Please try again.");
  }

  const { data, error } = await insertClass({
    teacher_id: teacherId,
    class_name: className,
    grade_level: gradeLevel || null,
    academic_year: academicYear || null,
    description: description || null,
    learner_capacity: learnerCapacity || 50,
    join_policy: joinPolicy || ClassJoinPolicy.TEACHER_APPROVAL,
    class_code: classCode,
    invitation_token: generateInvitationToken(),
  });

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Get a single class, asserting the requester is the owner.
 */
export async function getClassDetail(classId, teacherId) {
  const { data, error } = await getClassById(classId);
  if (error || !data) {
    const err = new Error("Class not found.");
    err.status = 404;
    throw err;
  }
  if (data.teacher_id !== teacherId) {
    const err = new Error(MSG.MSG11); // MSG11 — permission error
    err.status = 403;
    throw err;
  }
  return data;
}

/**
 * Teacher Class Detail: the class record enriched with the study sets assigned
 * to it and the exam sessions created for it, so the class screen can show the
 * activities in full detail. Ownership is enforced by getClassDetail().
 */
export async function getTeacherClassDetail(classId, teacherId) {
  const cls = await getClassDetail(classId, teacherId);

  const { data: teacher } = await getUserById(cls.teacher_id);

  const { data: assignments, error: assignError } = await getAssignmentsByClass(classId);
  if (assignError) throw new Error(assignError.message);

  const assigned_study_sets = (assignments ?? [])
    .filter((row) => row.study_set && !row.study_set.deleted_at)
    .map((row) => {
      const set = row.study_set;
      return {
        assignment_id: row.assignment_id,
        study_set_id: set.study_set_id,
        title: set.title,
        description: set.description,
        subject: set.subject,
        visibility: set.visibility,
        question_count: set.question_count,
        is_admin_hidden: set.is_admin_hidden,
        assigned_at: row.created_at,
      };
    });

  const { data: examRows, error: examError } = await getExamsByClass(classId);
  if (examError) throw new Error(examError.message);

  const exams = (examRows ?? []).map((e) => ({
    exam_session_id: e.exam_session_id,
    title: e.title,
    description: e.description,
    status: e.status,
    start_at: e.start_at,
    end_at: e.end_at,
    duration_minutes: e.duration_minutes,
    attempt_limit: e.attempt_limit,
    question_count: e.question_count,
    result_visibility: e.result_visibility,
    created_at: e.created_at,
  }));

  return { ...cls, assigned_study_sets, exams, teacher: teacher ?? null };
}

/**
 * Update class information (UC-31 / §2.3.5). Ownership-gated; only metadata
 * columns are editable. `class_code` / `invitation_token` are intentionally
 * never touched so existing membership and join links keep working.
 */
const VALID_JOIN_POLICIES = new Set(["auto_approve", "teacher_approval"]);
const VALID_CLASS_STATUSES = new Set(["active", "deleted"]);

function invalidInput() {
  const err = new Error("The information is invalid. Please check and try again.");
  err.status = 400;
  return err;
}

export async function updateClass(classId, teacherId, body = {}) {
  // Existence (404) + ownership (403 → MSG11 / BR-18).
  await getClassDetail(classId, teacherId);

  const changes = {};

  if (body.class_name !== undefined) {
    const name = String(body.class_name).trim();
    if (!name) {
      const err = new Error("Please complete all required information.");
      err.status = 400;
      throw err;
    }
    changes.class_name = name;
  }

  if (body.grade_level !== undefined) changes.grade_level = body.grade_level || null;
  if (body.academic_year !== undefined) changes.academic_year = body.academic_year || null;
  if (body.description !== undefined) changes.description = body.description ? String(body.description) : null;

  if (body.learner_capacity !== undefined) {
    const cap = Number(body.learner_capacity);
    if (!Number.isInteger(cap) || cap <= 0) throw invalidInput();
    changes.learner_capacity = cap;
  }

  if (body.join_policy !== undefined) {
    if (!VALID_JOIN_POLICIES.has(body.join_policy)) throw invalidInput();
    changes.join_policy = body.join_policy;
  }

  if (body.status !== undefined) {
    if (!VALID_CLASS_STATUSES.has(body.status)) throw invalidInput();
    changes.status = body.status;
  }

  if (Object.keys(changes).length === 0) {
    const { data } = await getClassById(classId);
    return data;
  }

  const { data, error } = await updateClassById(classId, changes);
  if (error) throw new Error(error.message);

  // If the class was switched to auto-approve, any learners still "pending"
  // would otherwise be stranded (no approval UI for an auto-approve class).
  // Auto-approve them now so nobody is left waiting.
  if (changes.join_policy === ClassJoinPolicy.AUTO_APPROVE) {
    await autoApprovePendingRequests(classId, teacherId, data?.class_name);
  }

  return data;
}

/**
 * Approve every currently-pending join request of a class. Used when a class
 * is switched to auto-approve so pending learners are added instead of being
 * stranded. Each learner is added (or reactivated) and notified. Notifications
 * are best-effort and never block the approvals.
 */
async function autoApprovePendingRequests(classId, reviewerId, className) {
  const { data: pending, error } = await getJoinRequests(classId, JoinRequestStatus.PENDING);
  if (error) throw new Error(error.message);
  if (!pending || pending.length === 0) return;

  const reviewedAt = new Date().toISOString();
  for (const request of pending) {
    const { error: updateError } = await updateJoinRequest(request.join_request_id, {
      status: JoinRequestStatus.APPROVED,
      reviewed_by: reviewerId,
      reviewed_at: reviewedAt,
    });
    if (updateError) throw new Error(updateError.message);

    await addOrReactivateMember(classId, request.learner_id);

    // Best-effort notifications (in-app + email), same as manual approval.
    notifyLearnerOfResolution(classId, request.learner_id, JoinRequestStatus.APPROVED);
    notifyLearnerOfJoinRequestResolution({
      classId,
      className: className || "your class",
      learnerId: request.learner_id,
      status: JoinRequestStatus.APPROVED,
    });
  }
}

/**
 * Permanently delete a class (UC-32). The class is removed from the system
 * along with its related data (members, join requests, study-set assignments,
 * and its exam sessions + attempts). This is irreversible — no soft delete.
 *
 * Children are deleted in FK order to satisfy the NOT-NULL foreign keys that
 * reference the class (there is no ON DELETE CASCADE in the schema):
 *   attempt_answers → exam_attempts → exam_questions → exam_sessions
 *   → study_set_assignments → class_join_requests → class_members → class.
 */
export async function deleteClass(classId, teacherId) {
  // Existence + ownership with SRS messages (Step 5.2 MSG03 / Step 5.1 MSG11).
  const { data: cls, error: findError } = await getClassById(classId);
  if (findError || !cls) {
    const err = new Error(MSG.MSG03); // MSG03 — class not found / invalid
    err.status = 404;
    throw err;
  }
  if (cls.teacher_id !== teacherId) {
    const err = new Error(MSG.MSG11); // MSG11 — unauthorized delete
    err.status = 403;
    throw err;
  }

  const fail = (error) => {
    const err = new Error(error.message || "Failed to delete class.");
    err.status = 500; // MSG13 on the client
    return err;
  };

  // 1. Exam tree tied to this class.
  const { data: sessionIds, error: sessErr } = await getExamSessionIdsByClass(classId);
  if (sessErr) throw fail(sessErr);

  if (sessionIds.length > 0) {
    const { data: attemptIds, error: attErr } = await getExamAttemptIdsBySessions(sessionIds);
    if (attErr) throw fail(attErr);

    const answersRes = await deleteAttemptAnswersByExamAttempts(attemptIds);
    if (answersRes.error) throw fail(answersRes.error);

    const attemptsRes = await deleteExamAttemptsBySessions(sessionIds);
    if (attemptsRes.error) throw fail(attemptsRes.error);

    const questionsRes = await deleteExamQuestionsBySessions(sessionIds);
    if (questionsRes.error) throw fail(questionsRes.error);

    const sessionsRes = await deleteExamSessionsByClass(classId);
    if (sessionsRes.error) throw fail(sessionsRes.error);
  }

  // 2. Class links: assignments, join requests, members.
  const assignRes = await deleteAssignmentsByClass(classId);
  if (assignRes.error) throw fail(assignRes.error);

  const requestsRes = await deleteJoinRequestsByClass(classId);
  if (requestsRes.error) throw fail(requestsRes.error);

  const membersRes = await deleteMembersByClass(classId);
  if (membersRes.error) throw fail(membersRes.error);

  // 3. The class row itself.
  const { data: deleted, error: delError } = await hardDeleteClass(classId);
  if (delError) throw fail(delError);

  return {
    action: "deleted",
    class_id: deleted?.class_id ?? classId,
    permanent: true,
  };
}

/**
 * List active members of a class (ownership-gated).
 */
export async function listMembers(classId, teacherId) {
  await getClassDetail(classId, teacherId);
  const { data, error } = await getClassMembers(classId);
  if (error) throw new Error(error.message);
  return data;
}

/**
 * List pending join requests for a class (ownership-gated).
 */
export async function listJoinRequests(classId, teacherId) {
  await getClassDetail(classId, teacherId);
  const { data, error } = await getJoinRequests(classId, JoinRequestStatus.PENDING);
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Approve or reject a join request.
 * If approved, also inserts a class_members row.
 */
export async function resolveJoinRequest(requestId, status, reviewerId) {
  const { data: request, error: reqError } = await getJoinRequestById(requestId);
  if (reqError || !request) {
    const err = new Error(MSG.MSG03); // MSG03 — join request not found (UC-34 Step 5.1)
    err.status = 404;
    throw err;
  }
  if (request.status !== JoinRequestStatus.PENDING) {
    const err = new Error("Request already resolved.");
    err.status = 409;
    throw err;
  }

  // Ownership check via class
  const cls = await getClassDetail(request.class_id, reviewerId);

  const { data: updated, error: updateError } = await updateJoinRequest(requestId, {
    status,
    reviewed_by: reviewerId,
    reviewed_at: new Date().toISOString(),
  });
  if (updateError) throw new Error(updateError.message);

  if (status === JoinRequestStatus.APPROVED) {
    await addOrReactivateMember(request.class_id, request.learner_id);
  }

  // Notify the learner of the approval/rejection (UC-31). Fire-and-forget:
  // a notification failure must never affect the resolve outcome.
  notifyLearnerOfResolution(request.class_id, request.learner_id, status);
  notifyLearnerOfJoinRequestResolution({
    classId: request.class_id,
    className: cls.class_name,
    learnerId: request.learner_id,
    status,
  });

  return updated;
}

/**
 * Look up the learner + class, then email the learner about the resolution.
 * Non-blocking and fully guarded so notification errors are swallowed.
 */
async function notifyLearnerOfResolution(classId, learnerId, status) {
  try {
    const [{ data: cls }, { data: learner }] = await Promise.all([
      getClassById(classId),
      getUserById(learnerId),
    ]);
    if (!learner?.email) return;
    await notifyJoinRequestResolved({
      learner,
      className: cls?.class_name || "your class",
      status,
    });
  } catch (err) {
    logger.error("Failed to notify learner of join request resolution:", err.message);
  }
}

/**
 * Return all classes a learner has actively joined.
 * member_count only counts learners with status = "active".
 */
export async function listJoinedClasses(learnerId) {
  const { data, error } = await getJoinedClasses(learnerId);
  if (error) throw new Error(error.message);

  const visibleRows = data.filter(
    (row) => row.class && row.class.status === "active" && !row.class.deleted_at
  );
  const classIds = visibleRows.map((row) => row.class.class_id);
  const { data: activeRows, error: countError } = await getActiveMemberCounts(classIds);
  if (countError) throw new Error(countError.message);
  const counts = tallyByClassId(activeRows);

  return visibleRows.map((row) => ({
    ...row.class,
    joined_at: row.joined_at,
    member_count: counts[row.class.class_id] ?? 0,
  }));
}

/**
 * Add a learner to a class, reactivating a previously-removed membership
 * row if one exists instead of inserting a duplicate row.
 */
async function addOrReactivateMember(classId, learnerId) {
  const { data: existing, error: findError } = await findMemberByClassAndLearner(classId, learnerId);
  if (findError) throw new Error(findError.message);

  if (existing) {
    const { data: reactivated, error: reactivateError } = await reactivateClassMember(existing.class_member_id);
    if (reactivateError) throw new Error(reactivateError.message);
    return reactivated;
  }

  const { data: inserted, error: insertError } = await insertClassMember({
    class_id: classId,
    learner_id: learnerId,
    status: ClassMemberStatus.ACTIVE,
    joined_at: new Date().toISOString(),
  });
  if (insertError) throw new Error(insertError.message);
  return inserted;
}

/**
 * Remove a member from a class (ownership-gated).
 * Soft-deletes the class_members row (status -> "removed").
 */
export async function removeMember(classId, memberId, teacherId) {
  // Ownership check — throws 404/403 if not the owning teacher.
  await getClassDetail(classId, teacherId);

  const { data: member, error } = await getClassMemberById(memberId);
  if (error || !member) {
    const err = new Error(MSG.MSG03); // MSG03 — learner not in class (UC-35 Step 7.1)
    err.status = 404;
    throw err;
  }
  if (member.class_id !== classId) {
    const err = new Error(MSG.MSG03); // MSG03 — learner not in this class
    err.status = 404;
    throw err;
  }
  if (member.status === ClassMemberStatus.REMOVED) {
    const err = new Error("Member has already been removed.");
    err.status = 409;
    throw err;
  }

  const { data: updated, error: updateError } = await removeClassMember(memberId);
  if (updateError) throw new Error(updateError.message);
  return updated;
}

/**
 * Learner joins a class via class code or invitation token.
 * - auto_approve  → insert directly into class_members
 * - teacher_approval → insert a pending join request
 */
export async function joinClass(learnerId, { classCode, invitationToken }) {
  // 1. Find the class
  let cls = null;
  if (classCode) {
    const { data, error } = await findClassByCode(classCode.toUpperCase());
    if (error) throw new Error(error.message);
    cls = data;
  } else if (invitationToken) {
    const { data, error } = await findClassByInvitationToken(invitationToken);
    if (error) throw new Error(error.message);
    cls = data;
  } else {
    const err = new Error("class_code or invitation_token is required.");
    err.status = 400;
    throw err;
  }

  // findClassByCode / findClassByInvitationToken only return active, non-deleted
  // classes, so a missing OR closed/inactive class lands here (UC-18 Step 4.1 & 5.1).
  if (!cls) {
    const err = new Error(MSG.MSG24); // MSG24 — invalid / expired / unavailable code or link
    err.status = 404;
    throw err;
  }

  // 1b. The class owner cannot join their own class as a learner. (Guard kept
  // for data integrity; not an SRS-listed flow but never triggers for real learners.)
  if (cls.teacher_id === learnerId) {
    const err = new Error("You already own this class as a teacher, so you cannot join it as a learner.");
    err.status = 409;
    throw err;
  }

  // 2. Already a member? (UC-18 Step 6.1 → MSG20)
  const { data: existingMember } = await findExistingMember(cls.class_id, learnerId);
  if (existingMember) {
    const err = new Error(MSG.MSG20); // MSG20
    err.status = 409;
    throw err;
  }

  // 3. Already has a pending request? (UC-18 Step 6.1 → MSG20)
  const { data: existingRequest } = await findExistingJoinRequest(cls.class_id, learnerId);
  if (existingRequest) {
    const err = new Error(MSG.MSG20); // MSG20
    err.status = 409;
    throw err;
  }

  // 4. Auto approve → straight into class_members (reactivate if previously removed)
  if (cls.join_policy === ClassJoinPolicy.AUTO_APPROVE) {
    const member = await addOrReactivateMember(cls.class_id, learnerId);
    return { joined: true, class: cls, member };
  }

  // 5. Teacher approval → create join request
  const { data, error } = await insertJoinRequest({
    class_id: cls.class_id,
    learner_id: learnerId,
    status: JoinRequestStatus.PENDING,
  });
  if (error) throw new Error(error.message);
  notifyTeacherOfJoinRequest(cls);
  return { joined: false, class: cls, joinRequest: data };
}



/**
 * Derive a learner's progress on one study set from their practice attempts.
 *   status:   not_started | in_progress | completed
 *   accuracy: best submitted accuracy as a 0–100 int (null if never submitted)
 *   attempts: total attempt count
 */
function deriveProgress(attempts) {
  if (!attempts || attempts.length === 0) {
    return { status: "not_started", accuracy: null, attempts: 0 };
  }

  const submitted = attempts.filter(
    (a) => a.status === PracticeAttemptStatus.SUBMITTED && a.max_score > 0
  );

  const accuracy =
    submitted.length > 0
      ? Math.round(Math.max(...submitted.map((a) => (a.total_score / a.max_score) * 100)))
      : null;

  const status =
    submitted.length > 0
      ? "completed"
      : attempts.some((a) => a.status === PracticeAttemptStatus.IN_PROGRESS)
        ? "in_progress"
        : "not_started";

  return { status, accuracy, attempts: attempts.length };
}

/**
 * Learner Class Detail (UC-17 step 6 / §3.3.4): the class header plus the
 * study sets ("assigned activities") visible to this learner, each annotated
 * with the learner's own progress.
 *
 * Access (BR-12 / BR-22): the requester must be an ACTIVE member of the class,
 * otherwise 403 (MSG11). A missing or soft-deleted class → 404. This use case
 * is read-only — no membership data is changed (UC-17 POST-3).
 */
export async function getLearnerClassDetail(classId, learnerId) {
  const { data: cls, error: classError } = await getClassWithTeacher(classId);
  if (classError) throw new Error(classError.message);
  if (!cls) {
    const err = new Error("Class not found.");
    err.status = 404;
    throw err;
  }

  const { data: membership, error: memberError } = await getActiveMembership(classId, learnerId);
  if (memberError) throw new Error(memberError.message);
  if (!membership) {
    const err = new Error("You do not have permission to access this class.");
    err.status = 403;
    throw err;
  }

  // Active member count for the class header (active-only, like the list views).
  const { data: activeRows, error: countError } = await getActiveMemberCounts([classId]);
  if (countError) throw new Error(countError.message);
  const memberCount = tallyByClassId(activeRows)[classId] ?? 0;

  // Assigned study sets, then filter to what the learner may actually open.
  const { data: assignments, error: assignError } = await getAssignmentsByClass(classId);
  if (assignError) throw new Error(assignError.message);

  const visible = (assignments ?? []).filter((row) => {
    const set = row.study_set;
    if (!set) return false;                                         // study set missing
    if (set.deleted_at) return false;                               // soft-deleted (BR-23)
    if (set.is_admin_hidden) return false;                          // admin-hidden (MSG34)
    return true;
  });

  // Pull the learner's attempts once, bucket by study set, then annotate.
  const studySetIds = visible.map((row) => row.study_set.study_set_id);
  const { data: attempts, error: attemptError } = await getLearnerAttemptsForStudySets(
    learnerId,
    studySetIds
  );
  if (attemptError) throw new Error(attemptError.message);

  const attemptsBySet = {};
  for (const a of attempts ?? []) {
    (attemptsBySet[a.study_set_id] ??= []).push(a);
  }

  const assigned_study_sets = visible.map((row) => {
    const set = row.study_set;
    return {
      assignment_id: row.assignment_id,
      study_set_id: set.study_set_id,
      title: set.title,
      description: set.description,
      subject: set.subject,
      question_count: set.question_count,
      progress: deriveProgress(attemptsBySet[set.study_set_id]),
    };
  });

  // Assigned exams (published exam sessions for this class, UC-24).
  const { data: examRows, error: examError } = await getPublishedExamsByClass(classId);
  if (examError) throw new Error(examError.message);

  const exams = (examRows ?? []).map((e) => ({
    exam_session_id: e.exam_session_id,
    title: e.title,
    description: e.description,
    status: e.status,
    start_at: e.start_at,
    end_at: e.end_at,
    duration_minutes: e.duration_minutes,
    attempt_limit: e.attempt_limit,
    question_count: e.question_count,
    result_visibility: e.result_visibility,
  }));

  return {
    class: {
      class_id: cls.class_id,
      class_name: cls.class_name,
      grade_level: cls.grade_level,
      academic_year: cls.academic_year,
      class_code: cls.class_code,
      status: cls.status,
      member_count: memberCount,
      teacher: cls.teacher
        ? {
            full_name: cls.teacher.full_name,
            username: cls.teacher.username,
            avatar_url: cls.teacher.avatar_url,
          }
        : null,
    },
    assigned_study_sets,
    exams,
  };
}

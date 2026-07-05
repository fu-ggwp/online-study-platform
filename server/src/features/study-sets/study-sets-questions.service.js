import * as dao from "./study-sets.dao.js";
import { dbError } from "./study-sets.helpers.js";

export async function createQuestionsAndOptions(studySetId, teacherId, questions) {
  if (!questions || questions.length === 0) return;

  const questionsPayload = questions.map((q) => ({
    study_set_id: studySetId,
    owner_id: teacherId,
    question_text: q.question_text,
    explanation: q.explanation || null,
    chapter: q.chapter || null,
    source_question_id: q.source_question_id || null,
  }));

  const { data: insertedQuestions, error: qError } =
    await dao.creationQuestions(questionsPayload);
  if (qError) {
    throw dbError(qError);
  }

  const optionsPayload = [];
  for (let i = 0; i < insertedQuestions.length; i++) {
    const insertedQ = insertedQuestions[i];
    const originalQ = questions[i];

    if (originalQ.options && originalQ.options.length > 0) {
      originalQ.options.forEach((opt, idx) => {
        optionsPayload.push({
          question_id: insertedQ.question_id,
          option_text: opt.option_text,
          is_correct: !!opt.is_correct,
          display_order: opt.display_order ?? idx + 1,
        });
      });
    }
  }

  if (optionsPayload.length > 0) {
    const { error: optError } = await dao.createOptions(optionsPayload);
    if (optError) {
      throw dbError(optError);
    }
  }

  await dao.updateQuestionCount(
    studySetId,
    insertedQuestions.length,
  );
}

export async function updateSingleQuestion(existingQ, payloadQ) {
  const qPayload = {
    question_text: payloadQ.question_text,
    explanation: payloadQ.explanation || null,
    chapter: payloadQ.chapter || null,
  };

  const { error: upQError } = await dao.updateQuestion(payloadQ.question_id, qPayload);
  if (upQError) throw dbError(upQError);

  const existingOptions = existingQ?.answer_options || [];
  const existingOptionIds = existingOptions.map((o) => o.answer_option_id);
  const payloadOptionIds = (payloadQ.options || []).map((o) => o.answer_option_id).filter(Boolean);

  const optionIdsToDelete = existingOptionIds.filter(
    (oid) => !payloadOptionIds.includes(oid)
  );
  if (optionIdsToDelete.length > 0) {
    const { error: delOptError } = await dao.deleteOptions(optionIdsToDelete);
    if (delOptError) throw dbError(delOptError);
  }

  const optionsToInsert = [];
  for (let idx = 0; idx < (payloadQ.options || []).length; idx++) {
    const opt = payloadQ.options[idx];
    const optPayload = {
      option_text: opt.option_text,
      is_correct: !!opt.is_correct,
      display_order: opt.display_order ?? idx + 1,
    };

    if (opt.answer_option_id) {
      const existingOpt = existingOptions.find((eo) => eo.answer_option_id === opt.answer_option_id);
      const hasChanged = !existingOpt ||
        existingOpt.option_text !== optPayload.option_text ||
        !!existingOpt.is_correct !== !!optPayload.is_correct ||
        existingOpt.display_order !== optPayload.display_order;

      if (hasChanged) {
        const { error: upOptError } = await dao.updateOption(opt.answer_option_id, optPayload);
        if (upOptError) throw dbError(upOptError);
      }
    } else {
      optionsToInsert.push({
        ...optPayload,
        question_id: payloadQ.question_id,
      });
    }
  }
  if (optionsToInsert.length > 0) {
    const { error: insOptError } = await dao.createOptions(optionsToInsert);
    if (insOptError) throw dbError(insOptError);
  }
}

export async function insertNewQuestion(studySetId, teacherId, payloadQ) {
  const qPayload = {
    question_text: payloadQ.question_text,
    explanation: payloadQ.explanation || null,
    chapter: payloadQ.chapter || null,
  };

  const { data: newQ, error: insQError } = await dao.creationQuestions([
    {
      study_set_id: studySetId,
      owner_id: teacherId,
      ...qPayload,
    },
  ]);
  if (insQError) throw dbError(insQError);

  const insertedQuestionId = newQ[0].question_id;
  if (payloadQ.options && payloadQ.options.length > 0) {
    const optionsPayload = payloadQ.options.map((opt, idx) => ({
      question_id: insertedQuestionId,
      option_text: opt.option_text,
      is_correct: !!opt.is_correct,
      display_order: opt.display_order ?? idx + 1,
    }));
    const { error: insOptError } = await dao.createOptions(optionsPayload);
    if (insOptError) throw dbError(insOptError);
  }
}

export async function syncQuestions(id, teacherId, existingQuestions, payloadQuestions) {
  const existingQuestionIds = existingQuestions.map((q) => q.question_id);
  const payloadQuestionIds = payloadQuestions.map((q) => q.question_id).filter(Boolean);

  const questionIdsToDelete = existingQuestionIds.filter(
    (qid) => !payloadQuestionIds.includes(qid)
  );
  if (questionIdsToDelete.length > 0) {
    const { error: delQError } = await dao.deleteQuestions(questionIdsToDelete);
    if (delQError) throw dbError(delQError);
  }

  for (let i = 0; i < payloadQuestions.length; i++) {
    const q = payloadQuestions[i];
    if (q.question_id) {
      const existingQ = existingQuestions.find((eq) => eq.question_id === q.question_id);
      await updateSingleQuestion(existingQ, q);
    } else {
      await insertNewQuestion(id, teacherId, q);
    }
  }

  const activeQuestions = payloadQuestions.length;
  await dao.updateQuestionCount(id, activeQuestions);
}

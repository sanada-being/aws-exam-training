// 配信用データへの変換（純粋関数）。build-data.mjs とテストから使う。

/** 翻訳済み正本の問題を配信用の軽い形にする（Discussion除外・未翻訳は除く・問題番号順）。 */
export function toSlim(all) {
  return all
    .filter((q) => q.question?.ja && (q.options || []).every((o) => o.text?.ja))
    .map((q) => ({
      id: q.id,
      questionNumber: q.questionNumber,
      topic: q.topic,
      isMultipleAnswer: q.isMultipleAnswer,
      question: { en: q.question.en, ja: q.question.ja },
      options: q.options.map((o) => ({ key: o.key, en: o.text.en, ja: o.text.ja })),
      adoptedAnswer: q.adoptedAnswer,
      communityVote: q.communityVote,
      answerConfidence: q.answerConfidence,
      needsReview: q.needsReview,
      explanation: q.explanation?.ja ?? null,
      // 出典元(ExamTopics)の不備に関する注記。無い問題では省略する。
      ...(q.sourceNote ? { sourceNote: q.sourceNote } : {}),
      ...(q.auditWaivers ? { auditWaivers: q.auditWaivers } : {}),
    }))
    .sort((a, b) => a.questionNumber - b.questionNumber);
}

/** 問題id（例: saa-c03-0001）から試験id（saa-c03）を取り出す。 */
export function examIdOf(questionId) {
  return questionId.replace(/-\d+$/, "");
}

/** 試験ごとの配信データから、試験一覧（問題数・問題id）を作る。 */
export function buildIndex(byExam) {
  return Object.keys(byExam)
    .sort()
    .map((id) => ({ id, count: byExam[id].length, ids: byExam[id].map((q) => q.id) }));
}

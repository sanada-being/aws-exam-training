import type { Question } from "../types";
import { gradeAnswer } from "../domain/grading";

const CONF_LABEL: Record<string, string> = {
  high: "高（投票が明確）",
  medium: "中",
  low: "低（投票が割れ気味・要確認）",
};

/** 採点後の解説: コミュニティ投票分布と確信度を表示（採用正解=投票最多）。 */
export function Explanation({ question }: { question: Question }) {
  const total = question.communityVote.reduce((s, v) => s + v.count, 0);
  return (
    <div className="explanation">
      <h3>コミュニティ投票分布</h3>
      {question.communityVote.length === 0 ? (
        <p className="muted">投票データなし</p>
      ) : (
        question.communityVote.map((v) => {
          const isAdopted = gradeAnswer(v.answer.split(""), question.adoptedAnswer);
          const pct = v.percent ?? (total ? Math.round((v.count / total) * 100) : 0);
          return (
            <div className="votebar" key={v.answer}>
              <span className="votekey">
                {v.answer}
                {isAdopted ? " ✓" : ""}
              </span>
              <span className="votetrack">
                <span
                  className={isAdopted ? "votefill adopted" : "votefill"}
                  style={{ width: `${pct}%` }}
                />
              </span>
              <span className="votenum">
                {pct}% <span className="muted">({v.count})</span>
              </span>
            </div>
          );
        })
      )}
      <p className="muted conf">
        確信度: {CONF_LABEL[question.answerConfidence] ?? question.answerConfidence}・総投票 {total}
      </p>
    </div>
  );
}

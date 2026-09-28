import { summarizeExams, type ExamEntry, type ExamIndexItem } from "../domain/exams";
import { useStore } from "../store/useStore";
import { SyncIndicator } from "../components/SyncIndicator";

function ExamCard({
  entry,
  current,
  onSelect,
}: {
  entry: ExamEntry;
  current: boolean;
  onSelect: (id: string) => void;
}) {
  const { info, total, answered, accuracy } = entry;
  const learning = answered > 0;
  return (
    <button
      type="button"
      className={learning ? "examcard learning" : "examcard"}
      aria-current={current ? "true" : undefined}
      onClick={() => onSelect(info.id)}
    >
      <span className="examcard-main">
        <span className="examcode">
          {info.code}
          {current && <span className="examtag">選択中</span>}
        </span>
        <span className="examname">{info.name}</span>
        <span className="exammeta">
          {learning
            ? `解答 ${answered} / ${total}問`
            : `収録 ${total}問 · 本番 ${info.examCount}問/${info.minutes}分`}
        </span>
      </span>
      {learning ? (
        <span className="examside">
          <strong>{accuracy}%</strong>
          <small>正答率</small>
        </span>
      ) : (
        <span className="examside chev" aria-hidden>
          ›
        </span>
      )}
      {learning && (
        <span className="exambar" aria-hidden>
          <span style={{ width: `${(answered / total) * 100}%` }} />
        </span>
      )}
    </button>
  );
}

function Group({
  title,
  items,
  currentExam,
  onSelect,
}: {
  title: string;
  items: ExamEntry[];
  currentExam: string | null;
  onSelect: (id: string) => void;
}) {
  const hid = `examgroup-${title}`;
  return (
    <section className="examgroup" aria-labelledby={hid}>
      <h2 id={hid}>{title}</h2>
      <div className="examlist">
        {items.map((e) => (
          <ExamCard
            key={e.info.id}
            entry={e}
            current={e.info.id === currentExam}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}

/** 試験一覧。解いた試験を「学習中」として上に、残りをレベル別に並べる。 */
export function ExamPicker({
  index,
  currentExam,
  onSelect,
  onBack,
  onOpenSettings,
}: {
  index: ExamIndexItem[];
  currentExam: string | null;
  onSelect: (id: string) => void;
  /** 戻る先（選んでいる試験のホーム）があるときだけ渡す。 */
  onBack?: () => void;
  onOpenSettings?: () => void;
}) {
  const records = useStore((s) => s.records);
  const { learning, levels } = summarizeExams(index, records);

  return (
    <div className="picker">
      <div className="topbar">
        {onBack ? (
          <button type="button" className="btn ghost small" onClick={onBack}>
            <span aria-hidden>‹</span>戻る
          </button>
        ) : (
          <span />
        )}
        <div className="topbar-right">
          <SyncIndicator />
          {onOpenSettings && (
            <button
              type="button"
              className="btn ghost small"
              onClick={onOpenSettings}
              aria-label="設定・同期"
            >
              ⚙ 同期
            </button>
          )}
        </div>
      </div>
      <h1>AWS 認定 問題集</h1>
      <p className="muted picker-lead">
        {currentExam ? "試験を選んでください" : "解く試験を選んでください"}
      </p>

      {learning.length > 0 && (
        <Group title="学習中" items={learning} currentExam={currentExam} onSelect={onSelect} />
      )}
      {levels.map((l) => (
        <Group
          key={l.level}
          title={l.label}
          items={l.items}
          currentExam={currentExam}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import type { Question } from "./types";
import { loadExamIndex, loadQuestions } from "./data/loader";
import { buildQueue, type QuizMode } from "./domain/selection";
import { applyFilters, emptyFilter, type Filter } from "./domain/filter";
import { findExam, type ExamIndexItem } from "./domain/exams";
import { ExamPicker } from "./screens/ExamPicker";
import { Home } from "./screens/Home";
import { Quiz } from "./screens/Quiz";
import { Settings } from "./screens/Settings";
import { useStore } from "./store/useStore";
import { resolveResume } from "./domain/session";
import { useAutoSync } from "./hooks/useAutoSync";

interface ActiveQueue {
  items: Question[];
  index: number;
}

/** 読み込んだ問題（どの試験のものか）。試験を切り替えた直後の取り違えを防ぐ。 */
interface Loaded {
  examId: string;
  questions: Question[];
}

export default function App() {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState<{ examId: string; message: string } | null>(null);
  const [index, setIndex] = useState<ExamIndexItem[] | null>(null);
  const [indexError, setIndexError] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [queue, setQueue] = useState<ActiveQueue | null>(null);
  const [filter, setFilter] = useState<Filter>(emptyFilter);
  const [showSettings, setShowSettings] = useState(false);
  const [count, setCount] = useState<number | null>(null);

  useAutoSync();

  const records = useStore((s) => s.records);
  const bookmarks = useStore((s) => s.bookmarks);
  const session = useStore((s) => s.session);
  const startSession = useStore((s) => s.startSession);
  const currentExam = useStore((s) => s.currentExam);
  const selectExam = useStore((s) => s.selectExam);

  // 一覧に無い試験（載せるのをやめた試験など）を選んでいた場合も一覧から選び直してもらう
  const exam = currentExam ? findExam(currentExam) : undefined;
  const pickerOpen = !exam || showPicker;
  const questions = exam && loaded?.examId === exam.id ? loaded.questions : null;
  const error = exam && loadError?.examId === exam.id ? loadError.message : null;

  const byId = useMemo(() => new Map((questions ?? []).map((q) => [q.id, q])), [questions]);
  // 中断していたセッションを現在の問題集に突き合わせて解決する（問題idベース）
  const resumable = resolveResume(session, byId);

  // 試験一覧は開いたときだけ読み込む（2回目以降はホームから始まるため）
  useEffect(() => {
    if (!pickerOpen || index) return;
    loadExamIndex()
      .then(setIndex)
      .catch((e) => setIndexError(String(e)));
  }, [pickerOpen, index]);

  useEffect(() => {
    if (!exam || pickerOpen || loaded?.examId === exam.id) return;
    let cancelled = false;
    loadQuestions(exam.id)
      .then((qs) => !cancelled && setLoaded({ examId: exam.id, questions: qs }))
      .catch((e) => !cancelled && setLoadError({ examId: exam.id, message: String(e) }));
    return () => {
      cancelled = true;
    };
  }, [exam, pickerOpen, loaded]);

  const openSettings = () => setShowSettings(true);

  if (showSettings) return <Settings onBack={() => setShowSettings(false)} />;

  if (pickerOpen) {
    if (indexError) return <div className="center">試験一覧を読み込めませんでした: {indexError}</div>;
    if (!index) return <div className="center">読み込み中…</div>;
    return (
      <ExamPicker
        index={index}
        currentExam={exam ? exam.id : null}
        onSelect={(id) => {
          if (id !== currentExam) {
            // 絞り込み・出題数は試験ごとに初期状態から
            setFilter(emptyFilter);
            setCount(null);
            setQueue(null);
          }
          selectExam(id);
          setShowPicker(false);
        }}
        onBack={exam ? () => setShowPicker(false) : undefined}
        onOpenSettings={openSettings}
      />
    );
  }

  if (error) {
    return (
      <div className="center column">
        <p>問題を読み込めませんでした（{error}）</p>
        <button type="button" className="btn" onClick={() => setShowPicker(true)}>
          試験一覧へ
        </button>
      </div>
    );
  }
  if (!questions) return <div className="center">読み込み中…</div>;

  if (queue) {
    return (
      <Quiz
        queue={queue.items}
        initialIndex={queue.index}
        onExit={() => setQueue(null)}
      />
    );
  }

  const start = (mode: QuizMode) => {
    const pool = applyFilters(questions, filter, bookmarks, records);
    const items = buildQueue(pool, mode, records, Math.random, count ?? undefined, exam.examCount);
    if (items.length === 0) return;
    startSession(items.map((q) => q.id));
    setQueue({ items, index: 0 });
  };

  return (
    <Home
      exam={exam}
      onSwitchExam={() => setShowPicker(true)}
      questions={questions}
      onStart={start}
      // resumable が null のとき（旧形式のセッション・問題が全て消えた場合）は再開不可
      onResume={resumable ? () => setQueue(resumable) : undefined}
      resumeInfo={resumable ? { index: resumable.index, total: resumable.items.length } : undefined}
      filter={filter}
      onFilterChange={setFilter}
      onOpenSettings={openSettings}
      count={count}
      onCountChange={setCount}
    />
  );
}

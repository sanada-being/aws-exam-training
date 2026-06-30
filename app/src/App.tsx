import { useEffect, useState } from "react";
import type { Question } from "./types";
import { loadQuestions } from "./data/loader";
import { buildQueue, type QuizMode } from "./domain/selection";
import { Home } from "./screens/Home";
import { Quiz } from "./screens/Quiz";
import { useStore } from "./store/useStore";

export default function App() {
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [queue, setQueue] = useState<Question[] | null>(null);
  const records = useStore((s) => s.records);

  useEffect(() => {
    loadQuestions()
      .then(setQuestions)
      .catch((e) => setError(String(e)));
  }, []);

  if (error) return <div className="center">読み込みエラー: {error}</div>;
  if (!questions) return <div className="center">読み込み中…</div>;
  if (queue) return <Quiz queue={queue} onExit={() => setQueue(null)} />;

  return (
    <Home
      questions={questions}
      onStart={(mode: QuizMode) => setQueue(buildQueue(questions, mode, records))}
    />
  );
}

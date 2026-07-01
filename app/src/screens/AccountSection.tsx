import { useState } from "react";
import { isSupabaseConfigured, signInWithEmail, signOut } from "../data/supabase";
import { useAuth } from "../store/useAuth";
import { syncStatusLabel } from "../domain/syncFormat";

/** アカウント（Supabase）ログインによる進捗同期のUI。未設定なら案内のみ。 */
export function AccountSection() {
  const email = useAuth((s) => s.email);
  const status = useAuth((s) => s.status);
  const [input, setInput] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  if (!isSupabaseConfigured()) {
    return (
      <section className="account">
        <h2>アカウントでログイン（実験的）</h2>
        <p className="muted small">
          未設定です。ビルド時に <code>VITE_SUPABASE_URL</code> と{" "}
          <code>VITE_SUPABASE_ANON_KEY</code> を設定すると、メールでログインして進捗をクラウド管理できます。
        </p>
      </section>
    );
  }

  return (
    <section className="account">
      <h2>アカウントでログイン（実験的）</h2>
      {email ? (
        <div>
          <p className="muted small">
            ログイン中: <strong>{email}</strong>・{syncStatusLabel(status, true)}
          </p>
          <button type="button" className="btn ghost small" onClick={() => signOut()}>
            ログアウト
          </button>
        </div>
      ) : (
        <div>
          <label className="field">
            <span>メールアドレス</span>
            <input
              type="email"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="you@example.com"
            />
          </label>
          <button
            type="button"
            className="btn"
            disabled={!input}
            onClick={async () => {
              try {
                await signInWithEmail(input);
                setMsg("ログインリンクをメールに送信しました。メールのリンクを開いてください。");
              } catch (e) {
                setMsg(`失敗: ${e}`);
              }
            }}
          >
            ログインリンクを送信
          </button>
          {msg && (
            <p className="syncmsg" role="status">
              {msg}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

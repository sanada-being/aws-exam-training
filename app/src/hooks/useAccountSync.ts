import { useEffect } from "react";
import { supabase, isSupabaseConfigured, loadAccountProgress, saveAccountProgress } from "../data/supabase";
import { useAuth } from "../store/useAuth";
import { useStore } from "../store/useStore";
import { buildPayload } from "../data/gist";

const PUSH_DEBOUNCE_MS = 3000;

/** Supabaseアカウントでのログイン監視＋進捗同期（設定時のみ有効）。 */
export function useAccountSync() {
  // セッション監視
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      useAuth.getState().setUser(u?.id ?? null, u?.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user;
      useAuth.getState().setUser(u?.id ?? null, u?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = useAuth((s) => s.userId);

  // ログイン時: 取得→マージ
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    useAuth.getState().setStatus("syncing");
    loadAccountProgress(userId)
      .then((remote) => {
        if (cancelled) return;
        if (remote) useStore.getState().mergeRemote(remote);
        useAuth.getState().setStatus("ok");
      })
      .catch((e) => !cancelled && useAuth.getState().setStatus("error", String(e?.message ?? e)));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // 変更時: デバウンス保存
  useEffect(() => {
    if (!userId) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsub = useStore.subscribe((s) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        useAuth.getState().setStatus("syncing");
        saveAccountProgress(userId, buildPayload({ records: s.records, bookmarks: s.bookmarks }, Date.now()))
          .then(() => useAuth.getState().setStatus("ok"))
          .catch((e) => useAuth.getState().setStatus("error", String(e?.message ?? e)));
      }, PUSH_DEBOUNCE_MS);
    });
    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, [userId]);
}

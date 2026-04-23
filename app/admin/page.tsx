"use client";

import { useEffect, useState } from "react";

type Subscriber = {
  token: string;
  userAgent: string;
  createdAt: string;
};

export default function AdminPage() {
  const [title, setTitle] = useState("Web Push Demo");
  const [body, setBody] = useState("ブラウザを閉じていても届きます");
  const [url, setUrl] = useState("/");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);

  async function loadSubscribers() {
    const res = await fetch("/api/subscribe");
    if (res.ok) {
      const data = await res.json();
      setSubscribers(data.subscribers ?? []);
    }
  }

  useEffect(() => {
    loadSubscribers();
  }, []);

  async function send() {
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setResult(
        `送信完了: 成功 ${data.successCount} / 失敗 ${data.failureCount}`
      );
    } catch (e) {
      setResult(`エラー: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSending(false);
    }
  }

  return (
    <main>
      <nav>
        <a href="/">購読</a>
        <a href="/admin">送信 (Admin)</a>
      </nav>

      <h1>通知を送信</h1>
      <p className="muted">
        登録済みの全トークンに対してマルチキャストで送信します (デモのため認証なし)。
      </p>

      <section className="card">
        <h2>
          登録済みデバイス <span className="badge">{subscribers.length}</span>
        </h2>
        <div className="row">
          <button className="secondary" onClick={loadSubscribers}>
            再読み込み
          </button>
        </div>
        {subscribers.length === 0 && (
          <p className="muted" style={{ marginTop: 12 }}>
            まだ購読者がいません。トップページで通知を購読してください。
          </p>
        )}
        {subscribers.map((s) => (
          <div
            key={s.token}
            style={{
              marginTop: 12,
              paddingTop: 12,
              borderTop: "1px solid #1f1f29",
            }}
          >
            <div className="muted" style={{ fontSize: "0.8rem" }}>
              {new Date(s.createdAt).toLocaleString()} · {s.userAgent}
            </div>
            <div className="token" style={{ marginTop: 4 }}>
              {s.token.slice(0, 32)}…
            </div>
          </div>
        ))}
      </section>

      <section className="card">
        <h2>通知内容</h2>

        <label htmlFor="title">タイトル</label>
        <input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <label htmlFor="body">本文</label>
        <textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />

        <label htmlFor="url">クリック時の遷移先 (サイト内パス)</label>
        <input id="url" value={url} onChange={(e) => setUrl(e.target.value)} />

        <div className="row">
          <button
            onClick={send}
            disabled={sending || subscribers.length === 0}
          >
            {sending ? "送信中…" : "全デバイスに送信"}
          </button>
        </div>

        {result && (
          <p style={{ marginTop: 12, color: "#c7c7d1" }}>{result}</p>
        )}
      </section>
    </main>
  );
}

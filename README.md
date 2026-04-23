# Web Push Demo (Next.js App Router + Firebase)

Next.js の App Router と Firebase Cloud Messaging (FCM) で Web Push 通知を
送受信するデモ。**ブラウザがフォアグラウンドでなくても**、また Firestore に
トークンを保存しているため **購読した後にブラウザを一度閉じても**、サーバーから
あとで送信した通知を受け取れる。

バックエンドは Next.js の Route Handlers で完結し、NestJS は使用していない。

## スタック

- Next.js 15 (App Router, TypeScript)
- Firebase Web SDK (FCM クライアント)
- Firebase Admin SDK (送信・トークン保存)
- Firestore (FCM トークンの永続化)

## ディレクトリ

```
app/
  layout.tsx                 # 共通レイアウト (PWA manifest, viewport)
  page.tsx                   # 購読ページ (通知許可 + トークン取得)
  admin/page.tsx             # 送信ページ (全購読者に送信)
  api/
    subscribe/route.ts       # POST: トークン登録 / GET: 一覧
    send/route.ts            # POST: 通知送信 (Admin SDK)
lib/firebase/
  client.ts                  # Web SDK 初期化と Messaging ユーティリティ
  admin.ts                   # Admin SDK 初期化
public/
  firebase-messaging-sw.js   # バックグラウンド通知用 Service Worker
  manifest.json              # PWA manifest
```

## セットアップ

### 1. Firebase プロジェクトを用意する

1. [Firebase Console](https://console.firebase.google.com/) でプロジェクトを作成
2. **ウェブアプリを登録** (⚙ → プロジェクトの設定 → マイアプリ → `</>`)
   - 表示される `firebaseConfig` の値を `.env.local` に転記する
3. **Cloud Messaging** を有効化
   - プロジェクトの設定 → Cloud Messaging タブ → **Web プッシュ証明書** で
     「鍵ペアを生成」し、その文字列を `NEXT_PUBLIC_FIREBASE_VAPID_KEY` に設定
4. **Firestore** を有効化 (Native モードで作成)
5. **サービスアカウント** の秘密鍵を発行
   - プロジェクトの設定 → サービスアカウント → 「新しい秘密鍵の生成」
   - ダウンロードされた JSON から `project_id`, `client_email`, `private_key` を取得

### 2. 環境変数を設定

```bash
cp .env.local.example .env.local
```

`.env.local` を編集して Firebase の値を埋める。`FIREBASE_PRIVATE_KEY` は
改行を含むので **ダブルクォートで囲む**。例:

```env
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----\n"
```

### 3. 依存関係のインストール

```bash
npm install
```

### 4. 開発サーバー起動

```bash
npm run dev
```

- <http://localhost:3000> … 購読ページ
- <http://localhost:3000/admin> … 通知送信ページ

### 5. (任意) アイコン画像を配置

`public/icon-192.png` と `public/icon-512.png` を置くと PWA アイコンと
通知アイコンに使用される。未配置でも動作には支障なし。

## 動作確認手順

1. `/` を開き「通知を購読する」ボタンを押下 → 通知を許可
2. トークンが発行され Firestore の `fcm_tokens` コレクションに保存される
3. **ブラウザを閉じるか、タブを別のものに切り替える**
4. 別デバイス or 同デバイスの別ブラウザで `/admin` を開く
5. タイトル・本文を入力して「全デバイスに送信」
6. OS の通知センターに通知が表示される

### フォアグラウンド vs バックグラウンド

| 状態 | 表示経路 |
|---|---|
| タブがアクティブ | `lib/firebase/client.ts` の `onMessage` でキャッチしページ内ログに表示 |
| タブ非アクティブ / 別タブ / ウィンドウ最小化 | FCM + `firebase-messaging-sw.js` が自動で OS 通知を表示 |
| ブラウザ完全終了 | **デスクトップ**: Chrome/Edge の「バックグラウンド実行」設定が有効な場合のみ。**モバイル (Android)**: PWA としてホーム画面に追加すれば OS が受信する。**iOS**: 16.4+ かつ PWA 追加必須 |

## 「ブラウザを閉じても通知が届く」仕組み

- FCM は Google の push サービスを経由してデバイスに直接届く
- デバイス側で通知を表示するのは `firebase-messaging-sw.js` (Service Worker)
- Service Worker はブラウザのプロセスが生きている限り、タブが閉じていても動く
- Firestore にトークンを保存しているため、購読時点と送信時点が時間的に離れていても問題ない

モバイル (Android) では PWA としてインストールすると OS レベルの Push と同等に
扱われ、ブラウザを完全に終了していても通知が届く。

## トラブルシューティング

**「通知が許可されなかったか、FCM が未対応のブラウザです」と出る**
- Chrome / Edge / Firefox の最新版で確認
- `localhost` または HTTPS でアクセスしている必要がある (FCM の要件)
- ブラウザ設定で通知がブロックされていないか確認

**送信 API が 500 を返す**
- `FIREBASE_PRIVATE_KEY` の改行処理が崩れていることが多い
- `.env.local` でダブルクォートで囲み、`\n` がそのままの文字列として入っているか確認
- サーバーコンソールのエラーメッセージを確認

**Firestore で permission denied**
- Firestore セキュリティルールをデモ用に緩める (Admin SDK はルールを bypass するため
  通常は影響なし)

**Service Worker が登録されない**
- DevTools → Application → Service Workers で状態を確認
- `/firebase-messaging-sw.js` に直接アクセスしてレスポンスが返るか確認
- キャッシュが原因なら DevTools で「Unregister」→ リロード

## 本番に向けて

このリポジトリはデモ用で、以下が不足している:
- `/api/send` が**無認証** (誰でも全ユーザーに送信できる)。本番では管理者認証を追加
- ユーザーとトークンの紐付けがない。`uid` フィールドを追加して特定ユーザーにだけ送る設計に
- Firestore セキュリティルール (Admin SDK 経由のみ書き込み許可にするのが安全)
- エラー時のリトライ / レートリミット

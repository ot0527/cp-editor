# CPEditor (Phase 4)

`CPEditor-design-document.md` の Phase 4 までを反映した実装です。

## 実装済み

- Electron + React + TypeScript + electron-vite の雛形
- メイン画面レイアウト（タイトルバー / サイドバー / 問題文 / Monacoエディタ / ボトムパネル / ステータスバー）
- Monaco Editor の C++ モード組み込み
- 問題選択時のC++テンプレート自動挿入（問題IDコメント付き）
- AtCoder Problems API 連携（問題一覧 + difficulty）
- サイドバーのカテゴリ/難易度ツリー表示 + インクリメンタル検索
- AtCoder問題ページのスクレイピング表示（問題文セクション + サンプルケース）
- g++ を使ったコンパイル・実行（タイムアウト制御つき）
- サンプルケース一括実行（AC/WA/TLE/RE表示）
- カスタム入出力実行パネル
- WA時の簡易diff表示
- タイマー機能（Start/Pause/Reset、問題ごとの経過時間記録、ショートカット対応）
- 計算量チェッカー（変数入力・プリセット・間に合う判定）
- 提出履歴ビュー（AtCoderユーザー名指定 + 期間指定取得）
- メインプロセスIPC経由の外部リンクオープン（AtCoderのみ許可）

## セットアップ

```bash
npm install
npm run dev
```

## 開発用コマンド

```bash
npm run dev
npm run build
npm run preview
npm run typecheck
```

## 注意事項

- 初回読み込み時は AtCoder Problems API から問題一覧を取得します（ネットワーク接続が必要）。
- 問題文は問題選択時に AtCoder から取得し、ローカルキャッシュを再利用します。
- 実行には `g++` がPATH上に存在する必要があります。

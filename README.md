# CPEditor (Phase 2)

`CPEditor-design-document.md` の Phase 2 までを反映した実装です。

## 実装済み

- Electron + React + TypeScript + electron-vite の雛形
- メイン画面レイアウト（タイトルバー / サイドバー / 問題文 / Monacoエディタ / ボトムパネル / ステータスバー）
- Monaco Editor の C++ モード組み込み
- 問題選択時のC++テンプレート自動挿入（問題IDコメント付き）
- AtCoder Problems API 連携（問題一覧 + difficulty）
- サイドバーのカテゴリ/難易度ツリー表示 + インクリメンタル検索
- AtCoder問題ページのスクレイピング表示（問題文セクション + サンプルケース）
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
- コンパイル・実行機能は Phase 3 で実装予定です。

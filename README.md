# CPEditor (Phase 1)

`CPEditor-design-document.md` の Phase 1 を反映した初期実装です。

## 実装済み

- Electron + React + TypeScript + electron-vite の雛形
- メイン画面レイアウト（タイトルバー / サイドバー / 問題文 / Monacoエディタ / ボトムパネル / ステータスバー）
- Monaco Editor の C++ モード組み込み
- C++ テンプレート (`src/data/defaultTemplate.cpp`) を初期表示

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

## 現時点のスコープ

Phase 1 のため、API連携・コンパイル実行・問題スクレイピングなどは未実装です。

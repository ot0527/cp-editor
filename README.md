# CPEditor (Phase 6)

`CPEditor-design-document.md` の Phase 6 までを反映した実装です。

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
- 設定画面（エディタ表示設定、テンプレート編集、クイックスニペット編集）
- ショートカットカスタマイズ（サンプル実行・スニペット挿入・タイマー操作）
- Vimモード切り替え（`monaco-vim` 利用時）
- APIキャッシュ最適化（メモリキャッシュ・同時リクエスト重複排除・ネットワーク失敗時フォールバック）
- AtCoder API呼び出しのレート制御改善（競合時も1秒間隔を維持）
- メインウィンドウのセキュリティ強化（`sandbox`有効化、外部ナビゲーション抑止）
- ユニットテスト整備（Vitest）
- 配布ビルドコマンド追加（electron-builder）

## セットアップ

```bash
npm install
npm run dev
```

## 開発用コマンド

```bash
npm run dev
npm run build
npm run dist
npm run dist:dir
npm run preview
npm run test
npm run test:run
npm run typecheck
```

## 注意事項

- 初回読み込み時は AtCoder Problems API から問題一覧を取得します（ネットワーク接続が必要）。
- 問題文は問題選択時に AtCoder から取得し、ローカルキャッシュを再利用します。
- 実行には `g++` がPATH上に存在する必要があります。
- Vimモードを有効にする場合は `monaco-vim` を依存に追加してください。

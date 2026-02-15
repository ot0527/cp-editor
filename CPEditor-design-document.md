# CPEditor 設計書

> **プロジェクト名**: CPEditor
> **種別**: デスクトップアプリケーション（Electron）
> **対象ユーザー**: 競技プログラミング学習者（AtCoder中心）
> **対応言語**: C++（メイン）
> **バージョン**: v0.1.0（初期リリース）
> **最終更新**: 2025-02-15

---

## 1. プロジェクト概要

CPEditorは、競技プログラミング（主にAtCoder）に特化したデスクトップコードエディタである。
Monaco Editor（VSCodeのエディタコンポーネント）をベースに、問題閲覧・コード編集・テスト実行・結果判定を**1つのウィンドウに統合**し、競プロの学習効率を最大化することを目的とする。

---

## 2. 技術スタック

| 項目 | 技術 |
|---|---|
| フレームワーク | Electron（最新安定版） |
| 言語 | TypeScript |
| コードエディタ | Monaco Editor（`monaco-editor`パッケージ） |
| UI フレームワーク | React + Tailwind CSS |
| ビルドツール | Vite（electron-vite） |
| パッケージマネージャ | npm |
| 状態管理 | Zustand |
| テスト | Vitest + Playwright（E2E） |
| 配布 | electron-builder |

---

## 3. 使用する外部API

### 3.1 AtCoder Problems API（kenkoooo）

> **注意**: 非公式API。リクエスト間隔は最低1秒。ETagによるキャッシュ必須。

| エンドポイント | 用途 | レスポンス概要 |
|---|---|---|
| `/resources/problems.json` | 全問題一覧 | `{id, contest_id, problem_index, name, title}[]` |
| `/resources/contests.json` | 全コンテスト一覧 | `{id, start_epoch_second, duration_second, title, rate_change}[]` |
| `/resources/merged-problems.json` | 問題詳細（配点・正解者数等） | `{id, point, solver_count, ...}[]` |
| `/resources/problem-models.json` | 推定難易度 | `{[problem_id]: {difficulty, ...}}` |
| `/resources/contest-problem.json` | コンテスト⇔問題マッピング | `{contest_id, problem_id}[]` |
| `/atcoder-api/v3/user/submissions` | ユーザー提出履歴 | `?user={id}&from_second={unix}` → 500件ずつ |

ベースURL: `https://kenkoooo.com/atcoder`

### 3.2 AtCoder本体（スクレイピング）

- 問題ページ: `https://atcoder.jp/contests/{contest_id}/tasks/{problem_id}`
- サンプルケース抽出: `<h3>入力例</h3>` + `<pre>` タグのパース
- 取得データはローカルにキャッシュし、同一問題への再リクエストを回避

---

## 4. 画面レイアウト設計

### 4.1 メインウィンドウ構成

```
┌─────────────────────────────────────────────────────────────┐
│  メニューバー / タイトルバー                    ⏱ 00:05:23  │
├────────────────┬────────────────────────────────────────────┤
│                │                                            │
│   サイドバー    │          メインエリア（水平2分割）          │
│                │                                            │
│  ┌───────────┐ │  ┌──────────────────┬───────────────────┐  │
│  │ 問題一覧   │ │  │                  │                   │  │
│  │           │ │  │   問題文パネル     │   コードエディタ   │  │
│  │ カテゴリ別 │ │  │   (左半分)       │   (右半分)        │  │
│  │  ├ 全探索  │ │  │                  │                   │  │
│  │  ├ DP     │ │  │  [HTML表示]      │  [Monaco Editor]  │  │
│  │  ├ グラフ  │ │  │                  │                   │  │
│  │  ├ ...    │ │  │                  │                   │  │
│  │           │ │  │                  │                   │  │
│  └───────────┘ │  └──────────────────┴───────────────────┘  │
│                │                                            │
│                ├────────────────────────────────────────────┤
│                │          ボトムパネル（タブ切替）           │
│                │                                            │
│                │  [テスト結果] [入出力] [計算量] [提出履歴]  │
│                │                                            │
│                │  ✅ Case 1: AC  (12ms)                     │
│                │  ❌ Case 2: WA  Expected: 5  Got: 3        │
│                │  ✅ Case 3: AC  (8ms)                      │
│                │                                            │
└────────────────┴────────────────────────────────────────────┘
│  ステータスバー  │ C++17 │ UTF-8 │ ⚡ O(N log N) ✅ │ Timer │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 パネル詳細

| パネル | 内容 |
|---|---|
| **サイドバー** | 分野別カテゴリツリー。展開すると難易度帯→問題リスト。検索・フィルタ機能付き |
| **問題文パネル**（左） | 選択した問題のHTMLを表示。AtCoderの問題ページからパースした内容をレンダリング |
| **コードエディタ**（右） | Monaco Editor。C++シンタックスハイライト、補完、括弧マッチ等 |
| **ボトムパネル** | タブで切り替え。テスト結果 / カスタム入出力 / 計算量チェッカー / 提出履歴 |
| **ステータスバー** | 言語、エンコーディング、計算量簡易表示、タイマー |

### 4.3 レスポンシブ挙動

- 各パネルの境界はドラッグでリサイズ可能（`react-resizable-panels` 等で実装）
- サイドバーは折りたたみ可能
- ボトムパネルも折りたたみ可能
- 問題文パネルとエディタの分割比率はユーザーが自由に調整可能（デフォルト50:50）

---

## 5. 機能一覧・詳細設計

### 5.1 コードエディタ（Monaco Editor）

**概要**: C++に特化した高機能コードエディタ。

| 機能 | 詳細 |
|---|---|
| シンタックスハイライト | C++ 対応（Monaco組み込み） |
| 自動補完 | `bits/stdc++.h` の主要関数・型の補完辞書を内蔵 |
| 括弧の自動閉じ | `{}`, `()`, `[]`, `""`, `''` |
| 行番号 | 表示（ON/OFF設定可） |
| ミニマップ | 右端にコード全体のプレビュー（ON/OFF設定可） |
| テーマ | ダーク（デフォルト）/ ライト 切替。カスタムテーマ対応 |
| フォント | 等幅フォント。サイズ変更可能（Ctrl + / Ctrl -） |
| Undo/Redo | 無制限 |
| 検索・置換 | Ctrl+F / Ctrl+H |
| 複数カーソル | Alt+Click |
| 折りたたみ | ブロック単位で折りたたみ |
| Vim モード | 設定でON/OFF（`monaco-vim` パッケージ） |

**テンプレート自動挿入**:
新規ファイル作成時に以下のテンプレートを自動挿入。カスタマイズ可能。

```cpp
#include <bits/stdc++.h>
using namespace std;
using ll = long long;
using P = pair<int, int>;
#define rep(i, n) for (int i = 0; i < (int)(n); i++)

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    
    
    return 0;
}
```

### 5.2 問題文表示パネル

**概要**: エディタの左半分に問題文をHTML形式で表示する。

| 機能 | 詳細 |
|---|---|
| HTML レンダリング | 問題文を整形して表示。数式（MathJax/KaTeX）対応 |
| サンプルケース表示 | 入力例・出力例をコードブロックで表示。コピーボタン付き |
| 制約表示 | 制約条件をハイライト表示 |
| 外部リンク | 「AtCoderで開く」ボタン → デフォルトブラウザで問題ページを表示 |
| スクロール同期 | なし（独立スクロール） |
| フォントサイズ | エディタとは独立して変更可能 |

**データ取得フロー**:
```
問題選択 → キャッシュ確認 → なければAtCoderページをfetch
→ HTMLパース（cheerio） → 問題文・サンプルケース抽出
→ ローカルキャッシュに保存 → パネルに表示
```

### 5.3 コンパイル・実行機能

**概要**: C++コードをコンパイルし、サンプルケースで実行して結果を判定する。

**コンパイルコマンド**:
```bash
g++ -std=c++17 -O2 -Wall -Wextra -o <output> <source.cpp>
```

**実行フロー**:
```
[Ctrl+Enter] or 実行ボタン押下
    ↓
1. ソースコードを一時ファイルに保存
2. g++ でコンパイル
    → 失敗: CE（Compilation Error）を表示して終了
3. 各テストケースに対して実行
    → stdin にサンプル入力を流す
    → stdout をキャプチャ
    → タイムアウト（デフォルト5秒）超過 → TLE
    → 異常終了 → RE
    → 出力比較 → 一致: AC / 不一致: WA
4. 結果をボトムパネルに表示
```

**実行エンジン設計**:
```typescript
interface TestResult {
  caseIndex: number;
  caseName: string;
  verdict: 'AC' | 'WA' | 'TLE' | 'RE' | 'CE';
  executionTime: number;       // ms
  expectedOutput: string;
  actualOutput: string;
  stderr: string;
}

interface CompileResult {
  success: boolean;
  errorMessage: string;
  binaryPath: string;
}
```

**Node.js `child_process` の利用**:
- `execFile` でコンパイル・実行（`exec` ではなく `execFile` でインジェクション対策）
- タイムアウトは `timeout` オプションで制御
- 実行ファイルのパスは絶対パスを使用

### 5.4 テスト結果表示（ボトムパネル: テスト結果タブ）

**概要**: テストケースの実行結果を一覧表示する。

**表示形式**:
```
┌─────────────────────────────────────────────────┐
│  ▶ Run All Tests    ⟳ Refresh Cases             │
├─────────────────────────────────────────────────┤
│  ✅ Case 1 (Sample 1)    AC     12ms            │
│  ❌ Case 2 (Sample 2)    WA     8ms             │
│     Expected: 5                                  │
│     Got:      3                                  │
│     [Diff表示]                                   │
│  ✅ Case 3 (Sample 3)    AC     15ms            │
│  ⏰ Case 4 (Custom 1)    TLE    5001ms          │
├─────────────────────────────────────────────────┤
│  Result: 2/4 AC                                  │
└─────────────────────────────────────────────────┘
```

| 機能 | 詳細 |
|---|---|
| verdict色分け | AC=緑, WA=赤, TLE=黄, RE=紫, CE=オレンジ |
| diff表示 | WAの場合、期待出力と実際の出力の差分をインラインdiffで表示 |
| 個別実行 | 各ケースの横に個別実行ボタン |
| 実行時間表示 | ミリ秒単位 |
| stderr表示 | REやCEの場合、エラーメッセージを折りたたみで表示 |

### 5.5 カスタム入出力パネル（ボトムパネル: 入出力タブ）

**概要**: ユーザーが自由に入力を指定して実行できるインタラクティブパネル。

```
┌──────────────────────┬──────────────────────┐
│  📥 Input            │  📤 Output           │
│  ┌──────────────┐    │  ┌──────────────┐    │
│  │ 5            │    │  │ 15           │    │
│  │ 1 2 3 4 5    │    │  │              │    │
│  │              │    │  │              │    │
│  └──────────────┘    │  └──────────────┘    │
│                      │  Time: 3ms           │
│  [▶ Run] [Clear]     │  Exit Code: 0        │
└──────────────────────┴──────────────────────┘
```

- テキストエリアに入力を書いて即実行
- カスタムテストケースとして保存可能（名前をつけて保存→テスト結果タブに追加）

### 5.6 分野別問題一覧（サイドバー）

**概要**: AtCoderの問題をアルゴリズム分野別に分類してツリー表示する。

**カテゴリ構造**:
```
📁 全探索 / ブルートフォース
  📁 灰 (〜 399)
    📄 ABC086A - Product (⭐ 63)
    📄 ABC088B - Card Game for Two (⭐ 121)
  📁 茶 (400 〜 799)
    ...
📁 二分探索
📁 貪欲法
📁 動的計画法（DP）
📁 グラフ（BFS / DFS）
📁 最短経路
📁 木
📁 Union-Find
📁 セグメント木 / BIT
📁 数学 / 整数論
📁 文字列
📁 幾何
📁 フロー / マッチング
📁 その他
📁 未分類
```

**難易度色分け**（AtCoder Problems準拠）:
| 色 | difficulty範囲 | カラーコード |
|---|---|---|
| 灰 | 〜 399 | `#808080` |
| 茶 | 400 〜 799 | `#804000` |
| 緑 | 800 〜 1199 | `#008000` |
| 水 | 1200 〜 1599 | `#00C0C0` |
| 青 | 1600 〜 1999 | `#0000FF` |
| 黄 | 2000 〜 2399 | `#C0C000` |
| 橙 | 2400 〜 2799 | `#FF8000` |
| 赤 | 2800〜 | `#FF0000` |

**機能**:
- ツリーの展開/折りたたみ
- 問題名の横にdifficulty値と色付きバッジ
- 解答済み問題にチェックマーク
- フィルタ: 難易度範囲スライダー、解答済み/未解答トグル
- 検索: 問題名・問題IDでインクリメンタル検索
- 問題クリック → 問題文パネルに表示 + エディタに新規ファイル準備

**分類マッピングデータ**:
- アプリ内に `categoryMapping.json` として同梱
- ユーザーが手動で分類を追加・変更可能（右クリック→「カテゴリを変更」）
- ユーザーの変更はローカルに保存（`~/.cpeditor/userMapping.json`）
- 将来的にコミュニティ共有を検討

### 5.7 タイマー機能

**概要**: 問題を解く際の経過時間を計測する。

**表示位置**: タイトルバー右側 or ステータスバー

**操作**:
| アクション | ショートカット | 説明 |
|---|---|---|
| Start | `Ctrl+Shift+S` | タイマー開始 |
| Pause | `Ctrl+Shift+P` | 一時停止 |
| Reset | `Ctrl+Shift+R` | リセット |

**追加仕様**:
- 問題を選択したとき自動でタイマー開始（設定でON/OFF）
- AC判定時に自動で停止するオプション
- 解答時間は問題ごとに記録・保存

### 5.8 計算量チェッカー（ボトムパネル: 計算量タブ）

**概要**: 制約とアルゴリズムの計算量から実行時間内に間に合うか判定する。

**入力UI**:
```
┌─────────────────────────────────────────────────┐
│  📐 Complexity Checker                          │
│                                                  │
│  変数    制約値                                   │
│  N    [  200000  ]                               │
│  M    [  200000  ]    [+ 変数追加]               │
│                                                  │
│  計算量:  [ O(N log N)        ▼ ]               │
│  制限時間: [ 2  ] 秒                             │
│                                                  │
│  ──────────────────────────────────              │
│  演算回数: 約 3.4 × 10^6                        │
│  上限:     約 2.0 × 10^8                        │
│  判定:     🟢 余裕で間に合う                     │
└─────────────────────────────────────────────────┘
```

**計算量プリセット**:
```
O(1), O(log N), O(√N), O(N), O(N log N),
O(N√N), O(N²), O(N² log N), O(N³),
O(2^N), O(N × 2^N), O(N!),
O(N × M), O(N × M × log(N+M))
```

**判定基準**（C++, 1秒あたり ~10^8 ops）:
| 判定 | 条件 |
|---|---|
| 🟢 余裕で間に合う | 演算回数 ≤ 上限 × 0.1 |
| 🟡 ギリギリ間に合う | 演算回数 ≤ 上限 |
| 🔴 間に合わない | 演算回数 > 上限 |

**ステータスバー連携**:
最後にチェックした結果を `⚡ O(N log N) → ~3.4×10^6 ✅` のように簡易表示。

### 5.9 テンプレート機能

**概要**: 新規ファイル作成時にC++テンプレートを自動挿入する。

| 機能 | 詳細 |
|---|---|
| デフォルトテンプレート | 上記のC++テンプレ |
| カスタムテンプレート | ファイルパスを設定で指定可能 |
| 複数テンプレート | 用途別に複数登録、選択して使用 |
| スニペット | `dp`, `seg`, `uf` 等の略語→定型コード展開 |

**組み込みスニペット例**:

| トリガー | 展開内容 |
|---|---|
| `dp` | DP テーブル初期化テンプレート |
| `graph` | グラフの隣接リスト定義 |
| `uf` | Union-Find クラス定義 |
| `seg` | セグメント木クラス定義 |
| `mod` | ModInt クラス定義 |
| `bfs` | BFS テンプレート |
| `dfs` | DFS テンプレート |
| `dijkstra` | Dijkstra テンプレート |

### 5.10 提出履歴ビュー（ボトムパネル: 提出履歴タブ）

**概要**: AtCoderのユーザー提出履歴を表示する。

**表示形式**:
```
┌─────────────────────────────────────────────────────────┐
│  📋 Submission History    User: [username]  [🔄 更新]   │
├─────────┬────────────┬────────┬───────┬────────┬───────┤
│ 日時     │ 問題       │ 言語   │ 結果  │ 実行時間│ メモリ │
├─────────┼────────────┼────────┼───────┼────────┼───────┤
│ 02/15   │ ABC340-D   │ C++17  │ ✅ AC │ 45ms   │ 4MB   │
│ 02/15   │ ABC340-C   │ C++17  │ ❌ WA │ 12ms   │ 4MB   │
│ 02/14   │ ABC339-E   │ C++17  │ ✅ AC │ 230ms  │ 16MB  │
└─────────┴────────────┴────────┴───────┴────────┴───────┘
```

- AtCoder Problems API の `/v3/user/submissions` を使用
- 設定でAtCoderユーザー名を登録
- ページネーション対応（500件ずつ取得）

---

## 6. ショートカットキー一覧

| キー | アクション |
|---|---|
| `Ctrl+Enter` | コンパイル＆全テストケース実行 |
| `Ctrl+Shift+Enter` | コンパイルのみ |
| `Ctrl+R` | 最後のテストを再実行 |
| `Ctrl+Shift+S` | タイマー開始/停止 |
| `Ctrl+Shift+R` | タイマーリセット |
| `Ctrl+N` | 新規ソリューションファイル作成（テンプレート挿入） |
| `Ctrl+Shift+C` | 計算量チェッカーを開く |
| `Ctrl+B` | サイドバー表示/非表示 |
| `Ctrl+J` | ボトムパネル表示/非表示 |
| `Ctrl+1` | エディタにフォーカス |
| `Ctrl+2` | 問題文パネルにフォーカス |
| `Ctrl+,` | 設定画面を開く |
| `Ctrl+Shift+T` | テスト結果タブを開く |
| `Ctrl+Shift+I` | 入出力タブを開く |

すべてのショートカットはユーザーがカスタマイズ可能とする。

---

## 7. データ管理設計

### 7.1 データ保存場所

```
~/.cpeditor/
├── config.json              # ユーザー設定
├── keybindings.json         # カスタムキーバインド
├── templates/               # ユーザーテンプレート
│   └── default.cpp
├── cache/                   # APIキャッシュ
│   ├── problems.json
│   ├── contests.json
│   ├── merged-problems.json
│   ├── problem-models.json
│   └── testcases/           # スクレイピングしたテストケース
│       └── {problem_id}.json
├── userMapping.json         # ユーザーが追加した分類マッピング
├── progress.json            # 進捗データ
├── snippets.json            # ユーザースニペット
└── workspaces/              # 作業ファイル
    └── {problem_id}/
        └── solution.cpp
```

### 7.2 キャッシュ戦略

| データ | キャッシュ期間 | 更新方式 |
|---|---|---|
| `problems.json` | 24時間 | ETag + If-None-Match |
| `contests.json` | 24時間 | ETag + If-None-Match |
| `problem-models.json` | 24時間 | ETag + If-None-Match |
| テストケース（HTML） | 無期限 | 手動更新ボタン |
| 提出履歴 | 5分 | ポーリング or 手動 |

### 7.3 設定項目（config.json）

```jsonc
{
  "general": {
    "language": "ja",
    "theme": "dark",
    "fontSize": 14,
    "fontFamily": "Consolas, 'Courier New', monospace"
  },
  "atcoder": {
    "username": ""
  },
  "compiler": {
    "path": "g++",
    "flags": ["-std=c++17", "-O2", "-Wall", "-Wextra"],
    "timeout": 5000
  },
  "editor": {
    "minimap": true,
    "lineNumbers": true,
    "vimMode": false,
    "wordWrap": "off",
    "tabSize": 4
  },
  "timer": {
    "autoStartOnProblemSelect": false,
    "autoStopOnAC": true
  },
  "template": {
    "default": "~/.cpeditor/templates/default.cpp",
    "custom": []
  }
}
```

---

## 8. プロジェクト構成

```
cpeditor/
├── package.json
├── tsconfig.json
├── electron-vite.config.ts
├── electron-builder.config.js
│
├── src/
│   ├── main/                          # Electronメインプロセス
│   │   ├── index.ts                   # エントリポイント、ウィンドウ管理
│   │   ├── ipc/                       # IPC ハンドラ
│   │   │   ├── compiler.ts            # コンパイル・実行 IPC
│   │   │   ├── fileSystem.ts          # ファイル操作 IPC
│   │   │   └── api.ts                 # API通信 IPC
│   │   └── services/                  # メインプロセス側サービス
│   │       ├── compilerService.ts     # g++ コンパイル・実行
│   │       ├── atcoderApiService.ts   # AtCoder Problems API通信
│   │       ├── scraperService.ts      # AtCoder問題ページスクレイピング
│   │       ├── cacheService.ts        # キャッシュ管理
│   │       └── configService.ts       # 設定管理
│   │
│   ├── renderer/                      # Electronレンダラープロセス（React）
│   │   ├── index.html
│   │   ├── main.tsx                   # Reactエントリポイント
│   │   ├── App.tsx                    # ルートコンポーネント
│   │   │
│   │   ├── components/                # UIコンポーネント
│   │   │   ├── layout/
│   │   │   │   ├── MainLayout.tsx     # 全体レイアウト
│   │   │   │   ├── Sidebar.tsx        # サイドバー
│   │   │   │   ├── TitleBar.tsx       # タイトルバー
│   │   │   │   ├── StatusBar.tsx      # ステータスバー
│   │   │   │   └── BottomPanel.tsx    # ボトムパネル
│   │   │   │
│   │   │   ├── editor/
│   │   │   │   ├── CodeEditor.tsx     # Monaco Editorラッパー
│   │   │   │   └── EditorToolbar.tsx  # エディタ上部ツールバー
│   │   │   │
│   │   │   ├── problem/
│   │   │   │   ├── ProblemView.tsx    # 問題文表示
│   │   │   │   ├── ProblemTree.tsx    # 問題ツリー
│   │   │   │   └── ProblemFilter.tsx  # フィルタUI
│   │   │   │
│   │   │   ├── test/
│   │   │   │   ├── TestResultPanel.tsx    # テスト結果表示
│   │   │   │   ├── TestCaseItem.tsx       # 個別テスト結果
│   │   │   │   ├── DiffViewer.tsx         # diff表示
│   │   │   │   └── CustomIOPanel.tsx      # カスタム入出力
│   │   │   │
│   │   │   ├── tools/
│   │   │   │   ├── Timer.tsx              # タイマー
│   │   │   │   ├── ComplexityChecker.tsx  # 計算量チェッカー
│   │   │   │   └── SubmissionHistory.tsx  # 提出履歴
│   │   │   │
│   │   │   └── settings/
│   │   │       └── SettingsPage.tsx       # 設定画面
│   │   │
│   │   ├── stores/                    # Zustand ストア
│   │   │   ├── problemStore.ts        # 問題データ
│   │   │   ├── editorStore.ts         # エディタ状態
│   │   │   ├── testStore.ts           # テスト実行状態
│   │   │   ├── timerStore.ts          # タイマー状態
│   │   │   └── settingsStore.ts       # 設定
│   │   │
│   │   ├── hooks/                     # カスタムフック
│   │   │   ├── useCompiler.ts
│   │   │   ├── useAtCoderAPI.ts
│   │   │   └── useTimer.ts
│   │   │
│   │   └── styles/
│   │       └── globals.css            # Tailwind + グローバルスタイル
│   │
│   ├── shared/                        # メイン/レンダラー共有
│   │   ├── types/                     # 型定義
│   │   │   ├── problem.ts
│   │   │   ├── testCase.ts
│   │   │   ├── submission.ts
│   │   │   └── config.ts
│   │   ├── constants.ts               # 定数
│   │   └── ipcChannels.ts             # IPC チャンネル名定義
│   │
│   └── data/                          # 同梱データ
│       ├── categoryMapping.json       # 問題分類マッピング
│       ├── defaultTemplate.cpp        # デフォルトテンプレート
│       └── snippets/                  # 組み込みスニペット
│           ├── dp.cpp
│           ├── unionfind.cpp
│           ├── segtree.cpp
│           └── ...
│
├── resources/                         # アイコン・アセット
│   ├── icon.png
│   ├── icon.icns
│   └── icon.ico
│
└── tests/
    ├── unit/
    │   ├── compilerService.test.ts
    │   ├── complexityService.test.ts
    │   └── scraperService.test.ts
    └── e2e/
        └── app.test.ts
```

---

## 9. IPC通信設計

Electronのメインプロセスとレンダラープロセス間の通信は `contextBridge` + `ipcRenderer` / `ipcMain` で行う。

### 9.1 IPCチャンネル一覧

| チャンネル | 方向 | 用途 |
|---|---|---|
| `compiler:compile` | Renderer → Main | コンパイル実行 |
| `compiler:run` | Renderer → Main | テストケース実行 |
| `compiler:run-result` | Main → Renderer | 実行結果通知 |
| `api:fetch-problems` | Renderer → Main | 問題一覧取得 |
| `api:fetch-testcases` | Renderer → Main | テストケース取得（スクレイピング） |
| `api:fetch-submissions` | Renderer → Main | 提出履歴取得 |
| `fs:read-file` | Renderer → Main | ファイル読み込み |
| `fs:write-file` | Renderer → Main | ファイル書き込み |
| `fs:save-dialog` | Renderer → Main | 保存ダイアログ表示 |
| `config:get` | Renderer → Main | 設定読み込み |
| `config:set` | Renderer → Main | 設定書き込み |
| `app:open-external` | Renderer → Main | 外部URL表示 |

### 9.2 Preload スクリプト（API公開）

```typescript
// preload.ts
const api = {
  compiler: {
    compile: (source: string, flags: string[]) => 
      ipcRenderer.invoke('compiler:compile', source, flags),
    run: (binaryPath: string, input: string, timeout: number) => 
      ipcRenderer.invoke('compiler:run', binaryPath, input, timeout),
  },
  problems: {
    fetchAll: () => ipcRenderer.invoke('api:fetch-problems'),
    fetchTestCases: (problemId: string) => 
      ipcRenderer.invoke('api:fetch-testcases', problemId),
  },
  // ...
};
contextBridge.exposeInMainWorld('cpeditor', api);
```

---

## 10. テーマ設計

### 10.1 ダークテーマ（デフォルト）

| 要素 | 色 |
|---|---|
| 背景（メイン） | `#1e1e2e` |
| 背景（サイドバー） | `#181825` |
| 背景（ボトムパネル） | `#181825` |
| テキスト | `#cdd6f4` |
| アクセント | `#89b4fa` |
| ボーダー | `#313244` |
| AC（緑） | `#a6e3a1` |
| WA（赤） | `#f38ba8` |
| TLE（黄） | `#f9e2af` |
| RE（紫） | `#cba6f7` |
| CE（オレンジ） | `#fab387` |

Catppuccin Mocha ベースの配色。

---

## 11. セキュリティ要件

| 項目 | 対策 |
|---|---|
| XSS | 問題文HTMLの表示時に `DOMPurify` でサニタイズ |
| コマンドインジェクション | `execFile`を使用（シェル経由しない）。引数は配列で渡す |
| nodeIntegration | `false`（デフォルト）。`contextBridge` 経由のみ |
| webSecurity | `true` を維持 |
| CSP | `Content-Security-Policy` ヘッダーを適切に設定 |
| 外部リンク | `shell.openExternal` でデフォルトブラウザに委譲。アプリ内では開かない |

---

## 12. 開発フェーズ

| フェーズ | 内容 | 目安期間 |
|---|---|---|
| **Phase 1** | プロジェクト雛形（Electron + React + Monaco Editor）。メインウィンドウの基本レイアウト（3パネル構成）。Monaco Editorの組み込みとC++シンタックスハイライト | 1〜2週間 |
| **Phase 2** | AtCoder Problems API連携 + サイドバーの問題ツリー。問題文表示パネル（スクレイピング）。テンプレート自動挿入 | 1〜2週間 |
| **Phase 3** | コンパイル・実行機能。テスト結果表示。カスタム入出力パネル。diff表示 | 2〜3週間 |
| **Phase 4** | タイマー。計算量チェッカー。提出履歴ビュー | 1〜2週間 |
| **Phase 5** | 設定画面。ショートカットカスタマイズ。スニペット。Vim モード対応 | 1〜2週間 |
| **Phase 6** | テーマ仕上げ。テスト整備。パフォーマンス最適化。バグ修正。配布ビルド | 1〜2週間 |

**合計目安**: 7〜13週間（個人開発の場合）

---

## 13. 依存パッケージ（主要）

### 本体
```json
{
  "electron": "latest",
  "monaco-editor": "latest",
  "react": "^19",
  "react-dom": "^19",
  "zustand": "latest",
  "cheerio": "latest",
  "dompurify": "latest",
  "react-resizable-panels": "latest",
  "tailwindcss": "latest"
}
```

### 開発
```json
{
  "electron-vite": "latest",
  "electron-builder": "latest",
  "typescript": "latest",
  "vitest": "latest",
  "@playwright/test": "latest"
}
```

### オプション
```json
{
  "monaco-vim": "latest",
  "katex": "latest",
  "diff": "latest"
}
```

---

## 14. 将来的な拡張構想

以下は初期リリースには含めないが、将来のバージョンで検討する機能：

- **AtCoderへの直接提出**（ログイン連携）
- **Python / Rust 対応**
- **分類マッピングのコミュニティ共有**
- **進捗ダッシュボード**（ヒートマップ、弱点分析グラフ）
- **AIヒント機能**（段階的ヒント表示）
- **バーチャルコンテストモード**
- **プラグインシステム**（サードパーティ機能追加）
- **クラウド同期**（設定・進捗の複数端末同期）

---
title: "Claude Code のコンテキストロス問題を解決した（Kimi APIで月額費用も90%削減）"
emoji: "🧠"
type: "tech"
topics: ["claudecode", "ai", "typescript", "nodejs", "生産性"]
published: true
---

## 毎回セッションが「白紙」になる問題

Claude Code を毎日使っていると、あるストレスに気づく。

**新しいターミナルを開くたびに、AIが何も覚えていない。**

- 「このプロジェクトは Next.js + Supabase 構成です」
- 「認証は JWT で実装済みです」
- 「先週 src/auth.ts を修正して、今日は決済モジュールを追加します」

毎回これを説明してから本題に入る。慣れてしまっているけど、1回5〜15分のロスが積み重なると、週に1時間以上が「説明」に消えている。

CLAUDE.md に書く方法もある。でも手動で更新し続けるのは続かないし、プロジェクトが増えると管理が面倒になる。

---

## 作ったもの：ModelBridge

Claude Code と Kimi API の間に挟むローカルプロキシ。

```
Claude Code → ModelBridge (localhost:8765) → Kimi API
```

機能は2つ：

**1. セッション記憶の自動化**
会話が6回以上になると、自動でその会話を要約して SQLite に保存する。次のセッション開始時に、前回の要約を自動でコンテキストに注入する。

ユーザーは何もしなくていい。`kimi` コマンドで Claude Code を開くだけ。

**2. コスト削減**
Anthropic の API ではなく Kimi API にリクエストを転送する。Kimi Code のサブスクリプション（月200元）がほぼ使われていなかったので、そこに流し込む形にした。結果、月 $50〜100 かかっていた API 費用が実質ゼロになった。

---

## 仕組み

### セッション検出

Claude Code は毎回リクエストに会話履歴全体を含めて送ってくる。`messages.length === 1` かつ最初のメッセージが `user` のとき＝新しいセッションと判定する。

```typescript
const isNewSession =
  messages.length === 1 && messages[0]?.role === "user"
```

### プロジェクト特定

Claude Code のシステムプロンプトには作業ディレクトリが含まれている。

```
<working_directory>/Users/jada/Desktop/projects/my-app</working_directory>
```

これをプロジェクトキーとして使い、記憶をプロジェクト単位で分離する。

### コンテキスト注入

新しいセッションを検出したら、そのプロジェクトの直近の要約を取り出して、ユーザーの最初のメッセージの前に差し込む。

```
[前回セッションの記録 — 2026-04-14]
要約: 決済モジュールを Stripe で実装。Webhook ハンドラを追加。
関連ファイル: src/payment.ts, src/webhook.ts
主な決定: Stripe Checkout を使用、冪等性キーで重複防止
[記録終わり]

← ここにユーザーの最初のメッセージが続く
```

Claude Code は何も知らないまま、すでにコンテキストを持った状態で会話が始まる。

### 要約生成

セッションが終わった後（6回以上の会話があった場合）、Kimi API に非同期でサマリーを依頼する。返ってくる JSON：

```json
{
  "summary": "...",
  "file_paths": ["src/payment.ts"],
  "key_decisions": ["Stripe Checkout を使用"]
}
```

これを SQLite に保存する。

---

## セットアップ

```bash
git clone https://github.com/Jada-Q/model-bridge
cd model-bridge
pnpm install

cp .env.example .env
# .env に KIMI_API_KEY=sk-kimi-your-key を設定

echo 'alias kimi="~/Desktop/projects/model-bridge/kimi.sh"' >> ~/.zshrc
source ~/.zshrc
```

あとは `kimi` コマンドを叩くだけ。ModelBridge が起動していなければ自動で立ち上げてから Claude Code を開く。

Anthropic の API に戻したいときは：

```bash
alias claude-real="ANTHROPIC_BASE_URL='' ANTHROPIC_API_KEY='' ENABLE_TOOL_SEARCH='' claude"
```

---

## ダッシュボード

`http://localhost:8765/dashboard` を開くと使用状況が見える。

- リクエスト数・トークン使用量
- コンテキスト圧縮の発生回数
- プロジェクト別のセッション記憶履歴

---

## よくある疑問

**Q: Claude Code の CLAUDE.md と何が違うの？**

CLAUDE.md は手動管理。ModelBridge は自動。CLAUDE.md はプロジェクトに固定した情報（技術スタック、コーディング規約など）向き。ModelBridge は「今どこまで進んでいるか」という動的な状態向き。両方使うのがベスト。

**Q: Kimi API って品質は大丈夫？**

Kimi は Anthropic 互換プロトコルを提供していて、モデルは `kimi-for-coding`。コーディングタスクでは Claude Sonnet と遜色ない精度を体感している。複雑なアーキテクチャ議論は Anthropic API に切り替える使い分けをしている。

**Q: セッション記憶はどこに保存される？**

ローカルの SQLite（`data/sessions.db`）。クラウドには送らない。

**Q: Anthropic が公式でクロスセッション記憶を実装したら？**

それが来たらコスト削減ツールとして使い続ける。CLAUDE.md の自動更新と組み合わせる余地もある。

---

## まとめ

| | Claude Code デフォルト | Claude Code + ModelBridge |
|---|---|---|
| API | Anthropic | Kimi |
| 月額費用 | $50〜100 | ほぼ0（Kimi サブスク活用） |
| セッション記憶 | 手動（CLAUDE.md） | 自動 |
| プロジェクト切り替え | 手動説明 | 自動注入 |

コードは GitHub に公開しています。

https://github.com/Jada-Q/model-bridge

同じ問題を感じている人の参考になれば。

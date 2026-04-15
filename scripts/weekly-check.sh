#!/bin/zsh
# ModelBridge Weekly Check
# 毎週月曜朝に実行：数字を確認して続ける/止める判定を出す

REPORT_DIR="$HOME/Desktop/session-logs"
REPORT_FILE="$REPORT_DIR/modelbridge-weekly-$(date +%Y-%m-%d).md"
mkdir -p "$REPORT_DIR"

# ── 数字を取得 ────────────────────────────────────────────────
STARS=$(gh api repos/Jada-Q/model-bridge --jq '.stargazers_count' 2>/dev/null || echo "0")
FORKS=$(gh api repos/Jada-Q/model-bridge --jq '.forks_count' 2>/dev/null || echo "0")
ISSUES=$(gh api repos/Jada-Q/model-bridge/issues --jq 'length' 2>/dev/null || echo "0")
LAUNCH_DATE="2026-04-15"
DAYS=$(( ( $(date +%s) - $(date -j -f "%Y-%m-%d" "$LAUNCH_DATE" +%s) ) / 86400 ))

# ── Kill/Continue 判定 ────────────────────────────────────────
if   [ "$STARS" -ge 100 ]; then VERDICT="CONTINUE — 強いトラクション"
elif [ "$STARS" -ge 30 ];  then VERDICT="CONTINUE — 基準クリア、次フェーズへ"
elif [ "$DAYS" -ge 30 ] && [ "$STARS" -lt 30 ]; then VERDICT="⚠️  KILL検討 — 30日経過でstar 30未満"
else VERDICT="WATCH — まだ判定期間中（期限: 2026-05-15）"
fi

# ── 今週やること（数字ベースで分岐）─────────────────────────
if [ "$STARS" -ge 30 ]; then
  ACTIONS="1. Cloud 同期 waitlist ページを作る（Tally.so、5分）
2. README に「先行登録」ボタンを追加
3. Show HN 投稿（まだなら）"
elif [ "$STARS" -ge 10 ]; then
  ACTIONS="1. Qiita に Zenn 記事を転載
2. X(Twitter) に投稿（Zenn URL 付き）
3. Show HN 投稿: 'Show HN: I built a session memory layer for Claude Code'"
else
  ACTIONS="1. Zenn PVを手動確認（目標: 200 PV）
2. X(Twitter) に投稿（まだなら）
3. 開発者 Discord/Slack に共有（Claude Code 関連コミュニティ）"
fi

# ── レポート生成 ──────────────────────────────────────────────
cat > "$REPORT_FILE" << EOF
# ModelBridge 週次チェック — $(date +%Y-%m-%d)

## 数字

| 指標 | 現在値 | 目標 |
|---|---|---|
| GitHub Stars | $STARS | 30（Kill基準） |
| GitHub Forks | $FORKS | — |
| Issues/コメント | $ISSUES | 有料希望 3件 |
| 公開からの日数 | ${DAYS}日 | 30日以内に判断 |

## 判定

**$VERDICT**

Kill 基準（2026-05-15 までに全て未達なら止める）:
- [ ] GitHub 30 star
- [ ] Zenn 200 PV（手動確認）
- [ ] 「有料で使いたい」コメント 3 件

## 今週やること

$ACTIONS

## Zenn PV 確認
→ https://zenn.dev/dashboard （手動確認）

---
_自動生成: $(date)_
EOF

# ── macOS 通知 ────────────────────────────────────────────────
osascript -e "display notification \"Stars: $STARS | $VERDICT\" with title \"ModelBridge 週次チェック\" sound name \"Default\""

# ── ターミナルにも出力 ────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " ModelBridge 週次チェック $(date +%Y-%m-%d)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Stars: $STARS  Forks: $FORKS  Days: ${DAYS}日"
echo " 判定: $VERDICT"
echo ""
echo " 今週やること:"
echo "$ACTIONS" | sed 's/^/  /'
echo ""
echo " レポート: $REPORT_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# レポートを開く
open "$REPORT_FILE"

#!/bin/bash
# סקריפט התקנת סקילים וסוכנים — קמפיינר 10X
# הרץ: bash install.sh

SKILLS_DEST="$HOME/.claude/skills"
AGENTS_DEST="$HOME/.claude/agents"
mkdir -p "$SKILLS_DEST"
mkdir -p "$AGENTS_DEST"

MIFGASH_1=(agency-setup meta-connect)
MIFGASH_2=(new-customer dream-customer fb-copywriter competitor-research creative-ai facebook-campaign skill-creator)
AGENTS=(qa-campaign copy-reviewer)

echo "מתקין סקילים — מפגש 1..."
echo ""

for skill in "${MIFGASH_1[@]}"; do
  if [ -d "./מפגש-1/$skill" ]; then
    cp -r "./מפגש-1/$skill" "$SKILLS_DEST/"
    echo "✅ $skill"
  else
    echo "⚠️  $skill — לא נמצא"
  fi
done

echo ""
echo "מתקין סקילים — מפגש 2..."
echo ""

for skill in "${MIFGASH_2[@]}"; do
  if [ -d "./מפגש-2/$skill" ]; then
    cp -r "./מפגש-2/$skill" "$SKILLS_DEST/"
    echo "✅ $skill"
  else
    echo "⚠️  $skill — לא נמצא"
  fi
done

echo ""
echo "מתקין סוכנים..."
echo ""

for agent in "${AGENTS[@]}"; do
  if [ -f "./agents/$agent.md" ]; then
    cp "./agents/$agent.md" "$AGENTS_DEST/"
    echo "✅ $agent"
  else
    echo "⚠️  $agent — לא נמצא"
  fi
done

echo ""
echo "הסקילים הותקנו ב-~/.claude/skills/"
echo "הסוכנים הותקנו ב-~/.claude/agents/"
echo "פתח Claude Code חדש ותוכל להשתמש בהם."

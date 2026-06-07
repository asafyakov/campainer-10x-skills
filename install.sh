#!/bin/bash
# סקריפט התקנת סקילים וסוכנים — קמפיינר 10X מפגש 2
# הרץ: bash install.sh

SKILLS_DEST="$HOME/.claude/skills"
AGENTS_DEST="$HOME/.claude/agents"
mkdir -p "$SKILLS_DEST"
mkdir -p "$AGENTS_DEST"

SKILLS=(new-customer dream-customer agency-setup fb-copywriter competitor-research creative-ai analytics facebook-campaign skill-creator)
AGENTS=(qa-campaign copy-reviewer)

echo "מתקין סקילים לקמפיינר 10X..."
echo ""

for skill in "${SKILLS[@]}"; do
  if [ -d "./skills/$skill" ]; then
    cp -r "./skills/$skill" "$SKILLS_DEST/"
    echo "✅ $skill"
  else
    echo "⚠️  $skill — לא נמצא בתיקייה"
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
    echo "⚠️  $agent — לא נמצא בתיקייה"
  fi
done

echo ""
echo "הסקילים הותקנו ב-~/.claude/skills/"
echo "הסוכנים הותקנו ב-~/.claude/agents/"
echo "פתח Claude Code חדש ותוכל להשתמש בהם."

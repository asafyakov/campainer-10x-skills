#!/bin/bash
# סקריפט התקנת סקילים — קמפיינר 10X מפגש 2
# הרץ: bash install.sh

DEST="$HOME/.claude/skills"
mkdir -p "$DEST"

SKILLS=(new-customer dream-customer agency-setup facebook-ad-copywriter competitor-research creative-ai analytics facebook-campaign skill-creator)

echo "מתקין סקילים לקמפיינר 10X..."
echo ""

for skill in "${SKILLS[@]}"; do
  if [ -d "./skills/$skill" ]; then
    cp -r "./skills/$skill" "$DEST/"
    echo "✅ $skill"
  else
    echo "⚠️  $skill — לא נמצא בתיקייה"
  fi
done

echo ""
echo "הסקילים הותקנו ב-~/.claude/skills/"
echo "פתח Claude Code חדש ותוכל להשתמש בהם."

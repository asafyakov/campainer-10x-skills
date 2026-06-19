#!/usr/bin/env python3
"""
Telegram Bot → Claude Code
שלח הודעה מהטלפון → קלוד מעבד → תשובה חוזרת
"""

import os
import sys
import json
import shutil
import subprocess
import telebot

sys.path.insert(0, os.path.dirname(__file__))
import config as cfg

# --- בדיקת claude CLI ---
CLAUDE_BIN = shutil.which("claude")
if not CLAUDE_BIN:
    # חיפוש בנתיב של אפליקציית Claude
    import glob
    matches = sorted(glob.glob(os.path.expanduser(
        "~/Library/Application Support/Claude/claude-code/*/claude.app/Contents/MacOS/claude"
    )))
    if matches:
        CLAUDE_BIN = matches[-1]
    else:
        print("❌ Claude CLI לא נמצא. הרץ: npm install -g @anthropic-ai/claude-code")
        sys.exit(1)

# --- State ---
STATE_FILE = os.path.join(os.path.dirname(__file__), "state.json")
DEFAULT_DIR = os.path.expanduser("~")

def load_state():
    try:
        with open(STATE_FILE) as f:
            return json.load(f)
    except Exception:
        return {"current_dir": DEFAULT_DIR, "awaiting_approval": False}

def save_state(state):
    with open(STATE_FILE, "w") as f:
        json.dump(state, f)

state = load_state()

MODELS = {"opus": "claude-opus-4-5", "sonnet": "claude-sonnet-4-5", "haiku": "claude-haiku-4-5-20251001"}
current_model = None

# --- Bot ---
bot = telebot.TeleBot(cfg.TELEGRAM_BOT_TOKEN)

def is_authorized(user_id):
    if cfg.AUTHORIZED_USER_ID is None:
        return True
    return user_id == cfg.AUTHORIZED_USER_ID

def run_claude(message, cwd, skip_permissions=False, new_session=False):
    cmd = [CLAUDE_BIN]
    if not new_session:
        cmd.append("--continue")
    if skip_permissions:
        cmd.append("--dangerously-skip-permissions")
    else:
        cmd += ["--allowedTools", "Bash,Read,Write,Edit,Glob,Grep,WebFetch,WebSearch,TodoWrite"]
    if current_model:
        cmd += ["--model", current_model]
    cmd += ["-p", message]
    result = subprocess.run(cmd, capture_output=True, text=True, cwd=cwd,
                            env={**os.environ, "TERM": "dumb"}, timeout=300)
    return result.stdout.strip() or result.stderr.strip() or "לא קיבלתי תשובה — נסה שוב."

def send(msg, text):
    for i in range(0, len(text), 4000):
        bot.reply_to(msg, text[i:i+4000])

@bot.message_handler(commands=["start"])
def handle_start(msg):
    if cfg.AUTHORIZED_USER_ID is None:
        cfg.AUTHORIZED_USER_ID = msg.from_user.id
        # שמור ב-config.py
        config_path = os.path.join(os.path.dirname(__file__), "config.py")
        with open(config_path) as f:
            content = f.read()
        content = content.replace("AUTHORIZED_USER_ID = None",
                                  f"AUTHORIZED_USER_ID = {msg.from_user.id}")
        with open(config_path, "w") as f:
            f.write(content)
    bot.reply_to(msg,
        "✅ הבוט פעיל!\n\n"
        "/new — שיחה חדשה\n"
        "/project — רשימת פרויקטים\n"
        "/project <שם> — מעבר לפרויקט\n"
        "/status — פרויקט פעיל\n"
        "/plan <בקשה> — תכנון לפני ביצוע\n"
        "/approve — אשר וביצע\n"
        "/model — בחר מודל"
    )

@bot.message_handler(commands=["status"])
def handle_status(msg):
    if not is_authorized(msg.from_user.id): return
    bot.reply_to(msg, f"📁 {state['current_dir']}")

@bot.message_handler(commands=["new"])
def handle_new(msg):
    if not is_authorized(msg.from_user.id): return
    state["awaiting_approval"] = False
    save_state(state)
    try:
        run_claude("שיחה חדשה.", state["current_dir"], new_session=True)
    except Exception:
        pass
    bot.reply_to(msg, "🔄 שיחה חדשה — אפשר להתחיל.")

@bot.message_handler(commands=["project"])
def handle_project(msg):
    if not is_authorized(msg.from_user.id): return
    parts = msg.text.split(maxsplit=1)
    projects_root = os.path.expanduser("~/Desktop/קלוד קוד ")
    projects = {"גלובלי": os.path.expanduser("~")}
    if os.path.isdir(projects_root):
        for name in sorted(os.listdir(projects_root)):
            path = os.path.join(projects_root, name)
            if os.path.isdir(path) and not name.startswith("."):
                projects[name.strip()] = path
    if len(parts) == 1:
        lines = ["📂 *פרויקטים:*\n"]
        for name, path in projects.items():
            active = " ✅" if path == state["current_dir"] else ""
            lines.append(f"• `/project {name}`{active}")
        bot.reply_to(msg, "\n".join(lines), parse_mode="Markdown")
        return
    name = parts[1].strip()
    match = projects.get(name) or next((v for k, v in projects.items() if name in k), None)
    if not match:
        bot.reply_to(msg, f"❌ לא מצאתי '{name}'. שלח /project לרשימה.")
        return
    state["current_dir"] = match
    save_state(state)
    bot.reply_to(msg, f"✅ פרויקט: *{name}*", parse_mode="Markdown")

@bot.message_handler(commands=["plan"])
def handle_plan(msg):
    if not is_authorized(msg.from_user.id): return
    parts = msg.text.split(maxsplit=1)
    if len(parts) == 1:
        bot.reply_to(msg, "שלח: `/plan <מה אתה רוצה לעשות>`", parse_mode="Markdown")
        return
    bot.reply_to(msg, "🔍 מנתח...")
    prompt = (f"הבקשה: {parts[1]}\n\nתכנן בלבד — אל תבצע.\n"
              "רשום: אילו פקודות תריץ, אילו קבצים תיצור/תשנה.\n"
              "סיים ב: 'שלח /approve לביצוע.'")
    try:
        response = run_claude(prompt, state["current_dir"])
        state["awaiting_approval"] = True
        save_state(state)
        send(msg, response)
    except Exception as e:
        bot.reply_to(msg, f"❌ שגיאה: {e}")

@bot.message_handler(commands=["approve"])
def handle_approve(msg):
    if not is_authorized(msg.from_user.id): return
    if not state.get("awaiting_approval"):
        bot.reply_to(msg, "⚠️ אין תכנית. השתמש ב-`/plan` קודם.", parse_mode="Markdown")
        return
    bot.reply_to(msg, "⚡ מבצע...")
    try:
        response = run_claude("בצע את התכנית. יש לך הרשאות מלאות.",
                              state["current_dir"], skip_permissions=True)
        state["awaiting_approval"] = False
        save_state(state)
        send(msg, response)
        bot.reply_to(msg, "✅ בוצע.")
    except Exception as e:
        bot.reply_to(msg, f"❌ שגיאה: {e}")

@bot.message_handler(commands=["model"])
def handle_model(msg):
    if not is_authorized(msg.from_user.id): return
    global current_model
    parts = msg.text.split(maxsplit=1)
    if len(parts) == 1:
        bot.reply_to(msg,
            f"🤖 מודל: `{current_model or 'ברירת מחדל'}`\n\n"
            "`/model opus` | `/model sonnet` | `/model haiku` | `/model default`",
            parse_mode="Markdown")
        return
    choice = parts[1].strip().lower()
    if choice == "default":
        current_model = None
        bot.reply_to(msg, "✅ חזרתי לברירת מחדל.")
    elif choice in MODELS:
        current_model = MODELS[choice]
        bot.reply_to(msg, f"✅ מודל: `{current_model}`", parse_mode="Markdown")
    else:
        bot.reply_to(msg, "❌ אפשרויות: opus, sonnet, haiku, default")

@bot.message_handler(func=lambda m: True)
def handle_message(msg):
    if not is_authorized(msg.from_user.id):
        bot.reply_to(msg, "❌ אין לך גישה.")
        return
    bot.send_chat_action(msg.chat.id, "typing")
    try:
        response = run_claude(msg.text, state["current_dir"])
        send(msg, response)
    except subprocess.TimeoutExpired:
        bot.reply_to(msg, "⏱ תם הזמן — נסה שוב.")
    except Exception as e:
        bot.reply_to(msg, f"❌ שגיאה: {e}")

if __name__ == "__main__":
    print(f"🤖 בוט טלגרם פעיל | תיקייה: {state['current_dir']}")
    bot.infinity_polling()

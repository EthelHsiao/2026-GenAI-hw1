# 💛 LLM Otome Game

An LLM-powered otome game where you chat with three characters, build affection, and unlock special events.

---

## 🎮 Gameplay

Converse with three male characters. Your replies affect their affection level. Reach affection thresholds to unlock special interactions — dating, holding hands, hugging, kissing — and ultimately achieve conquest!

### Characters

| Character | Personality | Trait |
|-----------|-------------|-------|
| 🧊 Lu Chenxi | Cold engineering senior | Few words, strong action, obsessed with math |
| ☀️ Bai Ze | Sunny sports freshman | Energetic, emotionally direct, easily moved |
| 🌙 Si Ye | Mysterious art transfer student | Poetic speech, sharp observer |

---

## ✨ Features

### Required Features (HW Spec)

- **LLM Model Selection** — Switch between available models (Qwen 3.5 397B / Qwen 3.5 4B) in the Settings panel
- **Custom System Prompt** — Edit each character's system prompt directly via Developer Mode
- **Custom API Parameters** — Adjust Temperature, Max Tokens, and Top P freely in Settings
- **Streaming** — LLM responses stream token-by-token via Fetch SSE (OpenAI stream format)
- **Short-term Conversation Memory** — Each character maintains a sliding window of the last 10 messages as context for the LLM

### Core Gameplay

- **LLM-driven Characters** — Each character has a unique persona; AI responds in character
- **Affection System** — AI automatically adjusts affection (0–100) based on conversation quality; changes shown via toast notifications
- **Milestone Chronicle** — A timeline records key moments in each relationship

### Interactive Features

- **Suggested Replies** — After each AI response, 3 reply suggestions are auto-generated; click to send
- **Unlock Interaction Events** — Reach affection thresholds to trigger special story scenes (content varies each time)

  | Event | Unlock Condition |
  |-------|-----------------|
  | 🌸 Date | Affection ≥ 30 |
  | 🤝 Hold Hands | Affection ≥ 60 |
  | 🫂 Hug | Affection ≥ 85 |
  | 💋 Kiss | Affection ≥ 100 |

- **Conquest Ending** — Reaching 100 affection triggers a confession; the character generates a unique confession line 💛

### Personalization

- **User Persona** — Set a different self-introduction for each character so they "know" you
- **Per-character Settings** — Each character remembers your persona independently

### Developer Mode

- **Affection Slider** — Directly adjust affection via slider to quickly test each stage
- **System Prompt Editor** — Customize character persona and conversation rules
- **Character Reset** — Clear conversation history and affection

---

## 🛠 Tech Stack

| Category | Technology |
|----------|-----------|
| Frontend | React 19 + TypeScript |
| Build Tool | Vite 6 |
| State Management | Zustand 5 (with persist) |
| Styling | Tailwind CSS + shadcn/ui |
| LLM API | OpenAI-compatible API |
| Streaming | Fetch SSE (manual OpenAI stream parsing) |

---

## 🚀 Getting Started

### Install Dependencies

```bash
npm install
```

### Start Development Server

```bash
npm run dev
```

Open your browser at [http://localhost:5173](http://localhost:5173)

### Configure API Key

1. Click the ⚙️ Settings button in the top-right corner
2. Enter your API Key (Bearer Token)
3. Start chatting

> The API Key is stored only in your browser's `localStorage` and is never sent to any third party.

---

## 🔒 Security Notes

- **API Key** is stored in browser `localStorage` only — never committed to Git
- **`.env` files** are listed in `.gitignore` — never commit secrets
- The app proxies API requests through Vite's dev server proxy to avoid exposing the backend URL in client code

---

## 📁 Project Structure

```
src/
├── components/
│   ├── ChatArea/           # Chat area (message list, input, suggested replies)
│   ├── CharacterPanel/     # Left-side character selection panel
│   ├── SidePanel/          # Right-side affection, interaction events, chronicle
│   ├── ConquestOverlay.tsx # Conquest success overlay
│   ├── Navbar.tsx
│   └── SettingsModal.tsx   # Settings (including Developer Mode)
├── stores/
│   ├── gameStore.ts        # Main game state (characters, messages, streaming, affection)
│   └── settingsStore.ts    # API settings (key, model, parameters)
├── lib/
│   ├── anthropicApi.ts     # API calls (streaming + suggested reply generation)
│   ├── characters.ts       # Character defaults and prompt templates
│   └── affectionParser.ts  # Parse [AFFECTION_DELTA] markers from LLM output
└── types/
    └── index.ts            # Type definitions (including INTERACTIONS constants)
```

---

## 🎯 Affection Mechanism

The AI appends a hidden marker `[AFFECTION_DELTA:+N]` at the end of each response. The frontend parses it, updates the affection value, and strips the marker from the displayed message.

| Character | Affection Up | Affection Down |
|-----------|-------------|----------------|
| 🧊 Lu Chenxi | Understanding his loneliness or logic +3~5 | Mocking or interrupting -1~3 |
| ☀️ Bai Ze | Talking about shared interests +3~5 | Dampening his enthusiasm -3 |
| 🌙 Si Ye | Understanding his metaphors +3~5 | Forcing blunt explanations -1~2 |

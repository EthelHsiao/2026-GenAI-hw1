# 💛 LLM Otome Game — v2 SPEC

> **版本：** v2.0  
> **基礎：** 承接 HW1（React 19 + TypeScript + Zustand + shadcn/ui + Qwen OpenAI-compatible API）  
> **新增功能：** Long-term Memory、Multimodal、Auto Routing、Tool Use（Web Search + Diary）、TTS 語音朗讀  
> **Multimodal API：** Google Gemini 2.5 Flash（圖片輸入專用）；一般對話維持 Qwen（llama.sdc.nycu.club）

---

## 一、功能總覽

| # | 功能 | HW1 狀態 | v2 新增 |
|---|------|----------|---------|
| 1 | LLM 模型選擇 | ✅ | 擴充模型列表（加 Gemini 2.5 Flash） |
| 2 | System Prompt 客製化 | ✅ | 無變動 |
| 3 | API 參數調整 | ✅ | 無變動 |
| 4 | Streaming | ✅ | 無變動（tool use 回應不 stream） |
| 5 | Short-term Memory | ✅ | 升級為 Memory Pipeline |
| 6 | **Long-term Memory** | ❌ | ✅ 新增 |
| 7 | **Multimodal（圖片輸入）** | ❌ | ✅ 新增 |
| 8 | **Auto Routing** | ❌ | ✅ 新增 |
| 9 | **Tool Use — Web Search** | ❌ | ✅ 新增 |
| 10 | **Tool Use — Diary** | ❌ | ✅ 新增 |
| 11 | **TTS 語音朗讀** | ❌ | ✅ 新增（加碼） |

---

## 二、新功能詳細規格

---

### 2.1 Long-term Memory（長期記憶）

#### 目標
讓角色能「記得」幾週前的對話片段，超越 sliding window 的限制。

#### 設計原則
- **不替換** HW1 的 sliding window（保留最後 10 則作為 short-term context）
- **補充** 一個壓縮摘要層（long-term），注入 system prompt

#### 觸發條件
每當某角色的 `messages[]` 長度達到 **10 的倍數**（即 10、20、30…），自動對最舊的 10 則訊息執行一次摘要壓縮，壓縮完後把這 10 則從 messages 移除，只保留摘要。

#### 摘要 Prompt（發送給 LLM）
```
以下是「{characterName}」與玩家的一段對話記錄。
請用 3~5 句話，從「{characterName}」的第一人稱視角，
概述這段對話的重要事件、玩家說了什麼讓角色印象深刻的話，以及當時的情緒變化。
輸出純文字，不要加標題或條列符號。

對話記錄：
{dialogue}
```

#### 資料結構（新增至 `Character`）
```ts
interface MemoryEntry {
  id: string
  summary: string          // LLM 壓縮後的摘要文字
  timestamp: string        // 壓縮時間
  messageCount: number     // 這段摘要涵蓋幾則訊息
}

// Character 新增欄位：
memoryLog: MemoryEntry[]   // 最多保留 20 條摘要（先進先出）
```

#### System Prompt 注入格式
在角色 system prompt 末尾動態插入：
```
【你們的共同回憶】
（這些是你記得的過去對話片段，可以在對話中自然引用）
{memory_1}
{memory_2}
...
```
注入最新的 **5 條**摘要，避免 context 過長。

#### UI 變更
- 側欄新增「**回憶錄**」標籤頁（`MemoryLogPanel`）
- 列出所有 `MemoryEntry`，每條顯示：時間戳 + 摘要文字
- 壓縮進行中時顯示 `Summarizing...` toast

#### Zustand Store 變更
- `gameStore` 的 `partialize` 加入 `memoryLog`（持久化）
- 新增 action：`compressMemory(charId: CharId)`

---

### 2.2 Multimodal（圖片輸入）

#### 目標
玩家可以傳圖片給角色，角色以人格身份回應圖片內容。

#### 使用模型
**Google Gemini 2.5 Flash**（`gemini-2.5-flash-latest`）  
— 這是獨立的第二個 API，僅在有圖片時啟用；一般對話仍走 Qwen。  
— 使用 Google AI Studio 免費 API key（`VITE_GEMINI_API_KEY`）。

#### 雙 API 架構
```
有圖片 → callGeminiApi()  → https://generativelanguage.googleapis.com/v1beta/...
無圖片 → callQwenApi()    → https://llama.sdc.nycu.club/api/v1/...
```
兩個 function 都在 `src/lib/api.ts` 中，由 `resolveModel()` 決定走哪條路。

#### 圖片上傳 UI
- 聊天輸入框左側加相機圖示（`ImageIcon` from lucide-react）
- 點擊後觸發 `<input type="file" accept="image/*">`
- 上傳後在輸入框上方顯示縮圖預覽（最多 1 張）
- 可點 ✕ 移除預覽

#### 訊息顯示
- 使用者訊息泡泡：顯示縮圖（`max-h-40`）+ 文字（如有）
- 圖片不存入 `messages[]` 的 base64（太大）；改存 Object URL 作為預覽，base64 只在 API call 當下使用

#### Gemini API Call 格式
```ts
// src/lib/geminiApi.ts
export async function callGeminiApi(options: {
  apiKey: string
  systemPrompt: string
  messages: QwenMessage[]        // 歷史對話（純文字）
  userText: string
  imageBase64: string            // base64，不含 data: prefix
  imageMimeType: string          // 'image/jpeg' | 'image/png' | 'image/webp'
}): Promise<string> {
  const { apiKey, systemPrompt, messages, userText, imageBase64, imageMimeType } = options

  // Gemini 格式：把歷史對話轉成 contents array
  const historyContents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-latest:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [
          ...historyContents,
          {
            role: 'user',
            parts: [
              { inline_data: { mime_type: imageMimeType, data: imageBase64 } },
              { text: userText || '你覺得這張圖如何？' },
            ],
          },
        ],
        generationConfig: { maxOutputTokens: 1024, temperature: 0.9 },
      }),
    }
  )
  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}
```

#### Gemini API Key 設定
```
# .env.local
VITE_GEMINI_API_KEY=你的_google_ai_studio_key
```
在 Settings 面板新增「Gemini API Key」輸入框（獨立欄位，不與 Qwen key 混用）。

#### Auto Routing 聯動
有圖片 → 自動切換至 `gemini-2.5-flash`，走 `callGeminiApi()`（詳見 2.3）

#### 限制
- 最大圖片 size：4MB（前端驗證，超過則 toast 警告）
- 格式：jpg / png / webp / gif
- Gemini 的回應**不支援 streaming**（這次實作用 generateContent，非 streamGenerateContent，保持簡單）
- Affection Delta 解析維持原邏輯不變（Gemini 回應結尾一樣要輸出 `[AFFECTION_DELTA:±N]`，system prompt 裡注明）

---

### 2.3 Auto Routing（自動模型路由）

#### 目標
根據當前輸入/事件類型，自動選擇最合適的模型，不需玩家手動切換。

#### 路由規則表（前端決策，優先序由上至下）

| 優先序 | 條件 | 路由至 | API | 原因 |
|--------|------|--------|-----|------|
| 1 | 有圖片附件 | `gemini-2.5-flash` | Google Gemini API | 唯一支援視覺的模型 |
| 2 | 特殊事件觸發（約會/告白等） | `qwen35-397b` | Qwen API | 需要高品質情感文字生成 |
| 3 | Tool Use 觸發（search/diary） | `qwen35-397b` | Qwen API | 需要 function calling 能力 |
| 4 | 長期記憶壓縮摘要 | `qwen35-4b` | Qwen API | 摘要任務，輕量即可 |
| 5 | 一般對話 | `qwen35-4b`（預設） | Qwen API | 快速省 token |

> **注意：** 手動在 Settings 選擇的模型作為「一般對話預設」（規則 5）。規則 1-4 的路由會 override 手動選擇。  
> **注意：** `gemini-2.5-flash` 走完全不同的 API function（`callGeminiApi`），不是換個 model ID 而已。

#### 實作位置
新建 `src/lib/routing.ts`：
```ts
export type ApiBackend = 'qwen' | 'gemini'

export interface RoutingResult {
  model: ModelId
  backend: ApiBackend
}

export function resolveModel(context: RoutingContext): RoutingResult {
  const { hasImage, isSpecialEvent, usesTool, isMemorySummary, userSelectedModel } = context
  if (hasImage)         return { model: 'gemini-2.5-flash', backend: 'gemini' }
  if (isSpecialEvent)   return { model: 'qwen35-397b',      backend: 'qwen' }
  if (usesTool)         return { model: 'qwen35-397b',      backend: 'qwen' }
  if (isMemorySummary)  return { model: 'qwen35-4b',        backend: 'qwen' }
  return { model: userSelectedModel, backend: 'qwen' }
}
```

#### UI 顯示
- 聊天輸入框右側 / 送出按鈕旁顯示小 badge：`[qwen35-4b]`
- 每次 routing 決策後更新 badge
- badge 顏色：
  - `gemini-2.5-flash` → 紫色（視覺模型）
  - `qwen35-397b` → 橙色
  - `qwen35-4b` → 藍色

#### 新增 ModelId（`src/types/index.ts`）
```ts
export type ModelId =
  | 'qwen35-397b'
  | 'qwen35-4b'
  | 'qwen-vl-plus'   // 新增
```

---

### 2.4 Tool Use — Web Search

#### 目標
角色可以主動搜尋時事，讓對話內容更豐富有時效性。

#### 工具定義
```ts
const webSearchTool = {
  type: 'function',
  function: {
    name: 'web_search',
    description: '搜尋網路上的最新資訊，當玩家詢問近期新聞、天氣、賽事結果等時使用',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜尋關鍵字，用繁體中文或英文',
        },
      },
      required: ['query'],
    },
  },
}
```

#### API Call 流程（兩階段，不 stream）
```
Step 1: 傳訊息 + tools 定義 → LLM 回傳 tool_calls
Step 2: 執行 web_search(query) → 呼叫 DuckDuckGo Instant Answer API（免費，無需 key）
        → 取得結果 → 以 role: 'tool' 回傳給 LLM
        → LLM 產生最終角色回應（這步 stream）
```

#### 搜尋 API
使用 **DuckDuckGo Instant Answer API**：
```
GET https://api.duckduckgo.com/?q={query}&format=json&no_html=1&skip_disambig=1
```
免費、無需 key、CORS 支援（部分情況需 proxy，詳見備注）

> **備注：** 若 DuckDuckGo CORS 有問題，改用 [SerpAPI 免費方案](https://serpapi.com/)（100 次/月），需 API key。建議在 Settings 加一欄 `searchApiKey`（可選）。

#### UI 顯示
- Tool 執行中：顯示 `🔍 搜尋中：{query}...` 的 loading 泡泡
- 搜尋完成後：角色回應泡泡底部顯示小字 `📡 資料來源：DuckDuckGo`

#### 角色人格整合
搜尋結果注入 tool result 後，LLM 仍會以角色人格語氣回應：
- 陸晨曦：「搜了一下，結果如下…（話少版）」
- 白澤：「哇！我剛查了一下！」
- 司夜：把搜尋結果包裝成詩意敘述

---

### 2.5 Tool Use — Character Diary

#### 目標
每個角色擁有自己的日記本，LLM 可以自主決定何時寫日記、讀日記，強化角色自我一致性，並與長期記憶互補。

#### 工具定義
```ts
const diaryTools = [
  {
    type: 'function',
    function: {
      name: 'write_diary',
      description: '將今天發生的重要事情或感受寫入日記。當對話中有讓角色印象深刻的事時使用。',
      parameters: {
        type: 'object',
        properties: {
          entry: {
            type: 'string',
            description: '日記內文，以角色第一人稱書寫，100字以內',
          },
        },
        required: ['entry'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_diary',
      description: '讀取自己最近的日記，回憶過去的事情。當玩家提到過去某件事，或角色想確認某段記憶時使用。',
      parameters: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: '要讀取幾條最近的日記，預設 3，最多 5',
          },
        },
        required: [],
      },
    },
  },
]
```

#### 資料結構（新增至 `Character`）
```ts
interface DiaryEntry {
  id: string
  entry: string       // 日記內文
  timestamp: string   // 寫入時間
}

// Character 新增欄位：
diary: DiaryEntry[]   // 最多保留 30 條（先進先出）
```

#### API Call 流程
與 Web Search 相同的兩階段非 stream 模式：
- `write_diary`：在 Zustand store 新增一條 `DiaryEntry`，回傳 `{ success: true, message: '日記已寫入' }`
- `read_diary`：從 store 取最近 N 條，回傳 JSON 格式的日記列表

#### UI 顯示
- 寫日記時：訊息泡泡旁顯示小圖示 📓 `{角色名} 寫了日記`
- 讀日記時：顯示 📖 `{角色名} 翻了翻日記`
- 側欄新增「**日記本**」標籤頁（`DiaryPanel`），列出所有日記條目

#### Zustand Store 新增 actions
```ts
addDiaryEntry(charId: CharId, entry: string): void
getDiaryEntries(charId: CharId, limit: number): DiaryEntry[]
```

---

### 2.6 TTS 語音朗讀（加碼功能）

#### 目標
角色每次回應後，可以朗讀文字，增加沉浸感。

#### 實作方案
使用瀏覽器原生 **Web Speech API**（`SpeechSynthesis`），零成本、零依賴。

```ts
// src/lib/tts.ts
export function speak(text: string, lang = 'zh-TW') {
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = lang
  utterance.rate = 0.9
  window.speechSynthesis.cancel()  // 取消上一則
  window.speechSynthesis.speak(utterance)
}
```

#### UI
- 每個 assistant 訊息泡泡右下角：🔊 小按鈕
- 點擊播放/停止
- Settings 面板加一個「自動朗讀」開關（預設關閉）

#### 限制說明
- 不同瀏覽器音色不同（Chrome 最好）
- 中文語音品質依系統而定
- 不支援 streaming 朗讀（等完整回應後才朗讀）

---

## 三、TypeScript 型別變更（`src/types/index.ts`）

```ts
// 新增 ModelId
export type ModelId =
  | 'qwen35-397b'
  | 'qwen35-4b'
  | 'gemini-2.5-flash'   // 新增（Multimodal 用，走 Google API）

// 新增 MemoryEntry
export interface MemoryEntry {
  id: string
  summary: string
  timestamp: string
  messageCount: number
}

// 新增 DiaryEntry
export interface DiaryEntry {
  id: string
  entry: string
  timestamp: string
}

// Message 新增欄位
export interface Message {
  // ...原有欄位...
  imagePreviewUrl?: string   // 圖片訊息用（Object URL）
  toolName?: string          // tool use 訊息標記（'web_search' | 'write_diary' | 'read_diary'）
  toolQuery?: string         // 搜尋關鍵字 / diary 操作說明
}

// Character 新增欄位
export interface Character {
  // ...原有欄位...
  memoryLog: MemoryEntry[]
  diary: DiaryEntry[]
}

// Settings 新增欄位
export interface Settings {
  // ...原有欄位...
  geminiApiKey: string   // Google AI Studio key，圖片輸入時使用
  searchApiKey: string   // 選填，SerpAPI key
  autoTts: boolean       // 自動朗讀開關
}

// Routing Context
export interface RoutingContext {
  hasImage: boolean
  isSpecialEvent: boolean
  usesTool: boolean
  isMemorySummary: boolean
  userSelectedModel: ModelId
}

// AVAILABLE_MODELS 更新（Settings 下拉選單，只顯示 Qwen 的兩個；Gemini 由 routing 自動決定，不手動選）
export const AVAILABLE_MODELS: { value: ModelId; label: string }[] = [
  { value: 'qwen35-397b',     label: 'Qwen 3.5 397B' },
  { value: 'qwen35-4b',       label: 'Qwen 3.5 4B' },
]
// gemini-2.5-flash 不在手動選單裡，只由 routing 自動路由觸發
```

---

## 四、新增檔案結構

```
src/
├── lib/
│   ├── characters.ts        ✏️ 修改：DEFAULT_CHARACTERS 加 memoryLog/diary 初始值
│   ├── routing.ts           🆕 resolveModel() → RoutingResult { model, backend }
│   ├── geminiApi.ts         🆕 callGeminiApi()（圖片輸入專用）
│   ├── tts.ts               🆕 speak()
│   ├── tools.ts             🆕 工具定義 + executeToolCall()
│   └── anthropicApi.ts      ✏️ 修改：加 tool use 兩階段流程
├── stores/
│   ├── gameStore.ts         ✏️ 修改：加 memoryLog/diary actions、compressMemory()
│   └── settingsStore.ts     ✏️ 修改：加 geminiApiKey / searchApiKey / autoTts
├── components/
│   ├── ChatInput.tsx         ✏️ 修改：加圖片上傳、model badge
│   ├── MessageBubble.tsx     ✏️ 修改：加圖片顯示、tool 圖示、TTS 按鈕
│   ├── MemoryLogPanel.tsx    🆕 回憶錄側欄
│   ├── DiaryPanel.tsx        🆕 日記本側欄
│   └── SidebarTabs.tsx       ✏️ 修改：加「回憶錄」「日記本」tab
└── types/
    └── index.ts              ✏️ 修改：如第三節所列
```

---

## 五、API Call 統一流程

```
使用者送出訊息
      ↓
resolveModel(context) → 決定模型
      ↓
      ┌─────────────────────────────────────────┐
      │ hasImage?                               │
      │   YES → multimodal content array       │
      │   NO  → string content                 │
      └─────────────────────────────────────────┘
      ↓
      ┌─────────────────────────────────────────┐
      │ isSpecialEvent or normalChat?           │
      │   special → no tools, stream ON         │
      │   normal  → attach tools, stream OFF   │
      │             → wait for tool_calls       │
      │             → execute tools locally    │
      │             → send tool results         │
      │             → final response, stream ON │
      └─────────────────────────────────────────┘
      ↓
解析 [AFFECTION_DELTA:±N]
      ↓
更新 Zustand state
      ↓
檢查是否需壓縮記憶（messages.length % 10 === 0）
      ↓
autoTts? → speak()
```

---

## 六、MVP Checklist（建議實作優先序）

### Phase 1 — 地基（不影響現有功能）
- [ ] 更新 `types/index.ts`（加新型別，`ModelId` 加 `gemini-2.5-flash`）
- [ ] 新增 `src/lib/routing.ts`（回傳 `RoutingResult`）
- [ ] `AVAILABLE_MODELS` 保持只有兩個 Qwen 選項（Gemini 由 routing 自動）
- [ ] 更新 `DEFAULT_CHARACTERS`（加 `memoryLog: [], diary: []`）
- [ ] `settingsStore` 加 `geminiApiKey`
- [ ] `gameStore` 加 diary/memory actions

### Phase 2 — 核心功能
- [ ] Auto Routing：`resolveModel()` 整合進 `sendMessage()`
- [ ] Model Badge UI（ChatInput）
- [ ] Long-term Memory：`compressMemory()` + 注入 system prompt
- [ ] MemoryLogPanel UI

### Phase 3 — Tool Use
- [ ] `src/lib/tools.ts`：工具定義 + `executeToolCall()`
- [ ] Web Search（DuckDuckGo API）
- [ ] Character Diary（write/read）
- [ ] DiaryPanel UI
- [ ] MessageBubble 加 tool 圖示

### Phase 4 — Multimodal
- [ ] 新增 `src/lib/geminiApi.ts`（`callGeminiApi()`）
- [ ] Settings 加 Gemini API Key 輸入欄位
- [ ] ChatInput 加圖片上傳按鈕 + 縮圖預覽
- [ ] MessageBubble 加圖片縮圖顯示
- [ ] `sendMessage()` 整合：有圖片時 → `callGeminiApi()`

### Phase 5 — 加碼 & polish
- [ ] TTS（`tts.ts` + 按鈕 + 自動朗讀設定）
- [ ] Settings 加 `searchApiKey` / `autoTts`
- [ ] SidebarTabs 整合所有新 panel

---

## 七、Demo 腳本建議（3-5 分鐘影片）

1. **(0:00-0:30)** 開場：簡介 v2 新功能列表
2. **(0:30-1:30)** 與白澤對話，問他「最近有什麼好看的比賽？」→ 展示 Web Search 觸發、badge 切換至 397B
3. **(1:30-2:30)** 傳一張食物照片給白澤 → 展示 Multimodal、badge 切換至 Gemini（紫色）
4. **(2:30-3:30)** 連續對話到第 10 則 → 展示 Long-term Memory 壓縮動畫 → 開「回憶錄」面板
5. **(3:30-4:00)** 打開「日記本」面板，看白澤寫的日記
6. **(4:00-4:30)** 點 🔊 TTS 按鈕，角色朗讀回應
7. **(4:30-5:00)** 開 Dev Mode 展示 routing 規則說明，結尾

---

## 八、注意事項 & 已知限制

| 項目 | 說明 |
|------|------|
| Tool Use + Streaming | Tool Use 兩階段中，第一次 LLM call（決定用哪個工具）**不 stream**；最終角色回應才 stream |
| 圖片 base64 大小 | 大圖轉 base64 後 payload 很大，建議前端壓縮到 800px 以內再傳 |
| Gemini 不 stream | `callGeminiApi()` 使用 `generateContent`（非串流版），等完整回應後才顯示 |
| Gemini API Key 保護 | 務必存在 `.env.local`，不可 commit 到 GitHub；`.gitignore` 確認有 `.env*` |
| DuckDuckGo CORS | 部分環境有 CORS 問題，建議本地開發時用 Vite proxy，或改用 SerpAPI |
| Web Speech API | Firefox 支援度較差，建議 demo 使用 Chrome |
| 記憶壓縮時機 | 壓縮是非同步的，壓縮期間玩家仍可繼續對話 |
# Resignation Letter - "Improve with AI"

How the "Improve with AI" control works in the resignation-letter builder, and
the exact prompt sent to the model. This applies to every place the control
appears: the Reason step, the Gratitude step, the Assistance step, and the
Letter content editor in Write mode. All of them route through the same
`improveText` AI task.

Page where it is most visible: `/resignation-letters/write/reason`.

---

## 1. What the user sees

Inside the rich-text editor toolbar there is a purple "Improve with AI" button
with a sparkle icon and a chevron. Clicking it opens a dropdown of four actions:

| Action | What it does |
| --- | --- |
| Improve phrasing | Rewrites word choice while keeping the meaning |
| Improve grammar | Fixes spelling and grammar, keeps the meaning |
| More friendly | Warmer, friendlier, more approachable tone |
| More professional | More formal, professional tone |

Picking an action rewrites the current paragraph in place. The right-hand live
preview updates at the same time, because it reads the same store field.

---

## 2. Step-by-step data flow

1. The paragraph lives in the store as HTML (`reasonText` for the Reason step,
   `gratitudeText`, `assistanceText`, or `letter.body` elsewhere).
2. The user opens the dropdown and clicks an action. Each action carries a
   plain-English `instruction` string (see the table above).
3. `ImproveWithAIMenu.run(instruction)` runs:
   - Converts the paragraph HTML to plain text with `htmlToText(html)`.
   - If the text is empty, it stops (nothing to improve).
   - Sets a busy state (the button shows a spinner) and calls
     `improveLetterBody(plainText, instruction)`.
4. `improveLetterBody` calls the shared client helper
   `callAi("improveText", { text, instruction })`, which does a
   `POST /api/ai` with `{ task: "improveText", payload: { text, instruction } }`.
5. The server route builds the prompt (Section 3), calls Gemini, and returns
   `{ data: improvedText }` on success or `{ fallback: true }` if it cannot run.
6. Back in the client:
   - On success, the improved plain text is turned back into HTML with
     `bodyToHtml(...)` and written to the store via `onResult` (for the Reason
     step, `setReasonText`). Writing to the store also marks the paragraph as
     manually touched, so later answer changes no longer re-seed it.
   - On `fallback` / any failure, `improveLetterBody` returns `null` and
     `onResult` is never called, so the paragraph is left exactly as it was
     (a safe no-op, never an error toast).
7. The live preview re-renders from the updated store field.

---

## 3. The system prompt

There is no separate "system role" message. The Gemini `generateContent`
endpoint is called with a single combined prompt (one text part), so that
prompt is effectively the system and user prompt together. It is assembled in
`buildPrompt`, case `"improveText"`.

Prompt template (with the two runtime values shown as placeholders):

```
{instruction}. Keep it professional and warm. Return ONLY the revised text as plain text - no markdown, no preamble, no quotes, preserve paragraph breaks.

Text:
"""{paragraph plain text}"""
```

- `{instruction}` is one of the four action strings:
  - `Improve the phrasing and word choice while keeping the original meaning`
  - `Fix any spelling and grammar mistakes, keeping the original meaning`
  - `Rewrite this in a warmer, friendlier and more approachable tone`
  - `Rewrite this in a more formal, professional tone`
- `{paragraph plain text}` is the current paragraph, stripped of HTML.
- If no instruction is supplied, the route defaults to
  `Improve the writing while keeping the original meaning`.

The prompt has two jobs: apply the chosen instruction, and constrain the output
so it drops straight back into the editor (plain text only, no markdown, no
preamble or surrounding quotes, paragraph breaks preserved).

---

## 4. Model and generation settings

- Model: `gemini-2.5-flash` (override with the `GEMINI_MODEL` env var).
- Temperature: `0.8` (no file is attached for this task).
- Response type: plain text (`json: false`).
- Reliability: up to 3 attempts with backoff on transient errors
  (HTTP 429 / 500 / 503, `RESOURCE_EXHAUSTED`, `UNAVAILABLE`, "overloaded").
- The API key (`GEMINI_API_KEY`) is read server-side only and never reaches the
  browser.

---

## 5. Fallback behavior (no API key)

If `GEMINI_API_KEY` is not set, or generation fails after retries, the route
returns `{ fallback: true }`. For this feature there is no canned replacement
text, so `improveLetterBody` returns `null` and the paragraph is simply left
unchanged. The app keeps working; the button just does nothing visible beyond
the brief spinner. (This differs from full-letter generation, which does have a
deterministic template fallback.)

---

## 6. File reference map

| Concern | File |
| --- | --- |
| Dropdown menu + click handler (Reason/Gratitude/Assistance) | `src/components/resignation-letter/steps.tsx` (`ImproveWithAIMenu`) |
| Dropdown menu + click handler (Write-mode body editor) | `src/components/resignation-letter/write-mode.tsx` (`ImproveWithAI`) |
| The four actions and their instruction strings | `src/components/resignation-letter/widgets.tsx` (`IMPROVE_AI_ACTIONS`) |
| Client AI helper for this feature | `src/lib/resignation-letter/ai.ts` (`improveLetterBody`, `callAi`) |
| HTML / plain-text conversion | `src/lib/resignation-letter/format.ts` (`htmlToText`, `bodyToHtml`) |
| Server prompt + Gemini call | `src/app/api/ai/route.ts` (task `"improveText"`) |

---

## 7. Notes

- The same `improveText` task backs the "Improve with AI" control everywhere in
  the resignation-letter builder, so tone and behavior stay consistent across
  the Reason, Gratitude, Assistance, and full-body editors.
- The source prompt string in `route.ts` currently uses an em-dash between
  "plain text" and "no markdown". Per the project's no-em-dash rule that should
  be a hyphen; it is reproduced here as a hyphen.

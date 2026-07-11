# Edit with AI - Employment history

How the "Edit with AI" dropdown works on `/resumes/write/work`, what each of the
four options actually sends to the model, and what the rewrite looks like before
and after.

## Where it lives

| Concern | File |
|---------|------|
| The dropdown + the four presets | `src/components/editor/sections/ai-edit.tsx` |
| Bullet extraction, preview panel, apply | `src/components/editor/sections/employment-history.tsx` |
| Client call + fallback handling | `src/lib/ai/mock.ts` (`rewriteBullets`) |
| Server prompt | `src/app/api/ai/route.ts` (task `rewriteBullets`) |

The same menu is reused by Professional summary, but that section routes to the
`improveText` task instead (free text in, free text out) via `rewriteText`.

## The four options

Three are fixed presets defined in `AI_PRESETS`; the fourth opens a text input
and sends whatever the user types as the instruction verbatim.

| Option | Icon | Instruction sent to the model |
|--------|------|------------------------------|
| Improve | `Pencil` | "Make it stronger, more impactful and action-driven, quantifying results where it reads naturally." |
| More human | `Smile` | "Make it sound more natural and human - warmer and less robotic or buzzword-heavy - while staying professional." |
| Shorter | `Shrink` | "Make it more concise: tighten the wording and cut filler while keeping the key impact." |
| Ask AI to... | `Sparkles` | The user's own sentence, e.g. "Rewrite these for a Director of Demand Gen role" |

Everything else about the call is identical across the four. Only the
`Instruction:` line of the prompt changes.

## Workflow

```
User clicks "Edit with AI" in the rich-text toolbar
   |
   v
htmlToBullets(entry.description)
   parses <li> items out of the description HTML
   (falls back to newline-split plain text if there is no <ul>)
   |
   +--> 0 bullets? -> toast "Add a few bullet points first" -> stop
   |
   v
User picks Improve | More human | Shorter | Ask AI to...
   |
   v
generate(instruction)
   setPreview([])   -> preview panel opens in its "Generating..." state
   setEditing(true) -> trigger shows a spinner, menu is disabled
   |
   v
rewriteBullets({ bullets, instruction, jobTitle })  [src/lib/ai/mock.ts]
   |
   v
POST /api/ai  { task: "rewriteBullets", payload: { bullets, instruction, jobTitle } }
   |
   +--> no GEMINI_API_KEY -> { fallback: true } -> callAi returns null
   |                          -> toast "Couldn't reach AI", panel closes
   |
   v
Gemini returns a JSON array of strings, one rewritten bullet per original
   |
   v
Preview panel renders the new bullets (dashed purple card, sparkle badge)
   |
   +--> "Rewrite"  -> re-runs the SAME instruction with a reroll hint appended:
   |                  "Give a fresh alternative phrasing, different from a
   |                   previous attempt." Panel stays open, keeps its position.
   |                  (Picking a DIFFERENT option here re-runs fresh, no hint.)
   |
   +--> "X" close  -> discards, description untouched
   |
   +--> "Use"      -> bulletsToUl(preview) -> updateEmployment(id, { description })
                      toast "Bullet points updated"
```

Key points:

- **Nothing is written until you press "Use".** The rewrite is a preview; the
  original description stays in the store the whole time. Closing the panel is a
  free undo.
- **The whole bullet list goes in together**, not one bullet at a time, so the
  model can merge two weak bullets into one strong one. The prompt allows
  "one rewritten bullet per original, or fewer if merging tightens them."
- **Truthfulness is enforced in the prompt**, not in code: "keep every fact
  truthful - do NOT invent companies, metrics, or responsibilities that aren't
  implied by the originals."
- **Failure is loud, not silent.** `rewriteBullets` returns `null` (rather than
  echoing the input back) when the server signals fallback or the array is
  empty, so the user sees an error toast instead of an unchanged list that looks
  like the AI did nothing.
- The job title is passed as context so the rewrite is phrased for the role
  ("Rewrite the following resume bullet points for a Senior Marketing Manager").

## Before and after

Source: the CWF Restoration entry in the screenshot. The bullets below are the
"before" as they exist in the editor. The "after" columns are illustrative of
what each instruction asks the model to produce - they are written to the same
rules the prompt enforces, not captured from a live model run.

### Before (current employment history)

Senior Marketing Manager, CWF Restoration - Jan 2022 to Present, New York, NY

- Lead integrated marketing strategy across paid search, paid social, email, content, and local campaigns to increase qualified leads and revenue.
- Improved marketing-sourced revenue contribution from 30% to 46% by refining campaign targeting, landing pages, lead nurturing, and sales handoff.
- Managed annual marketing budget of $750K, reallocating spend based on conversion rate, pipeline value, and channel ROI.
- Built automated reporting dashboards using Google Analytics, GA4, and CRM data to track campaign performance, funnel health, and sales pipeline impact.
- Led a team of 5 across content, design, paid media, and marketing operations while coordinating closely with sales leadership and external vendors.

### After: Improve

Stronger verbs, outcome first, existing numbers pulled to the front. No new
metrics are invented - $750K, 30% to 46%, and the team of 5 all came from the
original.

- Directed integrated marketing strategy across paid search, paid social, email, content, and local campaigns, driving sustained growth in qualified leads and revenue.
- Grew marketing-sourced revenue contribution from 30% to 46% by sharpening campaign targeting, rebuilding landing pages, and tightening lead nurturing and sales handoff.
- Owned a $750K annual marketing budget, reallocating spend against conversion rate, pipeline value, and channel ROI to maximize return.
- Launched automated GA4 and CRM reporting dashboards that gave leadership real-time visibility into campaign performance, funnel health, and pipeline impact.
- Led a 5-person team across content, design, paid media, and marketing operations, partnering with sales leadership and external vendors to align on revenue targets.

### After: More human

Same facts, buzzwords stripped ("integrated marketing strategy", "sales
handoff"), plainer sentence rhythm. Still third-person and resume-appropriate.

- Run marketing end to end - paid search, paid social, email, content, and local campaigns - to bring in better leads and more revenue.
- Took marketing's share of revenue from 30% to 46% by fixing who we targeted, rewriting the landing pages, and smoothing the handoff to sales.
- Managed a $750K yearly budget, moving money to the channels that were actually converting and filling the pipeline.
- Set up dashboards in GA4 and the CRM so the team could see what campaigns were doing without waiting on a monthly report.
- Lead a team of 5 across content, design, paid media, and ops, and work closely with sales leadership and outside vendors.

### After: Shorter

Filler cut, five bullets tightened to four by merging the two that both describe
budget and reporting discipline. Every number survives.

- Lead integrated marketing across paid search, paid social, email, content, and local campaigns.
- Grew marketing-sourced revenue from 30% to 46% through sharper targeting, landing pages, and lead nurturing.
- Own a $750K budget and the GA4 and CRM dashboards used to reallocate spend by conversion rate, pipeline value, and ROI.
- Lead a team of 5 across content, design, paid media, and operations.

### After: Ask AI to... "Rewrite these for a Director of Demand Generation role"

The free-form instruction reframes the emphasis toward pipeline ownership and
scope - without adding scope the candidate does not have.

- Own demand generation across paid search, paid social, email, content, and local campaigns, from strategy through pipeline contribution.
- Lifted marketing-sourced revenue from 30% to 46% by rebuilding the demand funnel: targeting, landing pages, nurture tracks, and sales handoff.
- Allocate a $750K demand-gen budget against pipeline value and channel ROI, reforecasting spend on conversion performance.
- Built the GA4 and CRM reporting layer that ties campaign spend to funnel health and closed revenue.
- Manage a 5-person demand-gen team spanning content, design, paid media, and marketing operations, in lockstep with sales leadership.

## What the model is not allowed to do

From the server prompt in `route.ts`:

1. No invented companies, metrics, or responsibilities.
2. ATS-friendly phrasing; every bullet starts with a strong action verb.
3. Concrete and outcome-focused.
4. Return a JSON array of strings - no markdown, no numbering, no bullet glyphs.

If the model returns anything else, `rewriteBullets` filters non-strings, trims,
drops empties, and returns `null` if nothing usable survives. The UI then shows
"Couldn't reach AI" rather than corrupting the entry.

## Related surfaces

- **Suggested bullet points** (below the editor) is a different feature: it calls
  `improveBullets` -> task `bullets` to generate *new* ideas from the job title,
  each with a "+" to append. It never touches what you already wrote.
- **Good length** badge (`lengthInfo`) is pure word count on the stripped HTML:
  under 12 words is "Too short", 12 to 140 is "Good length", above is "Too long".
  It does not call the AI.

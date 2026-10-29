# The export paywall

## What was wrong

The free tier allows 3 distinct documents per kind. That allowance was counted
entirely in the browser:

```js
// permissions/resume-download-gate.ts, before
export function canDownload(kind, id) {
  if (usePaywall.getState().premium) return true;              // localStorage
  const ids = useDownloadGate.getState().downloadedIds[kind];  // localStorage
  if (id && ids.includes(id)) return true;
  return ids.length < FREE_RESUME_LIMIT;
}
```

Both inputs lived in `localStorage` — `resume-co:downloads` and
`resume-co:paywall`. **Clearing site data reset the counter**, so the free tier
was in practice unlimited and the paywall created no reason to subscribe. No
server call was involved in the decision, and nothing on the server could say
no.

Worth noting what was *not* broken: the free **resume-count** limit (how many
resumes you may keep) has always been re-checked in `PUT /api/documents`. Only
the download allowance was fictional.

## What it is now

| Piece | Role |
| --- | --- |
| `document_downloads` (migration `0004`) | One row per (account, kind, document) |
| `permissions/download-ledger.ts` | The decision, server-side, in a transaction |
| `POST /api/export/authorize` | Authorize + record, in one call |
| `GET /api/export/authorize` | Read-only history, for "downloaded" badges |
| `permissions/resume-download-gate.ts` | Client caller + badge cache only |

Every download button now does:

```ts
const authorized = await authorizeResumeDownload(id);
if (!authorized.ok) {
  if (authorized.shouldUpsell) router.push("/payment");
  else toast.error(EXPORT_UNAVAILABLE);
  return;
}
await downloadResume();
```

## Decisions worth knowing about

**Check and record are one operation.** A separate "may I?" then "I did" lets a
client fire several requests at once, pass the check in all of them before any
records, and spend one slot many times. The insert doubles as the
"did this already exist?" probe (`on conflict do update … returning count`), so
two concurrent calls cannot both see a new row. Verified against the real
database: three concurrent requests with two of three slots used allow exactly
one, and the ledger lands exactly on the limit.

**The client fails CLOSED.** This is the decision the whole phase rests on. An
unreachable endpoint is a refusal, not an approval — failing open would mean one
ad-blocker rule against `/api/export/authorize` restores the unlimited free
tier, with no developer tools and no patched JavaScript. The server's error path
fails closed for the same reason: "allowed whenever the ledger errors" is an
invitation to make it error.

**A refusal is not always an upsell.** `shouldUpsell` separates "your allowance
is spent" from "we couldn't reach the server". A subscriber who hits a dropped
connection must not be shown an upgrade page — that reads as *your subscription
is gone*. Those get a retry message instead.

**The dev escape hatch lives on the server, not the client.** With no
`DATABASE_URL` the server answers `allowed: true, reason: "unconfigured"`, so
local file-store development works unchanged. Putting that fallback in the
client's error handler instead would have been a bypass shipped to production.

**The slot is spent on authorization, not on success.** If PDF generation then
fails, the document is already in the ledger — which makes retrying *that same
document* free, because repeats never cost a slot. So a failed export costs
nothing to retry; it only matters if the user abandons that document entirely.
That seemed the better trade against a reserve/confirm handshake, which would
add a second endpoint and a leak whenever the confirm never arrives.

**Repeats stay free, and premium is still recorded.** Re-exporting something you
already exported has always been free, and the allowance counts distinct
documents rather than downloads. Premium downloads are recorded too, so the
history survives a lapsed subscription and a downgrade does not silently hand
back slots.

## The limit of this, stated plainly

The PDF is still rendered in the browser, by `html2canvas-pro` + `jspdf`, from
data the user typed in. So this does **not** make exporting cryptographically
impossible, and it is not claimed to. Someone willing to edit the page's
JavaScript can still produce a file, and anyone can print the live preview.

What it does make real is the **allowance**: it is counted on the server,
against the account, and cannot be reset by clearing site data. That was the
live revenue leak, and it is closed.

Making the artifact itself gated would mean rendering the PDF server-side —
a headless browser, the whole template CSS reproduced server-side, cold starts,
and different pagination from what users currently get. It is deliberately not
done here: it is a large, output-changing piece of work, and it would not stop
the print-the-preview route either. Flagged rather than hidden.

## Configuration

Nothing required. Optional:

```
EXPORT_RATE_LIMIT=60    # authorize calls per account per minute
```

As with every other limit, this is per-instance in memory unless
`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` are set.

## Manual test

1. Sign in to a free account with a database configured.
2. Download three different resumes. All succeed.
3. Download a fourth, different resume. You land on `/payment`.
4. **Clear site data and reload.** Try the fourth again — still refused. That is
   the whole point; before this change it would have succeeded.
5. Re-download one of the first three. Free, no upsell.
6. In devtools, block `/api/export/authorize` and click Download: refused with
   a retry message, and no navigation to `/payment`.

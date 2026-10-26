# Stitch Screen Briefs — Resumewriter.ai

> SCOPE NOTE (updated): the build scope is now POLISH-ONLY on the existing app — no
> sidebar and no re-layout. These briefs describe a navy-sidebar redesign, which was
> exploration only and is NOT what we build. Keep this file just for exploring looks in
> Stitch; the real work is the in-place blue+white polish in `design-system.md`.

Ready-to-paste prompts for Google Stitch (labs.google.com/stitch), one per screen.

How to use:

1. First paste the design language from [`stitch-design.md`](./stitch-design.md) (or set
   it once as the project's design context / theme).
2. Then start a new screen and paste ONE brief block below.
3. Attach a reference image if you have it: screenshot the matching page in the preview
   (https://resumes-coverletters-r-git-e276df-john-mayers-projects-b5ac6a11.vercel.app/) and/or the live
   app at localhost:3001.
4. Generate, refine in Stitch, then export. Treat the output as VISUAL reference — we
   rebuild it against the real tokens/components; routes, stores, and the resume-document
   carve-out stay intact.

Shell note: screens marked [SHELL] include the persistent navy sidebar. Screens marked
[FOCUSED] have no sidebar (chrome-light). Screens marked [PUBLIC] are signed-out, no shell.

Palette to set in Stitch's theme: primary #2563EB, primary-strong #1D4ED8, tint #ECF3FF,
sidebar navy #0A1730 to #122A5E, canvas #F5F7FB, surface #FFFFFF, ink #0D1526, steel
#61708C, hairline #E3E8F1, success #16A34A, danger #DC2626. Fonts: Gabarito (headings),
Inter (body), Geist Mono (numbers).

---

## 1. Dashboard [SHELL]

Design a SaaS dashboard for a resume-building app, blue and white, with a persistent
252px deep-navy left sidebar (gradient #0A1730 to #122A5E). Sidebar groups: Workspace
(Dashboard active, Resumes, Cover letters, Resignation, Jobs, Interview prep), Create
(Resume editor, Templates & design), Account (Settings, Subscribe); a user chip pinned at
the bottom (avatar initial "K", name, email). Active nav item is filled with a 3px blue
left indicator bar. Content area on canvas #F5F7FB, centered, max-width 1200px.

Content, top to bottom: (1) a navy welcome band with a small uppercase blue eyebrow
"Welcome back", a Gabarito heading "Good afternoon, Keshav", a line "You're 72% through
your Senior Software Engineer resume", and a white primary button "Continue editing".
(2) A row of five selectable stat tiles, each a white card with a blue-tint icon tile, a
big monospaced count, and a label: Resumes 3, Cover letters 2, Resignations 1, Saved jobs
6, Prep sets 4; one tile shows a small green "+2". (3) Section "Continue where you left
off" with three list rows (icon, title, meta like "Resume - edited 3 hr ago - 72%
complete", and Edit + Delete icon buttons). (4) A "Quick actions" row of three cards:
Build a resume, Write a cover letter, Practice interview, each with a blue gradient icon
tile and an arrow. Numbers monospaced. No emoji. Single blue accent, flat.

---

## 2. Resume editor [FOCUSED]

Design a three-pane resume editor, blue and white, no sidebar. Top bar: a home icon
button, a segmented tab control [Write | Design | Improve] with Write active (dark fill),
a blue "72% complete" pill, and on the right a white "Share" button and a blue "Download
PDF" button. Under the top bar, a thin blue progress meter at 72%.

Left pane: a section nav card listing Heading, Experience (active, blue-tint), Summary,
Skills, Education, each with a small completion dot (green done, grey todo). Center pane:
a white rounded panel titled "Experience" with form fields in a 2-column grid (Job title
"Lead Engineer", Employer "Acme Corp", Location "Bengaluru, India", Dates "2021 -
Present"), a Highlights textarea, and a blue-tint "AI suggestion" box with a rewritten
bullet and Apply + Rewrite buttons. Right pane: a "Live preview" card showing a small
neutral black-on-white resume document (serif, ATS-safe) with a caption "Document colors
stay neutral and ATS-safe - independent of the app theme". Inputs: label above, blue
focus ring. No emoji, no serif in the chrome (serif only inside the preview document).

---

## 3. Jobs [SHELL]

Design a job-search page inside the navy-sidebar shell, blue and white, two-column
master/detail. Header: Gabarito title "Top picks for you", subtitle "Scored against your
Senior Software Engineer resume", and a "6 saved" outline pill.

Left column (max 420px): a vertical list of job cards; each card has a colored square
company monogram, job title, "Company - location", a monospaced meta line (Full-time -
$180k-$220k), and a circular match-score ring showing a monospaced percent. The selected
card has a blue border + ring. Examples: Stripe 92, Linear 84, Vercel 79, Notion 71.
Right column (sticky): the selected job detail - big monogram, title, "Stripe - Remote -
Posted 2 days ago", a filled-heart save button, a row of tags (blue "92% match",
"$180k-$220k", "Full-time", "Remote"), a "Why you're a strong match" bullet list, an
"About the role" paragraph, and two buttons: blue "Tailor my resume" and white "View
posting". Numbers monospaced, single blue accent, no emoji.

---

## 4. Interview prep [SHELL]

Design an interview-prep page inside the navy-sidebar shell, blue and white. Header:
Gabarito "Interview prep", subtitle "Practice questions built from your resume". A small
blue eyebrow "Choose a focus" over an accordion picker of three rows (Screening call
active with an "Active" blue pill, Meeting with a manager, Technical), each row an icon
tile + title + subtitle + chevron.

Below: a segmented tab control [Screening call | With a manager | Technical]. Then a
stack of full-bleed question cards in a BLUE FAMILY only (deep navy to blue, sky, indigo -
one hue family, varied depth), white text. Each card: a monospaced "Question 1" label, a
bold question ("Tell me about yourself."), a divider, 2-3 coaching tips each with a small
check icon, and a translucent "Sample answer" inset with a spoken answer. Include a
salary card whose sample gives a range ("targeting a base of Rs 45-55 lakh annually"). A
"Get more questions" action appends more. Technical cards are tips-only (no sample). No
purple, no multicolor - blue family only. No emoji.

---

## 5. Resumes home [SHELL]

Design the "Resumes" list page inside the navy-sidebar shell, blue and white. Header:
Gabarito "Resumes", subtitle "Your saved resumes and drafts", and a blue "New resume"
button. Below, a vertical stack of large document cards. Each card: a tall resume
thumbnail (neutral black-on-white document) on the left; on the right a title ("Senior
Software Engineer"), a status pill ("72% complete" blue, or "100% complete" green) with a
meta line, an optional blue-tint "Tailor this resume" AI banner (small blue-gradient
sparkle tile + a blue "Tailor" button), and an action row: blue "Download", white "Edit",
quiet "Copy", quiet "Share", red "Delete". Cards lift on hover. Single blue accent, no
emoji, no purple AI banner - use blue tint.

---

## 6. Cover letters [SHELL]

Design the "Cover letters" list page inside the navy-sidebar shell, blue and white.
Header: Gabarito "Cover letters", subtitle "Generated from your resume and the target
role", blue "New cover letter" button. A vertical stack of document cards matching the
Resumes card idiom: a letter thumbnail (neutral document showing "Dear Hiring Team,..."),
a title ("Cover letter - Stripe"), a meta line ("Updated yesterday - Senior Software
Engineer"), and an action row: blue Download, white Edit, quiet Copy, red Delete. Same
card shape, radius, and shadow as every other list page. No emoji.

---

## 7. Resignation letters [SHELL]

Design the "Resignation letters" list page inside the navy-sidebar shell, blue and white.
Header: Gabarito "Resignation letters", subtitle "Professional, graceful, ready to send",
blue "New letter" button. First a blue-tint "Continue your draft" bar (icon tile + "last
edited today" + blue "Resume" button). Then document cards matching the shared idiom: a
letter thumbnail (dated, "Dear Ms. Rivera,..."), title "Resignation - Acme Corp", meta
"Updated today - Two weeks' notice", action row blue Download / white Edit / red Delete.
No emoji.

---

## 8. Templates & design [SHELL]

Design a "Templates & design" page inside the navy-sidebar shell, blue and white. Header:
Gabarito "Templates & design", subtitle "Pick a layout, then set your accent color and
fonts", plus an outline pill "Applies to: Senior Software Engineer". A 4-column grid of
template cards, each a small neutral resume preview with a name caption (Modern selected
with a blue "Selected" pill, Classic with a green "ATS" pill, Sidebar, Editorial). Below,
two control cards: an "Accent color" swatch row (blue selected) with the note "This colors
the resume document only - the app stays blue", and a "Font pairing" + "Layout" chip row.
The accent swatches color the DOCUMENT, not the app chrome. No emoji.

---

## 9. Account [SHELL]

Design an account settings page inside the navy-sidebar shell, blue and white. Header:
Gabarito "Settings", subtitle "Manage your account, plan, and preferences". A single
column (max 720px) of white setting cards: Profile (Name, Email, "Signed in with Google"
rows), Plan ("Free - 1 of 3 resumes used" with a blue "Subscribe" button), Preferences
(three toggle switches - two on/blue, one off), and a Danger zone card with a red "Delete
account" outline button. Rows separated by hairlines. No emoji.

---

## 10. Payment / pricing [SHELL]

Design a pricing page inside the navy-sidebar shell, blue and white. Header: a blue
eyebrow "Upgrade", Gabarito "Unlimited resumes, letters, and AI", subtitle "Pick a plan.
Cancel anytime - your documents are always yours". Three plan cards in a row: Monthly
$9/mo (white button), Quarterly $6/mo highlighted with a blue ring and a blue "Best value"
pill (blue button), Annual $4/mo (white button); each with a green-check feature list.
Prices monospaced. Below, a centered trust row: a green "Rated 4.8/5" pill + a short
verified-customer quote. No emoji, single blue accent.

---

## 11. Landing page [PUBLIC]

Design a marketing landing page for an AI resume builder, blue and white, no app sidebar.
A slim top nav (logo left; "Sign in" quiet + "Get started" blue right). Hero is a
LEFT-WEIGHTED split (not centered): a small badge "AI grounded in your real experience", a
large Gabarito headline "Build a standout resume in minutes" (the word "minutes" in a blue
gradient), a supporting line, and one primary blue CTA "Start for free"; beside it, a
clean product mock of the dashboard (navy sidebar + white cards). Then a features section
as a 2-column zig-zag (NOT three equal cards): guided builder, honest AI writing, matching
letters, job matches, interview prep, ATS-safe exports - each with a blue-tint icon tile.
A "How it works" three-step row with monospaced numbered blue circles. A final navy CTA
band "Your next role starts with a better resume" with one white button. No emoji, no
"scroll to explore", no bouncing chevrons, realistic copy only.

---

## 12. Login [PUBLIC]

Design a sign-in screen for a resume app, blue and white, no sidebar, centered single
card on a soft blue-tinted background. A blue-gradient logo tile, Gabarito "Welcome back",
subtitle "Sign in to keep building your resume". A white "Continue with Google" button
(keep Google's multicolor G mark), an "OR" divider, an Email field and a Password field
(label above, blue focus ring), and a blue "Sign in" button. Footer line "New here?
Create an account". No emoji.

---

## 13. Onboarding - "How should we start?" [FOCUSED]

Design an onboarding screen for a resume app, blue and white, no sidebar, centered column
(max 560px). Gabarito "How should we start?", subtitle "Bring what you have - we'll turn
it into a polished resume". Two large option cards stacked: "Upload your resume" (blue
gradient upload icon tile, subtitle "Import your details from a PDF or DOCX in seconds",
chevron) which expands to a dashed blue-tint drop zone ("Drop your resume here - PDF or
DOCX, up to 10MB, or Google Drive / Dropbox"), and "Start from scratch" (softer blue tile,
"Build section by section with guidance"). A small reassurance line "Your progress saves
automatically once you create a free account". No emoji.

---

## Optional extra screens (same method)

- Cover-letter / resignation wizard step [FOCUSED]: a single centered question card
  ("Do you have a specific job in mind?" with Yes/No cards), a top phase indicator
  "1 Add details - 2 Personalize - 3 Download", Back/Next footer.
- Tailoring [FOCUSED]: left suggestion cards (Apply/Skip, score ring rising) + right live
  resume preview; top tabs [Write | Design | Tailoring].
- Saved interview prep [SHELL]: a list of saved prep sheets with Open + Delete.
- Checkout [FOCUSED]: order summary on the left, a Stripe embedded-payment panel on the
  right, "Change package" link.

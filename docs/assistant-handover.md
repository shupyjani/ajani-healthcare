# Ajani Assistant handover

**Latest result: 803 tests across 22 files, lint and production build passed. See “Final wording, context and journey correction” below for the current handover; earlier sections record preceding passes.**

Continued from the actual unstaged checkout on `feature/ajani-mobile-cancellation-assistant`, HEAD `e9ba96a612f06f97289b9832acc78fc006207a9b`. No branch or HEAD change was needed. The initial observed run was 701 passing tests across 19 files; the later 740-test result was an intermediate result, not the final baseline.

## Audit and completed work

At takeover, cancellation UI/domain transitions, task locking, progress wrapping, navigation, assistant UI/transport, and session completion sequencing were already present. Interpretation, selectors, task concepts, contact classification and guidance existed but were partial. These were preserved and extended rather than reapplied. Package files, homepage, case study, fictional seed data and responsive phone styling were preserved.

Confirmed defects corrected during this pass:

- Reset reused request IDs; a later new question could collide with a pre-reset request. History keys also repeated after the cap. Requests now have monotonic IDs, a synchronous submit guard, reducer rejection of double submissions, and rejection of stale or duplicate identified replies.
- Schedule selectors depended on array order. They now sort by recorded start times; active-first selection remains authoritative. Completion order is independently recorded by successful transitions only.
- “Which visit did I just finish?” was not recognised. Previous/final/following targets and requested task/field answers now have targeted regressions.
- Task counts could become generic visit counts or ignore task/status conditions. In particular, “How many unchecked tasks in cancelled visits?” now returns the unchecked task count. Unchecked records and due work on unresolved visits are separate selections.
- Unrelated exchanges could retain an old person. Explicit round/temporal/count scope now takes precedence; multi-person responses do not choose the final name for a pronoun. Corrections, list positions and omitted-operation follow-ups have tests.
- Checklist and medicines wording missed the task route. Task matching uses tokens and concepts, distinguishes related actions, and labels unchecked records. Loose matches no longer expose parser wording.
- Pre-visit contact answers previously included incoming family calls and conditional escalation. The pre-visit answer now reports only that relationship.
- Provider snapshots omitted actual tasks, notes and completion history; long assistant history could fail endpoint validation. Snapshots now include those recorded fields, and sent history is capped to the endpoint contract.
- Guidance could select general travel advice before one-active/return rules, and described Reset in the wrong location. These now agree with the real controls.
- Recorded cancellation reasons/notes now remain distinct from the menu of cancellation choices.

Inspected risks, not claims of observed exploitation: instruction-like record content, provider hallucination, and out-of-order network delivery. Synthetic adversarial data and mocked transport tests exercise these boundaries; no actual credential exposure or malicious execution was observed.

## Interpretation and chronology

`assistantInterpret` normalises text and describes boundary, subject, operation, target, scope, filters, quantity, comparator, negation, conjunction and clauses. `assistantQueries` supplies pure schedule/task/condition selectors. `assistantFallback` resolves context and formats the requested facts; `assistantGuidance` describes existing controls. This remains a bounded app-domain recogniser, not unrestricted language understanding.

Current/next is active En route or Arrived first, otherwise earliest Planned. Explicit following uses schedule position; final scheduled includes resolved visits; remaining excludes Completed and Cancelled. Session `completionOrder` stores visit IDs only, with no clock. Rejected/repeated actions add no event, cancellation adds no completion, and Reset clears history. Pre-completed seed records receive a qualified schedule-based answer, never an invented completion chronology.

## Acceptance answers

These are answers against the initial fictional round. Once a visit is completed during the session, “just finish” selects the last recorded completion event instead of the qualified seed fallback.

| Question | Answer |
| --- | --- |
| is there any ongoing? | Priya Raman is your current active visit, at 9:40–10:40 (Arrived). |
| who was my last visit? | Desmond Achebe is the latest scheduled visit marked Completed; the initial records do not say which was completed last; scheduled 8:45–9:15 (Completed). |
| which visit did I just finish? | Desmond Achebe is the latest scheduled visit marked Completed; the initial records do not say which was completed last; scheduled 8:45–9:15 (Completed). |
| what were the tasks in my last visit? | Desmond Achebe is the latest scheduled visit marked Completed; the initial records do not say which was completed last. Desmond Achebe: 3 of 3 done. Check the blister pack against the chart (done), Prompt morning medication (done) and Note any missed doses (done). |
| how many task in my next visit? | 3 tasks — Priya Raman is your current active visit, with 3 recorded: 1 ticked and 2 unticked. |
| how many task total do I have today? | 21 tasks recorded across the selected visits. |
| are there any wound related task today? | 1 visit has a matching task: Priya Raman — Check wound dressing (unchecked) (Photograph not required). |
| how many more visits left? | 5 visits remain on today’s round. |
| does any of my clients have more than 3 tasks today? | No. No visit on today’s round has more than 3 recorded tasks. |
| does anyone have a walk today? | 1 visit has a matching task: Ivor Bankole — Walk the hallway circuit twice (unchecked). |
| is there any visit I have to feed the client? | No task on today’s round explicitly records feeding a client directly. What is recorded is preparing food or drink: Marguerite Okonjo — Prepare breakfast and a hot drink (done); Terrence Boakye — Prepare a light meal (unchecked). |
| is there any visit I have to administer medication? | No task on today’s round explicitly records administering medication. What is recorded is prompting medication: Desmond Achebe — Prompt morning medication (done); Halina Nowak — Prompt midday medication (unchecked). |
| is there any visit I have to dress the patient? | 2 visits have a matching task: Marguerite Okonjo — Support with washing and dressing (done); Terrence Boakye — Support with a change of clothes (unchecked). |
| do I need to ring any client before visiting? | No. No note on today’s round asks you to ring a client before visiting. |

## Coverage and verification

New coverage includes structured interpretations, shuffled schedule arrays, unequal task counts, renamed people, no active visit, all resolved, cancelled/closed visits with unchecked tasks, completion ordering, count/filter combinations, AND/OR task concepts, context corrections, clarification, compound questions, guidance, immutable queries and adversarial record strings.

Exploratory phrasing included “medicines on the checklist”, “bathing tasks”, explicit clock questions following a person, a topic change before “What time?”, and unchecked-task counts within cancelled visits. Genuine defects became regressions. The earlier contact test was intentionally corrected: an incoming family call and a duty-line escalation are not evidence of an outgoing pre-visit call. Other valid existing assertions were preserved.

The rendered pending-request test double-clicks a suggestion, navigates away and reopens the conversation, then resets before the reply arrives. Reducer tests cover stale/duplicate replies and unique keys after 30 exchanges. Transport tests cover timeout/fallback/retry, bounded history, full snapshot fields and direct endpoint boundary handling.

The previous broad pass’s `npm run verify` exited 0: lint passed, **750 tests passed across 20 files**, and the production build passed (127 transformed modules). This is **49 additional tests** over the observed 701-test takeover state: 44 hardening tests, four transport tests and one rendered lifecycle test. `git diff --check` passed. That run included the subject-precedence correction and response-style changes. The focused correction results below supersede its totals and bundle measurements. Production build is the final stage of `npm run verify`; no duplicate build was needed.

## Previous broad-pass bundle and credential isolation

Comparison uses a production build of `git archive HEAD` in a temporary directory with the same installed dependencies, without changing the checkout or index. This measures all unstaged cancellation/assistant work against HEAD, not just the takeover edits.

| Asset | HEAD raw / gzip | Final raw / gzip | Gzip change |
| --- | --- | --- | --- |
| Main JavaScript | 267.24 / 83.88 kB | 267.24 / 83.88 kB | 0 |
| Lazy demo JavaScript | 33.63 / 9.05 kB | 105.45 / 32.02 kB | +22.97 kB |
| Demo CSS | 13.88 / 3.21 kB | 17.33 / 3.79 kB | +0.58 kB |
| Case-study JavaScript | 11.25 / 3.37 kB | 11.25 / 3.37 kB | 0 |

The four existing case-study image assets and main CSS sizes are unchanged.

`AjaniMobileDemo` remains lazy-loaded; the homepage does not import the assistant endpoint. Credentials are read only by the Netlify function from `OPENAI_API_KEY`/`OPENAI_MODEL`, without a `VITE_` prefix. `.env.example` contains empty placeholders. No real environment values were printed or changed. Static production-JavaScript checks found no provider key variable name, provider URL, mock key sentinel or server instruction string. This checks isolation of this implementation; it is not a claim to have audited an external deployment.

## Fallback, provider and browser limits

Local answers are computed from current state. Clinical/disclosure/mutation refusals can return immediately; ordinary requests try the function and use the already computed local answer when unconfigured, non-successful, empty, unreachable or timed out. The UI accurately says built-in guidance is answering when no live response is used. Navigation retains the capped conversation; Reset clears it and invalidates in-flight replies.

The optional provider has no tools, receives untrusted record/history data separately from server instructions, and cannot mutate the app. Provider responses render as plain text. Mocked provider success/failure and unconfigured fallback paths passed; no live paid provider was enabled or called. Prompt isolation tests demonstrate request construction, not a universal guarantee about a model’s response. Live model quality and deployed Netlify behaviour remain unvalidated.

The browser runtime reported no available browsers (including an empty browser list), so visual/manual browser QA could not be performed. Rendered React/jsdom tests and HTTP checks were completed instead. PID 57708 has this checkout as its working directory and listens on 127.0.0.1:4323. The existing demo returned HTTP 200:

**http://127.0.0.1:4323/products/ajani-mobile/demo**

No additional development server was started. The recogniser intentionally remains limited to recorded app-domain facts; missing live times, demographics or clinical decisions are not inferred.

## Repository handover before the focused correction

HEAD: `e9ba96a612f06f97289b9832acc78fc006207a9b`. Index: empty.

```text
## feature/ajani-mobile-cancellation-assistant
 M .env.example
 M .oxlintrc.json
 M src/components/demo/DemoPhone.css
 M src/components/demo/DemoPhone.jsx
 M src/components/demo/MoreScreen.jsx
 M src/components/demo/StatusBadge.jsx
 M src/components/demo/TodayScreen.jsx
 M src/components/demo/VisitDetailScreen.jsx
 M src/components/demo/demoIcons.jsx
 M src/lib/demoState.js
 M src/test/ajaniMobileDemo.test.jsx
 M src/test/demoState.test.js
?? docs/assistant-handover.md
?? netlify/
?? src/components/demo/AssistantScreen.jsx
?? src/components/demo/CancelVisitDialog.jsx
?? src/lib/askAssistant.js
?? src/lib/assistantFallback.js
?? src/lib/assistantGuidance.js
?? src/lib/assistantIntent.js
?? src/lib/assistantInterpret.js
?? src/lib/assistantPeople.js
?? src/lib/assistantQueries.js
?? src/test/assistantEndpoint.test.js
?? src/test/assistantFallback.test.js
?? src/test/assistantHardening.test.js
```

Everything remains unstaged for manual review. Nothing was staged, committed, pushed, merged or deployed. No dependency was added; `package.json` and `package-lock.json` are unchanged.


## Focused task-reference and reverse-action correction

Preserved the broad implementation and corrected the manually reported cases. `assistantTaskDetails` identifies the requested entity/property and resolves task identities from the latest result against the current visit/task objects. It handles explicit labels/concepts, unique contextual tasks, task ordinals and other tasks. An ambiguous task result asks which task; a subsequent ordinal can resolve against that result. It never reuses the previous answer’s checked state.

Task properties are read from recorded task wording/hints: “twice” means two repetitions; “ten minutes” supplies a task duration. Missing task durations never inherit the parent visit’s duration. Explicitly labelled properties in synthetic hints are retrieved rather than unconditionally declared missing. Record lookups for medication name/dose stay separate from recommendations; clinical advice remains refused. The contextual “here” wording is scoped to task-detail resolution, not globally replaced.

Reverse-action guidance distinguishes restoring a closed visit from cancelling an unresolved one. No restore feature, policy justification, dependency, UI layout or domain transition was added. Completion-history answers label their time slot as scheduled.

Corrected answers against the seed records:

| Request | Answer |
| --- | --- |
| After the walking-task search: “has that task been completed?” | No. Ivor Bankole’s ‘Walk the hallway circuit twice’ task is unchecked. |
| “Is it still outstanding?” | Yes. Ivor Bankole’s ‘Walk the hallway circuit twice’ task is unchecked. |
| “do you know how long Ivor bankole’s walk should take?” | Ivor Bankole’s demo record does not specify a duration. It only lists ‘Walk the hallway circuit twice’. |
| “How many times should the hallway circuit be walked?” | Ivor Bankole’s ‘Walk the hallway circuit twice’ task records repetitions: 2 times. |
| “How long are Sunita’s seated exercises?” | Sunita Kaur’s ‘Seated exercises, ten minutes’ task records duration: 10 minutes. |
| “How long is Ivor’s whole visit?” | Ivor Bankole’s visit is scheduled for 45 minutes, from 11:00 to 11:45. |
| “do you know which dressing type for Priya?” | Priya Raman’s demo record does not specify a dressing type. It only lists ‘Check wound dressing’. |
| “no I mean here wound dressing type?” | Priya Raman’s demo record does not specify a dressing type. It only lists ‘Check wound dressing’. |
| “why can’t I restore a cancelled visit to planned?” | This demo does not support restoring an individual cancelled visit to Planned. “Return to Planned” applies to an En route visit. Reset demo restores the entire round and clears the conversation. |

Tests cover mixed checked/unchecked checklists, task references, ambiguity and clarification, property presence/absence, explicit task selection, record lookup versus clinical recommendation, reverse controls and current-state freshness. Three rendered multi-turn tests cover the walking follow-up, ticking Priya’s wound task through the UI before navigating back to the assistant, and ambiguity/ordinal selection. Completing Priya with outstanding work is separately verified to retain the unchecked task.

Final correction verification: `npm run verify` exited 0 — lint passed, **780 tests passed across 21 files**, and the production build passed (128 transformed modules). This correction adds **30 tests**: 27 focused interpretation/selector/answer tests and three rendered multi-turn tests. `git diff --check` passed.

Bundle comparison against the previous unstaged pass:

| Asset | Previous raw / gzip | Correction raw / gzip | Gzip change |
| --- | --- | --- | --- |
| Lazy demo JavaScript | 105.45 / 32.02 kB | 111.23 / 33.82 kB | +1.80 kB |
| Main JavaScript | 267.24 / 83.88 kB | 267.24 / 83.88 kB | 0 |
| Demo CSS | 17.33 / 3.79 kB | 17.33 / 3.79 kB | 0 |

Final HEAD: `e9ba96a612f06f97289b9832acc78fc006207a9b`. Index empty. Final status:

```text
## feature/ajani-mobile-cancellation-assistant
 M .env.example
 M .oxlintrc.json
 M src/components/demo/DemoPhone.css
 M src/components/demo/DemoPhone.jsx
 M src/components/demo/MoreScreen.jsx
 M src/components/demo/StatusBadge.jsx
 M src/components/demo/TodayScreen.jsx
 M src/components/demo/VisitDetailScreen.jsx
 M src/components/demo/demoIcons.jsx
 M src/lib/demoState.js
 M src/test/ajaniMobileDemo.test.jsx
 M src/test/demoState.test.js
?? docs/assistant-handover.md
?? netlify/
?? src/components/demo/AssistantScreen.jsx
?? src/components/demo/CancelVisitDialog.jsx
?? src/lib/askAssistant.js
?? src/lib/assistantFallback.js
?? src/lib/assistantGuidance.js
?? src/lib/assistantIntent.js
?? src/lib/assistantInterpret.js
?? src/lib/assistantPeople.js
?? src/lib/assistantQueries.js
?? src/lib/assistantTaskDetails.js
?? src/test/assistantEndpoint.test.js
?? src/test/assistantFallback.test.js
?? src/test/assistantHardening.test.js
?? src/test/assistantTaskDetails.test.js
```

The previous browser/live-provider validation limitations still apply: rendered tests use jsdom, and no paid/live provider was enabled. No package files changed. All changes remain unstaged; no commit, push, merge or deployment occurred.


## Final wording, context and journey correction

Completed the interrupted correction from the existing files. At resumption, the branch/HEAD matched, the index was empty, and the saved tests showed a full-name possessive collision and one old copy expectation. The implementation was preserved and those remaining cases were corrected. No repository reset or duplicate development server was used.

### Confirmed causes and resolution

- **Speech act:** the mutation pattern saw “complete … task” before identifying a historical status question. “Did I complete…?”, “Have I completed…?” and “Are all … tasks done?” now resolve as lookups independently of whether the person is known. Imperatives and mixed action requests remain subject to the mutation boundary.
- **Possessives:** full names previously used substring matching, and there was no grammatical missing-apostrophe step. Recognition now prefers exact bounded names/tokens, then a recorded name plus possessive `s` before a relevant app noun, then conservative spelling tolerance. An ambiguous shared first name can be resolved by a unique full-name possessive. Exact names ending in `s` retain priority; trailing `s` is never globally stripped. Synthetic Chris/Chri and Dana West/Dana East cases verify collisions and ambiguity. Unknown owners in status questions produce no-match answers rather than command refusals.
- **Short properties:** property detection worked, but the task-detail resolver rejected omitted task nouns and fell through to parent-visit duration. The latest relevant task result now supplies identity for duration, repetitions and completion follow-ups. Explicit whole-visit requests override it; multiple task candidates require clarification. Current-state freshness remains intact.
- **Concept breadth:** the shared concept table now recognises personal hygiene and mobility as broader categories, returning actual recorded tasks and checked states. Hygiene includes washing without implying wound treatment; mobility includes walking and relevant exercises, while walking remains narrower. Food preparation and medication lookups retain the existing distinctions from direct feeding and administration. Due-work queries apply unresolved-visit filtering before rendering, including cancelled-visit cases.
- **Wording:** ordinary assistant text now says “app”, “record” or the specific task. Unsupported controls are described as app limitations, without invented policy or clinical justifications. Exact labels such as “Reset demo” remain. Clinical escalation/refusal wording is preserved where relevant, not appended to routine operational answers.

### Current assistant and source copy

Subtitle: **“Operational assistant. It cannot give clinical advice or update visits.”**

Missing task duration now identifies the task, for example: **“Marguerite Okonjo’s ‘Support with washing and dressing’ task does not specify a duration. It only lists ‘Support with washing and dressing’.”** Dressing type uses **“Priya Raman’s record does not specify a dressing type. It only lists ‘Check wound dressing’.”** Restoration guidance begins **“This app does not support restoring an individual cancelled visit to Planned.”** Reset guidance explicitly applies to the entire round and conversation.

The prominent fallback panel is removed. A compact accessible status is labelled **“Latest reply source”** and displays **“Built-in guidance”** or **“AI response”**. It describes the latest reply, including while a subsequent request is pending—not provider availability or the whole conversation. Each assistant message retains its own source metadata and discreet author-line label, so later AI replies never relabel earlier local replies. React updates the status text when its value changes; it does not trigger new availability requests. Immediate built-in clinical boundary replies remain labelled built-in even following an AI response.

Outside the phone, in the workspace introduction, the exact explanation is:

> The assistant answers questions about the fictional round. When live AI is unavailable, built-in guidance provides responses.

### Final five journeys

1. **Complete a visit.** Open Priya Raman, complete her remaining tasks, then complete the visit and watch progress move from **2 of 7** to **3 of 7**.
2. **Change priorities.** Search for **“Ivor”** in Visits and start travelling. Choose **“Return to Planned”**, then start travelling to Halina instead.
3. **Cancel a visit.** Open Halina’s visit, choose **“Cancel visit”** and select **“Family cancelled”**. Confirm the cancellation and check the updated progress.
4. **Ask about the round.** Under **“More”**, open **“Ajani Assistant”** and ask **“How many visits are left?”** or **“Which visits are cancelled?”**
5. **Follow up on a task.** Ask **“Does anyone have a walking task?”**, then **“Has that task been completed?”** to check its current state.

The page retains bold teal leads, bold reading-ink controls/questions/counts, exactly five native numbered items, and a separate Reset row. The exact-string assertions were intentionally updated to the authorised replacement copy; unrelated search/reference and navigation tests remain.

### Alignment and browser checks

The semantic `ol` uses explicit outside markers and 1.5rem left padding. Items remain `display: list-item`, with zero text indentation and zero inline-start item padding. Inline lead/body spacing is ordinary JSX whitespace. This makes the marker column independent of the text edge, with wrapped lines sharing the same item content box. Font size and item spacing are unchanged; no fixed height, transform, clipping, manual spacer or JavaScript measurement was added. Responsive link rules, phone dimensions/height cap and cue → phone → card source order are unchanged.

Browser discovery returned no available browser. Therefore **100% desktop zoom, breakpoint-width and 320px pixel/computed-layout checks were not performed**. Static CSS/DOM tests verify the structure and preserved responsive rules, not pixel alignment. The reported visual cause could not be reproduced in a browser; the change makes the native list layout explicit rather than claiming a measured rendering diagnosis. Manual visual review remains necessary.

PID 57708 belongs to this checkout and continues serving **http://127.0.0.1:4323/products/ajani-mobile/demo** (HTTP 200). No new server was started.

### Final verification

`npm run verify` exited 0: **803 tests across 22 files**, lint passed and production build passed (128 modules). This pass adds **23 tests** over the observed 780-test baseline: 19 focused presentation/recognition/context/source tests and four rendered journey/conversation/source/structure tests. Earlier valid assertions remain; only expressly authorised copy expectations changed. `git diff --check` passed.

The complete rendered journey sequence verifies: Priya completion yields 3 completed / 4 remaining; Ivor travels then returns to Planned; Halina travels then is cancelled with “Family cancelled”; the round then has 4 resolved / 3 completed / 1 cancelled / 3 remaining. The assistant reports three visits left, names Halina as cancelled, and reports Ivor’s walking task as unchecked. A mocked transport test switches fallback → AI → immediate clinical refusal, proving preserved per-reply labels and no provider request for the refusal.

The first full run found test-harness issues in the new sequence (default timeout) and CSS reading (browser URL instead of filesystem path). The long sequence has a local 15-second allowance, and its isolated run completed in about two seconds; no global timeout or assertion was weakened.

| Asset | Previous pass raw / gzip | Final raw / gzip | Gzip change |
| --- | --- | --- | --- |
| Lazy demo JavaScript | 111.23 / 33.82 kB | 112.94 / 34.18 kB | +0.36 kB |
| Demo CSS | 17.33 / 3.79 kB | 17.34 / 3.82 kB | +0.03 kB |
| Main JavaScript | 267.24 / 83.88 kB | 267.24 / 83.88 kB | 0 |

The case-study page was not edited. Its output hash can change with shared chunk references; main CSS and existing image assets are unchanged. The demo remains lazy-loaded. No dependencies/package files changed.

Live-provider validation remains **mocked/fallback only**: no paid provider was enabled or called, and no deployment was performed. Browser visual checks remain unavailable as noted above. Credentials still remain server-side; the source presentation does not add network requests or expose configuration.

### Final repository state

Branch: `feature/ajani-mobile-cancellation-assistant`. HEAD: `e9ba96a612f06f97289b9832acc78fc006207a9b`. Index: empty.

```text
## feature/ajani-mobile-cancellation-assistant
 M .env.example
 M .oxlintrc.json
 M src/components/demo/DemoPhone.css
 M src/components/demo/DemoPhone.jsx
 M src/components/demo/MoreScreen.jsx
 M src/components/demo/StatusBadge.jsx
 M src/components/demo/TodayScreen.jsx
 M src/components/demo/VisitDetailScreen.jsx
 M src/components/demo/demoIcons.jsx
 M src/components/pages/AjaniMobileDemo.css
 M src/components/pages/AjaniMobileDemo.jsx
 M src/lib/demoState.js
 M src/test/ajaniMobileDemo.test.jsx
 M src/test/demoState.test.js
?? docs/assistant-handover.md
?? netlify/
?? src/components/demo/AssistantScreen.jsx
?? src/components/demo/CancelVisitDialog.jsx
?? src/lib/askAssistant.js
?? src/lib/assistantFallback.js
?? src/lib/assistantGuidance.js
?? src/lib/assistantIntent.js
?? src/lib/assistantInterpret.js
?? src/lib/assistantPeople.js
?? src/lib/assistantQueries.js
?? src/lib/assistantTaskDetails.js
?? src/test/assistantEndpoint.test.js
?? src/test/assistantFallback.test.js
?? src/test/assistantHardening.test.js
?? src/test/assistantPresentation.test.jsx
?? src/test/assistantTaskDetails.test.js
```

All changes are unstaged for manual review. Nothing was staged, committed, pushed, merged or deployed.


## Follow-up context, recorded fields and the journey marker column

Resumed from the actual checkout. Branch and HEAD matched and the index was empty. The tree contained two files the previous handover does not list — `src/lib/assistantSelection.js` and `src/test/assistantSelection.test.js` — so the interrupted pass had begun a selection layer. The observed baseline was **841 passing and 2 failing across 23 files**, not the 803 recorded above. Nothing was reset or reapplied.

### The two failures inherited at takeover

Both were in the new selection layer, and both concerned cancellation fields.

- `What reasons can I give for cancelling Terrence?` was matched by the recorded-reason pattern (`reason.*cancel`) and answered "no cancellation reason is recorded". Asking which reasons the app offers is a question about the control. A menu test now runs first, and only a genuine record lookup bypasses the explain/control guard.
- A reason of "Other" was read back alone. "Other" is required to carry a note precisely because it records nothing by itself, so the note is now reported beside it as a separately labelled sentence. Reason and note remain distinct fields.

### Shared root cause behind the follow-up families

`answerLocally` returned `{ text, intent }` and dropped the `context` the selection and task-detail layers produce. The reducer persists `action.context` and `DemoPhone` forwards it, so the whole chain existed except for that one discarded field. Every context-dependent follow-up therefore degraded: "do those count as work remaining?", "only on visits I still need to do", and "was there an additional note?" fell back to clarification or to the wrong field. Preserving `context` through the answer path restored the family at once.

A second shared cause: answers that named a set recorded nothing about that set, so a bare count follow-up recounted the round. Set-listing answers now record the visits — and the tasks, where the answer named tasks — that they reported.

### Corrections in this pass

- **Counts agree with lists.** `How many is that?` after `Which visits are planned?` answers four, not seven. After a search that matched nothing it answers "None", rather than silently widening to the whole round.
- **A time-bounded count names what it counted.** `How many tasks do those visits have altogether?` after an after-midday selection reads "9 tasks across the selected visits" instead of "on planned visits", which would have overstated the set — Ivor is Planned at 11:00 and correctly excluded.
- **`What about now?` re-reads the current record**, resolving to the most recent task discussed rather than only the immediately preceding reply, so an intervening whole-visit answer no longer loses the referent. The checked state is read from the visit every time.
- **A task hint is a first-class recorded field.** `Does Priya’s wound task need a photograph?` returns the recorded hint; an absent hint is reported as unrecorded rather than invented. A list question (`Which of her tasks need a photograph?`) remains a selection across the checklist.
- **Accessible name de-duplicated.** The Latest action region is named by its visible label through `aria-labelledby` instead of a duplicate `aria-label`. It remains a single live region, and Reset still replaces stale feedback.
- **The journey marker column belongs to the item.** Reserving it with the list's padding works only while every marker is the same width. Each `li` now carries its own start margin with `list-style-position: outside`, so the marker is painted in that margin and first and wrapped lines share one content-box edge. Native `ol`/`li`/`::marker` are unchanged; no transform, clip, fixed height, spacer, measurement or reduced font size is used.

Already correct at takeover and left alone: actionable-versus-recorded task scoping, unchecked records on closed visits, both AND/OR concept follow-ups, the midday boundary, single-task answers, the pending-duration clarification completed by a bare `Halina`, and the 225-minute unresolved total.

### Verification

`npm run verify` exited 0: lint passed, **870 tests across 24 files**, production build passed (129 modules). That is **27 tests** over the observed 843-test takeover baseline: 20 in a new `assistantFollowUps.test.js` and seven rendered/stylesheet composition tests. `git diff --check` passed. Expectations were calculated from the fixture independently of the implementation; one of my own new assertions was wrong and was corrected against the records, not by weakening the code.

Bundle against HEAD `e9ba96a`, built from `git archive` in a temporary worktree with the same dependencies:

| Asset | HEAD raw / gzip | Now raw / gzip | Gzip change |
| --- | --- | --- | --- |
| Main JavaScript | 267.24 / 83.88 kB | 267.24 / 83.88 kB | 0 |
| Lazy demo JavaScript | 33.63 / 9.05 kB | 125.38 / 38.04 kB | +28.99 kB |
| Demo CSS | 13.88 / 3.21 kB | 17.64 / 3.91 kB | +0.70 kB |
| Case-study JavaScript | 11.25 / 3.37 kB | 11.25 / 3.38 kB | 0 |

No provider key name, model variable, provider URL or server instruction string appears in `dist/`. `OPENAI_API_KEY` and `OPENAI_MODEL` are read only in `netlify/functions/ajani-assistant.mjs`.

### Browser checks

Still not performed, now for a specific reason. Playwright 1.63.0 resolves through `npx` but is not a project dependency and has no browser binaries cached; installing them would add a dependency the brief forbids. Safari is present, but driving it through AppleScript blocks on an Automation permission prompt that cannot be answered non-interactively — the attempt was cancelled and nothing was left running. **Desktop, narrow-desktop and 320px pixel and computed-layout checks were therefore not carried out.** The stylesheet assertions verify placement rules and the marker reservation, not rendered geometry. Manual visual review is still required.

The existing server (PID 57708, this checkout) continues to serve **http://127.0.0.1:4323/products/ajani-mobile/demo** (HTTP 200). No additional server was started.

Branch `feature/ajani-mobile-cancellation-assistant`, HEAD `e9ba96a612f06f97289b9832acc78fc006207a9b`, index empty. Everything remains unstaged. Nothing was staged, committed, pushed, merged or deployed, and no package file changed.

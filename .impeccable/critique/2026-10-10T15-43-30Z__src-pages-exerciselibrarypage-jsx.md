---
target: Exercise Library page
total_score: 21
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/home/user/EliteProV2/src/pages/ExerciseLibraryPage.jsx"
target_fingerprint: "sha256:46d411387d7a7866d326850580028cd2ee9f69e7b2a369c6a66eaf20d7aa8c2e"
target_path: /home/user/EliteProV2/src/pages/ExerciseLibraryPage.jsx
timestamp: 2026-10-10T15-43-30Z
slug: src-pages-exerciselibrarypage-jsx
---
Method: dual-agent (A: design review · B: detector + browser), harness render of the real page, phone 390x844 + desktop 1280x800, coach + student, light + dark, en + zh-HK.

## Design Health Score — 21/40 (Acceptable)
| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of status | 2 | "104 exercises" never reflects search/filters and counts merged-away records (L269); third active pill scrolls off-screen |
| 2 | Match real world | 3 | Gym English right; Hinge/Locomotion/Rotation, "Aliases", "Unclassified" unexplained; starter "Edit" opens "Customize" |
| 3 | User control | 2 | Esc closes nothing; clear-all only in empty state; Delete sits beside Merge |
| 4 | Consistency | 2 | Three naming styles in one list; merge picker ignores aliases (L187); native window.confirm vs in-app modals |
| 5 | Error prevention | 2 | Equipment defaults to Barbell (L88) and the variant hint approves a mislabelled save |
| 6 | Recognition vs recall | 2 | Substring search: "curl dumbbell", "db curl", "biceps", "pullup" → 0; "chest" → 5 of ~15 |
| 7 | Flexibility | 1 | Single-select filters, no sort, no "mine", rows not keyboard-focusable (L336), filters reset per visit |
| 8 | Minimalist | 3 | Clean dense rows; equipment repeated in name + meta; gradient Add loudest element |
| 9 | Error recovery | 2 | Toast blames equipment when set; error toast covers submit 6s; clash on submit discards the form (L223-227) |
| 10 | Help | 2 | Good inline hints; nothing on movement patterns or "Hidden" |

## Priority issues
1. [P1] Default equipment Barbell + variant hint create mislabelled duplicates ("Cable Bicep Curl" saved as Barbell; "Cable, Cable" text; plurals not normalised) — harden
2. [P1] Search is substring, word-order sensitive, names/aliases only; merge picker names only — harden
3. [P1] Filters never stick (.main-content overflow-x:hidden defeats sticky, index.css:152 vs 2085); all controls top third; targets 24-31px; pills/chips contrast 2.6-3.0:1 — adapt
4. [P2] Coach duplicates invisible in list; merge picker doesn't surface the detected match; no "yours" marker — clarify
5. [P2] Detail modal leads with an empty video box for ~76% of exercises; Delete at top beside Merge; 31px actions — distill

## Detector (B)
CLI clean on the 3 JSX files. Browser: low contrast on filter pills (2.9:1), dropdown/muscle chips (2.6:1, detector missed the dropdown — measured), white on gradient primary button (3.0:1); all-caps long helper labels; h1→h3. False positives: logo gradient text, Inter, sidebar width transition (global shell). No horizontal overflow.

## Minor
Search box maxWidth 300 inline (L277); weight_distance unit missing from picker (L470-475); custom muscles unfilterable; starter "Leg Curl" tagged Hinge (contradicts #35); zh-HK active pill uses ASCII colon; "Fewer options" flush against label.

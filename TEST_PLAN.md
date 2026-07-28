# Records Explorer — Manual Test Plan

This document describes how to manually test the Records Explorer web app end-to-end.
It covers all user-facing pages, the hidden/admin routes, error handling, and
responsive behavior. Automated unit tests are out of scope here.

Each test case has steps, an expected result, and a checkbox to mark pass/fail.
Log any failures with the test ID (e.g. `B-04`), browser, and a screenshot.

---

## 1. Test environment setup

**Prerequisites**

- Node.js 18 or newer.
- A `.env.local` file at the repo root containing valid credentials:
  - `REACT_APP_SPORT80_API_TOKEN` (USAW Sport80 API)
  - `REACT_APP_GOOGLE_API_KEY` (Google Sheets API)

**Start the app (two terminals — both are required):**

```bash
npm run server   # Express API proxy on port 5001
npm start        # React dev server on http://localhost:3000
```

The app will not load records without the proxy server running (see section G).

**Optional production-build pass:** run `npm run build` then `node server/index.js`
and repeat the smoke tests against the served build. This is closest to the
deployed Fly.io environment, where the server injects API secrets at request time.

**Suggested test matrix**

| Dimension | Values                                                             |
| --------- | ------------------------------------------------------------------ |
| Browsers  | Chrome, Safari, Firefox (latest)                                   |
| Viewports | Desktop (~1280px+), Mobile (~375px, via devtools device emulation) |

---

## 2. Section A — Global navigation & header

| ID   | Test                      | Steps                                                                                                                   | Expected result                                                                                                       | Pass  |
| ---- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ----- |
| A-01 | Header renders            | Load `/`                                                                                                                | WSO logo image displays; header reads "California North Central WSO Records & Results"                                | - [ ] |
| A-02 | Menu opens/closes         | Click the menu icon; click it again                                                                                     | Flyout menu appears with 6 items, then hides                                                                          | - [ ] |
| A-03 | Internal nav links        | From the menu, visit each of: WSO Records & Results, Local Meet Results, Senior Nationals Qualification Rankings, About | Each link navigates to the correct page (`/`, `/local-meet-results`, `/goals`, `/info`) with the header still present | - [ ] |
| A-04 | External nav links        | Click "Local Meet Schedule" and "Official WSO Site"                                                                     | Navigate to `canorthcentralwso.org/meet-schedule` and `canorthcentralwso.org` respectively                            | - [ ] |
| A-05 | Hidden routes not in menu | Inspect the menu contents                                                                                               | No links to `/scripts` appear anywhere in the UI                                                                      | - [ ] |

## 3. Section B — Home: WSO Records & Results (`/`)

### Default view (no selection)

| ID   | Test               | Steps                     | Expected result                                                                                                                                                                                                 | Pass  |
| ---- | ------------------ | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| B-01 | Loading state      | Load `/` fresh            | "Loading current records…" shows briefly, then the All Current Record Holders view renders                                                                                                                      | - [ ] |
| B-02 | All-records layout | Review the default view   | Two columns, **Women** and **Men**; weight classes sorted ascending by bodyweight; within each class, rows per age group show Snatch, Clean & Jerk, and Total records with weight, lifter name, event, and date | - [ ] |
| B-03 | No STANDARD rows   | Scan the all-records view | No entry shows "STANDARD" as the lifter name (standards are placeholders, not record holders)                                                                                                                   | - [ ] |

### Options bar & search

| ID   | Test                            | Steps                                                                           | Expected result                                                                                                        | Pass  |
| ---- | ------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----- |
| B-04 | Go disabled until valid         | Load `/`; observe Go button; select only an Age Group                           | Go stays disabled until both Age Group and Weight Class are chosen                                                     | - [ ] |
| B-05 | Age Group options               | Open the Age Group dropdown                                                     | Options include Open, Under 11, Under 13, Under 15, Under 17, Junior, and Masters brackets from 35–39 up through 90+   | - [ ] |
| B-06 | Weight classes follow age group | Select "Open"; open Weight Class dropdown. Then select "Under 11" and reopen it | Open shows senior classes (Women's 48–86+kg, Men's 60–110+kg); U11 shows youth classes (Girls 30–63+kg, Boys 32–65+kg) | - [ ] |
| B-07 | Incompatible class cleared      | Select Open + Women's 48kg, then switch Age Group to Under 11                   | The weight class selection resets (Girls/Boys classes differ); Go disables until a new class is picked                 | - [ ] |
| B-08 | Search runs                     | Select Open + a weight class with known lifters; click Go                       | Gold spinner appears, then results render (sections B-10 through B-16)                                                 | - [ ] |
| B-09 | Reset                           | After a search, click Reset                                                     | Selections clear, results disappear, URL query params are removed, default all-records view returns                    | - [ ] |

### Results: Current Top Athletes

| ID   | Test              | Steps                                                                  | Expected result                                                                                                                                      | Pass  |
| ---- | ----------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| B-10 | Top athlete cards | Run a search for a populated division                                  | Up to 5 ranked cards show name, total, snatch, clean & jerk, age, date, club, and meet; individual lifts may load lazily (per-card spinner fills in) | - [ ] |
| B-11 | #1 highlight      | Look at the first-ranked card                                          | The top card has the gold "current" highlight; others do not                                                                                         | - [ ] |
| B-12 | More Info link    | Click "More Info >>" on any athlete card                               | Opens the lifter's USAW Sport80 results page                                                                                                         | - [ ] |
| B-13 | Sort dropdown     | Change sort between Overall Total, Snatch, Clean and Jerk, Most Recent | Card order re-sorts accordingly; highlight follows the new #1                                                                                        | - [ ] |
| B-14 | Empty division    | Search a sparse division (e.g. Masters 85–89)                          | Friendly empty message: "Looks like nobody's competed in this division yet! Could be you?" — no crash or spinner stuck                               | - [ ] |

### Results: Standards & prior records

| ID   | Test              | Steps                                                           | Expected result                                                                                                                                                                                                             | Pass  |
| ---- | ----------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| B-15 | Standards section | Scroll below top athletes                                       | "Officially Recognized Records & Standards" shows Total, Snatch, and Clean & Jerk cards plus fine print explaining STANDARD placeholders                                                                                    | - [ ] |
| B-16 | Prior records     | Scroll to the bottom section                                    | "Records from prior weight classes" shows historical records with year spans, plus an "All time bests from this bodyweight" list (up to 12 by total). Older sheet tabs (Pre-Aug2026, Pre-June2025, Pre-2018) all contribute | - [ ] |
| B-17 | Youth date range  | Search a U11 or U13 class and check the prior-records year span | Youth history starts from 2014; other age groups from 1998                                                                                                                                                                  | - [ ] |
| B-19 | Standards load before selection resolves | Throttle the network (devtools "Slow 3G"), then select a weight class and click Go immediately | The spinner stays up until Standards actually render — no need to reselect the class or refresh the page | - [ ] |

### Deep-linking

| ID   | Test                | Steps                                                                                   | Expected result                                                        | Pass  |
| ---- | ------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----- |
| B-18 | URL params auto-run | Run a search, copy the URL (contains `?ageGroup=…&weightClass=…`), open it in a new tab | The same search runs automatically on load with dropdowns pre-selected | - [ ] |

## 4. Section C — Local Meet Results (`/local-meet-results`)

| ID   | Test                   | Steps                                               | Expected result                                                                                                                                             | Pass  |
| ---- | ---------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| C-01 | Meets auto-load        | Open the page                                       | Spinner, then a list of recent local meets (since Jan 1, 2026) within the WSO's California boundaries, sorted newest first; each shows name, date, and city | - [ ] |
| C-02 | Select via dropdown    | Choose a meet in the dropdown, click Go             | That meet's results load                                                                                                                                    | - [ ] |
| C-03 | Select via list        | Click a meet in the clickable list instead          | Same behavior as C-02                                                                                                                                       | - [ ] |
| C-04 | Keyboard accessibility | Tab to a meet list item and press Enter             | The meet's results load (list items act as buttons)                                                                                                         | - [ ] |
| C-05 | Results layout         | Review loaded results                               | Header with meet name and date; results grouped Women/Men then by weight class; one best result per lifter, ranked by total                                 | - [ ] |
| C-06 | "And More" section     | Find a meet with unparseable divisions (if any)     | Results that can't be classified by gender/weight appear under "And More" rather than disappearing                                                          | - [ ] |
| C-07 | Full results link      | Click "Full Results from USAW >>"                   | Opens the meet's official USAW results page                                                                                                                 | - [ ] |
| C-08 | Reset                  | Click Reset after viewing results                   | Selection and results clear; `?meetId=` param removed                                                                                                       | - [ ] |
| C-09 | Deep-link              | Copy a URL with `?meetId=…`, open in a new tab      | The meet's results load automatically                                                                                                                       | - [ ] |
| C-10 | Empty results          | Select a meet with no usable results (if available) | "No results found for this meet." message; no crash                                                                                                         | - [ ] |

## 5. Section D — Senior Nationals Qualification Rankings (`/goals`)

| ID   | Test                 | Steps                                                                                               | Expected result                                                                                                                                                                | Pass  |
| ---- | -------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- |
| D-01 | Intro & link         | Open the page; click "USAW's public rankings site"                                                  | Intro text about 2027 Senior Nationals qualification renders; link opens `usaweightlifting.sport80.com/public/rankings/all` in a new tab                                       | - [ ] |
| D-02 | Rankings layout      | Review the page after loading                                                                       | Women and Men columns; each weight class lists top totals, each row starting with a rank number in a circle followed by weight • name; per-class spinners show while loading   | - [ ] |
| D-03 | Qualification counts | Count entries per class                                                                             | Up to 15 entries listed per class (12 qualifying + 3 tentative), except the two lightest classes per gender which list up to 9 (6 qualifying + 3 tentative)                    | - [ ] |
| D-04 | WSO member highlight | Find a California North Central lifter in a list                                                    | WSO members are gold-highlighted and show their club; non-members show their WSO name instead                                                                                  | - [ ] |
| D-05 | Tentative entries    | Look at the entries below the qualifying cutoff (below rank 12, or rank 6 for the lightest classes) | Up to 3 extra entries render in blue text (tentative — outside the qualifying tier); WSO member gold-highlighting still applies to tentative rows                              | - [ ] |
| D-06 | Rank circles         | Check the rank numbers down a weight class list                                                     | Ranks count 1, 2, 3… in order with no gaps; the circle's number matches the row's text color (gold for highlighted WSO members, blue for tentative entries, default otherwise) | - [ ] |

## 6. Section E — About (`/info`)

| ID   | Test            | Steps                                                                                         | Expected result                                                                          | Pass  |
| ---- | --------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----- |
| E-01 | Content renders | Open the page                                                                                 | Three info boxes: "About Records," "About Last Year's Lifts," "About This Site"          | - [ ] |
| E-02 | External links  | Click each link: American Records, WSO committee info, public Google spreadsheet, GitHub repo | Each opens the correct destination; the spreadsheet is publicly viewable without sign-in | - [ ] |
| E-03 | Contact link    | Click the maintainer email link                                                               | A `mailto:` compose window opens with the maintainer's address                           | - [ ] |

## 7. Section F — Hidden / admin routes

| ID   | Test                  | Steps                                                                   | Expected result                                                                                                                          | Pass  |
| ---- | --------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| F-01 | Scripts password gate | Navigate directly to `/scripts`; enter a wrong password and press Enter | "Incorrect password." shows; the tools remain hidden                                                                                     | - [ ] |
| F-02 | Scripts unlock        | Enter the correct password (from the maintainer)                        | Script dropdown appears with "Fetch Record Updates" and a Run button                                                                     | - [ ] |
| F-03 | Run script            | Click Run and wait (do not run twice concurrently)                      | "Running…" shows, then `record-breaking-analysis.csv` downloads and "Download complete." appears; open the CSV and sanity-check contents | - [ ] |
| F-04 | Script error display  | Run with the proxy server stopped                                       | An error message displays instead of a silent failure                                                                                    | - [ ] |

## 8. Section G — Error handling & resilience

| ID   | Test                 | Steps                                                                                | Expected result                                                                                                                         | Pass  |
| ---- | -------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| G-01 | Proxy down           | Stop `npm run server`, reload `/`, and run a search                                  | USAW-backed data fails gracefully — no white-screen crash. Note what the user sees for each section                                     | - [ ] |
| G-02 | Sheets failure       | Load `/` with an invalid `REACT_APP_GOOGLE_API_KEY`                                  | The page does not crash and does not show stale/misleading content (known gap: no visible error or retry affordance) | - [ ] |
| G-03 | Meets failure        | Open `/local-meet-results` with the proxy down                                       | Explicit "Failed to load meets…" error message shows                                                                                    | - [ ] |
| G-04 | Plausibility filters | Spot-check top athletes and meet results                                             | No absurd values appear (the app drops results above 200 snatch / 280 C&J / 470 total as data errors)                                   | - [ ] |
| G-05 | Bad deep-links       | Open `/?ageGroup=BOGUS&weightClass=BOGUS` and `/local-meet-results?meetId=999999999` | No crash; app either ignores the params or shows an error/empty state                                                                   | - [ ] |
| G-06 | Unknown route        | Navigate to `/does-not-exist`                                                        | Header renders with an empty body (no route matches); no crash                                                                          | - [ ] |

## 9. Section H — Responsive & cross-browser

The stylesheets contain no media queries, so mobile layout is a known risk area.

| ID   | Test                | Steps                                                    | Expected result                                                                          | Pass  |
| ---- | ------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----- |
| H-01 | Mobile: home        | View `/` at ~375px width                                 | Women/Men two-column layout is readable without horizontal scrolling or overlapping text | - [ ] |
| H-02 | Mobile: menu        | Open and use the flyout menu at mobile width             | Menu icon is tappable; flyout is fully visible and links work                            | - [ ] |
| H-03 | Mobile: other pages | View `/local-meet-results` and `/goals` at mobile width  | Columns, dropdowns, and lists remain usable                                              | - [ ] |
| H-04 | Cross-browser smoke | Repeat A-01–A-03, B-08, C-02, D-02 in Safari and Firefox | Behavior matches Chrome                                                                  | - [ ] |

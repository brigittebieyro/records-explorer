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
| B-06 | Weight classes follow age group | Select "Open"; open Weight Class dropdown. Then select "Under 11" and reopen it | Open shows the current senior classes (Women's 49–86+kg, Men's 60–110+kg); U11 shows youth classes (Girls 30–61+kg, Boys 32–70+kg) | - [ ] |
| B-07 | Incompatible class cleared      | Select Open + Women's 49kg, then switch Age Group to Under 11                   | The weight class selection resets (Girls/Boys classes differ); Go disables until a new class is picked                 | - [ ] |
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
| B-16 | Prior records     | Scroll to the bottom section                                    | "Official _historic_ records from prior weight classes" shows historical records with year spans, plus an "All time bests from this bodyweight" list (up to 12 by total). Older sheet tabs (Pre-Aug2026, Pre-June2025, Pre-2018) all contribute | - [ ] |
| B-17 | Youth date range  | Search a U11 or U13 class and check the prior-records year span | Youth history starts from 2014; other age groups from 1998                                                                                                                                                                  | - [ ] |
| B-19 | Standards load before selection resolves | Throttle the network (devtools "Slow 3G"), then select a weight class and click Go immediately | The spinner stays up until Standards actually render — no need to reselect the class or refresh the page | - [ ] |
| B-20 | Prior record row format | Read a prior-record row's title line | Formatted `<year span> Women's 49kg • Total:` — the bullet separates the class from the lift name | - [ ] |
| B-21 | Masters prior records | Search a Masters bracket (e.g. 35–39) with known history | Historical masters records appear. The sheets label these rows with a gender prefix (`W35`, `M40`); the app matches them to the bare bracket, so the section is not empty where history exists | - [ ] |
| B-22 | Open-ended top class | Search Women's 86+kg (or Men's 110+kg) | Prior classes with no ceiling are labelled with a plus (e.g. "86+kg"), and they match regardless of how heavy the current class runs | - [ ] |
| B-23 | Overlap vs. touching  | Search a class whose bounds meet an old class at a single number (e.g. Women's 77kg against an old 69.01–77kg class) | Old classes that genuinely share a bodyweight band are listed; ones that only meet at a shared boundary are not. The lightest class of each set (lower bound 0) is still listed | - [ ] |
| B-24 | Prior records refresh | Run a search, then search a different weight class without reloading | The prior-records list is fully replaced. No rows from the previous class remain, including where a lifter's Snatch, Clean & Jerk, and Total share one date | - [ ] |


### Printable record certificates

| ID   | Test                        | Steps                                                                                          | Expected result                                                                                                                                        | Pass  |
| ---- | --------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| B-25 | Print button appears        | Search a class/age group with a real record holder and scroll to the Standards cards            | A "Print" button shows under each lift that has a real holder                                                                                          | - [ ] |
| B-26 | Hidden for STANDARD         | Search a class where a lift's recordholder is "STANDARD"                                        | No "Print" button on that card. The weight and "STANDARD" still show                                                                                    | - [ ] |
| B-27 | Opens a PDF in a new tab    | Click "Print"                                                                                   | The button reads "Printing..." briefly, then a new tab shows a one-page landscape PDF with the ornamental border, the logo, the lifter's name in the banner, the class, the weight and lift, and the date. The address bar shows an opaque `blob:` URL - none of the record parameters are visible | - [ ] |
| B-34 | Popup blocker               | Enable a strict popup blocker, then click "Print"                                                | Either the new tab opens, or the PDF loads in the current tab. It must never silently do nothing                                                        | - [ ] |
| B-35 | Failed print is invisible   | Stop `npm run server`, then click "Print"                                                        | The originating page is completely unchanged - no error text, no stranded blank tab, button still reads "Print" and works again once the server is back. (A dedicated error page is a later change) | - [ ] |
| B-28 | Certificate matches page    | Compare the PDF against the card it was printed from                                            | Same lifter, weight and date. The date reads long-form (e.g. "October 18, 2025") regardless of how the sheet stores it. The meet name is deliberately not printed | - [ ] |
| B-32 | Long category wraps         | Print a certificate whose category line is long (e.g. an adaptive Masters 90+ open-ended class) | The category wraps onto a second line at full size - it must NOT shrink - and the lines below it move down to keep their spacing                         | - [ ] |
| B-33 | Long name fits the banner   | Print a certificate for the longest lifter name in the sheet                                     | The name shrinks to stay inside the name frame artwork, clear of its flared ends                                                                         | - [ ] |
| B-29 | Youth wording               | Print a certificate for a U11/U13/U15/U17 record                                                 | The class line reads "Girls"/"Boys" (e.g. "Under 11 Girls 30kg"), not "Women's"/"Men's"                                                                 | - [ ] |
| B-30 | Masters wording             | Print a certificate for a Masters record (e.g. 35-39)                                            | The class line reads "Masters 35-39 ..." - the sheet's `W35`/`M35` prefix is resolved to the bracket                                                    | - [ ] |
| B-31 | Absent from all-records list| Scroll to "All Current Record Holders" on the home page                                          | No "Print" buttons there - the capability is opt-in and the home list does not opt in                                                                    | - [ ] |

### Deep-linking

| ID   | Test                | Steps                                                                                   | Expected result                                                        | Pass  |
| ---- | ------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----- |
| B-18 | URL params auto-run | Run a search, copy the URL (contains `?ageGroup=…&weightClass=…`), open it in a new tab | The same search runs automatically on load with dropdowns pre-selected | - [ ] |

## 4. Section BA — Adaptive WSO Records (`/adaptive`)

**Not live yet.** The menu item is commented out in `Header.tsx`, so reach this page by typing
`/adaptive` directly. BA-01 is on hold until the page is ready to launch; the rest can be
exercised now.

| ID    | Test                  | Steps                                                                  | Expected result                                                                                                                                          | Pass  |
| ----- | --------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| BA-01 | Menu link (on hold)   | Once the menu item is uncommented, open the flyout menu                | "Adaptive WSO Records" appears directly below "WSO Records & Results" and opens `/adaptive`                                                               | - [ ] |
| BA-02 | Default view          | Load `/adaptive` fresh                                                 | Spinner, then the combined `Adaptive_All` view titled "All Adaptive Record Holders", laid out in Women/Men columns like the home page                     | - [ ] |
| BA-03 | Empty state           | Load `/adaptive` while the adaptive sheets still hold only standards    | "No adaptive records have been set yet." — **not** a spinner and not "Loading current records…"                                                           | - [ ] |
| BA-04 | No STANDARD rows      | Scan the view once records exist                                       | No entry shows "STANDARD" as the lifter name                                                                                                             | - [ ] |
| BA-05 | Category dropdown     | Choose a category, e.g. "Visual Impairment", then click Go            | The view switches to that category's sheet and the title becomes "Visual Impairment Record Holders". Selecting alone does nothing until Go is clicked     | - [ ] |
| BA-06 | Reset appears         | Observe the options bar before and after choosing a category           | No Reset button on the combined view; Reset appears once a category is chosen                                                                             | - [ ] |
| BA-07 | Reset returns to all  | Click Reset                                                            | Back to the combined all-categories view, and the Reset button disappears again                                                                           | - [ ] |
| BA-08 | Cached categories     | Visit a category, Reset, then choose that same category again          | It renders immediately; the network tab shows no second request for that sheet                                                                            | - [ ] |
| BA-09 | Fetch failure         | Load with the sheet unreachable (e.g. offline)                         | "Adaptive records could not be loaded. Please try again later." instead of an endless spinner                                                             | - [ ] |
| BA-10 | Adaptive print buttons| Load `/adaptive` with records present                                  | Each record shows a "Print" button, and the PDF's class line carries the category (e.g. "Adaptive (Physical Disability) Women's Open 53kg")               | - [ ] |
| BA-11 | Category changes tab  | Print from the combined view, then pick a category, click Go and print the same athlete | The certificate's category wording changes from "Adaptive (Overall)" to that category's wording, because the record is read from that category's tab     | - [ ] |

## 5. Section C — Local Meet Results (`/local-meet-results`)

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

## 6. Section D — Senior Nationals Qualification Rankings (`/goals`)

| ID   | Test                 | Steps                                                                                               | Expected result                                                                                                                                                                | Pass  |
| ---- | -------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- |
| D-01 | Intro & link         | Open the page; click "USAW's public rankings site"                                                  | Intro text about 2027 Senior Nationals qualification renders, mentioning the top twelve (six for the lightest classes) and that up to ten extras are shown; link opens `usaweightlifting.sport80.com/public/rankings/all` in a new tab | - [ ] |
| D-02 | Rankings layout      | Select a weight class and click Go                                                                  | A per-class spinner ("Fetching"), then the ranking column renders beside the intro text; each row is a rank number in a circle followed by weight • name • club or WSO • lift date | - [ ] |
| D-03 | Qualification counts | Count entries in a populated class                                                                  | Up to 22 entries per class (12 qualifying + 10 possible), except the two lightest classes per gender which list up to 16 (6 qualifying + 10 possible). Classes with less national depth simply list fewer | - [ ] |
| D-04 | WSO member highlight | Find a California North Central lifter in a list                                                    | WSO members are gold-highlighted and show their club; non-members show their WSO name instead                                                                                  | - [ ] |
| D-05 | Possible entries     | Look at the entries below the qualifying cutoff (below rank 12, or rank 6 for the lightest classes) | Up to 10 extra entries render in blue text and are tagged "• _Possible_" in italics; WSO member gold-highlighting still applies to those rows                                   | - [ ] |
| D-06 | Rank circles         | Check the rank numbers down a weight class list                                                     | Ranks count 1, 2, 3… in order with no gaps; the circle's number matches the row's text color (gold for highlighted WSO members, blue for possible entries, default otherwise)  | - [ ] |
| D-07 | Verification pass    | Watch a class immediately after the rankings arrive                                                 | The list renders right away with a small "Verifying" spinner beneath it. When it clears, totals unsupported by a real meet are corrected or removed and the list re-sorts       | - [ ] |
| D-08 | Qualifying window    | Check the lift dates down a list                                                                    | Every date falls inside the Nationals qualifying window (Feb 4, 2026 – Feb 4, 2027). This window is hardcoded and must be updated each year — see `nationalsQualifyingStartDate` in `src/Data/RoutesAndSettings.ts` | - [ ] |
| D-09 | Stale-window fallback | After Nationals (Mar 7, 2027) has passed with no updated dates entered, reload the page             | Rankings fall back to a rolling 16-month window ending today rather than the stale qualifying window; lift dates reflect the newer range                                        | - [ ] |
| D-10 | Deep-link            | Run a search, copy the URL (contains `?weightClass=…`), open it in a new tab                        | The same weight class loads automatically with the dropdown pre-selected                                                                                                       | - [ ] |

## 7. Section E — About (`/info`)

| ID   | Test            | Steps                                                                                         | Expected result                                                                          | Pass  |
| ---- | --------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----- |
| E-01 | Content renders | Open the page                                                                                 | Three info boxes: "About Records," "About Last Year's Lifts," "About This Site"          | - [ ] |
| E-02 | External links  | Click each link: American Records, WSO committee info, public Google spreadsheet, GitHub repo | Each opens the correct destination; the spreadsheet is publicly viewable without sign-in | - [ ] |
| E-03 | Contact link    | Click the maintainer email link                                                               | A `mailto:` compose window opens with the maintainer's address                           | - [ ] |

## 8. Section F — Hidden / admin routes

| ID   | Test                  | Steps                                                                   | Expected result                                                                                                                          | Pass  |
| ---- | --------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| F-01 | Scripts password gate | Navigate directly to `/scripts`; enter a wrong password and press Enter | "Incorrect password." shows; the tools remain hidden                                                                                     | - [ ] |
| F-02 | Scripts unlock        | Enter the correct password (from the maintainer)                        | Script dropdown appears with "Fetch Record Updates" and "Fetch Adaptive Record Updates", plus a Run button                               | - [ ] |
| F-03 | Run script            | Click Run and wait (do not run twice concurrently)                      | "Running…" shows, then `record-breaking-analysis.csv` downloads and "Download complete." appears; open the CSV and sanity-check contents | - [ ] |
| F-04 | Script error display  | Run with the proxy server stopped                                       | An error message displays instead of a silent failure                                                                                    | - [ ] |
| F-05 | Run adaptive script   | Select "Fetch Adaptive Record Updates", click Run and wait              | `adaptive-record-breaking-analysis.csv` downloads; every roster athlete resolves to a member id, and each row names an adaptive category the athlete is registered for | - [ ] |

## 9. Section G — Error handling & resilience

| ID   | Test                 | Steps                                                                                | Expected result                                                                                                                         | Pass  |
| ---- | -------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| G-01 | Proxy down           | Stop `npm run server`, reload `/`, and run a search                                  | USAW-backed data fails gracefully — no white-screen crash. Note what the user sees for each section                                     | - [ ] |
| G-02 | Sheets failure       | Load `/` with an invalid `REACT_APP_GOOGLE_API_KEY`                                  | The page does not crash and does not show stale/misleading content (known gap: no visible error or retry affordance) | - [ ] |
| G-03 | Meets failure        | Open `/local-meet-results` with the proxy down                                       | Explicit "Failed to load meets…" error message shows                                                                                    | - [ ] |
| G-04 | Plausibility filters | Spot-check top athletes and meet results                                             | No absurd values appear (the app drops results above 200 snatch / 280 C&J / 470 total as data errors)                                   | - [ ] |
| G-05 | Bad deep-links       | Open `/?ageGroup=BOGUS&weightClass=BOGUS` and `/local-meet-results?meetId=999999999` | No crash; app either ignores the params or shows an error/empty state                                                                   | - [ ] |
| G-06 | Unknown route        | Navigate to `/does-not-exist`                                                        | Header renders with an empty body (no route matches); no crash                                                                          | - [ ] |
| G-07 | Certificate not found | `curl -X POST -H 'Content-Type: application/json' -d '{"ageGroup":"OPEN","gender":"female","weightClass":"999","lift":"Snatch"}' localhost:5001/api/certificate` | `404` with a JSON error, not a crash and not an empty PDF                                                          | - [ ] |
| G-08 | Certificate bad tab   | POST the same body with `"sheet":"NoSuchTab"` added                                 | `404`. Google reports a missing tab as a `400 INVALID_ARGUMENT`, so this confirms the translation                                                        | - [ ] |
| G-09 | Certificate bad input | POST with `"sheet":""`, again with a 200-character sheet name, again with a 200-character `category`, and again with an empty body `{}` | `400` every time, and no outbound request to Google (check the server log)                              | - [ ] |
| G-10 | Certificate no key    | Restart the server with `REACT_APP_GOOGLE_API_KEY` unset, then POST a certificate    | `503` with a logged reason; the server stays up and the rest of the site still serves                                                                   | - [ ] |
| G-11 | Certificate GET is gone | `curl -i 'localhost:5001/api/certificate?ageGroup=OPEN&gender=female&weightClass=53&lift=Snatch'` | Falls through to the SPA (HTML, not a PDF). There is no GET URL that renders a certificate                        | - [ ] |

## 10. Section H — Responsive & cross-browser

The stylesheets contain no media queries, so mobile layout is a known risk area.

| ID   | Test                | Steps                                                    | Expected result                                                                          | Pass  |
| ---- | ------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----- |
| H-01 | Mobile: home        | View `/` at ~375px width                                 | Women/Men two-column layout is readable without horizontal scrolling or overlapping text | - [ ] |
| H-02 | Mobile: menu        | Open and use the flyout menu at mobile width             | Menu icon is tappable; flyout is fully visible and links work                            | - [ ] |
| H-03 | Mobile: other pages | View `/local-meet-results` and `/goals` at mobile width  | Columns, dropdowns, and lists remain usable                                              | - [ ] |
| H-04 | Cross-browser smoke | Repeat A-01–A-03, B-08, C-02, D-02 in Safari and Firefox | Behavior matches Chrome                                                                  | - [ ] |

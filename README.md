# Records Explorer

Records Explorer is a React app built to allow athletes in a specific region to browse and track their local weightlifting records. It pulls live athlete rankings from the USAW Sport80 API and cross-references them against a Google Sheets database of recognized records, giving coaches and athletes a clear view of who holds records and which recent lifts are close to breaking them.

The application also displays historical bests across all weight classes going back to 2014: we hope athletes will find this motivating and feel that no matter how the weight classes shift, their achievements will remain seen and celebrated.

The app displays records organized by weight class and age group (Open, Youth, Junior, Senior, and all Masters bands), showing snatch, clean & jerk, and combined total bests for each category. Each record entry links out to the source meet result, and the app also surfaces the "all current records" view so you can see every record holder at a glance. The app additionally provides quick links to the USAW national American Records page, the WSO's meet schedule, and its USAW profile.

## Installing & Running Locally

The app has some dependencies, and once set up, there are two processes that must run at the same time: the **React dev server** and the **Node.js proxy server**. These will need to be in separate terminal tabs or windows.

### Prerequisites

- Node.js 24+
- An API key for [Google Sheets](https://support.google.com/googleapi/answer/6158862?hl=en). 

### App Install & Further Setup

- Run `npm install` to get all javascript dependencies installed automatically.
- Add Google Sheets and Sport80 keys to a `.env.local` local file in the project folder (see [Configuring for your WSO](#configuring-for-your-wso))

### Start both servers

Open two terminal tabs:

**Tab 1 — Node.js proxy (port 5001):**
```bash
npm run server
```

**Tab 2 — React dev server (port 3000):**
```bash
npm start
```

Then open [http://localhost:3000](http://localhost:3000). The React dev server automatically proxies `/api/lifter-data` requests to the Node server on port 5001.

> **Note:** Starting only `npm start` without the proxy server will result in failed API requests and an empty records view.

### Hosting requirements

This app requires a platform that can run Node.js — **static hosting will not work**. There are two reasons:

1. **CORS proxy** — the Express server in `server/index.js` proxies requests to the Sport80 API on behalf of the browser. Without it, all API calls will be blocked by CORS.
2. **Runtime secrets** — API credentials are injected into the page by the server at request time. They are not stored plainly in static code.

So far, we're having a good experience with [Fly.io](https://fly.io). The repo includes a `Dockerfile` and `fly.toml` for Fly.io deployments.

Platforms that do **not** work: GitHub Pages, or any other CDN-only host.

## Generating a List of Newly Broken Records

The `analyze-records` script scans all weight class / age group combinations, compares the current top athletes' best lifts against recognized records, and outputs a CSV of lifts that would set new records.

### Running the script

```bash
npm run analyze-records
```

The script will:
1. Fetch the current records database from the configured Google Sheet
2. Query the USAW Sport80 API for the top athletes in every weight class / age group combination (up to ~198 pairs)
3. Compare each athlete's best snatch, clean & jerk, and total against the existing record
4. Write results to `record-breaking-analysis.csv` in the project root

### Output format

The generated CSV (`record-breaking-analysis.csv`) has the following columns:

| Column | Description |
|--------|-------------|
| Age Group | e.g. `Open`, `Junior`, `Masters (35-39)` |
| Weight Class | e.g. `Women's 63kg`, `Men's 89kg` |
| Lift | `Snatch`, `Clean & Jerk`, or `Total` |
| Athlete | Athlete's full name |
| Weight (kg) | The lift weight |
| Date | Date the lift was performed |
| Event | Meet name |
| Current Record (kg) | The existing record that would be broken |
| Current Holder | Name of the current record holder |

### Requirements

- An active internet connection (the script calls both the USAW API and Google Sheets)
- The API credentials in `.env.local` must be valid (see [Configuring for your WSO](#configuring-for-your-wso) below)

### Performance

The script rate-limits its requests to be respectful to the upstream APIs. A full run across all combinations typically takes **5–15 minutes**.

### Customization

To adjust what gets analyzed, edit `scripts/analyze-records.js`:
- Change the number of top athletes checked per combination (default: 5) in the `fetchTopAthletes` call
- Modify which age groups or weight classes are included

## Configuring for your WSO

The app is designed to be adapted for any USAW WSO. All WSO-specific settings live in one file: [`src/Data/wsoConfig.json`](src/Data/wsoConfig.json). [`src/Data/RoutesAndSettings.ts`](src/Data/RoutesAndSettings.ts) re-exports these values to the rest of the app (with a comment on each), and holds the USAW platform settings, which are the same for every WSO and should not need to change. The node scripts in `scripts/` read the same JSON file.

The app checks the file against `configSchema` in `RoutesAndSettings.ts` when it loads: a missing required field, or a field of the wrong type, fails with an error naming it. Fields marked optional (`'name?'`) may be left out, and fields the schema doesn't list are ignored. When you add a setting, add it to the schema too.

For every field's type, whether it's required, and an example value, see [CONFIG_README.md](CONFIG_README.md).

### 1. WSO identity

| Field | What it is |
| --- | --- |
| `wsoId` | Your WSO's Sport80 numeric ID. Find it in the Sport80 admin portal or by inspecting API requests on the USAW rankings site. |
| `wsoOfficialName` | Your WSO's name exactly as Sport80 reports it, e.g. `"California North Central"`. Used to highlight your WSO's lifters on the Goals page. |
| `wsoDisplayName` | Optional. The name shown in the header, the page title, and as `<name> WSO` across the top of certificates. Leave it out to show `wsoOfficialName`. |
| `wsoRegions` | Sport80 region ids for your state or states, e.g. `["66"]`. The Local Meets page requests the meet list once per region and lists the results together. |
| `wsoStateNames` | Your state or states as written in Sport80 meet addresses, e.g. `["California"]`. Used to show each local meet's city. |
| `recordTimeZone` | IANA time zone record dates are kept in, e.g. `"America/New_York"`. Decides what "today" is for every date range and how certificate dates print. |
| `allTimeStartDate` | How far back the all-time record search reaches (`YYYY-MM-DD`). |

### 2. Records Google Sheet

The app reads recognized records from a Google Sheet. Create a sheet with the expected column layout and set:

| Field | What it is |
| --- | --- |
| `currentRecordsSheetId` | The long string in the sheet's URL: `https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit`. The public spreadsheet link on the site is built from it. |
| `currentRecordsSheetName` | The tab holding current records. |
| `priorRecordsSheetNames` | History tabs in the same spreadsheet, newest first. Use `[]` if you have none. |
| `adaptiveLiftersListSheetId`, `adaptiveLiftersListSheetName` | Optional. The adaptive athlete roster sheet and tab, read by the adaptive records script. |
| `standardKey` | The lifter-column text that marks a record standard nobody has reached yet, e.g. `"STANDARD"`. |
| `adaptiveAllRecordsSheetName` | Optional. The tab holding the combined adaptive records, e.g. `"Adaptive_All"`. |
| `adaptiveCategoryRecordsSheetNames` | Optional. The tab for each adaptive category you track, keyed `physical`, `hearing`, `vision`, `cognitive`. With none, the Adaptive Records page's dropdown is empty. |

### 3. Adaptive records

| Field | What it is |
| --- | --- |
| `showAdaptiveRecordsInMenu` | Optional. Whether the header menu links to the Adaptive WSO Records page. Treated as `false` when left out. |
| `adaptiveOptInFormUrl` | Optional. The form adaptive athletes use to opt in. |

### 4. Certificates

| Field | What it is |
| --- | --- |
| `includeClubNameOnCertificate` | Whether certificates print the record's club, when the sheet row has one. |
| `certificateWebsiteText` | Printed in the corner of every certificate. `""` prints nothing. |

The certificate logo is an image file that exists in two places: `public/WSOLogo.png` (header and favicon) and `server/certificate/assets/WSOLogo.png` (certificates). Replace both. The certificate copy must be an 8-bit, non-palette PNG.

### 5. Links and maintainer

`localScheduleUrl`, `localHomeUrl`, and `wsoInfoUSAWUrl` must be full `https://` URLs. `maintainerName` and `maintainerEmail` are shown on the site.

### 6. Rules

| Field | What it is |
| --- | --- |
| `wsoBoundary` | Optional. A `{ north, south, west, east }` lat/lng box; local meets outside it are not listed. Leave it out to list every local meet in `wsoRegions`. |
| `ineligibleAthletes` | Full names, as Sport80 spells them, of athletes who may not hold your WSO's records (e.g. because they live outside the WSO). Use `[]` if none. |
| `scriptsPassword` | The SHA-256 hex digest of `<password>---<display name>` that unlocks the `/scripts` page, where the display name is `wsoDisplayName`, or `wsoOfficialName` when there is none. Because the name is part of the input, changing it means regenerating this. |

### Other WSO-specific content

Some wording is not a setting: the copy on the About page (`src/Info/Info.tsx`) describes California North Central's region and standards votes. Edit it directly.

### 7. Set your API credentials

Copy `.env.local.example` to `.env.local` (or create it) and fill in your credentials:

```
REACT_APP_GOOGLE_API_KEY=a_google_api_key
REACT_APP_SPORT80_API_TOKEN=a_sport80_api_token
```

- **Google API key** — create one in the [Google Cloud Console](https://console.cloud.google.com/) with the Sheets API enabled, and restrict it to your domain
- **Sport80 API token** — contact USAW or find it in the Sport80 admin portal for your WSO

# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)

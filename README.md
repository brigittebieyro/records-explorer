# Records Explorer

Records Explorer is a React app built to allow athletes in a specific region to browse and track their local weightlifting records. It pulls live athlete rankings from the USAW Sport80 API and cross-references them against a Google Sheets database of recognized records, giving coaches and athletes a clear view of who holds records and which recent lifts are close to breaking them.

The application also displays historical bests across all weight classes going back to 2014: we hope athletes will find this motivating and feel that no matter how the weight classes shift, their achievements will remain seen and celebrated.

The app displays records organized by weight class and age group (Open, Youth, Junior, Senior, and all Masters bands), showing snatch, clean & jerk, and combined total bests for each category. Each record entry links out to the source meet result, and the app also surfaces the "all current records" view so you can see every record holder at a glance. The app additionally provides quick links to the USAW national American Records page, the WSO's meet schedule, and its USAW profile.

## Running Locally

The app has two processes that must run at the same time: the **React dev server** and the **Node.js proxy server**. The proxy is required because the USAW Sport80 API does not allow direct browser requests — the server forwards them and also injects API credentials at runtime.

### Prerequisites

- Node.js 18+
- API credentials set in `.env.local` (see [Configuring for your WSO](#configuring-for-your-wso))

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
2. **Runtime secrets** — API credentials are injected into the page by the server at request time. They are never baked into the static build, so a static host has no way to supply them.

Platforms that work: [Fly.io](https://fly.io), [Railway](https://railway.app), [Render](https://render.com), or any VPS that can run a Docker container. The repo includes a `Dockerfile` and `fly.toml` for Fly.io deployments.

Platforms that do **not** work: Netlify, GitHub Pages, Vercel (static/edge), S3 + CloudFront, or any other CDN-only host.

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

The app is designed to be adapted for any USAW WSO. All WSO-specific settings live in one file: [`src/Data/RoutesAndSettings.ts`](src/Data/RoutesAndSettings.ts).

### 1. Set your WSO identity

```ts
export const wsoId = 21;           // Your WSO's Sport80 numeric ID
export const wsoName = 'California North Central';  // Display name
```

Find your `wsoId` in the USAW Sport80 admin portal or by inspecting API requests on the USAW rankings site.

### 2. Point to your records Google Sheet

The app reads recognized records from a Google Sheet. Create a sheet with the expected column layout and update:

```ts
export const currentRecordsSheetId = 'YOUR_SHEET_ID';
export const currentRecordsSheetName = 'Raw_Data';  // or whatever your tab is named
```

The Sheet ID is the long string in the sheet's URL: `https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit`.

### 3. Update external links

```ts
export const localScheduleUrl = 'https://yourwso.org/meet-schedule';
export const localHomeUrl     = 'https://yourwso.org';
export const wsoInfoUSAWUrl   = 'https://www.usaweightlifting.org/club-wso/wso-information/your-wso';
```

### 4. Set the maintainer info

```ts
export const maintainerEmail = 'you@example.com';
export const maintainerName  = 'Your Name';
```

### 5. Configure date ranges

```ts
export const allTimeStartDate      = '1998-01-01'; // How far back to search for records
export const youthAllTimeStartDate = '2014-01-01'; // Start date for youth records
export const endDate               = '2026-08-01'; // When the current weight classes expire
```

### 6. Add ineligible athletes

If your WSO has any rules which preclude specific athletes from holding records, you can list them here. California North Central requires that all recordholders live within the WSO area, athletes who reside in other states or countries can not hold these records.

```ts
export const ineligibleAthletes: string[] = ['Full Name', 'Another Name'];
```

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

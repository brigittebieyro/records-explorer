# Configuring `wsoConfig.json`

Every WSO-specific setting lives in one file: [`src/Data/wsoConfig.json`](src/Data/wsoConfig.json). To run this app for your own WSO, edit that file. You shouldn't need to change any code for it.

- The web app reads the file through [`src/Data/RoutesAndSettings.ts`](src/Data/RoutesAndSettings.ts), which also holds the USAW platform settings that are the same for every WSO.
- The scripts in `scripts/` read the JSON file directly.
- API credentials do **not** go in this file. They go in `.env.local` (see the [README](README.md#7-set-your-api-credentials)).

Setting up a new WSO? `npm run setup-application` asks for each required setting and writes this file for you, and can make the records spreadsheet too (see the [README](README.md#setting-up-with-npm-run-setup-application)). Add the optional settings below afterwards.

## How the file is checked

When the app loads, it checks the file against `configSchema` in `RoutesAndSettings.ts`. If a required field is missing or a value has the wrong type, the app stops with an error that names every bad field, for example:

```
wsoConfig.json has missing or malformed fields: wsoId, wsoBoundary.east
```

Things the check does **not** catch:

- **Misspelled field names.** Fields the schema doesn't list are ignored. A misspelled required field shows up as missing, but a misspelled optional field (for example `wsoBounday`) is silently ignored.
- **Wrong values of the right type.** The check only looks at shape. A wrong sheet id or a time zone name that doesn't exist will pass, and fail later when it's used.
- **Script runs.** The scripts in `scripts/` don't run this check.

JSON doesn't allow comments or trailing commas.

## Value types

| Type | What's accepted | Example |
| --- | --- | --- |
| integer | A whole number, not in quotes | `21` |
| number | Any number, not in quotes | `-124.41` |
| string | Text in double quotes. `""` is allowed. | `"California North Central"` |
| boolean | `true` or `false`, not in quotes | `true` |
| date | A string in `YYYY-MM-DD` form | `"1998-01-01"` |
| URL | A string starting with `http://` or `https://` | `"https://example.org"` |
| list of strings | Strings in square brackets. `[]` is allowed. | `["66"]` |

## Quick reference

Most itemps are required.
Optional items:
`wsoDisplayName`,
`wsoBoundary`
all of the adaptive records settings.

| Field | Type | Required | Section |
| --- | --- | --- | --- |
| `wsoId` | integer | yes | [WSO identity](#wso-identity) |
| `wsoOfficialName` | string | yes | [WSO identity](#wso-identity) |
| `wsoDisplayName` | string | **no** | [WSO identity](#wso-identity) |
| `wsoRegions` | list of strings | yes | [WSO identity](#wso-identity) |
| `wsoStateNames` | list of strings | yes | [WSO identity](#wso-identity) |
| `recordTimeZone` | string | yes | [WSO identity](#wso-identity) |
| `allTimeStartDate` | date | yes | [WSO identity](#wso-identity) |
| `currentRecordsSheetId` | string | yes | [Records Google Sheet](#records-google-sheet) |
| `currentRecordsSheetName` | string | yes | [Records Google Sheet](#records-google-sheet) |
| `priorRecordsSheetNames` | list of strings | **no** | [Records Google Sheet](#records-google-sheet) |
| `standardKey` | string | yes | [Records Google Sheet](#records-google-sheet) |
| `adaptiveAllRecordsSheetName` | string | **no** | [Adaptive records](#adaptive-records) |
| `adaptiveCategoryRecordsSheetNames` | object of up to 4 strings | **no** | [Adaptive records](#adaptive-records) |
| `adaptiveLiftersListSheetId` | string | **no** | [Adaptive records](#adaptive-records) |
| `adaptiveLiftersListSheetName` | string | **no** | [Adaptive records](#adaptive-records) |
| `adaptiveOptInFormUrl` | URL | **no** | [Adaptive records](#adaptive-records) |
| `showAdaptiveRecordsInMenu` | boolean | **no** | [Adaptive records](#adaptive-records) |
| `includeClubNameOnCertificate` | boolean | yes | [Certificates](#certificates) |
| `certificateWebsiteText` | string | **no** | [Certificates](#certificates) |
| `localScheduleUrl` | URL | **no** | [Links and contact](#links-and-contact) |
| `localHomeUrl` | URL | **no** | [Links and contact](#links-and-contact) |
| `wsoInfoUSAWUrl` | URL | yes | [Links and contact](#links-and-contact) |
| `maintainerName` | string | yes | [Links and contact](#links-and-contact) |
| `maintainerEmail` | string | yes | [Links and contact](#links-and-contact) |
| `wsoBoundary` | object of 4 numbers | **no** | [Eligibility and access](#eligibility-and-access) |
| `ineligibleAthletes` | list of strings | **no** | [Eligibility and access](#eligibility-and-access) |
| `scriptsPassword` | string | yes | [Eligibility and access](#eligibility-and-access) |

---

## WSO id number

### `wsoId` (integer)
Your WSO's numeric id in Sport80, the system behind the USAW rankings. Every rankings query is filtered to it. You can find it in the `wso` filter of the public requests the public USAW rankings site makes.

```json
"wsoId": 21
```

### `wsoOfficialName` (string)
Your WSO's name, spelled exactly as Sport80 spells it. The Goals page compares it with each lifter's WSO in the rankings to pick out your WSO's lifters, so any difference in spelling, spacing or capitals means none are picked out. It's also the name shown on the site when there's no [`wsoDisplayName`](#wsodisplayname-string-optional).

```json
"wsoOfficialName": "California North Central"
```

### `wsoDisplayName` (string, optional)
The name to show people, if it differs from the official one (for example, a shorter form). It appears:
- in the site header and page title,
- across the top of every certificate as `<name> WSO`,
- in the wording on the Goals and Records pages.

Leave it out to show `wsoOfficialName` everywhere instead.

The scripts page password depends on this name. If you add, remove or change it, generate a new [`scriptsPassword`](#scriptspassword-string).

```json
"wsoDisplayName": "NorCal"
```

### `wsoRegions` (list of strings)
The Sport80 region ids of your state or states. The Local Meets page fetches the meet list once for each region and combines the results. An empty list passes the check but shows no meets.

```json
"wsoRegions": ["66"]
```

### `wsoStateNames` (list of strings)
Your state or states, written the way they appear in Sport80 meet addresses (`"California"`, not `"CA"`). The Local Meets page looks for these names in each meet's address to show its city.

```json
"wsoStateNames": ["California"]
```

### `recordTimeZone` (string)
The [IANA time zone](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones) your record dates are kept in. It decides what "today" is for every date range, in the app and in the scripts, and how dates print on certificates. Using one fixed zone means a record's date doesn't shift depending on where the viewer is.

```json
"recordTimeZone": "America/Los_Angeles"
```

### `allTimeStartDate` (date)
How far back the all-time history searches go. U11 and U13 use their own start date, set in code, because those age groups have a shorter history.

```json
"allTimeStartDate": "1998-01-01"
```

---

## Records Google Sheet

Your recognized records live in a Google Sheet. The app reads it with a Google API key, so the sheet must be shared as "anyone with the link can view." The site also links to it publicly.

### `currentRecordsSheetId` (string)
The id from the spreadsheet's URL: `https://docs.google.com/spreadsheets/d/<THIS PART>/edit`. The scripts read the same sheet, so pointing this at a test copy points them there too.

```json
"currentRecordsSheetId": "1ZAs27jQCPYTVgLuQ-feBHSO-BgGjGCewUs0djG23pXQ"
```

### `currentRecordsSheetName` (string)
The name of the tab that holds the current records. It's the tab name as shown at the bottom of the sheet, not the spreadsheet's title.

```json
"currentRecordsSheetName": "Post-Aug2026"
```

### `priorRecordsSheetNames` (list of strings, optional)
Tabs in the same spreadsheet that hold records from earlier periods, such as before a weight class change. List them newest first. The app reads them all for record history. Leave the field out, or use `[]`, if you have none.

```json
"priorRecordsSheetNames": ["Pre-Aug2026", "Pre-June2025", "Pre-2018"]
```

### `standardKey` (string)
The text in a record's lifter column that marks a record standard: a mark your WSO has set that nobody has reached yet. The site shows these as standards rather than record holders, and doesn't offer a certificate for them. It must match the sheet exactly, including capitals.

```json
"standardKey": "STANDARD"
```

---

## Adaptive records

Adaptive records are optional. Every setting in this section can be left out, and a blank string (`""`) counts as left out. The Adaptive Records page at `/adaptive` is always served; what it and the rest of the site offer depends on which settings are present:

| You set | What you get |
| --- | --- |
| `adaptiveAllRecordsSheetName` | The combined records, which the Adaptive Records page opens on. |
| Tabs in `adaptiveCategoryRecordsSheetNames` | Those categories in the Adaptive Records page's category picker. With none, the page has no category picker. |
| `showAdaptiveRecordsInMenu` set to `true` | The Adaptive WSO Records menu item. |
| Both `adaptiveLiftersListSheetId` and `adaptiveLiftersListSheetName`, plus `adaptiveAllRecordsSheetName` or at least one category tab | The "Fetch Adaptive Record Updates" script on `/scripts`. |

When any of `adaptiveAllRecordsSheetName`, `adaptiveLiftersListSheetName`, `adaptiveLiftersListSheetId` or `adaptiveOptInFormUrl` is left out, the Adaptive Records page lists them below its summary: "Adaptive configs are missing: …".

### `adaptiveLiftersListSheetId` (string, optional)
The id of the spreadsheet that holds your adaptive athletes and their categories. It's taken from the URL the same way as [`currentRecordsSheetId`](#currentrecordssheetid-string), and can be the same spreadsheet or a different one.

### `adaptiveLiftersListSheetName` (string, optional)
The tab in that spreadsheet that lists the athletes. The adaptive records script needs both this and `adaptiveLiftersListSheetId`.

```json
"adaptiveLiftersListSheetId": "1hO6VHntKEujjtx8P0kIMJQ_vM46INg2D_jHei_HZUW0",
"adaptiveLiftersListSheetName": "IDsAndCategories"
```

The athletes tab marks each athlete's categories with TRUE/FALSE columns: one for each category you set a tab for, in the order physical, hearing, vision, cognitive.

### `adaptiveAllRecordsSheetName` (string, optional)
The tab, in the [current records spreadsheet](#currentrecordssheetid-string), that holds the combined adaptive records across every category. The adaptive records script checks every athlete on the roster against it. When it's set, the Adaptive Records page opens on these records until someone picks a category, and goes back to them on Reset. When it's left out, the page opens on its description alone. With no category tabs, the page shows only these records and no category picker.

```json
"adaptiveAllRecordsSheetName": "Adaptive_All"
```

### `adaptiveCategoryRecordsSheetNames` (object of up to 4 strings, optional)
The tab, in the same spreadsheet, for each adaptive category you track. The keys are `physical`, `hearing`, `vision` and `cognitive`; leave out any category you don't track, and it won't appear on the site. Without any category tabs the page has no category picker.

```json
"adaptiveCategoryRecordsSheetNames": {
  "physical": "Adaptive_Physical",
  "hearing": "Adaptive_Hearing",
  "vision": "Adaptive_Vision",
  "cognitive": "Adaptive_Cognitive"
}
```

The category names shown on the site and on certificates are wording, not tab names, so they're set in `RoutesAndSettings.ts`.

### `adaptiveOptInFormUrl` (URL, optional)
The form adaptive athletes fill in to opt in. When it's set, the Adaptive Records page links to it; when it's left out, the page leaves out the opt-in paragraph.

```json
"adaptiveOptInFormUrl": "https://forms.gle/2Y7qKS7C2pa3d4jLA"
```

### `showAdaptiveRecordsInMenu` (boolean, optional)
Whether the header menu links to the Adaptive WSO Records page. Set to `false`, or leave it out, to hide the menu item; the page still works for anyone who has its address.

```json
"showAdaptiveRecordsInMenu": true
```

---

## Certificates

### `includeClubNameOnCertificate` (boolean)
Whether certificates print the record holder's club. Even when this is `true`, a certificate prints a club only if the sheet row has one. A tab with no `clubName` column never prints a club.

```json
"includeClubNameOnCertificate": true
```

### `certificateWebsiteText` (string, optional)
Text printed in the corner of every certificate, usually your website. Leave the field out, or use `""`, to print nothing there.

```json
"certificateWebsiteText": "www.canorthcentralwso.org"
```

The certificate logo is an image file, not a setting. Replace both `public/WSOLogo.png` (header and favicon) and `server/certificate/assets/WSOLogo.png` (certificates). The certificate copy must be an 8-bit PNG that doesn't use a color palette.

---

## Links and contact

### `localScheduleUrl`, `localHomeUrl` (URL, optional)
Your WSO's meet schedule and home page. Each one that's set is linked from the header menu. Leave a field out to drop its menu link.

### `wsoInfoUSAWUrl` (URL)
Your WSO's page on the USA Weightlifting site. It's linked from the About page.

```json
"localScheduleUrl": "https://canorthcentralwso.org/meet-schedule",
"localHomeUrl": "https://canorthcentralwso.org",
"wsoInfoUSAWUrl": "https://www.usaweightlifting.org/club-wso/wso-information/california-north-central"
```

### `maintainerName`, `maintainerEmail` (string)
Who to contact about the site. The About page shows the name as a link that emails the address, so both are public.

---

## Eligibility and access

### `wsoBoundary` (optional)
A latitude/longitude box around your WSO. When it's set, the Local Meets page lists only meets inside the box, and drops meets with no location. Leave the field out entirely to list every meet in `wsoRegions`. This is useful when your WSO covers only part of a state.

If you include it, it must have all four keys, each a number:

```json
"wsoBoundary": {
  "north": 42.01,
  "south": 34.79,
  "west": -124.41,
  "east": -114.13
}
```

West and east are negative in the Americas. Remove the whole field to turn the filter off; setting it to `null` or `{}` fails the check.

### `ineligibleAthletes` (list of strings, optional)
Full names of athletes who may not hold your WSO's records, for example because they live outside the WSO. Spell each name exactly as Sport80 does. The app and the record-breaking scripts skip these athletes. Leave the field out, or use `[]`, if there are none.

```json
"ineligibleAthletes": ["Imaginary B. Athlete"]
```

### `scriptsPassword` (string)
Unlocks the `/scripts` page. Don't put the password itself here. Instead, put a **hash** of it: a 64-character code made from the password that can't be turned back into it. When someone enters a password on the `/scripts` page, the site hashes what they typed and checks it against this value.

The hash is made from the password joined to your display name by three dashes. The display name is `wsoDisplayName`, or `wsoOfficialName` if there's no `wsoDisplayName`:

```
<password>---<display name>
```

```json
"scriptsPassword": "ea08af88f45b2031464da9a3f5ffcfb993dff502fc1b945beee186764a21a89d"
```

#### Making a hash for a new password

You need [Node.js](https://nodejs.org/), which you already have if you can run the app.

1. **Set the names first.** The hash includes the display name, so fill in `wsoOfficialName`, and `wsoDisplayName` if you use one, and save `wsoConfig.json`.
2. **Open a terminal in the project folder,** the one that contains `package.json`.
3. **Run this command:**

   ```sh
   npm run update-password
   ```

4. **Type the password and press Enter.** It isn't shown as you type, and it isn't saved in your terminal history. The command makes the hash, writes it into `scriptsPassword` in `wsoConfig.json`, and prints it along with the display name it used.
5. **Check it.** Start the app (`npm start`), go to `/scripts`, and enter the password. If it's rejected, check that the names in the config are the same as when you made the hash, and run the command again.

#### When you need a new hash

- **To change the password.** Make a hash for the new password; the old password stops working once you deploy.
- **After changing the display name.** That includes adding, changing or removing `wsoDisplayName`, or changing `wsoOfficialName` when there's no `wsoDisplayName`. Make the hash again, even if the password stays the same.
eps that from working; for example, four or more random words.

---

## Adding a new setting

1. Add the field to `wsoConfig.json`.
2. Add it to `configSchema` in `RoutesAndSettings.ts` with its type. Put a `?` at the end of the name (`'name?'`) to make it optional.
3. Export it from `RoutesAndSettings.ts` for the rest of the app to use.
4. Document it here.

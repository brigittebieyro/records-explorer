---
name: "Analyze Record Breaking Lifts"
description: "Build the application and generate a comprehensive markdown report of lifts that would break existing records across all weight class and age group combinations"
author: "Records Explorer"
version: "1.0.0"
---

# Analyze Record Breaking Lifts Skill

## Overview

This skill automates the process of analyzing the Records Explorer application to identify lifts in the current top athletes section that would break existing records. It systematically checks every weight class/age group combination and generates a sorted markdown report.

## What It Does

1. **Builds the Application**: Compiles the React app for production
2. **Fetches Current Records**: Retrieves existing records from the Google Sheets database
3. **Analyzes Top Athletes**: Fetches top performing athletes for each weight class/age group combination
4. **Identifies Record Breakers**: Compares top lifts against current records
5. **Generates Report**: Creates a markdown file with results sorted by:
   - Best snatch lifts
   - Best clean & jerk lifts
   - Best total lifts

## Usage

### Basic Usage

Run the analysis from the project root:

```bash
npm run analyze-records
```

This will:
1. Connect to the USAW API to fetch current top athletes
2. Fetch current records from Google Sheets
3. Compare all combinations
4. Generate `record-breaking-analysis.md`

### What Happens

- The script fetches the current records database (Google Sheets)
- For each weight class (women's and men's weight classes from 48kg+ to 109kg+)
- And each age group (Open, U11, U13, U15, U17, Junior, Senior, Masters 1-4)
- It retrieves top 5 athletes and their best lifts
- Compares against the current record holders
- Identifies any lifts that would break records

### Output

The generated `record-breaking-analysis.md` file contains:

- **Best Snatch Table**: Top snatches sorted by weight, with athlete name, weight class, age group, and current record
- **Best Clean & Jerk Table**: Top clean & jerks sorted by weight
- **Best Total Table**: Top totals sorted by weight

Each table includes:
- Athlete name
- Lift weight (in kg)
- Weight class
- Age group
- Current record (what would be broken)
- Lift date

## Example Output

```markdown
# Record Breaking Analysis Report

Generated: 2026-05-24T12:34:56.789Z

Total Potential Record Breakers: 47

## Best Snatch

| Athlete | Weight | Weight Class | Age Group | Current Record | Date |
|---------|--------|--------------|-----------|----------------|------|
| John Doe | 175kg | Men's 89kg | Senior | 173kg | 2026-05-20 |
| Jane Smith | 120kg | Women's 75kg | Open | 119kg | 2026-05-18 |

...
```

## Requirements

- Node.js (for running the analysis script)
- Active internet connection (to fetch from APIs)
- Google API key (already configured in the script)
- Access to USAW API endpoints

## Error Handling

The script includes error handling for:
- Network failures
- API rate limiting (includes delays between requests)
- Missing or incomplete data
- Parsing errors

If an error occurs, the script will continue processing and report what it could analyze.

## Performance

- The analysis typically takes 5-15 minutes depending on API responsiveness
- Requests are rate-limited to avoid overwhelming the API
- Results are batched and processed efficiently

## Output File

The report is saved as: `record-breaking-analysis.md` in the project root directory.

You can view it with any markdown viewer or include it in your documentation.

## Technical Details

### Data Sources

1. **Current Records**: Google Sheets (`1ZAs27jQCPYTVgLuQ-feBHSO-BgGjGCewUs0djG23pXQ`)
2. **Top Athletes**: USAW Rankings API (`admin-usaw-rankings.sport80.com`)

### Weight Classes Analyzed

**Women**: 48kg, 53kg, 58kg, 63kg, 69kg, 75kg, 81kg, 90kg, 90kg+

**Men**: 55kg, 61kg, 67kg, 73kg, 81kg, 89kg, 102kg, 109kg, 109kg+

### Age Groups Analyzed

- Open
- Under 11
- Under 13
- Under 15 (14-15 years old)
- Under 17 (16-17 years old)
- Junior
- Senior
- Masters 1 (35-39)
- Masters 2 (40-44)
- Masters 3 (45-49)
- Masters 4 (50+)

### Sorting Strategy

Results are sorted by lift type (Snatch, Clean & Jerk, Total) and within each type by weight in descending order. This ensures the strongest lifts in each category are highlighted.

## Customization

To modify the analysis:

1. **Change the number of top athletes to check**: Edit `fetchTopAthletes(weightClassId, limit = 10)` parameter in `scripts/analyze-records.js`
2. **Modify which age groups to analyze**: Update the `ageGroups` array
3. **Change sorting**: Edit the `generateMarkdown()` function

## Troubleshooting

**No record breakers found?**
- The top athletes may not have any lifts exceeding current records
- Check that the API is returning data correctly
- Verify the Google Sheets is accessible

**Script hangs or times out?**
- The API may be slow; the script includes 100ms delays between requests
- Increase delays in the script if needed
- Check your internet connection

**API errors?**
- The USAW API may have changed
- Check the API endpoints are still valid
- Verify the Google Sheets ID and key are correct

## Future Enhancements

Potential improvements:
- [ ] Add browser automation to verify data from the live app
- [ ] Filter by specific date ranges
- [ ] Include meet information and links
- [ ] Generate HTML version of report
- [ ] Send notifications when specific records are about to break
- [ ] Track historical record trends

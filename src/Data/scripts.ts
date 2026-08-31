import { runAdaptiveRecords } from '../RunnableScripts/adaptiveRecords';
import { runAnalyzeRecords } from '../RunnableScripts/analyzeRecords';

export interface Script {
  name: string;
  source: () => Promise<string>;
  fileName: string;
  description: string;
}

export const scripts: Script[] = [
  {
    name: 'Fetch Record Updates',
    source: runAnalyzeRecords,
    fileName: 'record-breaking-analysis.csv',
    description:
      'Queries the USAW API and Google Sheets to identify lifts that would break existing WSO records in the current calendar year, then downloads the results as a CSV. Note: this analysis covers all age groups and weight classes and will take several minutes to complete.',
  },
  {
    name: 'Fetch Adaptive Record Updates',
    source: runAdaptiveRecords,
    fileName: 'adaptive-record-breaking-analysis.csv',
    description:
      "Walks the adaptive athlete roster, pulls each athlete's competition results from their start date onward, and downloads a CSV of every lift that beats the standing record or standard — in the all-adaptive sheet and in each category the athlete is registered for. Resolving an athlete may take several requests, so allow a minute or two.",
  },
];

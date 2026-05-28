import { runAnalyzeRecords } from '../RunnableScripts/analyzeRecords';

export interface Script {
  name: string;
  source: () => Promise<string>;
  description: string;
}

export const scripts: Script[] = [
  {
    name: 'Analyze Records',
    source: runAnalyzeRecords,
    description:
      'Queries the USAW API and Google Sheets to identify lifts that would break existing WSO records, then downloads the results as a CSV. Note: this analysis covers all age groups and weight classes and will take several minutes to complete.',
  },
];

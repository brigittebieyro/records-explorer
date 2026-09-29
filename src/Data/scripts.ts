import { ComponentType } from 'react';
import { runAdaptiveRecords } from '../RunnableScripts/adaptiveRecords';
import { runAnalyzeRecords } from '../RunnableScripts/analyzeRecords';
import ParticipationLevelsForm from '../Scripts/components/ParticipationLevelsForm';
import PastRecordCertificateForm from '../Scripts/components/PastRecordCertificateForm';

export interface Script {
  name: string;
  description: string;
  /**
   * Scripts that take no input: the Scripts page runs them on its Run button and downloads what
   * they return as `fileName`. Mutually exclusive with `Form`.
   */
  source?: () => Promise<string>;
  /** The download name for `source` output. */
  fileName?: string;
  /**
   * Scripts that need details from the operator render their own controls instead of a Run
   * button, and own their own download -- the output need not be text.
   */
  Form?: ComponentType;
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
  {
    name: 'Past Recordholder Certificate',
    Form: PastRecordCertificateForm,
    description:
      'Prints a record certificate for a past recordholder — an athlete whose record has since been broken, or whose record predates the current records sheet. Nothing is looked up: fill in every detail below exactly as it should read on the certificate, and the finished PDF is identical to the one the print button produces on a current record.',
  },
  {
    name: 'Gather Participation Levels',
    Form: ParticipationLevelsForm,
    description:
      'Counts how many athletes in the WSO have competed in each potential medal category over a period of month, and downloads a stats a CSV. Choose the number of months to investigate.',
  },
];

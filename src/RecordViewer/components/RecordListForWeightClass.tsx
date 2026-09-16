import CertificateLink, { buildCertificateCategory } from './CertificateLink';
import CompactRecordView from './CompactRecordView';
import { weightClassIndicator } from '../../Utils/Utils';
import { AllCurrentRecordsGroup, WeightClass } from '../../Utils/types';

interface RecordListForWeightClassProps {
  weightClass: WeightClass;
  groups: AllCurrentRecordsGroup[];
  // Opt-in; see AllCurrentRecordsView. Present only on the adaptive page today.
  certificateSheet?: string;
  // The adaptive category's certificate wording, when one is on display.
  adaptiveCategory?: string;
}

const getDisplayName = (weightClass: WeightClass): string => {
  const prefix = weightClass.gender === 'female' ? "Women's" : "Men's";
  if (weightClass.maxBodyweight === '1000') {
    const threshold = Math.floor(parseFloat(weightClass.minBodyweight));
    return `${prefix} ${threshold}+kg`;
  }
  return `${prefix} ${weightClass.maxBodyweight}kg`;
};

const LIFTS = ['Snatch', 'Clean & Jerk', 'Total'] as const;

function RecordListForWeightClass({
  weightClass,
  groups,
  certificateSheet,
  adaptiveCategory,
}: RecordListForWeightClassProps) {
  return (
    <section className="all-records-weight-class-section">
      <h2 className="all-records-weight-class-header">{getDisplayName(weightClass)}</h2>
      {groups.map(({ ageGroup, records }) => (
        <div key={ageGroup.id} className="all-records-age-group-row">
          <p className="all-records-age-group-name">
            <strong>{ageGroup.name}</strong>
          </p>
          <div className="all-records-lift-set">
            {LIFTS.map((lift) =>
              records[lift] ? (
                <div className="all-records-lift" key={lift}>
                  <span className="all-records-lift-label">{lift}</span>
                  <CompactRecordView record={records[lift]} />
                  {/* buildAllCurrentRecords has already dropped every STANDARD row, so anything
                      rendered here is a real record holder and needs no further gating. */}
                  {certificateSheet && (
                    <CertificateLink
                      sheet={certificateSheet}
                      ageGroup={ageGroup.id}
                      gender={weightClass.gender}
                      weightClass={weightClassIndicator(weightClass)}
                      lift={lift}
                      category={buildCertificateCategory(weightClass, ageGroup, adaptiveCategory)}
                    />
                  )}
                </div>
              ) : null
            )}
          </div>
        </div>
      ))}
    </section>
  );
}

export default RecordListForWeightClass;

import CompactRecordView from './CompactRecordView';
import { AllCurrentRecordsGroup, WeightClass } from './types';

interface RecordListForWeightClassProps {
  weightClass: WeightClass;
  groups: AllCurrentRecordsGroup[];
}

function RecordListForWeightClass({ weightClass, groups }: RecordListForWeightClassProps) {
  return (
    <section className="all-records-weight-class-section">
      <h2 className="all-records-weight-class-header">{weightClass.name}</h2>
      {groups.map(({ ageGroup, records }) => (
        <div key={ageGroup.id} className="all-records-age-group-row">
          <p className="all-records-age-group-name">
            <strong>{ageGroup.name}</strong>
          </p>
          <div className="all-records-lift-set">
            {records['Snatch'] && (
              <div className="all-records-lift">
                <span className="all-records-lift-label">Snatch</span>
                <CompactRecordView record={records['Snatch']} />
              </div>
            )}
            {records['Clean & Jerk'] && (
              <div className="all-records-lift">
                <span className="all-records-lift-label">Clean & Jerk</span>
                <CompactRecordView record={records['Clean & Jerk']} />
              </div>
            )}
            {records['Total'] && (
              <div className="all-records-lift">
                <span className="all-records-lift-label">Total</span>
                <CompactRecordView record={records['Total']} />
              </div>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}

export default RecordListForWeightClass;

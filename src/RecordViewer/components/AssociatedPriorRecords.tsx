import { PriorRecord } from '../../Utils/types';
interface AssociatedPriorRecordsProps {
  records: PriorRecord[];
}

function AssociatedPriorRecords({ records }: AssociatedPriorRecordsProps) {
  if (!records.length) return null;

  return (
    <div className="record-viewer-historical-records">
      <p className="page-title">
        Official <i>historic</i> records from prior weight classes
      </p>
      {/* A lifter's Snatch, Clean & Jerk, and Total share one date, so the date alone is not
          a unique key — duplicates left stale rows behind when switching weight classes. */}
      {records.map((record, index) => (
        <div className="prior-record" key={`prior-record-${index}-${record.lift}-${record.date}`}>
          <p>
            <span className="prior-record-title">
              <span className="common-italic">{record.yearSpan}</span>{' '}
              {record.gender === 'female' ? "Women's" : "Men's"} {record.bodyWeightMax}
              {record.bodyWeightMaxIsOpen ? '+' : ''}kg &bull; {record.lift}:
            </span>
            <span className="prior-record-contents">
              <span className="prior-record-emphasis">
                {record.weight}kg - {record.lifter}
              </span>
              , {record.date}, {record.event}
            </span>
          </p>
        </div>
      ))}
    </div>
  );
}

export default AssociatedPriorRecords;

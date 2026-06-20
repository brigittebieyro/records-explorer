import { PriorRecord } from '../../Utils/types';
interface AssociatedPriorRecordsProps {
  records: PriorRecord[];
}

function AssociatedPriorRecords({ records }: AssociatedPriorRecordsProps) {
  if (!records.length) return null;

  return (
    <div className="record-viewer-historical-records">
      <p className="page-title">Records from prior weight classes</p>
      {records.map((record) => (
        <div className="prior-record" key={record.date}>
          <p>
            <span className="prior-record-title">
              <span className="common-italic">{record.yearSpan}</span>{' '}
              {record.gender === 'female' ? "Women's" : "Men's"} {record.bodyWeightMax}kg{' '}
              {record.lift}:
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

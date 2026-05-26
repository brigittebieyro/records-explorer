import RecordListForWeightClass from './RecordListForWeightClass';
import { AllCurrentRecordsEntry } from '../../Utils/types';

interface AllCurrentRecordsViewProps {
  data: AllCurrentRecordsEntry[];
}

function AllCurrentRecordsView({ data }: AllCurrentRecordsViewProps) {
  const womensData = data.filter((item) => item.weightClass.gender === 'female');
  const mensData = data.filter((item) => item.weightClass.gender === 'male');

  if (!data.length) {
    return (
      <div className="all-records-empty">
        <p>Loading current records…</p>
      </div>
    );
  }

  return (
    <div className="all-records-view-parent">
      <p className="page-title">All Current Record Holders</p>
      <div className="all-records-columns">
        <div className="all-records-column">
          <h2 className="all-records-gender-header">Women</h2>
          {womensData.map(({ weightClass, groups }) => (
            <RecordListForWeightClass
              key={`${weightClass.id}-${groups.map((g) => g.ageGroup.id).join('-')}`}
              weightClass={weightClass}
              groups={groups}
            />
          ))}
        </div>
        <div className="all-records-column">
          <h2 className="all-records-gender-header">Men</h2>
          {mensData.map(({ weightClass, groups }) => (
            <RecordListForWeightClass
              key={`${weightClass.id}-${groups.map((g) => g.ageGroup.id).join('-')}`}
              weightClass={weightClass}
              groups={groups}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default AllCurrentRecordsView;

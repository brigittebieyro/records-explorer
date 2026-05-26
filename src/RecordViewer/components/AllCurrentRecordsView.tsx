import RecordListForWeightClass from './RecordListForWeightClass';
import { AllCurrentRecordsEntry } from '../../Utils/types';

interface AllCurrentRecordsViewProps {
  data: AllCurrentRecordsEntry[];
}

const byBodyweight = (a: AllCurrentRecordsEntry, b: AllCurrentRecordsEntry) =>
  parseFloat(a.weightClass.maxBodyweight) - parseFloat(b.weightClass.maxBodyweight);

const mergeByBodyweight = (entries: AllCurrentRecordsEntry[]): AllCurrentRecordsEntry[] => {
  const map = new Map<string, AllCurrentRecordsEntry>();
  for (const entry of entries) {
    const key = entry.weightClass.maxBodyweight;
    const existing = map.get(key);
    if (existing) {
      map.set(key, {
        weightClass: existing.weightClass,
        groups: [...existing.groups, ...entry.groups],
      });
    } else {
      map.set(key, { ...entry, groups: [...entry.groups] });
    }
  }
  return Array.from(map.values());
};

function AllCurrentRecordsView({ data }: AllCurrentRecordsViewProps) {
  const womensData = mergeByBodyweight(
    data.filter((item) => item.weightClass.gender === 'female').sort(byBodyweight)
  );
  const mensData = mergeByBodyweight(
    data.filter((item) => item.weightClass.gender === 'male').sort(byBodyweight)
  );

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
              key={`female-${weightClass.maxBodyweight}`}
              weightClass={weightClass}
              groups={groups}
            />
          ))}
        </div>
        <div className="all-records-column">
          <h2 className="all-records-gender-header">Men</h2>
          {mensData.map(({ weightClass, groups }) => (
            <RecordListForWeightClass
              key={`male-${weightClass.maxBodyweight}`}
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

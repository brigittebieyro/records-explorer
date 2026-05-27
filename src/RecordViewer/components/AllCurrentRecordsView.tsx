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

      <p className="record-viewer-fine-print all-records-fine-print">
        Use the dropdown above to see the current standard and best lifts, plus historical best
        across previous weight classes. The 2026 standard for records, if there is not a
        recordholder yet, is 85% of the national record standard. In 2025, the standard was 90%,
        which is considerably higher for some weight classes. Records must break the standard for
        their current year to be awarded the record.
      </p>

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

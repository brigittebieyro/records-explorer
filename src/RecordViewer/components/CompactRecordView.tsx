import { StandardRecord } from '../../Utils/types';

interface CompactRecordViewProps {
  record?: StandardRecord;
}

function CompactRecordView({ record }: CompactRecordViewProps) {
  if (!record) return null;
  return (
    <span className="all-records-record">
      <strong>{record.weight}kg</strong>
      {' — '}
      <strong>{record.lifter}</strong>
      {', '}
      {record.event}
      {', '}
      {record.date}
    </span>
  );
}

export default CompactRecordView;

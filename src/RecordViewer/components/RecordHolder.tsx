import { CircleLoader } from 'react-spinners';
import { CombinedLiftData, SortKey } from '../../Utils/types';
import { getYear } from '../../Utils/Utils';

interface RecordHolderProps {
  lifterData: CombinedLiftData;
  index: number;
  individualLiftsData: CombinedLiftData[];
  sortType: SortKey;
  currentLeaders?: CombinedLiftData[];
}

function RecordHolder({ lifterData, index, individualLiftsData, sortType }: RecordHolderProps) {
  let lifter = lifterData;
  const club = typeof lifter.club === 'string' ? lifter.club : 'Unaffiliated';
  let classList = 'record-viewer-record-holder';
  if (index === 0) {
    classList += ' record-viewer-record-current';
  }

  if (!lifter.best_snatch && lifter.best_snatch !== 0) {
    const liftData = individualLiftsData.find(
      (lift) =>
        lift?.name === lifter?.name &&
        lift?.total === lifter?.total &&
        lift?.date === lifter?.lift_date
    );
    if (liftData) {
      lifter = { ...lifter, ...liftData };
    }
  }

  const isFromPriorGroup = !!lifter.classData;
  const startYear = getYear(lifter.classData?.start ?? '') || '';
  const endYear = getYear(lifter.classData?.end ?? '') || '';
  const classYears = `${startYear} - ${endYear}`;

  return (
    <div className={classList} key={`record-holder-${index}-${lifter.lift_date}`}>
      {isFromPriorGroup && (
        <div className="record-viewer-record-header">
          <p>
            {lifter.classData!.name} • {classYears}
          </p>
        </div>
      )}
      <h4 className="record-viewer-record-title">
        {sortType !== 'lift_date' && <div className="record-viewer-ranking">{index + 1}</div>}
        {lifter.name}
      </h4>
      <div className="record-viewer-columns">
        <p>
          <strong>Total:&nbsp;</strong> {lifter.total}
        </p>
        {!!String(lifter.best_snatch) && (
          <p>
            <strong>Snatch:&nbsp;</strong>
            {lifter.best_snatch}
          </p>
        )}
        {!!String(lifter['best_c&j']) && (
          <p>
            <strong>Clean and Jerk:&nbsp;</strong>
            {lifter['best_c&j']}
          </p>
        )}
      </div>
      <div className="record-viewer-columns">
        <p>
          <strong>Age:&nbsp;</strong> {lifter.lifter_age}
        </p>
        <p>
          <strong>Date:&nbsp;</strong>
          {lifter.lift_date}
        </p>
        <p>
          <strong>Club:&nbsp;</strong>
          {club}
        </p>
      </div>
      {!!lifter.meet && <p className="record-viewer-full-width-detail">{lifter.meet}</p>}
      {!lifter.best_snatch && lifter?.best_snatch !== 0 && (
        <div className="records-viewer-content-spinner">
          <CircleLoader loading={true} color="gold" size="18px" />
        </div>
      )}
      <a
        className="record-viewer-view-link"
        target="_blank"
        rel="noreferrer"
        href={lifter.action[0].url}
      >
        More Info &gt;&gt;
      </a>
    </div>
  );
}

export default RecordHolder;

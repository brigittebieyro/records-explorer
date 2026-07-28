import { useEffect, useState } from 'react';
import { CircleLoader } from 'react-spinners';
import {
  getLifterDataRoute,
  getLifterId,
  getRankingsRoute,
  headers,
} from '../../Data/RoutesAndSettings';
import { findSupportingTotal, handleError, sortLifts } from '../../Utils/Utils';
import { CombinedLiftData, MeetRecord, WeightClass } from '../../Utils/types';

interface GoalsWeightClassProps {
  weightClass: WeightClass;
  safeCount: number;
  startDate: string;
  endDate: string;
}

type GoalsStatus = 'inprogress' | 'listed' | 'complete';

function GoalsWeightClass({ weightClass, safeCount, startDate, endDate }: GoalsWeightClassProps) {
  const [status, setStatus] = useState<GoalsStatus>('inprogress');
  const [lifters, setLifters] = useState<CombinedLiftData[]>([]);

  useEffect(() => {
    setStatus('inprogress');
    setLifters([]);
    let cancelled = false;
    fetchRankings(weightClass, () => cancelled);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weightClass]);

  const validateLifter = async (
    lifter: CombinedLiftData,
    isCancelled: () => boolean
  ): Promise<CombinedLiftData | null> => {
    try {
      const response = await fetch(getLifterDataRoute(getLifterId(lifter.action)), {
        headers,
        method: 'POST',
      });
      if (!response.ok) {
        handleError(response.status);
        return lifter;
      }
      const json: { data: MeetRecord[] } = await response.json();
      if (isCancelled()) return lifter;
      const supportedTotal = findSupportingTotal(
        lifter,
        json.data,
        weightClass,
        startDate,
        endDate
      );
      if (supportedTotal === undefined) return null;
      return supportedTotal === lifter.total ? lifter : { ...lifter, total: supportedTotal };
    } catch (error) {
      handleError(error);
      return lifter;
    }
  };

  const fetchRankings = async (wtClass: WeightClass, isCancelled: () => boolean): Promise<void> => {
    try {
      const body = JSON.stringify({
        columns: [],
        filters: {
          date_range_start: startDate,
          date_range_end: endDate,
          weight_class: wtClass.sport80Id,
        },
      });
      const response = await fetch(getRankingsRoute(safeCount + 5), {
        headers,
        body,
        method: 'POST',
      });
      if (!response.ok) {
        handleError(response.status);
        throw new Error(`Response status: ${response.status}`);
      }
      const json: { data: CombinedLiftData[] } = await response.json();
      if (isCancelled()) return;
      setLifters(json.data);
      setStatus('listed');

      const validated = await Promise.all(
        json.data.map((lifter) => validateLifter(lifter, isCancelled))
      );
      if (isCancelled()) return;

      const surviving = validated.filter((l): l is CombinedLiftData => l !== null);
      const changed =
        surviving.length !== json.data.length ||
        surviving.some((l, i) => l.total !== json.data[i].total);
      if (changed) setLifters(sortLifts(surviving, 'total'));
      setStatus('complete');
    } catch (error) {
      handleError(error);
    }
  };

  return (
    <div className="goals-list-segment">
      {status === 'inprogress' && (
        <div className="goals-loading">
          <CircleLoader loading={true} color="gold" />
          <span className="fetching-text">Fetching</span>
        </div>
      )}
      {status !== 'inprogress' && (
        <>
          {lifters.slice(0, safeCount + 3).map((lifter, index) => (
            <div key={`goals-${index}-${lifter.name}`}>
              <p
                className={`goals-list-item ${lifter.wso === 'California North Central' ? 'goals-list-highlight' : ''} ${index >= safeCount ? 'goals-item-tentative' : ''}`}
              >
                <span className="goals-rank-circle">{index + 1}</span>
                {lifter.total}kg &bull; {lifter.name}
                {lifter.wso === 'California North Central' && <span> &bull; {lifter.club}</span>}
                {lifter.wso !== 'California North Central' && <span> &bull; {lifter.wso}</span>}
                {index >= safeCount && <span> &bull; Probable</span>}
              </p>
            </div>
          ))}
          {status === 'listed' && (
            <div className="verifying-indicator">
              <CircleLoader loading={true} color="gold" size={16} />
              <span className="verifying-text">Verifying</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default GoalsWeightClass;

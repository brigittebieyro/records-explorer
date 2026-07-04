import { useEffect, useState } from 'react';
import { CircleLoader } from 'react-spinners';
import { getRankingsRoute, headers } from '../../Data/RoutesAndSettings';
import { handleError } from '../../Utils/Utils';
import { CombinedLiftData, WeightClass } from '../../Utils/types';

interface GoalsWeightClassProps {
  weightClass: WeightClass;
  count: number;
  startDate: string;
  endDate: string;
}

function GoalsWeightClass({ weightClass, count, startDate, endDate }: GoalsWeightClassProps) {
  const [status, setStatus] = useState<string | undefined>();
  const [lifters, setLifters] = useState<CombinedLiftData[]>([]);

  useEffect(() => {
    setStatus('inprogress');
    setLifters([]);
    fetchRankings(weightClass);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weightClass]);

  const fetchRankings = async (wtClass: WeightClass): Promise<void> => {
    try {
      const body = JSON.stringify({
        columns: [],
        filters: {
          date_range_start: startDate,
          date_range_end: endDate,
          weight_class: wtClass.sport80Id,
        },
      });
      const response = await fetch(getRankingsRoute(count), {
        headers,
        body,
        method: 'POST',
      });
      if (!response.ok) {
        handleError(response.status);
        throw new Error(`Response status: ${response.status}`);
      }
      const json: { data: CombinedLiftData[] } = await response.json();
      const result: CombinedLiftData[] = [];
      for (const lifter of json.data) {
        result.push(lifter);
      }
      setLifters(result);
      setStatus('complete');
    } catch (error) {
      handleError(error);
    }
  };

  return (
    <div className="goals-list-segment">
      {status !== 'complete' && <CircleLoader loading={true} color="gold" />}
      {status === 'complete' &&
        lifters.slice(0, count).map((lifter, index) => (
          <div key={`goals-${index}-${lifter.name}`}>
            <p
              className={`goals-list-item ${lifter.wso === 'California North Central' ? 'goals-list-highlight' : ''}`}
            >
              {lifter.total}kg &bull; {lifter.name}
              {lifter.wso === 'California North Central' && <span> &bull; {lifter.club}</span>}
              {lifter.wso !== 'California North Central' && <span> &bull; {lifter.wso}</span>}
            </p>
          </div>
        ))}
    </div>
  );
}

export default GoalsWeightClass;

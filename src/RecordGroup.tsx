import { useEffect, useState } from 'react';
import { CircleLoader } from 'react-spinners';
import RecordHolder from './RecordHolder';
import {
  getLifterDataRoute,
  getLifterId,
  getRankingsRoute,
  headers,
  wsoId,
} from './RoutesAndSettings';
import { handleError, shouldIncludePastLifter, sortLifts } from './Utils';
import { AgeGroup, CombinedLiftData, MeetRecord, SortKey, WeightClass } from './types';

interface SortTypeDescription {
  id: SortKey;
  name: string;
}

interface RecordGroupProps {
  weightClass: WeightClass;
  ageGroup: AgeGroup;
  count: number;
  startDate: string;
  endDate: string;
  emptyContent: React.ReactNode;
}

function RecordGroup({
  weightClass,
  ageGroup,
  count,
  startDate,
  endDate,
  emptyContent,
}: RecordGroupProps) {
  const [status, setStatus] = useState<string | undefined>();
  const [leadingLifters, setLeadingLifters] = useState<CombinedLiftData[]>([]);
  const [combinedLiftsData, setCombinedLiftsData] = useState<CombinedLiftData[]>([]);
  const [sortType, setSortType] = useState<SortKey>('total');

  const sortTypeDescriptions: SortTypeDescription[] = [
    { id: 'total', name: 'Overall Total' },
    { id: 'best_snatch', name: 'Snatch' },
    { id: 'best_c&j', name: 'Clean and Jerk' },
    { id: 'lift_date', name: 'Most Recent' },
  ];

  const resetAllData = (): void => {
    setStatus('inprogress');
    setLeadingLifters([]);
    setCombinedLiftsData([]);
    setSortType('total');
  };

  useEffect(() => {
    if (weightClass && ageGroup) {
      resetAllData();
      fetchRecordGroup(weightClass, ageGroup);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weightClass, ageGroup]);

  useEffect(() => {
    if (combinedLiftsData.length > 0) {
      const sortedLifts = sortLifts(combinedLiftsData, sortType);
      setLeadingLifters(sortedLifts);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combinedLiftsData, sortType]);

  const updateSortType = (newType: SortKey): void => {
    console.log('Fetch is complete, proceeding to re-sort lifters', combinedLiftsData);
    const newSortedLifts = sortLifts(combinedLiftsData, newType);
    console.log('Updated version:', newSortedLifts);
    setLeadingLifters(newSortedLifts);
    setSortType(newType);
  };

  const fetchRecordGroup = async (wtClass: WeightClass, ageGroup: AgeGroup): Promise<void> => {
    try {
      const body = JSON.stringify({
        columns: [],
        filters: {
          date_range_start: startDate,
          date_range_end: endDate,
          weight_class: wtClass.sport80Id,
          wso: wsoId,
          minimum_lifter_age: ageGroup.minimum_lifter_age,
          maximum_lifter_age: ageGroup.maximum_lifter_age,
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
      await response.json().then(async (response: { data: CombinedLiftData[] }) => {
        const result: CombinedLiftData[] = [];
        for (let i = 0; i < response.data.length; i++) {
          const lifter = response.data[i];
          if (shouldIncludePastLifter(lifter)) {
            result.push(lifter);
          }
        }
        setLeadingLifters(result);
        setStatus('complete');

        for (let i = 0; i < result.length; i++) {
          await fetchIndividualLifts(result[i]);
        }
      });
    } catch (error) {
      handleError(error);
    }
  };

  const fetchIndividualLifts = async (lifter: CombinedLiftData): Promise<void> => {
    const publicLifterId = getLifterId(lifter.action);
    const route = getLifterDataRoute(publicLifterId);

    try {
      const response = await fetch(route, {
        headers,
        method: 'POST',
      });
      if (!response.ok) {
        return;
      }
      await response.json().then((response: { data: MeetRecord[] }) => {
        if (response.data.length) {
          const meets = response.data;
          const ageAtRankingTime = parseInt(lifter.lifter_age);
          const rankingYear = new Date(lifter.lift_date).getFullYear();
          const minYearForLifter =
            rankingYear - (ageAtRankingTime - parseInt(ageGroup.minimum_lifter_age));
          const maxYearForLifter =
            rankingYear + (parseInt(ageGroup.maximum_lifter_age) - ageAtRankingTime);

          const matchingLifts: CombinedLiftData[] = [];
          const minBw = parseFloat(weightClass.minBodyweight);
          const maxBw = parseFloat(weightClass.maxBodyweight);
          for (const meet of meets) {
            const meetBw = parseFloat(String(meet['body_weight_(kg)'] ?? 0));
            const meetYear = new Date(meet.date).getFullYear();
            if (
              meet.date >= startDate &&
              meet.date <= endDate &&
              meetBw >= minBw &&
              meetBw <= maxBw &&
              meetYear >= minYearForLifter &&
              meetYear <= maxYearForLifter
            ) {
              matchingLifts.push({ ...lifter, ...meet });
            }
          }
          if (matchingLifts.length > 0) {
            setCombinedLiftsData((prevData) => {
              const updated = [...prevData, ...matchingLifts];
              return updated;
            });
          }
        }
      });
    } catch (error) {
      // handleError();
    }
  };

  return (
    <div className="record-viewer-parent">
      {status !== 'complete' && <CircleLoader loading={true} color="gold" />}
      {combinedLiftsData.length > 0 && (
        <div className="sort-select-parent">
          <label htmlFor="sort-select">Sort</label>{' '}
          <select
            aria-label="Sort"
            name="sort-selection"
            id="sort-select"
            onChange={(e) => {
              updateSortType(e.target.value as SortKey);
            }}
            disabled={status !== 'complete'}
          >
            {sortTypeDescriptions.map((sort, index) => (
              <option
                value={sort.id}
                key={`sort-selector-${index}-${sort.id}`}
                selected={sortType === sort.id}
              >
                {sort.name}{' '}
              </option>
            ))}
          </select>
        </div>
      )}
      {status === 'complete' &&
        !!leadingLifters.length &&
        leadingLifters.map((lifter, index) => (
          <RecordHolder
            key={`record-holder-${index}-${lifter.name}`}
            lifterData={lifter}
            index={index}
            individualLiftsData={combinedLiftsData}
            sortType={sortType}
          />
        ))}
      {!leadingLifters.length && emptyContent}
    </div>
  );
}

export default RecordGroup;

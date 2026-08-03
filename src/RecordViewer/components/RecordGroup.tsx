import { useEffect, useState } from 'react';
import { CircleLoader } from 'react-spinners';
import RecordHolder from './RecordHolder';
import {
  getLifterDataRoute,
  getLifterId,
  getRankingsRoute,
  headers,
  ineligibleAthletes,
  maxCleanAndJerk,
  maxSnatch,
  maxTotal,
  wsoId,
} from '../../Data/RoutesAndSettings';
import { handleError, shouldIncludePastLifter, sortLifts } from '../../Utils/Utils';
import { AgeGroup, CombinedLiftData, MeetRecord, SortKey, WeightClass } from '../../Utils/types';

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

type RecordGroupStatus = 'inprogress' | 'listed' | 'complete';

function RecordGroup({
  weightClass,
  ageGroup,
  count,
  startDate,
  endDate,
  emptyContent,
}: RecordGroupProps) {
  const [status, setStatus] = useState<RecordGroupStatus>('inprogress');
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
    if (!weightClass || !ageGroup) return;
    resetAllData();
    let cancelled = false;
    fetchRecordGroup(weightClass, ageGroup, () => cancelled);
    return () => {
      cancelled = true;
    };
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
    const newSortedLifts = sortLifts(combinedLiftsData, newType);
    setLeadingLifters(newSortedLifts);
    setSortType(newType);
  };

  const fetchRecordGroup = async (
    wtClass: WeightClass,
    ageGroup: AgeGroup,
    isCancelled: () => boolean
  ): Promise<void> => {
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
      const response = await fetch(getRankingsRoute(count + 2), {
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

      const result: CombinedLiftData[] = [];
      for (const lifter of json.data) {
        if (shouldIncludePastLifter(lifter) && !ineligibleAthletes.includes(lifter.name)) {
          result.push(lifter);
        }
      }
      setLeadingLifters(result);
      setStatus('listed');

      const matchedLifts = await Promise.all(
        result.map((lifter) => fetchIndividualLifts(lifter, isCancelled))
      );
      if (isCancelled()) return;

      const allMatches = matchedLifts.flat();
      // Only some lifters may have qualifying meets; leave leadingLifters as the
      // raw rankings list if nobody does, rather than clearing it to nothing.
      if (allMatches.length > 0) setCombinedLiftsData(allMatches);
      setStatus('complete');
    } catch (error) {
      handleError(error);
    }
  };

  const fetchIndividualLifts = async (
    lifter: CombinedLiftData,
    isCancelled: () => boolean
  ): Promise<CombinedLiftData[]> => {
    const publicLifterId = getLifterId(lifter.action);
    const route = getLifterDataRoute(publicLifterId);

    try {
      const response = await fetch(route, {
        headers,
        method: 'POST',
      });
      if (!response.ok) {
        handleError(response.status);
        return [];
      }
      const json: { data: MeetRecord[] } = await response.json();
      if (isCancelled() || !json.data.length) return [];

      const meets = json.data;
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
          meetBw > 0 &&
          meet.date >= startDate &&
          meet.date <= endDate &&
          meetBw >= minBw &&
          meetBw <= maxBw &&
          meetYear >= minYearForLifter &&
          meetYear <= maxYearForLifter &&
          (meet.best_snatch == null || meet.best_snatch <= maxSnatch) &&
          (meet['best_c&j'] == null || meet['best_c&j'] <= maxCleanAndJerk) &&
          meet.total <= maxTotal
        ) {
          matchingLifts.push({ ...lifter, ...meet });
        }
      }
      return matchingLifts;
    } catch (error) {
      handleError(error);
      return [];
    }
  };

  return (
    <div className="record-viewer-parent">
      {status === 'inprogress' && (
        <div className="records-viewer-loading-container">
          <CircleLoader loading={true} color="gold" />
          <span className="loading-text">Loading</span>
        </div>
      )}
      {combinedLiftsData.length > 0 && (
        <div className="sort-select-parent">
          <label htmlFor="sort-select">Sort</label>{' '}
          <select
            aria-label="Sort"
            name="sort-selection"
            id="sort-select"
            onChange={(eventObj) => {
              updateSortType(eventObj.target.value as SortKey);
            }}
            disabled={status !== 'complete'}
          >
            {sortTypeDescriptions.map((sort, index) => (
              <option
                value={sort.id}
                key={`sort-selector-${index}-${sort.id}`}
                selected={sortType === sort.id}
              >
                {sort.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {(status === 'listed' || status === 'complete') &&
        !!leadingLifters.length &&
        leadingLifters
          .slice(0, count)
          .map((lifter, index) => (
            <RecordHolder
              key={`record-holder-${index}-${lifter.name}`}
              lifterData={lifter}
              index={index}
              individualLiftsData={combinedLiftsData}
              sortType={sortType}
            />
          ))}
      {status === 'complete' && !leadingLifters.length && emptyContent}
    </div>
  );
}

export default RecordGroup;

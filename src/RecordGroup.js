import { useState, useEffect } from 'react';
import {
  headers,
  getRankingsRoute,
  wsoId,
  getLifterId,
  getLifterDataRoute,
} from './RoutesAndSettings';
import { handleError, shouldIncludePastLifter, sortLifts } from './Utils';
import RecordHolder from './RecordHolder';
import { CircleLoader } from 'react-spinners';

function RecordGroup({ weightClass, ageGroup, count, startDate, endDate, emptyContent }) {
  const [status, setStatus] = useState();
  const [leadingLifters, setLeadingLifters] = useState([]);
  const [combinedLiftsData, setCombinedLiftsData] = useState([]);
  const [sortType, setSortType] = useState('total');

  const sortTypeDescriptions = [
    { id: 'total', name: 'Overall Total' },
    { id: 'best_snatch', name: 'Snatch' },
    { id: 'best_c&j', name: 'Clean and Jerk' },
    { id: 'lift_date', name: 'Most Recent' },
    // {id: "bodyweight", name: "Bodyweight"},
    // Weight class?
  ];

  const resetAllData = () => {
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

  const updateSortType = (newType) => {
    console.log('Fetch is complete, proceeding to re-sort lifters', combinedLiftsData);
    const newSortedLifts = sortLifts(combinedLiftsData, newType);
    console.log('Updated version:', newSortedLifts);
    setLeadingLifters(newSortedLifts);
    setSortType(newType);
  };

  const fetchRecordGroup = async (wtClass, ageGroup) => {
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
      await response.json().then(async (response) => {
        let result = [];
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

  const fetchIndividualLifts = async (lifter) => {
    const publicLifterId = getLifterId(lifter.action);
    const route = getLifterDataRoute(publicLifterId);

    try {
      const response = await fetch(route, {
        headers,
        method: 'POST',
      });
      if (!response.ok) {
        // handleError(response.status)
        Promise.resolve();
      }
      await response.json().then((response) => {
        if (response.data.length) {
          let meets = response.data;
          // Get a min and max year for the lifter based on the age group
          const ageAtRankingTime = parseInt(lifter.lifter_age);
          const rankingYear = new Date(lifter.lift_date).getFullYear();
          const minYearForLifter =
            rankingYear - (ageAtRankingTime - parseInt(ageGroup.minimum_lifter_age));
          const maxYearForLifter =
            rankingYear + (parseInt(ageGroup.maximum_lifter_age) - ageAtRankingTime);

          // Collect all lifts within the date range for this bodyweight category
          const matchingLifts = [];
          for (let meet of meets) {
            const meetYear = new Date(meet.date).getFullYear();
            if (
              meet.date >= startDate &&
              meet.date <= endDate &&
              meet['body_weight_(kg)'] >= weightClass.minBodyweight &&
              meet['body_weight_(kg)'] <= weightClass.maxBodyweight &&
              meetYear >= minYearForLifter &&
              meetYear <= maxYearForLifter
            ) {
              matchingLifts.push({ ...lifter, ...meet });
            }
          }
          // Add all matching lifts at once
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
              updateSortType(e.target.value);
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

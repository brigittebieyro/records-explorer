import { useEffect, useRef, useState } from 'react';
import { CircleLoader } from 'react-spinners';
import RecordHolder from './components/RecordHolder';
import {
  getLifterDataRoute,
  getLifterId,
  getRankingsRoute,
  headers,
  ineligibleAthletes,
  wsoId,
} from '../Data/RoutesAndSettings';
import { handleError, shouldIncludePastLifter, sortLifts } from '../Utils/Utils';
import {
  AgeGroup,
  CombinedLiftData,
  MeetRecord,
  WeightClass,
  WeightClassAnalog,
} from '../Utils/types';

interface CombinedRecordGroupProps {
  weightClass: WeightClass;
  ageGroup: AgeGroup;
  emptyContent: React.ReactNode;
}

function CombinedRecordGroup({ weightClass, ageGroup, emptyContent }: CombinedRecordGroupProps) {
  const [status, setStatus] = useState<string | undefined>();
  const [newLiftsData, setNewLiftsData] = useState<CombinedLiftData | undefined>();
  const [combinedLiftsData, setCombinedLiftsData] = useState<CombinedLiftData[]>([]);
  const [lifterGroups, setLifterGroups] = useState<CombinedLiftData[]>([]);
  const [combinedLifterGroups, setCombinedLifterGroups] = useState<CombinedLiftData[]>([]);
  const fetchRecordGroupRef = useRef<
    ((subClass: WeightClassAnalog, ageGroup: AgeGroup) => Promise<void>) | undefined
  >(undefined);

  const resetAllData = (): void => {
    setStatus('inprogress');
    setLifterGroups([]);
    setNewLiftsData(undefined);
    setCombinedLiftsData([]);
    setCombinedLifterGroups([]);
  };

  useEffect(() => {
    if (weightClass && ageGroup) {
      resetAllData();

      for (let i = 0; i < weightClass.previousAnalogs.length; i++) {
        if (weightClass.previousAnalogs[i].sport80Id !== 0) {
          setTimeout(
            () => {
              fetchRecordGroupRef.current?.(weightClass.previousAnalogs[i], ageGroup);
            },
            100 * (i + 1)
          );
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weightClass, ageGroup]);

  useEffect(() => {
    if (!!newLiftsData) {
      setCombinedLiftsData((prevData) => {
        const candidate = [...prevData, newLiftsData];
        const uniqueMap = new Map<string, CombinedLiftData>();

        candidate.forEach((lift) => {
          const key = `${lift.name}|${lift.lift_date}|${lift.total}`;
          if (!uniqueMap.has(key)) {
            uniqueMap.set(key, lift);
          }
        });

        return sortLifts(Array.from(uniqueMap.values()));
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newLiftsData]);

  useEffect(() => {
    if (lifterGroups.length) {
      setCombinedLifterGroups((prevGroups) => sortLifts([...prevGroups, ...lifterGroups], 'total'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lifterGroups]);

  const fetchRecordGroup = async (
    subClass: WeightClassAnalog,
    ageGroup: AgeGroup
  ): Promise<void> => {
    try {
      const body = JSON.stringify({
        columns: [],
        filters: {
          date_range_start: subClass.start,
          date_range_end: subClass.end,
          weight_class: subClass.sport80Id,
          wso: wsoId,
          minimum_lifter_age: ageGroup.minimum_lifter_age,
          maximum_lifter_age: ageGroup.maximum_lifter_age,
        },
      });
      const response = await fetch(getRankingsRoute(3), {
        headers,
        body,
        method: 'POST',
      });
      if (!response.ok) {
        handleError(response.status);
        throw new Error(`Response status: ${response.status}`);
      }
      await response.json().then(async (response: { data: CombinedLiftData[] }) => {
        if (response.data.length) {
          for (let i = 0; i < response.data.length; i++) {
            const lifter = response.data[i];
            lifter.classData = subClass;
            if (
              shouldIncludePastLifter(lifter, weightClass) &&
              !ineligibleAthletes.includes(lifter.name)
            ) {
              fetchIndividualLifts(lifter);
            }
          }
          setLifterGroups(response.data);
          setStatus('complete');
        }
      });
    } catch (error) {
      handleError(error);
    }
  };
  fetchRecordGroupRef.current = fetchRecordGroup;

  const fetchIndividualLifts = async (lifter: CombinedLiftData): Promise<void> => {
    const publicLifterId = getLifterId(lifter.action);
    const route = getLifterDataRoute(publicLifterId);
    const specificDate = lifter.lift_date;
    const specificTotal = lifter.total;

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
          const liftData = meets.find(
            (meet) => meet.date === specificDate && meet.total === specificTotal
          );
          if (liftData) {
            setNewLiftsData({ ...lifter, ...liftData });
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
      {status === 'complete' &&
        !!combinedLifterGroups.length &&
        combinedLifterGroups.map((lifter, index) => (
          <RecordHolder
            lifterData={lifter}
            index={index}
            sortType="total"
            currentLeaders={combinedLifterGroups}
            individualLiftsData={combinedLiftsData}
            key={index}
          />
        ))}
      {!combinedLifterGroups.length && emptyContent}
    </div>
  );
}

export default CombinedRecordGroup;

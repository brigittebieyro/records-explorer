import { useState, useEffect, useRef } from "react"
import { 
         headers, 
         getRankingsRoute, 
         wsoId, 
         getLifterId, 
         getLifterDataRoute, 
      } from './RoutesAndSettings';
import { handleError, sortLifts, shouldIncludePastLifter } from './Utils';
import RecordHolder from './RecordHolder';
import { CircleLoader } from "react-spinners";

function CombinedRecordGroup({weightClass, ageGroup, emptyContent}) {
  const [status, setStatus] = useState();;
      const [newLiftsData, setNewLiftsData] = useState();
      const [combinedLiftsData, setCombinedLiftsData] = useState([]);
      const [lifterGroups, setLifterGroups] = useState([])
      const [combinedLifterGroups, setCombinedLifterGroups] = useState([])

  const resetAllData = () => {
    setStatus("inprogress");
    setLifterGroups([]);
    setNewLiftsData();
    setCombinedLiftsData([]);
    setCombinedLifterGroups([]);
  }

function usePrevious(value) {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

const prevNewLifts = usePrevious(newLiftsData);

  useEffect(() => {
    if(weightClass && ageGroup){
        resetAllData();
    
    for (let i = 0; i < weightClass.previousAnalogs.length; i++) {
      if (weightClass.previousAnalogs[i].sport80Id !== 0) {
        setTimeout(() => {
          fetchRecordGroup( weightClass.previousAnalogs[i], ageGroup)
        }, 100);
      }
    }
  }
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weightClass, ageGroup])


  useEffect(() => {
    if(!!newLiftsData){
      const prevLifts = prevNewLifts;
      const updatedLifts = [newLiftsData]
      if(prevLifts && !combinedLiftsData.includes(prevLifts)) {
        updatedLifts.push(prevLifts)
      }
      const combined = sortLifts([...combinedLiftsData, ...updatedLifts]);
      setCombinedLiftsData(combined)
    }
// eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newLiftsData])  

  useEffect(() => {
    if (lifterGroups.length) {
      const sortedCombinedGroups = sortLifts([...lifterGroups, ...combinedLifterGroups], "total")
      setCombinedLifterGroups(sortedCombinedGroups);
    }
// eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lifterGroups])
    
    
      const fetchRecordGroup = async (subClass, ageGroup) => {
        if(!!lifterGroups.length || status === "complete") {
          return
        }
        try {
          const body = JSON.stringify({
            "columns": [],
            "filters": {
              "date_range_start": subClass.start,
              "date_range_end": subClass.end,
              "weight_class": subClass.sport80Id,
              "wso": wsoId,
              "minimum_lifter_age": ageGroup.minimum_lifter_age,
              "maximum_lifter_age": ageGroup.maximum_lifter_age
            }
          });
          const response = await fetch(getRankingsRoute(3), {
            headers,
            body,
            "method": "POST",
          });
          if (!response.ok) {
            handleError(response.status)
            throw new Error(`Response status: ${response.status}`);
          }
          await response.json().then(async (response) => {
                  if (response.data.length) {
                    let lifters = [];
                    for (let i = 0; i < response.data.length; i++) {
                      const lifter = response.data[i];
                      lifter.classData = subClass;
                      if (shouldIncludePastLifter(lifter, weightClass)) {
                        lifters.push(lifter);
                          // setTimeout(() => {
                          fetchIndividualLifts(lifter)
                      }
                    }
                    setLifterGroups(response.data);
                    setStatus("complete")
                  }
                });
    
        } catch (error) {
          handleError(error)
        }
      }
    

  const fetchIndividualLifts = async (lifter) => {
    const publicLifterId = getLifterId(lifter.action);
    const route = getLifterDataRoute(publicLifterId);
    const specificDate = lifter.lift_date;
    const specificTotal = lifter.total;

    try {
      const response = await fetch(route, {
        headers,
        "method": "POST",
      });
      if (!response.ok) {
        // handleError(response.status)
        Promise.resolve();
      }
      await response.json().then((response) => {
        if (response.data.length) {
          let meets = response.data;
          const liftData = meets.find(meet => meet.date === specificDate && meet.total === specificTotal);
          if (liftData) {
            setNewLiftsData({ ...lifter, ...liftData });
          }
        }
      });

    } catch (error) {
      // handleError();
    }
  }

    return (<div className='record-viewer-parent'>
        {status !== "complete" && (
          <CircleLoader loading={true} color="gold" />)}
          {status === "complete" && !!combinedLifterGroups.length && combinedLifterGroups.map((lifter, index) => (
            <RecordHolder lifterData={lifter} index={index} currentLeaders={combinedLifterGroups} individualLiftsData={combinedLiftsData} key={index}/>
            ))}
          {!combinedLifterGroups.length && (emptyContent)}
        </div>)
}

export default CombinedRecordGroup
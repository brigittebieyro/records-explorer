import { useState, useEffect } from "react"
import { 
         headers, 
         getRankingsRoute, 
         wsoId, 
         getLifterId, 
         getLifterDataRoute, 
      } from './RoutesAndSettings';
import { handleError, sortLifts } from './Utils';
import RecordHolder from './RecordHolder';
import { CircleLoader } from "react-spinners";

function RecordGroup({weightClass, ageGroup, count, startDate, endDate, emptyContent}) {
  const [status, setStatus] = useState();;
      const [leadingLifters, setLeadingLifters] = useState([]);
      const [newLiftsData, setNewLiftsData] = useState();
      const [combinedLiftsData, setCombinedLiftsData] = useState([]);

  const resetAllData = () => {
    setStatus("inprogress");
    setLeadingLifters([]);
    setNewLiftsData();
    setCombinedLiftsData([]);
  }

  useEffect(() => {
    if(weightClass && ageGroup){
        resetAllData();
    fetchRecordGroup(weightClass, ageGroup)}
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weightClass, ageGroup])

    useEffect(() => {
      if (!!newLiftsData) {
        const sortedLifts = sortLifts([...combinedLiftsData, newLiftsData], "total")
        setCombinedLiftsData(sortedLifts)
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [newLiftsData])
  
    
      const fetchRecordGroup = async (weightClass, ageGroup) => {
        try {
          const body = JSON.stringify({
            "columns": [],
            "filters": {
              "date_range_start": startDate,
              "date_range_end": endDate,
              "weight_class": weightClass.sport80Id,
              "wso": wsoId,
              "minimum_lifter_age": ageGroup.minimum_lifter_age,
              "maximum_lifter_age": ageGroup.maximum_lifter_age
            }
          });
          const response = await fetch(getRankingsRoute(count), {
            headers,
            body,
            "method": "POST",
          });
          if (!response.ok) {
            handleError(response.status)
            throw new Error(`Response status: ${response.status}`);
          }
          await response.json().then((response) => {
            const result = response.data;
            setLeadingLifters(result);
            setStatus("complete")
    
            for (let i = 0; i < result.length; i++) {
              setTimeout(() => {
                fetchIndividualLifts(result[i]);
              }, 100);
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
          {status === "complete" && !!leadingLifters.length && leadingLifters.map((lifter, index) => (
            <RecordHolder lifterData={lifter} index={index} currentLeaders={leadingLifters} individualLiftsData={combinedLiftsData}/>
            ))}
          {!leadingLifters.length && (emptyContent)}
        </div>)
}

export default RecordGroup
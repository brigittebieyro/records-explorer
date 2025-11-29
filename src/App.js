import './App.css';
import { useEffect, useState, useRef } from 'react';
import { ageGroups } from './Data/ageGroups';
import { defaultWeightClasses } from './Data/defaultWeightClasses';
import { CircleLoader } from 'react-spinners';
import { u11WeightClasses, u13WeightClasses } from './Data/youthWeightClasses';
import { 
         headers, 
         endDate, 
         allTimeStartDate,
         getSheetRoute,
         getRankingsRoute, 
         wsoId, 
         getLifterId, 
         getLifterDataRoute, 
         currentRecordsSheetId,
         currentRecordsSheetName
      } from './RoutesAndSettings';
import { handleError, sortLifts, shouldIncludePastLifter } from './Utils';
import Standards from "./Standards";
import RecordHolder from './RecordHolder';

function App() {
  const [status, setStatus] = useState();
  const [currentWeightClass, setCurrentWeightClass] = useState();
  const [currentAgeGroup, setCurrentAgeGroup] = useState();
  const [priorGroups, setPriorGroups] = useState([]);
  const [combinedPriorGroups, setCombinedPriorGroups] = useState([])
  const [currentLeaders, setCurrentLeaders] = useState([])
  const [localStandards, setLocalStandards] = useState([])
  const [standardsStatus, setStandardsStatus] = useState();
  const [selectedWeightClass, setSelectedWeightClass] = useState("");
  const [selectedAgeGroup, setSelectedAgeGroup] = useState("");
  const [newLiftsData, setNewLiftsData] = useState();
  const [combinedLiftsData, setCombinedLiftsData] = useState([])
  const [newPriorLiftsData, setNewPriorLiftsData] = useState();
  const [combinedPriorLiftsData, setCombinedPriorLiftsData] = useState([])
  const [displayedStandards, setDisplayedStandards] = useState([]);
  const [wishfulLifters, setWishfulLifters] = useState([])
  const [wishfulLiftsData, setWishfulLiftsData] = useState()
  const [wishfulLiftsCombinedData, setWishfulLiftsCombinedData] = useState([])



  const getAgeGroup = (ageGroupId) => {
    return ageGroups.find((group) => group.id === ageGroupId)
  }

  const getWeightClassSet = (ageGroup) => {
    if(!ageGroup || !ageGroup.customWeightClasses) {
      return defaultWeightClasses;
    }
    if(ageGroup.id === "U11") {
      return u11WeightClasses;
    }
    if(ageGroup.id === "U13") {
      return u13WeightClasses;
    }
    console.log(`Could not find custom weight classes for ${ageGroup.id}`)
    return defaultWeightClasses;
  }

  const fetchCurrentLiftsDataFromRankings = async (lifter) => {
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

  const fetchWishfulLiftsDataFromRankings = async (lifter) => {
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
            console.log("Found the lifts:", liftData)
            const liftDataset = { ...lifter, ...liftData };
            setWishfulLiftsData(liftDataset);
          }
        }
      });

    } catch (error) {
      // handleError();
    }
  }

  const fetchPriorLiftsDataFromRankings = async (lifter) => {
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
            setNewPriorLiftsData({ ...lifter, ...liftData });
          Promise.resolve();
        }
      });

    } catch (error) {
      // handleError();
      Promise.resolve();
    }
  }

  const fetchCurrentStandards = async () => {
    if (standardsStatus) { return }
    setStandardsStatus("inprogress")
    const route = getSheetRoute(currentRecordsSheetId, currentRecordsSheetName)

    try {
      const response = await fetch(route, {
        "method": "GET",
      });
      if (!response.ok) {
        setStandardsStatus("error")
        Promise.resolve();
      }
      await response.json().then((response) => {
        setLocalStandards(response.values)
        setStandardsStatus("complete")
      });

    } catch (error) {
      setStandardsStatus("error")
    }
  }

  fetchCurrentStandards();


  const fetchCurrentLeaders = async (currentWtClass, currentAge) => {
    try {
      const body = JSON.stringify({
        "columns": [],
        "filters": {
          "date_range_start": currentWtClass.start,
          "date_range_end": endDate,
          "weight_class": currentWtClass.sport80Id,
          "wso": wsoId,
          "minimum_lifter_age": currentAge.minimum_lifter_age,
          "maximum_lifter_age": currentAge.maximum_lifter_age
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
      await response.json().then((response) => {
        const result = response.data;
        updateDisplayedStandards(currentWtClass, selectedAgeGroup);
        setCurrentWeightClass(currentWtClass)
        setCurrentAgeGroup(currentAge);
        setCurrentLeaders(result);
        setStatus("complete")

        for (let i = 0; i < result.length; i++) {
          fetchCurrentLiftsDataFromRankings(result[i]);
        }
      });

    } catch (error) {
      handleError(error)
    }
  }

  const fetchWishfulLeaders = async (currentWtClass, currentAge) => {
    try {
      const body = JSON.stringify({
        "columns": [],
        "filters": {
           "date_range_start": allTimeStartDate,
           "date_range_end": endDate,
          "weight_class": currentWtClass.sport80Id,
           "wso": wsoId,
          "minimum_lifter_age": currentAge.minimum_lifter_age,
          "maximum_lifter_age": currentAge.maximum_lifter_age
        }
      });
      const response = await fetch(getRankingsRoute(5), {
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
        for (let i = 0; i < result.length; i++) {
          result[i].resultType = "allTimeMagic";
        }
        setWishfulLifters(result)
        for (let i = 0; i < result.length; i++) {
          setTimeout(() => {
          fetchWishfulLiftsDataFromRankings(result[i]);
          }, 100 * i)
        }
      });

    } catch (error) {
      handleError(error)
    }
  }

  async function fetchPriorGroup(primaryWtClass, currentAge, group) {
    try {
      const body = JSON.stringify({
        "columns": [],
        "filters": {
          "date_range_start": group.start,
          "date_range_end": group.end,
          "weight_class": group.sport80Id,
           "wso": wsoId,
          "minimum_lifter_age": currentAge.minimum_lifter_age,
          "maximum_lifter_age": currentAge.maximum_lifter_age
        }
      });
      const response = await fetch(getRankingsRoute(3), {
        headers,
        body,
        "method": "POST",
      });
      if (!response.ok) {
        handleError(response.status)
        Promise.resolve();
      }
      const classData = {
        className: group.name,
        classYears: `${new Date(group.start).getUTCFullYear()} - ${new Date(group.end).getUTCFullYear()}`
      }
      await response.json().then(async (response) => {
        if (response.data.length && selectedWeightClass === primaryWtClass) {
          let lifters = [];
          for (let i = 0; i < response.data.length; i++) {
            const lifter = response.data[i];
            lifter.classData = classData;
            if (!currentWeightClass || shouldIncludePastLifter(lifter, currentWeightClass)) {
              lifters.push(lifter);
                fetchPriorLiftsDataFromRankings(lifter)
            }
          }
          setPriorGroups(response.data);
        }
      });

    } catch (error) {
      handleError(error)
      Promise.resolve();
    }
  }

  const resetAllData = () => {
    setCurrentWeightClass();
    setCurrentLeaders([])
    setCurrentAgeGroup()
    setPriorGroups([])
    setCombinedPriorGroups([])
    setNewLiftsData();
    setCombinedLiftsData([]);
    setNewPriorLiftsData();
    setCombinedPriorLiftsData([]);
    setDisplayedStandards([]);
    setWishfulLifters([]);
    setWishfulLiftsData();
    setWishfulLiftsCombinedData([]);
  }

  useEffect(() => {
    if(!!selectedAgeGroup && !!selectedWeightClass) {
      const ageGroupObj = getAgeGroup(selectedAgeGroup)
      const weightClasses = getWeightClassSet(ageGroupObj)
      const selectedWeightClassObj = weightClasses.find((wtClass) => wtClass.id === selectedWeightClass);
      if(!selectedWeightClassObj) {
        setSelectedWeightClass("")
      }
    }
// eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAgeGroup])

  useEffect(() => {
    if (priorGroups.length) {
      const sortedCombinedGroups = sortLifts([...priorGroups, ...combinedPriorGroups], "total")
      setCombinedPriorGroups(sortedCombinedGroups);
    }
// eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priorGroups])

  useEffect(() => {
    if (!!newLiftsData) {
      const sortedLifts = sortLifts([...combinedLiftsData, newLiftsData], "total")
      setCombinedLiftsData(sortedLifts)
    }
// eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newLiftsData])

function usePrevious(value) {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

function usePreviousWishful(value) {
  const ref = useRef();
  useEffect(() => {
    console.log('Updating ref', ref.current, value)
    ref.current = value;
  });
  return ref.current;
}

const prevPastLifts = usePrevious(newPriorLiftsData);
const prevWishfulLifts = usePreviousWishful(wishfulLiftsData);
 
  useEffect(() => {
    if(!!newPriorLiftsData){
      const prevLifts = prevPastLifts;
      const updatedPreviousLifts = [...combinedPriorLiftsData]
      if(!updatedPreviousLifts.includes(prevLifts)) {
        updatedPreviousLifts.push(prevLifts)
      }
      updatedPreviousLifts.push(newPriorLiftsData)
      setCombinedPriorLiftsData(updatedPreviousLifts)
    }
// eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newPriorLiftsData])


  useEffect(() => {
    if(!!wishfulLiftsData){
      console.log("Fetched some data", wishfulLiftsData)
      const prevLifts = prevWishfulLifts;
      const updatedWishfulLifts = [...wishfulLiftsCombinedData]
      if(!updatedWishfulLifts.includes(prevLifts)) {
        updatedWishfulLifts.push(prevLifts)
      }
      updatedWishfulLifts.push(wishfulLiftsData)
      setWishfulLiftsCombinedData(updatedWishfulLifts)
    }
// eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wishfulLiftsData])

  const updateDisplayedStandards = async (weightClass, ageGroup) => {
    if (!!weightClass && localStandards.length) {
      let recordSet = {};

      let weightClassIndicator = weightClass.maxBodyweight;
      if (weightClass.maxBodyweight > 100) {
        weightClassIndicator = `>${parseInt(weightClass.minBodyweight)}`
      }
      localStandards.filter((standard) => {
        if (standard[7] === weightClassIndicator) {
          const ageKey = String(standard[2]).toUpperCase();
          const indicator = ageKey[0];
          let recordKey = indicator === "W" || indicator === "M" ? standard[4] : ageKey;
          const genderKey = standard[3];
          if ((weightClass.gender === "female" && genderKey === "F") || (weightClass.gender === "male" && genderKey === "M")) {
            let weightClassKey = standard[7];
            if (!recordSet[recordKey]) {
              recordSet[recordKey] = {
                ageGroup: ageKey,
                weightClass: weightClassKey,
                records: {}
              }
            }

            recordSet[recordKey].records[standard[8]] = {
              weight: standard[9],
              lifter: standard[10],
              event: standard[11],
              date: standard[12]
            }
          }
        }
        return true
      });
      setDisplayedStandards(recordSet)
    }
  }

  async function getData(event) {
    if (!selectedWeightClass) {
      // TODO handle error
      return;
    }
    const currentAge = getAgeGroup(selectedAgeGroup || "OPEN")
    const weightClasses = getWeightClassSet(currentAge);
    const currentWtClass = weightClasses.find((wtClass) => wtClass.id === selectedWeightClass);

    if (!currentWtClass) {
      // TODO handle error
      return;
    }

    setStatus("inprogress")
    resetAllData();

    fetchCurrentLeaders(currentWtClass, currentAge);

    fetchWishfulLeaders(currentWtClass, currentAge);

    for (let i = 0; i < currentWtClass.previousAnalogs.length; i++) {
      if (currentWtClass.previousAnalogs[i].sport80Id !== 0) {
        fetchPriorGroup(selectedWeightClass, currentAge, currentWtClass.previousAnalogs[i])
      }
    }
  }

  const renderData = (currentRankings, currentLifts, priorClassRecords, priorClassLifts, allTimeMagicGroup, allTimeMagicLiftsData) => {
    return (<div>
      <Standards relevantRecords={displayedStandards[currentAgeGroup.id]} 
        weightClassName={currentWeightClass.name} ageGroupName={currentAgeGroup.name}/>

      <div>
        <h3>Leading Athletes by Total</h3>
        <p>These are the top three results in the current <strong>{currentWeightClass.name}</strong> weight class, active <strong>from {new Date(currentWeightClass.start).getUTCFullYear()}, by total.</strong></p>
        <div className='record-viewer-parent'>
          {!!currentLifts.length && currentLifts.map((lifter, index) => (
            <RecordHolder lifterData={lifter} index={index} currentLeaders={currentLeaders} individualLiftsData={combinedLiftsData}/>
            ))}
          {!currentRankings.length && (<div>Looks like nobody's competed in this division yet! Could be you?</div>)}
        </div>
      </div>

      <div>
        <h3>All time bests from this bodyweight</h3>
        <p>What if the current weight class were active earlier? Who would hold our all time records? These are top five athletes of all time, who would fit into this class.</p>
        <div className='record-viewer-parent'>
          {!!allTimeMagicGroup?.length && allTimeMagicGroup.map((lifter, index) => 
            <RecordHolder lifterData={lifter} index={index} currentLeaders={currentLeaders} individualLiftsData={allTimeMagicLiftsData} />)}
        </div>
      </div>

      <div>
        <h3>Leaders from previous weight classes:</h3>
        <p>These are the top lifters across all previous, overlapping weight classes. Showing the top 3 lifters by total from each prior class.</p>
        <div className='record-viewer-parent'>
          {!!priorClassRecords?.length && priorClassRecords.map((lifter, index) => 
            <RecordHolder lifterData={lifter} index={index} currentLeaders={currentLeaders} individualLiftsData={combinedPriorLiftsData}/>)}
        </div>
      </div>

    </div>);
  }

  return (
    <div className="App">
      <header className="App-header">
        California North Central Records
      </header>

      <div className="record-viewer-options-bar">

       
        <select
          name="age-group"
          id="age-group-select"
          onChange={(e) => {
            setSelectedAgeGroup(e.target.value)
          }
          }
        >
            <option value="">Select an Age Group</option>)
          {ageGroups.map((group, index) => (<option value={group.id} key={`ageGroup-selector-${index}-${group.id}`} disabled={group.disabled}>{group.name}</option>))}
        </select>

 <select
          name="weight-class"
          id="weight-class-select"
          onChange={(e) => {
            setSelectedWeightClass(e.target.value)
          }
          }
        >
            <option value="">Select a Weight Class</option>)
            {getWeightClassSet(getAgeGroup(selectedAgeGroup)).map((wtClass, index) => (<option value={wtClass.id} key={`wtClass-selector-${index}-${wtClass.id}`}>{wtClass.name}</option>))}
        </select>


        <button onClick={getData} disabled={!selectedAgeGroup || !selectedWeightClass}>Go</button>
      </div>

      {status === "inprogress" && (
        <div className='records-viewer-loading-container'>
          <CircleLoader loading={true} color="gold" />
        </div>
      )}

      {status === "complete" && (<div className="records-viewer-data-container">
        {renderData(currentLeaders, combinedLiftsData, combinedPriorGroups, combinedPriorLiftsData, wishfulLifters, wishfulLiftsCombinedData)}
      </div>)}



    </div>
  );


}

export default App;

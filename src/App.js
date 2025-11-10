import './App.css';
import { useEffect, useState, } from 'react';
import { ageGroups } from './Data/ageGroups';
import { defaultWeightClasses } from './Data/defaultWeightClasses';
import { CircleLoader } from 'react-spinners';
import { u11WeightClasses, u13WeightClasses } from './Data/youthWeightClasses';

function App() {
  const [status, setStatus] = useState();
  const [currentWeightClass, setCurrentWeightClass] = useState();
  const [currentAgeGroup, setCurrentAgeGroup] = useState();
  const [priorGroups, setPriorGroups] = useState([]);
  const [combinedPriorGroups, setCombinedPriorGroups] = useState([])

  // TODO make constants
  const rankingsRoute = "api/categories/all/rankings/table/data?platform=1&p=0&l=3&sort=action&d=asc&s=&st=";
  // Run npm install -g local-cors-proxy and lcp --proxyUrl https://admin-usaw-rankings.sport80.com to make this work
  // Will not be needed when hosted in real life. 
  const baseUrl = "http://localhost:8010/proxy/" // instead of https://admin-usaw-rankings.sport80.com/ !

  const headers = {
    "accept": "application/json, text/plain, */*",
    "accept-language": "en-US,en;q=0.9",
    "content-type": "application/json",
    "x-api-token": "14ced0f3-421f-4acf-94ad-cc63a371af19",
    "Access-Control-Allow-Origin": "*"
  }
  const endDate = "2025-12-31";
  const [currentLeaders, setCurrentLeaders] = useState([])
  const [localStandards, setLocalStandards] = useState([])
  const [standardsStatus, setStandardsStatus] = useState();

  const handleError = (error) => {
    setStatus("error")
  }

  const [selectedWeightClass, setSelectedWeightClass] = useState("");
  const [selectedAgeGroup, setSelectedAgeGroup] = useState("");

  const [newLiftsData, setNewLiftsData] = useState();
  const [combinedLiftsData, setCombinedLiftsData] = useState([])
  const [newPriorLiftsData, setNewPriorLiftsData] = useState();
  const [combinedPriorLiftsData, setCombinedPriorLiftsData] = useState([])
  const [displayedStandards, setDisplayedStandards] = useState([]);

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
    const publicLifterId = lifter.action[0].url.split("https://usaweightlifting.sport80.com/public/rankings/member/")[1];
    const pageParams = `?p=0&l=100&sort=&d=asc&s=&st=`;
    // https://admin-usaw-rankings.sport80.com/api/athletes/29927/table/data?p=1&l=30&sort=&d=asc&s=&st=
    const route = `${baseUrl}api/athletes/${publicLifterId}/table/data${pageParams}`;
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

  const fetchPriorLiftsDataFromRankings = async (lifter) => {
    const publicLifterId = lifter.action[0].url.split("https://usaweightlifting.sport80.com/public/rankings/member/")[1];
    const pageParams = `?p=0&l=100&sort=&d=asc&s=&st=`;
    // https://admin-usaw-rankings.sport80.com/api/athletes/29927/table/data?p=1&l=30&sort=&d=asc&s=&st=
    const route = `${baseUrl}api/athletes/${publicLifterId}/table/data${pageParams}`;
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
        }
      });

    } catch (error) {
      // handleError();
    }
  }

  const fetchCurrentStandards = async () => {
    if (standardsStatus) { return }

    setStandardsStatus("inprogress")
    const sheetsBaseUrl = "https://sheets.googleapis.com/v4/spreadsheets";
    const sheetId = "1ZAs27jQCPYTVgLuQ-feBHSO-BgGjGCewUs0djG23pXQ";
    const sheetName = "Norcal";
    const googleKey = "AIzaSyB3tiu4QqJb-brY0MzE-e6J6rac-Lcn2_A"
    const route = `${sheetsBaseUrl}/${sheetId}/values/${sheetName}?key=${googleKey}`

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

  const sortLifts = (lifts, key) => {
    let useKey = key === "date" ? "lift_date" : "total";

    if (useKey === "date") {
      return lifts.sort(function (a, b) {
        var keyA = new Date(a[useKey]),
          keyB = new Date(b[useKey]);
        if (keyA < keyB) return -1;
        if (keyA > keyB) return 1;
        return 0;
      });
    } else {
      return lifts.sort(function (a, b) {
        var keyA = parseInt(a[useKey]),
          keyB = parseInt(b[useKey]);
        if (keyA > keyB) return -1;
        if (keyA < keyB) return 1;
        return 0;
      });
    }
  }

  const fetchCurrentLeaders = async (currentWtClass, currentAge) => {
    try {
      const body = JSON.stringify({
        "columns": [],
        "filters": {
          "date_range_start": currentWtClass.start,
          "date_range_end": endDate,
          "weight_class": currentWtClass.sport80Id,
          "wso": 21,
          "minimum_lifter_age": currentAge.minimum_lifter_age,
          "maximum_lifter_age": currentAge.maximum_lifter_age
        }
      });
      const response = await fetch(`${baseUrl}${rankingsRoute}`, {
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

  async function fetchPriorGroup(primaryWtClass, currentAge, group) {
    try {
      const body = JSON.stringify({
        "columns": [],
        "filters": {
          "date_range_start": group.start,
          "date_range_end": group.end,
          "weight_class": group.sport80Id,
          "wso": 21,
          "minimum_lifter_age": currentAge.minimum_lifter_age,
          "maximum_lifter_age": currentAge.maximum_lifter_age
        }
      });
      const response = await fetch(`${baseUrl}${rankingsRoute}`, {
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
      await response.json().then((response) => {
        if (response.data.length && selectedWeightClass === primaryWtClass) {
          let lifters = [];
          for (let i = 0; i < response.data.length; i++) {
            const lifter = response.data[i];
            lifter.classData = classData;
            if (!currentWeightClass || shouldIncludePastLifter(lifter, currentWeightClass, currentAge)) {
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
  }

  // useEffect(() => {
  //   if(localStandards.length && currentWeightClass) {
  //     updateDisplayedStandards(currentWeightClass, selectedAgeGroup);
  //   }
  // }, [localStandards])

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

  useEffect(() => {
    if (!!newPriorLiftsData) {
      const sortedLifts = sortLifts([...combinedPriorLiftsData, newPriorLiftsData], "total")
      setCombinedPriorLiftsData(sortedLifts)
    }
// eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newPriorLiftsData])

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

    for (let i = 0; i < currentWtClass.previousAnalogs.length; i++) {
      if (currentWtClass.previousAnalogs[i].sport80Id !== 0) {
        fetchPriorGroup(selectedWeightClass, currentAge, currentWtClass.previousAnalogs[i])
      }
    }
  }

  const renderRecordHolder = (lifter, index) => {
    const club = typeof lifter.club === "string" ? lifter.club : "Unaffiliated";
    let classList = "record-viewer-record-holder";
    if (index === 0) {
      classList += " record-viewer-record-current"
    }
    const isFromPriorGroup = !!lifter.classData;
    const isUbeatenByCurrentLifters = isFromPriorGroup && lifter.total > currentLeaders[0]?.total;
    if (isUbeatenByCurrentLifters) {
      classList += " record-viewer-record-unbeaten";
    }
    const isAllTimeBest = isFromPriorGroup && index === 0 && isUbeatenByCurrentLifters;

    const year = new Date(lifter.lift_date).getUTCFullYear();

    return (<div className={classList} key={`record-holder-${index}-${lifter.lift_date}`}>
      {isFromPriorGroup && (<div className="record-viewer-record-header"><p>{lifter.classData.className} • {lifter.classData.classYears}</p></div>)}
      {isAllTimeBest && (<div className='record-viewer--record-undefeated'><p>Undefeated in the Total since {year}</p></div>)}
      <h4 className="record-viewer-record-title">{lifter.name}</h4>
      <p><strong>Total: </strong> {lifter.total}</p>
      {!!lifter.best_snatch && (<p><strong>Snatch: </strong>{lifter.best_snatch}</p>)}
      {!!lifter["best_c&j"] && (<p><strong>Clean and Jerk: </strong>{lifter["best_c&j"]}</p>)}
      <p><strong>Age: </strong> {lifter.lifter_age}</p>
      <p><strong>Date: </strong>{lifter.lift_date}</p>
      <p><strong>Club: </strong>{club}</p>
      {lifter.bodyweight > 0 && (<p><strong>Bodyweight: </strong>{lifter.bodyweight}</p>)}
      {!!lifter.meet && (<p>{lifter.meet}</p>)}
      {!lifter.best_snatch && (<div className='records-viewer-content-spinner'>
        <CircleLoader loading={true} color="gold" size="18" />
      </div>)}
      <a className="record-viewer-view-link" target="_blank"  rel="noreferrer" href={lifter.action[0].url}>More Info</a>
    </div>);
  }

  const shouldIncludePastLifter = (lifter, weightClass, ageGroup) => {
    const totalIsPlausible = lifter.total <= 550;
    // Some international events for not have the lifter's bodyweights!
    if (!lifter.bodyweight) {
      return totalIsPlausible;
    }
    const weightClassSet = getWeightClassSet(currentAgeGroup)
    let useWtClass = weightClass || currentWeightClass || weightClassSet.find((wtClass) => wtClass.id === selectedWeightClass);
    const minBodyweight = useWtClass?.minBodyweight;
    const maxBodyweight = useWtClass?.maxBodyweight;
    return totalIsPlausible && lifter.bodyweight >= minBodyweight && lifter.bodyweight <= maxBodyweight;
  }

  const renderStandardInfo = (standardData) => {
    return (
      <div>
        <p><strong>{standardData.weight}kg</strong></p>
        {standardData.lifter === "STANDARD" && (<p>This standard has not yet been met.</p>)}
        {standardData.lifter !== "STANDARD" && (<>
          <p><strong>{standardData.lifter}</strong></p>
          <p>{standardData.event}</p>
          <p>{standardData.date}</p>
        </>)}
      </div>
    )
  }

  const renderData = (currentRankings, currentLifts, priorClassRecords) => {
    const relevantRecords = displayedStandards[currentAgeGroup.id];
    return (<div>
      <div><strong>Official Record Standards for {currentWeightClass.name} {currentAgeGroup.name}:</strong>
        {!!relevantRecords && (<div>
          <div className='record-viewer-standard-set'>
            <div className='record-viewer-standard'>
              <h3>Total</h3>
              {renderStandardInfo(relevantRecords.records["Total"])}
            </div>
            <div className='record-viewer-standard'>
              <h3>Snatch</h3>
              {renderStandardInfo(relevantRecords.records["Snatch"])}
            </div>
            <div className='record-viewer-standard'>
              <h3>Clean & Jerk</h3>
              {renderStandardInfo(relevantRecords.records["Clean & Jerk"])}
            </div>
          </div>
        </div>)}

      </div>

      <div>
        <strong>Leading totals in the current {currentWeightClass.name} weight class, active from {new Date(currentWeightClass.start).getUTCFullYear()}:</strong>
        <div className='record-viewer-parent'>
          {!!currentLifts.length && currentLifts.map((lifter, index) => (renderRecordHolder(lifter, index, true)))}
          {!currentRankings.length && (<div>Looks like nobody's competed in this division yet! Could be you?</div>)}
        </div>
      </div>

      <div>
        <p><strong>Leaders from previous weight classes:</strong></p>
        <div className='record-viewer-parent'>
          {!!priorClassRecords?.length && priorClassRecords.map((lifter, index) => (shouldIncludePastLifter(lifter, currentWeightClass, currentAgeGroup) && renderRecordHolder(lifter, index)))}
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
        {renderData(currentLeaders, combinedLiftsData, combinedPriorLiftsData)}
      </div>)}



    </div>
  );


}

export default App;

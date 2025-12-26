import { CircleLoader } from 'react-spinners';
import { getYear } from './Utils';

function RecordHolder({lifterData, index, currentLeaders, individualLiftsData }) {
    let lifter = lifterData;
    const club = typeof lifter.club === "string" ? lifter.club : "Unaffiliated";
    let classList = "record-viewer-record-holder";
    if (index === 0) {
      classList += " record-viewer-record-current"
    }

    // const isUbeatenByCurrentLifters = isFromPriorGroup && lifter.total > currentLeaders[0]?.total;
    // if (isUbeatenByCurrentLifters) {
    //   classList += " record-viewer-record-unbeaten";
    // }

    // const isAllTimeBest = isFromPriorGroup && index === 0 && isUbeatenByCurrentLifters;
    if(!lifter.best_snatch){
        const liftData = individualLiftsData.find((lift) => lift?.name === lifter?.name && lift?.total === lifter?.total && lift?.date === lifter?.lift_date);
        if(liftData) {
            lifter = {...lifter, ...liftData}
        }
    }

    const isFromPriorGroup = !!lifter.classData;
    // if(isFromPriorGroup) {
    //   debugger
    // }
    const startYear = getYear(lifter.classData?.start) || "";
    const endYear = getYear(lifter.classData?.end) || "";
    const classYears = `${startYear} - ${endYear}`;

    return (
    <div className={classList} key={`record-holder-${index}-${lifter.lift_date}`}>
      {isFromPriorGroup && (<div className="record-viewer-record-header"><p>{lifter.classData.name} • {classYears}</p></div>)}
      {/* {isAllTimeBest && (<div className='record-viewer--record-undefeated'><p>Undefeated in the Total since {year}</p></div>)} */}
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

export default RecordHolder
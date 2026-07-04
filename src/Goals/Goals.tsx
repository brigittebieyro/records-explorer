import { defaultWeightClasses } from '../Data/defaultWeightClasses';
import { endDate, usawRankingsPublicSiteLink, wsoName } from '../Data/RoutesAndSettings';
import GoalsWeightClass from './components/GoalsWeightClass';

const femaleClasses = defaultWeightClasses.filter((wc) => wc.gender === 'female');
const maleClasses = defaultWeightClasses.filter((wc) => wc.gender === 'male');

const getCount = (index: number): number => (index < 2 ? 6 : 12);

const oneYearAgo = new Date();
oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
const startDate = oneYearAgo.toISOString().split('T')[0];

function Goals() {
  return (
    <div className="goals-parent">
      <div className="common-text-header">
        <p className="page-title">Senior Nationals Qualification Rankings</p>
        <p className="goals-descriptive-text">
          With the 2027 change in format for Senior Nationals, everybody wants to reach their top
          twelve (or six for the very lightest weight classes). Here's a view of what the top totals
          for each group looks like, with {wsoName} WSO members already in that tier highlighted.
        </p>
        <p className="goals-descriptive-text">
          To explore national rankings in more detail, see{' '}
          <a href={usawRankingsPublicSiteLink} target="_blank" className="common-text-link">
            USAW's public rankings site
          </a>
          . You do not need to be logged in to USAW for this.
        </p>
      </div>
      <div className="all-records-columns">
        <div className="all-records-column">
          <h2 className="goals-column-header">Women</h2>
          {femaleClasses.map((wc, index) => (
            <section className="all-records-weight-class-section" key={wc.id}>
              <h2 className="goals-weight-class-header">{wc.name}</h2>
              <GoalsWeightClass
                weightClass={wc}
                count={getCount(index)}
                startDate={startDate}
                endDate={endDate}
              />
            </section>
          ))}
        </div>
        <div className="all-records-column">
          <h2 className="goals-column-header">Men</h2>
          {maleClasses.map((wc, index) => (
            <section className="all-records-weight-class-section" key={wc.id}>
              <h2 className="goals-weight-class-header">{wc.name}</h2>
              <GoalsWeightClass
                weightClass={wc}
                count={getCount(index)}
                startDate={startDate}
                endDate={endDate}
              />
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Goals;

import {
  americanRecordsUrl,
  githubUrl,
  maintainerEmail,
  maintainerName,
  wsoInfoUSAWUrl,
} from '../Data/RoutesAndSettings';

function Info() {
  return (
    <div className="App">
      <div className="info-page-parent">
        <div className="info-page-box">
          <h2>About Records</h2>
          <p>
            Each level of weightlifting has records, and while those at the local level for Northern
            and Central Californiaare the ones this site is focused on, you may also be interested
            in working towards a national or international records.{' '}
            <a href={americanRecordsUrl} target="_blank" className="common-text-link">
              American national National records and standards
            </a>{' '}
            are maintained by USAW, while international records are maintained by multiple governing
            bodies: the IWF maintains international records for youth, junior, and senior athletes.
            For masters lifters, there are two governing bodies with their own set of records: the
            UMWF and the IMWA.
          </p>
          <p>
            So what happens when an athlete breaks a record? And whose job is it to notice and
            ensure the record is recognized?
          </p>
          <p>
            <strong>Local Records:</strong>
            <br />
            At the local level,{' '}
            <a href={wsoInfoUSAWUrl} target="_blank" className="common-text-link">
              your WSO committee
            </a>{' '}
            is responsible for maintaing the records. We're keeping an eye out, but we're not all
            seeing, and do not get automatic notifications. Athletes and coaches who believe they've
            set a record are encouraged to reach out to the WSO committee and let us know.{' '}
          </p>
          <p>
            <strong>National & Above</strong>
            <br />
            Records above local are maintained by their national or international owners. All should
            have records viewable on their websites. To break these records, you must compete and
            make the lift at or above that level, in an event recognoized by that federation. For
            example, USAW national records can be broken at national events, but not local ones.
            They can also be broken at international events hosted by the IWF or UMWF, with which
            USAW is affiliated. USAW is not affiliated with the IMWA, so you can not break USAW
            records at their events.
          </p>
        </div>

        <div className="info-page-box">
          <h2>About This Site</h2>
          <p>
            This records viewer is meant to highlight all of our recordholders, past and present. As
            weight classes change, we hope you continue to feel that your accomplishements are seen
            and celebrated.
          </p>
          <p>
            You can find this project on{' '}
            <a href={githubUrl} target="_blank" className="common-text-link">
              GitHub
            </a>
            .<br />
            Reach out to{' '}
            <a href={`mailto:${maintainerEmail}`} className="common-text-link">
              {maintainerName}
            </a>{' '}
            if you notice any bugs, have a feature suggestion, or would like help reusing this site
            for another organization.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Info;

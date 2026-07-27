import {
  americanRecordsUrl,
  githubUrl,
  maintainerEmail,
  maintainerName,
  publicSpreadsheetLink,
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
            and Central California are the ones this site is focused on, you may also be interested
            in working towards national or international records.{' '}
            <a
              href={americanRecordsUrl}
              target="_blank"
              className="common-text-link"
              rel="noreferrer"
            >
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
            <a href={wsoInfoUSAWUrl} target="_blank" className="common-text-link" rel="noreferrer">
              your WSO committee
            </a>{' '}
            is responsible for maintaining the records. We're keeping an eye out, but we're not all
            seeing, and do not get automatic notifications. Athletes and coaches who believe they've
            set a record are encouraged to reach out to the WSO committee and let us know.{' '}
          </p>
          <p>
            <strong>National & Above</strong>
            <br />
            Records above local are maintained by their national or international owners. All should
            have records viewable on their websites. To break these records, you must compete and
            make the lift at or above that level, in an event recognized by that federation. For
            example, USAW national records can be broken at national events, but not local ones.
            They can also be broken at international events hosted by the IWF or UMWF, with which
            USAW is affiliated. USAW is not affiliated with the IMWA, so you can not break USAW
            records at their events.
          </p>
          <p>
            <strong>New Weightclasses, August 2026</strong>
            <br />
            This is a bit awkward, because only about half of the weight classes will be moving.
            USAW has requested that athletes currently holding records in unchanged weight classes
            remain the recordholder. However, it doesn't seem fair to only immortalize{' '}
            <strong>
              <i>half</i>
            </strong>{' '}
            of our recordholders on August 1st.
            <br />
            So here's what we're doing instead:
            <br />
            The WSO will immortalize everybody as part of the 2025-2026 record period,{' '}
            <strong>
              <i>and</i>
            </strong>{' '}
            bring forward recordholders in new classes as the newest recordholder. So many athletes
            have spent the last several months working towards records with the expectation that
            what they achieve in this period will stand forever, so we are recording this period
            specially for all athletes.
          </p>
        </div>

        <div className="info-page-box">
          <h2>About Last Year's Lifts</h2>
          <p>
            In some cases, we'll see lifts from the previous year that are higher than the current
            standard or record. This is because standards are reevaluated each year and may be
            lowered, but are not awarded retroactively. Athletes who see that a standard has been
            lowered to something they know they can reach in competition are invited to come out and
            break them in the current year.
          </p>
          <p>
            <strong>Nationally:</strong>
            <br />
            Each calendar year, USAW drops unmet standards by 1kg.
          </p>
          <p>
            <strong>Locally:</strong>
            <br />
            Local standards are voted on by the WSO committee each year. In 2025, the committee
            votes on and accepted 90% of the national record standard. For 2026, we voted on and
            accepted 85% of the national record or standard for unclaimed record standards.
          </p>
        </div>

        <div className="info-page-box">
          <h2>About This Site</h2>
          <p>
            This records viewer is meant to highlight all of our recordholders, past and present. As
            weight classes change, we hope you continue to feel that your accomplishments are seen
            and celebrated.
          </p>
          <p>
            This site gathers data directly from USAW's public rankings and results database, which
            means it's vulnerable to errors in meet results. Recognized records are stored in a{' '}
            <a
              href={publicSpreadsheetLink}
              target="_blank"
              className="common-text-link"
              rel="noreferrer"
            >
              public spreadsheet
            </a>
            , which was used before this site existed. Wherever possible, we've linked directly to
            public pages for further research and verification. If you notice something totally
            implausible, let us know! We may exclude it and others like it, or reach out to USAW for
            help correcting the data. Missing data is also possible, for the same reason. If USAW
            states that you hit an 800kg snatch or had 0 bodyweight, we're probably not displaying
            that. Missing lifts can be added to the record spreadsheet directly while you reach out
            to the meet director and USAW about correcting your results.
          </p>
          <p>
            Additional features are being added slowly and by request. Local meet results was Jim
            Schmitz's idea. Most recently, a tool for athletes and coaches to see who's likely to
            make it to the Rogue Stage at 2027 Senior Nationals. Got ideas? Please reach out!
          </p>
          <p>
            You can find this project on{' '}
            <a href={githubUrl} target="_blank" className="common-text-link" rel="noreferrer">
              GitHub
            </a>
            .<br />
            Reach out to{' '}
            <a href={`mailto:${maintainerEmail}`} className="common-text-link" rel="noreferrer">
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

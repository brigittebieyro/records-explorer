import CertificateLink from './CertificateLink';
import { standardKey } from '../../Data/RoutesAndSettings';
import { AgeGroupRecordSet, StandardRecord } from '../../Utils/types';

interface StandardsProps {
  relevantRecords?: AgeGroupRecordSet | null;
  weightClassName: string;
  ageGroupName: string;
  // Both optional, so existing callers and tests are unaffected. The print link renders only
  // when they are supplied and the row is a real holder rather than a STANDARD placeholder.
  ageGroupId?: string;
  gender?: 'male' | 'female';
  sheet?: string;
  // The printed class wording, composed by the caller from src/Data.
  certificateCategory?: string;
}

function Standards({
  relevantRecords,
  weightClassName,
  ageGroupName,
  ageGroupId,
  gender,
  sheet,
  certificateCategory,
}: StandardsProps) {
  // standardData can be undefined: Record<string, StandardRecord> indexing is not type-checked,
  // and an age group with a partial record set (Snatch only, say) has no 'Total' entry.
  const renderIndividualStandard = (standardData: StandardRecord | undefined, lift: string) => {
    if (!standardData) return null;
    const isRealHolder = standardData.lifter !== standardKey;
    return (
      <div>
        <p>
          <strong>{standardData.weight}kg</strong>
        </p>
        <p>
          <strong>{standardData.lifter}</strong>
        </p>
        {isRealHolder && (
          <>
            <p>{standardData.date}</p>
            <p>{standardData.event}</p>
          </>
        )}
        {isRealHolder && ageGroupId && gender && sheet && relevantRecords && (
          <p>
            <CertificateLink
              sheet={sheet}
              ageGroup={ageGroupId}
              gender={gender}
              weightClass={relevantRecords.weightClass}
              lift={lift}
              category={certificateCategory}
            />
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="record-viewer-standards-parent">
      <p className="page-title">
        Officially Recognized Records & Standards for {weightClassName} {ageGroupName}:
      </p>

      <p className="record-viewer-fine-print">
        <strong>Something missing?</strong> If you believe you should hold one of these records,
        reach out to the WSO committee!
      </p>

      <p className="record-viewer-fine-print">
        When the recordholder is "{standardKey}", this indicates that our WSO has chosen this as the
        record standard, and are not yet aware of anyone reaching it in competition. To hold the
        record, an athlete must lift one kilo &nbsp;
        <b>
          <i>more</i>
        </b>
        &nbsp; in a sanctioned competition,{' '}
        <b>
          <i>in the current year</i>
        </b>
        .
      </p>

      <p className="record-viewer-fine-print">
        <b>Note:</b> Record standards may be adjusted annually. The 2026 standard is 85% of the
        national record or standard at the beginning of this year. The 2025 standards were 90%, and
        for some weight classes, that is a fairly large difference.
      </p>
      {!!relevantRecords && (
        <div>
          <div className="record-viewer-standard-set">
            <div className="record-viewer-standard">
              <h3>Total</h3>
              {renderIndividualStandard(relevantRecords.records['Total'], 'Total')}
            </div>
            <div className="record-viewer-standard">
              <h3>Snatch</h3>
              {renderIndividualStandard(relevantRecords.records['Snatch'], 'Snatch')}
            </div>
            <div className="record-viewer-standard">
              <h3>Clean & Jerk</h3>
              {renderIndividualStandard(relevantRecords.records['Clean & Jerk'], 'Clean & Jerk')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Standards;

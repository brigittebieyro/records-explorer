function Standards({ relevantRecords, weightClassName, ageGroupName }) {
  const renderIndividualStandard = (standardData) => {
    return (
      <div>
        <p>
          <strong>{standardData.weight}kg</strong>
        </p>
        {/* {standardData.lifter === "STANDARD" && (
          <p>
            When the recordholder is "STANDARD", this indicates that rur WSO has
            chosen this as the record standar, and are not yet aware of anyone
            reaching it in competition. To hold the record, an athlete must lift
            one kilo &nbsp;
            <b>
              <i>more</i>
            </b>
            &nbsp; in a sanctioned competition.
          </p>
        )} */}

        <p>
          <strong>{standardData.lifter}</strong>
        </p>
        {standardData.lifter !== "STANDARD" && (
          <>
            <p>{standardData.event}</p>
            <p>{standardData.date}</p>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="record-viewer-standards-parent">
      <p className="record-group-title">
        Officially Recognized Records & Standards for {weightClassName}{" "}
        {ageGroupName}:
      </p>

      <p className="record-viewer-fine-print">
        <strong>Something missing?</strong> If you believe you should hold one
        of these records, reach out to the WSO committee!
      </p>

      <p className="record-viewer-fine-print">
        When the recordholder is "STANDARD", this indicates that rur WSO has
        chosen this as the record standar, and are not yet aware of anyone
        reaching it in competition. To hold the record, an athlete must lift one
        kilo &nbsp;
        <b>
          <i>more</i>
        </b>
        &nbsp; in a sanctioned competition.
      </p>

      {!!relevantRecords && (
        <div>
          <div className="record-viewer-standard-set">
            <div className="record-viewer-standard">
              <h3>Total</h3>
              {renderIndividualStandard(relevantRecords.records["Total"])}
            </div>
            <div className="record-viewer-standard">
              <h3>Snatch</h3>
              {renderIndividualStandard(relevantRecords.records["Snatch"])}
            </div>
            <div className="record-viewer-standard">
              <h3>Clean & Jerk</h3>
              {renderIndividualStandard(
                relevantRecords.records["Clean & Jerk"],
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Standards;

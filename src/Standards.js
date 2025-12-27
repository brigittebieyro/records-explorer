function Standards({ relevantRecords, weightClassName, ageGroupName }) {
  const renderIndividualStandard = (standardData) => {
    return (
      <div>
        <p>
          <strong>{standardData.weight}kg</strong>
        </p>
        {standardData.lifter === "STANDARD" && (
          <p>
            Our WSO has chosen this as the record standard. To hold the record,
            an athlete must lift one kilo{" "}
            <b>
              <i>more</i>
            </b>{" "}
            in a sanctioned competition.
          </p>
        )}
        {standardData.lifter !== "STANDARD" && (
          <>
            <p>
              <strong>{standardData.lifter}</strong>
            </p>
            <p>{standardData.event}</p>
            <p>{standardData.date}</p>
          </>
        )}
      </div>
    );
  };

  return (
    <div>
      <div>
        <p className="record-group-title">
          Official Records & Standards for {weightClassName} {ageGroupName}:
        </p>

        <p className="record-viewer-fine-print">
          <strong>Something missing?</strong> If you believe you should hold one
          of these records, reach out to the WSO committee!
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
    </div>
  );
}

export default Standards;

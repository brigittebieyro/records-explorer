import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import OptionsBar from '../Common/OptionsBar';
import { defaultWeightClasses } from '../Data/defaultWeightClasses';
import { endDate, usawRankingsPublicSiteLink, wsoName } from '../Data/RoutesAndSettings';
import GoalsWeightClass from './components/GoalsWeightClass';
import { WeightClass } from '../Utils/types';

const femaleClasses = defaultWeightClasses.filter((wc) => wc.gender === 'female');
const maleClasses = defaultWeightClasses.filter((wc) => wc.gender === 'male');

// The two lightest classes per gender qualify a top-6 group; everyone else uses top-12.
const getCount = (weightClass: WeightClass): number => {
  const group = weightClass.gender === 'female' ? femaleClasses : maleClasses;
  const index = group.findIndex((wc) => wc.id === weightClass.id);
  return index < 2 ? 6 : 12;
};

const oneYearAgo = new Date();
oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
const startDate = oneYearAgo.toISOString().split('T')[0];

function Goals() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedWeightClass, setSelectedWeightClass] = useState(
    searchParams.get('weightClass') ?? ''
  );
  const [currentWeightClass, setCurrentWeightClass] = useState<WeightClass | undefined>();
  const didAutoRun = useRef(false);

  function applySelection(weightClassId: string): void {
    const wtClass = defaultWeightClasses.find((wc) => wc.id === weightClassId);
    if (!wtClass) return;
    setCurrentWeightClass(wtClass);
  }

  function updateContents(): void {
    if (!selectedWeightClass) return;
    applySelection(selectedWeightClass);
    setSearchParams({ weightClass: selectedWeightClass });
  }

  // Auto-trigger from URL params on first mount
  useEffect(() => {
    if (didAutoRun.current) return;
    didAutoRun.current = true;
    const wc = searchParams.get('weightClass');
    if (wc) applySelection(wc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const descriptiveText = (
    <>
      <p className="page-title">Senior Nationals Qualification Rankings</p>
      <p className="goals-descriptive-text">
        With the 2027 change in format for Senior Nationals, everybody wants to reach their top
        twelve (or six for the very lightest weight classes). Here's a view of what the top totals
        for each group looks like, with {wsoName} WSO members already in that tier highlighted.
      </p>
      <p className="goals-descriptive-text">
        Of course not every in the national top group will attempt to sign up for Nationals. We're
        showing just a few extras, but if you're within 20kg of the bottom totals in your group,{' '}
        <strong>give it a shot and sign up</strong>. The final ranking will not be out of everyone
        who <strong>signs up</strong>, not solely the national ranking.{' '}
      </p>
      <p className="goals-descriptive-text">
        To explore national rankings in more detail, see{' '}
        <a
          href={usawRankingsPublicSiteLink}
          target="_blank"
          className="common-text-link"
          rel="noreferrer"
        >
          USAW's public rankings site
        </a>
        . You do not need to be logged in to USAW for this.
      </p>
    </>
  );

  return (
    <div className="goals-parent">
      <OptionsBar
        label="Select a weight class: "
        selects={[
          {
            id: 'goals-weight-class-select',
            name: 'Weight Class',
            value: selectedWeightClass,
            onChange: setSelectedWeightClass,
            placeholder: 'Select a Weight Class',
            options: defaultWeightClasses.map((wc) => ({ value: wc.id, label: wc.name })),
          },
        ]}
        buttons={[{ label: 'Go', onClick: updateContents, enablement: 'onSelectionChange' }]}
        onReset={
          currentWeightClass
            ? () => {
                setSelectedWeightClass('');
                setCurrentWeightClass(undefined);
                setSearchParams({});
              }
            : undefined
        }
      />

      {!currentWeightClass && (
        <>
          <div className="common-text-header">{descriptiveText}</div>
          <p className="goals-descriptive-text">
            Select a weight class above and hit Go to see its qualification rankings.
          </p>
        </>
      )}

      {currentWeightClass && (
        <div className="goals-results-parent">
          <div className="goals-description-column common-text-header">{descriptiveText}</div>
          <section className="goals-rankings-column" key={currentWeightClass.id}>
            <h2 className="goals-weight-class-header">{currentWeightClass.name}</h2>
            <GoalsWeightClass
              weightClass={currentWeightClass}
              safeCount={getCount(currentWeightClass)}
              startDate={startDate}
              endDate={endDate}
            />
          </section>
        </div>
      )}
    </div>
  );
}

export default Goals;

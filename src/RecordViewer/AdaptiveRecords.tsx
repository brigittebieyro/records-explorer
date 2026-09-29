import { useEffect, useMemo, useState } from 'react';
import { CircleLoader } from 'react-spinners';
import AllCurrentRecordsView from './components/AllCurrentRecordsView';
import { buildAllCurrentRecords } from './RecordViewer';
import OptionsBar from '../Common/OptionsBar';
import {
  adaptiveAllCertificateDisplayKey,
  adaptiveAllRecordsSheetName,
  adaptiveCategories,
  adaptiveOptInFormUrl,
  currentRecordsSheetId,
  getSheetRoute,
} from '../Data/RoutesAndSettings';
import { AllCurrentRecordsEntry } from '../Utils/types';

// Written as JSX rather than a string of markup: React escapes strings, so tags in one would
// show up on the page as literal text. The standards figure is still a placeholder.
const adaptiveDescription = (
  <>
    <p>
      Keeping track of local adaptive athletes' accomplishments can be a bit tricky. The WSO has no
      way of knowing which local meet results should qualify - but when you knock it out of the
      park, we want to celebrate with you. All athletes deserve to know that we're not alone, and to
      have both role models and reasonable standards to work towards. Standards have been set at
      PLACEHOLDER FIX ME to start with.
    </p>
    <p>
      <strong>
        Use{' '}
        <a
          href={adaptiveOptInFormUrl}
          className="common-text-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          this form
        </a>{' '}
        to opt-in to having your results tracked as an adaptive athlete
      </strong>
      . You will continue to be ranked in our regular automatic record keeping as well, this does
      not bar you from holding records in the open category or placing in open competition.
    </p>
    <p>
      We are tracking adaptive records per-category. Athletes who USAW has recognized as adaptive
      can qualify for national events with 50% of the open qualifying total for their weight class
      and age group. For more information on categories for adapative athletes, or how to compete
      nationally as an adaptive athlete, refer to{' '}
      <a
        href="https://www.usaweightlifting.org/resources/qualifying-totals/adaptive-athlete-competition-requirements"
        target="_blank"
        className="common-text-link"
        rel="noopener noreferrer"
      >
        USAW's documentation for adaptive athletes
      </a>
      .
    </p>
  </>
);

function AdaptiveRecords() {
  // Two pieces of state, as on the home page: the dropdown holds a pending choice, and Go
  // promotes it to the category actually on display. An empty applied category means the
  // combined Adaptive_All view, which spans every adaptive lifter.
  const [selectedCategory, setSelectedCategory] = useState('');
  const [appliedCategory, setAppliedCategory] = useState('');
  // Keyed by sheet name so switching back to a category already viewed costs no request.
  const [sheetsByName, setSheetsByName] = useState<Record<string, string[][]>>({});
  const [status, setStatus] = useState<'inprogress' | 'complete' | 'error'>('inprogress');

  const activeSheetName = appliedCategory || adaptiveAllRecordsSheetName;
  const activeCategory = adaptiveCategories.find((category) => category.id === appliedCategory);
  const activeRows = sheetsByName[activeSheetName];

  useEffect(() => {
    if (activeRows) {
      setStatus('complete');
      return;
    }
    let cancelled = false;
    const fetchAdaptiveRecords = async (): Promise<void> => {
      setStatus('inprogress');
      try {
        const response = await fetch(getSheetRoute(currentRecordsSheetId, activeSheetName), {
          method: 'GET',
        });
        if (!response.ok) {
          if (!cancelled) setStatus('error');
          return;
        }
        const data: { values: string[][] } = await response.json();
        if (cancelled) return;
        setSheetsByName((existing) => ({ ...existing, [activeSheetName]: data.values ?? [] }));
        setStatus('complete');
      } catch {
        if (!cancelled) setStatus('error');
      }
    };
    fetchAdaptiveRecords();
    return () => {
      cancelled = true;
    };
  }, [activeSheetName, activeRows]);

  // buildAllCurrentRecords drops every STANDARD row, so this is record holders only.
  const recordsData = useMemo<AllCurrentRecordsEntry[]>(() => {
    return activeRows?.length ? buildAllCurrentRecords(activeRows) : [];
  }, [activeRows]);

  return (
    <div className="App">
      <OptionsBar
        label="Select a category: "
        selects={[
          {
            id: 'adaptive-category-select',
            name: 'Category',
            value: selectedCategory,
            onChange: setSelectedCategory,
            placeholder: 'Category',
            options: adaptiveCategories.map((category) => ({
              value: category.id,
              label: category.displayName,
            })),
          },
        ]}
        buttons={[
          {
            label: 'Go',
            onClick: () => setAppliedCategory(selectedCategory),
            enablement: 'onSelectionChange',
          },
        ]}
        onReset={
          appliedCategory
            ? () => {
                setSelectedCategory('');
                setAppliedCategory('');
              }
            : undefined
        }
      />

      {status === 'inprogress' && (
        <div className="records-viewer-loading-container">
          <CircleLoader loading={true} color="gold" />
          <span className="fetching-text">Fetching</span>
        </div>
      )}

      {status === 'error' && (
        <div className="all-records-empty">
          <p>Adaptive records could not be loaded. Please try again later.</p>
        </div>
      )}

      {status === 'complete' && !!activeCategory && (
        <AllCurrentRecordsView
          data={recordsData}
          // The certificate is looked up in whichever tab is on display, so the same athlete
          // printed from the combined view and from their category view is read from different
          // tabs -- by design, it matches what the user was actually looking at.
          certificateSheet={activeSheetName}
          adaptiveCategory={
            activeCategory ? activeCategory.certificateDisplayKey : adaptiveAllCertificateDisplayKey
          }
          title={
            activeCategory
              ? `${activeCategory.displayName} Record Holders`
              : 'All Adaptive Record Holders'
          }
          description={adaptiveDescription}
          emptyContent="No adaptive records have been set yet."
        />
      )}
      {status === 'complete' && !activeCategory && (
        <div className="common-text-header record-viewer-fine-print all-records-fine-print">
          {adaptiveDescription}
        </div>
      )}
    </div>
  );
}

export default AdaptiveRecords;

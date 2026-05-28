import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CircleLoader } from 'react-spinners';
import {
  getMeetsRoute,
  getIndividualMeetResultsRoute,
  getLocalMeetByNameRoute,
  headers,
  localMeetStartDate,
  wsoRegion,
} from '../Data/RoutesAndSettings';
import { handleError, isWithinWSOBoundary } from '../Utils/Utils';
import { LocalMeet, MeetResult } from '../Utils/types';
import LocalMeetsOptionsBar from './LocalMeetsOptionsBar';
import LocalMeetResultsByWeightClass from './LocalMeetResultsByWeightClass';

function LocalMeets() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState<string | undefined>();
  const [meets, setMeets] = useState<LocalMeet[]>([]);
  const [selectedMeetId, setSelectedMeetId] = useState<string>('');
  const [currentMeet, setCurrentMeet] = useState<LocalMeet | undefined>();
  const [meetResults, setMeetResults] = useState<MeetResult[]>([]);
  const [resultsStatus, setResultsStatus] = useState<string | undefined>();
  const [moreInfoLink, setMoreInfoLink] = useState<string | undefined>();
  const autoLoadMeetId = useRef(searchParams.get('meetId'));

  const fetchLocalMeetList = async (): Promise<void> => {
    setStatus('inprogress');
    try {
      const today = new Date().toISOString().split('T')[0];
      const formData = new FormData();
      formData.append('event_from_date', localMeetStartDate);
      formData.append('region', wsoRegion);
      formData.append('event_to_date', today);

      const { 'content-type': _omit, ...headersWithoutContentType } = headers;
      const response = await fetch(getMeetsRoute(200), {
        method: 'POST',
        headers: headersWithoutContentType,
        body: formData,
      });
      if (!response.ok) {
        setStatus('error');
        return;
      }
      const data = await response.json();
      const allMeets: LocalMeet[] = data.data ?? [];
      const localMeets = allMeets
        .filter(
          (meet: LocalMeet) =>
            meet.geolocation && isWithinWSOBoundary(meet.geolocation.lat, meet.geolocation.lng)
        )
        .sort(
          (a, b) =>
            new Date(b.subtitle.split(' - ')[0]).getTime() -
            new Date(a.subtitle.split(' - ')[0]).getTime()
        );
      setMeets(localMeets);
      setStatus('complete');
    } catch (error) {
      handleError(error);
      setStatus('error');
    }
  };

  const getCityFromAddress = (address: string): string => {
    const addressParts = address.split(', ');
    const californiaIndex = addressParts.indexOf('California');
    const cityName = addressParts[californiaIndex - 1];
    return `${cityName}${!!cityName ? ', ' : ''}California`;
  };

  const handleGo = async (meetId: string = selectedMeetId): Promise<void> => {
    const meet = meets.find((m) => m.id === meetId);
    if (!meet) return;
    setCurrentMeet(meet);
    setResultsStatus('inprogress');
    setSearchParams({ meetId: meet.id });
    try {
      // Parse the meet date from subtitle for use as the search date range.

      const today = new Date().toISOString().split('T')[0];
      const toIso = (s: string): string | null => {
        const d = new Date(s.trim());
        return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
      };
      const shiftDay = (iso: string, delta: number): string => {
        const d = new Date(iso);
        d.setDate(d.getDate() + delta);
        return d.toISOString().split('T')[0];
      };
      const subtitleParts = (meet.subtitle ?? '').split(' - ');
      const searchStart = toIso(shiftDay(subtitleParts[0], -1));
      const searchEnd = toIso(shiftDay(subtitleParts[1], 1));
      const nameSearchResponse = await fetch(getLocalMeetByNameRoute(meet.name), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          columns: [],
          filters: {
            date_range_start: searchStart || localMeetStartDate,
            date_range_end: searchEnd || today,
            level: 1,
          },
        }),
      });
      if (!nameSearchResponse.ok) {
        setResultsStatus('error');
        return;
      }
      const nameSearchData = await nameSearchResponse.json();
      const nameSearchResults: Array<{ meet: string; action: Array<{ url: string }> }> =
        nameSearchData.data ?? [];
      const matched = nameSearchResults.find((r) => r.meet === meet.name) ?? nameSearchResults[0];
      const actionUrl = matched?.action?.[0]?.url;
      setMoreInfoLink(actionUrl);
      const resultsId = actionUrl?.split('/results/')[1];
      if (!resultsId) {
        setResultsStatus('error');
        return;
      }

      const response = await fetch(getIndividualMeetResultsRoute(resultsId, 400), {
        method: 'POST',
        headers,
      });
      if (!response.ok) {
        setResultsStatus('error');
        return;
      }
      const data = await response.json();
      setMeetResults(data.data ?? []);
      setResultsStatus('complete');
    } catch (error) {
      handleError(error);
      setResultsStatus('error');
    }
  };

  const handleReset = (): void => {
    setCurrentMeet(undefined);
    setMeetResults([]);
    setSelectedMeetId('');
    setResultsStatus(undefined);
    setSearchParams({});
  };

  useEffect(() => {
    fetchLocalMeetList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-trigger from URL meetId param once the meet list is loaded
  useEffect(() => {
    const meetId = autoLoadMeetId.current;
    if (meetId && status === 'complete' && meets.length > 0 && !currentMeet) {
      autoLoadMeetId.current = null;
      handleGo(meetId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, meets]);

  return (
    <div className="App">
      {status === 'complete' && meets.length > 0 && (
        <LocalMeetsOptionsBar
          meets={meets}
          selectedMeetId={selectedMeetId}
          onMeetChange={setSelectedMeetId}
          onGo={() => handleGo()}
          onReset={handleReset}
          showReset={!!currentMeet}
        />
      )}
      <p className="page-title">Local Meet Results</p>

      <div className="local-meets-parent">
        {status === 'inprogress' && (
          <div className="records-viewer-loading-container">
            <CircleLoader loading={true} color="gold" />
          </div>
        )}

        {status === 'error' && (
          <p className="local-meets-empty">Failed to load meets. Please try again later.</p>
        )}

        {status === 'complete' && meets.length === 0 && (
          <p className="local-meets-empty">No recent meets found within the WSO boundaries.</p>
        )}

        {status === 'complete' && !currentMeet && meets.length > 0 && (
          <ul className="local-meets-list">
            {meets.map((meet) => (
              <li
                key={meet.id}
                className="local-meet-item"
                onClick={() => handleGo(meet.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleGo(meet.id)}
              >
                <strong>
                  <span>{meet.name}</span>
                </strong>
                {meet.subtitle && <span className="local-meet-date">{meet.subtitle}</span>} &bull;{' '}
                {meet.address && (
                  <span className="local-meet-address">{getCityFromAddress(meet.address)}</span>
                )}
              </li>
            ))}
          </ul>
        )}

        {currentMeet && (
          <>
            <div className="local-meet-selected-header">
              <strong>{currentMeet.name}</strong>
              {currentMeet.subtitle && (
                <span className="local-meet-date">{currentMeet.subtitle}</span>
              )}
              <span className="local-meet-full-results-link">
                <a
                  className="common-text-link"
                  target="_blank"
                  rel="noreferrer"
                  href={moreInfoLink}
                >
                  Full Results from USAW &gt;&gt;
                </a>
              </span>
              <p className="common-fine-print">
                Not all event results include athlete age groups. To deep dive on a specific age
                group, use the{' '}
                <a href="/" className="common-text-link">
                  records explorer page
                </a>
                .
              </p>
            </div>

            {resultsStatus === 'inprogress' && (
              <div className="records-viewer-loading-container">
                <CircleLoader loading={true} color="gold" />
              </div>
            )}

            {resultsStatus === 'error' && (
              <p className="local-meets-empty">Failed to load results. Please try again.</p>
            )}

            {resultsStatus === 'complete' && meetResults.length === 0 && (
              <p className="local-meets-empty">No results found for this meet.</p>
            )}

            {resultsStatus === 'complete' && meetResults.length > 0 && (
              <LocalMeetResultsByWeightClass meetResults={meetResults} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default LocalMeets;

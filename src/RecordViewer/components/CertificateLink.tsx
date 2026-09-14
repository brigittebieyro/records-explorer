import { useState } from 'react';
import { currentRecordsSheetId } from '../../Data/RoutesAndSettings';
import { AgeGroup, WeightClass } from '../../Utils/types';

export const certificateEndpoint = '/api/certificate';

export interface CertificateRequest {
  sheet: string;
  ageGroup: string;
  gender: 'male' | 'female';
  weightClass: string;
  lift: string;
  // The printed class wording, composed here and passed through verbatim. The server has no
  // copy of the display strings -- src/Data is the single source of truth for them.
  category?: string;
}

/**
 * Builds the class line printed on the certificate, e.g. "Women's Open 53kg",
 * "Girls Under 11 Age Group 30kg", "Adaptive (Physical Disability) Women's Open 53kg".
 *
 * The gender sits before the age group, which is the opposite of how the class reads on screen.
 *
 * `weightClass.name` is authored data and already says Girls/Boys for the youth sets, so the
 * bodyweight is split off it rather than recomputing a prefix that could disagree with the
 * site's own naming.
 */
export const buildCertificateCategory = (
  weightClass: WeightClass,
  ageGroup: AgeGroup,
  adaptiveCategory?: string
): string => {
  const match = /^(.*?)\s+(\S*kg)$/.exec(weightClass.name);
  const genderPrefix = match ? match[1] : '';
  const bodyweight = match ? match[2] : weightClass.name;
  return [adaptiveCategory, genderPrefix, ageGroup.certificateDisplayKey, bodyweight]
    .filter(Boolean)
    .join(' ');
};

/**
 * Requests the certificate and hands back an object URL for the PDF.
 *
 * Posted rather than linked so the athlete never sees the machinery: a query string spelling out
 * ageGroup, weightClass and lift reads like a form submission, while an opaque blob URL reads
 * like a document.
 *
 * The spreadsheet id is attached here rather than threaded through every caller: it is the same
 * one the pages themselves read, and every call site would otherwise pass the identical value.
 * The server holds no copy of it -- src/Data is the single source of truth, so pointing the site
 * at the test sheet points the certificates there too, with nothing to keep in step by hand.
 */
export const fetchCertificate = async (request: CertificateRequest): Promise<string> => {
  const response = await fetch(certificateEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...request, sheetId: currentRecordsSheetId }),
  });
  if (!response.ok) {
    throw new Error(`Certificate request failed: ${response.status}`);
  }
  return URL.createObjectURL(await response.blob());
};

// TODO: replace with vector icon button.
function CertificateLink(props: CertificateRequest) {
  const [status, setStatus] = useState<'idle' | 'working'>('idle');

  const handleClick = async (): Promise<void> => {
    if (status === 'working') return;

    // The tab has to be opened synchronously, inside the click handler. Opening it after the
    // await puts it outside the user-gesture window and Chrome and Safari block it as a popup.
    const tab = window.open('', '_blank');
    setStatus('working');
    try {
      const url = await fetchCertificate(props);
      if (tab) {
        tab.location.href = url;
      } else {
        // Popups blocked entirely; fall back to the current tab rather than doing nothing.
        window.location.assign(url);
      }
      setStatus('idle');
      // Give the viewer time to load before releasing the blob. Revoking immediately races the
      // navigation and shows an empty tab.
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      // A failed print leaves the originating page exactly as it was: close the blank tab so
      // none is stranded, and return to idle so the button can be clicked again. Nothing is
      // shown to the athlete, by design.
      //
      // TODO: send the opened tab to a proper error page instead of closing it.
      if (tab) tab.close();
      setStatus('idle');
    }
  };

  return (
    <button
      type="button"
      className="certificate-link record-viewer-view-link"
      onClick={handleClick}
      disabled={status === 'working'}
    >
      {status === 'working' ? 'Printing…' : 'Print'}
    </button>
  );
}

export default CertificateLink;

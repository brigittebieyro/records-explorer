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

/** Used when the response carries no usable Content-Disposition; see filenameFromDisposition. */
export const fallbackCertificateFileName = 'Record.pdf';

/**
 * Reads the download name the server chose out of a Content-Disposition header.
 *
 * The name is the server's to decide: it is built from the athlete and date on the matched row,
 * and the client never sees that row. Content-Disposition is readable here only because the
 * endpoint is same-origin -- it is not a CORS-safelisted response header.
 *
 * certificateFileName (server/certificate/render.js) emits plain ASCII with no spaces, so the
 * unquoted and quoted forms are both a simple read and there is no filename* to decode.
 */
export const filenameFromDisposition = (header: string | null): string => {
  const match = header ? /filename="?([^";]+)"?/i.exec(header) : null;
  return match ? match[1].trim() || fallbackCertificateFileName : fallbackCertificateFileName;
};

export interface Certificate {
  /** Object URL for the PDF. The caller owns it and must revoke it. */
  url: string;
  filename: string;
}

/**
 * Requests the certificate and hands back an object URL for the PDF and the name to save it as.
 *
 * Posted rather than linked so the athlete never sees the machinery: a query string spelling out
 * ageGroup, weightClass and lift reads like a form submission.
 *
 * The spreadsheet id is attached here rather than threaded through every caller: it is the same
 * one the pages themselves read, and every call site would otherwise pass the identical value.
 * The server holds no copy of it -- src/Data is the single source of truth, so pointing the site
 * at the test sheet points the certificates there too, with nothing to keep in step by hand.
 */
export const fetchCertificate = async (request: CertificateRequest): Promise<Certificate> => {
  const response = await fetch(certificateEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...request, sheetId: currentRecordsSheetId }),
  });
  if (!response.ok) {
    throw new Error(`Certificate request failed: ${response.status}`);
  }
  return {
    url: URL.createObjectURL(await response.blob()),
    filename: filenameFromDisposition(response.headers.get('Content-Disposition')),
  };
};

function CertificateLink(props: CertificateRequest) {
  const [status, setStatus] = useState<'idle' | 'working'>('idle');

  const handleClick = async (): Promise<void> => {
    if (status === 'working') return;

    setStatus('working');
    try {
      const { url, filename } = await fetchCertificate(props);
      // Saved through an anchor rather than opened in a tab: a blob URL carries no name, so a
      // tab's viewer would offer the object URL's uuid as the filename. The download attribute
      // is the only way the server's name reaches the athlete's disk.
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      // Firefox only honours a click on an anchor that is in the document.
      document.body.appendChild(link);
      link.click();
      link.remove();
      setStatus('idle');
      // Let the browser finish reading the blob before releasing it. Revoking immediately races
      // the save and produces an empty file.
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      // A failed print leaves the originating page exactly as it was, and returns to idle so the
      // button can be clicked again. Nothing is shown to the athlete, by design.
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
      <img className="certificate-link-icon" src="/print.svg" width="18" height="18" alt="Print" />
    </button>
  );
}

export default CertificateLink;

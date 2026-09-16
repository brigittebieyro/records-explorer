import { Certificate, filenameFromDisposition } from '../RecordViewer/components/CertificateLink';
import { recordTimeZone } from '../Data/RoutesAndSettings';
import { ageGroups } from '../Data/ageGroups';

export const pastRecordCertificateEndpoint = '/api/certificate/manual';

/** The three lifts a record can be set in. Printed verbatim on the certificate. */
export const lifts = ['Snatch', 'Clean & Jerk', 'Total'] as const;

export const divisions = ["Women's", "Men's"] as const;

/**
 * The age groups a certificate can name, taken from ageGroups.ts so the wording cannot drift from
 * the rest of the site.
 *
 * The value is `certificateDisplayKey` verbatim, which is the certificate's own wording and is not
 * the same as the name the age group goes by on screen. Most of them carry a trailing comma
 * because they sit mid-sentence -- "Girls Under 11, 30kg" -- so it is dropped from the label and
 * kept in the value.
 *
 * Disabled groups are listed but not selectable, matching the age group dropdown on the home page.
 */
export const ageCategories = ageGroups.map((ageGroup) => ({
  value: ageGroup.certificateDisplayKey,
  label: ageGroup.certificateDisplayKey.replace(/,$/, ''),
  disabled: ageGroup.disabled,
}));

export interface PastRecordCertificateInput {
  lifter: string;
  lift: string;
  /** The lift itself, in kg. */
  weight: string;
  /** Free text. Printed as written, give or take the reformatting formatDate does. */
  date: string;
  division: string;
  /** Free text, e.g. 'Open', 'Under 15', 'Masters (35-39)'. */
  ageCategory: string;
  /**
   * The class's bodyweight limit, in kg, carrying its own trailing '+' for an open top class:
   * '53' or '86+'. Free text, printed as written -- the operator decides how their class reads.
   */
  weightClass: string;
}

/**
 * Builds the class line printed on the certificate, e.g. "Women's Masters (35-39) 86+kg".
 *
 * Deliberately the same join order as buildCertificateCategory (CertificateLink.tsx): gender
 * first, then age group, then bodyweight -- which is the opposite of how the class reads on
 * screen. A certificate typed in by hand has to be indistinguishable from one printed off a
 * record row, so the ordering is matched rather than re-invented.
 *
 * Parts are filtered rather than interpolated, so an omitted age category closes the gap instead
 * of leaving a double space.
 */
export const buildPastRecordCategory = ({
  division,
  ageCategory,
  weightClass,
}: Pick<PastRecordCertificateInput, 'division' | 'ageCategory' | 'weightClass'>): string => {
  const bodyweight = weightClass.trim() ? `${weightClass.trim()}kg` : '';
  return [division.trim(), ageCategory.trim(), bodyweight].filter(Boolean).join(' ');
};

/**
 * Requests a certificate for a record that is not in the sheet, and hands back an object URL for
 * the PDF and the name to save it as. The caller owns the URL; saveCertificate revokes it.
 *
 * Every printed word is composed here and posted whole -- the server holds no copy of the
 * wording, exactly as it holds none for the sheet-backed route. The filename still comes back
 * from the server, read out of Content-Disposition by the shared helper, so both kinds of
 * certificate are named by the same code.
 */
export const fetchPastRecordCertificate = async (
  input: PastRecordCertificateInput
): Promise<Certificate> => {
  const response = await fetch(pastRecordCertificateEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lifter: input.lifter.trim(),
      lift: input.lift,
      weight: input.weight,
      date: input.date,
      category: buildPastRecordCategory(input),
      timeZone: recordTimeZone,
    }),
  });

  if (!response.ok) {
    // The route answers a rejected field with { error }, which names the field the operator has
    // to fix. Surfacing it beats "request failed": this is an operator tool, not something an
    // athlete is watching.
    const detail = await response
      .json()
      .then((body) => (body && typeof body.error === 'string' ? body.error : ''))
      .catch(() => '');
    throw new Error(detail || `Certificate request failed: ${response.status}`);
  }

  return {
    url: URL.createObjectURL(await response.blob()),
    filename: filenameFromDisposition(response.headers.get('Content-Disposition')),
  };
};

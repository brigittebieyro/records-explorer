import { AgeGroup, WeightClass } from '../../Utils/types';

interface CertificateHrefParams {
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
 * The sheet indicator for a weight class: the max bodyweight, or '>' plus the minimum for the
 * open-ended top class. Mirrors computeStandardsForWeightClass in RecordViewer.tsx.
 *
 * The adaptive path needs this because it holds a full WeightClass object rather than the raw
 * indicator the Standards block already carries.
 */
export const weightClassIndicator = (weightClass: WeightClass): string =>
  parseFloat(weightClass.maxBodyweight) > 200
    ? `>${parseInt(weightClass.minBodyweight)}`
    : weightClass.maxBodyweight;

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
 * Built with URLSearchParams rather than a template literal: `lift=Clean & Jerk` would be
 * truncated at the ampersand, and `weightClass=>86` and the spaces and parentheses in `category`
 * all need encoding too.
 */
export const buildCertificateHref = ({
  sheet,
  ageGroup,
  gender,
  weightClass,
  lift,
  category,
}: CertificateHrefParams): string => {
  const params = new URLSearchParams({ sheet, ageGroup, gender, weightClass, lift });
  if (category) params.set('category', category);
  return `/api/certificate?${params.toString()}`;
};

// TODO: replace with vector icon button.
function CertificateLink(props: CertificateHrefParams) {
  return (
    <a
      className="certificate-link record-viewer-view-link"
      href={buildCertificateHref(props)}
      target="_blank"
      rel="noopener noreferrer"
    >
      Print
    </a>
  );
}

export default CertificateLink;

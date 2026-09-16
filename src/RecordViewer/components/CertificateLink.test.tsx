import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CertificateLink, {
  buildCertificateCategory,
  certificateEndpoint,
  fallbackCertificateFileName,
  filenameFromDisposition,
} from './CertificateLink';
import { ageGroups } from '../../Data/ageGroups';
import { currentRecordsSheetId } from '../../Data/RoutesAndSettings';
import { AgeGroup, WeightClass } from '../../Utils/types';

const ageGroupById = (id: string): AgeGroup =>
  ageGroups.find((group) => group.id === id) as AgeGroup;

const makeWeightClass = (overrides: object = {}): WeightClass =>
  ({
    id: 'W53',
    name: "Women's 53kg",
    sport80Id: 1,
    minBodyweight: '49',
    maxBodyweight: '53',
    gender: 'female',
    start: '2025-06-01',
    ...overrides,
  }) as WeightClass;

const PROPS = {
  sheet: 'Post-Aug2026',
  ageGroup: 'OPEN',
  gender: 'female' as const,
  weightClass: '53',
  lift: 'Snatch',
  category: "Women's Open 53kg",
};

// jsdom has no object-URL API, and the component needs it.
let objectUrls: string[];
// Anchor clicks are captured rather than let through: jsdom treats one as a navigation it has
// not implemented, and the download attribute is exactly what these tests are checking.
let saved: Array<{ href: string; download: string }>;

const mockCertificateFetch = (ok = true, disposition: string | null = 'inline; filename="X.pdf"') =>
  jest.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 404,
    headers: { get: (name: string) => (/^content-disposition$/i.test(name) ? disposition : null) },
    blob: async () => new Blob(['%PDF-'], { type: 'application/pdf' }),
  });

beforeEach(() => {
  objectUrls = [];
  saved = [];
  jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement
  ) {
    saved.push({ href: this.href, download: this.download });
  });
  (URL as unknown as { createObjectURL: unknown }).createObjectURL = jest.fn(() => {
    const url = `blob:mock/${objectUrls.length}`;
    objectUrls.push(url);
    return url;
  });
  (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('CertificateLink (user-based)', () => {
  test('B-27: clicking posts the record and saves the PDF', async () => {
    const fetchMock = mockCertificateFetch();
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<CertificateLink {...PROPS} />);
    await userEvent.click(screen.getByRole('button', { name: /^print$/i }));

    await waitFor(() => expect(saved).toHaveLength(1));
    expect(saved[0].href).toBe('blob:mock/0');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(certificateEndpoint);
    expect(init.method).toBe('POST');
    // The spreadsheet id rides along with the caller's props. The server keeps no copy of it, so
    // if this stops being sent, certificates stop resolving rather than quietly reading the
    // wrong spreadsheet.
    expect(JSON.parse(init.body)).toEqual({ ...PROPS, sheetId: currentRecordsSheetId });
  });

  test('B-27: the file is saved under the name the server chose', async () => {
    // The name is built from the athlete and date on the matched row, which the client never
    // sees -- so it can only come off the response header. A blob URL carries no name of its own.
    global.fetch = mockCertificateFetch(
      true,
      'inline; filename="JaneDoe_Snatch_2025-10-18.pdf"'
    ) as unknown as typeof fetch;

    render(<CertificateLink {...PROPS} />);
    await userEvent.click(screen.getByRole('button', { name: /^print$/i }));

    await waitFor(() => expect(saved).toHaveLength(1));
    expect(saved[0].download).toBe('JaneDoe_Snatch_2025-10-18.pdf');
  });

  test('a response with no usable Content-Disposition still saves under some name', async () => {
    // Better a generic name than an empty download attribute, which saves the uuid instead.
    global.fetch = mockCertificateFetch(true, null) as unknown as typeof fetch;

    render(<CertificateLink {...PROPS} />);
    await userEvent.click(screen.getByRole('button', { name: /^print$/i }));

    await waitFor(() => expect(saved).toHaveLength(1));
    expect(saved[0].download).toBe(fallbackCertificateFileName);
  });

  test('the record parameters never appear in a URL', async () => {
    // The whole point of posting: the athlete never sees the machinery.
    const fetchMock = mockCertificateFetch();
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<CertificateLink {...PROPS} />);
    const button = screen.getByRole('button', { name: /^print$/i });
    expect(button).not.toHaveAttribute('href');

    await userEvent.click(button);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][0]).not.toContain('?');
  });

  test('a failed request leaves the originating page unchanged', async () => {
    global.fetch = mockCertificateFetch(false) as unknown as typeof fetch;

    render(<CertificateLink {...PROPS} />);
    const before = document.body.innerHTML;
    await userEvent.click(screen.getByRole('button', { name: /^print$/i }));

    // Nothing is saved...
    await waitFor(() => expect(saved).toHaveLength(0));
    // ...and the page the athlete is looking at is byte-for-byte what it was. The anchor the
    // component builds is appended to the body, so this also pins that it is cleaned up again.
    await waitFor(() => expect(document.body.innerHTML).toBe(before));
  });

  test('the button is usable again after a failure', async () => {
    const fetchMock = mockCertificateFetch(false);
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<CertificateLink {...PROPS} />);
    const button = screen.getByRole('button', { name: /^print$/i });
    await userEvent.click(button);
    await waitFor(() => expect(button).toBeEnabled());

    await userEvent.click(button);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('filenameFromDisposition', () => {
  test('reads the name the server sent, quoted or not', () => {
    expect(filenameFromDisposition('inline; filename="JaneDoe_Record_2025-10-18.pdf"')).toBe(
      'JaneDoe_Record_2025-10-18.pdf'
    );
    expect(filenameFromDisposition('inline; filename=JaneDoe_Record.pdf')).toBe(
      'JaneDoe_Record.pdf'
    );
    expect(filenameFromDisposition('attachment; filename="A.pdf"; size=100')).toBe('A.pdf');
  });

  test('falls back rather than returning an empty name', () => {
    // An empty download attribute makes the browser save the object URL's uuid instead.
    expect(filenameFromDisposition(null)).toBe(fallbackCertificateFileName);
    expect(filenameFromDisposition('inline')).toBe(fallbackCertificateFileName);
    expect(filenameFromDisposition('inline; filename=""')).toBe(fallbackCertificateFileName);
  });
});

describe('buildCertificateCategory', () => {
  test('puts the gender before the age group and the bodyweight last', () => {
    expect(buildCertificateCategory(makeWeightClass(), ageGroupById('OPEN'))).toBe(
      `Women's ${ageGroupById('OPEN').certificateDisplayKey} 53kg`
    );
  });

  test('uses the Girls/Boys wording the youth weight class data already carries', () => {
    // Taken from weightClass.name rather than recomputed, so it cannot disagree with the site.
    const youth = makeWeightClass({ name: 'Girls 30kg', maxBodyweight: '30' });
    expect(buildCertificateCategory(youth, ageGroupById('U11'))).toBe(
      `Girls ${ageGroupById('U11').certificateDisplayKey} 30kg`
    );
  });

  test('keeps the + of an open-ended class', () => {
    const top = makeWeightClass({
      name: "Women's 86+kg",
      minBodyweight: '86',
      maxBodyweight: '1000',
    });
    expect(buildCertificateCategory(top, ageGroupById('OPEN'))).toBe(
      `Women's ${ageGroupById('OPEN').certificateDisplayKey} 86+kg`
    );
  });

  test('leads with the adaptive category when there is one', () => {
    expect(
      buildCertificateCategory(makeWeightClass(), ageGroupById('OPEN'), 'Adaptive (Overall)')
    ).toBe(`Adaptive (Overall) Women's ${ageGroupById('OPEN').certificateDisplayKey} 53kg`);
  });

  test('tracks edits to ageGroups.ts without any other file changing', () => {
    // src/Data is the single source of truth for this wording, so a new certificateDisplayKey
    // shows up on the certificate immediately.
    const edited = { ...ageGroupById('OPEN'), certificateDisplayKey: 'Brand New Wording' };
    expect(buildCertificateCategory(makeWeightClass(), edited)).toBe(
      "Women's Brand New Wording 53kg"
    );
  });
});

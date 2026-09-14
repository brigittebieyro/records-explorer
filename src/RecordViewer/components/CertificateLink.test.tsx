import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CertificateLink, { buildCertificateCategory, certificateEndpoint } from './CertificateLink';
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

// jsdom has neither window.open nor the object-URL API, and the component needs both.
let openedTab: { location: { href: string }; close: jest.Mock };
let objectUrls: string[];

const mockCertificateFetch = (ok = true) =>
  jest.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 404,
    blob: async () => new Blob(['%PDF-'], { type: 'application/pdf' }),
  });

beforeEach(() => {
  objectUrls = [];
  openedTab = { location: { href: '' }, close: jest.fn() };
  window.open = jest.fn().mockReturnValue(openedTab);
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
  test('B-27: clicking posts the record and opens the PDF in a new tab', async () => {
    const fetchMock = mockCertificateFetch();
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<CertificateLink {...PROPS} />);
    await userEvent.click(screen.getByRole('button', { name: /^print$/i }));

    await waitFor(() => expect(openedTab.location.href).toBe('blob:mock/0'));

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(certificateEndpoint);
    expect(init.method).toBe('POST');
    // The spreadsheet id rides along with the caller's props. The server keeps no copy of it, so
    // if this stops being sent, certificates stop resolving rather than quietly reading the
    // wrong spreadsheet.
    expect(JSON.parse(init.body)).toEqual({ ...PROPS, sheetId: currentRecordsSheetId });
  });

  test('B-27: the tab is opened synchronously, before the request resolves', async () => {
    // Opening it after the await puts it outside the user-gesture window, and Chrome and Safari
    // block it as a popup. This pins the ordering that avoids that.
    let resolveFetch: (value: unknown) => void = () => {};
    global.fetch = jest.fn(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
    ) as unknown as typeof fetch;

    render(<CertificateLink {...PROPS} />);
    await userEvent.click(screen.getByRole('button', { name: /^print$/i }));

    expect(window.open).toHaveBeenCalledWith('', '_blank');
    expect(openedTab.location.href).toBe('');

    resolveFetch({ ok: true, status: 200, blob: async () => new Blob() });
    await waitFor(() => expect(openedTab.location.href).toBe('blob:mock/0'));
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

    // The blank tab is closed rather than stranded...
    await waitFor(() => expect(openedTab.close).toHaveBeenCalled());
    // ...and the page the athlete is looking at is byte-for-byte what it was.
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

  test('a blocked popup falls back to the current tab rather than doing nothing', async () => {
    (window.open as jest.Mock).mockReturnValue(null);
    global.fetch = mockCertificateFetch() as unknown as typeof fetch;
    const assign = jest.fn();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, assign },
      writable: true,
    });

    render(<CertificateLink {...PROPS} />);
    await userEvent.click(screen.getByRole('button', { name: /^print$/i }));

    await waitFor(() => expect(assign).toHaveBeenCalledWith('blob:mock/0'));
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

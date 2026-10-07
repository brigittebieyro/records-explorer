import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PastRecordCertificateForm from './PastRecordCertificateForm';
import { recordTimeZone } from '../../Data/RoutesAndSettings';

const pdfResponse = (filename = 'JaneSmith_Snatch_2019-05-04.pdf') => ({
  ok: true,
  blob: async () => new Blob(['%PDF-1.3'], { type: 'application/pdf' }),
  headers: { get: () => `inline; filename="${filename}"` },
});

/**
 * The three dropdowns carry no visible label and no accessible name, so they are reached by id.
 * The text inputs are addressed by their placeholder, which is what the operator actually reads.
 */
const select = (container: HTMLElement, id: string): HTMLSelectElement =>
  container.querySelector(`#${id}`) as HTMLSelectElement;

const lifterInput = () => screen.getByPlaceholderText('Athlete Name');
const dateInput = () => screen.getByPlaceholderText('Date, any format');
const eventInput = () => screen.getByPlaceholderText('Event Name');
const weightInput = () => screen.getByPlaceholderText('##');
const weightClassInput = () => screen.getByPlaceholderText('##+');
const goButton = () => screen.getByRole('button', { name: 'Go' });

/** Fills every field with a valid past record. */
const fillForm = async (container: HTMLElement) => {
  await userEvent.type(lifterInput(), 'Jane Smith');
  await userEvent.type(dateInput(), '2019-05-04');
  await userEvent.type(eventInput(), 'California State Championships');
  await userEvent.selectOptions(select(container, 'certificate-lift'), 'Snatch');
  await userEvent.type(weightInput(), '76');
  await userEvent.selectOptions(select(container, 'certificate-division'), "Women's");
  await userEvent.selectOptions(select(container, 'certificate-age-category'), 'Open');
  await userEvent.type(weightClassInput(), '53');
};

const postedBody = () => JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);

describe('PastRecordCertificateForm (user-based)', () => {
  let clickSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(window.URL, 'createObjectURL', {
      value: jest.fn(() => 'blob:fake-url'),
      configurable: true,
    });
    Object.defineProperty(window.URL, 'revokeObjectURL', {
      value: jest.fn(),
      configurable: true,
    });
    clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    global.fetch = jest.fn();
  });

  afterEach(() => {
    clickSpy.mockRestore();
  });

  test('F-06: every detail the certificate prints has a control', () => {
    const { container } = render(<PastRecordCertificateForm />);

    expect(lifterInput()).toBeInTheDocument();
    expect(dateInput()).toBeInTheDocument();
    expect(eventInput()).toBeInTheDocument();
    expect(weightInput()).toBeInTheDocument();
    expect(weightClassInput()).toBeInTheDocument();
    expect(select(container, 'certificate-lift')).toBeInTheDocument();
    expect(select(container, 'certificate-division')).toBeInTheDocument();
    expect(select(container, 'certificate-age-category')).toBeInTheDocument();
  });

  test('F-06: the lift dropdown offers the three lifts', () => {
    render(<PastRecordCertificateForm />);

    expect(screen.getByRole('option', { name: 'Snatch' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Clean & Jerk' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Total' })).toBeInTheDocument();
  });

  test('F-06: the group and age group dropdowns offer the site’s own wording', () => {
    render(<PastRecordCertificateForm />);

    expect(screen.getByRole('option', { name: "Women's" })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: "Men's" })).toBeInTheDocument();

    // Drawn from ageGroups.ts, so the certificate cannot drift from the rest of the site.
    expect(screen.getByRole('option', { name: 'Open' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Junior' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Masters 35-39' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '12-13' })).toBeInTheDocument();
  });

  test('F-06: Go stays disabled until every detail is filled in', async () => {
    const { container } = render(<PastRecordCertificateForm />);
    expect(goButton()).toBeDisabled();

    await userEvent.type(lifterInput(), 'Jane Smith');
    await userEvent.selectOptions(select(container, 'certificate-lift'), 'Snatch');
    expect(goButton()).toBeDisabled();

    await fillForm(container);
    expect(goButton()).toBeEnabled();

    // The meet is required like the rest: a past record the committee cannot name a meet for is
    // one they have to go and find, not print with the line missing.
    await userEvent.clear(eventInput());
    expect(goButton()).toBeDisabled();
  });

  test('F-06: Go posts the entered details and saves the PDF under the server name', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(pdfResponse());
    const { container } = render(<PastRecordCertificateForm />);
    await fillForm(container);

    await userEvent.click(goButton());

    await waitFor(() => {
      expect(screen.getByText('Download complete.')).toBeInTheDocument();
    });

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('/api/certificate/manual');
    expect(options.method).toBe('POST');
    // The class wording and the time zone are both composed here and posted whole -- the server
    // keeps no copy of either.
    expect(postedBody()).toEqual({
      lifter: 'Jane Smith',
      lift: 'Snatch',
      weight: '76',
      date: '2019-05-04',
      event: 'California State Championships',
      category: "Women's Open 53kg",
      timeZone: recordTimeZone,
    });

    expect(clickSpy).toHaveBeenCalledTimes(1);
    const downloadLink = clickSpy.mock.instances[0] as unknown as HTMLAnchorElement;
    expect(downloadLink.download).toBe('JaneSmith_Snatch_2019-05-04.pdf');
    expect(downloadLink.href).toContain('blob:fake-url');
  });

  test('F-06: a chosen age group reaches the certificate in its printed wording', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(pdfResponse());
    const { container } = render(<PastRecordCertificateForm />);
    await fillForm(container);
    // The trailing comma is part of the value and belongs in the sentence.
    await userEvent.selectOptions(select(container, 'certificate-age-category'), 'Masters 35-39,');

    await userEvent.click(goButton());

    await waitFor(() => {
      expect(screen.getByText('Download complete.')).toBeInTheDocument();
    });
    expect(postedBody().category).toBe("Women's Masters 35-39, 53kg");
  });

  test('F-07: a weight class typed with a plus prints the open top class', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(pdfResponse());
    const { container } = render(<PastRecordCertificateForm />);
    await fillForm(container);
    await userEvent.clear(weightClassInput());
    await userEvent.type(weightClassInput(), '86+');

    await userEvent.click(goButton());

    await waitFor(() => {
      expect(screen.getByText('Download complete.')).toBeInTheDocument();
    });
    expect(postedBody().category).toBe("Women's Open 86+kg");
  });

  test('F-06: the date is posted exactly as it was written', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(pdfResponse());
    const { container } = render(<PastRecordCertificateForm />);
    await fillForm(container);
    await userEvent.clear(dateInput());
    await userEvent.type(dateInput(), 'May 4, 2019');

    await userEvent.click(goButton());

    await waitFor(() => {
      expect(screen.getByText('Download complete.')).toBeInTheDocument();
    });
    expect(postedBody().date).toBe('May 4, 2019');
  });

  test('F-08: a rejected detail is shown to the operator, naming the field', async () => {
    // Unlike the print button on a record row, which stays silent because an athlete is
    // watching, this is an operator tool and has to say what to fix.
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'lifter is required' }),
    });
    const { container } = render(<PastRecordCertificateForm />);
    await fillForm(container);

    await userEvent.click(goButton());

    await waitFor(() => {
      expect(screen.getByText('Error:')).toBeInTheDocument();
    });
    expect(screen.getByText(/lifter is required/)).toBeInTheDocument();
    expect(screen.queryByText('Download complete.')).toBeNull();
    expect(clickSpy).not.toHaveBeenCalled();
    expect(goButton()).toBeEnabled();
  });

  test('F-08: a server that is down reports rather than failing silently', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Failed to fetch'));
    const { container } = render(<PastRecordCertificateForm />);
    await fillForm(container);

    await userEvent.click(goButton());

    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch/)).toBeInTheDocument();
    });
    expect(goButton()).toBeEnabled();
  });

  test('F-06: editing after a download clears the previous outcome', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(pdfResponse());
    const { container } = render(<PastRecordCertificateForm />);
    await fillForm(container);
    await userEvent.click(goButton());
    await waitFor(() => {
      expect(screen.getByText('Download complete.')).toBeInTheDocument();
    });

    // Leaving it up while the fields say something else reads as if the new details were printed.
    await userEvent.type(lifterInput(), 'x');
    expect(screen.queryByText('Download complete.')).toBeNull();
  });
});

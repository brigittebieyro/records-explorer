import { render, screen } from '@testing-library/react';
import AllCurrentRecordsView from './AllCurrentRecordsView';

const womenW48 = {
  id: 'W48',
  name: "Women's 48kg",
  gender: 'female',
};

const menM60 = {
  id: 'M60',
  name: "Men's 60kg",
  gender: 'male',
};

const openAgeGroup = { id: 'OPEN', name: 'Open' };
const masters35AgeGroup = { id: '35', name: '35 - 39 years old' };

const fullRecords = {
  'Total': { weight: '225', lifter: 'Jane Smith', event: 'National Championships', date: '2024-05-01' },
  'Snatch': { weight: '102', lifter: 'Jane Smith', event: 'National Championships', date: '2024-05-01' },
  'Clean & Jerk': { weight: '123', lifter: 'Jane Smith', event: 'National Championships', date: '2024-05-01' },
};

const partialRecords = {
  'Total': { weight: '200', lifter: 'Joan Doe', event: 'State Meet', date: '2023-11-01' },
};

const mockData = [
  {
    weightClass: womenW48,
    groups: [
      { ageGroup: openAgeGroup, records: fullRecords },
      { ageGroup: masters35AgeGroup, records: partialRecords },
    ],
  },
  {
    weightClass: menM60,
    groups: [
      { ageGroup: openAgeGroup, records: { 'Total': { weight: '310', lifter: 'John Smith', event: 'Nationals', date: '2024-03-01' } } },
    ],
  },
];

describe('AllCurrentRecordsView', () => {
  describe('empty and loading states', () => {
    test('shows loading message when data is empty', () => {
      render(<AllCurrentRecordsView data={[]} />);
      expect(screen.getByText(/loading current records/i)).toBeInTheDocument();
    });
  });

  describe('two-column gender layout', () => {
    test('renders Women and Men column headers', () => {
      render(<AllCurrentRecordsView data={mockData} />);
      expect(screen.getByText('Women')).toBeInTheDocument();
      expect(screen.getByText('Men')).toBeInTheDocument();
    });

    test('renders Women column with female weight class', () => {
      render(<AllCurrentRecordsView data={mockData} />);
      expect(screen.getByText("Women's 48kg")).toBeInTheDocument();
    });

    test('renders Men column with male weight class', () => {
      render(<AllCurrentRecordsView data={mockData} />);
      expect(screen.getByText("Men's 60kg")).toBeInTheDocument();
    });
  });

  describe('weight class sections', () => {
    test('renders weight class name as header', () => {
      render(<AllCurrentRecordsView data={mockData} />);
      expect(screen.getByText("Women's 48kg")).toBeInTheDocument();
      expect(screen.getByText("Men's 60kg")).toBeInTheDocument();
    });

    test('renders multiple weight classes in each column', () => {
      const data = [
        { weightClass: { id: 'W48', name: "Women's 48kg", gender: 'female' }, groups: [{ ageGroup: openAgeGroup, records: partialRecords }] },
        { weightClass: { id: 'W53', name: "Women's 53kg", gender: 'female' }, groups: [{ ageGroup: openAgeGroup, records: partialRecords }] },
      ];
      render(<AllCurrentRecordsView data={data} />);
      expect(screen.getByText("Women's 48kg")).toBeInTheDocument();
      expect(screen.getByText("Women's 53kg")).toBeInTheDocument();
    });
  });

  describe('age group rows', () => {
    test('renders age group name', () => {
      render(<AllCurrentRecordsView data={mockData} />);
      expect(screen.getAllByText('Open').length).toBeGreaterThan(0);
    });

    test('renders multiple age groups within a weight class', () => {
      render(<AllCurrentRecordsView data={mockData} />);
      expect(screen.getByText('35 - 39 years old')).toBeInTheDocument();
    });
  });

  describe('record display', () => {
    test('renders lifter name', () => {
      render(<AllCurrentRecordsView data={mockData} />);
      expect(screen.getAllByText('Jane Smith').length).toBeGreaterThan(0);
    });

    test('renders record weight with kg suffix', () => {
      render(<AllCurrentRecordsView data={mockData} />);
      expect(screen.getByText('225kg')).toBeInTheDocument();
    });

    test('renders event name', () => {
      render(<AllCurrentRecordsView data={mockData} />);
      expect(screen.getAllByText(/National Championships/).length).toBeGreaterThan(0);
    });

    test('renders record date', () => {
      render(<AllCurrentRecordsView data={mockData} />);
      expect(screen.getAllByText(/2024-05-01/).length).toBeGreaterThan(0);
    });

    test('renders Snatch, Clean & Jerk, and Total lift labels', () => {
      render(<AllCurrentRecordsView data={mockData} />);
      expect(screen.getAllByText('Snatch').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Clean & Jerk').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Total').length).toBeGreaterThan(0);
    });

    test('displays Snatch before Clean & Jerk before Total', () => {
      render(<AllCurrentRecordsView data={mockData} />);
      const labels = screen.getAllByText(/^(Snatch|Clean & Jerk|Total)$/);
      const texts = labels.map((el) => el.textContent);
      const snatchIdx = texts.indexOf('Snatch');
      const cjIdx = texts.indexOf('Clean & Jerk');
      const totalIdx = texts.indexOf('Total');
      expect(snatchIdx).toBeLessThan(cjIdx);
      expect(cjIdx).toBeLessThan(totalIdx);
    });

    test('omits lift type when not present in records', () => {
      const dataWithPartialOnly = [
        {
          weightClass: { id: 'W48', name: "Women's 48kg", gender: 'female' },
          groups: [{ ageGroup: openAgeGroup, records: partialRecords }],
        },
      ];
      render(<AllCurrentRecordsView data={dataWithPartialOnly} />);
      // Only Total present; Snatch and C&J labels should not appear
      expect(screen.getAllByText('Total').length).toBeGreaterThan(0);
      expect(screen.queryByText('Snatch')).not.toBeInTheDocument();
      expect(screen.queryByText('Clean & Jerk')).not.toBeInTheDocument();
    });
  });

  describe('title', () => {
    test('renders page title', () => {
      render(<AllCurrentRecordsView data={mockData} />);
      expect(screen.getByText('All Current Record Holders')).toBeInTheDocument();
    });
  });
});

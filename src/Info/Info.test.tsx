import { render, screen } from '@testing-library/react';
import Info from './Info';
import {
  americanRecordsUrl,
  githubUrl,
  maintainerEmail,
  maintainerName,
  publicSpreadsheetLink,
  wsoInfoUSAWUrl,
} from '../Data/RoutesAndSettings';

describe('Info (user-based)', () => {
  test('E-01: renders the three info boxes', () => {
    render(<Info />);

    expect(screen.getByRole('heading', { name: 'About Records' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: "About Last Year's Lifts" })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'About This Site' })).toBeInTheDocument();
  });

  test('E-02: the American records link points at USAW', () => {
    render(<Info />);

    expect(
      screen.getByRole('link', { name: /American national National records and standards/ })
    ).toHaveAttribute('href', americanRecordsUrl);
  });

  test('E-02: the WSO committee link points at USAW WSO info', () => {
    render(<Info />);

    expect(screen.getByRole('link', { name: 'your WSO committee' })).toHaveAttribute(
      'href',
      wsoInfoUSAWUrl
    );
  });

  test('E-02: the public spreadsheet link points at the records sheet', () => {
    render(<Info />);

    expect(screen.getByRole('link', { name: 'public spreadsheet' })).toHaveAttribute(
      'href',
      publicSpreadsheetLink
    );
  });

  test('E-02: the GitHub link points at the project repo', () => {
    render(<Info />);

    expect(screen.getByRole('link', { name: 'GitHub' })).toHaveAttribute('href', githubUrl);
  });

  test('E-02: external links open in a new tab', () => {
    render(<Info />);

    for (const name of ['your WSO committee', 'public spreadsheet', 'GitHub']) {
      expect(screen.getByRole('link', { name })).toHaveAttribute('target', '_blank');
    }
  });

  test('E-03: the maintainer link is a mailto', () => {
    render(<Info />);

    expect(screen.getByRole('link', { name: maintainerName })).toHaveAttribute(
      'href',
      `mailto:${maintainerEmail}`
    );
  });
});

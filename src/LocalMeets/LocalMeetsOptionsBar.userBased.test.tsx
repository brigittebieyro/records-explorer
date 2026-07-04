import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LocalMeetsOptionsBar from './LocalMeetsOptionsBar';
import { LocalMeet } from '../Utils/types';

const makeMeet = (overrides: object = {}): LocalMeet =>
  ({
    id: '1',
    is_event: true,
    name: 'Sacramento Open',
    subtitle: '2026-03-01',
    subtitle_icon: '',
    address: '123 Main St, Sacramento, California',
    geolocation: { lat: 38.5, lng: -121.5 },
    telephone: '',
    email: '',
    info: '',
    actions: [],
    img_url: '',
    ...overrides,
  }) as LocalMeet;

const noop = () => {};

const renderBar = (overrides: object = {}) => {
  const props = {
    meets: [makeMeet(), makeMeet({ id: '2', name: 'Fresno Classic' })],
    selectedMeetId: '',
    onMeetChange: noop,
    onGo: noop,
    onReset: noop,
    showReset: false,
    ...overrides,
  };
  return render(<LocalMeetsOptionsBar {...props} />);
};

describe('LocalMeetsOptionsBar (user-based)', () => {
  test('C-02: the Meet dropdown lists all meets plus a placeholder', () => {
    renderBar();

    const select = screen.getByLabelText('Meet');
    expect(within(select).getByRole('option', { name: 'Select a meet' })).toBeInTheDocument();
    expect(within(select).getByRole('option', { name: 'Sacramento Open' })).toBeInTheDocument();
    expect(within(select).getByRole('option', { name: 'Fresno Classic' })).toBeInTheDocument();
  });

  test('C-02: Go is disabled until a meet is selected', () => {
    renderBar({ selectedMeetId: '' });
    expect(screen.getByRole('button', { name: 'Go' })).toBeDisabled();
  });

  test('C-02: Go is enabled with a selection and fires onGo', async () => {
    const onGo = jest.fn();
    renderBar({ selectedMeetId: '1', onGo });

    const goButton = screen.getByRole('button', { name: 'Go' });
    expect(goButton).toBeEnabled();
    await userEvent.click(goButton);
    expect(onGo).toHaveBeenCalledTimes(1);
  });

  test('C-02: selecting a meet fires onMeetChange with the meet id', async () => {
    const onMeetChange = jest.fn();
    renderBar({ onMeetChange });

    await userEvent.selectOptions(screen.getByLabelText('Meet'), '2');
    expect(onMeetChange).toHaveBeenCalledWith('2');
  });

  test('C-08: Reset renders only when showReset is set and fires onReset', async () => {
    const onReset = jest.fn();
    const { rerender } = render(
      <LocalMeetsOptionsBar
        meets={[makeMeet()]}
        selectedMeetId=""
        onMeetChange={noop}
        onGo={noop}
        onReset={onReset}
        showReset={false}
      />
    );
    expect(screen.queryByRole('button', { name: 'Reset' })).toBeNull();

    rerender(
      <LocalMeetsOptionsBar
        meets={[makeMeet()]}
        selectedMeetId=""
        onMeetChange={noop}
        onGo={noop}
        onReset={onReset}
        showReset={true}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});

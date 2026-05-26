import { LocalMeet } from '../Utils/types';

interface LocalMeetsOptionsBarProps {
  meets: LocalMeet[];
  selectedMeetId: string;
  onMeetChange: (id: string) => void;
  onGo: () => void;
  onReset: () => void;
  showReset: boolean;
}

function LocalMeetsOptionsBar({
  meets,
  selectedMeetId,
  onMeetChange,
  onGo,
  onReset,
  showReset,
}: LocalMeetsOptionsBarProps) {
  return (
    <div className="record-viewer-options-bar">
      <span>Select a meet: </span>
      <select
        aria-label="Meet"
        className="header-button"
        name="meet"
        id="meet-select"
        value={selectedMeetId}
        onChange={(e) => onMeetChange(e.target.value)}
      >
        <option value="">Select a meet</option>
        {meets.map((meet) => (
          <option value={meet.id} key={meet.id}>
            {meet.name}
          </option>
        ))}
      </select>

      <button className="header-button" onClick={onGo} disabled={!selectedMeetId}>
        Go
      </button>

      {showReset && (
        <button className="header-button reset-button" onClick={onReset}>
          Reset
        </button>
      )}
    </div>
  );
}

export default LocalMeetsOptionsBar;

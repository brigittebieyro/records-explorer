import { ageGroups } from '../../Data/ageGroups';
import { getAgeGroup, getWeightClassSet } from '../../Utils/Utils';

interface OptionsBarProps {
  selectedAgeGroup: string;
  selectedWeightClass: string;
  onAgeGroupChange: (value: string) => void;
  onWeightClassChange: (value: string) => void;
  onGo: () => void;
  onReset: () => void;
  showReset: boolean;
}

function OptionsBar({
  selectedAgeGroup,
  selectedWeightClass,
  onAgeGroupChange,
  onWeightClassChange,
  onGo,
  onReset,
  showReset,
}: OptionsBarProps) {
  return (
    <div className="record-viewer-options-bar">
      <span>Select a weight class & group: </span>
      <select
        aria-label="Age Group"
        className="header-button"
        name="age-group"
        id="age-group-select"
        onChange={(e) => {
          onAgeGroupChange(e.target.value);
        }}
      >
        {ageGroups.map((group, index) => (
          <option
            value={group.id}
            key={`ageGroup-selector-${index}-${group.id}`}
            disabled={group.disabled}
            selected={group.id === selectedAgeGroup}
          >
            {group.name}
          </option>
        ))}
      </select>

      <select
        aria-label="Weight Class"
        className="header-button"
        name="weight-class"
        id="weight-class-select"
        value={selectedWeightClass}
        onChange={(e) => {
          onWeightClassChange(e.target.value);
        }}
      >
        {!selectedWeightClass && <option value="">Select a Weight Class</option>}
        {getWeightClassSet(getAgeGroup(selectedAgeGroup)).map((wtClass, index) => (
          <option value={wtClass.id} key={`wtClass-selector-${index}-${wtClass.id}`}>
            {wtClass.name}
          </option>
        ))}
      </select>

      <button
        className="header-button"
        onClick={onGo}
        disabled={!selectedAgeGroup || !selectedWeightClass}
      >
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

export default OptionsBar;

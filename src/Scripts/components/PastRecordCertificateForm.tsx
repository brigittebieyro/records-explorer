import { useState } from 'react';
import { saveCertificate } from '../../RecordViewer/components/CertificateLink';
import {
  ageCategories,
  divisions,
  fetchPastRecordCertificate,
  lifts,
  PastRecordCertificateInput,
} from '../../RunnableScripts/pastRecordCertificate';

const emptyForm: PastRecordCertificateInput = {
  lifter: '',
  lift: '',
  weight: '',
  date: '',
  event: '',
  division: '',
  ageCategory: '',
  weightClass: '',
};

/**
 * Every field has to be filled before a certificate can be asked for. Only that they are filled:
 * what goes in them is the operator's business, and every one is printed as written.
 */
const isComplete = (form: PastRecordCertificateInput): boolean =>
  [
    form.lifter,
    form.lift,
    form.weight,
    form.date,
    form.event,
    form.division,
    form.ageCategory,
    form.weightClass,
  ].every((value) => value.trim() !== '');

/**
 * The inputs for a past recordholder's certificate.
 *
 * Nothing here is looked up: a past record has no row in the sheet, so the committee supplies
 * every printed detail. Rendered by the Scripts page when its script is selected.
 */
function PastRecordCertificateForm() {
  const [form, setForm] = useState<PastRecordCertificateInput>(emptyForm);
  const [isWorking, setIsWorking] = useState(false);
  const [status, setStatus] = useState<'idle' | 'done'>('idle');
  const [error, setError] = useState<string | undefined>();

  const update = <Field extends keyof PastRecordCertificateInput>(
    field: Field,
    value: PastRecordCertificateInput[Field]
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
    // Any edit invalidates the previous outcome -- leaving "Download complete." up while the
    // fields say something else reads as if the new details were the ones printed.
    setStatus('idle');
    setError(undefined);
  };

  const handleGenerate = async () => {
    if (isWorking || !isComplete(form)) return;
    setIsWorking(true);
    setStatus('idle');
    setError(undefined);
    try {
      saveCertificate(await fetchPastRecordCertificate(form));
      setStatus('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="script-form">
      <div className="script-form-item">
        <input
          id="certificate-lifter"
          type="text"
          className="header-button"
          placeholder="Athlete Name"
          value={form.lifter}
          disabled={isWorking}
          onChange={(eventObj) => update('lifter', eventObj.target.value)}
        />
      </div>

      <div className="script-form-item">
        <input
          id="certificate-date"
          type="text"
          className="header-button"
          value={form.date}
          disabled={isWorking}
          placeholder="Date, any format"
          onChange={(eventObj) => update('date', eventObj.target.value)}
        />
      </div>

      <div className="script-form-item">
        <input
          id="certificate-event"
          type="text"
          className="header-button"
          placeholder="Event Name"
          value={form.event}
          disabled={isWorking}
          onChange={(eventObj) => update('event', eventObj.target.value)}
        />
      </div>

      <div className="script-form-item">
        <select
          id="certificate-lift"
          className="header-button"
          value={form.lift}
          disabled={isWorking}
          onChange={(eventObj) => update('lift', eventObj.target.value)}
        >
          {!form.lift && <option value="">Record Name</option>}
          {lifts.map((lift) => (
            <option key={lift} value={lift}>
              {lift}
            </option>
          ))}
        </select>
      </div>

      <div className="script-form-item">
        <input
          id="certificate-weight"
          className="header-button"
          placeholder="##"
          value={form.weight}
          disabled={isWorking}
          onChange={(eventObj) => update('weight', eventObj.target.value)}
        />
      </div>

      <div className="script-form-item">
        <select
          id="certificate-division"
          className="header-button"
          value={form.division}
          disabled={isWorking}
          onChange={(eventObj) => update('division', eventObj.target.value)}
        >
          {!form.division && <option value="">Group Name</option>}
          {divisions.map((division) => (
            <option key={division} value={division}>
              {division}
            </option>
          ))}
        </select>
      </div>

      <div className="script-form-item">
        <select
          id="certificate-age-category"
          className="header-button"
          value={form.ageCategory}
          disabled={isWorking}
          onChange={(eventObj) => update('ageCategory', eventObj.target.value)}
        >
          {!form.ageCategory && <option value="">Age group</option>}
          {ageCategories.map((ageCategory) => (
            <option
              key={ageCategory.value}
              value={ageCategory.value}
              disabled={ageCategory.disabled}
            >
              {ageCategory.label}
            </option>
          ))}
        </select>
      </div>

      <div className="script-form-item">
        <input
          id="certificate-weight-class"
          type="text"
          className="header-button"
          placeholder="##+"
          value={form.weightClass}
          disabled={isWorking}
          onChange={(eventObj) => update('weightClass', eventObj.target.value)}
        />
      </div>

      <div className="script-form-item">
        <button
          className="header-button"
          onClick={handleGenerate}
          disabled={isWorking || !isComplete(form)}
        >
          {isWorking ? 'Rendering…' : 'Go'}
        </button>
      </div>

      {status === 'done' && <p>Download complete.</p>}

      {error && (
        <p>
          <strong>Error:</strong> {error}
        </p>
      )}
    </div>
  );
}

export default PastRecordCertificateForm;

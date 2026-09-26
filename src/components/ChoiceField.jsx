import { useEffect, useState } from 'react';
import { useLayout } from '../context/LayoutContext';

function useNativeSelect() {
  const screen = useLayout();
  const [finePointer, setFinePointer] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(pointer: fine)').matches;
  });

  useEffect(() => {
    const media = window.matchMedia('(pointer: fine)');
    const update = () => setFinePointer(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return screen === 'desktop' && finePointer;
}

export default function ChoiceField({ value, options, onChange, layout = 'grid' }) {
  const nativeSelect = useNativeSelect();
  const items = options.map((option) =>
    typeof option === 'string' ? { value: option, label: option } : option,
  );

  if (nativeSelect) {
    return (
      <select className="form-input" value={value} onChange={(event) => onChange(event.target.value)}>
        {items.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className={`choice-field choice-field--${layout}`} role="radiogroup">
      {items.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            className={`choice-field__option ${selected ? 'is-selected' : ''}`}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface ComboboxProps {
  value: string;
  onChange: (e: any) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  options: { id?: string; name?: string; truckNumber?: string; [key: string]: any }[];
  placeholder?: string;
  name?: string;
  className?: string;
  required?: boolean;
  valueKey?: string; // e.g., 'id' to emit ID instead of label
}

export default function Combobox({
  value,
  onChange,
  onBlur,
  options,
  placeholder = 'Select or enter...',
  name,
  className = '',
  required = false,
  valueKey
}: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const getOptionLabel = (opt: any) => {
    return opt.name || opt.truckNumber || opt.id || String(opt);
  };

  const findOptionByValue = (val: string) => {
    if (!valueKey || val == null || val === '') return undefined;
    return options.find((opt) => String(opt[valueKey]) === String(val));
  };

  // Resolve stored value (often an id) to a human-readable label
  useEffect(() => {
    if (!value) {
      setInputValue('');
      return;
    }
    if (valueKey) {
      const selectedOpt = findOptionByValue(value);
      if (selectedOpt) {
        setInputValue(getOptionLabel(selectedOpt));
        return;
      }
      // Options not loaded yet / id not in list — never flash raw UUID in the input
      const looksLikeId = /^[0-9a-f-]{8,}$/i.test(String(value));
      if (looksLikeId) {
        setInputValue('');
        return;
      }
    }
    setInputValue(value || '');
  }, [value, options, valueKey]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt) =>
    getOptionLabel(opt).toLowerCase().includes(inputValue.toLowerCase()),
  );

  const createSyntheticEvent = (val: string) => {
    return {
      target: { name, value: val },
    } as React.ChangeEvent<HTMLInputElement>;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setIsOpen(true);
    // When emitting ids via valueKey, only update local search text while typing —
    // do not overwrite the stored id with typed characters (causes UUID/name glitches).
    if (!valueKey) {
      onChange(e as any);
    }
  };

  const handleOptionClick = (opt: any) => {
    const label = getOptionLabel(opt);
    setInputValue(label);
    const emitVal = valueKey ? opt[valueKey] : label;
    onChange(createSyntheticEvent(String(emitVal ?? '')) as any);
    setIsOpen(false);
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Restore label from selected id if user typed a search query then left
    if (valueKey && value) {
      const selectedOpt = findOptionByValue(value);
      if (selectedOpt) {
        setInputValue(getOptionLabel(selectedOpt));
      }
    }
    if (onBlur) {
      setTimeout(() => {
        onBlur(e);
      }, 150);
    }
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          name={name}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          className={`w-full pr-8 ${className}`}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen) inputRef.current?.focus();
          }}
          className="absolute right-2 text-[var(--text-muted-alt)] hover:text-amber-500 transition-colors"
        >
          <ChevronDown size={16} />
        </button>
      </div>

      {isOpen && (
        <ul className="absolute z-50 w-full mt-1 max-h-60 overflow-auto bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg shadow-xl text-sm text-[var(--text-main)]">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, idx) => (
              <li
                key={opt.id || idx}
                onClick={() => handleOptionClick(opt)}
                className="px-3 py-2 cursor-pointer hover:bg-amber-500/10 hover:text-amber-500 transition-colors"
              >
                {getOptionLabel(opt)}
                {opt.transportCategory === 'COMPANY' && <span className="ml-2 text-xs text-blue-400">(Company)</span>}
                {opt.transportCategory === 'PARTY' && <span className="ml-2 text-xs text-amber-400">(Party)</span>}
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-[var(--text-muted-alt)] italic">
              {valueKey ? 'No matching suppliers' : `Press enter or click outside to add "${inputValue}"`}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';

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

  useEffect(() => {
    if (valueKey) {
      const selectedOpt = options.find(opt => opt[valueKey] === value);
      if (selectedOpt) {
        setInputValue(getOptionLabel(selectedOpt));
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

  const getOptionLabel = (opt: any) => {
    return opt.name || opt.truckNumber || opt.id || String(opt);
  };

  const filteredOptions = options.filter(opt => 
    getOptionLabel(opt).toLowerCase().includes(inputValue.toLowerCase())
  );

  const createSyntheticEvent = (val: string) => {
    return {
      target: { name, value: val }
    } as React.ChangeEvent<HTMLInputElement>;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    onChange(e as any); // Pass standard event
    setIsOpen(true);
  };

  const handleOptionClick = (opt: any) => {
    const label = getOptionLabel(opt);
    setInputValue(label);
    const emitVal = valueKey ? opt[valueKey] : label;
    onChange(createSyntheticEvent(emitVal) as any);
    setIsOpen(false);
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (onBlur) {
      // Small delay to allow click on option to register before blur fires
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
              Press enter or click outside to add "{inputValue}"
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

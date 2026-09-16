import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
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
  /** Tailwind max-height for the options list (default max-h-40 for compact scrollable drawer) */
  listMaxHeightClass?: string;
  /**
   * When true: no typing — open list and pick an option only.
   * Free-text is never committed (matches Paddy Inward dropdown rules).
   */
  selectOnly?: boolean;
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
  valueKey,
  listMaxHeightClass = 'max-h-40',
  selectOnly = false,
}: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  const getOptionLabel = (opt: any) => {
    return opt.name || opt.truckNumber || opt.id || String(opt);
  };

  const findOptionByValue = (val: string) => {
    if (!valueKey || val == null || val === '') return undefined;
    return options.find((opt) => String(opt[valueKey]) === String(val));
  };

  const updateMenuPosition = () => {
    const el = inputRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const spaceBelow = viewportH - rect.bottom;
    const preferUp = spaceBelow < 160 && rect.top > spaceBelow;
    const maxH = Math.min(160, preferUp ? rect.top - 8 : spaceBelow - 8);

    setMenuStyle({
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
      maxHeight: Math.max(80, maxH),
      ...(preferUp
        ? { bottom: viewportH - rect.top + 4, top: 'auto' as any }
        : { top: rect.bottom + 4, bottom: 'auto' as any }),
    });
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
    if (selectOnly) {
      const byLabel = options.find(
        (opt) => getOptionLabel(opt).toLowerCase() === String(value).toLowerCase(),
      );
      setInputValue(byLabel ? getOptionLabel(byLabel) : String(value));
      return;
    }
    setInputValue(value || '');
  }, [value, options, valueKey, selectOnly]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    updateMenuPosition();
    const onReposition = () => updateMenuPosition();
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [isOpen, options, selectOnly, inputValue]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const t = event.target as Node;
      if (
        wrapperRef.current?.contains(t) ||
        menuRef.current?.contains(t)
      ) {
        return;
      }
      setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOpt = valueKey && value ? findOptionByValue(value) : undefined;
  const selectedLabel = selectedOpt ? getOptionLabel(selectedOpt) : '';
  const inputNorm = inputValue.trim().toLowerCase();

  // When a valueKey selection is showing its label (or a sentinel like "All"),
  // don't treat that text as a search filter — otherwise the open list only
  // shows the currently selected item (e.g. ACCOUNTANT).
  const isShowingSelectedLabel =
    !!valueKey &&
    !!inputNorm &&
    ((!!selectedLabel && inputNorm === selectedLabel.trim().toLowerCase()) ||
      (!selectedOpt &&
        !!value &&
        inputNorm === String(value).trim().toLowerCase()));

  const filteredOptions =
    selectOnly || isShowingSelectedLabel || !inputNorm
      ? options
      : options.filter((opt) =>
          getOptionLabel(opt).toLowerCase().includes(inputNorm),
        );

  const createSyntheticEvent = (val: string) => {
    return {
      target: { name, value: val },
    } as React.ChangeEvent<HTMLInputElement>;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (selectOnly) {
      // Ignore typed characters entirely — selection only via list
      setIsOpen(true);
      return;
    }
    let next = e.target.value;
    // valueKey searchable select: if still showing the selected label, start a fresh search
    // (don't append onto "ACCOUNTANT" when user types "S")
    if (valueKey && value) {
      const selected = findOptionByValue(value);
      const label = selected ? getOptionLabel(selected) : '';
      if (label && inputValue.trim().toLowerCase() === label.trim().toLowerCase()) {
        const prev = inputValue;
        // Browser may send full new value (prev + char) or replacement — prefer last typed char(s)
        if (next.length === prev.length + 1 && next.startsWith(prev)) {
          next = next.slice(prev.length);
        } else if (next.length > prev.length && next.startsWith(prev)) {
          next = next.slice(prev.length);
        }
      }
    }
    setInputValue(next);
    setIsOpen(true);
    // valueKey: typing is filter-only — do not commit free text
    if (valueKey) {
      return;
    }
    onChange(e as any);
  };

  const handleOptionClick = (opt: any) => {
    const label = getOptionLabel(opt);
    setInputValue(label);
    const emitVal = valueKey ? opt[valueKey] : label;
    onChange(createSyntheticEvent(String(emitVal ?? '')) as any);
    setIsOpen(false);
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Restore label from selected value; discard typed filter text
    if (valueKey && value) {
      const selectedOpt = findOptionByValue(value);
      if (selectedOpt) {
        setInputValue(getOptionLabel(selectedOpt));
      }
    } else if (selectOnly) {
      if (value) {
        const byLabel = options.find(
          (opt) => getOptionLabel(opt).toLowerCase() === String(value).toLowerCase(),
        );
        setInputValue(byLabel ? getOptionLabel(byLabel) : String(value));
      } else {
        setInputValue('');
      }
    }
    if (onBlur && !selectOnly) {
      setTimeout(() => {
        onBlur(e);
      }, 150);
    }
  };

  const menu = isOpen
    ? createPortal(
        <ul
          ref={menuRef}
          style={menuStyle}
          className={`overflow-y-auto overscroll-contain bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg shadow-2xl text-sm text-[var(--text-main)] ${listMaxHeightClass}`}
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, idx) => (
              <li
                key={opt.id || idx}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleOptionClick(opt)}
                className="px-3 py-1.5 cursor-pointer hover:bg-amber-500/10 hover:text-amber-500 transition-colors"
              >
                {getOptionLabel(opt)}
                {opt.transportCategory === 'COMPANY' && (
                  <span className="ml-2 text-xs text-blue-400">(Company)</span>
                )}
                {opt.transportCategory === 'PARTY' && (
                  <span className="ml-2 text-xs text-amber-400">(Party)</span>
                )}
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-[var(--text-muted-alt)] italic">
              {selectOnly || valueKey
                ? 'No matching options — select from the list'
                : `Press enter or click outside to add "${inputValue}"`}
            </li>
          )}
        </ul>,
        document.body,
      )
    : null;

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
          onClick={() => setIsOpen(true)}
          onBlur={handleInputBlur}
          placeholder={
            selectOnly
              ? placeholder === 'Select or enter...'
                ? 'Select from list...'
                : placeholder
              : placeholder
          }
          required={required}
          autoComplete="off"
          readOnly={selectOnly}
          className={`w-full pr-8 ${selectOnly ? 'cursor-pointer' : ''} ${className}`}
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
      {menu}
    </div>
  );
}

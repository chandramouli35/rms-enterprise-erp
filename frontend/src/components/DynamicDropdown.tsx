import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios';

interface Option {
  id: string;
  name: string;
  [key: string]: any;
}

interface DynamicDropdownProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  onOptionSelect?: (option: Option | null) => void;
  apiEndpoint?: string; // e.g. '/api/master-data/drivers'
  placeholder?: string;
  className?: string;
  masterKey?: string; // e.g. 'name' or 'truckNo' etc to know what to post
}

export default function DynamicDropdown({
  options,
  value,
  onChange,
  onOptionSelect,
  apiEndpoint,
  placeholder = 'Select or type...',
  className = '',
  masterKey = 'name',
  ...props
}: DynamicDropdownProps) {
  const [localValue, setLocalValue] = useState(value || '');
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalValue(val);
    onChange(val);
    
    // Check if it matches an existing option
    if (onOptionSelect) {
      const match = options.find(o => o.id === val || o.name === val || o.name.toLowerCase() === val.toLowerCase());
      onOptionSelect(match || null);
    }
  };

  const handleBlur = async () => {
    // Delay hiding dropdown so clicks register
    setTimeout(async () => {
      setIsFocused(false);
      
      // Auto-save logic
      if (localValue && apiEndpoint && !options.find(o => o.name.toLowerCase() === localValue.toLowerCase() || o.id === localValue)) {
        try {
          const payload = { [masterKey]: localValue };
          // If it's a driver, they might have a mobileNumber field which we can leave empty
          const res = await api.post(apiEndpoint, payload);
          // We can optionally trigger a refresh of the options list from the parent
          // For now, it's saved in the DB, and the next time the component mounts or list fetches, it will be there.
          console.log(`Auto-saved new entry to ${apiEndpoint}:`, res.data);
        } catch (err) {
          console.error(`Failed to auto-save to ${apiEndpoint}:`, err);
        }
      }
    }, 200);
  };

  // Generate a unique ID for the datalist
  const listId = `datalist-${apiEndpoint?.replace(/\//g, '-')}-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="relative w-full" ref={containerRef}>
      <input
        type="text"
        list={listId}
        value={localValue}
        onChange={handleInputChange}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
        {...props}
      />
      <datalist id={listId}>
        {options.map((opt, idx) => (
          <option key={opt.id || idx} value={opt.name || opt.id} />
        ))}
      </datalist>
    </div>
  );
}

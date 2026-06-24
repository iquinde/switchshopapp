import React from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';

export interface SearchableSelectOption {
  value: string;
  label: string;
  description?: string;
  searchText?: string;
}

interface SearchableSelectProps {
  value: string;
  options: SearchableSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
}

export default function SearchableSelect({
  value,
  options,
  onChange,
  placeholder = 'Selecciona una opcion',
  searchPlaceholder = 'Escribe para buscar...',
  emptyMessage = 'No hay opciones que coincidan.',
  className = '',
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const selectedOption = React.useMemo(() => {
    return options.find(option => option.value === value) || null;
  }, [options, value]);

  const filteredOptions = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return options;

    return options.filter(option => {
      const searchable = `${option.label} ${option.description || ''} ${option.searchText || ''}`.toLowerCase();
      return searchable.includes(term);
    });
  }, [options, searchTerm]);

  const closePicker = React.useCallback(() => {
    setIsOpen(false);
    setSearchTerm('');
  }, []);

  React.useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        closePicker();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [closePicker]);

  const selectOption = (nextValue: string) => {
    onChange(nextValue);
    closePicker();
  };

  const inputValue = isOpen ? searchTerm : (selectedOption?.label || '');

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="flex w-full items-center gap-2 rounded-xl border border-stone-100 bg-stone-50 px-3 py-2 text-xs font-bold text-stone-700 transition-all focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/20">
        <Search size={14} className="shrink-0 text-stone-400" />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onFocus={() => {
            setIsOpen(true);
            setSearchTerm('');
          }}
          onChange={event => {
            setIsOpen(true);
            setSearchTerm(event.target.value);
          }}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.preventDefault();
              const firstOption = filteredOptions[0];
              if (firstOption) selectOption(firstOption.value);
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              closePicker();
              inputRef.current?.blur();
            }
          }}
          placeholder={isOpen ? searchPlaceholder : placeholder}
          className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-stone-400"
          role="combobox"
          aria-expanded={isOpen}
        />
        {isOpen && searchTerm ? (
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              inputRef.current?.focus();
            }}
            className="rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
            title="Limpiar busqueda"
          >
            <X size={13} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setIsOpen(current => !current);
              window.setTimeout(() => inputRef.current?.focus(), 0);
            }}
            className="rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
            title="Ver opciones"
          >
            <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 z-[140] mt-1 overflow-hidden rounded-xl border border-stone-100 bg-white shadow-xl">
          <div className="max-h-60 overflow-y-auto py-1">
            {filteredOptions.map(option => (
              <button
                key={option.value}
                type="button"
                onMouseDown={event => event.preventDefault()}
                onClick={() => selectOption(option.value)}
                className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-stone-50"
              >
                <Check size={14} className={`mt-0.5 shrink-0 ${option.value === value ? 'text-primary' : 'text-transparent'}`} />
                <span className="min-w-0">
                  <span className="block truncate text-xs font-bold text-stone-800">{option.label}</span>
                  {option.description && (
                    <span className="block truncate text-[10px] font-medium text-stone-400">{option.description}</span>
                  )}
                </span>
              </button>
            ))}

            {filteredOptions.length === 0 && (
              <div className="px-3 py-3 text-center text-xs font-semibold text-stone-400">
                {emptyMessage}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
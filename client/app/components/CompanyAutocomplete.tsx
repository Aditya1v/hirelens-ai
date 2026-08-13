import { useEffect, useRef, useState } from "react";
import { suggestCompanies, type CompanySuggestion } from "~/lib/jobsApi";
import { useDebouncedValue } from "~/lib/useDebouncedValue";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

const CompanyAutocomplete = ({ value, onChange }: Props) => {
  const [suggestions, setSuggestions] = useState<CompanySuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedValue = useDebouncedValue(value, 300);

  useEffect(() => {
    let cancelled = false;
    suggestCompanies(debouncedValue)
      .then((results) => {
        if (!cancelled) {
          setSuggestions(results);
          setIsOpen(results.length > 0);
        }
      })
      .catch(() => {
        if (!cancelled) setSuggestions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedValue]);

  // Close the dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectSuggestion = (s: CompanySuggestion) => {
    onChange(s.name);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <input
        id="company-name"
        type="text"
        name="company-name"
        autoComplete="off"
        placeholder="Company Name"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setIsOpen(true)}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-expanded={isOpen}
        aria-controls="company-suggestions"
        aria-autocomplete="list"
      />
      {isOpen && (
        <ul
          id="company-suggestions"
          role="listbox"
          className="absolute z-20 mt-2 w-full max-h-64 overflow-auto glass-panel !p-2 flex flex-col gap-1"
        >
          {suggestions.map((s, i) => (
            <li key={s.name} role="option" aria-selected={i === activeIndex}>
              <button
                type="button"
                onClick={() => selectSuggestion(s)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors ${
                  i === activeIndex ? "bg-emerald/15 text-emerald" : "text-white/80 hover:bg-white/[0.06]"
                }`}
              >
                {s.name}
                {s.domain && <span className="text-white/40 ml-2 text-xs">{s.domain}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CompanyAutocomplete;

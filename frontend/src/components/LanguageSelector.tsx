import { useState, useEffect, useRef, useMemo } from "react";

interface LanguageSelectorProps {
    languages: Language[];
    value: string;
    onChange: (code: string, lang: Language) => void;
    placeholder?: string;
    searchable?: boolean;
    compact?: boolean;
}

interface Language {
    code: string;
    name: string;
    nativeName: string;
    flag: string;
}

export function LanguageSelector({ languages = defaultLanguages, value, onChange, placeholder = "Select language", searchable = true, compact = false }: LanguageSelectorProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);
  
    useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setOpen(false);
        }
      }
  
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, []);
  
    const selectedLanguage = languages.find((lang) => lang.code === value);
  
    const filteredLanguages = useMemo(() => {
      if (!query.trim()) return languages;
  
      const lower = query.toLowerCase();
  
      return languages.filter(
        (lang) =>
          lang.name.toLowerCase().includes(lower) ||
          lang.nativeName.toLowerCase().includes(lower) ||
          lang.code.toLowerCase().includes(lower)
      );
    }, [languages, query]);
  
    return (
      <div
        ref={containerRef}
        className={`relative w-full ${compact ? "max-w-[220px]" : "max-w-sm"}`}
      >
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex w-full items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-300"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="text-xl">
              {selectedLanguage?.flag || "🌐"}
            </span>
  
            <div className="min-w-0">
              {selectedLanguage ? (
                <>
                  <div className="truncate text-sm font-medium text-zinc-900">
                    {selectedLanguage.name}
                  </div>
                  <div className="truncate text-xs text-zinc-500">
                    {selectedLanguage.nativeName}
                  </div>
                </>
              ) : (
                <span className="text-sm text-zinc-500">
                  {placeholder}
                </span>
              )}
            </div>
          </div>
  
          <svg
            className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${
              open ? "rotate-180" : ""
            }`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>
  
        {open && (
          <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">
            {searchable && (
              <div className="border-b border-zinc-200 p-3">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search language..."
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-400"
                />
              </div>
            )}
  
            <div className="max-h-72 overflow-y-auto py-2">
              {filteredLanguages.length > 0 ? (
                filteredLanguages.map((lang) => {
                  const active = lang.code === value;
  
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => {
                        onChange?.(lang.code, lang);
                        setOpen(false);
                      }}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-zinc-50 ${
                        active ? "bg-zinc-50" : "bg-white"
                      }`}
                    >
                      <span className="text-xl">{lang.flag}</span>
  
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-zinc-900">
                          {lang.name}
                        </div>
                        <div className="truncate text-xs text-zinc-500">
                          {lang.nativeName}
                        </div>
                      </div>

                      <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs uppercase text-zinc-600">
                        {lang.code}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="px-4 py-6 text-center text-sm text-zinc-500">
                  No languages found.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
  
  export const defaultLanguages: Language[] = [
    {
      code: "en",
      name: "English",
      nativeName: "English",
      flag: "🇺🇸",
    },
    {
      code: "fr",
      name: "French",
      nativeName: "Français",
      flag: "🇫🇷",
    },
    {
      code: "es",
      name: "Spanish",
      nativeName: "Español",
      flag: "🇪🇸",
    },
    {
      code: "de",
      name: "German",
      nativeName: "Deutsch",
      flag: "🇩🇪",
    },
    {
      code: "it",
      name: "Italian",
      nativeName: "Italiano",
      flag: "🇮🇹",
    },
    {
      code: "pt",
      name: "Portuguese",
      nativeName: "Português",
      flag: "🇵🇹",
    },
    {
      code: "ja",
      name: "Japanese",
      nativeName: "日本語",
      flag: "🇯🇵",
    },
    {
      code: "ko",
      name: "Korean",
      nativeName: "한국어",
      flag: "🇰🇷",
    },
    {
      code: "zh",
      name: "Chinese",
      nativeName: "中文",
      flag: "🇨🇳",
    },
    {
      code: "ar",
      name: "Arabic",
      nativeName: "العربية",
      flag: "🇸🇦",
    },
    {
      code: "hi",
      name: "Hindi",
      nativeName: "हिन्दी",
      flag: "🇮🇳",
    },
  ];
  
  /*
  Example usage:
  
  function App() {
    const [language, setLanguage] = React.useState("en");
  
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-8 dark:bg-zinc-950">
        <LanguageSelector
          value={language}
          onChange={(code, lang) => {
            console.log(code, lang);
            setLanguage(code);
          }}
        />
      </div>
    );
  }
  */
  
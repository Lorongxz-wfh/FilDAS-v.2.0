import React, { useState, useEffect } from "react";
import type { Office } from "../services/documents";
import { listOffices } from "../services/documents";

interface OfficeDropdownProps {
  value: number | null;
  onChange: (officeId: number) => void;
  error?: string;

  // Optional: prevent picking offices that are already selected elsewhere
  excludeOfficeIds?: number[];
}

const OfficeDropdown: React.FC<OfficeDropdownProps> = ({
  value,
  onChange,
  error,
  excludeOfficeIds = [],
}) => {
  const [offices, setOffices] = useState<Office[]>([]);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await listOffices();
        setOffices(data.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (err) {
        console.error("Failed to load offices", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = offices.filter((office) => {
    const q = search.toLowerCase();
    return (
      office.name.toLowerCase().includes(q) ||
      office.code.toLowerCase().includes(q)
    );
  });

  const selected = offices.find((o) => o.id === value);

  return (
    <div className="relative">
      <label className="block text-xs font-medium text-slate-700 mb-1.5">
        Office / Department <span className="text-rose-500">*</span>
      </label>

      <div className="relative">
        <input
          type="text"
          placeholder="Search office..."
          value={isOpen ? search : selected?.name || ""}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className={`block w-full rounded-md border px-3 py-2 text-sm text-slate-900 shadow-xs outline-none transition ${
            error
              ? "border-rose-300 focus:border-rose-500 focus:ring-rose-200"
              : "border-slate-300 focus:border-sky-500 focus:ring-sky-200"
          } focus:ring-2`}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg
            className={`h-4 w-4 text-slate-400 transition ${
              isOpen ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg">
          <ul className="max-h-48 overflow-y-auto">
            {loading ? (
              <li className="px-3 py-2 text-xs text-slate-500">Loading...</li>
            ) : filtered.length === 0 ? (
              <li className="px-3 py-2 text-xs text-slate-500">
                No offices found
              </li>
            ) : (
              filtered.map((office) => {
                const isExcluded =
                  excludeOfficeIds.includes(office.id) && office.id !== value;

                return (
                  <li key={office.id}>
                    <button
                      type="button"
                      disabled={isExcluded}
                      aria-disabled={isExcluded}
                      className={`w-full text-left px-3 py-2 text-sm transition ${
                        value === office.id
                          ? "bg-sky-50 text-sky-700 font-medium"
                          : isExcluded
                            ? "text-slate-400 cursor-not-allowed"
                            : "text-slate-700 hover:bg-slate-50"
                      }`}
                      onClick={() => {
                        if (isExcluded) return;
                        onChange(office.id);
                        setIsOpen(false);
                        setSearch("");
                      }}
                    >
                      <span className="font-medium">{office.name}</span>
                      <span className="text-xs text-slate-500 ml-2">
                        ({office.code})
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}

      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
};

export default OfficeDropdown;

import React, { useEffect, useMemo, useState } from "react";
import { getAdminOffices, type AdminOffice } from "../../services/admin";

type Props = {
  value: number | null;
  onChange: (officeId: number | null) => void;
  error?: string;
  label?: string;
  required?: boolean;
  excludeOfficeIds?: number[];
  disabled?: boolean;
  autoLoad?: boolean;
};

const AdminOfficeDropdown: React.FC<Props> = ({
  value,
  onChange,
  error,
  label = "Office / Department",
  required = false,
  excludeOfficeIds = [],
  disabled = false,
  autoLoad = true,
}) => {
  const [offices, setOffices] = useState<AdminOffice[]>([]);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    if (!autoLoad || disabled) {
      setLoading(false);
      return () => {
        alive = false;
      };
    }

    const load = async () => {
      try {
        const data = await getAdminOffices();
        if (!alive) return;
        setOffices(data);
      } catch (e) {
        console.error("Failed to load admin offices", e);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, [autoLoad, disabled]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return offices;

    return offices.filter((o) => {
      return (
        o.name.toLowerCase().includes(q) || o.code.toLowerCase().includes(q)
      );
    });
  }, [offices, search]);

  const selected = useMemo(
    () => offices.find((o) => o.id === value) ?? null,
    [offices, value],
  );

  return (
    <div className="relative">
      <label className="block text-xs font-medium text-slate-700 mb-1.5">
        {label} {required ? <span className="text-rose-500">*</span> : null}
      </label>

      <div className="relative">
        <input
          type="text"
          placeholder={disabled ? "Disabled" : "Search office..."}
          value={isOpen ? search : selected?.name || ""}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => {
            if (disabled) return;
            setIsOpen(true);
          }}
          onBlur={() => {
            window.setTimeout(() => setIsOpen(false), 120);
          }}
          disabled={disabled}
          className={`block w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none transition ${
            disabled ? "bg-slate-50 text-slate-500" : "bg-white text-slate-900"
          } ${
            error
              ? "border-rose-300 focus:border-rose-500 focus:ring-rose-200"
              : "border-slate-300 focus:border-sky-500 focus:ring-sky-200"
          } focus:ring-2`}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg
            className={`h-4 w-4 text-slate-400 transition ${isOpen ? "rotate-180" : ""}`}
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

      {isOpen && !disabled && (
        <div className="absolute z-10 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg">
          <ul className="max-h-56 overflow-y-auto">
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
                      onMouseDown={(e) => e.preventDefault()}
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

            {!loading && (
              <li className="border-t border-slate-100">
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-xs text-slate-600 hover:bg-slate-50"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(null);
                    setIsOpen(false);
                    setSearch("");
                  }}
                >
                  Clear selection
                </button>
              </li>
            )}
          </ul>
        </div>
      )}

      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
};

export default AdminOfficeDropdown;

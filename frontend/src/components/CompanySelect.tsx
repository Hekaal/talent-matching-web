import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Company } from "../types";

interface CompanySelectProps {
  companies: Company[];
  value: string | null;
  onChange: (company: string) => void;
  disabled?: boolean;
}

const MAX_RENDER = 200; // batas item yang dirender agar DOM tetap ringan

/**
 * Dropdown pilih perusahaan. Daftar sangat panjang (±1.400) sehingga dropdown
 * menyediakan penyaring nama di dalamnya — bukan pencarian bebas ke seluruh job.
 * Mendukung navigasi keyboard (↑ ↓ Enter Esc) dan auto-scroll ke pilihan aktif.
 */
export default function CompanySelect({
  companies,
  value,
  onChange,
  disabled = false,
}: CompanySelectProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  // Panel menyesuaikan ruang layar: tidak pernah melewati batas viewport
  const [panel, setPanel] = useState({ maxHeight: 420, dropUp: false });

  const boxRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return q ? companies.filter((c) => c.company.toLowerCase().includes(q)) : companies;
  }, [companies, filter]);

  const visible = filtered.slice(0, MAX_RENDER);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Buka dropdown: fokus ke penyaring, sorot item yang sedang dipilih
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const idx = value ? visible.findIndex((c) => c.company === value) : -1;
    setActiveIndex(idx >= 0 ? idx : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Filter berubah → mulai lagi dari item pertama
  useEffect(() => {
    setActiveIndex(0);
  }, [filter]);

  // Ukur ruang di bawah/atas trigger supaya panel tidak terpotong layar
  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      const margin = 16;
      const below = window.innerHeight - r.bottom - margin;
      const above = r.top - margin;
      const dropUp = below < 260 && above > below;
      const space = dropUp ? above : below;
      setPanel({ maxHeight: Math.max(200, Math.min(space, 520)), dropUp });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  // Jaga item aktif tetap terlihat saat navigasi keyboard / saat dibuka
  useLayoutEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  const commit = (company: string) => {
    onChange(company);
    setOpen(false);
    setFilter("");
    triggerRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, visible.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(visible.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = visible[activeIndex];
      if (item) commit(item.company);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }
  };

  return (
    <div ref={boxRef} className="relative w-full max-w-xl">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-md
                   bg-white text-left ring-1 ring-white/20 focus:outline-none
                   focus:ring-2 focus:ring-teal-700 disabled:opacity-50"
      >
        <span className={value ? "text-navy font-medium truncate" : "text-muted"}>
          {value ?? "Pilih perusahaan…"}
        </span>
        <svg
          className={`w-4 h-4 text-muted shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden
        >
          <path d="m4 6 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          className={`absolute z-30 w-full bg-white rounded-md border border-line
                     shadow-raise overflow-hidden flex flex-col ${
                       panel.dropUp ? "bottom-full mb-1.5" : "top-full mt-1.5"
                     }`}
          style={{ maxHeight: panel.maxHeight }}
          onKeyDown={onKeyDown}
        >
          <div className="p-2 border-b border-line shrink-0">
            <input
              ref={inputRef}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Ketik nama perusahaan…"
              className="field !py-2 text-sm"
              aria-label="Saring daftar perusahaan"
              aria-controls="company-listbox"
            />
          </div>

          <ul
            id="company-listbox"
            ref={listRef}
            role="listbox"
            aria-label="Daftar perusahaan"
            className="overflow-y-auto flex-1 min-h-0 py-1"
          >
            {visible.map((c, i) => {
              const isSelected = c.company === value;
              const isActive = i === activeIndex;
              return (
                <li key={c.company} data-idx={i} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    tabIndex={-1}
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => commit(c.company)}
                    className={`w-full flex items-baseline justify-between gap-3 px-4 py-2
                                text-left transition-colors ${
                                  isActive ? "bg-ice" : ""
                                } ${isSelected ? "border-l-2 border-teal-700" : "border-l-2 border-transparent"}`}
                  >
                    <span
                      className={`text-sm truncate ${
                        isSelected ? "text-teal-ink font-semibold" : "text-navy"
                      }`}
                    >
                      {c.company}
                    </span>
                    <span className="num text-xs text-muted shrink-0">
                      {c.n_jobs} job
                    </span>
                  </button>
                </li>
              );
            })}
            {visible.length === 0 && (
              <li className="px-4 py-6 text-sm text-muted text-center">
                Tidak ada perusahaan yang cocok dengan "{filter.trim()}".
              </li>
            )}
          </ul>

          <p className="px-4 py-2 border-t border-line text-xs text-muted shrink-0 flex justify-between gap-3">
            <span className="num">
              {filtered.length.toLocaleString("id-ID")} hasil
              {filtered.length > MAX_RENDER && ` · ${MAX_RENDER} ditampilkan`}
            </span>
            <span className="hidden sm:inline">↑↓ navigasi · Enter pilih · Esc tutup</span>
          </p>
        </div>
      )}
    </div>
  );
}

import { Fragment } from "react";
import { Link } from "react-router-dom";

export interface Crumb {
  label: string;
  to?: string; // tanpa `to` = halaman saat ini
}

/** Jejak navigasi konsisten di seluruh halaman. */
export default function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-xs text-muted">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((item, i) => (
          <Fragment key={`${item.label}-${i}`}>
            {i > 0 && (
              <li aria-hidden className="text-line-strong select-none">
                /
              </li>
            )}
            <li className="min-w-0">
              {item.to ? (
                <Link
                  to={item.to}
                  className="inline-block py-1 -my-1 hover:text-teal-ink transition-colors underline-offset-2 hover:underline"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-navy font-medium truncate" aria-current="page">
                  {item.label}
                </span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}

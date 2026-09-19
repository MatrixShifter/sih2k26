import { Link } from "react-router-dom";

export function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-sm text-slate-500">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, i) => (
          <li key={item.label} className="flex items-center gap-1">
            {i > 0 ? <span aria-hidden>/</span> : null}
            {item.to ? (
              <Link className="hover:text-navy hover:underline" to={item.to}>
                {item.label}
              </Link>
            ) : (
              <span className="text-navy" aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

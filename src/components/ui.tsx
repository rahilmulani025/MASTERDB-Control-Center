import type { ReactNode } from 'react';

export function PageHeader({
  title,
  description,
  action,
  eyebrow = 'CONTROL CENTER',
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <header className="page-header">
      <div className="page-header-text">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="description">{description}</p>}
      </div>
      {action && <div className="page-header-action">{action}</div>}
    </header>
  );
}

export function SectionHeader({
  title,
  detail,
  eyebrow,
  number,
  action,
}: {
  title: string;
  detail?: string;
  eyebrow?: string;
  number?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-header-box">
      <div className="section-header-left">
        {eyebrow && <span className="eyebrow" style={{ fontSize: '10px', marginBottom: '2px' }}>{eyebrow}</span>}
        <div className="section-title-row">
          {number && <span className="section-number">{number}</span>}
          <h2 className="section-title-text">{title}</h2>
        </div>
        {detail && <p className="section-detail-desc">{detail}</p>}
      </div>
      {action && <div className="section-header-action">{action}</div>}
    </div>
  );
}

export function StatusBadge({
  children,
  kind = 'neutral',
}: {
  children: ReactNode;
  kind?: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
}) {
  return (
    <span className={`badge ${kind}`}>
      <span className="badge-dot" />
      <span>{children}</span>
    </span>
  );
}

export function EmptyState({
  title = 'No data available',
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <section className="empty-state">
      <div className="empty-mark">—</div>
      <h2>{title}</h2>
      <p>{children}</p>
    </section>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Filter loaded packages…',
  disabled = false,
}: {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <label className="search">
      <span className="sr-only">{placeholder}</span>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
    </label>
  );
}

export function DataTable({
  columns,
  rows,
  empty,
}: {
  columns: string[];
  rows?: Array<Record<string, unknown>>;
  empty: string;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows && rows.length > 0 ? (
            rows.map((row, i) => (
              <tr key={i}>
                {columns.map((col) => {
                  const val = String(row[col] ?? '');
                  const isTechnical =
                    col.includes('ID') ||
                    col.includes('Hash') ||
                    col.includes('Version') ||
                    col.includes('Ref') ||
                    col.includes('Path');
                  return (
                    <td key={col} className={isTechnical && val !== '-' ? 'code-val' : undefined}>
                      {val}
                    </td>
                  );
                })}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="table-empty">
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function LoadingState({ message = 'Loading MASTERDB data…' }: { message?: string }) {
  return <div className="notice info">{message}</div>;
}

export function ErrorState({ message = 'Unable to load MASTERDB data.' }: { message?: string }) {
  return <div className="notice error">{message}</div>;
}

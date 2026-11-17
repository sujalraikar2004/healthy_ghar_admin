import { useMemo, useState } from 'react';
import { usePharmacyStore } from '../../store/usePharmacyStore';
import { useToastStore } from '../../store/useToastStore';
import { ActivityLog } from '../../types';
import { downloadCsv, downloadJson, formatIndianDateTime } from '../../utils/formatters';

export function ActivityLogsPage() {
  const pushToast = useToastStore((s) => s.pushToast);

  const activityLogs = usePharmacyStore((s) => s.activityLogs);
  const can = usePharmacyStore((s) => s.can);

  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [resultFilter, setResultFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [inspectLog, setInspectLog] = useState<ActivityLog | null>(null);
  const pageSize = 25;

  const modules = useMemo(
    () => ['ALL', ...Array.from(new Set(activityLogs.map((l) => l.module)))],
    [activityLogs]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activityLogs.filter((l) => {
      if (moduleFilter !== 'ALL' && l.module !== moduleFilter) return false;
      if (resultFilter !== 'ALL' && l.result !== resultFilter) return false;
      if (q && !`${l.action} ${l.actorName} ${l.recordId} ${l.module}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [activityLogs, moduleFilter, resultFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedLogs = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="p-space-lg lg:p-space-xl space-y-space-lg">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <span className="font-label-sm text-primary uppercase tracking-wider">Immutable Forensic Audit Trail</span>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Security Events & Activity Logs</h1>
          <p className="font-body-md text-on-surface-variant">
            Every clinical sign-off, stock adjustment, RBAC override, and financial refund is logged chronologically
          </p>
        </div>
        {can('activity_logs', 'export') && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                downloadCsv(
                  'healthy-ghar-audit-logs.csv',
                  ['Timestamp', 'Actor', 'Role', 'Module', 'Action', 'Record ID', 'Result'],
                  filtered.map((l) => [l.timestamp, l.actorName, l.actorRole, l.module, l.action, l.recordId, l.result])
                );
                pushToast({ type: 'success', title: 'Audit CSV Exported' });
              }}
              className="px-3.5 py-2 rounded-lg bg-surface-container-lowest shadow-sm font-title-md text-body-sm"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => {
                downloadJson('healthy-ghar-audit-logs.json', filtered);
                pushToast({ type: 'success', title: 'Audit JSON Exported' });
              }}
              className="px-3.5 py-2 rounded-lg bg-primary-container text-on-primary font-title-md text-body-sm"
            >
              Export JSON
            </button>
          </div>
        )}
      </div>

      <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm flex flex-col md:flex-row gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search actor, action, or record ID..."
          className="flex-1 h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant/60 text-body-sm"
        />
        <select
          value={moduleFilter}
          onChange={(e) => {
            setModuleFilter(e.target.value);
            setPage(1);
          }}
          className="h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant/60 text-body-sm"
        >
          {modules.map((m) => (
            <option key={m} value={m}>{m === 'ALL' ? 'All Modules' : m}</option>
          ))}
        </select>
        <select
          value={resultFilter}
          onChange={(e) => {
            setResultFilter(e.target.value);
            setPage(1);
          }}
          className="h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant/60 text-body-sm"
        >
          <option value="ALL">All Results</option>
          <option value="Success">Success</option>
          <option value="Warning">Warning</option>
          <option value="Blocked">Blocked</option>
        </select>
      </div>

      <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low font-label-sm text-on-surface-variant uppercase">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor & Role</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Module</th>
                <th className="py-3 px-4">Record ID</th>
                <th className="py-3 px-4">Result</th>
                <th className="py-3 px-4 text-right">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30 font-body-sm">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-on-surface-variant font-body-md">
                    No audit trail entries match the active filters.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-container-low/60">
                    <td className="py-2.5 px-4 text-[12px] text-on-surface-variant whitespace-nowrap">
                      {formatIndianDateTime(log.timestamp)}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-title-md text-on-surface">{log.actorName}</div>
                      <div className="text-[11px] text-on-surface-variant">{log.actorRole}</div>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-xs text-primary">{log.action}</td>
                    <td className="py-2.5 px-4">{log.module}</td>
                    <td className="py-2.5 px-4 font-mono text-xs">{log.recordId}</td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded font-label-sm ${
                          log.result === 'Success'
                            ? 'bg-primary-fixed text-on-primary-fixed'
                            : log.result === 'Blocked'
                            ? 'bg-error-container text-on-error-container'
                            : 'bg-tertiary-fixed text-on-tertiary-fixed'
                        }`}
                      >
                        {log.result}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setInspectLog(log)}
                        className="px-2.5 py-1 rounded bg-surface-container font-label-sm hover:bg-surface-container-high whitespace-nowrap"
                      >
                        Inspect JSON
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-outline-variant/30 flex flex-wrap items-center justify-between gap-2 text-body-sm text-on-surface-variant">
          <span>
            Showing {paginatedLogs.length} of {filtered.length} events • Page {safePage} / {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 rounded bg-surface-container disabled:opacity-40"
            >
              Prev
            </button>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1 rounded bg-surface-container disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {inspectLog && (
        <div className="fixed inset-0 z-[85] bg-on-surface/40 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col p-5 space-y-3 shadow-xl">
            <div className="flex items-center justify-between gap-2 shrink-0">
              <h3 className="font-title-lg text-on-surface truncate">{inspectLog.action}</h3>
              <button type="button" onClick={() => setInspectLog(null)} className="p-1 rounded hover:bg-surface-container shrink-0">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <pre className="p-3 rounded-xl bg-surface-container text-xs font-mono overflow-auto whitespace-pre-wrap break-all flex-1">
              {JSON.stringify(inspectLog, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { usePharmacyStore } from '../../store/usePharmacyStore';
import { useToastStore } from '../../store/useToastStore';
import { RoleId } from '../../types';
import { ALL_ACTIONS, ALL_MODULES } from '../../utils/permissions';

export function RolesPermissionsPage() {
  const pushToast = useToastStore((s) => s.pushToast);

  const roles = usePharmacyStore((s) => s.roles);
  const toggleRolePermission = usePharmacyStore((s) => s.toggleRolePermission);
  const can = usePharmacyStore((s) => s.can);

  const [selectedRoleId, setSelectedRoleId] = useState<RoleId>('PHARMACIST');
  const activeRole = roles.find((r) => r.id === selectedRoleId) || roles[0];
  const canManage = can('roles', 'manage');

  return (
    <div className="p-space-lg lg:p-space-xl space-y-space-lg">
      <div>
        <span className="font-label-sm text-primary uppercase tracking-wider">Enterprise RBAC Governance</span>
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Roles & Permission Matrix</h1>
        <p className="font-body-md text-on-surface-variant">
          Configure granular module permissions across all 9 healthcare & e-commerce roles (changes enforce live)
        </p>
      </div>

      {/* Role Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {roles.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setSelectedRoleId(r.id)}
            className={`text-left p-3 rounded-xl border-2 transition-all ${
              selectedRoleId === r.id
                ? 'bg-primary-fixed/40 border-primary'
                : 'bg-surface-container-lowest border-transparent hover:border-outline-variant'
            }`}
          >
            <div className="font-title-md text-on-surface">{r.name}</div>
            <div className="text-[11px] text-on-surface-variant line-clamp-2 mt-0.5">{r.description}</div>
          </button>
        ))}
      </div>

      {/* Matrix */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-outline-variant/30 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-title-lg text-on-surface">{activeRole.name} — Capability Matrix</h2>
            <p className="font-body-sm text-on-surface-variant">{activeRole.description}</p>
          </div>
          {!canManage && (
            <span className="px-3 py-1 rounded-lg bg-tertiary-fixed text-on-tertiary-fixed font-label-sm">
              Read-Only View (Super Admin required to edit)
            </span>
          )}
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low font-label-sm text-on-surface-variant uppercase">
                <th className="py-3 px-4">Module</th>
                <th className="py-3 px-4">Domain</th>
                {ALL_ACTIONS.map((act) => (
                  <th key={act} className="py-3 px-3 text-center">{act}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30 font-body-sm">
              {ALL_MODULES.map((mod) => {
                const granted = activeRole.permissions[mod.id] || [];
                return (
                  <tr key={mod.id} className="hover:bg-surface-container-low/50">
                    <td className="py-2.5 px-4 font-title-md text-on-surface whitespace-nowrap">{mod.label}</td>
                    <td className="py-2.5 px-4 text-on-surface-variant text-[12px]">{mod.group}</td>
                    {ALL_ACTIONS.map((act) => {
                      const checked = granted.includes(act);
                      return (
                        <td key={act} className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={!canManage}
                            onChange={() => {
                              const res = toggleRolePermission(activeRole.id, mod.id, act);
                              if (!res.ok) {
                                pushToast({ type: 'error', title: 'RBAC Safeguard', description: res.message });
                              } else {
                                pushToast({ type: 'info', title: 'Permission Updated', description: res.message });
                              }
                            }}
                            className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary cursor-pointer disabled:cursor-not-allowed"
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

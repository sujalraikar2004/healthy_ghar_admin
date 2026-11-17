import { useMemo, useState } from 'react';
import { usePharmacyStore } from '../../store/usePharmacyStore';
import { formatINR } from '../../utils/formatters';

export function CustomerGroupsPage() {
  const customerGroups = usePharmacyStore((s) => s.customerGroups);
  const customers = usePharmacyStore((s) => s.customers);
  const [selectedGroupId, setSelectedGroupId] = useState(customerGroups[0]?.id || '');

  const groupMetrics = useMemo(() => {
    return customerGroups.map((g) => {
      const members = customers.filter((c) => c.groupId === g.id);
      const totalRevenue = members.reduce((s, m) => s + m.totalSpent, 0);
      return { group: g, members, totalRevenue };
    });
  }, [customerGroups, customers]);

  const activeGroup = groupMetrics.find((m) => m.group.id === selectedGroupId) || groupMetrics[0];

  return (
    <div className="p-space-lg lg:p-space-xl space-y-space-lg">
      <div>
        <span className="font-label-sm text-primary uppercase tracking-wider">Loyalty & Chronic Segmentation</span>
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Customer Care Groups</h1>
        <p className="font-body-md text-on-surface-variant">
          Patient tier segmentation, chronic refill benefits & minimum order qualification rules
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-md">
        {groupMetrics.map(({ group, members, totalRevenue }) => {
          const isSelected = activeGroup?.group.id === group.id;
          return (
            <button
              key={group.id}
              type="button"
              onClick={() => setSelectedGroupId(group.id)}
              className={`text-left bg-surface-container-lowest p-4 rounded-xl shadow-sm border-2 transition-all ${
                isSelected ? 'border-primary' : 'border-transparent hover:border-outline-variant'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded bg-primary-fixed text-on-primary-fixed font-label-sm">
                  {group.discountPercent}% Benefit
                </span>
                <span className="font-label-sm text-on-surface-variant">Min {group.minOrders} orders</span>
              </div>
              <h3 className="font-title-lg text-on-surface mt-2">{group.name}</h3>
              <p className="font-body-sm text-on-surface-variant mt-1 line-clamp-2">{group.description}</p>
              <div className="mt-3 pt-2 border-t border-outline-variant/30 flex justify-between font-body-sm">
                <span className="text-on-surface-variant">{members.length} patients</span>
                <span className="font-title-md text-primary tabular-nums">{formatINR(totalRevenue)}</span>
              </div>
            </button>
          );
        })}
      </div>

      {activeGroup && (
        <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-outline-variant/30 flex items-center justify-between">
            <h2 className="font-title-lg text-on-surface">{activeGroup.group.name} — Enrolled Patients</h2>
            <span className="font-label-md text-primary">{activeGroup.members.length} members</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low font-label-sm text-on-surface-variant uppercase">
                  <th className="py-2.5 px-4">Patient</th>
                  <th className="py-2.5 px-4">City</th>
                  <th className="py-2.5 px-4">Chronic Tags</th>
                  <th className="py-2.5 px-4 text-right">Orders</th>
                  <th className="py-2.5 px-4 text-right">Total Spend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30 font-body-sm">
                {activeGroup.members.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-on-surface-variant">
                      No patients are currently enrolled in {activeGroup.group.name}.
                    </td>
                  </tr>
                ) : (
                  activeGroup.members.map((m) => (
                    <tr key={m.id}>
                      <td className="py-3 px-4 font-title-md text-on-surface">{m.name}</td>
                      <td className="py-3 px-4 text-on-surface-variant">{m.city}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {m.chronicTags.map((t) => (
                            <span key={t} className="px-2 py-0.5 rounded bg-surface-container font-label-sm">{t}</span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums">{m.orderCount}</td>
                      <td className="py-3 px-4 text-right font-title-md text-primary tabular-nums">{formatINR(m.totalSpent)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

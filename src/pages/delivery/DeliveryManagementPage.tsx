import React, { useMemo, useState } from 'react';
import { usePharmacyStore } from '../../store/usePharmacyStore';
import { useToastStore } from '../../store/useToastStore';
import { Shipment, ShipmentStatus } from '../../types';
import { formatIndianDate, formatIndianDateTime, formatINR } from '../../utils/formatters';

const SHIPMENT_STATUSES: ShipmentStatus[] = [
  'Label Created',
  'Picked Up',
  'In Transit',
  'Out for Delivery',
  'Delivered',
  'Failed Attempt',
];

export function DeliveryManagementPage() {
  const pushToast = useToastStore((s) => s.pushToast);

  const deliveryPartners = usePharmacyStore((s) => s.deliveryPartners);
  const shipments = usePharmacyStore((s) => s.shipments);
  const orders = usePharmacyStore((s) => s.orders);
  const products = usePharmacyStore((s) => s.products);
  const createShipment = usePharmacyStore((s) => s.createShipment);
  const updateShipmentStatus = usePharmacyStore((s) => s.updateShipmentStatus);
  const reassignShipmentPartner = usePharmacyStore((s) => s.reassignShipmentPartner);
  const can = usePharmacyStore((s) => s.can);

  const [zoneFilter, setZoneFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ShipmentStatus>('ALL');
  const [search, setSearch] = useState('');
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [nextStatus, setNextStatus] = useState<ShipmentStatus>('Out for Delivery');
  const [scanLocation, setScanLocation] = useState('Bengaluru Sorting Hub');

  // Create Shipment Modal State
  const [createOpen, setCreateOpen] = useState(false);
  const eligibleOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.status !== 'Cancelled' &&
          o.status !== 'Delivered' &&
          !shipments.some((sh) => sh.orderId === o.id)
      ),
    [orders, shipments]
  );

  const [shipOrderId, setShipOrderId] = useState('');
  const [shipPartnerId, setShipPartnerId] = useState(deliveryPartners[0]?.id || '');
  const [shipColdChain, setShipColdChain] = useState(false);
  const [shipFee, setShipFee] = useState(49);
  const [shipEta, setShipEta] = useState(new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10));

  const openCreateModal = () => {
    const first = eligibleOrders[0];
    setShipOrderId(first?.id || '');
    setShipPartnerId(deliveryPartners[0]?.id || '');
    const needsCold = first
      ? first.items.some((it) => products.find((p) => p.id === it.productId)?.storageCondition === 'Cold Chain (2-8°C)')
      : false;
    setShipColdChain(needsCold);
    setShipFee(first?.shippingFee ?? 49);
    setShipEta(new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10));
    setCreateOpen(true);
  };

  const handleSelectOrderForShipment = (orderId: string) => {
    setShipOrderId(orderId);
    const ord = orders.find((o) => o.id === orderId);
    if (ord) {
      const needsCold = ord.items.some(
        (it) => products.find((p) => p.id === it.productId)?.storageCondition === 'Cold Chain (2-8°C)'
      );
      setShipColdChain(needsCold);
      setShipFee(ord.shippingFee);
    }
  };

  const handleCreateShipment = (e: React.FormEvent) => {
    e.preventDefault();
    const res = createShipment({
      orderId: shipOrderId,
      partnerId: shipPartnerId,
      coldChainRequired: shipColdChain,
      deliveryFee: Number(shipFee),
      expectedDeliveryDate: shipEta,
    });
    pushToast({
      type: res.ok ? 'success' : 'error',
      title: res.ok ? 'Shipment Created (Demo 3PL)' : 'Shipment Blocked',
      description: res.message,
    });
    if (res.ok) setCreateOpen(false);
  };

  const filteredShipments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return shipments.filter((s) => {
      if (zoneFilter !== 'ALL' && s.zone !== zoneFilter) return false;
      if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
      if (q && !`${s.awbNumber} ${s.orderNumber} ${s.customerName} ${s.destinationCity}`.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [shipments, zoneFilter, statusFilter, search]);

  const handleUpdateTracking = () => {
    if (!selectedShipment) return;
    const res = updateShipmentStatus(selectedShipment.id, nextStatus, scanLocation);
    pushToast({
      type: res.ok ? 'success' : 'error',
      title: res.ok ? 'Tracking Updated (Demo 3PL)' : 'Blocked',
      description: res.message,
    });
    if (res.ok) setSelectedShipment(null);
  };

  return (
    <div className="p-space-lg lg:p-space-xl space-y-space-lg">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <span className="font-label-sm text-primary uppercase tracking-wider">3PL Logistics & Cold Chain (Demo Mode)</span>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Delivery & Carrier SLA Management</h1>
          <p className="font-body-md text-on-surface-variant">
            Carrier performance scorecards, Indian Pincode Zone A/B/C tracking & simulated courier telemetry
          </p>
        </div>
        {(can('delivery', 'create') || can('delivery', 'edit')) && (
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-container text-on-primary font-title-md text-body-sm self-start hover:bg-primary"
          >
            <span className="material-symbols-outlined text-[18px]">local_shipping</span>
            <span>Create Shipment</span>
          </button>
        )}
      </div>

      {/* Carrier Scorecards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-md">
        {deliveryPartners.map((dp) => (
          <div key={dp.id} className="bg-surface-container-lowest p-4 rounded-xl shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-title-md text-on-surface">{dp.name}</span>
              <span className={`px-2 py-0.5 rounded font-label-sm ${dp.status === 'Active' ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-tertiary-fixed text-on-tertiary-fixed'}`}>
                {dp.status}
              </span>
            </div>
            <div className="text-[11px] text-on-surface-variant">{dp.serviceType}</div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-outline-variant/30 text-body-sm">
              <div>
                <div className="text-[11px] text-on-surface-variant">On-Time SLA</div>
                <div className="font-title-md text-primary tabular-nums">{dp.onTimeSlaPercent}%</div>
              </div>
              <div>
                <div className="text-[11px] text-on-surface-variant">Avg Transit</div>
                <div className="font-title-md tabular-nums">{dp.avgDeliveryHours} hrs</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Zone & Status Filters */}
      <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {(['ALL', 'Zone A (Metro)', 'Zone B (Tier-2)', 'Zone C (Remote)'] as const).map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => setZoneFilter(z)}
                className={`px-3 py-1.5 rounded-lg font-label-md ${
                  zoneFilter === z ? 'bg-primary-container text-on-primary' : 'bg-surface-container-low text-on-surface-variant'
                }`}
              >
                {z === 'ALL' ? 'All Pincode Zones' : z}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search AWB, Order #, city, patient..."
            className="h-9 px-3 rounded-lg bg-surface-container-low text-body-sm w-full sm:w-64"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(['ALL', ...SHIPMENT_STATUSES] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-full font-label-sm ${
                statusFilter === st ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface-variant'
              }`}
            >
              {st === 'ALL' ? 'All Milestones' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Shipments Table */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low font-label-sm text-on-surface-variant uppercase">
                <th className="py-3 px-4">AWB & Order #</th>
                <th className="py-3 px-4">Destination & Zone</th>
                <th className="py-3 px-4">3PL Partner</th>
                <th className="py-3 px-4">Cold Chain</th>
                <th className="py-3 px-4">ETA</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30 font-body-sm">
              {filteredShipments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-on-surface-variant">
                    No shipments match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredShipments.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-container-low/60">
                    <td className="py-3 px-4">
                      <div className="font-title-md text-primary">{s.awbNumber}</div>
                      <div className="text-[11px] text-on-surface-variant">
                        {s.orderNumber} • {s.customerName}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-title-md text-on-surface">{s.destinationCity} ({s.pincode})</div>
                      <div className="text-[11px] text-on-surface-variant">{s.zone}</div>
                    </td>
                    <td className="py-3 px-4">
                      {can('delivery', 'edit') && s.status !== 'Delivered' ? (
                        <select
                          value={s.partnerId}
                          onChange={(e) => {
                            const res = reassignShipmentPartner(s.id, e.target.value);
                            pushToast({
                              type: res.ok ? 'success' : 'error',
                              title: res.ok ? 'Carrier Updated' : 'Carrier Blocked',
                              description: res.message,
                            });
                          }}
                          className="h-8 px-2 rounded-lg bg-surface-container-low border border-outline-variant text-[12px]"
                        >
                          {deliveryPartners.map((dp) => (
                            <option key={dp.id} value={dp.id}>{dp.name}</option>
                          ))}
                        </select>
                      ) : (
                        <span>{s.partnerName}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {s.coldChainRequired ? (
                        <span className="px-2 py-0.5 rounded bg-primary-fixed text-on-primary-fixed font-label-sm whitespace-nowrap">
                          2–8°C ({s.currentTempCelsius ?? 4.5}°C)
                        </span>
                      ) : (
                        <span className="text-on-surface-variant">Ambient</span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">{formatIndianDate(s.expectedDeliveryDate)}</td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 rounded bg-surface-container font-label-sm whitespace-nowrap">{s.status}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedShipment(s);
                          setNextStatus(s.status === 'In Transit' ? 'Out for Delivery' : 'Delivered');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-primary-container text-on-primary font-label-sm whitespace-nowrap"
                      >
                        {s.status === 'Delivered' ? 'View Timeline' : 'Track / Update'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Shipment Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-[85] bg-on-surface/40 flex items-center justify-center p-4">
          <form onSubmit={handleCreateShipment} className="bg-surface-container-lowest rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-5 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-title-lg text-on-surface">Create 3PL Shipment (Demo)</h3>
              <button type="button" onClick={() => setCreateOpen(false)} className="p-1 rounded hover:bg-surface-container">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            {eligibleOrders.length === 0 ? (
              <div className="p-4 rounded-xl bg-surface-container-low text-body-sm text-on-surface-variant">
                All active orders already have assigned AWB shipments. Create a new order to generate an AWB.
              </div>
            ) : (
              <>
                <div>
                  <label className="block font-label-sm mb-1">Order Eligible for Dispatch *</label>
                  <select
                    required
                    value={shipOrderId}
                    onChange={(e) => handleSelectOrderForShipment(e.target.value)}
                    className="w-full min-w-0 h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-body-sm"
                  >
                    {eligibleOrders.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.orderNumber} • {o.shippingAddress.city} ({formatINR(o.totalAmount)}) — {o.status}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-label-sm mb-1">Courier / 3PL Partner *</label>
                  <select
                    required
                    value={shipPartnerId}
                    onChange={(e) => setShipPartnerId(e.target.value)}
                    className="w-full min-w-0 h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-body-sm"
                  >
                    {deliveryPartners.map((dp) => (
                      <option key={dp.id} value={dp.id}>
                        {dp.name} ({dp.serviceType}){dp.coldChainCapable ? ' • 2-8°C Ready' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-label-sm mb-1">Delivery Fee (₹)</label>
                    <input
                      type="number"
                      min={0}
                      value={shipFee}
                      onChange={(e) => setShipFee(Number(e.target.value))}
                      className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant"
                    />
                  </div>
                  <div>
                    <label className="block font-label-sm mb-1">Expected Delivery</label>
                    <input
                      type="date"
                      required
                      value={shipEta}
                      onChange={(e) => setShipEta(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg bg-surface-container-low border border-outline-variant"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-body-sm">
                  <input
                    type="checkbox"
                    checked={shipColdChain}
                    onChange={(e) => setShipColdChain(e.target.checked)}
                  />
                  <span>Requires 2–8°C Cold-Chain Gel Pack Telemetry</span>
                </label>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setCreateOpen(false)} className="px-4 py-2 rounded-lg bg-surface-container">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 rounded-lg bg-primary-container text-on-primary font-title-md">
                    Generate AWB
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      )}

      {/* Tracking Timeline Modal */}
      {selectedShipment && (
        <div className="fixed inset-0 z-[85] bg-on-surface/40 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-title-lg text-on-surface">AWB {selectedShipment.awbNumber}</h3>
                <p className="text-[11px] text-on-surface-variant">{selectedShipment.partnerName} • Demo Simulated Telemetry</p>
              </div>
              <button type="button" onClick={() => setSelectedShipment(null)} className="p-1 rounded hover:bg-surface-container">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
              {selectedShipment.timeline.map((t, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-surface-container-low text-body-sm flex justify-between gap-2">
                  <div>
                    <div className="font-title-md text-on-surface">{t.status}</div>
                    <div className="text-[11px] text-on-surface-variant">{t.location}</div>
                  </div>
                  <span className="text-[11px] text-on-surface-variant shrink-0">{formatIndianDateTime(t.timestamp)}</span>
                </div>
              ))}
            </div>

            {selectedShipment.status === 'Delivered' ? (
              <div className="p-3 rounded-xl bg-primary-fixed text-on-primary-fixed text-body-sm">
                Shipment delivered — telemetry record is finalized.
              </div>
            ) : can('delivery', 'edit') ? (
              <div className="pt-3 border-t border-outline-variant/40 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-label-sm mb-1">Next Milestone</label>
                    <select
                      value={nextStatus}
                      onChange={(e) => setNextStatus(e.target.value as ShipmentStatus)}
                      className="w-full min-w-0 h-9 px-2.5 rounded-lg bg-surface-container-low border border-outline-variant text-body-sm"
                    >
                      {SHIPMENT_STATUSES.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-label-sm mb-1">Hub / Location Scan</label>
                    <input
                      type="text"
                      value={scanLocation}
                      onChange={(e) => setScanLocation(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-lg bg-surface-container-low border border-outline-variant text-body-sm"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setSelectedShipment(null)} className="px-3 py-1.5 rounded-lg bg-surface-container">
                    Close
                  </button>
                  <button type="button" onClick={handleUpdateTracking} className="px-4 py-1.5 rounded-lg bg-primary-container text-on-primary font-title-md">
                    Push Tracking Scan
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

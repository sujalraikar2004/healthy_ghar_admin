import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePharmacyStore } from '../../store/usePharmacyStore';
import { useToastStore } from '../../store/useToastStore';
import { Supplier } from '../../types';
import { formatINR } from '../../utils/formatters';
import { supplierFormSchema } from '../../utils/validation';

export function SuppliersPage() {
  const [searchParams] = useSearchParams();
  const pushToast = useToastStore((s) => s.pushToast);

  const suppliers = usePharmacyStore((s) => s.suppliers);
  const purchaseOrders = usePharmacyStore((s) => s.purchaseOrders);
  const saveSupplier = usePharmacyStore((s) => s.saveSupplier);
  const archiveSupplier = usePharmacyStore((s) => s.archiveSupplier);
  const can = usePharmacyStore((s) => s.can);

  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string>(searchParams.get('selected') || suppliers[0]?.id || '');

  useEffect(() => {
    const paramId = searchParams.get('selected');
    if (paramId && suppliers.some((s) => s.id === paramId)) {
      setSelectedId(paramId);
    }
  }, [searchParams, suppliers]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);

  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gstin, setGstin] = useState('');
  const [drugLicenseNo, setDrugLicenseNo] = useState('');
  const [city, setCity] = useState('Bengaluru');
  const [address, setAddress] = useState('');
  const [paymentTerms, setPaymentTerms] = useState<Supplier['paymentTerms']>('Net 30');
  const [errorMsg, setErrorMsg] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return suppliers.filter((s) => {
      if (s.status === 'Archived') return false;
      if (!q) return true;
      return `${s.name} ${s.gstin} ${s.city} ${s.contactPerson}`.toLowerCase().includes(q);
    });
  }, [suppliers, search]);

  const activeSupplier = suppliers.find((s) => s.id === selectedId) || filtered[0];
  const supplierPOs = activeSupplier ? purchaseOrders.filter((p) => p.supplierId === activeSupplier.id) : [];

  const openAdd = () => {
    setEditing(null);
    setName('');
    setContactPerson('');
    setEmail('');
    setPhone('+91 98');
    setGstin('29AABCS1234F1Z5');
    setDrugLicenseNo('KA-20B/44100');
    setCity('Bengaluru');
    setAddress('');
    setPaymentTerms('Net 30');
    setErrorMsg('');
    setDrawerOpen(true);
  };

  const openEdit = (sup: Supplier) => {
    setEditing(sup);
    setName(sup.name);
    setContactPerson(sup.contactPerson);
    setEmail(sup.email);
    setPhone(sup.phone);
    setGstin(sup.gstin);
    setDrugLicenseNo(sup.drugLicenseNo);
    setCity(sup.city);
    setAddress(sup.address);
    setPaymentTerms(sup.paymentTerms);
    setErrorMsg('');
    setDrawerOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const check = supplierFormSchema.safeParse({
      name,
      contactPerson,
      email,
      phone,
      gstin: gstin.toUpperCase(),
      drugLicenseNo,
      city,
      address,
    });
    if (!check.success) {
      setErrorMsg(check.error.issues[0]?.message || 'Invalid supplier fields');
      return;
    }

    const res = saveSupplier(
      {
        name: name.trim(),
        contactPerson: contactPerson.trim(),
        email: email.trim(),
        phone: phone.trim(),
        gstin: gstin.trim().toUpperCase(),
        drugLicenseNo: drugLicenseNo.trim(),
        city: city.trim(),
        address: address.trim(),
        paymentTerms,
        suppliedProductIds: editing?.suppliedProductIds || [],
        outstandingBalance: editing?.outstandingBalance || 0,
        rating: editing?.rating || 4.6,
        status: 'Active',
      },
      editing?.id
    );
    pushToast({ type: res.ok ? 'success' : 'error', title: res.ok ? 'Supplier Saved' : 'Error', description: res.message });
    if (res.ok) {
      setDrawerOpen(false);
      if (res.data) setSelectedId(res.data.id);
    }
  };

  return (
    <div className="p-space-lg lg:p-space-xl space-y-space-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="font-label-sm text-primary uppercase tracking-wider">Authorized Stockists & Distributors</span>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Suppliers Directory</h1>
          <p className="font-body-md text-on-surface-variant">
            GSTIN-verified pharmaceutical wholesale partners, 20B/21B licenses, and credit terms
          </p>
        </div>
        {can('suppliers', 'create') && (
          <button
            type="button"
            onClick={openAdd}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-container text-on-primary font-title-md text-body-sm hover:bg-primary"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Onboard Supplier</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        <div className="lg:col-span-7 bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-outline-variant/25">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search supplier name, GSTIN, city..."
              className="w-full h-9 px-3 rounded-lg bg-surface-container-low text-body-sm"
            />
          </div>
          <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant font-label-sm uppercase h-9">
                  <th className="px-4 py-2">Distributor Name</th>
                  <th className="px-3 py-2">City</th>
                  <th className="px-3 py-2">Terms</th>
                  <th className="px-3 py-2">Outstanding</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-table-data">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-on-surface-variant font-body-md">
                      No suppliers match "{search}".
                    </td>
                  </tr>
                ) : (
                  filtered.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => setSelectedId(s.id)}
                    className={`border-b border-outline-variant/20 cursor-pointer transition-colors ${
                      activeSupplier?.id === s.id ? 'bg-primary-fixed/30' : 'hover:bg-surface-container-low'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-title-md text-on-surface">{s.name}</div>
                      <div className="font-mono text-[11px] text-outline">{s.gstin}</div>
                    </td>
                    <td className="px-3 py-3">{s.city}</td>
                    <td className="px-3 py-3">
                      <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface font-label-sm">
                        {s.paymentTerms}
                      </span>
                    </td>
                    <td className="px-3 py-3 tabular-nums font-title-md">{formatINR(s.outstandingBalance)}</td>
                    <td className="px-4 py-3 text-right">
                      {can('suppliers', 'edit') && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(s);
                          }}
                          className="text-primary font-label-md hover:underline"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-5 bg-surface-container-lowest rounded-xl shadow-sm p-6 space-y-4">
          {activeSupplier ? (
            <>
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-outline-variant/30">
                <div>
                  <h2 className="font-headline-sm text-on-surface">{activeSupplier.name}</h2>
                  <p className="font-body-sm text-on-surface-variant">{activeSupplier.address}</p>
                </div>
                {can('suppliers', 'edit') && (
                  <button
                    type="button"
                    onClick={() => {
                      const r = archiveSupplier(activeSupplier.id);
                      pushToast({ type: r.ok ? 'warning' : 'error', title: r.ok ? 'Supplier Archived' : 'Archive Blocked', description: r.message });
                    }}
                    className="px-2.5 py-1 rounded bg-error-container text-on-error-container font-label-sm shrink-0"
                  >
                    Archive
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-body-sm">
                <div className="p-3 rounded-lg bg-surface-container-low">
                  <span className="font-label-sm text-outline block">Primary Contact</span>
                  <span className="font-title-md text-on-surface">{activeSupplier.contactPerson}</span>
                  <span className="block text-on-surface-variant">{activeSupplier.phone}</span>
                </div>
                <div className="p-3 rounded-lg bg-surface-container-low">
                  <span className="font-label-sm text-outline block">Drug License & GSTIN</span>
                  <span className="font-mono text-[11px] block">{activeSupplier.drugLicenseNo}</span>
                  <span className="font-mono text-[11px] text-primary">{activeSupplier.gstin}</span>
                </div>
              </div>

              <div>
                <h3 className="font-title-md text-on-surface mb-2">Purchase Order History ({supplierPOs.length})</h3>
                {supplierPOs.length === 0 ? (
                  <p className="text-body-sm text-on-surface-variant">No purchase orders placed with this distributor yet.</p>
                ) : (
                  <div className="space-y-2">
                    {supplierPOs.map((po) => (
                      <div key={po.id} className="p-3 rounded-lg bg-surface-container-low flex items-center justify-between">
                        <div>
                          <div className="font-mono font-semibold text-primary">{po.poNumber}</div>
                          <div className="font-label-sm text-outline">{po.items.length} line(s) • {po.status}</div>
                        </div>
                        <span className="font-title-md tabular-nums">{formatINR(po.totalAmount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="text-on-surface-variant">Select a supplier from the directory.</p>
          )}
        </div>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-[85] flex justify-end">
          <div className="fixed inset-0 bg-on-surface/35 backdrop-blur-xs" onClick={() => setDrawerOpen(false)} />
          <form onSubmit={handleSave} className="relative w-full max-w-md bg-surface-container-lowest h-full shadow-2xl z-10 flex flex-col p-6 space-y-3 overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
              <h2 className="font-headline-sm text-on-surface">{editing ? 'Edit Supplier' : 'Onboard Authorized Stockist'}</h2>
              <button type="button" onClick={() => setDrawerOpen(false)} className="p-1 rounded-lg hover:bg-surface-container">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            {errorMsg && <div className="p-3 rounded-lg bg-error-container text-on-error-container text-body-sm">{errorMsg}</div>}
            <div>
              <label className="block font-label-md text-on-surface mb-1">Distributor Legal Name *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-label-md text-on-surface mb-1">Contact Person *</label>
                <input type="text" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant" />
              </div>
              <div>
                <label className="block font-label-md text-on-surface mb-1">Mobile *</label>
                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant" />
              </div>
            </div>
            <div>
              <label className="block font-label-md text-on-surface mb-1">Email *</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-label-md text-on-surface mb-1">15-Digit GSTIN *</label>
                <input type="text" value={gstin} onChange={(e) => setGstin(e.target.value)} className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant font-mono" />
              </div>
              <div>
                <label className="block font-label-md text-on-surface mb-1">Drug License *</label>
                <input type="text" value={drugLicenseNo} onChange={(e) => setDrugLicenseNo(e.target.value)} className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant font-mono" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-label-md text-on-surface mb-1">City *</label>
                <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant" />
              </div>
              <div>
                <label className="block font-label-md text-on-surface mb-1">Payment Terms</label>
                <select value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value as Supplier['paymentTerms'])} className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant">
                  <option value="Net 15">Net 15</option>
                  <option value="Net 30">Net 30</option>
                  <option value="Net 45">Net 45</option>
                  <option value="Advance">Advance</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block font-label-md text-on-surface mb-1">Registered Address *</label>
              <textarea rows={2} value={address} onChange={(e) => setAddress(e.target.value)} className="w-full p-3 rounded-lg bg-surface-container-low border border-outline-variant" />
            </div>
            <div className="pt-4 mt-auto flex justify-end gap-2">
              <button type="button" onClick={() => setDrawerOpen(false)} className="px-4 py-2 rounded-lg bg-surface-container text-on-surface font-title-md">Cancel</button>
              <button type="submit" className="px-5 py-2 rounded-lg bg-primary-container text-on-primary font-title-md hover:bg-primary">Save Supplier</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

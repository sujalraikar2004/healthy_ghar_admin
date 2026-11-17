import React, { useMemo, useState } from 'react';
import { usePharmacyStore } from '../../store/usePharmacyStore';
import { useToastStore } from '../../store/useToastStore';
import { Category } from '../../types';
import { slugify } from '../../utils/formatters';

export function CategoriesPage() {
  const pushToast = useToastStore((s) => s.pushToast);
  const categories = usePharmacyStore((s) => s.categories);
  const products = usePharmacyStore((s) => s.products);
  const can = usePharmacyStore((s) => s.can);
  const saveCategory = usePharmacyStore((s) => s.saveCategory);
  const deleteOrReassignCategory = usePharmacyStore((s) => s.deleteOrReassignCategory);

  const [selectedId, setSelectedId] = useState<string | null>(categories[0]?.id || null);
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('medication');
  const [displayOrder, setDisplayOrder] = useState(1);
  const [status, setStatus] = useState<'Active' | 'Archived'>('Active');

  // Reassign modal
  const [reassignTarget, setReassignTarget] = useState<Category | null>(null);
  const [reassignToId, setReassignToId] = useState('');

  const activeCategories = useMemo(
    () => categories.filter((c) => c.status === 'Active').sort((a, b) => a.displayOrder - b.displayOrder),
    [categories]
  );

  const rootCategories = useMemo(
    () =>
      activeCategories.filter(
        (c) =>
          c.parentId === null &&
          (!search.trim() || c.name.toLowerCase().includes(search.toLowerCase()))
      ),
    [activeCategories, search]
  );

  const selectedCategory = categories.find((c) => c.id === selectedId) || activeCategories[0];
  const linkedProducts = selectedCategory
    ? products.filter((p) => p.categoryId === selectedCategory.id && p.status !== 'Archived')
    : [];

  const openAddDrawer = (defaultParentId = '') => {
    setEditingCat(null);
    setName('');
    setParentId(defaultParentId);
    setDescription('');
    setIcon('medication');
    setDisplayOrder(activeCategories.length + 1);
    setStatus('Active');
    setDrawerOpen(true);
  };

  const openEditDrawer = (cat: Category) => {
    setEditingCat(cat);
    setName(cat.name);
    setParentId(cat.parentId || '');
    setDescription(cat.description);
    setIcon(cat.icon);
    setDisplayOrder(cat.displayOrder);
    setStatus(cat.status);
    setDrawerOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      pushToast({ type: 'error', title: 'Validation Error', description: 'Category name is required.' });
      return;
    }
    const res = saveCategory(
      {
        name: name.trim(),
        slug: slugify(name),
        parentId: parentId || null,
        description: description.trim() || `${name} therapeutic taxonomy`,
        icon,
        displayOrder: Number(displayOrder) || 1,
        status,
      },
      editingCat?.id
    );
    pushToast({ type: res.ok ? 'success' : 'error', title: res.ok ? 'Saved' : 'Error', description: res.message });
    if (res.ok) {
      setDrawerOpen(false);
      if (res.data) setSelectedId(res.data.id);
    }
  };

  const handleArchiveCategory = (cat: Category) => {
    const refs = products.filter((p) => p.categoryId === cat.id && p.status !== 'Archived');
    if (refs.length > 0) {
      setReassignTarget(cat);
      const fallback = activeCategories.find((c) => c.id !== cat.id)?.id || '';
      setReassignToId(fallback);
      return;
    }
    const res = deleteOrReassignCategory(cat.id);
    pushToast({ type: res.ok ? 'success' : 'error', title: res.ok ? 'Category Archived' : 'Blocked', description: res.message });
  };

  return (
    <div className="p-space-lg lg:p-space-xl space-y-space-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="font-label-sm text-primary uppercase tracking-wider">Therapeutic Taxonomy</span>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Categories & Subcategories</h1>
          <p className="font-body-md text-on-surface-variant">
            Manage parent-child clinical classifications synchronized with product forms & storefront filters
          </p>
        </div>
        {can('categories', 'create') && (
          <button
            type="button"
            onClick={() => openAddDrawer('')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-container text-on-primary font-title-md text-body-sm hover:bg-primary"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>New Root Category</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        {/* Left Tree Hierarchy */}
        <div className="lg:col-span-5 bg-surface-container-lowest rounded-xl shadow-sm p-4 space-y-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline">search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter taxonomy tree..."
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-surface-container-low text-body-sm text-on-surface focus:outline-none"
            />
          </div>

          <div className="space-y-1.5 max-h-[65vh] overflow-y-auto custom-scrollbar pr-1">
            {rootCategories.map((root) => {
              const children = activeCategories.filter((c) => c.parentId === root.id);
              const rootCount = products.filter((p) => p.categoryId === root.id && p.status !== 'Archived').length;
              return (
                <div key={root.id} className="space-y-1">
                  <div
                    onClick={() => setSelectedId(root.id)}
                    className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${
                      selectedCategory?.id === root.id
                        ? 'bg-primary-container text-on-primary'
                        : 'bg-surface-container-low hover:bg-surface-container text-on-surface'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="material-symbols-outlined text-[18px]">{root.icon}</span>
                      <span className="font-title-md text-body-md truncate">{root.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="px-2 py-0.5 rounded-full bg-black/10 font-label-sm">{rootCount} SKUs</span>
                      {can('categories', 'create') && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openAddDrawer(root.id);
                          }}
                          className="p-1 rounded hover:bg-black/15"
                          title="Add Subcategory"
                        >
                          <span className="material-symbols-outlined text-[16px]">add</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {children.map((child) => {
                    const childCount = products.filter((p) => p.categoryId === child.id && p.status !== 'Archived').length;
                    return (
                      <div
                        key={child.id}
                        onClick={() => setSelectedId(child.id)}
                        className={`ml-6 flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                          selectedCategory?.id === child.id
                            ? 'bg-primary-fixed text-on-primary-fixed font-semibold'
                            : 'hover:bg-surface-container-low text-on-surface-variant'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="material-symbols-outlined text-[16px]">subdirectory_arrow_right</span>
                          <span className="text-body-sm truncate">{child.name}</span>
                        </div>
                        <span className="font-label-sm">{childCount} SKUs</span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Detail Panel */}
        <div className="lg:col-span-7 bg-surface-container-lowest rounded-xl shadow-sm p-6 space-y-5">
          {selectedCategory ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-outline-variant/30">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary-fixed text-on-primary-fixed flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px]">{selectedCategory.icon}</span>
                  </div>
                  <div>
                    <h2 className="font-headline-md text-on-surface">{selectedCategory.name}</h2>
                    <div className="font-mono text-[12px] text-outline">/{selectedCategory.slug} • Order #{selectedCategory.displayOrder}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {can('categories', 'edit') && (
                    <button
                      type="button"
                      onClick={() => openEditDrawer(selectedCategory)}
                      className="px-3.5 py-1.5 rounded-lg bg-surface-container text-on-surface font-title-md text-body-sm hover:bg-surface-container-high"
                    >
                      Edit Category
                    </button>
                  )}
                  {can('categories', 'delete') && (
                    <button
                      type="button"
                      onClick={() => handleArchiveCategory(selectedCategory)}
                      className="px-3.5 py-1.5 rounded-lg bg-error-container text-on-error-container font-title-md text-body-sm hover:opacity-90"
                    >
                      Archive
                    </button>
                  )}
                </div>
              </div>

              <p className="font-body-md text-on-surface-variant">{selectedCategory.description}</p>

              <div>
                <h3 className="font-title-md text-on-surface mb-2">
                  Assigned Formulations ({linkedProducts.length})
                </h3>
                {linkedProducts.length === 0 ? (
                  <div className="p-4 rounded-xl bg-surface-container-low text-body-sm text-on-surface-variant">
                    No active medicines assigned directly to this category.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-80 overflow-y-auto custom-scrollbar">
                    {linkedProducts.map((p) => (
                      <div key={p.id} className="p-3 rounded-lg bg-surface-container-low flex items-center justify-between">
                        <div className="min-w-0 pr-2">
                          <div className="font-title-md text-body-sm text-on-surface truncate">{p.name}</div>
                          <div className="font-mono text-[11px] text-outline">{p.sku}</div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-surface-container text-primary font-label-sm shrink-0">
                          {p.schedule}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-on-surface-variant">Select a category from the taxonomy tree.</div>
          )}
        </div>
      </div>

      {/* Add / Edit Category Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[85] flex justify-end">
          <div className="fixed inset-0 bg-on-surface/35 backdrop-blur-xs" onClick={() => setDrawerOpen(false)} />
          <form
            onSubmit={handleSave}
            className="relative w-full max-w-md bg-surface-container-lowest h-full shadow-2xl z-10 flex flex-col p-6 space-y-4 overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
              <h2 className="font-headline-sm text-on-surface">
                {editingCat ? `Edit ${editingCat.name}` : 'Create Therapeutic Category'}
              </h2>
              <button type="button" onClick={() => setDrawerOpen(false)} className="p-1 rounded-lg hover:bg-surface-container">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div>
              <label className="block font-label-md text-on-surface mb-1">Category Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
              />
            </div>

            <div>
              <label className="block font-label-md text-on-surface mb-1">Parent Category (Optional)</label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
              >
                <option value="">None (Top-Level Root)</option>
                {activeCategories
                  .filter((c) => c.parentId === null && c.id !== editingCat?.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-label-md text-on-surface mb-1">Material Icon</label>
                <select
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
                >
                  {['medication', 'cardiology', 'bloodtype', 'vaccines', 'nutrition', 'monitor_heart', 'pulmonology', 'dermatology', 'healing', 'spa'].map((ic) => (
                    <option key={ic} value={ic}>{ic}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-label-md text-on-surface mb-1">Display Order</label>
                <input
                  type="number"
                  min={1}
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
                />
              </div>
            </div>

            <div>
              <label className="block font-label-md text-on-surface mb-1">Description</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
              />
            </div>

            <div className="pt-4 mt-auto flex items-center justify-end gap-2">
              <button type="button" onClick={() => setDrawerOpen(false)} className="px-4 py-2 rounded-lg bg-surface-container text-on-surface font-title-md">
                Cancel
              </button>
              <button type="submit" className="px-5 py-2 rounded-lg bg-primary-container text-on-primary font-title-md hover:bg-primary">
                Save Category
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Safe Reassignment Modal */}
      {reassignTarget && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-on-surface/40 backdrop-blur-xs p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-headline-sm text-on-surface">Reassign Products Before Archiving</h3>
            <p className="font-body-md text-on-surface-variant">
              Category <strong>{reassignTarget.name}</strong> has active products linked to it. Choose a replacement category to preserve catalog integrity:
            </p>
            <select
              value={reassignToId}
              onChange={(e) => setReassignToId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface"
            >
              {activeCategories
                .filter((c) => c.id !== reassignTarget.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
            </select>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReassignTarget(null)}
                className="px-4 py-2 rounded-lg bg-surface-container text-on-surface font-title-md"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const res = deleteOrReassignCategory(reassignTarget.id, reassignToId);
                  pushToast({ type: res.ok ? 'success' : 'error', title: 'Category Archived', description: res.message });
                  setReassignTarget(null);
                }}
                className="px-4 py-2 rounded-lg bg-error text-on-error font-title-md"
              >
                Reassign & Archive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

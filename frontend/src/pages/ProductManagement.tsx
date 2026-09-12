import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Box } from 'lucide-react';
import Pagination from '../components/Pagination';
import { usePlantStore } from '../store/plantStore';
import { HasPermission } from '../components/HasPermission';
import { productsApi } from '../api/products';
import {
  DEFAULT_QUANTITY_UNITS,
  formatUnitNote,
  getUnitDescription,
  getUnitLabel,
} from '../constants/quantityUnits';
import type { QuantityUnit } from '../constants/quantityUnits';
import { useSubmitLock } from '../hooks/useSubmitLock';

const emptyForm = {
  id: '',
  name: '',
  category: 'OPERATIONAL',
  description: '',
  quantityFormat: 'QTL',
};

export const ProductManagement = () => {
  const activePlant = usePlantStore((state) => state.activePlant);
  const [products, setProducts] = useState<any[]>([]);
  const [quantityUnits, setQuantityUnits] = useState<QuantityUnit[]>(DEFAULT_QUANTITY_UNITS);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [newUnitForm, setNewUnitForm] = useState({ code: '', label: '', description: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [search, setSearch] = useState('');
  const saveLock = useSubmitLock();

  const fetchUnits = async () => {
    try {
      const res = await productsApi.listUnits();
      if (Array.isArray(res.data) && res.data.length > 0) {
        setQuantityUnits(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await productsApi.list(currentPage, 10);
      setProducts(res.data.data || []);
      setTotalItems(res.data.total || 0);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [currentPage, activePlant?.id]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Product name is required.');
      return;
    }

    await saveLock.wrapSubmit(async () => {
    try {
      const payload = {
        name: formData.name.trim(),
        category: formData.category,
        description: formData.description,
        quantityFormat: formData.quantityFormat,
      };

      if (isEditing) {
        await productsApi.update(formData.id, payload);
      } else {
        await productsApi.create(payload);
      }

      setIsModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.message || 'Error saving product');
    }
    });
  };

  const handleCreateUnit = async () => {
    if (!newUnitForm.code.trim() || !newUnitForm.label.trim()) {
      alert('Unit code and label are required.');
      return;
    }

    try {
      const res = await productsApi.createUnit({
        code: newUnitForm.code.trim(),
        label: newUnitForm.label.trim(),
        description: newUnitForm.description.trim() || undefined,
      });
      await fetchUnits();
      setFormData((prev) => ({ ...prev, quantityFormat: res.data.code }));
      setNewUnitForm({ code: '', label: '', description: '' });
      setIsUnitModalOpen(false);
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.message || 'Error creating unit');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await productsApi.remove(id);
        fetchProducts();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const openAddModal = () => {
    setFormData(emptyForm);
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openEditModal = (product: any) => {
    setFormData({
      id: product.id,
      name: product.name,
      category: product.category || 'OPERATIONAL',
      description: product.description || '',
      quantityFormat: product.quantityFormat || 'QTL',
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex flex-col h-full bg-[var(--bg-base)] text-[var(--text-main)]">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] shrink-0 bg-[var(--bg-panel)] mb-4 shadow-sm">
        <h1 className="text-lg font-bold">Product Master</h1>
        <HasPermission moduleName="Products" action="canAdd">
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black rounded-lg font-bold text-sm shadow-lg shadow-amber-500/20 transition-colors"
          >
            <Plus size={16} /> Add Product
          </button>
        </HasPermission>
      </div>

      <div className="px-6 flex-1 overflow-y-auto pb-6">
        <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle)] shadow-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-[var(--border-subtle)] flex gap-4 bg-[var(--bg-panel-hover)]">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted-alt)]" size={16} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-9 pr-4 py-2 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg text-sm focus:border-amber-500 focus:outline-none transition-colors"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--bg-panel-alt)] text-[var(--text-muted-alt)] uppercase text-xs">
                <tr>
                  <th className="px-6 py-3 font-semibold w-1/5">Name</th>
                  <th className="px-6 py-3 font-semibold w-1/5">Quantity Format</th>
                  <th className="px-6 py-3 font-semibold w-1/5">Category</th>
                  <th className="px-6 py-3 font-semibold w-1/5">Description</th>
                  <th className="px-6 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-[var(--bg-panel-hover)] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Box size={16} className="text-amber-500" />
                        <span className="font-medium text-[var(--text-main)]">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[var(--text-muted)]">
                      <div className="flex flex-col gap-1">
                        <span className="px-2 py-1 rounded bg-[var(--glass-bg)] border border-[var(--border-subtle)] text-xs font-medium uppercase w-fit">
                          {getUnitLabel(p.quantityFormat, quantityUnits)}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted-alt)]">
                          {formatUnitNote(p.quantityFormat, quantityUnits)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[var(--text-muted)]">
                      <span
                        className={`px-2 py-1 rounded border text-xs font-medium uppercase ${
                          p.category === 'NON-OPERATIONAL'
                            ? 'bg-red-500/10 border-red-500/30 text-red-500'
                            : 'bg-green-500/10 border-green-500/30 text-green-500'
                        }`}
                      >
                        {p.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[var(--text-muted)]">{p.description || '-'}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <HasPermission moduleName="Products" action="canEdit">
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded-md transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                        </HasPermission>
                        <HasPermission moduleName="Products" action="canDelete">
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </HasPermission>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-[var(--text-muted-alt)]">
                      No products found. Add a new product to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination currentPage={currentPage} totalItems={totalItems} onPageChange={setCurrentPage} />
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[var(--bg-panel)] rounded-xl shadow-2xl border border-[var(--border-subtle)] w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-panel-hover)]">
              <h2 className="text-lg font-bold text-[var(--text-main)]">
                {isEditing ? 'Edit Product' : 'Add New Product'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1">Product Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-amber-500 transition-colors"
                  placeholder="e.g. Rubber Roll, Swarna Rice, Husk..."
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-[var(--text-muted-alt)]">Quantity Format</label>
                  <button
                    type="button"
                    onClick={() => setIsUnitModalOpen(true)}
                    className="text-xs font-bold text-amber-500 hover:underline"
                  >
                    + Add New Unit
                  </button>
                </div>
                <select
                  value={formData.quantityFormat}
                  onChange={(e) => setFormData({ ...formData, quantityFormat: e.target.value })}
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-amber-500 transition-colors appearance-none"
                >
                  {quantityUnits.map((unit) => (
                    <option key={unit.code} value={unit.code}>
                      {unit.label} — {unit.description || getUnitDescription(unit.code, quantityUnits)}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-[var(--text-muted-alt)] mt-1">
                  Inventory and gate pass quantities for this product will display in{' '}
                  <strong>{getUnitLabel(formData.quantityFormat, quantityUnits)}</strong>.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1">Operation Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-amber-500 transition-colors appearance-none"
                >
                  <option value="OPERATIONAL">Operational</option>
                  <option value="NON-OPERATIONAL">Non-Operational</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1">Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-amber-500 transition-colors resize-none"
                  placeholder="Optional details..."
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[var(--border-subtle)] bg-[var(--bg-panel-hover)] flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg font-medium text-[var(--text-muted)] hover:bg-[var(--glass-bg)] transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saveLock.pending}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black rounded-lg font-bold text-sm shadow-lg shadow-amber-500/20 transition-colors disabled:opacity-50"
              >
                {saveLock.pending ? 'Saving...' : 'Save Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isUnitModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-[var(--bg-panel)] rounded-xl shadow-2xl border border-[var(--border-subtle)] w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-panel-hover)]">
              <h2 className="text-lg font-bold text-[var(--text-main)]">Add Quantity Unit</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1">Unit Code</label>
                <input
                  type="text"
                  value={newUnitForm.code}
                  onChange={(e) => setNewUnitForm({ ...newUnitForm, code: e.target.value.toUpperCase() })}
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm"
                  placeholder="e.g. TON"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1">Display Label</label>
                <input
                  type="text"
                  value={newUnitForm.label}
                  onChange={(e) => setNewUnitForm({ ...newUnitForm, label: e.target.value })}
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm"
                  placeholder="e.g. Ton"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1">Description</label>
                <input
                  type="text"
                  value={newUnitForm.description}
                  onChange={(e) => setNewUnitForm({ ...newUnitForm, description: e.target.value })}
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm"
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[var(--border-subtle)] bg-[var(--bg-panel-hover)] flex justify-end gap-3">
              <button
                onClick={() => setIsUnitModalOpen(false)}
                className="px-4 py-2 rounded-lg font-medium text-[var(--text-muted)] hover:bg-[var(--glass-bg)] text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateUnit}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black rounded-lg font-bold text-sm"
              >
                Save Unit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

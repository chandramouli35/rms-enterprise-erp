import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Box } from 'lucide-react';
import api from '../api/axios';
import Pagination from '../components/Pagination';
import { usePlantStore } from '../store/plantStore';

import { HasPermission } from '../components/HasPermission';

export const ProductManagement = () => {
  const activePlant = usePlantStore(state => state.activePlant);
  const [products, setProducts] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ id: '', name: '', type: 'PADDY', category: 'OPERATIONAL', description: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [search, setSearch] = useState('');

  const fetchProducts = async () => {
    try {
      const res = await api.get(`/api/products?page=${currentPage}&limit=10`);
      setProducts(res.data.data || []);
      setTotalItems(res.data.total || 0);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [currentPage, activePlant?.id]);

  const handleSave = async () => {
    try {
      if (isEditing) {
        await api.patch(`/api/products/${formData.id}`, {
          name: formData.name,
          type: formData.type,
          category: formData.category,
          description: formData.description
        });
      } else {
        await api.post('/api/products', {
          name: formData.name,
          type: formData.type,
          category: formData.category,
          description: formData.description
        });
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (err) {
      console.error(err);
      alert('Error saving product');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await api.delete(`/api/products/${id}`);
        fetchProducts();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const openAddModal = () => {
    setFormData({ id: '', name: '', type: 'PADDY', category: 'OPERATIONAL', description: '' });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openEditModal = (product: any) => {
    setFormData({ ...product });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col h-full bg-[var(--bg-base)] text-[var(--text-main)]">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] shrink-0 bg-[var(--bg-panel)] mb-4 shadow-sm">
        <h1 className="text-lg font-bold">Product Master</h1>
        <HasPermission moduleName="Products" action="canAdd">
          <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black rounded-lg font-bold text-sm shadow-lg shadow-amber-500/20 transition-colors">
            <Plus size={16} /> Add Product
          </button>
        </HasPermission>
      </div>

      <div className="px-6 flex-1 overflow-y-auto pb-6">
        <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle)] shadow-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-[var(--border-subtle)] flex gap-4 bg-[var(--bg-panel-hover)]">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted-alt)]" size={16} />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." className="w-full pl-9 pr-4 py-2 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg text-sm focus:border-amber-500 focus:outline-none transition-colors" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--bg-panel-alt)] text-[var(--text-muted-alt)] uppercase text-xs">
                <tr>
                  <th className="px-6 py-3 font-semibold w-1/4">Name</th>
                  <th className="px-6 py-3 font-semibold w-1/4">Type</th>
                  <th className="px-6 py-3 font-semibold w-1/4">Category</th>
                  <th className="px-6 py-3 font-semibold w-1/4">Description</th>
                  <th className="px-6 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filteredProducts.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-[var(--bg-panel-hover)] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Box size={16} className="text-amber-500" />
                        <span className="font-medium text-[var(--text-main)]">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[var(--text-muted)]">
                      <span className="px-2 py-1 rounded bg-[var(--glass-bg)] border border-[var(--border-subtle)] text-xs font-medium uppercase">{p.type}</span>
                    </td>
                    <td className="px-6 py-4 text-[var(--text-muted)]">
                      <span className={`px-2 py-1 rounded border text-xs font-medium uppercase ${p.category === 'NON-OPERATIONAL' ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-green-500/10 border-green-500/30 text-green-500'}`}>{p.category}</span>
                    </td>
                    <td className="px-6 py-4 text-[var(--text-muted)]">{p.description || '-'}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <HasPermission moduleName="Products" action="canEdit">
                          <button onClick={() => openEditModal(p)} className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded-md transition-colors"><Edit2 size={16} /></button>
                        </HasPermission>
                        <HasPermission moduleName="Products" action="canDelete">
                          <button onClick={() => handleDelete(p.id)} className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-md transition-colors"><Trash2 size={16} /></button>
                        </HasPermission>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-[var(--text-muted-alt)]">No products found. Add a new product to get started.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <Pagination 
            currentPage={currentPage}
            totalItems={totalItems}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[var(--bg-panel)] rounded-xl shadow-2xl border border-[var(--border-subtle)] w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-panel-hover)]">
              <h2 className="text-lg font-bold text-[var(--text-main)]">{isEditing ? 'Edit Product' : 'Add New Product'}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1">Product Name</label>
                <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-amber-500 transition-colors" placeholder="e.g. Swarna Rice, Husk..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1">Type</label>
                <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-amber-500 transition-colors appearance-none">
                  <optgroup label="Raw Material">
                    <option value="PADDY">Paddy</option>
                  </optgroup>
                  <optgroup label="Finished Goods">
                    <option value="RICE">Rice</option>
                    <option value="WAND_RICE">Wand Rice</option>
                  </optgroup>
                  <optgroup label="By Products">
                    <option value="BRAN">Bran</option>
                    <option value="K_PHUK">K. Phuk</option>
                    <option value="NAPKE_1">Napke 1</option>
                    <option value="NAPKE_2">Napke 2</option>
                    <option value="BROKEN_RICE">Broken Rice</option>
                    <option value="REJECTIONS">Rejections</option>
                  </optgroup>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1">Operation Category</label>
                <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-amber-500 transition-colors appearance-none">
                  <option value="OPERATIONAL">Operational</option>
                  <option value="NON-OPERATIONAL">Non-Operational</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted-alt)] mb-1">Description</label>
                <textarea rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-amber-500 transition-colors resize-none" placeholder="Optional details..." />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[var(--border-subtle)] bg-[var(--bg-panel-hover)] flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg font-medium text-[var(--text-muted)] hover:bg-[var(--glass-bg)] transition-colors text-sm">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black rounded-lg font-bold text-sm shadow-lg shadow-amber-500/20 transition-colors">Save Product</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

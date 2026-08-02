import React, { useEffect, useState } from 'react';
import api from '../api/axios';

export const PlantsList: React.FC = () => {
 const [plants, setPlants] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [formData, setFormData] = useState({ name: '', location: '', code: '', aClassBagWeight: '0.380', bClassBagWeight: '0.385' });

 useEffect(() => {
 fetchPlants();
 }, []);

 const fetchPlants = async () => {
 try {
 setLoading(true);
 const res = await api.get('/plants');
 setPlants(res.data);
 } catch (err) {
 console.error('Failed to fetch plants', err);
 } finally {
 setLoading(false);
 }
 };

 const handleCreate = async (e: React.FormEvent) => {
 e.preventDefault();
 try {
 await api.post('/plants', formData);
 setIsModalOpen(false);
 setFormData({ name: '', location: '', code: '', aClassBagWeight: '0.380', bClassBagWeight: '0.385' });
 fetchPlants(); // Refresh list
 } catch (err) {
 console.error('Failed to create plant', err);
 }
 };

 return (
 <div>
 <div className="flex items-center justify-between px-6 py-2 border-b border-[var(--border-subtle)] shrink-0 bg-[var(--bg-panel)] mb-6 rounded-xl">
 <div className="flex items-center gap-2">
 <h1 className="text-sm font-semibold text-[var(--text-muted)]">Plant Management</h1>
 </div>
 <button 
 onClick={() => setIsModalOpen(true)}
 className="bg-[#e67e00] hover:bg-[#cc7000] text-black px-3 py-1.5 rounded-sm font-bold text-xs transition-colors"
 >
 Register New Plant
 </button>
 </div>

 <div className="glass-panel rounded-xl overflow-hidden">
 {loading ? (
 <div className="p-8 text-center text-[var(--text-muted-alt)]">Loading plants...</div>
 ) : (
 <table className="w-full text-left border-collapse">
 <thead>
 <tr className="border-b border-[var(--border-subtle)] bg-[var(--glass-bg)]">
 <th className="p-4 text-[var(--text-muted-alt)] font-medium text-sm">Plant Name</th>
 <th className="p-4 text-[var(--text-muted-alt)] font-medium text-sm">Code</th>
 <th className="p-4 text-[var(--text-muted-alt)] font-medium text-sm">Location</th>
 </tr>
 </thead>
 <tbody>
 {plants.map((plant) => (
 <tr key={plant.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--glass-bg)] transition-colors">
 <td className="p-4 font-medium">{plant.name}</td>
 <td className="p-4"><span className="bg-amber-500/20 text-amber-500 px-2 py-1 rounded text-xs">{plant.code}</span></td>
 <td className="p-4 text-[var(--text-muted)]">{plant.location || 'N/A'}</td>
 </tr>
 ))}
 </tbody>
 </table>
 )}
 </div>

 {isModalOpen && (
 <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
 <div className="glass-panel p-6 rounded-xl w-full max-w-md border border-[var(--border-subtle)]">
 <h2 className="text-xl font-bold mb-4">Register New Plant</h2>
 <form onSubmit={handleCreate} className="space-y-4">
 <div>
 <label className="block text-sm text-[var(--text-muted-alt)] mb-1">Plant Name</label>
 <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 text-[var(--text-main)] focus:outline-none focus:border-amber-500" placeholder="e.g. South Branch" />
 </div>
 <div>
 <label className="block text-sm text-[var(--text-muted-alt)] mb-1">Plant Code</label>
 <input required type="text" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 text-[var(--text-main)] focus:outline-none focus:border-amber-500" placeholder="e.g. PLANT-S" />
 </div>
 <div>
 <label className="block text-sm text-[var(--text-muted-alt)] mb-1">Location</label>
 <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 text-[var(--text-main)] focus:outline-none focus:border-amber-500" placeholder="City or Zone" />
 </div>
 <div className="grid grid-cols-2 gap-4">
    <div>
    <label className="block text-sm text-[var(--text-muted-alt)] mb-1">A Class Weight (Qtl)</label>
    <input type="number" step="0.001" value={formData.aClassBagWeight} onChange={e => setFormData({...formData, aClassBagWeight: e.target.value})} className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 text-[var(--text-main)] focus:outline-none focus:border-amber-500" />
    </div>
    <div>
    <label className="block text-sm text-[var(--text-muted-alt)] mb-1">B Class Weight (Qtl)</label>
    <input type="number" step="0.001" value={formData.bClassBagWeight} onChange={e => setFormData({...formData, bClassBagWeight: e.target.value})} className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 text-[var(--text-main)] focus:outline-none focus:border-amber-500" />
    </div>
  </div>
 <div className="flex justify-end gap-3 mt-6">
 <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-[var(--text-muted-alt)] hover:text-[var(--text-main)] transition-colors">Cancel</button>
 <button type="submit" className="bg-amber-600 hover:bg-amber-500 text-[var(--text-main)] px-4 py-2 rounded-lg font-medium transition-colors">Register Plant</button>
 </div>
 </form>
 </div>
 </div>
 )}
 </div>
 );
};

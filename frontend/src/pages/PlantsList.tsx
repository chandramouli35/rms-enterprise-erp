import React, { useEffect, useState } from "react";
import api from "../api/axios";
import Pagination from "../components/Pagination";
import { Edit2, Trash2 } from "lucide-react";
import { useSubmitLock } from "../hooks/useSubmitLock";
import { useAuthStore } from "../store/authStore";
import { hasModulePermission } from "../utils/modulePermissions";

export const PlantsList: React.FC = () => {
  const [plants, setPlants] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    code: "",
    wastageBagWeight: "0.382",
  });
  const saveLock = useSubmitLock();
  useAuthStore((s) => s.user);
  const canAddPlant = hasModulePermission("Plants", "canAdd");
  const canEditPlant = hasModulePermission("Plants", "canEdit");
  const canDeletePlant = hasModulePermission("Plants", "canDelete");

  useEffect(() => {
    fetchPlants();
  }, [currentPage]);

  const fetchPlants = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/plants?page=${currentPage}&limit=10`);
      setPlants(res.data.data || []);
      setTotalItems(res.data.total || 0);
    } catch (err) {
      console.error("Failed to fetch plants", err);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    if (!canAddPlant) return;
    setIsEditing(false);
    setEditId(null);
    setFormData({
      name: "",
      location: "",
      code: "",
      wastageBagWeight: "0.382",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (plant: any) => {
    if (!canEditPlant) return;
    setIsEditing(true);
    setEditId(plant.id);
    setFormData({
      name: plant.name || "",
      location: plant.location || "",
      code: plant.code || "",
      wastageBagWeight:
        plant.wastageBagWeight?.toString() ||
        plant.standardBagWeight?.toString() ||
        "0.382",
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing ? !canEditPlant : !canAddPlant) {
      alert(
        isEditing
          ? "Not allowed. Turn on Edit for Plants, then log in again."
          : "Not allowed. Turn on Add for Plants, then log in again.",
      );
      return;
    }
    await saveLock.wrapSubmit(async () => {
      try {
        if (isEditing && editId) {
          await api.put(`/plants/${editId}`, formData);
        } else {
          await api.post("/plants", formData);
        }
        setIsModalOpen(false);
        fetchPlants(); // Refresh list
      } catch (err) {
        console.error("Failed to save plant", err);
        alert("Failed to save plant");
      }
    });
  };

  const handleDelete = async (id: string) => {
    if (!canDeletePlant) {
      alert("Not allowed. Turn on Delete for Plants, then log in again.");
      return;
    }
    if (window.confirm("Are you sure you want to delete this plant?")) {
      try {
        await api.delete(`/plants/${id}`);
        fetchPlants();
      } catch (err) {
        console.error("Failed to delete plant", err);
        alert("Failed to delete plant. It may be in use.");
      }
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between px-6 py-2 border-b border-[var(--border-subtle)] shrink-0 bg-[var(--bg-panel)] mb-6 rounded-xl">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-semibold text-[var(--text-muted)]">
            Plant Management
          </h1>
        </div>
        {canAddPlant && (
          <button
            onClick={openAddModal}
            className="bg-[#e67e00] hover:bg-[#cc7000] text-black px-3 py-1.5 rounded-sm font-bold text-xs transition-colors"
          >
            Register New Plant
          </button>
        )}
      </div>

      <div className="glass-panel rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[var(--text-muted-alt)]">
            Loading plants...
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--glass-bg)]">
                <th className="p-4 text-[var(--text-muted-alt)] font-medium text-sm">
                  Plant Name
                </th>
                <th className="p-4 text-[var(--text-muted-alt)] font-medium text-sm">
                  Code
                </th>
                <th className="p-4 text-[var(--text-muted-alt)] font-medium text-sm">
                  Location
                </th>
                <th className="p-4 text-[var(--text-muted-alt)] font-medium text-sm text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {plants.map((plant) => (
                <tr
                  key={plant.id}
                  className="border-b border-[var(--border-subtle)] hover:bg-[var(--glass-bg)] transition-colors group"
                >
                  <td className="p-4 font-medium">{plant.name}</td>
                  <td className="p-4">
                    <span className="bg-amber-500/20 text-amber-500 px-2 py-1 rounded text-xs">
                      {plant.code}
                    </span>
                  </td>
                  <td className="p-4 text-[var(--text-muted)]">
                    {plant.location || "N/A"}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {canEditPlant && (
                        <button
                          onClick={() => openEditModal(plant)}
                          className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded-md transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                      )}
                      {canDeletePlant && (
                        <button
                          onClick={() => handleDelete(plant.id)}
                          className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <Pagination
          currentPage={currentPage}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
        />
      </div>

      {(isEditing ? canEditPlant : canAddPlant) && isModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="glass-panel p-6 rounded-xl w-full max-w-md border border-[var(--border-subtle)]">
            <h2 className="text-xl font-bold mb-4">
              {isEditing ? "Edit Plant" : "Register New Plant"}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm text-[var(--text-muted-alt)] mb-1">
                  Plant Name
                </label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 text-[var(--text-main)] focus:outline-none focus:border-amber-500"
                  placeholder="e.g. South Branch"
                />
              </div>
              <div>
                <label className="block text-sm text-[var(--text-muted-alt)] mb-1">
                  Plant Code
                </label>
                <input
                  required
                  type="text"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                  className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 text-[var(--text-main)] focus:outline-none focus:border-amber-500"
                  placeholder="e.g. PLANT-S"
                />
              </div>
              <div>
                <label className="block text-sm text-[var(--text-muted-alt)] mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 text-[var(--text-main)] focus:outline-none focus:border-amber-500"
                  placeholder="City or Zone"
                />
              </div>
              <div>
                <label className="block text-sm text-[var(--text-muted-alt)] mb-1">
                  Safai / Patal average bag weight (Qtl)
                </label>
                <p className="text-[10px] text-[var(--text-muted-alt)] mb-1">
                  Mill wastage only. A / B Class bag weights are set on each
                  Arthiya (Procurement → Supplier Master).
                </p>
                <input
                  type="number"
                  step="0.001"
                  value={formData.wastageBagWeight}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      wastageBagWeight: e.target.value,
                    })
                  }
                  className="w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-4 py-2 text-[var(--text-main)] focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-[var(--text-muted-alt)] hover:text-[var(--text-main)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveLock.pending}
                  className="bg-amber-600 hover:bg-amber-500 text-[var(--text-main)] px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {saveLock.pending
                    ? "Saving..."
                    : isEditing
                      ? "Update Plant"
                      : "Register Plant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

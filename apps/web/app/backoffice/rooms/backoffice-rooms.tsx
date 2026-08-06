'use client';

import { useState, useEffect } from 'react';
import { Button, Input, Badge } from '@/components/ui';
import { getRoomsList, createRoom, updateRoom, deleteRoom } from '@/actions/rooms';
import type { Room } from '@mediterranea/shared/types';
import type { RoomFormData } from '@mediterranea/shared/validations';

const EMPTY: RoomFormData = { name: '', type: '', isActive: true };

export function BackofficeRooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null); // null = list, '' = new
  const [form, setForm] = useState<RoomFormData>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await getRoomsList();
    if (res.success && res.data) setRooms(res.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function startCreate() {
    setForm(EMPTY);
    setEditingId('');
    setError(null);
  }

  function startEdit(room: Room) {
    setForm({ name: room.name, type: room.type, isActive: room.isActive });
    setEditingId(room.id);
    setError(null);
  }

  function cancel() {
    setEditingId(null);
    setError(null);
  }

  async function save() {
    if (!form.name.trim() || !form.type.trim()) {
      setError('Name and type are required.');
      return;
    }
    setSaving(true);
    const res = editingId ? await updateRoom(editingId, form) : await createRoom(form);
    setSaving(false);
    if (res.success) {
      setEditingId(null);
      await load();
    } else {
      setError(typeof res.error === 'string' ? res.error : 'Failed to save room.');
    }
  }

  async function handleDelete(room: Room) {
    if (!confirm(`Delete "${room.name}"? This cannot be undone.`)) return;
    const res = await deleteRoom(room.id);
    if (res.success) await load();
  }

  if (loading) {
    return <div className="py-16 text-center text-white-50">Loading rooms...</div>;
  }

  // Form view
  if (editingId !== null) {
    return (
      <div className="max-w-xl border border-white-10 bg-dark-800 p-8">
        <h2 className="font-serif text-xl text-white mb-6">
          {editingId ? 'Edit Room' : 'New Room'}
        </h2>
        <div className="space-y-5">
          <Input
            id="room-name"
            label="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Treatment Room 1"
          />
          <Input
            id="room-type"
            label="Type"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            placeholder="facial, treatment, laser…"
          />
          <label className="flex items-center gap-3 text-white-70">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="h-4 w-4 accent-gold"
            />
            <span className="text-sm">Active (available for booking)</span>
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button variant="elegant" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save Room'}
            </Button>
            <Button variant="ghost" onClick={cancel} disabled={saving}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div>
      <div className="mb-6">
        <Button variant="elegant" onClick={startCreate}>
          + Add Room
        </Button>
      </div>

      {rooms.length === 0 ? (
        <div className="border border-white-10 bg-dark-800 p-16 text-center text-white-50">
          No rooms yet. Add one to get started.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {rooms.map((room) => (
            <div key={room.id} className="border border-white-10 bg-dark-800 p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-serif text-lg text-white">{room.name}</h3>
                  <p className="text-sm text-gold capitalize">{room.type}</p>
                </div>
                <Badge variant={room.isActive ? 'completed' : 'cancelled'}>
                  {room.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="flex gap-3 pt-3 border-t border-white-10">
                <Button variant="outline" size="sm" onClick={() => startEdit(room)}>
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(room)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

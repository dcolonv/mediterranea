'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button, Input, Textarea, Select, Badge } from '@/components/ui';
import { formatPrice, formatDuration } from '@mediterranea/shared/utils';
import {
  getAllServices,
  createService,
  updateService,
  deleteService,
} from '@/actions/services';
import { getStaffList, setServiceQualifiedStaff } from '@/actions/staff';
import { getRoomsList } from '@/actions/rooms';
import { RecipeEditor } from '@/components/services/recipe-editor';
import type { Service, Staff, Room, ServiceCategory } from '@mediterranea/shared/types';
import type { ServiceFormData } from '@mediterranea/shared/validations';

interface FormState {
  name: string;
  nameEs: string;
  slug: string;
  description: string;
  descriptionEs: string;
  category: ServiceCategory;
  bookingGroup: string;
  durationMinutes: string;
  blockMinutes: string;
  price: string;
  firstVisitPrice: string;
  temporary: boolean;
  roomType: string;
  displayOrder: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  name: '',
  nameEs: '',
  slug: '',
  description: '',
  descriptionEs: '',
  category: 'facial',
  bookingGroup: '',
  durationMinutes: '60',
  blockMinutes: '0',
  price: '0',
  firstVisitPrice: '0',
  temporary: false,
  roomType: '',
  displayOrder: '0',
  isActive: true,
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function BackofficeServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null); // null = list, '' = new
  const [recipeFor, setRecipeFor] = useState<Service | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [slugEdited, setSlugEdited] = useState(false);
  const [qualifiedStaff, setQualifiedStaff] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [s, st, rm] = await Promise.all([getAllServices(), getStaffList(), getRoomsList()]);
    if (s.success && s.data) setServices(s.data);
    if (st.success && st.data) setStaff(st.data);
    if (rm.success && rm.data) setRooms(rm.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const roomTypes = Array.from(new Set(rooms.map((r) => r.type).filter(Boolean))).sort();

  const staffForService = (serviceId: string) =>
    staff.filter((s) => s.serviceIds?.includes(serviceId));

  function startCreate() {
    setForm(EMPTY_FORM);
    setSlugEdited(false);
    setQualifiedStaff(new Set());
    setEditingId('');
    setError(null);
  }

  function startEdit(svc: Service) {
    setForm({
      name: svc.name,
      nameEs: svc.nameEs ?? '',
      slug: svc.slug,
      description: svc.description,
      descriptionEs: svc.descriptionEs ?? '',
      category: svc.category,
      bookingGroup: svc.bookingGroup ?? '',
      durationMinutes: String(svc.durationMinutes),
      blockMinutes: String(svc.blockMinutes ?? 0),
      price: String(svc.price),
      firstVisitPrice: String(svc.firstVisitPrice ?? 0),
      temporary: svc.temporary ?? false,
      roomType: svc.roomType ?? '',
      displayOrder: String(svc.displayOrder ?? 0),
      isActive: svc.isActive,
    });
    setSlugEdited(true);
    setQualifiedStaff(new Set(staffForService(svc.id).map((s) => s.id)));
    setEditingId(svc.id);
    setError(null);
  }

  function onNameChange(text: string) {
    setForm((f) => ({ ...f, name: text, slug: slugEdited ? f.slug : slugify(text) }));
  }

  function toggleStaff(id: string) {
    setQualifiedStaff((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save() {
    const duration = Number(form.durationMinutes);
    const price = Number(form.price);
    if (!form.name.trim() || !form.slug.trim() || !form.description.trim()) {
      setError('Name, slug, and description are required.');
      return;
    }
    if (!Number.isFinite(duration) || duration < 1) {
      setError('Duration must be at least 1 minute.');
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setError('Price must be zero or greater.');
      return;
    }

    const payload: ServiceFormData = {
      name: form.name.trim(),
      nameEs: form.nameEs.trim(),
      slug: form.slug.trim(),
      description: form.description.trim(),
      descriptionEs: form.descriptionEs.trim(),
      category: form.category,
      bookingGroup: form.bookingGroup as ServiceFormData['bookingGroup'],
      durationMinutes: duration,
      blockMinutes: Number(form.blockMinutes) || 0,
      price,
      firstVisitPrice: Number(form.firstVisitPrice) || 0,
      temporary: form.temporary,
      roomType: form.roomType,
      isActive: form.isActive,
      displayOrder: Number(form.displayOrder) || 0,
    };

    setSaving(true);

    let serviceId: string;
    if (editingId) {
      const res = await updateService(editingId, payload);
      if (!res.success) {
        setSaving(false);
        setError(typeof res.error === 'string' ? res.error : 'Failed to save service.');
        return;
      }
      serviceId = editingId;
    } else {
      const res = await createService(payload);
      if (!res.success || !res.id) {
        setSaving(false);
        setError(typeof res.error === 'string' ? res.error : 'Failed to save service.');
        return;
      }
      serviceId = res.id;
    }

    await setServiceQualifiedStaff(serviceId, Array.from(qualifiedStaff));

    setSaving(false);
    setEditingId(null);
    await load();
  }

  async function handleDelete(svc: Service) {
    if (!confirm(`Delete "${svc.name}"? This cannot be undone.`)) return;
    const res = await deleteService(svc.id);
    if (res.success) await load();
  }

  if (loading) {
    return <div className="py-16 text-center text-white-50">Loading services…</div>;
  }

  // ── Recipe editor ──────────────────────────────────────────────────────────
  if (recipeFor) {
    return (
      <RecipeEditor
        serviceId={recipeFor.id}
        serviceName={recipeFor.name}
        onClose={() => setRecipeFor(null)}
      />
    );
  }

  // ── Form view ──────────────────────────────────────────────────────────────
  if (editingId !== null) {
    return (
      <div className="max-w-2xl border border-white-10 bg-dark-800 p-8">
        <h2 className="mb-6 font-serif text-xl text-white">
          {editingId ? 'Edit Service' : 'New Service'}
        </h2>
        <div className="space-y-5">
          <Input
            id="svc-name"
            label="Name (English)"
            value={form.name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Deep Cleansing Facial"
          />
          <Input
            id="svc-name-es"
            label="Name (Spanish) — optional"
            value={form.nameEs}
            onChange={(e) => setForm({ ...form, nameEs: e.target.value })}
            placeholder="Limpieza Facial Profunda"
          />
          <Input
            id="svc-slug"
            label="Slug"
            value={form.slug}
            onChange={(e) => {
              setSlugEdited(true);
              setForm({ ...form, slug: e.target.value });
            }}
            placeholder="deep-cleansing"
          />
          <Textarea
            id="svc-description"
            label="Description (English)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            placeholder="What the treatment involves and who it's for…"
          />
          <Textarea
            id="svc-description-es"
            label="Description (Spanish) — optional"
            value={form.descriptionEs}
            onChange={(e) => setForm({ ...form, descriptionEs: e.target.value })}
            rows={3}
            placeholder="En qué consiste el tratamiento y para quién es…"
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              id="svc-category"
              label="Category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as ServiceCategory })}
              options={[
                { value: 'facial', label: 'Facial' },
                { value: 'treatment', label: 'Treatment' },
              ]}
            />
            <Select
              id="svc-roomtype"
              label="Required room type"
              value={form.roomType}
              onChange={(e) => setForm({ ...form, roomType: e.target.value })}
              options={[
                { value: '', label: 'Any active room' },
                ...roomTypes.map((t) => ({ value: t, label: t })),
              ]}
            />
          </div>

          <Select
            id="svc-booking-group"
            label="Booking group (public booking page)"
            value={form.bookingGroup}
            onChange={(e) => setForm({ ...form, bookingGroup: e.target.value })}
            options={[
              { value: '', label: 'Not on booking page' },
              { value: 'custom', label: 'Custom — books directly' },
              { value: 'focus', label: 'Focus — shown in the Focus submenu' },
              { value: 'indiba', label: 'INDIBA — shown in the INDIBA submenu' },
            ]}
          />

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Input
              id="svc-duration"
              label="Duration (min)"
              type="number"
              value={form.durationMinutes}
              onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
            />
            <Input
              id="svc-price"
              label="Price (€)"
              type="number"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
            <Input
              id="svc-block"
              label="Calendar block (min, 0 = same)"
              type="number"
              value={form.blockMinutes}
              onChange={(e) => setForm({ ...form, blockMinutes: e.target.value })}
            />
            <Input
              id="svc-first-price"
              label="First-visit (€, 0 = none)"
              type="number"
              value={form.firstVisitPrice}
              onChange={(e) => setForm({ ...form, firstVisitPrice: e.target.value })}
            />
            <Input
              id="svc-order"
              label="Display order"
              type="number"
              value={form.displayOrder}
              onChange={(e) => setForm({ ...form, displayOrder: e.target.value })}
            />
          </div>

          {/* Qualifying staff */}
          <div>
            <span className="mb-2 block text-sm font-medium tracking-wide text-white-70">
              Qualified practitioners
            </span>
            {staff.length === 0 ? (
              <p className="text-sm text-white-30">
                No staff yet. Add practitioners under Staff first.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {staff.map((s) => (
                  <label
                    key={s.id}
                    className="flex items-center gap-3 border border-white-10 px-3 py-2 text-white-70"
                  >
                    <input
                      type="checkbox"
                      checked={qualifiedStaff.has(s.id)}
                      onChange={() => toggleStaff(s.id)}
                      className="h-4 w-4 accent-gold"
                    />
                    <span className="text-sm">
                      {s.name}
                      <span className="text-white-30"> · {s.role}</span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <label className="flex items-center gap-3 text-white-70">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="h-4 w-4 accent-gold"
            />
            <span className="text-sm">Active (bookable)</span>
          </label>

          <label className="flex items-center gap-3 text-white-70">
            <input
              type="checkbox"
              checked={form.temporary}
              onChange={(e) => setForm({ ...form, temporary: e.target.checked })}
              className="h-4 w-4 accent-gold"
            />
            <span className="text-sm">Seasonal (limited-time — shows a badge)</span>
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button variant="elegant" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save Service'}
            </Button>
            <Button variant="ghost" onClick={() => setEditingId(null)} disabled={saving}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── List view ──────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="mb-6">
        <Button variant="elegant" onClick={startCreate}>
          + Add Service
        </Button>
      </div>

      {services.length === 0 ? (
        <div className="border border-white-10 bg-dark-800 p-16 text-center text-white-50">
          No services yet. Add one to get started.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {services.map((svc) => {
            const qStaff = staffForService(svc.id);
            return (
              <div key={svc.id} className="border border-white-10 bg-dark-800 p-6">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-serif text-lg text-white">{svc.name}</h3>
                    <p className="text-sm capitalize text-gold">
                      {svc.category} · {formatDuration(svc.durationMinutes)} · {formatPrice(svc.price)}
                    </p>
                  </div>
                  <Badge variant={svc.isActive ? 'completed' : 'cancelled'}>
                    {svc.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <div className="space-y-1 text-xs text-white-50">
                  <div>
                    <span className="text-white-30">Room:</span>{' '}
                    {svc.roomType ? svc.roomType : 'Any active room'}
                  </div>
                  <div>
                    <span className="text-white-30">Practitioners:</span>{' '}
                    {qStaff.length === 0 ? (
                      <span className="text-red-400">none assigned</span>
                    ) : (
                      qStaff.map((s) => s.name).join(', ')
                    )}
                  </div>
                </div>

                <div className="mt-4 flex gap-3 border-t border-white-10 pt-3">
                  <Button variant="outline" size="sm" onClick={() => startEdit(svc)}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setRecipeFor(svc)}>
                    Recipe
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(svc)}
                    className="ml-auto text-red-400 hover:bg-red-500/10 hover:text-red-300"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

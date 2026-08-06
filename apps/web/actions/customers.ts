'use server';

import { Timestamp, type QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { customerSchema, type CustomerFormData } from '@mediterranea/shared/validations';
import type { Customer, Appointment } from '@mediterranea/shared/types';

const COLLECTION = 'customers';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function getCustomers(search?: string) {
  try {
    const snapshot = await getAdminDb().collection(COLLECTION).orderBy('name', 'asc').get();

    let customers = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Customer[];

    if (search?.trim()) {
      const term = search.trim().toLowerCase();
      customers = customers.filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          c.email.toLowerCase().includes(term) ||
          c.phone.toLowerCase().includes(term)
      );
    }

    return { success: true, data: customers };
  } catch (error) {
    console.error('Error fetching customers:', error);
    return { success: false, error: 'Failed to fetch customers.' };
  }
}

export async function getCustomer(id: string) {
  try {
    const doc = await getAdminDb().collection(COLLECTION).doc(id).get();
    if (!doc.exists) {
      return { success: false, error: 'Customer not found.' };
    }
    return { success: true, data: { id: doc.id, ...doc.data() } as Customer };
  } catch (error) {
    console.error('Error fetching customer:', error);
    return { success: false, error: 'Failed to fetch customer.' };
  }
}

export async function getCustomerAppointments(customerId: string) {
  try {
    const snapshot = await getAdminDb()
      .collection('appointments')
      .where('customerId', '==', customerId)
      .get();

    const appointments = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }) as Appointment)
      .sort((a, b) => b.appointmentDate.localeCompare(a.appointmentDate));

    return { success: true, data: appointments };
  } catch (error) {
    console.error('Error fetching customer appointments:', error);
    return { success: false, error: 'Failed to fetch appointment history.' };
  }
}

export async function createCustomer(data: CustomerFormData) {
  const result = customerSchema.safeParse(data);
  if (!result.success) {
    return { success: false, error: result.error.flatten().fieldErrors };
  }

  try {
    const db = getAdminDb();
    const email = normalizeEmail(result.data.email);

    // Prevent duplicates by email.
    const existing = await db.collection(COLLECTION).where('email', '==', email).limit(1).get();
    if (!existing.empty) {
      return { success: false, error: 'A customer with this email already exists.' };
    }

    const now = Timestamp.now();
    const docRef = await db.collection(COLLECTION).add({
      name: result.data.name,
      email,
      phone: result.data.phone,
      notes: result.data.notes ?? '',
      tags: result.data.tags ?? [],
      totalVisits: 0,
      lastVisitDate: null,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating customer:', error);
    return { success: false, error: 'Failed to create customer.' };
  }
}

export async function updateCustomer(id: string, data: CustomerFormData) {
  const result = customerSchema.safeParse(data);
  if (!result.success) {
    return { success: false, error: result.error.flatten().fieldErrors };
  }

  try {
    const db = getAdminDb();
    const email = normalizeEmail(result.data.email);

    // Ensure no other customer already uses this email.
    const existing = await db.collection(COLLECTION).where('email', '==', email).limit(1).get();
    if (!existing.empty && existing.docs[0].id !== id) {
      return { success: false, error: 'Another customer already uses this email.' };
    }

    await db.collection(COLLECTION).doc(id).update({
      name: result.data.name,
      email,
      phone: result.data.phone,
      notes: result.data.notes ?? '',
      tags: result.data.tags ?? [],
      updatedAt: Timestamp.now(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating customer:', error);
    return { success: false, error: 'Failed to update customer.' };
  }
}

/**
 * Find-or-create a customer for an appointment's contact info and refresh
 * rollups (totalVisits, lastVisitDate). Returns the customerId, or null on error.
 * Safe to call from the public booking flow (uses the Admin SDK).
 */
export async function upsertCustomerForAppointment(input: {
  name: string;
  email: string;
  phone: string;
  appointmentDate: string;
}): Promise<string | null> {
  try {
    const db = getAdminDb();
    const email = normalizeEmail(input.email);
    const existing = await db.collection(COLLECTION).where('email', '==', email).limit(1).get();
    const now = Timestamp.now();

    if (existing.empty) {
      const docRef = await db.collection(COLLECTION).add({
        name: input.name,
        email,
        phone: input.phone,
        notes: '',
        tags: [],
        totalVisits: 1,
        lastVisitDate: input.appointmentDate,
        createdAt: now,
        updatedAt: now,
      });
      return docRef.id;
    }

    const doc = existing.docs[0];
    const data = doc.data();
    const lastVisitDate =
      !data.lastVisitDate || input.appointmentDate > data.lastVisitDate
        ? input.appointmentDate
        : data.lastVisitDate;

    await doc.ref.update({
      // keep the latest phone on file; name left as-is to avoid clobbering edits
      phone: input.phone,
      totalVisits: (data.totalVisits ?? 0) + 1,
      lastVisitDate,
      updatedAt: now,
    });
    return doc.id;
  } catch (error) {
    console.error('Error upserting customer for appointment:', error);
    return null;
  }
}

export async function deleteCustomer(id: string) {
  try {
    await getAdminDb().collection(COLLECTION).doc(id).delete();
    return { success: true };
  } catch (error) {
    console.error('Error deleting customer:', error);
    return { success: false, error: 'Failed to delete customer.' };
  }
}

/** Total spend = sum of service prices across the customer's completed appointments. */
export async function getCustomerTotalSpend(customerId: string, email: string) {
  try {
    const db = getAdminDb();
    const [byId, byEmail, servicesSnap] = await Promise.all([
      db.collection('appointments').where('customerId', '==', customerId).get(),
      db.collection('appointments').where('clientEmail', '==', email).get(),
      db.collection('services').get(),
    ]);
    const priceOf = new Map<string, number>();
    servicesSnap.docs.forEach((d) => priceOf.set(d.id, (d.data().price as number) ?? 0));

    const seen = new Set<string>();
    let total = 0;
    for (const doc of [...byId.docs, ...byEmail.docs]) {
      if (seen.has(doc.id)) continue;
      seen.add(doc.id);
      const a = doc.data();
      if (a.status === 'completed') total += priceOf.get(a.serviceId) ?? 0;
    }
    return { success: true as const, total };
  } catch (error) {
    console.error('Error computing total spend:', error);
    return { success: false as const, error: 'Failed to compute total spend.' };
  }
}

/** GDPR export: the customer record + their appointments, timestamps as ISO strings. */
export async function exportCustomerData(customerId: string) {
  try {
    const db = getAdminDb();
    const doc = await db.collection(COLLECTION).doc(customerId).get();
    if (!doc.exists) return { success: false as const, error: 'Customer not found.' };
    const customer = doc.data() as Customer;

    const [byId, byEmail] = await Promise.all([
      db.collection('appointments').where('customerId', '==', customerId).get(),
      db.collection('appointments').where('clientEmail', '==', customer.email).get(),
    ]);
    const map = new Map<string, Record<string, unknown>>();
    for (const d of [...byId.docs, ...byEmail.docs]) map.set(d.id, { id: d.id, ...d.data() });

    // Firestore Timestamps → ISO strings so the payload serializes cleanly.
    const plain = JSON.parse(
      JSON.stringify({ customer: { ...customer, id: doc.id }, appointments: [...map.values()] }, (_k, v) =>
        v && typeof v === 'object' && typeof (v as { toDate?: unknown }).toDate === 'function'
          ? (v as { toDate: () => Date }).toDate().toISOString()
          : v
      )
    );
    return { success: true as const, data: plain };
  } catch (error) {
    console.error('Error exporting customer data:', error);
    return { success: false as const, error: 'Failed to export customer data.' };
  }
}

/** GDPR erasure: delete the customer record and all of their appointments. */
export async function hardDeleteCustomer(customerId: string) {
  try {
    const db = getAdminDb();
    const doc = await db.collection(COLLECTION).doc(customerId).get();
    if (!doc.exists) return { success: false as const, error: 'Customer not found.' };
    const email = (doc.data() as Customer).email;

    const [byId, byEmail] = await Promise.all([
      db.collection('appointments').where('customerId', '==', customerId).get(),
      db.collection('appointments').where('clientEmail', '==', email).get(),
    ]);
    const ids = new Set<string>([...byId.docs, ...byEmail.docs].map((d) => d.id));

    let batch = db.batch();
    let ops = 0;
    for (const id of ids) {
      batch.delete(db.collection('appointments').doc(id));
      if (++ops === 450) {
        await batch.commit();
        batch = db.batch();
        ops = 0;
      }
    }
    batch.delete(db.collection(COLLECTION).doc(customerId));
    await batch.commit();

    return { success: true as const, appointmentsDeleted: ids.size };
  } catch (error) {
    console.error('Error erasing customer:', error);
    return { success: false as const, error: 'Failed to erase customer data.' };
  }
}

/**
 * One-off (idempotent) backfill: build the customers collection from existing
 * appointments and link each appointment to its customer via customerId.
 * Rollups (totalVisits, lastVisitDate) are SET absolutely, so re-running is safe.
 */
export async function backfillCustomersFromAppointments() {
  try {
    const db = getAdminDb();
    const apptSnap = await db.collection('appointments').get();

    // Group appointments by normalized email.
    const groups = new Map<
      string,
      { name: string; phone: string; latestDate: string; docs: QueryDocumentSnapshot[] }
    >();

    for (const doc of apptSnap.docs) {
      const data = doc.data();
      const email = normalizeEmail(data.clientEmail ?? '');
      if (!email) continue;

      const date = data.appointmentDate ?? '';
      const group = groups.get(email);
      if (!group) {
        groups.set(email, {
          name: data.clientName ?? '',
          phone: data.clientPhone ?? '',
          latestDate: date,
          docs: [doc],
        });
      } else {
        group.docs.push(doc);
        // Prefer the contact info from the most recent appointment.
        if (date > group.latestDate) {
          group.latestDate = date;
          group.name = data.clientName ?? group.name;
          group.phone = data.clientPhone ?? group.phone;
        }
      }
    }

    let customersCreated = 0;
    let customersUpdated = 0;
    let appointmentsLinked = 0;
    const now = Timestamp.now();

    for (const [email, group] of groups) {
      // Find or create the customer for this email.
      const existing = await db.collection(COLLECTION).where('email', '==', email).limit(1).get();
      let customerId: string;

      const rollups = {
        totalVisits: group.docs.length,
        lastVisitDate: group.latestDate || null,
      };

      if (existing.empty) {
        const ref = await db.collection(COLLECTION).add({
          name: group.name,
          email,
          phone: group.phone,
          notes: '',
          tags: [],
          ...rollups,
          createdAt: now,
          updatedAt: now,
        });
        customerId = ref.id;
        customersCreated++;
      } else {
        customerId = existing.docs[0].id;
        await existing.docs[0].ref.update({ ...rollups, updatedAt: now });
        customersUpdated++;
      }

      // Link each appointment to the customer (batched, 500/limit).
      let batch = db.batch();
      let ops = 0;
      for (const doc of group.docs) {
        if (doc.data().customerId === customerId) continue;
        batch.update(doc.ref, { customerId });
        appointmentsLinked++;
        ops++;
        if (ops === 450) {
          await batch.commit();
          batch = db.batch();
          ops = 0;
        }
      }
      if (ops > 0) await batch.commit();
    }

    return {
      success: true,
      data: { customersCreated, customersUpdated, appointmentsLinked, emailsProcessed: groups.size },
    };
  } catch (error) {
    console.error('Error backfilling customers:', error);
    return { success: false, error: 'Failed to backfill customers.' };
  }
}

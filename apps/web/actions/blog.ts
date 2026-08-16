'use server';

import { Timestamp, type DocumentData } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { blogPostSchema, type BlogPostFormData } from '@mediterranea/shared/validations';
import type { BlogPost } from '@mediterranea/shared/types';

const COLLECTION = 'blog';

export interface PublicPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  coverImageUrl: string;
  authorName: string;
  seoTitle: string;
  seoDescription: string;
  publishedAt: string | null;
}

function toPublic(id: string, d: DocumentData): PublicPost {
  const pub = d.publishedAt as { toDate?: () => Date } | undefined;
  return {
    id,
    title: d.title ?? '',
    slug: d.slug ?? '',
    excerpt: d.excerpt ?? '',
    body: d.body ?? '',
    coverImageUrl: d.coverImageUrl ?? '',
    authorName: d.authorName ?? '',
    seoTitle: d.seoTitle ?? '',
    seoDescription: d.seoDescription ?? '',
    publishedAt: pub?.toDate ? pub.toDate().toISOString() : null,
  };
}

/** Published posts, newest first (public). */
export async function getPublishedPosts(): Promise<PublicPost[]> {
  try {
    const snap = await getAdminDb().collection(COLLECTION).where('status', '==', 'published').get();
    return snap.docs
      .map((d) => toPublic(d.id, d.data()))
      .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''));
  } catch (error) {
    console.error('getPublishedPosts failed:', error);
    return [];
  }
}

export async function getPublishedPost(slug: string): Promise<PublicPost | null> {
  try {
    const snap = await getAdminDb()
      .collection(COLLECTION)
      .where('slug', '==', slug)
      .where('status', '==', 'published')
      .limit(1)
      .get();
    if (snap.empty) return null;
    return toPublic(snap.docs[0].id, snap.docs[0].data());
  } catch (error) {
    console.error('getPublishedPost failed:', error);
    return null;
  }
}

// ── Admin ────────────────────────────────────────────────────────────────────────

export async function getAllPosts() {
  try {
    const snap = await getAdminDb().collection(COLLECTION).get();
    const posts = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as BlogPost)
      .sort((a, b) => (b.updatedAt?.toMillis?.() ?? 0) - (a.updatedAt?.toMillis?.() ?? 0));
    return { success: true as const, data: posts };
  } catch (error) {
    console.error('getAllPosts failed:', error);
    return { success: false as const, error: 'Failed to load posts.' };
  }
}

async function slugTaken(slug: string, exceptId?: string): Promise<boolean> {
  const snap = await getAdminDb().collection(COLLECTION).where('slug', '==', slug).limit(1).get();
  return !snap.empty && snap.docs[0].id !== exceptId;
}

export async function createPost(data: BlogPostFormData, authorName: string) {
  const parsed = blogPostSchema.safeParse(data);
  if (!parsed.success) return { success: false as const, error: parsed.error.flatten().fieldErrors };
  try {
    if (await slugTaken(parsed.data.slug)) {
      return { success: false as const, error: 'A post with this slug already exists.' };
    }
    const now = Timestamp.now();
    const ref = await getAdminDb().collection(COLLECTION).add({
      ...parsed.data,
      authorName: authorName || 'Mediterránea',
      publishedAt: parsed.data.status === 'published' ? now : null,
      createdAt: now,
      updatedAt: now,
    });
    return { success: true as const, id: ref.id };
  } catch (error) {
    console.error('createPost failed:', error);
    return { success: false as const, error: 'Failed to create the post.' };
  }
}

export async function updatePost(id: string, data: BlogPostFormData) {
  const parsed = blogPostSchema.safeParse(data);
  if (!parsed.success) return { success: false as const, error: parsed.error.flatten().fieldErrors };
  try {
    if (await slugTaken(parsed.data.slug, id)) {
      return { success: false as const, error: 'Another post uses this slug.' };
    }
    const db = getAdminDb();
    const doc = await db.collection(COLLECTION).doc(id).get();
    const prev = doc.data() as BlogPost | undefined;
    const now = Timestamp.now();
    // Set publishedAt the first time it becomes published.
    const publishedAt =
      parsed.data.status === 'published'
        ? prev?.publishedAt ?? now
        : null;

    await db.collection(COLLECTION).doc(id).update({
      ...parsed.data,
      publishedAt,
      updatedAt: now,
    });
    return { success: true as const };
  } catch (error) {
    console.error('updatePost failed:', error);
    return { success: false as const, error: 'Failed to update the post.' };
  }
}

export async function deletePost(id: string) {
  try {
    await getAdminDb().collection(COLLECTION).doc(id).delete();
    return { success: true as const };
  } catch (error) {
    console.error('deletePost failed:', error);
    return { success: false as const, error: 'Failed to delete the post.' };
  }
}

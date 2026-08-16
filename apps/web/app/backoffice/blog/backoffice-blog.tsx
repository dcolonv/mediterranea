'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Button, Input, Textarea, Select, Badge } from '@/components/ui';
import { getAllPosts, createPost, updatePost, deletePost } from '@/actions/blog';
import type { BlogPost, BlogStatus } from '@mediterranea/shared/types';
import type { BlogPostFormData } from '@mediterranea/shared/validations';

interface FormState {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  coverImageUrl: string;
  seoTitle: string;
  seoDescription: string;
  status: BlogStatus;
}

const EMPTY: FormState = {
  title: '',
  slug: '',
  excerpt: '',
  body: '',
  coverImageUrl: '',
  seoTitle: '',
  seoDescription: '',
  status: 'draft',
};

function slugify(t: string): string {
  return t.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function BackofficeBlog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null); // null=list, ''=new
  const [form, setForm] = useState<FormState>(EMPTY);
  const [slugEdited, setSlugEdited] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getAllPosts();
    if (res.success && res.data) setPosts(res.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function startNew() {
    setForm(EMPTY);
    setSlugEdited(false);
    setEditingId('');
    setError(null);
  }
  function startEdit(p: BlogPost) {
    setForm({
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt ?? '',
      body: p.body,
      coverImageUrl: p.coverImageUrl ?? '',
      seoTitle: p.seoTitle ?? '',
      seoDescription: p.seoDescription ?? '',
      status: p.status,
    });
    setSlugEdited(true);
    setEditingId(p.id);
    setError(null);
  }

  async function save() {
    if (!form.title.trim() || !form.slug.trim() || !form.body.trim()) {
      setError('Title, slug, and body are required.');
      return;
    }
    setSaving(true);
    const payload: BlogPostFormData = { ...form };
    const res = editingId ? await updatePost(editingId, payload) : await createPost(payload, '');
    setSaving(false);
    if (res.success) {
      setEditingId(null);
      await load();
    } else {
      setError(typeof res.error === 'string' ? res.error : 'Failed to save the post.');
    }
  }

  async function handleDelete(p: BlogPost) {
    if (!confirm(`Delete "${p.title}"?`)) return;
    const res = await deletePost(p.id);
    if (res.success) await load();
  }

  if (loading) return <div className="py-16 text-center text-white-50">Loading posts…</div>;

  if (editingId !== null) {
    return (
      <div className="max-w-2xl border border-white-10 bg-dark-800 p-8">
        <h2 className="mb-6 font-serif text-xl text-white">{editingId ? 'Edit post' : 'New post'}</h2>
        <div className="space-y-5">
          <Input
            id="b-title"
            label="Title"
            value={form.title}
            onChange={(e) =>
              setForm((f) => ({ ...f, title: e.target.value, slug: slugEdited ? f.slug : slugify(e.target.value) }))
            }
          />
          <Input
            id="b-slug"
            label="Slug"
            value={form.slug}
            onChange={(e) => {
              setSlugEdited(true);
              setForm({ ...form, slug: e.target.value });
            }}
          />
          <Textarea id="b-excerpt" label="Excerpt" value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} rows={2} />
          <Textarea id="b-body" label="Body" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={10} />
          <Input id="b-cover" label="Cover image URL (optional)" value={form.coverImageUrl} onChange={(e) => setForm({ ...form, coverImageUrl: e.target.value })} />
          <div className="grid gap-5 sm:grid-cols-2">
            <Input id="b-seotitle" label="SEO title (optional)" value={form.seoTitle} onChange={(e) => setForm({ ...form, seoTitle: e.target.value })} />
            <Select
              id="b-status"
              label="Status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as BlogStatus })}
              options={[
                { value: 'draft', label: 'Draft' },
                { value: 'published', label: 'Published' },
              ]}
            />
          </div>
          <Textarea id="b-seodesc" label="SEO description (optional)" value={form.seoDescription} onChange={(e) => setForm({ ...form, seoDescription: e.target.value })} rows={2} />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button variant="elegant" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save post'}
            </Button>
            <Button variant="ghost" onClick={() => setEditingId(null)} disabled={saving}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Button variant="elegant" onClick={startNew}>
          + New post
        </Button>
      </div>
      {posts.length === 0 ? (
        <div className="border border-white-10 bg-dark-800 p-16 text-center text-white-50">No posts yet.</div>
      ) : (
        <div className="space-y-4">
          {posts.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 border border-white-10 bg-dark-800 p-6">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="font-serif text-lg text-white">{p.title}</h3>
                  <Badge variant={p.status === 'published' ? 'completed' : 'pending'}>{p.status}</Badge>
                </div>
                <p className="mt-1 text-xs text-white-30">/init/blog/{p.slug}</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" size="sm" onClick={() => startEdit(p)}>
                  Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(p)} className="text-red-400 hover:bg-red-500/10 hover:text-red-300">
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

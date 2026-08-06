'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button, Select } from '@/components/ui';
import {
  listClientPhotos,
  uploadClientPhoto,
  deleteClientPhoto,
  type PhotoDTO,
} from '@/actions/photos';
import type { PhotoType } from '@mediterranea/shared/types';

export function PhotosPanel({ customerId }: { customerId: string }) {
  const [photos, setPhotos] = useState<PhotoDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [type, setType] = useState<PhotoType>('before');
  const [caption, setCaption] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await listClientPhotos(customerId);
    if (res.success) setPhotos(res.photos);
    else setError(res.error);
    setLoading(false);
  }, [customerId]);

  useEffect(() => {
    load();
  }, [load]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = ''; // allow re-selecting the same file
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    setError(null);
    setUploading(true);
    const fd = new FormData();
    fd.set('customerId', customerId);
    fd.set('type', type);
    fd.set('caption', caption);
    fd.set('file', file);
    const res = await uploadClientPhoto(fd);
    setUploading(false);
    if (res.success) {
      setCaption('');
      await load();
    } else {
      setError(res.error);
    }
  }

  async function onDelete(id: string) {
    if (!confirm('Delete this photo?')) return;
    const res = await deleteClientPhoto(id);
    if (res.success) setPhotos((prev) => prev.filter((p) => p.id !== id));
    else setError(res.error);
  }

  const before = photos.filter((p) => p.type === 'before');
  const after = photos.filter((p) => p.type === 'after');

  return (
    <div className="mt-6 border border-white-10 bg-dark-800 p-6">
      <h3 className="mb-4 font-serif text-lg text-white">Before &amp; after photos</h3>

      {/* Uploader */}
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="w-32">
          <Select
            id="photo-type"
            label="Type"
            value={type}
            onChange={(e) => setType(e.target.value as PhotoType)}
            options={[
              { value: 'before', label: 'Before' },
              { value: 'after', label: 'After' },
            ]}
          />
        </div>
        <div className="flex-1 min-w-[10rem]">
          <label className="mb-2 block text-sm font-medium tracking-wide text-white-70">
            Caption (optional)
          </label>
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="e.g. Session 1"
            className="h-12 w-full border border-white-10 bg-dark-900 px-4 text-white placeholder:text-white-30 focus:border-gold focus:outline-none"
          />
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
        <Button
          variant="elegant"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? 'Uploading…' : 'Upload photo'}
        </Button>
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      {loading ? (
        <p className="py-8 text-center text-white-50">Loading photos…</p>
      ) : photos.length === 0 ? (
        <p className="py-8 text-center text-white-50">No photos yet.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          <PhotoColumn title="Before" photos={before} onDelete={onDelete} />
          <PhotoColumn title="After" photos={after} onDelete={onDelete} />
        </div>
      )}
    </div>
  );
}

function PhotoColumn({
  title,
  photos,
  onDelete,
}: {
  title: string;
  photos: PhotoDTO[];
  onDelete: (id: string) => void;
}) {
  return (
    <div>
      <div className="mb-3 text-xs uppercase tracking-wider text-white-30">{title}</div>
      {photos.length === 0 ? (
        <p className="text-sm text-white-30">None.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {photos.map((p) => (
            <div key={p.id} className="group relative overflow-hidden border border-white-10">
              {/* eslint-disable-next-line @next/next/no-img-element -- signed Storage URL, not a static asset */}
              <img src={p.url} alt={p.caption || title} className="aspect-square w-full object-cover" />
              {p.caption && (
                <div className="absolute inset-x-0 bottom-0 bg-black/50 px-2 py-1 text-[11px] text-white">
                  {p.caption}
                </div>
              )}
              <button
                onClick={() => onDelete(p.id)}
                className="absolute right-1 top-1 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Delete photo"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

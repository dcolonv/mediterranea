'use client';

import { useState, useEffect } from 'react';
import { Button, Input, Textarea } from '@/components/ui';
import { getRecipe, saveRecipe } from '@/actions/recipes';

interface Step {
  text: string;
  minutes: string; // string in the form; converted on save
}

export function RecipeEditor({
  serviceId,
  serviceName,
  onClose,
}: {
  serviceId: string;
  serviceName: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [steps, setSteps] = useState<Step[]>([]);
  const [products, setProducts] = useState(''); // one per line
  const [deviceSettings, setDeviceSettings] = useState('');
  const [contraindications, setContraindications] = useState('');
  const [aftercare, setAftercare] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getRecipe(serviceId).then((r) => {
      setSteps(r.steps.map((s) => ({ text: s.text, minutes: s.minutes != null ? String(s.minutes) : '' })));
      setProducts(r.products.join('\n'));
      setDeviceSettings(r.deviceSettings);
      setContraindications(r.contraindications);
      setAftercare(r.aftercare);
      setLoading(false);
    });
  }, [serviceId]);

  function updateStep(i: number, patch: Partial<Step>) {
    setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
    setSaved(false);
  }
  function addStep() {
    setSteps((prev) => [...prev, { text: '', minutes: '' }]);
  }
  function removeStep(i: number) {
    setSteps((prev) => prev.filter((_, idx) => idx !== i));
  }
  function moveStep(i: number, dir: -1 | 1) {
    setSteps((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    const cleanSteps = steps
      .filter((s) => s.text.trim())
      .map((s) => ({
        text: s.text.trim(),
        ...(s.minutes.trim() && Number.isFinite(Number(s.minutes)) ? { minutes: Number(s.minutes) } : {}),
      }));
    const cleanProducts = products
      .split('\n')
      .map((p) => p.trim())
      .filter(Boolean);

    const res = await saveRecipe(serviceId, {
      steps: cleanSteps,
      products: cleanProducts,
      deviceSettings: deviceSettings.trim(),
      contraindications: contraindications.trim(),
      aftercare: aftercare.trim(),
    });
    setSaving(false);
    if (res.success) setSaved(true);
    else setError(res.error);
  }

  if (loading) {
    return <div className="py-16 text-center text-white-50">Loading recipe…</div>;
  }

  return (
    <div className="max-w-2xl border border-white-10 bg-dark-800 p-8">
      <div className="mb-6">
        <button onClick={onClose} className="text-sm text-white-50 transition-colors hover:text-white">
          ‹ Back to services
        </button>
        <h2 className="mt-3 font-serif text-xl text-white">Recipe · {serviceName}</h2>
        <p className="mt-1 text-sm text-white-50">
          The step-by-step protocol shown to practitioners in the mobile app.
        </p>
      </div>

      <div className="space-y-8">
        {/* Steps */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium tracking-wide text-white-70">Steps</span>
            <Button variant="ghost" size="sm" onClick={addStep} className="text-gold hover:text-gold-light">
              + Add step
            </Button>
          </div>
          {steps.length === 0 ? (
            <p className="text-sm text-white-30">No steps yet.</p>
          ) : (
            <div className="space-y-3">
              {steps.map((s, i) => (
                <div key={i} className="flex items-start gap-2 border border-white-10 bg-dark-900 p-3">
                  <span className="mt-3 w-5 shrink-0 text-center text-sm text-gold">{i + 1}</span>
                  <div className="flex-1 space-y-2">
                    <Textarea
                      value={s.text}
                      onChange={(e) => updateStep(i, { text: e.target.value })}
                      placeholder="What to do in this step…"
                      rows={2}
                    />
                    <div className="w-32">
                      <Input
                        type="number"
                        value={s.minutes}
                        onChange={(e) => updateStep(i, { minutes: e.target.value })}
                        placeholder="min"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button onClick={() => moveStep(i, -1)} className="px-2 text-white-50 hover:text-white" aria-label="Move up">
                      ↑
                    </button>
                    <button onClick={() => moveStep(i, 1)} className="px-2 text-white-50 hover:text-white" aria-label="Move down">
                      ↓
                    </button>
                    <button
                      onClick={() => removeStep(i)}
                      className="px-2 text-red-400 hover:text-red-300"
                      aria-label="Remove step"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Textarea
          id="rec-products"
          label="Products (one per line)"
          value={products}
          onChange={(e) => {
            setProducts(e.target.value);
            setSaved(false);
          }}
          rows={4}
          placeholder={'Cleanser X\nSerum Y\nSPF 50'}
        />
        <Textarea
          id="rec-device"
          label="Device / machine settings"
          value={deviceSettings}
          onChange={(e) => {
            setDeviceSettings(e.target.value);
            setSaved(false);
          }}
          rows={3}
        />
        <Textarea
          id="rec-contra"
          label="Contraindications"
          value={contraindications}
          onChange={(e) => {
            setContraindications(e.target.value);
            setSaved(false);
          }}
          rows={3}
        />
        <Textarea
          id="rec-aftercare"
          label="Aftercare"
          value={aftercare}
          onChange={(e) => {
            setAftercare(e.target.value);
            setSaved(false);
          }}
          rows={3}
        />

        <div className="flex items-center gap-4">
          <Button variant="elegant" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save Recipe'}
          </Button>
          {saved && <span className="text-sm text-green-400">Saved.</span>}
          {error && <span className="text-sm text-red-400">{error}</span>}
        </div>
      </div>
    </div>
  );
}

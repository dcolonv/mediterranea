import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { fetchRecipe, type RecipeDTO } from '@/src/api/client';
import { colors, spacing, radius } from '@/src/theme';

function hasContent(r: RecipeDTO): boolean {
  return (
    r.steps.length > 0 ||
    r.products.length > 0 ||
    Boolean(r.deviceSettings || r.contraindications || r.aftercare)
  );
}

export function TreatmentRecipe({
  serviceId,
  getToken,
}: {
  serviceId: string;
  getToken: () => Promise<string | null>;
}) {
  const [recipe, setRecipe] = useState<RecipeDTO | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      setRecipe(await fetchRecipe(token, serviceId));
    } catch {
      /* non-fatal — recipe just won't show */
    } finally {
      setLoading(false);
    }
  }, [getToken, serviceId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <ActivityIndicator color={colors.gold} style={{ marginVertical: spacing.md }} />;
  if (!recipe || !hasContent(recipe)) {
    return <Text style={styles.empty}>No recipe for this treatment yet.</Text>;
  }

  return (
    <View style={styles.card}>
      {recipe.steps.length > 0 && (
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Steps</Text>
          {recipe.steps.map((s, i) => (
            <View key={i} style={styles.step}>
              <Text style={styles.stepNum}>{i + 1}</Text>
              <Text style={styles.stepText}>
                {s.text}
                {s.minutes != null ? <Text style={styles.stepMin}>  ·  {s.minutes} min</Text> : null}
              </Text>
            </View>
          ))}
        </View>
      )}

      {recipe.products.length > 0 && (
        <Field label="Products" value={recipe.products.map((p) => `• ${p}`).join('\n')} />
      )}
      {recipe.deviceSettings ? <Field label="Device settings" value={recipe.deviceSettings} /> : null}
      {recipe.contraindications ? (
        <Field label="Contraindications" value={recipe.contraindications} warn />
      ) : null}
      {recipe.aftercare ? <Field label="Aftercare" value={recipe.aftercare} /> : null}
    </View>
  );
}

function Field({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <View style={styles.block}>
      <Text style={[styles.blockTitle, warn && { color: colors.danger }]}>{label}</Text>
      <Text style={styles.blockText}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  block: { gap: spacing.xs },
  blockTitle: {
    fontSize: 12,
    color: colors.gold,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  blockText: { fontSize: 15, color: colors.inkSoft, lineHeight: 22 },
  step: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    backgroundColor: colors.goldTint,
    color: colors.goldDark,
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
  },
  stepText: { flex: 1, fontSize: 15, color: colors.ink, lineHeight: 22 },
  stepMin: { color: colors.inkMuted, fontSize: 13 },
  empty: { fontSize: 14, color: colors.inkMuted },
});

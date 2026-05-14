// src/components/admin/ModelConfigPanel.tsx
// Read-only display of system model configuration from Firestore.
import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Info } from 'lucide-react';

interface ModelConfigData {
  activeModelName?: string;
  provider?: string;
  endpoint?: string;
  maxTokens?: number;
  temperature?: number;
  contextWindow?: number;
  fineTuneStatus?: string;
  lastUpdated?: { toDate?: () => Date } | Date;
}

const FALLBACK = '—';

function formatValue<T>(value: T | undefined | null, fallback = FALLBACK): string {
  if (value === undefined || value === null) return fallback;
  return String(value);
}

function formatDate(val: ModelConfigData['lastUpdated']): string {
  if (!val) return FALLBACK;
  if (val instanceof Date) return val.toLocaleString();
  if (typeof val.toDate === 'function') return val.toDate().toLocaleString();
  return FALLBACK;
}

interface InfoCardProps {
  label: string;
  value: string;
  accent?: boolean;
}

function InfoCard({ label, value, accent }: InfoCardProps) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        accent
          ? 'bg-sky-50 border-sky-200'
          : 'bg-white border-[#dde3eb]'
      }`}
    >
      <p className="text-xs font-medium text-[#5a6578] uppercase tracking-wide mb-1">
        {label}
      </p>
      <p
        className={`text-base font-semibold ${
          value === FALLBACK ? 'text-slate-400' : 'text-[#0a1628]'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export function ModelConfigPanel() {
  const [config, setConfig] = useState<ModelConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const ref = doc(db, 'settings', 'modelConfig');
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setConfig(snap.data() as ModelConfigData);
        } else {
          // No doc at all — show all fallbacks gracefully
          setConfig({});
        }
      } catch (e: any) {
        setError(e.message ?? 'Failed to load model configuration');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-[#5a6578]">Loading model configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Read-only notice */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800">
        <Info size={16} className="mt-0.5 flex-shrink-0" />
        <p className="text-xs leading-relaxed">
          This configuration is managed by the system and cannot be edited here.
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600">Error: {error}</p>
      )}

      {/* Info cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <InfoCard
          label="Active Model Name"
          value={formatValue(config?.activeModelName)}
        />
        <InfoCard
          label="Provider / Endpoint"
          value={
            config?.endpoint
              ? `${formatValue(config?.provider)} — ${config.endpoint}`
              : formatValue(config?.provider)
          }
        />
        <InfoCard
          label="Max Tokens"
          value={formatValue(config?.maxTokens)}
        />
        <InfoCard
          label="Temperature"
          value={formatValue(config?.temperature)}
        />
        <InfoCard
          label="Context Window"
          value={formatValue(config?.contextWindow)}
        />
        <InfoCard
          label="Fine-tune Status"
          value={formatValue(config?.fineTuneStatus)}
          accent
        />
      </div>

      {/* Last updated */}
      <div className="pt-4 border-t border-[#dde3eb]">
        <p className="text-xs text-[#5a6578]">
          Last updated:{' '}
          <span className="font-medium text-[#0a1628]">
            {formatDate(config?.lastUpdated)}
          </span>
        </p>
      </div>
    </div>
  );
}
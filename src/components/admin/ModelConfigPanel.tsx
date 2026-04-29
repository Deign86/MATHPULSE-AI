// src/components/admin/ModelConfigPanel.tsx
import { useState, useEffect } from "react";

interface ModelConfig {
  profile: string;
  overrides: Record<string, string>;
  resolved: Record<string, string>;
  availableProfiles: string[];
  profileDescriptions: Record<string, string>;
}

const PROFILE_BADGE_COLORS: Record<string, string> = {
  dev:    "bg-blue-100 text-blue-800 border-blue-300",
  budget: "bg-yellow-100 text-yellow-800 border-yellow-300",
  prod:   "bg-green-100 text-green-800 border-green-300",
};

export function ModelConfigPanel() {
  const [config, setConfig]       = useState<ModelConfig | null>(null);
  const [loading, setLoading]     = useState(true);
  const [switching, setSwitching] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const reload = () => {
    setLoading(true);
    fetch("/api/admin/model-config", { credentials: "include" })
      .then((r) => r.json())
      .then(setConfig)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, []);

  const handleSwitch = async (profile: string) => {
    setSwitching(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/model-config/profile", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setConfig((prev) => prev
        ? { ...prev, profile, resolved: data.applied?.resolved ?? prev.resolved }
        : prev
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSwitching(false);
    }
  };

  const handleReset = async () => {
    setSwitching(true);
    await fetch("/api/admin/model-config/reset", { method: "DELETE", credentials: "include" });
    reload();
    setSwitching(false);
  };

  if (loading) return (
    <div data-testid="model-config-loading" className="admin-card">Loading model config...</div>
  );
  if (!config) return (
    <div data-testid="model-config-error" className="admin-card text-red-500">
      {error ?? "Failed to load"}
    </div>
  );

  return (
    <div data-testid="model-config-panel" className="admin-card space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">AI Model Configuration</h2>
        <button
          data-testid="model-config-reset"
          onClick={handleReset}
          disabled={switching}
          className="text-sm text-gray-500 hover:text-red-500 transition"
        >
          Reset to .env defaults
        </button>
      </div>

      {error && (
        <p data-testid="model-config-inline-error" className="text-red-500 text-sm">{error}</p>
      )}

      {/* Profile Switcher */}
      <div data-testid="profile-switcher">
        <p className="text-sm text-gray-500 mb-2">
          Switch instantly — no restart required. Persisted across backend restarts.
        </p>
        <div className="grid grid-cols-3 gap-3">
          {config.availableProfiles.map((p) => (
            <button
              key={p}
              data-testid={`profile-btn-${p}`}
              data-active={config.profile === p ? "true" : "false"}
              onClick={() => handleSwitch(p)}
              disabled={switching}
              className={`
                rounded-lg border-2 p-3 text-left transition
                ${config.profile === p
                  ? `${PROFILE_BADGE_COLORS[p] ?? "bg-gray-100"} border-current font-semibold`
                  : "border-gray-200 hover:border-gray-400 bg-white"
                }
                ${switching ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              `}
            >
              <div className="font-medium capitalize">{p}</div>
              <div className="text-xs mt-1 text-gray-600">
                {config.profileDescriptions[p]}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Resolved Models Table */}
      <div data-testid="resolved-models-table">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Active Model Per Task</h3>
        <table className="w-full text-sm border rounded overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Task</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Model</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(config.resolved).map(([task, model], i) => (
              <tr key={task} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="px-3 py-2 text-gray-700">{task}</td>
                <td
                  data-testid={`resolved-model-${task}`}
                  className="px-3 py-2 font-mono text-xs text-indigo-700"
                >
                  {model}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Active Overrides Badge */}
      {Object.keys(config.overrides).length > 0 && (
        <div data-testid="active-overrides" className="text-xs text-gray-500">
          <span className="font-medium">Runtime overrides active: </span>
          {Object.entries(config.overrides).map(([k, v]) => (
            <span key={k} data-testid={`override-badge-${k}`}
              className="inline-block bg-gray-100 rounded px-1 mx-0.5">
              {k}={v}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
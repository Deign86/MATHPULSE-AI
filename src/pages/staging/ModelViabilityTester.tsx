import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  RefreshCw,
  ServerCrash,
  ShieldAlert,
  SlidersHorizontal,
  SplitSquareVertical,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../components/ui/utils';
import { stagingConfig } from '../../config/staging';
import type {
  BackendConnectionConfig,
  EndpointHealthStatus,
  NormalizedModelResponse,
  ComparisonRequestOptions,
} from '../../lib/staging/comparisonTypes';
import { probeHuggingFaceEndpoint, requestHuggingFaceComparison } from '../../lib/staging/hfClient';
import { probeVllmEndpoint, requestVllmComparison } from '../../lib/staging/vllmClient';
import {
  COMPARISON_BATCH_CASES,
  SUBJECT_PRESETS,
  evaluateLightweightHeuristics,
  summarizeDualHeuristics,
  truncatePreview,
  type SubjectPreset,
} from '../../lib/staging/viabilityHeuristics';

type PanelSide = 'base' | 'candidate';
type WinnerChoice = 'base' | 'candidate' | 'tie' | '';
type ScoreKey = 'correctness' | 'clarity' | 'usefulness';

interface RuntimeConfigState {
  hfBaseUrl: string;
  hfBaseModel: string;
  hfApiKey: string;
  vllmBaseUrl: string;
  vllmModel: string;
  vllmApiKey: string;
}

interface SideScore {
  correctness: number;
  clarity: number;
  usefulness: number;
}

interface BatchComparisonRow {
  id: string;
  label: string;
  category: string;
  prompt: string;
  baseResult: NormalizedModelResponse;
  candidateResult: NormalizedModelResponse;
  heuristicNotes: string[];
  winner: WinnerChoice;
}

const healthToneMap: Record<EndpointHealthStatus['status'], string> = {
  online: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  degraded: 'bg-amber-100 text-amber-900 border-amber-200',
  offline: 'bg-rose-100 text-rose-900 border-rose-200',
};

const sideToneMap: Record<PanelSide, string> = {
  base: 'border-cyan-200 bg-cyan-50/70',
  candidate: 'border-indigo-200 bg-indigo-50/70',
};

const scoreChoices = [1, 2, 3, 4, 5];

const subjectHelperMap: Record<SubjectPreset, string> = {
  'General Math': 'Provide concise and accurate math solutions suitable for Grade 11 and 12 students.',
  Algebra: 'Show algebraic steps clearly and explain each transformation briefly.',
  Geometry: 'Use geometric properties clearly and justify each conclusion.',
  Statistics: 'Show formulas, substitutions, and final interpretation.',
  'Pre-Calculus': 'Focus on function behavior, intercepts, and symbolic reasoning.',
  'Business Math': 'Use practical business context and include units in final answers.',
};

const defaultScores: SideScore = {
  correctness: 3,
  clarity: 3,
  usefulness: 3,
};

const ModelViabilityTester: React.FC = () => {
  const envDefaults = useMemo<RuntimeConfigState>(
    () => ({
      hfBaseUrl: stagingConfig.hfBaseUrl,
      hfBaseModel: stagingConfig.hfBaseModel,
      hfApiKey: stagingConfig.hfApiKey,
      vllmBaseUrl: stagingConfig.vllmBaseUrl,
      vllmModel: stagingConfig.vllmModel,
      vllmApiKey: stagingConfig.vllmApiKey,
    }),
    [],
  );

  const [runtimeConfig, setRuntimeConfig] = useState<RuntimeConfigState>(envDefaults);

  const [subjectPreset, setSubjectPreset] = useState<SubjectPreset>('General Math');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [temperature, setTemperature] = useState(0.4);
  const [maxTokens, setMaxTokens] = useState(512);
  const [topP, setTopP] = useState(0.95);

  const [baseHealth, setBaseHealth] = useState<EndpointHealthStatus | null>(null);
  const [candidateHealth, setCandidateHealth] = useState<EndpointHealthStatus | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  const [baseResult, setBaseResult] = useState<NormalizedModelResponse | null>(null);
  const [candidateResult, setCandidateResult] = useState<NormalizedModelResponse | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [expandedPanels, setExpandedPanels] = useState<Record<PanelSide, boolean>>({
    base: true,
    candidate: true,
  });
  const [showRaw, setShowRaw] = useState<Record<PanelSide, boolean>>({
    base: false,
    candidate: false,
  });
  const [copyState, setCopyState] = useState<Record<PanelSide, 'idle' | 'copied' | 'failed'>>({
    base: 'idle',
    candidate: 'idle',
  });

  const [winnerChoice, setWinnerChoice] = useState<WinnerChoice>('');
  const [manualScores, setManualScores] = useState<Record<PanelSide, SideScore>>({
    base: { ...defaultScores },
    candidate: { ...defaultScores },
  });

  const [batchRows, setBatchRows] = useState<BatchComparisonRow[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);

  const selectedSystemHint = useMemo(() => subjectHelperMap[subjectPreset], [subjectPreset]);

  const toConnectionConfig = (side: PanelSide): BackendConnectionConfig => {
    if (side === 'base') {
      return {
        baseUrl: runtimeConfig.hfBaseUrl,
        model: runtimeConfig.hfBaseModel,
        apiKey: runtimeConfig.hfApiKey,
      };
    }

    return {
      baseUrl: runtimeConfig.vllmBaseUrl,
      model: runtimeConfig.vllmModel,
      apiKey: runtimeConfig.vllmApiKey,
    };
  };

  const refreshHealth = async (): Promise<void> => {
    setHealthLoading(true);

    try {
      const [hfStatus, vllmStatus] = await Promise.all([
        probeHuggingFaceEndpoint(toConnectionConfig('base')),
        probeVllmEndpoint(toConnectionConfig('candidate')),
      ]);

      setBaseHealth(hfStatus);
      setCandidateHealth(vllmStatus);
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    void refreshHealth();
  }, []);

  const updateRuntimeConfig = (key: keyof RuntimeConfigState, value: string): void => {
    setRuntimeConfig((prev) => ({ ...prev, [key]: value }));
  };

  const resetRuntimeConfigToEnv = (): void => {
    setRuntimeConfig(envDefaults);
  };

  const requestPayload = (promptText: string): ComparisonRequestOptions => ({
    systemPrompt: systemPrompt.trim() || selectedSystemHint,
    userPrompt: promptText,
    temperature,
    maxTokens,
    topP,
  });

  const runComparison = async (): Promise<void> => {
    if (!userPrompt.trim()) {
      setErrorMessage('Please enter a prompt to compare outputs.');
      return;
    }

    setComparisonLoading(true);
    setErrorMessage('');
    setCopyState({ base: 'idle', candidate: 'idle' });

    try {
      const [hfResponse, vllmResponse] = await Promise.all([
        requestHuggingFaceComparison(toConnectionConfig('base'), requestPayload(userPrompt.trim())),
        requestVllmComparison(toConnectionConfig('candidate'), requestPayload(userPrompt.trim())),
      ]);

      setBaseResult(hfResponse);
      setCandidateResult(vllmResponse);
      setWinnerChoice('');
      await refreshHealth();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setComparisonLoading(false);
    }
  };

  const runComparisonBatch = async (): Promise<void> => {
    setBatchLoading(true);
    setBatchRows([]);
    setErrorMessage('');

    try {
      for (const testCase of COMPARISON_BATCH_CASES) {
        const [hfResponse, vllmResponse] = await Promise.all([
          requestHuggingFaceComparison(toConnectionConfig('base'), requestPayload(testCase.prompt)),
          requestVllmComparison(toConnectionConfig('candidate'), requestPayload(testCase.prompt)),
        ]);

        const hfHeuristics = evaluateLightweightHeuristics(
          hfResponse.text,
          hfResponse.latencyMs,
          stagingConfig.quickCheckLatencyThresholdMs,
        );
        const vllmHeuristics = evaluateLightweightHeuristics(
          vllmResponse.text,
          vllmResponse.latencyMs,
          stagingConfig.quickCheckLatencyThresholdMs,
        );

        const heuristicNotes = [
          summarizeDualHeuristics(hfHeuristics, vllmHeuristics),
          `HF notes: ${hfHeuristics.notes.join(' ')}`,
          `vLLM notes: ${vllmHeuristics.notes.join(' ')}`,
        ];

        const heuristicWinner: WinnerChoice =
          hfHeuristics.pass && !vllmHeuristics.pass
            ? 'base'
            : !hfHeuristics.pass && vllmHeuristics.pass
              ? 'candidate'
              : 'tie';

        setBatchRows((prev) => [
          ...prev,
          {
            id: testCase.id,
            label: testCase.label,
            category: testCase.category,
            prompt: testCase.prompt,
            baseResult: hfResponse,
            candidateResult: vllmResponse,
            heuristicNotes,
            winner: heuristicWinner,
          },
        ]);
      }

      await refreshHealth();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBatchLoading(false);
    }
  };

  const updateBatchWinner = (rowId: string, winner: WinnerChoice): void => {
    setBatchRows((prev) => prev.map((row) => (row.id === rowId ? { ...row, winner } : row)));
  };

  const toggleExpanded = (side: PanelSide): void => {
    setExpandedPanels((prev) => ({ ...prev, [side]: !prev[side] }));
  };

  const toggleRaw = (side: PanelSide): void => {
    setShowRaw((prev) => ({ ...prev, [side]: !prev[side] }));
  };

  const handleCopy = async (side: PanelSide, value: string): Promise<void> => {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      setCopyState((prev) => ({ ...prev, [side]: 'copied' }));
    } catch {
      setCopyState((prev) => ({ ...prev, [side]: 'failed' }));
    }
  };

  const updateScore = (side: PanelSide, key: ScoreKey, value: string): void => {
    const parsed = Number(value);
    const safe = Number.isFinite(parsed) ? Math.max(1, Math.min(5, parsed)) : 3;

    setManualScores((prev) => ({
      ...prev,
      [side]: {
        ...prev[side],
        [key]: safe,
      },
    }));
  };

  const selectPromptFromBatch = (prompt: string, subject: SubjectPreset): void => {
    setUserPrompt(prompt);
    setSubjectPreset(subject);
    setErrorMessage('');
  };

  const renderHealthBadge = (health: EndpointHealthStatus | null): React.ReactNode => {
    const text = health ? `${health.status.toUpperCase()} (${health.source})` : 'CHECKING';
    const tone = health ? healthToneMap[health.status] : 'bg-slate-100 text-slate-700 border-slate-200';

    return <Badge className={cn('border', tone)}>{text}</Badge>;
  };

  const renderPanel = (
    side: PanelSide,
    label: string,
    result: NormalizedModelResponse | null,
    health: EndpointHealthStatus | null,
  ): React.ReactNode => {
    return (
      <Card className={cn('border shadow-sm', sideToneMap[side])}>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-lg">{label}</CardTitle>
              <CardDescription>{side === 'base' ? 'Backend: Hugging Face Inference' : 'Backend: Fine-Tuned vLLM'}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {renderHealthBadge(health)}
              <Button variant="outline" size="sm" onClick={() => toggleExpanded(side)}>
                {expandedPanels[side] ? (
                  <>
                    <ChevronUp className="mr-2 h-4 w-4" />
                    Collapse
                  </>
                ) : (
                  <>
                    <ChevronDown className="mr-2 h-4 w-4" />
                    Expand
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        {expandedPanels[side] && (
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div>
                  <div className="text-xs uppercase text-slate-500">Model</div>
                  <div className="font-semibold text-slate-800">{result?.model || (side === 'base' ? runtimeConfig.hfBaseModel || 'Not set' : runtimeConfig.vllmModel || 'Not set')}</div>
                </div>
                <div>
                  <div className="text-xs uppercase text-slate-500">Latency</div>
                  <div className="font-semibold text-slate-800">{result ? `${result.latencyMs} ms` : 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs uppercase text-slate-500">Total tokens</div>
                  <div className="font-semibold text-slate-800">{result?.totalTokens ?? 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs uppercase text-slate-500">Finish reason</div>
                  <div className="font-semibold text-slate-800">{result?.finishReason || 'N/A'}</div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="text-xs uppercase text-slate-500">Response text</div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => toggleRaw(side)}>
                    {showRaw[side] ? 'Hide raw JSON' : 'Show raw JSON'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleCopy(side, result?.text || '')}
                    disabled={!result?.text}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    {copyState[side] === 'copied' ? 'Copied' : copyState[side] === 'failed' ? 'Copy failed' : 'Copy'}
                  </Button>
                </div>
              </div>

              {result?.error ? (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">{result.error}</div>
              ) : (
                <p className="whitespace-pre-wrap leading-relaxed text-slate-800">{result?.text || 'No output yet.'}</p>
              )}

              <p className="mt-2 text-xs text-slate-500">Endpoint: {result?.endpoint || (side === 'base' ? runtimeConfig.hfBaseUrl : runtimeConfig.vllmBaseUrl)}</p>
              <p className="mt-1 text-xs text-slate-500">Health detail: {health?.detail || 'Checking...'}</p>
            </div>

            {showRaw[side] && (
              <pre className="max-h-72 overflow-auto rounded-lg border border-slate-200 bg-slate-950 p-3 text-xs text-slate-100">
                {JSON.stringify(result?.raw ?? null, null, 2)}
              </pre>
            )}
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-cyan-50 to-indigo-50 text-slate-900">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 rounded-xl border border-amber-300 bg-amber-100 px-4 py-3 text-amber-950 shadow-sm">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <ShieldAlert className="h-4 w-4" />
            STAGING ONLY - Hugging Face vs Fine-Tuned vLLM Comparison
          </p>
          <p className="mt-1 text-xs text-amber-900">
            Internal evaluation workflow only. No production routing or persistence.
          </p>
        </div>

        <Card className="mb-6 border-slate-200 bg-white/95 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <SlidersHorizontal className="h-5 w-5" />
              Config Panel
            </CardTitle>
            <CardDescription>
              Env defaults are preloaded. UI overrides are in-memory only and resettable.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-3">
                <div className="mb-2 text-sm font-semibold text-cyan-900">Base Model (Hugging Face Inference)</div>
                <div className="space-y-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">HF base URL</label>
                    <Input value={runtimeConfig.hfBaseUrl} onChange={(event) => updateRuntimeConfig('hfBaseUrl', event.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">HF base model</label>
                    <Input value={runtimeConfig.hfBaseModel} onChange={(event) => updateRuntimeConfig('hfBaseModel', event.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">HF API key (optional)</label>
                    <Input
                      type="password"
                      value={runtimeConfig.hfApiKey}
                      onChange={(event) => updateRuntimeConfig('hfApiKey', event.target.value)}
                      placeholder="Bearer token (kept in memory only)"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3">
                <div className="mb-2 text-sm font-semibold text-indigo-900">Fine-Tuned Model (vLLM)</div>
                <div className="space-y-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">vLLM endpoint URL</label>
                    <Input value={runtimeConfig.vllmBaseUrl} onChange={(event) => updateRuntimeConfig('vllmBaseUrl', event.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">vLLM model name</label>
                    <Input value={runtimeConfig.vllmModel} onChange={(event) => updateRuntimeConfig('vllmModel', event.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">vLLM API key (optional)</label>
                    <Input
                      type="password"
                      value={runtimeConfig.vllmApiKey}
                      onChange={(event) => updateRuntimeConfig('vllmApiKey', event.target.value)}
                      placeholder="Bearer token (kept in memory only)"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={resetRuntimeConfigToEnv}>Reset to env defaults</Button>
              <Button variant="outline" onClick={() => void refreshHealth()} disabled={healthLoading}>
                <RefreshCw className={cn('mr-2 h-4 w-4', healthLoading && 'animate-spin')} />
                Refresh endpoint health
              </Button>
              {renderHealthBadge(baseHealth)}
              {renderHealthBadge(candidateHealth)}
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6 border-slate-200 bg-white/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Shared Prompt Composer</CardTitle>
            <CardDescription>Same prompt and generation settings are sent to both backends in parallel.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Subject preset</label>
                <Select value={subjectPreset} onValueChange={(value) => setSubjectPreset(value as SubjectPreset)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECT_PRESETS.map((subject) => (
                      <SelectItem key={subject} value={subject}>
                        {subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Temperature</label>
                <Input
                  type="number"
                  min={0}
                  max={2}
                  step={0.1}
                  value={temperature}
                  onChange={(event) => setTemperature(Number(event.target.value))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Max tokens</label>
                <Input
                  type="number"
                  min={32}
                  max={4096}
                  step={1}
                  value={maxTokens}
                  onChange={(event) => setMaxTokens(Number(event.target.value))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Top p</label>
                <Input
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  value={topP}
                  onChange={(event) => setTopP(Number(event.target.value))}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Optional system prompt</label>
              <Textarea
                rows={3}
                value={systemPrompt}
                onChange={(event) => setSystemPrompt(event.target.value)}
                placeholder={selectedSystemHint}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">User prompt</label>
              <Textarea
                rows={8}
                value={userPrompt}
                onChange={(event) => setUserPrompt(event.target.value)}
                placeholder="Enter a math prompt that will be sent to both base and fine-tuned models."
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {COMPARISON_BATCH_CASES.map((testCase) => (
                <Button
                  key={testCase.id}
                  variant="outline"
                  size="sm"
                  onClick={() => selectPromptFromBatch(testCase.prompt, testCase.subject)}
                >
                  {testCase.label}
                </Button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => void runComparison()} disabled={comparisonLoading || batchLoading}>
                {comparisonLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Comparing...
                  </>
                ) : (
                  <>
                    <SplitSquareVertical className="mr-2 h-4 w-4" />
                    Compare responses
                  </>
                )}
              </Button>

              <Button variant="outline" onClick={() => void runComparisonBatch()} disabled={batchLoading || comparisonLoading}>
                {batchLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Running comparison batch...
                  </>
                ) : (
                  'Run comparison batch'
                )}
              </Button>

              <Badge variant="outline">Lightweight viability check only (non-authoritative)</Badge>
            </div>

            {errorMessage && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</div>}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {renderPanel('base', 'Base Model (Hugging Face Inference)', baseResult, baseHealth)}
          {renderPanel('candidate', 'Fine-Tuned Model (vLLM)', candidateResult, candidateHealth)}
        </div>

        <Card className="mt-6 border-slate-200 bg-white/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Manual Evaluation Controls</CardTitle>
            <CardDescription>
              Human decision inputs only. No automated judging claims.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={winnerChoice === 'base' ? 'default' : 'outline'}
                onClick={() => setWinnerChoice('base')}
              >
                Base is better
              </Button>
              <Button
                variant={winnerChoice === 'candidate' ? 'default' : 'outline'}
                onClick={() => setWinnerChoice('candidate')}
              >
                Fine-tuned is better
              </Button>
              <Button
                variant={winnerChoice === 'tie' ? 'default' : 'outline'}
                onClick={() => setWinnerChoice('tie')}
              >
                Tie / unclear
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-3">
                <div className="mb-2 text-sm font-semibold text-cyan-900">Base model manual scores</div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {(['correctness', 'clarity', 'usefulness'] as ScoreKey[]).map((metric) => (
                    <div key={`base-${metric}`}>
                      <label className="mb-1 block text-xs uppercase text-slate-600">{metric}</label>
                      <Select
                        value={String(manualScores.base[metric])}
                        onValueChange={(value) => updateScore('base', metric, value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {scoreChoices.map((score) => (
                            <SelectItem key={`base-${metric}-${score}`} value={String(score)}>
                              {score}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3">
                <div className="mb-2 text-sm font-semibold text-indigo-900">Fine-tuned manual scores</div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {(['correctness', 'clarity', 'usefulness'] as ScoreKey[]).map((metric) => (
                    <div key={`candidate-${metric}`}>
                      <label className="mb-1 block text-xs uppercase text-slate-600">{metric}</label>
                      <Select
                        value={String(manualScores.candidate[metric])}
                        onValueChange={(value) => updateScore('candidate', metric, value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {scoreChoices.map((score) => (
                            <SelectItem key={`candidate-${metric}-${score}`} value={String(score)}>
                              {score}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6 border-slate-200 bg-white/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Quick Batch Comparison</CardTitle>
            <CardDescription>
              Lightweight viability check rows for algebra, geometry, statistics, business math, and pre-calculus.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {batchRows.length === 0 && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                Run comparison batch to populate side-by-side quick-check rows.
              </div>
            )}

            {batchRows.map((row) => (
              <div key={row.id} className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{row.label}</div>
                    <div className="text-xs uppercase text-slate-500">{row.category}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={row.winner === 'base' ? 'default' : 'outline'}
                      onClick={() => updateBatchWinner(row.id, 'base')}
                    >
                      Base
                    </Button>
                    <Button
                      size="sm"
                      variant={row.winner === 'candidate' ? 'default' : 'outline'}
                      onClick={() => updateBatchWinner(row.id, 'candidate')}
                    >
                      Fine-tuned
                    </Button>
                    <Button
                      size="sm"
                      variant={row.winner === 'tie' ? 'default' : 'outline'}
                      onClick={() => updateBatchWinner(row.id, 'tie')}
                    >
                      Tie
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-md border border-cyan-200 bg-cyan-50 px-3 py-2">
                    <div className="text-xs font-semibold uppercase text-cyan-900">HF preview</div>
                    <div className="text-sm text-slate-800">{truncatePreview(row.baseResult.text || row.baseResult.error || 'No output')}</div>
                    <div className="mt-1 text-xs text-slate-600">HF latency: {row.baseResult.latencyMs} ms</div>
                  </div>
                  <div className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2">
                    <div className="text-xs font-semibold uppercase text-indigo-900">vLLM preview</div>
                    <div className="text-sm text-slate-800">{truncatePreview(row.candidateResult.text || row.candidateResult.error || 'No output')}</div>
                    <div className="mt-1 text-xs text-slate-600">vLLM latency: {row.candidateResult.latencyMs} ms</div>
                  </div>
                </div>

                <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                  {row.heuristicNotes.map((note, index) => (
                    <p key={`${row.id}-note-${index}`}>{note}</p>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ModelViabilityTester;

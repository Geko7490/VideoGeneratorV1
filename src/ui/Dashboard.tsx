import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { cancelGeneration, generateVideo, preflightModels, type MissingModel } from '../core/pipeline';
import { formatSize } from '../models/registry';
import { formatBytes } from '../utils/fileUtils';
import { Badge, Btn, inputCls } from './common';
import { LeftPanel } from './LeftPanel';
import { Preview } from './Preview';
import { SceneList } from './SceneList';
import { SceneInspector, StyleBibleEditor } from './SceneInspector';
import { Timeline } from './Timeline';
import { ModelManagerPanel } from './ModelManagerPanel';
import { ProjectManager } from './ProjectManager';
import { AudioPanel } from './AudioPanel';
import { BuildExportModal } from './BuildExportModal';
import { cn } from '../utils/cn';

export function Dashboard() {
  const { project, setProject, models, hardware, memory, busy, modal, setModal, selectedSceneId } = useStore();
  const s = project.settings;
  const [needed, setNeeded] = useState<MissingModel[] | null>(null);

  /** Model preflight: never start a render that would stop halfway for a missing model. */
  const startGeneration = () => {
    const missing = preflightModels();
    if (missing.length) {
      setNeeded(missing);
      return;
    }
    void generateVideo();
  };

  const readiness = useMemo(() => {
    const llm = models.find((m) => m.id === s.llmModelId);
    const tts = models.find((m) => m.id === s.ttsModelId);
    const missing: string[] = [];
    if (s.llmModelId && !llm) missing.push(`Model not installed: LLM "${s.llmModelId}"`);
    else if (!llm) missing.push('LLM seçilmedi');
    else if (!llm.installed) missing.push(`LLM "${llm.name}" indirilmedi`);
    if (s.ttsModelId && !tts) missing.push(`Model not installed: TTS "${s.ttsModelId}"`);
    else if (!tts) missing.push('TTS seçilmedi');
    else if (!tts.installed) missing.push(`TTS "${tts.name}" indirilmedi`);
    else if (!tts.languages.includes(s.language)) missing.push(`"${tts.name}" ${s.language.toUpperCase()} sesi içermiyor`);
    if (hardware && !hardware.webcodecs) missing.push('WebCodecs video encoder desteklenmiyor');
    return { ok: missing.length === 0, missing };
  }, [models, s.llmModelId, s.ttsModelId, s.language, hardware]);

  const vramTotal = memory?.vramTotalBytes ?? 8 * 1024 ** 3;

  return (
    // min-w keeps the three-column studio layout intact on narrow desktop windows (scrolls instead of collapsing)
    <div className="flex h-screen w-screen min-w-[1100px] flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      <header className="z-20 flex h-14 shrink-0 items-center gap-3 border-b border-zinc-800 bg-zinc-950 px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 text-sm font-black text-black shadow-md shadow-emerald-500/20">▶</div>
          <span className="text-xs font-bold tracking-wider text-zinc-300">LOCAL AI VIDEO</span>
        </div>

        <input value={project.name} onChange={(e) => setProject((p) => ({ ...p, name: e.target.value }))} className={cn(inputCls, 'w-56 py-1 px-2 text-xs font-semibold')} title="Proje adı" />

        <div className="flex items-center gap-1.5">
          <Btn size="sm" onClick={() => setModal('projects')}>Projeler</Btn>
          <Btn size="sm" onClick={() => setModal('models')}>Modeller</Btn>
          <Btn size="sm" onClick={() => setModal('style')} disabled={!project.styleBible}>Stil &amp; Kadro</Btn>
          <Btn size="sm" onClick={() => setModal('audio')}>Müzik &amp; SFX</Btn>
          <Btn size="sm" onClick={() => setModal('build')} className="border-emerald-700/60 bg-emerald-950/40 font-semibold text-emerald-300 hover:bg-emerald-900/50">📦 Build Al</Btn>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1 text-[10px]">
            <div>
              <div className="text-zinc-500">Model</div>
              <div className="max-w-[110px] truncate font-semibold text-zinc-200">{memory?.currentModel ? memory.currentModel.name : '—'}</div>
            </div>
            <div className="h-6 w-px bg-zinc-800" />
            <div>
              <div className="text-zinc-500">VRAM (est.)</div>
              <div className="font-mono text-zinc-200">{memory?.vramUsedBytes ? formatBytes(memory.vramUsedBytes) : '0'} / {formatBytes(vramTotal)}</div>
            </div>
          </div>
          <div title={readiness.missing.join('\n')} className="cursor-help">
            {readiness.ok ? <Badge tone="green">🟢 OFFLINE READY</Badge> : <Badge tone="amber">⚠️ MODEL REQUIRED</Badge>}
          </div>
          {busy ? (
            <Btn variant="danger" size="sm" onClick={cancelGeneration} className="px-3 py-1.5 font-bold">DURDUR</Btn>
          ) : (
            <Btn variant="primary" size="sm" className="px-4 py-1.5 text-xs font-bold shadow-md shadow-emerald-500/20" onClick={startGeneration} disabled={!s.topic.trim() && !project.script}>
              {project.script && project.stage !== 'done' ? 'DEVAM ET' : project.stage === 'done' ? 'YENİDEN ÜRET' : 'GENERATE'}
            </Btn>
          )}
        </div>
      </header>

      {!readiness.ok && (
        <div className="flex items-center gap-2 border-b border-amber-900/50 bg-amber-950/30 px-4 py-1 text-[11px] text-amber-200">
          <span>⚠️</span>
          <span className="truncate">{readiness.missing[0]}</span>
          <button className="ml-auto shrink-0 font-medium text-amber-300 underline" onClick={() => setModal('models')}>Modelleri aç</button>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <LeftPanel />
        <Preview />
        <SceneList />
      </div>

      <Timeline />

      {selectedSceneId != null && <SceneInspector />}
      {modal === 'models' && <ModelManagerPanel onClose={() => setModal(null)} />}
      {modal === 'projects' && <ProjectManager onClose={() => setModal(null)} />}
      {modal === 'style' && <StyleBibleEditor onClose={() => setModal(null)} />}
      {modal === 'audio' && <AudioPanel onClose={() => setModal(null)} />}
      {modal === 'build' && <BuildExportModal onClose={() => setModal(null)} />}

      {needed && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4" onClick={() => setNeeded(null)}>
          <div className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-5" onClick={(e) => e.stopPropagation()}>
            <h4 className="text-sm font-semibold text-zinc-100">Required model{needed.length > 1 ? 's' : ''} missing</h4>
            <p className="mt-1 text-[11px] text-zinc-400">These local models are needed before generation can start. They are downloaded once and kept on this device.</p>
            <div className="mt-3 space-y-1.5">
              {needed.map((m, i) => (
                <div key={i} className="rounded border border-zinc-800 bg-zinc-950 p-2 text-[11px]">
                  <div className="font-semibold text-zinc-200">{m.name}</div>
                  <div className="text-zinc-500">
                    {m.category.toUpperCase()} · {m.status === 'NOT_INSTALLED' ? 'not installed on this device' : m.status.toLowerCase()}
                    {m.sizeBytes ? ` · download ${formatSize(m.sizeBytes)}` : ''}
                  </div>
                  {m.issue && <div className="text-amber-400">{m.issue}</div>}
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Btn onClick={() => setNeeded(null)}>Cancel</Btn>
              <Btn
                variant="primary"
                onClick={() => {
                  setNeeded(null);
                  setModal('models');
                }}
              >
                Open Local Models
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * RUNTIME PROFILE — desktop (PC) only.
 *
 * Heavy jobs (TTS, rendering) always run one at a time. If the GPU ever fails for TTS, the profile
 * is tightened automatically (CPU/WASM TTS, session recycling, more aggressive cleanup).
 */

export interface DeviceProfile {
  kind: 'desktop';
  /** How many heavy jobs may overlap. */
  concurrency: number;
  /** Default render chunk length in seconds. */
  defaultChunkSeconds: number;
  /** Chunk lengths offered in the UI. */
  chunkOptions: number[];
  /** Run TTS strictly one scene at a time and release resources in between. */
  sequentialTts: boolean;
  /** Drop GPU/audio resources as soon as a scene finishes. */
  aggressiveCleanup: boolean;
  /** Re-create the TTS session between scenes (switched on after a GPU memory failure). */
  recycleTtsBetweenScenes: boolean;
  /** Use WASM/CPU for TTS instead of WebGPU (switched on after a GPU failure). */
  preferCpuTts: boolean;
  /** Max VideoEncoder queue depth before we wait. */
  encoderQueueLimit: number;
}

export const CHUNK_OPTIONS = [5, 10, 15, 30, 60];

const BASE: DeviceProfile = {
  kind: 'desktop',
  concurrency: 1,
  defaultChunkSeconds: 30,
  chunkOptions: CHUNK_OPTIONS,
  sequentialTts: true,
  aggressiveCleanup: false,
  recycleTtsBetweenScenes: false,
  preferCpuTts: false,
  encoderQueueLimit: 6,
};

let tightened: Partial<DeviceProfile> | null = null;

/** Current effective profile. */
export function deviceProfile(): DeviceProfile {
  return tightened ? { ...BASE, ...tightened } : BASE;
}

/** Called by the TTS fallback chain after a WebGPU failure: stay on CPU and keep memory low. */
export function enableLowMemoryTts() {
  tightened = { ...(tightened ?? {}), recycleTtsBetweenScenes: true, preferCpuTts: true, aggressiveCleanup: true };
}

/** Gives the browser a chance to run GC / release detached GPU objects between heavy steps. */
export async function yieldToBrowser(ms = 0) {
  await new Promise((r) => setTimeout(r, ms));
  if (typeof requestAnimationFrame !== 'undefined') {
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
  }
}

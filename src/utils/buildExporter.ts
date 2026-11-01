import JSZip from 'jszip';
import type { Project } from '../types';
import { blobStore } from '../storage/projectStore';
import { saveBlobToDisk } from './fileUtils';

export async function fetchCurrentHtml(): Promise<string> {
  try {
    const res = await fetch(window.location.href);
    if (res.ok) {
      return await res.text();
    }
  } catch {
    /* fallback to document serialize */
  }
  return `<!doctype html>\n${document.documentElement.outerHTML}`;
}

export async function exportSingleFileHtml(suggestedName = 'local-ai-video-generator.html'): Promise<void> {
  const html = await fetchCurrentHtml();
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  await saveBlobToDisk(blob, suggestedName, 'text/html');
}

export async function exportStandaloneZip(projectName: string): Promise<void> {
  const zip = new JSZip();
  const html = await fetchCurrentHtml();

  // 1. Single-file index.html
  zip.file('index.html', html);

  // 2. Windows 1-click launcher
  const bat = `@echo off
title Local AI Video Generator
echo ========================================================
echo  Local AI Video Generator baslatiliyor...
echo  Bu uygulama %%100 kullanici bilgisayarinda / tarayicida calisir.
echo ========================================================
start "" index.html
`;
  zip.file('baslat-windows.bat', bat);

  // 5. Mac / Linux 1-click launcher
  const sh = `#!/usr/bin/env bash
echo "Local AI Video Generator baslatiliyor..."
if which xdg-open > /dev/null; then
  xdg-open index.html
elif which open > /dev/null; then
  open index.html
else
  python3 -m http.server 8080 &
  sleep 1
  open "http://localhost:8080/index.html" || xdg-open "http://localhost:8080/index.html"
fi
`;
  zip.file('baslat-mac-linux.sh', sh);

  // 6. Turkish & English Documentation
  const readme = `======================================================================
LOCAL AI VIDEO GENERATOR — ÇEVRİMDIŞI KURULUM & ÇALIŞTIRMA REHBERİ
======================================================================

Bu paket, tamamen tarayıcınızda ve yerel bilgisayarınızda çalışan
yapay zeka video üretim sistemini içerir.

NASIL ÇALIŞTIRILIR?
-------------------
1. Windows: "baslat-windows.bat" veya doğrudan "index.html" dosyasına çift tıklayın.
2. Mac/Linux: "baslat-mac-linux.sh" komutunu çalıştırın veya "index.html"i tarayıcıda açın.
3. Tarayıcı: WebGPU için güncel Chrome veya Edge (masaüstü) önerilir.

YAPILANDIRMA SEÇENEKLERİ:
------------------------
MOD A — BROWSER LOCAL (Tarayıcı İçi):
- WebGPU destekli tarayıcılarda (Chrome, Edge vb.) LLM ve Kokoro TTS doğrudan tarayıcı içinde çalışır.
- Harici sunucu gerektirmez.

MOD B — LOCAL RUNTIME (Yerel GPU Çalıştırma):
- Bilgisayarınızda çalışan Ollama (http://localhost:11434)
- AUTOMATIC1111 WebUI (http://127.0.0.1:7860 --api)
- ComfyUI (http://127.0.0.1:8188)
- Piper / Yerel TTS sunucuları

GÜVENLİK:
- Hiçbir script, resim veya ses uzak sunucuya aktarılmaz.
- Verileriniz IndexedDB'de cihazınızda saklanır.

İyi üretimler!
`;
  zip.file('KURULUM-REHBERI.txt', readme);

  const cleanName = (projectName || 'local-ai-video-generator').replace(/[^\w\-]+/g, '_');
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  await saveBlobToDisk(zipBlob, `${cleanName}-standalone-build.zip`, 'application/zip');
}

export async function exportProjectMediaBundle(project: Project): Promise<void> {
  const zip = new JSZip();

  // 1. Project JSON metadata
  zip.file('project.json', JSON.stringify(project, null, 2));

  // 2. Images folder
  const imgFolder = zip.folder('images');
  for (const s of project.script?.scenes ?? []) {
    const key = blobStore.key(project.id, 'image', `scene_${String(s.sceneId).padStart(3, '0')}.png`);
    const blob = await blobStore.get(key);
    if (blob && imgFolder) {
      imgFolder.file(`scene_${String(s.sceneId).padStart(3, '0')}.png`, blob);
    }
  }

  // 3. Audio folder
  const audioFolder = zip.folder('audio');
  for (const s of project.script?.scenes ?? []) {
    const key = blobStore.key(project.id, 'tts', `scene_${String(s.sceneId).padStart(3, '0')}.wav`);
    const blob = await blobStore.get(key);
    if (blob && audioFolder) {
      audioFolder.file(`scene_${String(s.sceneId).padStart(3, '0')}.wav`, blob);
    }
  }

  // 4. Music & SFX if present
  if (project.settings.music.fileName) {
    const mBlob = await blobStore.get(blobStore.key(project.id, 'music', project.settings.music.fileName));
    if (mBlob && audioFolder) {
      audioFolder.file(project.settings.music.fileName, mBlob);
    }
  }
  for (const a of project.settings.sfx) {
    const sBlob = await blobStore.get(blobStore.key(project.id, 'sfx', a.fileName));
    if (sBlob && audioFolder) {
      audioFolder.file(a.fileName, sBlob);
    }
  }

  // 5. Final exported video if available
  const videoBlob = await blobStore.get(blobStore.key(project.id, 'export', 'final'));
  if (videoBlob) {
    zip.file(project.exportFileName || 'final_video.mp4', videoBlob);
  }

  // 6. Project summary text
  const summary = `PROJE ÖZETİ
===========
Başlık: ${project.script?.title || project.name}
Konu: ${project.settings.topic}
Süre: ${project.settings.durationSec} saniye
Format: ${project.settings.aspectRatio}
Dil: ${project.settings.language}
Stil kilidi: ${project.settings.styleLockEnabled ? 'EVET' : 'HAYIR'} · Görsel motor: Procedural 2D Scene Engine (AI image generation YOK)
Oluşturulma: ${new Date(project.createdAt).toLocaleString()}
Toplam Sahne: ${project.script?.scenes.length ?? 0}
`;
  zip.file('OZET.txt', summary);

  const cleanName = (project.script?.title || project.name || 'project').replace(/[^\w\-]+/g, '_');
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  await saveBlobToDisk(zipBlob, `${cleanName}-medya-paketi.zip`, 'application/zip');
}

import { useState } from 'react';
import { useStore } from '../store';
import { exportProjectMediaBundle, exportSingleFileHtml, exportStandaloneZip } from '../utils/buildExporter';
import { Badge, Btn, Modal } from './common';

export function BuildExportModal({ onClose }: { onClose: () => void }) {
  const { project, log } = useStore();
  const [working, setWorking] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const handleSingleHtml = async () => {
    try {
      setWorking('html');
      setMsg('Tek dosya HTML derleniyor...');
      await exportSingleFileHtml('local-ai-video-generator-portable.html');
      log('Tek dosya taşınabilir HTML başarıyla indirildi.');
      setMsg('HTML dosyası indirildi! Bu dosyayı internet bağlantısı olmadan çift tıklayıp açabilirsiniz.');
    } catch (e) {
      log('HTML indirme hatası: ' + (e as Error).message, 'error');
      setMsg('Hata: ' + (e as Error).message);
    } finally {
      setWorking(null);
    }
  };

  const handleStandaloneZip = async () => {
    try {
      setWorking('zip');
      setMsg('ZIP paketi hazırlanıyor (manifest, launcher, html)...');
      await exportStandaloneZip(project.name);
      log('Standalone ZIP paketi oluşturuldu ve indirildi.');
      setMsg('ZIP paketi indirildi! İçindeki baslat-windows.bat veya index.html ile hemen çalıştırabilirsiniz.');
    } catch (e) {
      log('ZIP oluşturma hatası: ' + (e as Error).message, 'error');
      setMsg('Hata: ' + (e as Error).message);
    } finally {
      setWorking(null);
    }
  };

  const handleProjectBundle = async () => {
    try {
      setWorking('project');
      setMsg('Proje medyaları ve script paketleniyor (resimler, sesler, ayarlar)...');
      await exportProjectMediaBundle(project);
      log('Proje medya arşivi başarıyla paketlendi.');
      setMsg('Proje arşivi indirildi! Üretilen tüm resimler, sesler ve script ZIP içinde mevcuttur.');
    } catch (e) {
      log('Proje paketleme hatası: ' + (e as Error).message, 'error');
      setMsg('Hata: ' + (e as Error).message);
    } finally {
      setWorking(null);
    }
  };

  return (
    <Modal title="📦 Build Al & Çevrimdışı Paket (Export)" onClose={onClose} wide>
      <div className="space-y-4 text-xs text-zinc-300">
        <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/20 p-3.5">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚡</span>
            <div>
              <div className="font-semibold text-emerald-300">Sıfır Bağımlılıkla %100 Yerel Çalışır</div>
              <p className="mt-0.5 text-[11px] text-zinc-400">
                Uygulamayı tek bir HTML dosyası veya ZIP paketi olarak indirebilir; sunucuya gerek kalmadan USB bellekte veya çevrimdışı bilgisayarda doğrudan çalıştırabilirsiniz.
              </p>
            </div>
          </div>
        </div>

        {msg && (
          <div className="rounded-md border border-zinc-700 bg-zinc-900 p-2.5 text-xs text-emerald-300 animate-fadeIn">
            {msg}
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          {/* Option 1: Single file HTML */}
          <div className="flex flex-col justify-between rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 transition hover:border-zinc-700">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-100">Tek Dosya HTML Olarak İndir</span>
                <Badge tone="green">Portable .HTML</Badge>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-zinc-400">
                Tüm CSS, JavaScript ve arayüzü içeren tek bir <code className="text-emerald-400">.html</code> dosyası iner. Herhangi bir tarayıcıda çift tıklayarak açabilirsiniz. Kurulum veya internet gerekmez.
              </p>
            </div>
            <div className="mt-4 pt-2">
              <Btn
                variant="primary"
                className="w-full justify-center py-2"
                disabled={working !== null}
                onClick={handleSingleHtml}
              >
                {working === 'html' ? 'Derleniyor...' : '⬇ Tek Dosya HTML İndir'}
              </Btn>
            </div>
          </div>

          {/* Option 2: Standalone ZIP */}
          <div className="flex flex-col justify-between rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 transition hover:border-zinc-700">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-100">Tam Web Paketi (ZIP Dağıtım)</span>
                <Badge tone="blue">Stand-alone .ZIP</Badge>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-zinc-400">
HTML dosyası, Windows (<code className="text-sky-300">.bat</code>) ve Mac/Linux (<code className="text-sky-300">.sh</code>) tek tıkla başlatıcıları ve kurulum rehberi içeren paket.
              </p>
            </div>
            <div className="mt-4 pt-2">
              <Btn
                variant="default"
                className="w-full justify-center py-2"
                disabled={working !== null}
                onClick={handleStandaloneZip}
              >
                {working === 'zip' ? 'Paketleniyor...' : '⬇ ZIP Dağıtım Paketi İndir'}
              </Btn>
            </div>
          </div>

          {/* Option 3: Project media bundle */}
          <div className="flex flex-col justify-between rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 transition hover:border-zinc-700">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-100">Proje & Medya Arşivi</span>
                <Badge tone="amber">Yedekleme .ZIP</Badge>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-zinc-400">
                Aktif projenin script JSON verisi, üretilen tüm sahne PNG resimleri, üretilen TTS ses dosyaları (.wav), arka plan müziği, SFX'ler ve tamamlanan video dosyasını tek arşivde toplar.
              </p>
            </div>
            <div className="mt-4 pt-2">
              <Btn
                variant="default"
                className="w-full justify-center py-2"
                disabled={working !== null || !project.script}
                onClick={handleProjectBundle}
              >
                {working === 'project' ? 'Paketleniyor...' : '⬇ Medyaları & Projeyi İndir (ZIP)'}
              </Btn>
            </div>
          </div>

        </div>

        <div className="border-t border-zinc-800 pt-3 text-[11px] text-zinc-500 flex flex-wrap items-center justify-between gap-2">
          <span>Tüm build ve dışa aktarım işlemleri doğrudan tarayıcınızda gerçekleşir. Harici hiçbir sunucuya veri gönderilmez.</span>
          <Btn onClick={onClose} size="sm">Kapat</Btn>
        </div>
      </div>
    </Modal>
  );
}

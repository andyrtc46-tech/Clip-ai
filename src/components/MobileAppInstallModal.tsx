import React, { useState, useEffect } from "react";
import { Smartphone, Download, X, CheckCircle2, Apple, Share2, PlusSquare, Sparkles, Code2, ShieldCheck, Terminal, Cpu } from "lucide-react";

interface MobileAppInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileAppInstallModal: React.FC<MobileAppInstallModalProps> = ({ isOpen, onClose }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isAndroid, setIsAndroid] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"native-apk" | "ios" | "pwa">("native-apk");

  useEffect(() => {
    // Detect OS
    const ua = navigator.userAgent.toLowerCase();
    const iosDetected = /iphone|ipad|ipod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const androidDetected = /android/.test(ua);

    setIsIOS(iosDetected);
    setIsAndroid(androidDetected);
    if (iosDetected) setActiveTab("ios");
    else setActiveTab("native-apk");

    // Check standalone mode (already installed)
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    // Listen for PWA install prompt on Android/Chrome
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert("Untuk menginstal di Android: Buka menu Chrome (3 titik) > ketuk 'Instal Aplikasi' / 'Tambahkan ke Layar Utama'.");
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-neutral-900 border border-neutral-800 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-rose-500/10 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20 text-white shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Aplikasi Native Mobile (Android APK & iOS)
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Capacitor 8 Native Engine
                </span>
              </h2>
              <p className="text-xs text-neutral-400">Jalankan sebagai Aplikasi Android & iOS Native Tanpa Browser</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-neutral-800 bg-neutral-950/60 p-1">
          <button
            onClick={() => setActiveTab("native-apk")}
            className={`flex-1 py-2.5 px-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === "native-apk"
                ? "bg-amber-500 text-black shadow-md font-bold"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <Smartphone className="w-4 h-4 shrink-0" />
            <span>Android APK Native</span>
            {isAndroid && <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>}
          </button>

          <button
            onClick={() => setActiveTab("ios")}
            className={`flex-1 py-2.5 px-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === "ios"
                ? "bg-amber-500 text-black shadow-md font-bold"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <Apple className="w-4 h-4 shrink-0" />
            <span>iOS Xcode Package</span>
            {isIOS && <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>}
          </button>

          <button
            onClick={() => setActiveTab("pwa")}
            className={`flex-1 py-2.5 px-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === "pwa"
                ? "bg-amber-500 text-black shadow-md font-bold"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>Instal PWA Cepat</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {isInstalled && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3 text-emerald-300 text-xs sm:text-sm font-medium">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
              <span>Aplikasi AutoClip AI sudah terpasang dan berjalan dalam mode Native Mobile Standalone!</span>
            </div>
          )}

          {activeTab === "native-apk" && (
            <div className="space-y-4">
              <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-amber-400" />
                    Percepatan Hardware Native Android (Capacitor Engine)
                  </h3>
                  <span className="text-[10px] text-amber-400 font-semibold bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                    Capacitor 8 APK
                  </span>
                </div>

                <p className="text-xs text-neutral-300 leading-relaxed">
                  Proyek ini telah dilengkapi dengan arsitektur <strong>Capacitor Native Android</strong>, berkas <code className="text-amber-300">AndroidManifest.xml</code>, izin akses Galeri & Hardware Video Decoder secara penuh.
                </p>

                {/* Command snippets */}
                <div className="p-3 bg-neutral-900 rounded-xl border border-neutral-800 space-y-2">
                  <div className="text-[11px] font-semibold text-neutral-400 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-amber-400" />
                    <span>Langkah Kompilasi Paket APK Native (Android Studio / Gradle):</span>
                  </div>
                  <pre className="p-2.5 bg-black rounded-lg text-emerald-400 text-xs font-mono overflow-x-auto select-all border border-neutral-800/80">
{`# 1. Buat build web dist
npm run build

# 2. Sinkronkan dengan Capacitor Android Native
npx cap add android
npx cap sync android

# 3. Buka di Android Studio & Buat APK
npx cap open android`}
                  </pre>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl space-y-1">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Akses Hardware Galeri</span>
                  </div>
                  <p className="text-[11px] text-neutral-400">Video ekspor tersimpan ke penyimpanan internal HP `/storage/emulated/0/Movies/AutoClip`</p>
                </div>

                <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl space-y-1">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-amber-400" />
                    <span>Akselerasi GPU 60fps</span>
                  </div>
                  <p className="text-[11px] text-neutral-400">Pemrosesan 1080p 60fps didukung langsung oleh GPU chipset Snapdragon / MediaTek</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "ios" && (
            <div className="space-y-4">
              <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <Apple className="w-4 h-4 text-amber-400" />
                    Kompilasi iOS Native App Package (Xcode & Capacitor)
                  </h3>
                  <span className="text-[10px] text-sky-400 font-semibold bg-sky-400/10 px-2 py-0.5 rounded border border-sky-400/20">
                    iOS Native Swift
                  </span>
                </div>

                <p className="text-xs text-neutral-300 leading-relaxed">
                  Proyek ini mendukung pembuatan aplikasi iOS Native (`.ipa` / Xcode Project) menggunakan Capacitor iOS runtime.
                </p>

                <div className="p-3 bg-neutral-900 rounded-xl border border-neutral-800 space-y-2">
                  <div className="text-[11px] font-semibold text-neutral-400 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-sky-400" />
                    <span>Langkah Kompilasi Paket iOS Native (Xcode / Mac):</span>
                  </div>
                  <pre className="p-2.5 bg-black rounded-lg text-cyan-300 text-xs font-mono overflow-x-auto select-all border border-neutral-800/80">
{`# 1. Sinkronkan proyek web ke iOS Xcode
npx cap add ios
npx cap sync ios

# 2. Buka proyek Xcode di Mac
npx cap open ios`}
                  </pre>
                </div>

                <div className="space-y-2 pt-1">
                  <div className="flex items-start gap-2.5 p-2.5 bg-neutral-900 rounded-xl text-xs text-neutral-200 border border-neutral-800">
                    <Share2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <span>Mendukung fitur Native Share sheet iOS untuk langsung membagikan klip ke Instagram Reels / TikTok.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "pwa" && (
            <div className="space-y-4">
              <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Instalasi Langsung Tanpa Kompilasi (PWA Mobile)
                  </h3>
                </div>

                <p className="text-xs text-neutral-300 leading-relaxed">
                  Jika Anda ingin menggunakan aplikasi langsung tanpa membuka Android Studio / Xcode, gunakan fitur Web App Standalone ini yang bekerja sama persis seperti aplikasi native.
                </p>

                {deferredPrompt ? (
                  <button
                    onClick={handleInstallClick}
                    className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:opacity-95 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 transition cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Instal Langsung ke Layar Utama HP</span>
                  </button>
                ) : (
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-start gap-3 p-2.5 bg-neutral-900 rounded-lg text-xs text-neutral-300 border border-neutral-800">
                      <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-xs shrink-0">1</div>
                      <span>Buka browser **Google Chrome** (Android) atau **Safari** (iOS).</span>
                    </div>

                    <div className="flex items-start gap-3 p-2.5 bg-neutral-900 rounded-lg text-xs text-neutral-300 border border-neutral-800">
                      <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-xs shrink-0">2</div>
                      <span>Ketuk menu **3 titik** (Chrome) atau **Share** (Safari).</span>
                    </div>

                    <div className="flex items-start gap-3 p-2.5 bg-neutral-900 rounded-lg text-xs text-neutral-300 border border-neutral-800">
                      <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-xs shrink-0">3</div>
                      <span>Pilih **"Instal Aplikasi"** / **"Tambahkan ke Layar Utama"**.</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between">
          <div className="text-[11px] text-neutral-400 hidden sm:block">
            <span>Paket Native: <code className="text-amber-300">com.autoclip.ai.studio</code></span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-medium text-xs sm:text-sm transition cursor-pointer ml-auto"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};


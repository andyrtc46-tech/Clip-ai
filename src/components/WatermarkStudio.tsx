import React, { useRef } from "react";
import { Stamp, Type, Image as ImageIcon, Upload, Sliders, Trash2, Eye, RotateCw } from "lucide-react";
import { WatermarkConfig, WatermarkPosition } from "../types";

interface WatermarkStudioProps {
  watermark: WatermarkConfig;
  onChangeWatermark: (updates: Partial<WatermarkConfig>) => void;
  onUploadWatermarkImage: (file: File) => void;
}

export const WatermarkStudio: React.FC<WatermarkStudioProps> = ({
  watermark,
  onChangeWatermark,
  onUploadWatermarkImage,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadWatermarkImage(file);
    }
  };

  const positions: { key: WatermarkPosition; label: string }[] = [
    { key: "top-left", label: "Kiri Atas" },
    { key: "top-right", label: "Kanan Atas" },
    { key: "bottom-left", label: "Kiri Bawah" },
    { key: "bottom-right", label: "Kanan Bawah" },
    { key: "center", label: "Tengah" },
    { key: "custom", label: "Kustom X/Y" },
  ];

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-3.5 sm:p-5 flex flex-col gap-4 shadow-xl w-full">
      {/* Header with Enable Switch */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
            <Stamp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Studio Watermark & Branding</h3>
            <p className="text-xs text-neutral-400">Tambahkan logo foto atau teks kustom di atas video.</p>
          </div>
        </div>

        <label className="relative inline-flex items-center cursor-pointer">
          <input
            id="toggle-watermark"
            type="checkbox"
            checked={watermark.enabled}
            onChange={(e) => onChangeWatermark({ enabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
        </label>
      </div>

      {watermark.enabled && (
        <div className="space-y-4">
          {/* Mode Switch: Text vs Image */}
          <div className="grid grid-cols-2 gap-2 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
            <button
              id="btn-watermark-text-mode"
              onClick={() => onChangeWatermark({ type: "text" })}
              className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition cursor-pointer ${
                watermark.type === "text"
                  ? "bg-cyan-500 text-neutral-950 shadow-sm"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Type className="w-4 h-4" />
              <span>Teks Kustom</span>
            </button>
            <button
              id="btn-watermark-image-mode"
              onClick={() => onChangeWatermark({ type: "image" })}
              className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition cursor-pointer ${
                watermark.type === "image"
                  ? "bg-cyan-500 text-neutral-950 shadow-sm"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>Upload Foto / Logo</span>
            </button>
          </div>

          {/* Text Watermark Controls */}
          {watermark.type === "text" && (
            <div className="space-y-3 bg-neutral-950/60 p-3.5 rounded-xl border border-neutral-800/80">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Teks Watermark
                </label>
                <input
                  id="input-watermark-text"
                  type="text"
                  value={watermark.text}
                  onChange={(e) => onChangeWatermark({ text: e.target.value })}
                  placeholder="@ChannelName / Twitch Streamer"
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-400 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Font Teks</label>
                  <select
                    value={watermark.font}
                    onChange={(e) => onChangeWatermark({ font: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none cursor-pointer"
                  >
                    <option value="Montserrat, sans-serif">Montserrat (Tebal Modern)</option>
                    <option value="Impact, sans-serif">Impact (Punchy)</option>
                    <option value="system-ui, sans-serif">System Sans</option>
                    <option value="Courier New, monospace">Monospace Retro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Warna Teks</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={watermark.textColor}
                      onChange={(e) => onChangeWatermark({ textColor: e.target.value })}
                      className="w-8 h-8 rounded border border-neutral-700 bg-neutral-900 cursor-pointer p-0.5"
                    />
                    <span className="text-xs text-neutral-300 font-mono uppercase">{watermark.textColor}</span>
                  </div>
                </div>
              </div>

              {/* Background Pill */}
              <div className="flex items-center justify-between gap-4 pt-1">
                <span className="text-xs text-neutral-400">Background Kotak Gelap:</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={watermark.bgOpacity}
                  onChange={(e) => onChangeWatermark({ bgOpacity: Number(e.target.value) })}
                  className="w-32 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>
            </div>
          )}

          {/* Image Logo Watermark Upload */}
          {watermark.type === "image" && (
            <div className="space-y-3 bg-neutral-950/60 p-3.5 rounded-xl border border-neutral-800/80">
              {watermark.imageUrl ? (
                <div className="flex items-center justify-between gap-3 p-3 bg-neutral-900 rounded-xl border border-neutral-700">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-neutral-800 p-1 flex items-center justify-center overflow-hidden border border-neutral-700">
                      <img src={watermark.imageUrl} alt="Logo" className="max-h-full object-contain" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Logo Aktif Terpasang</p>
                      <p className="text-[11px] text-neutral-400">PNG / Foto Transparan</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-200 rounded-lg transition cursor-pointer"
                    >
                      Ganti
                    </button>
                    <button
                      onClick={() => onChangeWatermark({ imageUrl: null })}
                      className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border border-dashed border-neutral-700 hover:border-cyan-400 rounded-xl p-5 flex flex-col items-center justify-center gap-2 text-center transition cursor-pointer bg-neutral-900/50 hover:bg-neutral-900"
                >
                  <Upload className="w-6 h-6 text-cyan-400" />
                  <p className="text-xs font-bold text-white">Klik untuk Upload Logo / Foto Watermark</p>
                  <p className="text-[11px] text-neutral-500">Mendukung format PNG transparan, JPG, SVG</p>
                </div>
              )}
              <input
                id="input-watermark-image-file"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          )}

          {/* Position Matrix Selection */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-2">Posisi Penempatan</label>
            <div className="grid grid-cols-3 gap-2">
              {positions.map((pos) => (
                <button
                  key={pos.key}
                  onClick={() => onChangeWatermark({ position: pos.key })}
                  className={`py-1.5 px-2 text-xs font-medium rounded-lg border transition cursor-pointer text-center ${
                    watermark.position === pos.key
                      ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold"
                      : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white"
                  }`}
                >
                  {pos.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Position Sliders (if custom position chosen) */}
          {watermark.position === "custom" && (
            <div className="grid grid-cols-2 gap-3 bg-neutral-950/80 p-3 rounded-xl border border-neutral-800">
              <div>
                <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
                  <span>Posisi X (%):</span>
                  <span className="text-white font-mono">{watermark.customX}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={watermark.customX}
                  onChange={(e) => onChangeWatermark({ customX: Number(e.target.value) })}
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
                  <span>Posisi Y (%):</span>
                  <span className="text-white font-mono">{watermark.customY}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={watermark.customY}
                  onChange={(e) => onChangeWatermark({ customY: Number(e.target.value) })}
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>
            </div>
          )}

          {/* Adjustments Sliders: Size, Opacity, Rotation */}
          <div className="space-y-2.5 bg-neutral-950/60 p-3.5 rounded-xl border border-neutral-800/80">
            {/* Scale / Size */}
            <div>
              <div className="flex justify-between text-xs text-neutral-400 mb-1">
                <span>Ukuran Watermark:</span>
                <span className="text-white font-mono">{Math.round(watermark.scale * 100)}%</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={2.5}
                step={0.1}
                value={watermark.scale}
                onChange={(e) => onChangeWatermark({ scale: Number(e.target.value) })}
                className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Opacity */}
            <div>
              <div className="flex justify-between text-xs text-neutral-400 mb-1">
                <span>Transparansi (Opacity):</span>
                <span className="text-white font-mono">{Math.round(watermark.opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={1.0}
                step={0.05}
                value={watermark.opacity}
                onChange={(e) => onChangeWatermark({ opacity: Number(e.target.value) })}
                className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Rotation */}
            <div>
              <div className="flex justify-between text-xs text-neutral-400 mb-1">
                <span>Rotasi Derajat:</span>
                <span className="text-white font-mono">{watermark.rotation}°</span>
              </div>
              <input
                type="range"
                min={-90}
                max={90}
                step={5}
                value={watermark.rotation}
                onChange={(e) => onChangeWatermark({ rotation: Number(e.target.value) })}
                className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

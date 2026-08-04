import React, { useState } from 'react';

interface MediaUploaderProps {
  label: string;
  type?: 'Image' | 'Audio' | 'Video';
  value?: string;
  onChange: (url: string) => void;
  placeholder?: string;
}

export const MediaUploader: React.FC<MediaUploaderProps> = ({
  label,
  type = 'Image',
  value,
  onChange,
  placeholder = 'https://...',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [inputUrl, setInputUrl] = useState(value || '');

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const objectUrl = URL.createObjectURL(file);
      setInputUrl(objectUrl);
      onChange(objectUrl);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const objectUrl = URL.createObjectURL(file);
      setInputUrl(objectUrl);
      onChange(objectUrl);
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputUrl(e.target.value);
    onChange(e.target.value);
  };

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-[#f2ca50] flex items-center justify-between">
        <span>{label}</span>
        <span className="text-[10px] text-[#d0c5af]/60 font-normal">
          Supported: {type === 'Image' ? 'JPG, PNG, WEBP' : type === 'Audio' ? 'MP3, WAV, AAC' : 'MP4, WEBM'}
        </span>
      </label>

      {/* Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${
          isDragging
            ? 'border-[#f2ca50] bg-[#f2ca50]/10'
            : 'border-white/10 bg-[#0c1321]/80 hover:border-white/20'
        }`}
      >
        <div className="flex flex-col items-center justify-center gap-1">
          <span className="material-symbols-outlined text-2xl text-[#f2ca50]/70">
            {type === 'Image' ? 'add_photo_alternate' : type === 'Audio' ? 'graphic_eq' : 'movie'}
          </span>
          <p className="text-xs font-medium text-[#dce2f6]">
            Drag & drop your {type.toLowerCase()} file here or
          </p>
          <label className="mt-1 px-3 py-1 bg-[#232a39] text-[#f2ca50] border border-[#f2ca50]/30 rounded-lg text-xs font-bold cursor-pointer hover:bg-white/10 transition-colors">
            Browse Files
            <input
              type="file"
              accept={type === 'Image' ? 'image/*' : type === 'Audio' ? 'audio/*' : 'video/*'}
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Direct URL Input Fallback */}
      <div className="flex items-center gap-2 pt-1">
        <span className="text-[11px] text-[#d0c5af]/60">Or URL:</span>
        <input
          type="text"
          value={inputUrl}
          onChange={handleUrlChange}
          placeholder={placeholder}
          className="flex-1 bg-[#0c1321] border border-white/10 rounded-lg py-1 px-2.5 text-xs text-[#dce2f6] placeholder-[#d0c5af]/30 focus:ring-1 focus:ring-[#f2ca50] outline-none"
        />
      </div>

      {/* Media Preview Card */}
      {inputUrl && (
        <div className="mt-2 p-2 bg-[#19202e] rounded-xl border border-white/10 flex items-center gap-3">
          {type === 'Image' && (
            <img
              src={inputUrl}
              alt="Preview"
              className="w-12 h-12 object-cover rounded-lg border border-white/10"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          )}

          {type === 'Audio' && (
            <audio controls src={inputUrl} className="h-8 w-full max-w-xs text-xs" />
          )}

          {type === 'Video' && (
            <video controls src={inputUrl} className="h-16 w-28 object-cover rounded-lg" />
          )}

          <div className="flex-1 overflow-hidden">
            <p className="text-[11px] text-[#f2ca50] font-semibold truncate">{type} Asset Attached</p>
            <p className="text-[10px] text-[#d0c5af]/60 truncate">{inputUrl}</p>
          </div>

          <button
            type="button"
            onClick={() => {
              setInputUrl('');
              onChange('');
            }}
            className="p-1 text-rose-400 hover:text-rose-300"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}
    </div>
  );
};

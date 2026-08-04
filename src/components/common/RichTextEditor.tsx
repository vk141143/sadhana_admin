import React, { useState } from 'react';

interface RichTextEditorProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  label,
  value,
  onChange,
  placeholder = 'Write content in Markdown or plain text...',
}) => {
  const [isPreview, setIsPreview] = useState(false);

  const insertTag = (tag: string) => {
    if (tag === 'bold') onChange(`${value} **bold text** `);
    if (tag === 'italic') onChange(`${value} *italic text* `);
    if (tag === 'quote') onChange(`${value}\n> "Spiritual wisdom quote here"\n`);
    if (tag === 'bullet') onChange(`${value}\n- Item list entry\n`);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-[#f2ca50]">{label}</label>

        <div className="flex items-center gap-2">
          {/* Formatter Buttons */}
          <div className="flex items-center gap-1 bg-[#0c1321] p-1 rounded-lg border border-white/10">
            <button
              type="button"
              onClick={() => insertTag('bold')}
              className="px-2 py-0.5 text-xs text-[#d0c5af] font-bold hover:text-[#f2ca50]"
              title="Bold"
            >
              B
            </button>
            <button
              type="button"
              onClick={() => insertTag('italic')}
              className="px-2 py-0.5 text-xs text-[#d0c5af] italic hover:text-[#f2ca50]"
              title="Italic"
            >
              I
            </button>
            <button
              type="button"
              onClick={() => insertTag('quote')}
              className="px-2 py-0.5 text-xs text-[#d0c5af] hover:text-[#f2ca50]"
              title="Quote"
            >
              &rdquo;
            </button>
            <button
              type="button"
              onClick={() => insertTag('bullet')}
              className="px-2 py-0.5 text-xs text-[#d0c5af] hover:text-[#f2ca50]"
              title="Bullet List"
            >
              &bull;
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsPreview(!isPreview)}
            className="px-2.5 py-1 bg-[#232a39] text-xs font-semibold text-[#f2ca50] rounded-lg border border-white/10 hover:bg-white/10"
          >
            {isPreview ? 'Edit' : 'Preview'}
          </button>
        </div>
      </div>

      {isPreview ? (
        <div className="min-h-[100px] p-3 bg-[#0c1321] border border-white/10 rounded-xl text-xs text-[#dce2f6] leading-relaxed whitespace-pre-wrap font-serif">
          {value || <span className="text-[#d0c5af]/40 italic">Nothing to preview</span>}
        </div>
      ) : (
        <textarea
          rows={4}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-[#0c1321] border border-white/10 rounded-xl p-3 text-xs text-[#dce2f6] placeholder-[#d0c5af]/30 focus:ring-1 focus:ring-[#f2ca50] outline-none leading-relaxed"
        />
      )}
    </div>
  );
};

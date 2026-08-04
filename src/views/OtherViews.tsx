import React, { useState } from 'react';

export const ReportsView: React.FC = () => {
  return (
    <div className="p-4 md:p-10 space-y-6 pb-28">
      <div>
        <h2 className="font-serif-headline text-3xl md:text-5xl text-[#dce2f6] font-bold">
          Stewardship Reports
        </h2>
        <p className="text-sm md:text-base text-[#d0c5af]/80 mt-1">
          Audit trails, offering statements, and monthly compliance archives.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: 'Monthly Financial Audit Q1 2026', size: '2.4 MB', date: 'April 2026' },
          { title: 'Seeker Growth & Demographic Analysis', size: '5.1 MB', date: 'March 2026' },
          { title: 'Temple Digital Offering Summary', size: '1.8 MB', date: 'February 2026' },
        ].map((rep, idx) => (
          <div key={idx} className="glass-card p-6 rounded-2xl flex flex-col justify-between">
            <div>
              <span className="material-symbols-outlined text-[#f2ca50] text-3xl mb-2">
                description
              </span>
              <h4 className="font-serif-headline text-lg font-bold text-[#dce2f6]">
                {rep.title}
              </h4>
              <p className="text-xs text-[#d0c5af]/70 mt-1">{rep.date} • {rep.size}</p>
            </div>
            <button
              onClick={() => alert(`Downloading ${rep.title}...`)}
              className="mt-6 w-full py-2 bg-[#f2ca50]/10 text-[#f2ca50] hover:bg-[#f2ca50] hover:text-[#3c2f00] font-bold text-xs rounded-xl transition-all"
            >
              Download PDF Report
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export const SupportView: React.FC = () => {
  return (
    <div className="p-4 md:p-10 space-y-6 pb-28">
      <div>
        <h2 className="font-serif-headline text-3xl md:text-5xl text-[#dce2f6] font-bold">
          Seeker Support Portal
        </h2>
        <p className="text-sm md:text-base text-[#d0c5af]/80 mt-1">
          Inquiries from sadhakas regarding subscription access and audio playback.
        </p>
      </div>

      <div className="glass-card rounded-2xl p-6 space-y-4">
        {[
          { seeker: 'Devi Prasad', issue: 'Cannot access Dharma Elite offline audio on mobile', status: 'Open', priority: 'High' },
          { seeker: 'Suresh Menon', issue: 'Requesting clarification on Ram Navami live stream schedule', status: 'In Progress', priority: 'Medium' },
          { seeker: 'Priya Iyer', issue: 'Updated subscription payment method receipt required', status: 'Resolved', priority: 'Low' },
        ].map((t, idx) => (
          <div key={idx} className="p-4 bg-[#19202e] rounded-xl border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-[#dce2f6]">{t.seeker}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${t.priority === 'High' ? 'bg-rose-500/20 text-rose-400' : 'bg-[#f2ca50]/20 text-[#f2ca50]'}`}>
                  {t.priority}
                </span>
              </div>
              <p className="text-xs text-[#d0c5af]">{t.issue}</p>
            </div>
            <button
              onClick={() => alert(`Responding to ${t.seeker}...`)}
              className="px-4 py-2 bg-[#f2ca50] text-[#3c2f00] font-bold text-xs rounded-lg hover:brightness-110"
            >
              Respond
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export const SettingsView: React.FC = () => {
  const [bitrate, setBitrate] = useState('320kbps High Fidelity');
  const [cdnRegion, setCdnRegion] = useState('Asia South (Mumbai)');

  return (
    <div className="p-4 md:p-10 space-y-8 pb-28">
      <div>
        <h2 className="font-serif-headline text-3xl md:text-5xl text-[#dce2f6] font-bold">
          CMS & System Settings
        </h2>
        <p className="text-sm md:text-base text-[#d0c5af]/80 mt-1">
          Configure CDN audio bitrates, security credentials, and temple metadata.
        </p>
      </div>

      <div className="glass-card rounded-2xl p-6 md:p-8 max-w-2xl space-y-6">
        <div>
          <label className="block text-sm font-semibold text-[#dce2f6] mb-2">
            Audio Streaming Bitrate
          </label>
          <select
            value={bitrate}
            onChange={(e) => setBitrate(e.target.value)}
            className="w-full bg-[#19202e] border border-white/20 rounded-xl p-3 text-sm text-[#dce2f6] outline-none focus:border-[#f2ca50]"
          >
            <option value="320kbps High Fidelity">320kbps High Fidelity (FLAC/MP3)</option>
            <option value="192kbps Standard">192kbps Standard</option>
            <option value="128kbps Mobile Data Saver">128kbps Mobile Data Saver</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#dce2f6] mb-2">
            Primary CDN Endpoint Region
          </label>
          <select
            value={cdnRegion}
            onChange={(e) => setCdnRegion(e.target.value)}
            className="w-full bg-[#19202e] border border-white/20 rounded-xl p-3 text-sm text-[#dce2f6] outline-none focus:border-[#f2ca50]"
          >
            <option value="Asia South (Mumbai)">Asia South (Mumbai)</option>
            <option value="US East (N. Virginia)">US East (N. Virginia)</option>
            <option value="Europe West (London)">Europe West (London)</option>
          </select>
        </div>

        <div className="pt-4 border-t border-white/10 flex justify-end">
          <button
            onClick={() => alert('Settings saved successfully.')}
            className="px-6 py-2.5 bg-[#f2ca50] text-[#3c2f00] font-bold rounded-xl hover:brightness-110 shadow-lg"
          >
            Save System Settings
          </button>
        </div>
      </div>
    </div>
  );
};

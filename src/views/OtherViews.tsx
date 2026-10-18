import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';

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

// ─── Support Ticket Types ────────────────────────────────────────────────────
interface SupportTicket {
  id: string;
  title: string;
  description: string;
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  admin_reply: string | null;
  user_name: string;
  user_email: string;
  created_at: string;
  updated_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  'Open': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'In Progress': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'Resolved': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'Closed': 'bg-[#d0c5af]/10 text-[#d0c5af]/60 border-white/10',
};

// ─── Reply / Edit Modal ───────────────────────────────────────────────────────
const TicketModal: React.FC<{
  ticket: SupportTicket;
  onClose: () => void;
  onSave: (id: string, status: SupportTicket['status'], reply: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}> = ({ ticket, onClose, onSave, onDelete }) => {
  const [status, setStatus] = React.useState<SupportTicket['status']>(ticket.status);
  const [reply, setReply] = React.useState(ticket.admin_reply || '');
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(ticket.id, status, reply);
    setSaving(false);
    onClose();
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    await onDelete(ticket.id);
    setDeleting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-[#19202e] rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-white/10">
          <div className="flex-1 pr-4">
            <p className="text-xs text-[#d0c5af]/50 uppercase tracking-widest mb-1">Ticket #{ticket.id.slice(-6).toUpperCase()}</p>
            <h3 className="text-lg font-bold text-[#dce2f6] leading-snug">{ticket.title}</h3>
          </div>
          <button onClick={onClose} className="text-[#d0c5af]/50 hover:text-[#f2ca50] transition">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* User Info */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[#232a39] border border-white/5">
            <div className="w-9 h-9 rounded-full bg-[#f2ca50]/20 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[#f2ca50] text-lg">person</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#dce2f6]">{ticket.user_name}</p>
              <p className="text-xs text-[#d0c5af]/60">{ticket.user_email}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-[10px] text-[#d0c5af]/40">Raised</p>
              <p className="text-xs text-[#d0c5af]/70">{new Date(ticket.created_at).toLocaleString()}</p>
            </div>
          </div>

          {/* Description */}
          <div>
            <p className="text-xs font-semibold text-[#d0c5af]/50 uppercase tracking-wider mb-2">Description</p>
            <p className="text-sm text-[#d0c5af] leading-relaxed bg-[#232a39] rounded-xl p-4 border border-white/5">{ticket.description}</p>
          </div>

          {/* Status */}
          <div>
            <label className="text-xs font-semibold text-[#d0c5af]/50 uppercase tracking-wider block mb-2">Update Status</label>
            <div className="grid grid-cols-2 gap-2">
              {(['Open', 'In Progress', 'Resolved', 'Closed'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                    status === s
                      ? STATUS_STYLES[s] + ' ring-2 ring-offset-1 ring-offset-[#19202e] ring-current'
                      : 'bg-[#232a39] text-[#d0c5af]/50 border-white/5 hover:border-white/20'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Admin Reply */}
          <div>
            <label className="text-xs font-semibold text-[#d0c5af]/50 uppercase tracking-wider block mb-2">Admin Reply</label>
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={4}
              placeholder="Type your reply to the customer..."
              className="w-full bg-[#232a39] border border-white/10 rounded-xl p-3 text-sm text-[#dce2f6] placeholder-[#d0c5af]/30 outline-none focus:border-[#f2ca50]/50 resize-none transition"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-6 border-t border-white/10">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              confirmDelete
                ? 'bg-rose-500 text-white animate-pulse'
                : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20'
            }`}
          >
            {deleting ? 'Deleting...' : confirmDelete ? 'Confirm Delete?' : 'Delete Ticket'}
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold bg-white/5 text-[#d0c5af] hover:bg-white/10 transition">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-[#f2ca50] text-[#3c2f00] hover:brightness-110 transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main SupportView ─────────────────────────────────────────────────────────
export const SupportView: React.FC = () => {
  const [tickets, setTickets] = React.useState<SupportTicket[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selected, setSelected] = React.useState<SupportTicket | null>(null);
  const [filterStatus, setFilterStatus] = React.useState<string>('All');
  const [search, setSearch] = React.useState('');
  const [toast, setToast] = React.useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch tickets
  const fetchTickets = React.useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setTickets(data as SupportTicket[]);
    setLoading(false);
  }, []);

  // Real-time subscription
  React.useEffect(() => {
    fetchTickets();
    const channel = supabase
      .channel('support_tickets_admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => {
        fetchTickets();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchTickets]);

  const handleSave = async (id: string, status: SupportTicket['status'], admin_reply: string) => {
    const { error } = await supabase
      .from('support_tickets')
      .update({ status, admin_reply })
      .eq('id', id);
    if (error) { showToast('Failed to update ticket', 'error'); return; }
    showToast('Ticket updated successfully');
    fetchTickets();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('support_tickets').delete().eq('id', id);
    if (error) { showToast('Failed to delete ticket', 'error'); return; }
    showToast('Ticket deleted');
    fetchTickets();
  };

  const filtered = tickets.filter((t) => {
    const matchStatus = filterStatus === 'All' || t.status === filterStatus;
    const q = search.toLowerCase();
    const matchSearch = !q || t.title.toLowerCase().includes(q) || t.user_name.toLowerCase().includes(q) || t.user_email.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const counts = React.useMemo(() => ({
    All: tickets.length,
    Open: tickets.filter((t) => t.status === 'Open').length,
    'In Progress': tickets.filter((t) => t.status === 'In Progress').length,
    Resolved: tickets.filter((t) => t.status === 'Resolved').length,
    Closed: tickets.filter((t) => t.status === 'Closed').length,
  }), [tickets]);

  return (
    <div className="p-4 md:p-8 space-y-6 pb-28">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold flex items-center gap-2 transition-all ${
          toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
        }`}>
          <span className="material-symbols-outlined text-base">{toast.type === 'success' ? 'check_circle' : 'error'}</span>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif-headline text-3xl md:text-4xl text-[#dce2f6] font-bold">Support Tickets</h2>
          <p className="text-sm text-[#d0c5af]/70 mt-1">Manage customer support requests and send replies.</p>
        </div>
        <button
          onClick={fetchTickets}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#232a39] border border-white/10 text-[#d0c5af] hover:text-[#f2ca50] text-sm transition"
        >
          <span className="material-symbols-outlined text-base">refresh</span>
          Refresh
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(['All', 'Open', 'In Progress', 'Resolved', 'Closed'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`p-4 rounded-2xl border text-left transition-all ${
              filterStatus === s
                ? 'bg-[#f2ca50]/10 border-[#f2ca50]/40 shadow-[0_0_20px_rgba(242,202,80,0.08)]'
                : 'bg-[#232a39] border-white/5 hover:border-white/20'
            }`}
          >
            <p className={`text-2xl font-bold ${
              s === 'Open' ? 'text-blue-400' :
              s === 'In Progress' ? 'text-amber-400' :
              s === 'Resolved' ? 'text-emerald-400' :
              s === 'Closed' ? 'text-[#d0c5af]/50' : 'text-[#f2ca50]'
            }`}>{counts[s]}</p>
            <p className="text-xs text-[#d0c5af]/60 mt-0.5">{s}</p>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#d0c5af]/40 text-lg">search</span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title, name or email..."
          className="w-full pl-10 pr-4 py-3 bg-[#232a39] border border-white/10 rounded-xl text-sm text-[#dce2f6] placeholder-[#d0c5af]/30 outline-none focus:border-[#f2ca50]/50 transition"
        />
      </div>

      {/* Ticket List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-[#232a39] rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="material-symbols-outlined text-5xl text-[#d0c5af]/20 mb-3">inbox</span>
          <p className="text-[#d0c5af]/50 font-medium">No tickets found</p>
          <p className="text-xs text-[#d0c5af]/30 mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((ticket) => (
            <div
              key={ticket.id}
              className="group bg-[#232a39] rounded-2xl border border-white/5 hover:border-[#f2ca50]/20 p-5 transition-all hover:shadow-lg cursor-pointer"
              onClick={() => setSelected(ticket)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border uppercase tracking-wider ${STATUS_STYLES[ticket.status]}`}>
                      {ticket.status}
                    </span>
                    {ticket.admin_reply && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-semibold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[10px]">mark_email_read</span>
                        Admin replied
                      </span>
                    )}
                  </div>
                  <h4 className="font-semibold text-[#dce2f6] truncate">{ticket.title}</h4>
                  <p className="text-xs text-[#d0c5af]/60 mt-0.5 line-clamp-1">{ticket.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-medium text-[#dce2f6]">{ticket.user_name}</p>
                  <p className="text-xs text-[#d0c5af]/50">{ticket.user_email}</p>
                  <p className="text-[10px] text-[#d0c5af]/40 mt-1">{new Date(ticket.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {selected && (
        <TicketModal
          ticket={selected}
          onClose={() => setSelected(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
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

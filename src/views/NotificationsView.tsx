import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { SupabaseUser } from '../types';

interface Notification {
  id: string;
  title: string;
  body: string;
  target_type: 'all' | 'individual';
  target_user_ids: string[];
  sent_at: string;
  created_at: string;
}

const inputCls = 'w-full bg-[#0c1321] border border-white/10 rounded-xl py-2.5 px-3.5 text-xs text-[#dce2f6] placeholder-[#d0c5af]/30 focus:ring-1 focus:ring-[#f2ca50] outline-none transition-all';
const labelCls = 'text-[10px] font-semibold text-[#f2ca50] block mb-1.5';

export const NotificationsView: React.FC = () => {
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Compose form
  const [title,      setTitle]      = useState('');
  const [body,       setBody]       = useState('');
  const [targetType, setTargetType] = useState<'all' | 'individual'>('all');
  const [sending,    setSending]    = useState(false);
  const [editingId,  setEditingId]  = useState<string | null>(null); // null = new, string = editing existing

  // User picker
  const [users,         setUsers]         = useState<SupabaseUser[]>([]);
  const [loadingUsers,  setLoadingUsers]  = useState(false);
  const [userSearch,    setUserSearch]    = useState('');
  const [selectedUsers, setSelectedUsers] = useState<SupabaseUser[]>([]);

  // History
  const [history,        setHistory]        = useState<Notification[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [deleteTarget,   setDeleteTarget]   = useState<Notification | null>(null);
  const [deleting,       setDeleting]       = useState(false);
  const [reposting,      setReposting]      = useState<string | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => { fetchHistory(); }, []);

  useEffect(() => {
    if (targetType === 'individual') fetchUsers();
    else { setSelectedUsers([]); setUserSearch(''); }
  }, [targetType]);

  const fetchUsers = async () => {
    if (users.length > 0) return; // already loaded
    setLoadingUsers(true);
    const { data } = await supabase.from('users').select('id,full_name,email,avatar_url,mobile').order('full_name');
    setUsers((data as SupabaseUser[]) || []);
    setLoadingUsers(false);
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(50);
    setHistory((data as Notification[]) || []);
    setLoadingHistory(false);
  };

  const filteredUsers = users.filter(u =>
    u.full_name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.mobile || '').includes(userSearch)
  );

  const toggleUser = (u: SupabaseUser) =>
    setSelectedUsers(prev => prev.find(x => x.id === u.id) ? prev.filter(x => x.id !== u.id) : [...prev, u]);

  const resetForm = () => {
    setTitle(''); setBody(''); setSelectedUsers([]); setTargetType('all'); setEditingId(null);
  };

  // ── Send / Update ─────────────────────────────────────────────
  const handleSend = async () => {
    if (!title.trim() || !body.trim()) { showToast('Title and message are required', 'error'); return; }
    if (targetType === 'individual' && selectedUsers.length === 0) { showToast('Select at least one user', 'error'); return; }

    setSending(true);
    const payload = {
      title: title.trim(),
      body: body.trim(),
      target_type: targetType,
      target_user_ids: targetType === 'individual' ? selectedUsers.map(u => u.id) : [],
      sent_at: new Date().toISOString(),
    };

    const { error } = editingId
      ? await supabase.from('notifications').update(payload).eq('id', editingId)
      : await supabase.from('notifications').insert(payload);

    setSending(false);
    if (error) { showToast(error.message, 'error'); return; }

    showToast(editingId
      ? 'Notification updated!'
      : targetType === 'all'
        ? 'Notification sent to all users!'
        : `Notification sent to ${selectedUsers.length} user(s)!`
    );
    resetForm();
    fetchHistory();
  };

  // ── Load notification into compose for editing ────────────────
  const handleEdit = async (n: Notification) => {
    setEditingId(n.id);
    setTitle(n.title);
    setBody(n.body);
    setTargetType(n.target_type);

    if (n.target_type === 'individual' && n.target_user_ids?.length > 0) {
      // ensure users are loaded
      let allUsers = users;
      if (allUsers.length === 0) {
        const { data } = await supabase.from('users').select('id,full_name,email,avatar_url,mobile').order('full_name');
        allUsers = (data as SupabaseUser[]) || [];
        setUsers(allUsers);
      }
      setSelectedUsers(allUsers.filter(u => n.target_user_ids.includes(u.id)));
    } else {
      setSelectedUsers([]);
    }

    // scroll compose panel into view
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Repost (duplicate as new) ─────────────────────────────────
  const handleRepost = async (n: Notification) => {
    setReposting(n.id);
    const { error } = await supabase.from('notifications').insert({
      title: n.title,
      body: n.body,
      target_type: n.target_type,
      target_user_ids: n.target_user_ids,
      sent_at: new Date().toISOString(),
    });
    setReposting(null);
    if (error) { showToast(error.message, 'error'); return; }
    showToast('Notification reposted!');
    fetchHistory();
  };

  // ── Delete ────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from('notifications').delete().eq('id', deleteTarget.id);
    setDeleting(false);
    if (error) { showToast(error.message, 'error'); return; }
    showToast('Notification deleted');
    setDeleteTarget(null);
    if (editingId === deleteTarget.id) resetForm();
    fetchHistory();
  };

  return (
    <div className="p-4 md:p-10 space-y-8 pb-28 relative">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[200] px-5 py-3 rounded-2xl text-sm font-semibold shadow-2xl flex items-center gap-2
          ${toast.type === 'success' ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300' : 'bg-rose-500/20 border border-rose-500/40 text-rose-300'}`}>
          <span className="material-symbols-outlined text-base">{toast.type === 'success' ? 'check_circle' : 'error'}</span>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="font-serif-headline text-3xl md:text-5xl text-[#dce2f6] tracking-tight">Notifications</h2>
        <p className="text-base text-[#d0c5af]/80 mt-2">Send, edit, repost or delete notifications for all users or individuals.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* ── Compose Panel ── */}
        <div className={`glass-card rounded-2xl p-6 space-y-5 ${editingId ? 'border border-[#f2ca50]/30' : ''}`}>
          <h3 className="text-sm font-bold text-[#f2ca50] flex items-center gap-2">
            <span className="material-symbols-outlined text-base">{editingId ? 'edit_notifications' : 'edit_notifications'}</span>
            {editingId ? 'Edit Notification' : 'Compose Notification'}
            {editingId && (
              <button onClick={resetForm} className="ml-auto text-[10px] text-[#d0c5af]/50 hover:text-rose-400 flex items-center gap-1 transition-colors">
                <span className="material-symbols-outlined text-sm">close</span>Cancel Edit
              </button>
            )}
          </h3>

          {/* Target type toggle */}
          <div>
            <label className={labelCls}>Send To</label>
            <div className="flex gap-2">
              {(['all', 'individual'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTargetType(t)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5
                    ${targetType === t ? 'bg-[#f2ca50] text-[#3c2f00] border-[#f2ca50]' : 'bg-[#0c1321] text-[#d0c5af]/60 border-white/10 hover:border-[#f2ca50]/30'}`}
                >
                  <span className="material-symbols-outlined text-sm">{t === 'all' ? 'groups' : 'person_search'}</span>
                  {t === 'all' ? 'All Users' : 'Individual'}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className={labelCls}>Notification Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. New Shloka Available" className={inputCls} />
          </div>

          {/* Body */}
          <div>
            <label className={labelCls}>Message *</label>
            <textarea rows={4} value={body} onChange={e => setBody(e.target.value)} placeholder="Write your notification message..." className={`${inputCls} resize-none`} />
            <p className="text-[10px] text-[#d0c5af]/30 mt-1">{body.length} / 200 chars</p>
          </div>

          {/* Individual user picker */}
          {targetType === 'individual' && (
            <div className="space-y-3">
              <label className={labelCls}>Search & Select Users</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#d0c5af]/40 text-[18px]">search</span>
                <input
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder="Search by name, email or mobile..."
                  className="w-full bg-[#0c1321] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-[#dce2f6] placeholder-[#d0c5af]/30 focus:ring-1 focus:ring-[#f2ca50] outline-none"
                />
              </div>

              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedUsers.map(u => (
                    <span key={u.id} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#f2ca50]/10 border border-[#f2ca50]/20 text-[11px] text-[#f2ca50] font-semibold">
                      {u.full_name}
                      <button onClick={() => toggleUser(u)} className="hover:text-rose-400 transition-colors">
                        <span className="material-symbols-outlined text-[12px]">close</span>
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="max-h-52 overflow-y-auto rounded-xl border border-white/10 divide-y divide-white/5">
                {loadingUsers ? (
                  <div className="flex items-center justify-center h-20">
                    <span className="material-symbols-outlined animate-spin text-2xl text-[#f2ca50]">progress_activity</span>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <p className="text-center text-[#d0c5af]/40 text-xs py-6">No users found</p>
                ) : filteredUsers.map(u => {
                  const isSelected = !!selectedUsers.find(x => x.id === u.id);
                  return (
                    <button key={u.id} onClick={() => toggleUser(u)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/5 ${isSelected ? 'bg-[#f2ca50]/5' : ''}`}>
                      <div className={`w-4 h-4 rounded flex items-center justify-center border flex-shrink-0 transition-all ${isSelected ? 'bg-[#f2ca50] border-[#f2ca50]' : 'border-white/20 bg-[#0c1321]'}`}>
                        {isSelected && <span className="material-symbols-outlined text-[10px] text-[#3c2f00]">check</span>}
                      </div>
                      <div className="w-7 h-7 rounded-full bg-[#232a39] border border-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" alt="" /> : <span className="material-symbols-outlined text-[#f2ca50] text-sm">person</span>}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#dce2f6] truncate">{u.full_name}</p>
                        <p className="text-[10px] text-[#d0c5af]/50 truncate">{u.email}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-[#d0c5af]/40">{selectedUsers.length} user(s) selected</p>
            </div>
          )}

          {/* Send / Update button */}
          <button
            onClick={handleSend}
            disabled={sending}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#f2ca50] text-[#3c2f00] font-bold text-xs hover:brightness-110 transition-all disabled:opacity-50 shadow-lg shadow-[#f2ca50]/10"
          >
            {sending
              ? <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>Saving...</>
              : editingId
                ? <><span className="material-symbols-outlined text-sm">save</span>Update Notification</>
                : <><span className="material-symbols-outlined text-sm">send</span>Send Notification</>
            }
          </button>
        </div>

        {/* ── History Panel ── */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-[#f2ca50] flex items-center gap-2">
            <span className="material-symbols-outlined text-base">history</span>
            Sent History
            <span className="ml-auto text-[10px] text-[#d0c5af]/40 font-normal">{history.length} total</span>
          </h3>

          {loadingHistory ? (
            <div className="flex items-center justify-center h-40">
              <span className="material-symbols-outlined animate-spin text-3xl text-[#f2ca50]">progress_activity</span>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-16 text-[#d0c5af]/40 text-sm">No notifications sent yet.</div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {history.map(n => (
                <div key={n.id} className={`bg-[#0c1321] rounded-xl p-4 border transition-all space-y-2 ${editingId === n.id ? 'border-[#f2ca50]/40' : 'border-white/10'}`}>
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex-shrink-0
                        ${n.target_type === 'all' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-purple-500/10 text-purple-400 border-purple-500/20'}`}>
                        {n.target_type === 'all' ? 'All Users' : `${n.target_user_ids?.length ?? 0} Users`}
                      </span>
                      <p className="text-xs font-bold text-[#dce2f6] truncate">{n.title}</p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Edit */}
                      <button
                        onClick={() => handleEdit(n)}
                        title="Edit"
                        className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-blue-500/20 hover:text-blue-400 text-[#d0c5af]/50 transition-all"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                      </button>

                      {/* Repost */}
                      <button
                        onClick={() => handleRepost(n)}
                        disabled={reposting === n.id}
                        title="Repost"
                        className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-emerald-500/20 hover:text-emerald-400 text-[#d0c5af]/50 transition-all disabled:opacity-40"
                      >
                        {reposting === n.id
                          ? <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                          : <span className="material-symbols-outlined text-[16px]">repeat</span>
                        }
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => setDeleteTarget(n)}
                        title="Delete"
                        className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-rose-500/20 hover:text-rose-400 text-[#d0c5af]/50 transition-all"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-[#d0c5af]/60 leading-relaxed">{n.body}</p>
                  <p className="text-[10px] text-[#d0c5af]/30">
                    {new Date(n.sent_at || n.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Delete Confirm Modal ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative w-full max-w-sm bg-[#19202e] border border-rose-500/20 rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-rose-400 text-2xl">delete_forever</span>
            </div>
            <div className="text-center space-y-1">
              <h4 className="font-serif-headline text-base font-bold text-[#dce2f6]">Delete Notification?</h4>
              <p className="text-xs text-[#d0c5af]/60">
                "<span className="text-[#dce2f6] font-semibold">{deleteTarget.title}</span>" will be permanently removed.
              </p>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-[#d0c5af] text-xs font-semibold hover:bg-white/5 transition-all">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white text-xs font-bold hover:bg-rose-400 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5">
                {deleting && <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>}
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

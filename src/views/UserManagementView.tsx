import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { SupabaseUser } from '../types';

export const UserManagementView: React.FC = () => {
  const [users, setUsers] = useState<SupabaseUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingUser, setViewingUser] = useState<SupabaseUser | null>(null);
  const [editingUser, setEditingUser] = useState<SupabaseUser | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
    const channel = supabase
      .channel('public:users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, fetchUsers)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    if (error) setError(error.message);
    else setUsers(data as SupabaseUser[]);
    setLoading(false);
  };

  const handleDeleteUsers = async (ids: string[]) => {
    if (!confirm(`Delete ${ids.length} user(s)? This cannot be undone.`)) return;
    const { error } = await supabase.from('users').delete().in('id', ids);
    if (error) { alert(error.message); return; }
    setSelectedIds([]);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSaving(true);
    const { error } = await supabase
      .from('users')
      .update({
        full_name: editingUser.full_name,
        email: editingUser.email,
        mobile: editingUser.mobile,
        day_streak: editingUser.day_streak,
        books_read: editingUser.books_read,
        events_count: editingUser.events_count,
        chant_count: editingUser.chant_count,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editingUser.id);
    setSaving(false);
    if (error) { alert(error.message); return; }
    setEditingUser(null);
    fetchUsers();
  };

  const handleExportCSV = () => {
    const headers = 'ID,Full Name,Email,Mobile,Day Streak,Books Read,Events,Chant Count,Joined\n';
    const rows = filteredUsers
      .map((u) => `"${u.id}","${u.full_name}","${u.email}","${u.mobile}","${u.day_streak}","${u.books_read}","${u.events_count}","${u.chant_count}","${u.created_at}"`)
      .join('\n');
    const link = document.createElement('a');
    link.href = 'data:text/csv;charset=utf-8,' + encodeURI(headers + rows);
    link.download = 'sadhana_users.csv';
    link.click();
  };

  const filteredUsers = users.filter((u) =>
    u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const allSelected = filteredUsers.length > 0 && selectedIds.length === filteredUsers.length;
  const toggleSelectAll = () => setSelectedIds(allSelected ? [] : filteredUsers.map((u) => u.id));
  const toggleRow = (id: string) =>
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <span className="material-symbols-outlined animate-spin text-4xl text-[#f2ca50]">progress_activity</span>
    </div>
  );

  if (error) return (
    <div className="p-10 text-rose-400 flex items-center gap-2">
      <span className="material-symbols-outlined">error</span>{error}
    </div>
  );

  const inputCls = "w-full bg-[#0c1321] border border-white/10 rounded-xl py-2.5 px-3.5 text-xs text-[#dce2f6] focus:ring-1 focus:ring-[#f2ca50] outline-none";

  return (
    <div className="p-4 md:p-10 space-y-6 pb-28">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="font-serif-headline text-3xl md:text-5xl text-[#dce2f6] tracking-tight">User Management</h2>
          <p className="text-base text-[#d0c5af]/80 mt-2">
            <span className="text-[#f2ca50] font-semibold">{users.length}</span> registered seekers
          </p>
        </div>
        <button onClick={handleExportCSV} className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 bg-[#232a39]/50 font-semibold text-sm text-[#dce2f6] hover:bg-white/10 transition-all">
          <span className="material-symbols-outlined text-[20px]">file_download</span>Export CSV
        </button>
      </div>

      {/* Toolbar */}
      <div className="glass-card rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#d0c5af] text-[18px]">search</span>
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by name or email..."
              className="bg-[#19202e] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-[#dce2f6] focus:border-[#f2ca50] outline-none w-64" />
          </div>
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 ml-2 pl-3 border-l border-white/10">
              <span className="text-xs font-semibold text-[#f2ca50]">{selectedIds.length} Selected</span>
              <button onClick={() => handleDeleteUsers(selectedIds)}
                className="px-3 py-1.5 rounded-lg bg-[#93000a]/40 text-[#ffb4ab] text-xs font-semibold hover:bg-[#93000a]/60 border border-[#ffb4ab]/20 transition-all">
                Delete Selected
              </button>
            </div>
          )}
        </div>
        <p className="text-xs text-[#d0c5af]">Showing {filteredUsers.length} of {users.length}</p>
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#19202e] border-b-2 border-[#f2ca50]/20 text-[11px] text-[#d0c5af] uppercase tracking-wider font-semibold">
                <th className="py-4 px-6"><input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="rounded border-white/20 bg-[#19202e] text-[#f2ca50]" /></th>
                <th className="py-4 px-4">Avatar</th>
                <th className="py-4 px-4">Name & Email</th>
                <th className="py-4 px-4">Mobile</th>
                <th className="py-4 px-4">Streak</th>
                <th className="py-4 px-4">Books</th>
                <th className="py-4 px-4">Events</th>
                <th className="py-4 px-4">Chants</th>
                <th className="py-4 px-4">Joined</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {filteredUsers.length === 0 ? (
                <tr><td colSpan={10} className="py-16 text-center text-[#d0c5af]/50 text-sm">No users found.</td></tr>
              ) : filteredUsers.map((user) => {
                const isSelected = selectedIds.includes(user.id);
                return (
                  <tr key={user.id} className={`hover:bg-white/[0.02] transition-colors group ${isSelected ? 'bg-[#f2ca50]/5' : ''}`}>
                    <td className="py-4 px-6"><input type="checkbox" checked={isSelected} onChange={() => toggleRow(user.id)} className="rounded border-white/20 bg-[#19202e] text-[#f2ca50]" /></td>
                    <td className="py-4 px-4">
                      <div className="w-10 h-10 rounded-full border-2 border-[#f2ca50]/30 overflow-hidden bg-[#232a39] flex items-center justify-center">
                        {user.avatar_url ? <img className="w-full h-full object-cover" src={user.avatar_url} alt={user.full_name} /> : <span className="material-symbols-outlined text-[#f2ca50] text-xl">person</span>}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-semibold text-[#dce2f6] group-hover:text-[#f2ca50] transition-colors block">{user.full_name}</span>
                      <span className="text-xs text-[#d0c5af]/70">{user.email}</span>
                    </td>
                    <td className="py-4 px-4 text-xs text-[#d0c5af]">{user.mobile || '—'}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1 text-xs text-[#f2ca50] font-semibold">
                        <span className="material-symbols-outlined text-[14px]">local_fire_department</span>{user.day_streak}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-xs text-[#d0c5af]">{user.books_read}</td>
                    <td className="py-4 px-4 text-xs text-[#d0c5af]">{user.events_count}</td>
                    <td className="py-4 px-4 text-xs text-[#d0c5af]">{user.chant_count}</td>
                    <td className="py-4 px-4 text-xs text-[#d0c5af]">{new Date(user.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setViewingUser(user)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#f2ca50]/10 hover:text-[#f2ca50] text-[#d0c5af] transition-all" title="View">
                          <span className="material-symbols-outlined text-[18px]">visibility</span>
                        </button>
                        <button onClick={() => setEditingUser({ ...user })} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-blue-500/20 hover:text-blue-400 text-[#d0c5af] transition-all" title="Edit">
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button onClick={() => handleDeleteUsers([user.id])} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-rose-500/20 hover:text-rose-400 text-[#d0c5af] transition-all" title="Delete">
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Modal */}
      {viewingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="glass-card w-full max-w-md rounded-2xl p-6 relative shadow-2xl border-t-2 border-[#f2ca50]">
            <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
              <h3 className="font-serif-headline text-lg font-bold text-[#f2ca50]">User Details</h3>
              <button onClick={() => setViewingUser(null)} className="text-[#d0c5af] hover:text-white"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="flex items-center gap-4 mb-5">
              <div className="w-16 h-16 rounded-full border-2 border-[#f2ca50]/40 overflow-hidden bg-[#232a39] flex items-center justify-center">
                {viewingUser.avatar_url ? <img className="w-full h-full object-cover" src={viewingUser.avatar_url} alt={viewingUser.full_name} /> : <span className="material-symbols-outlined text-[#f2ca50] text-3xl">person</span>}
              </div>
              <div>
                <p className="font-bold text-[#dce2f6] text-lg">{viewingUser.full_name}</p>
                <p className="text-xs text-[#d0c5af]/70">{viewingUser.email}</p>
                {viewingUser.mobile && <p className="text-xs text-[#d0c5af]/70">{viewingUser.mobile}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                { label: 'Day Streak', value: viewingUser.day_streak, icon: 'local_fire_department' },
                { label: 'Books Read', value: viewingUser.books_read, icon: 'menu_book' },
                { label: 'Events', value: viewingUser.events_count, icon: 'event' },
                { label: 'Chant Count', value: viewingUser.chant_count, icon: 'self_improvement' },
              ].map(({ label, value, icon }) => (
                <div key={label} className="bg-[#19202e] rounded-xl p-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#f2ca50] text-base">{icon}</span>
                  <div>
                    <p className="text-[#d0c5af]/60 text-[10px] uppercase tracking-wider">{label}</p>
                    <p className="font-bold text-[#dce2f6]">{value}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-xs text-[#d0c5af]/50 border-t border-white/10 pt-3">
              <p>Joined: {new Date(viewingUser.created_at).toLocaleString('en-IN')}</p>
              <p className="mt-1 truncate">UID: {viewingUser.firebase_uid || viewingUser.id}</p>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="glass-card w-full max-w-md rounded-2xl p-6 relative shadow-2xl border-t-2 border-blue-400/60">
            <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
              <h3 className="font-serif-headline text-lg font-bold text-[#f2ca50]">Edit User</h3>
              <button onClick={() => setEditingUser(null)} className="text-[#d0c5af] hover:text-white"><span className="material-symbols-outlined">close</span></button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="text-[#f2ca50] font-semibold block mb-1">Full Name</label>
                <input type="text" value={editingUser.full_name} onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="text-[#f2ca50] font-semibold block mb-1">Email</label>
                <input type="email" value={editingUser.email} onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="text-[#f2ca50] font-semibold block mb-1">Mobile</label>
                <input type="tel" value={editingUser.mobile || ''} onChange={(e) => setEditingUser({ ...editingUser, mobile: e.target.value })} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#f2ca50] font-semibold block mb-1">Day Streak</label>
                  <input type="number" min={0} value={editingUser.day_streak} onChange={(e) => setEditingUser({ ...editingUser, day_streak: Number(e.target.value) })} className={inputCls} />
                </div>
                <div>
                  <label className="text-[#f2ca50] font-semibold block mb-1">Chant Count</label>
                  <input type="number" min={0} value={editingUser.chant_count} onChange={(e) => setEditingUser({ ...editingUser, chant_count: Number(e.target.value) })} className={inputCls} />
                </div>
                <div>
                  <label className="text-[#f2ca50] font-semibold block mb-1">Books Read</label>
                  <input type="number" min={0} value={editingUser.books_read} onChange={(e) => setEditingUser({ ...editingUser, books_read: Number(e.target.value) })} className={inputCls} />
                </div>
                <div>
                  <label className="text-[#f2ca50] font-semibold block mb-1">Events Count</label>
                  <input type="number" min={0} value={editingUser.events_count} onChange={(e) => setEditingUser({ ...editingUser, events_count: Number(e.target.value) })} className={inputCls} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 rounded-xl border border-white/10 text-[#d0c5af] hover:bg-white/5 text-xs">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2 rounded-xl bg-[#f2ca50] text-[#3c2f00] font-bold text-xs hover:brightness-110 disabled:opacity-60 flex items-center gap-2">
                  {saving && <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import { useState } from 'react';
import {
  Settings,
  Search,
  CheckCircle,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { usePortalStore } from '../store/portalStore';
import { UserRole } from '../types';

export function AdminPanelPage() {
  const allUsers = usePortalStore((s) => s.allUsers);
  const auditLogs = usePortalStore((s) => s.auditLogs);
  const systemConfig = usePortalStore((s) => s.systemConfig);
  const updateUserRole = usePortalStore((s) => s.updateUserRole);
  const toggleUserStatus = usePortalStore((s) => s.toggleUserStatus);
  const updateSystemConfig = usePortalStore((s) => s.updateSystemConfig);

  const [activeTab, setActiveTab] = useState<'users' | 'moderation' | 'config' | 'logs'>('users');
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('All');

  // Moderation state
  const [moderationQueue, setModerationQueue] = useState([
    { id: 1, type: 'Job Post', title: 'Senior Women Tech Lead (FemmeForward)', submittedBy: 'HR Team', status: 'Pending Review' },
    { id: 2, type: 'Course', title: 'Advanced Negotiation & Board Presence', submittedBy: 'Ritu Kapur', status: 'Pending Review' },
    { id: 3, type: 'Community Event', title: 'Jaipur Offline Self-Defense Bootcamp', submittedBy: 'Kavita Rao', status: 'Pending Review' },
  ]);

  const filteredUsers = allUsers.filter((u) => {
    const matchesRole = roleFilter === 'All' || u.role === roleFilter;
    const matchesSearch =
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const handleApproveItem = (id: number) => {
    setModerationQueue(moderationQueue.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700 dark:bg-purple-950 dark:text-purple-300">
            <Settings className="size-3.5" />
            <span>Root Governance &amp; Administration</span>
          </div>
          <h1 className="mt-2 text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
            Admin Operations Command Center
          </h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Role-Based Access Control (RBAC), content moderation, system parameter tuning, and audit trails.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-slate-200 scrollbar-none dark:border-slate-800">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('users')}
            className={`border-b-2 pb-3 text-sm font-bold transition whitespace-nowrap ${
              activeTab === 'users'
                ? 'border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            User &amp; Role Management ({allUsers.length})
          </button>
          <button
            onClick={() => setActiveTab('moderation')}
            className={`border-b-2 pb-3 text-sm font-bold transition whitespace-nowrap ${
              activeTab === 'moderation'
                ? 'border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            Content Moderation ({moderationQueue.length})
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`border-b-2 pb-3 text-sm font-bold transition whitespace-nowrap ${
              activeTab === 'config'
                ? 'border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            System Configuration
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`border-b-2 pb-3 text-sm font-bold transition whitespace-nowrap ${
              activeTab === 'logs'
                ? 'border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            Real-Time Audit Logs ({auditLogs.length})
          </button>
        </div>
      </div>

      {/* 1. User & Role Management Tab */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex gap-2">
              {['All', 'Beneficiary', 'Mentor', 'Admin', 'Volunteer'].map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold ${
                    roleFilter === r
                      ? 'bg-purple-600 text-white'
                      : 'border border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <div className="relative w-64">
              <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-xs outline-none focus:border-purple-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-400 dark:border-slate-800 dark:bg-slate-800/40">
                <tr>
                  <th className="p-4">User</th>
                  <th className="p-4">Role Assignment</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Joined Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="size-9 rounded-full object-cover"
                        />
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{user.name}</p>
                          <p className="text-[11px] text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <select
                        value={user.role}
                        onChange={(e) => updateUserRole(user.id, e.target.value as UserRole)}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      >
                        <option value="Beneficiary">Beneficiary</option>
                        <option value="Mentor">Mentor</option>
                        <option value="Admin">Admin</option>
                        <option value="Volunteer">Volunteer</option>
                      </select>
                    </td>
                    <td className="p-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          user.status === 'Active'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500 font-mono">{user.joinedDate}</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => toggleUserStatus(user.id)}
                        className={`rounded-lg px-3 py-1 font-semibold ${
                          user.status === 'Active'
                            ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40'
                            : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                        }`}
                      >
                        {user.status === 'Active' ? 'Suspend' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. Content Moderation Tab */}
      {activeTab === 'moderation' && (
        <div className="space-y-4">
          {moderationQueue.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
              <CheckCircle className="mx-auto size-12 text-emerald-500" />
              <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">All Clear!</h3>
              <p className="mt-1 text-xs text-slate-500">No pending submissions awaiting administrator review.</p>
            </div>
          ) : (
            moderationQueue.map((item) => (
              <div
                key={item.id}
                className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center"
              >
                <div>
                  <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                    {item.type}
                  </span>
                  <h4 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">{item.title}</h4>
                  <p className="text-xs text-slate-500">Submitted by: {item.submittedBy}</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleApproveItem(item.id)}
                    className="flex items-center gap-1 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                  >
                    <CheckCircle className="size-3.5" /> Approve &amp; Publish
                  </button>
                  <button
                    onClick={() => handleApproveItem(item.id)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 3. System Configuration Tab */}
      {activeTab === 'config' && (
        <div className="max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Platform Operational Parameters</h3>

          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">Emergency SMS Gateway Dispatch</p>
              <p className="text-[11px] text-slate-500">Enable automated multi-channel SMS alert fallback when offline.</p>
            </div>
            <button
              onClick={() => updateSystemConfig({ smsGatewayActive: !systemConfig.smsGatewayActive })}
              className={`rounded-full p-1 text-xs font-bold ${
                systemConfig.smsGatewayActive ? 'text-emerald-600' : 'text-slate-400'
              }`}
            >
              {systemConfig.smsGatewayActive ? <ToggleRight className="size-8" /> : <ToggleLeft className="size-8" />}
            </button>
          </div>

          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">Platform Maintenance Mode</p>
              <p className="text-[11px] text-slate-500">Temporarily restrict new logins for scheduled security updates.</p>
            </div>
            <button
              onClick={() => updateSystemConfig({ maintenanceMode: !systemConfig.maintenanceMode })}
              className={`rounded-full p-1 text-xs font-bold ${
                systemConfig.maintenanceMode ? 'text-amber-600' : 'text-slate-400'
              }`}
            >
              {systemConfig.maintenanceMode ? <ToggleRight className="size-8" /> : <ToggleLeft className="size-8" />}
            </button>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
              <span>AI Skill Matching Sensitivity</span>
              <span>{systemConfig.aiSkillMatchingSensitivity}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="100"
              value={systemConfig.aiSkillMatchingSensitivity}
              onChange={(e) => updateSystemConfig({ aiSkillMatchingSensitivity: Number(e.target.value) })}
              className="mt-2 w-full accent-purple-600"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
              <span>SOS Cancellation Buffer Window</span>
              <span>{systemConfig.sosBroadcastDelaySeconds} Seconds</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={systemConfig.sosBroadcastDelaySeconds}
              onChange={(e) => updateSystemConfig({ sosBroadcastDelaySeconds: Number(e.target.value) })}
              className="mt-2 w-full accent-purple-600"
            />
          </div>
        </div>
      )}

      {/* 4. Audit Logs Tab */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-xs font-mono">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-400 dark:border-slate-800 dark:bg-slate-800/40">
                <tr>
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">User &amp; Role</th>
                  <th className="p-4">Action Event</th>
                  <th className="p-4">Details</th>
                  <th className="p-4">IP Address</th>
                  <th className="p-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-4 text-slate-500 whitespace-nowrap">{log.timestamp}</td>
                    <td className="p-4 font-bold text-slate-800 dark:text-slate-200">
                      {log.user} ({log.role})
                    </td>
                    <td className="p-4 font-bold text-purple-600">{log.action}</td>
                    <td className="p-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">{log.details}</td>
                    <td className="p-4 text-slate-500">{log.ip}</td>
                    <td className="p-4 text-right">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          log.status === 'SUCCESS'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : log.status === 'ALERT'
                            ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

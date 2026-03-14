import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import EquipmentAnalytics from '../components/EquipmentAnalytics';

interface AdminSettings {
  email_notifications_enabled: boolean;
  backup_frequency: string;
  last_backup_date: string | null;
  notification_email: string;
}

interface BackupLog {
  id: string;
  backup_type: string;
  file_size_kb: number;
  created_at: string;
  data_snapshot: any;
}

interface StrategyDoc {
  id: string;
  title: string;
  content: string;
  category: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

interface EquipmentListing {
  id: string;
  equipment_type: string;
  tier: string;
  name: string;
  description: string;
  specs: any;
  coins_per_hour: number;
  available: boolean;
  total_rentals: number;
  rating: number;
}

export default function Admin() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'backup' | 'strategy' | 'settings' | 'equipment' | 'analytics' | 'site'>('analytics');
  const [settings, setSettings] = useState<AdminSettings>({
    email_notifications_enabled: true,
    backup_frequency: 'weekly',
    last_backup_date: null,
    notification_email: ''
  });
  const [backupLogs, setBackupLogs] = useState<BackupLog[]>([]);
  const [strategyDocs, setStrategyDocs] = useState<StrategyDoc[]>([]);
  const [equipment, setEquipment] = useState<EquipmentListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [newDoc, setNewDoc] = useState({ title: '', content: '', category: 'general' });
  const [editingDoc, setEditingDoc] = useState<string | null>(null);
  const [editingEquipment, setEditingEquipment] = useState<string | null>(null);
  const [socialLinks, setSocialLinks] = useState<any[]>([]);
  const [editingLink, setEditingLink] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadAdminData();
    }
  }, [user]);

  const loadAdminData = async () => {
    await Promise.all([
      loadSettings(),
      loadBackupLogs(),
      loadStrategyDocs(),
      loadEquipment(),
      loadSocialLinks()
    ]);
  };

  const loadSettings = async () => {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('*')
      .eq('user_id', user?.id)
      .maybeSingle();

    if (data) {
      setSettings(data);
    } else if (!error) {
      const newSettings = {
        user_id: user?.id,
        email_notifications_enabled: true,
        backup_frequency: 'weekly',
        notification_email: user?.email || '',
        last_backup_date: null
      };
      await supabase.from('admin_settings').insert(newSettings);
      setSettings({
        email_notifications_enabled: true,
        backup_frequency: 'weekly',
        notification_email: user?.email || '',
        last_backup_date: null
      });
    }
  };

  const loadBackupLogs = async () => {
    const { data } = await supabase
      .from('backup_logs')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) setBackupLogs(data);
  };

  const loadStrategyDocs = async () => {
    const { data } = await supabase
      .from('strategy_docs')
      .select('*')
      .eq('user_id', user?.id)
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false });

    if (data) setStrategyDocs(data);
  };

  const loadEquipment = async () => {
    const { data } = await supabase
      .from('equipment_listings')
      .select('*')
      .order('tier', { ascending: true })
      .order('coins_per_hour', { ascending: true });

    if (data) setEquipment(data);
  };

  const loadSocialLinks = async () => {
    const { data } = await supabase
      .from('social_media_connections')
      .select('*')
      .eq('is_company_link', true)
      .order('platform', { ascending: true });

    if (data) setSocialLinks(data);
  };

  const updateSocialLink = async (id: string, profile_url: string, is_active: boolean) => {
    const { error } = await supabase
      .from('social_media_connections')
      .update({ profile_url, is_active })
      .eq('id', id);

    if (!error) {
      setMessage('Social link updated!');
      await loadSocialLinks();
      setEditingLink(null);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const addSocialLink = async (platform: string) => {
    const { error } = await supabase
      .from('social_media_connections')
      .insert({
        platform,
        profile_url: '#',
        is_company_link: true,
        is_active: true
      });

    if (!error) {
      setMessage('Social link added!');
      await loadSocialLinks();
      setTimeout(() => setMessage(''), 3000);
    } else {
      setMessage('Error adding link (may already exist)');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const toggleEquipmentAvailability = async (id: string, available: boolean) => {
    const { error } = await supabase
      .from('equipment_listings')
      .update({ available: !available })
      .eq('id', id);

    if (!error) {
      setMessage(`Equipment ${!available ? 'enabled' : 'disabled'} successfully!`);
      await loadEquipment();
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const updateEquipmentPrice = async (id: string, coins_per_hour: number) => {
    if (coins_per_hour < 1 || coins_per_hour > 100) {
      setMessage('Price must be between 1-100 DL365/hour');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    const { error } = await supabase
      .from('equipment_listings')
      .update({ coins_per_hour })
      .eq('id', id);

    if (!error) {
      setMessage('Equipment price updated!');
      await loadEquipment();
      setEditingEquipment(null);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const deleteEquipment = async (id: string) => {
    if (!confirm('Delete this equipment? This cannot be undone.')) return;

    const { error } = await supabase
      .from('equipment_listings')
      .delete()
      .eq('id', id);

    if (!error) {
      setMessage('Equipment deleted!');
      await loadEquipment();
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const createBackup = async (type: 'manual' | 'automatic' = 'manual') => {
    setLoading(true);
    setMessage('Creating backup...');

    try {
      const [profileData, walletData, rentalData, purchaseData, streamData] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user?.id).maybeSingle(),
        supabase.from('user_wallets').select('*').eq('user_id', user?.id).maybeSingle(),
        supabase.from('equipment_rentals').select('*').eq('renter_id', user?.id),
        supabase.from('card_purchases').select('*').eq('user_id', user?.id),
        supabase.from('stream_sessions').select('*').eq('broadcaster_id', user?.id)
      ]);

      const backupData = {
        timestamp: new Date().toISOString(),
        user_email: user?.email,
        profile: profileData.data,
        wallet: walletData.data,
        rentals: rentalData.data || [],
        purchases: purchaseData.data || [],
        streams: streamData.data || [],
        strategy_docs: strategyDocs
      };

      const dataString = JSON.stringify(backupData, null, 2);
      const sizeKB = Math.round(new Blob([dataString]).size / 1024);

      const { error } = await supabase.from('backup_logs').insert({
        user_id: user?.id,
        backup_type: type,
        data_snapshot: backupData,
        file_size_kb: sizeKB
      });

      if (!error) {
        const blob = new Blob([dataString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `daylight-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        await supabase.from('admin_settings').update({
          last_backup_date: new Date().toISOString()
        }).eq('user_id', user?.id);

        setMessage('Backup created and downloaded successfully!');
        await loadBackupLogs();
        await loadSettings();
      }
    } catch (err) {
      setMessage('Error creating backup');
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const downloadBackup = (backup: BackupLog) => {
    const dataString = JSON.stringify(backup.data_snapshot, null, 2);
    const blob = new Blob([dataString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-${backup.created_at.split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const updateSettings = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('admin_settings')
      .update(settings)
      .eq('user_id', user?.id);

    if (!error) {
      setMessage('Settings updated successfully!');
    } else {
      setMessage('Error updating settings');
    }
    setLoading(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const createStrategyDoc = async () => {
    if (!newDoc.title.trim()) return;

    setLoading(true);
    const { error } = await supabase.from('strategy_docs').insert({
      user_id: user?.id,
      ...newDoc
    });

    if (!error) {
      setNewDoc({ title: '', content: '', category: 'general' });
      setMessage('Strategy doc created!');
      await loadStrategyDocs();
    }
    setLoading(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const updateStrategyDoc = async (id: string, updates: Partial<StrategyDoc>) => {
    const { error } = await supabase
      .from('strategy_docs')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (!error) {
      await loadStrategyDocs();
      setEditingDoc(null);
    }
  };

  const deleteStrategyDoc = async (id: string) => {
    if (!confirm('Delete this strategy doc?')) return;

    const { error } = await supabase.from('strategy_docs').delete().eq('id', id);
    if (!error) await loadStrategyDocs();
  };

  const exportAllDocs = () => {
    const docsText = strategyDocs.map(doc =>
      `# ${doc.title}\nCategory: ${doc.category}\nCreated: ${new Date(doc.created_at).toLocaleDateString()}\n\n${doc.content}\n\n---\n\n`
    ).join('');

    const blob = new Blob([docsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `strategy-docs-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">Admin Control Panel</h1>
        <p className="text-blue-300 mb-8">Backup your data, manage strategies, and configure notifications</p>

        {message && (
          <div className="mb-6 p-4 bg-green-500/20 border border-green-500 rounded-lg text-green-200">
            {message}
          </div>
        )}

        <div className="flex gap-4 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-6 py-3 rounded-lg font-semibold transition whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('equipment')}
            className={`px-6 py-3 rounded-lg font-semibold transition whitespace-nowrap ${
              activeTab === 'equipment'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Equipment Manager
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`px-6 py-3 rounded-lg font-semibold transition whitespace-nowrap ${
              activeTab === 'backup'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Backup & Export
          </button>
          <button
            onClick={() => setActiveTab('strategy')}
            className={`px-6 py-3 rounded-lg font-semibold transition whitespace-nowrap ${
              activeTab === 'strategy'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Strategy Docs
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-3 rounded-lg font-semibold transition whitespace-nowrap ${
              activeTab === 'settings'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Settings
          </button>
          <button
            onClick={() => setActiveTab('site')}
            className={`px-6 py-3 rounded-lg font-semibold transition whitespace-nowrap ${
              activeTab === 'site'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Site Config
          </button>
        </div>

        {activeTab === 'analytics' && <EquipmentAnalytics />}

        {activeTab === 'equipment' && (
          <div className="space-y-6">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
              <h2 className="text-2xl font-bold mb-4">Equipment Marketplace Manager</h2>
              <p className="text-slate-300 mb-6">
                Manage all equipment listings. Total listings: {equipment.length} |
                Available: {equipment.filter(e => e.available).length}
              </p>

              <div className="grid gap-4">
                {['basic', 'advanced', 'professional', 'elite'].map((tier) => {
                  const tierEquipment = equipment.filter(e => e.tier === tier);
                  return (
                    <div key={tier} className="bg-slate-700/50 rounded-lg p-4">
                      <h3 className="text-xl font-bold mb-3 capitalize flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${
                          tier === 'basic' ? 'bg-gray-400' :
                          tier === 'advanced' ? 'bg-blue-400' :
                          tier === 'professional' ? 'bg-purple-400' :
                          'bg-yellow-400'
                        }`}></span>
                        {tier} Tier ({tierEquipment.length})
                      </h3>
                      <div className="space-y-2">
                        {tierEquipment.map((eq) => (
                          <div key={eq.id} className="bg-slate-800 rounded-lg p-3 flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                  eq.available ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                                }`}>
                                  {eq.available ? 'Active' : 'Disabled'}
                                </span>
                                <span className="font-semibold">{eq.name}</span>
                                <span className="text-sm text-slate-400 capitalize">({eq.equipment_type})</span>
                              </div>
                              <div className="flex items-center gap-4 mt-1 text-sm text-slate-400">
                                {editingEquipment === eq.id ? (
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      min="1"
                                      max="100"
                                      defaultValue={eq.coins_per_hour}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          updateEquipmentPrice(eq.id, parseInt((e.target as HTMLInputElement).value));
                                        }
                                      }}
                                      className="w-20 bg-slate-700 border border-slate-600 rounded px-2 py-1"
                                      autoFocus
                                    />
                                    <button
                                      onClick={(e) => {
                                        const input = (e.target as HTMLElement).parentElement?.querySelector('input');
                                        if (input) updateEquipmentPrice(eq.id, parseInt(input.value));
                                      }}
                                      className="text-green-400 hover:text-green-300"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => setEditingEquipment(null)}
                                      className="text-slate-400 hover:text-slate-300"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <span>💰 {eq.coins_per_hour} DL365/hr</span>
                                    <span>📊 {eq.total_rentals} rentals</span>
                                    <span>⭐ {eq.rating.toFixed(1)}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {editingEquipment !== eq.id && (
                                <>
                                  <button
                                    onClick={() => toggleEquipmentAvailability(eq.id, eq.available)}
                                    className={`px-3 py-1 rounded text-sm transition ${
                                      eq.available
                                        ? 'bg-red-600 hover:bg-red-700'
                                        : 'bg-green-600 hover:bg-green-700'
                                    }`}
                                  >
                                    {eq.available ? 'Disable' : 'Enable'}
                                  </button>
                                  <button
                                    onClick={() => setEditingEquipment(eq.id)}
                                    className="px-3 py-1 rounded text-sm bg-blue-600 hover:bg-blue-700 transition"
                                  >
                                    Edit Price
                                  </button>
                                  <button
                                    onClick={() => deleteEquipment(eq.id)}
                                    className="px-3 py-1 rounded text-sm bg-slate-600 hover:bg-slate-500 transition"
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'backup' && (
          <div className="space-y-6">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
              <h2 className="text-2xl font-bold mb-4">Data Backup</h2>
              <p className="text-slate-300 mb-6">
                Export all your data including profile, wallet, rentals, purchases, and streams.
                Your backups are automatically saved and can be downloaded anytime.
              </p>

              <button
                onClick={() => createBackup('manual')}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-semibold transition disabled:opacity-50"
              >
                {loading ? 'Creating Backup...' : 'Create Backup Now'}
              </button>

              {settings.last_backup_date && (
                <p className="text-sm text-slate-400 mt-4">
                  Last backup: {new Date(settings.last_backup_date).toLocaleString()}
                </p>
              )}
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
              <h2 className="text-2xl font-bold mb-4">Backup History</h2>
              <div className="space-y-3">
                {backupLogs.length === 0 ? (
                  <p className="text-slate-400">No backups yet. Create your first backup above!</p>
                ) : (
                  backupLogs.map((backup) => (
                    <div key={backup.id} className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                      <div>
                        <p className="font-semibold">
                          {backup.backup_type === 'manual' ? 'Manual' : 'Automatic'} Backup
                        </p>
                        <p className="text-sm text-slate-400">
                          {new Date(backup.created_at).toLocaleString()} • {backup.file_size_kb} KB
                        </p>
                      </div>
                      <button
                        onClick={() => downloadBackup(backup)}
                        className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition"
                      >
                        Download
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'strategy' && (
          <div className="space-y-6">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Strategy Documents</h2>
                {strategyDocs.length > 0 && (
                  <button
                    onClick={exportAllDocs}
                    className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition"
                  >
                    Export All Docs
                  </button>
                )}
              </div>

              <div className="space-y-4 mb-6">
                <input
                  type="text"
                  placeholder="Document Title"
                  value={newDoc.title}
                  onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                />
                <select
                  value={newDoc.category}
                  onChange={(e) => setNewDoc({ ...newDoc, category: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                >
                  <option value="general">General</option>
                  <option value="gaming">Gaming</option>
                  <option value="streaming">Streaming</option>
                  <option value="compute">Compute</option>
                  <option value="trading">Trading</option>
                </select>
                <textarea
                  placeholder="Write your strategy notes here..."
                  value={newDoc.content}
                  onChange={(e) => setNewDoc({ ...newDoc, content: e.target.value })}
                  rows={6}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={createStrategyDoc}
                  disabled={loading || !newDoc.title.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition disabled:opacity-50"
                >
                  Create Document
                </button>
              </div>

              <div className="space-y-4">
                {strategyDocs.map((doc) => (
                  <div key={doc.id} className="bg-slate-700/50 rounded-lg p-4">
                    {editingDoc === doc.id ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={doc.title}
                          onChange={(e) => {
                            const updated = strategyDocs.map(d =>
                              d.id === doc.id ? { ...d, title: e.target.value } : d
                            );
                            setStrategyDocs(updated);
                          }}
                          className="w-full bg-slate-600 border border-slate-500 rounded px-3 py-2"
                        />
                        <textarea
                          value={doc.content}
                          onChange={(e) => {
                            const updated = strategyDocs.map(d =>
                              d.id === doc.id ? { ...d, content: e.target.value } : d
                            );
                            setStrategyDocs(updated);
                          }}
                          rows={6}
                          className="w-full bg-slate-600 border border-slate-500 rounded px-3 py-2"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateStrategyDoc(doc.id, { title: doc.title, content: doc.content })}
                            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded transition"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingDoc(null);
                              loadStrategyDocs();
                            }}
                            className="bg-slate-600 hover:bg-slate-500 px-4 py-2 rounded transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-xl font-bold flex items-center gap-2">
                              {doc.title}
                              {doc.is_pinned && <span className="text-yellow-400">📌</span>}
                            </h3>
                            <p className="text-sm text-slate-400">
                              {doc.category} • Updated {new Date(doc.updated_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateStrategyDoc(doc.id, { is_pinned: !doc.is_pinned })}
                              className="text-yellow-400 hover:text-yellow-300"
                            >
                              {doc.is_pinned ? 'Unpin' : 'Pin'}
                            </button>
                            <button
                              onClick={() => setEditingDoc(doc.id)}
                              className="text-blue-400 hover:text-blue-300"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteStrategyDoc(doc.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        <p className="text-slate-300 whitespace-pre-wrap">{doc.content}</p>
                      </>
                    )}
                  </div>
                ))}
                {strategyDocs.length === 0 && (
                  <p className="text-slate-400 text-center py-8">No strategy documents yet. Create one above!</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'site' && (
          <div className="space-y-6">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
              <h2 className="text-2xl font-bold mb-4">Site Configuration</h2>
              <p className="text-slate-300 mb-6">
                Manage social media links that appear on your homepage footer.
              </p>

              <div className="space-y-4 mb-6">
                <h3 className="text-xl font-bold">Social Media Links</h3>
                <div className="flex gap-2 flex-wrap">
                  {['twitter', 'tiktok', 'instagram', 'facebook', 'linkedin', 'discord', 'youtube', 'reddit'].map(platform => (
                    <button
                      key={platform}
                      onClick={() => addSocialLink(platform)}
                      className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm transition"
                    >
                      Add {platform.charAt(0).toUpperCase() + platform.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {socialLinks.map((link) => (
                  <div key={link.id} className="bg-slate-700/50 rounded-lg p-4">
                    {editingLink === link.id ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-semibold mb-2 capitalize">
                            {link.platform} URL
                          </label>
                          <input
                            type="url"
                            defaultValue={link.profile_url}
                            placeholder="https://..."
                            className="w-full bg-slate-600 border border-slate-500 rounded px-3 py-2"
                            id={`url-${link.id}`}
                          />
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              defaultChecked={link.is_active}
                              className="w-4 h-4"
                              id={`active-${link.id}`}
                            />
                            <span className="text-sm">Active</span>
                          </label>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              const url = (document.getElementById(`url-${link.id}`) as HTMLInputElement).value;
                              const active = (document.getElementById(`active-${link.id}`) as HTMLInputElement).checked;
                              updateSocialLink(link.id, url, active);
                            }}
                            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded transition"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingLink(null)}
                            className="bg-slate-600 hover:bg-slate-500 px-4 py-2 rounded transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold capitalize">{link.platform}</span>
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              link.is_active ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                            }`}>
                              {link.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <p className="text-sm text-slate-400 mt-1">{link.profile_url}</p>
                        </div>
                        <button
                          onClick={() => setEditingLink(link.id)}
                          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition"
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {socialLinks.length === 0 && (
                  <p className="text-slate-400 text-center py-8">No social links configured. Add one above!</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <h2 className="text-2xl font-bold mb-6">Notification Settings</h2>

            <div className="space-y-6">
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.email_notifications_enabled}
                    onChange={(e) => setSettings({ ...settings, email_notifications_enabled: e.target.checked })}
                    className="w-5 h-5"
                  />
                  <span className="text-lg">Enable Email Notifications</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Notification Email</label>
                <input
                  type="email"
                  value={settings.notification_email}
                  onChange={(e) => setSettings({ ...settings, notification_email: e.target.value })}
                  placeholder="your@email.com"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Automatic Backup Frequency</label>
                <select
                  value={settings.backup_frequency}
                  onChange={(e) => setSettings({ ...settings, backup_frequency: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                <p className="text-sm text-slate-400 mt-2">
                  Note: Automatic backups are saved but not auto-downloaded. Access them in the Backup History tab.
                </p>
              </div>

              <button
                onClick={updateSettings}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

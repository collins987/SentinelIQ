import { useState, useCallback } from 'react';
import { cn } from '../lib/utils';
import { useUIStore } from '../stores';
import { Button } from '../components/ui/button';
import { Modal, ConfirmModal } from '../components/ui/modal';
import { toast } from '../components/ui/toast';
import { useAsyncAction, simulateApiDelay, copyToClipboard } from '../hooks/useActions';
import {
  Settings,
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  Database,
  Key,
  Save,
  Moon,
  Sun,
  Monitor,
  Copy,
  Eye,
  EyeOff,
  Plus,
  Trash2,
} from 'lucide-react';

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'api', label: 'API Keys', icon: Key },
  { id: 'system', label: 'System', icon: Database },
];

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const { theme, setTheme } = useUIStore();
  
  // Profile state
  const [firstName, setFirstName] = useState('Admin');
  const [lastName, setLastName] = useState('User');
  const [email, setEmail] = useState('admin@sentineliq.io');
  
  // Security state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // API Keys state
  const [apiKeys, setApiKeys] = useState([
    { id: '1', name: 'Production Key', key: 'key_demo_xxxxxxxxxxxxxxxxxxxxxxxxxxxx', created: '2025-12-01' },
  ]);
  const [showGenerateKeyModal, setShowGenerateKeyModal] = useState(false);
  const [keyToRevoke, setKeyToRevoke] = useState<string | null>(null);
  
  // Notification preferences
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    jobAlerts: false,
    securityAlerts: true,
  });
  
  // System settings
  const [debugMode, setDebugMode] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  
  const { isLoading: isSavingProfile, execute: saveProfile } = useAsyncAction();
  const { isLoading: isChangingPassword, execute: changePassword } = useAsyncAction();
  
  const handleSaveProfile = async () => {
    await saveProfile(
      async () => {
        await simulateApiDelay();
      },
      { successMessage: 'Profile updated successfully' }
    );
  };
  
  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast('error', 'Validation error', 'Please fill in all password fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast('error', 'Validation error', 'New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast('error', 'Validation error', 'Password must be at least 8 characters');
      return;
    }
    
    await changePassword(
      async () => {
        await simulateApiDelay();
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      },
      { successMessage: 'Password changed successfully' }
    );
  };
  
  const handleGenerateKey = async (keyName: string) => {
    await simulateApiDelay();
    const newKey = {
      id: crypto.randomUUID(),
      name: keyName,
      // Generate a demo key that does not match real secret patterns
      key: `key_${crypto.randomUUID().replace(/-/g, '')}`,
      created: new Date().toISOString().split('T')[0],
    };
    setApiKeys(prev => [...prev, newKey]);
    toast('success', 'API key generated', 'Your new API key has been created');
    setShowGenerateKeyModal(false);
  };
  
  const handleRevokeKey = async (keyId: string) => {
    await simulateApiDelay();
    setApiKeys(prev => prev.filter(k => k.id !== keyId));
    toast('success', 'API key revoked', 'The API key has been permanently revoked');
    setKeyToRevoke(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage your account and application preferences</p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Sidebar */}
        <div className="w-full lg:w-64">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                )}
              >
                <tab.icon className="h-5 w-5" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Profile Settings</h3>
                <div className="flex items-center gap-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-purple-500 text-2xl font-bold text-white">
                    {firstName.charAt(0)}
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => toast('info', 'Coming soon', 'Avatar upload will be available soon')}
                  >
                    Change Avatar
                  </Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">First Name</label>
                    <input 
                      type="text" 
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800" 
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Last Name</label>
                    <input 
                      type="text" 
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800" 
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800" 
                    />
                  </div>
                </div>
                <Button
                  onClick={handleSaveProfile}
                  isLoading={isSavingProfile}
                  loadingText="Saving..."
                  leftIcon={<Save className="h-4 w-4" />}
                >
                  Save Changes
                </Button>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Appearance</h3>
                <div>
                  <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">Theme</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'light', label: 'Light', icon: Sun },
                      { value: 'dark', label: 'Dark', icon: Moon },
                      { value: 'system', label: 'System', icon: Monitor },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setTheme(option.value as 'light' | 'dark' | 'system')}
                        className={cn(
                          'flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors',
                          theme === option.value
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                        )}
                      >
                        <option.icon className={cn('h-6 w-6', theme === option.value ? 'text-blue-600' : 'text-gray-400')} />
                        <span className={cn('text-sm font-medium', theme === option.value ? 'text-blue-600' : 'text-gray-700 dark:text-gray-300')}>
                          {option.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notification Preferences</h3>
                {[
                  { key: 'email' as const, label: 'Email notifications', description: 'Receive email alerts for important events' },
                  { key: 'push' as const, label: 'Push notifications', description: 'Browser push notifications' },
                  { key: 'jobAlerts' as const, label: 'Job alerts', description: 'Get notified when jobs fail or complete' },
                  { key: 'securityAlerts' as const, label: 'Security alerts', description: 'Alerts for suspicious activity' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{item.label}</p>
                      <p className="text-sm text-gray-500">{item.description}</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input 
                        type="checkbox" 
                        checked={notifications[item.key]}
                        onChange={(e) => {
                          setNotifications(prev => ({ ...prev, [item.key]: e.target.checked }));
                          toast('success', 'Preference saved', `${item.label} ${e.target.checked ? 'enabled' : 'disabled'}`);
                        }}
                        className="peer sr-only" 
                      />
                      <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-blue-600 peer-checked:after:translate-x-full dark:bg-gray-700" />
                    </label>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Security Settings</h3>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Current Password</label>
                  <input 
                    type="password" 
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800" 
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">New Password</label>
                  <input 
                    type="password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800" 
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm New Password</label>
                  <input 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800" 
                  />
                </div>
                <Button 
                  onClick={handleChangePassword}
                  isLoading={isChangingPassword}
                  loadingText="Updating..."
                >
                  Update Password
                </Button>
              </div>
            )}

            {activeTab === 'api' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">API Keys</h3>
                <p className="text-sm text-gray-500">Manage your API keys for programmatic access</p>
                <Button 
                  onClick={() => setShowGenerateKeyModal(true)}
                  leftIcon={<Key className="h-4 w-4" />}
                >
                  Generate New Key
                </Button>
                <div className="space-y-3">
                  {apiKeys.map((apiKey) => (
                    <div key={apiKey.id} className="rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{apiKey.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="font-mono text-sm text-gray-500">{apiKey.key.substring(0, 20)}...</p>
                            <button 
                              onClick={() => copyToClipboard(apiKey.key, 'API Key')}
                              className="text-gray-400 hover:text-gray-600"
                              title="Copy API key"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">Created: {apiKey.created}</p>
                        </div>
                        <button 
                          onClick={() => setKeyToRevoke(apiKey.id)}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          Revoke
                        </button>
                      </div>
                    </div>
                  ))}
                  {apiKeys.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Key className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No API keys generated yet</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'system' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">System Settings</h3>
                <div className="grid gap-4">
                  <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Debug Mode</p>
                      <p className="text-sm text-gray-500">Enable verbose logging</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input 
                        type="checkbox" 
                        checked={debugMode}
                        onChange={(e) => {
                          setDebugMode(e.target.checked);
                          toast('success', 'Setting updated', `Debug mode ${e.target.checked ? 'enabled' : 'disabled'}`);
                        }}
                        className="peer sr-only" 
                      />
                      <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-blue-600 peer-checked:after:translate-x-full dark:bg-gray-700" />
                    </label>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Maintenance Mode</p>
                      <p className="text-sm text-gray-500">Temporarily disable public access</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input 
                        type="checkbox" 
                        checked={maintenanceMode}
                        onChange={(e) => {
                          setMaintenanceMode(e.target.checked);
                          toast(e.target.checked ? 'warning' : 'success', 
                            'Setting updated', 
                            `Maintenance mode ${e.target.checked ? 'enabled - public access disabled' : 'disabled'}`
                          );
                        }}
                        className="peer sr-only" 
                      />
                      <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-blue-600 peer-checked:after:translate-x-full dark:bg-gray-700" />
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Generate API Key Modal */}
      {showGenerateKeyModal && (
        <GenerateKeyModal
          onClose={() => setShowGenerateKeyModal(false)}
          onGenerate={handleGenerateKey}
        />
      )}
      
      {/* Revoke Key Confirmation */}
      {keyToRevoke && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setKeyToRevoke(null)}
          onConfirm={() => handleRevokeKey(keyToRevoke)}
          title="Revoke API Key"
          message="Are you sure you want to revoke this API key? Any applications using this key will stop working immediately."
          confirmText="Revoke Key"
          variant="danger"
        />
      )}
    </div>
  );
}

function GenerateKeyModal({ onClose, onGenerate }: { onClose: () => void; onGenerate: (name: string) => void }) {
  const [keyName, setKeyName] = useState('');
  const { isLoading, execute } = useAsyncAction();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) {
      toast('error', 'Validation error', 'Please enter a key name');
      return;
    }
    await execute(
      async () => onGenerate(keyName.trim()),
      {}
    );
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Generate API Key" description="Create a new API key for your application">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Key Name</label>
          <input
            type="text"
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            placeholder="e.g., Production, Development, Testing"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800"
            required
          />
        </div>
        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading} loadingText="Generating..." className="flex-1">
            Generate Key
          </Button>
        </div>
      </form>
    </Modal>
  );
}

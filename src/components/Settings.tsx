import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Eye, EyeOff } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/Card';
import { Settings as SettingsType } from '@/types';
import { saveSettings, loadSettings, validateSettings } from '@/lib/storage';

interface SettingsProps {
  open: boolean;
  onClose: () => void;
  onSave: (settings: SettingsType) => void;
}

export const Settings: React.FC<SettingsProps> = ({ open, onClose, onSave }) => {
  const [settings, setSettings] = useState<SettingsType>({
    apiKeys: {
      anthropic: '',
      supabase: {
        token: '',
        orgId: '',
      },
      github: {
        token: '',
        owner: '',
      },
      vercel: {
        token: '',
      },
    },
    preferences: {
      defaultPlan: 'free',
      defaultRegion: 'ap-southeast-2',
    },
  });

  const [showKeys, setShowKeys] = useState({
    anthropic: false,
    supabase: false,
    github: false,
    vercel: false,
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const saved = loadSettings();
    if (saved) {
      setSettings(saved);
    }
  }, [open]);

  const handleSave = () => {
    if (!validateSettings(settings)) {
      setError('Please fill in all required fields');
      return;
    }

    saveSettings(settings);
    setSuccess(true);
    setError('');
    
    setTimeout(() => {
      onSave(settings);
      onClose();
      setSuccess(false);
    }, 1000);
  };

  const toggleShowKey = (key: keyof typeof showKeys) => {
    setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Modal open={open} onClose={onClose} className="max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-600/20">
            <SettingsIcon className="h-6 w-6 text-purple-500" />
          </div>
          <div>
            <h2 className="text-3xl font-bold">Settings</h2>
            <p className="text-sm text-zinc-400">Configure your API keys and preferences</p>
          </div>
        </div>

        {/* API Keys Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">🔑 API Keys</CardTitle>
            <CardDescription>Your keys are stored securely in your browser</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Anthropic */}
            <div className="relative">
              <Input
                label="Anthropic API Key"
                type={showKeys.anthropic ? 'text' : 'password'}
                placeholder="sk-ant-..."
                value={settings.apiKeys.anthropic}
                onChange={(e) => setSettings({
                  ...settings,
                  apiKeys: { ...settings.apiKeys, anthropic: e.target.value }
                })}
              />
              <button
                type="button"
                onClick={() => toggleShowKey('anthropic')}
                className="absolute right-3 top-9 text-zinc-400 hover:text-white"
              >
                {showKeys.anthropic ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Supabase */}
            <div className="space-y-3 border-t border-zinc-800 pt-4">
              <div className="relative">
                <Input
                  label="Supabase Access Token"
                  type={showKeys.supabase ? 'text' : 'password'}
                  placeholder="sbp_..."
                  value={settings.apiKeys.supabase.token}
                  onChange={(e) => setSettings({
                    ...settings,
                    apiKeys: { 
                      ...settings.apiKeys, 
                      supabase: { ...settings.apiKeys.supabase, token: e.target.value }
                    }
                  })}
                />
                <button
                  type="button"
                  onClick={() => toggleShowKey('supabase')}
                  className="absolute right-3 top-9 text-zinc-400 hover:text-white"
                >
                  {showKeys.supabase ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Input
                label="Supabase Organization ID"
                type="text"
                placeholder="cjyvtohygapqimotilgl"
                value={settings.apiKeys.supabase.orgId}
                onChange={(e) => setSettings({
                  ...settings,
                  apiKeys: { 
                    ...settings.apiKeys, 
                    supabase: { ...settings.apiKeys.supabase, orgId: e.target.value }
                  }
                })}
              />
            </div>

            {/* GitHub */}
            <div className="space-y-3 border-t border-zinc-800 pt-4">
              <div className="relative">
                <Input
                  label="GitHub Personal Access Token"
                  type={showKeys.github ? 'text' : 'password'}
                  placeholder="ghp_..."
                  value={settings.apiKeys.github.token}
                  onChange={(e) => setSettings({
                    ...settings,
                    apiKeys: { 
                      ...settings.apiKeys, 
                      github: { ...settings.apiKeys.github, token: e.target.value }
                    }
                  })}
                />
                <button
                  type="button"
                  onClick={() => toggleShowKey('github')}
                  className="absolute right-3 top-9 text-zinc-400 hover:text-white"
                >
                  {showKeys.github ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Input
                label="GitHub Username"
                type="text"
                placeholder="your-username"
                value={settings.apiKeys.github.owner}
                onChange={(e) => setSettings({
                  ...settings,
                  apiKeys: { 
                    ...settings.apiKeys, 
                    github: { ...settings.apiKeys.github, owner: e.target.value }
                  }
                })}
              />
            </div>

            {/* Vercel */}
            <div className="border-t border-zinc-800 pt-4">
              <div className="relative">
                <Input
                  label="Vercel Access Token"
                  type={showKeys.vercel ? 'text' : 'password'}
                  placeholder="..."
                  value={settings.apiKeys.vercel.token}
                  onChange={(e) => setSettings({
                    ...settings,
                    apiKeys: { 
                      ...settings.apiKeys, 
                      vercel: { token: e.target.value }
                    }
                  })}
                />
                <button
                  type="button"
                  onClick={() => toggleShowKey('vercel')}
                  className="absolute right-3 top-9 text-zinc-400 hover:text-white"
                >
                  {showKeys.vercel ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preferences Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">⚙️ Preferences</CardTitle>
            <CardDescription>Default settings for new projects</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-zinc-300 mb-2 block">
                Default Supabase Plan
              </label>
              <div className="flex space-x-4">
                <Button
                  variant={settings.preferences.defaultPlan === 'free' ? 'default' : 'outline'}
                  onClick={() => setSettings({
                    ...settings,
                    preferences: { ...settings.preferences, defaultPlan: 'free' }
                  })}
                >
                  Free ($0/mo)
                </Button>
                <Button
                  variant={settings.preferences.defaultPlan === 'pro' ? 'default' : 'outline'}
                  onClick={() => setSettings({
                    ...settings,
                    preferences: { ...settings.preferences, defaultPlan: 'pro' }
                  })}
                >
                  Pro ($25/mo)
                </Button>
              </div>
            </div>

            <Input
              label="Default Region"
              type="text"
              value={settings.preferences.defaultRegion}
              onChange={(e) => setSettings({
                ...settings,
                preferences: { ...settings.preferences, defaultRegion: e.target.value }
              })}
            />
          </CardContent>
        </Card>

        {/* Error/Success Messages */}
        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-500">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-4 text-sm text-green-500">
            ✅ Settings saved successfully!
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Save Settings
          </Button>
        </div>
      </div>
    </Modal>
  );
};

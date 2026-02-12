'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LuSettings, LuDatabase, LuServer, LuKey, LuGlobe, LuShield, LuRefreshCw, LuEye, LuEyeOff } from 'react-icons/lu';

interface ConfigCategory {
  name: string;
  icon: React.ReactNode;
  color: string;
  configs: ConfigItem[];
}

interface ConfigItem {
  key: string;
  value: string | number | boolean;
  type: 'string' | 'number' | 'boolean' | 'secret';
  description?: string;
  category: string;
}

const CONFIG_CATEGORIES: ConfigCategory[] = [
  {
    name: 'Environment',
    icon: <LuGlobe className="w-5 h-5" />,
    color: 'blue',
    configs: []
  },
  {
    name: 'Database',
    icon: <LuDatabase className="w-5 h-5" />,
    color: 'green',
    configs: []
  },
  {
    name: 'API Keys',
    icon: <LuKey className="w-5 h-5" />,
    color: 'purple',
    configs: []
  },
  {
    name: 'Security',
    icon: <LuShield className="w-5 h-5" />,
    color: 'red',
    configs: []
  },
  {
    name: 'Server',
    icon: <LuServer className="w-5 h-5" />,
    color: 'orange',
    configs: []
  }
];

export default function ConfigViewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [visibleSecrets, setVisibleSecrets] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/developer/config-view', { credentials: 'include', cache: 'no-store' });

      if (!response.ok) {
        throw new Error('Configuration data could not be retrieved');
      }

      const data = await response.json();
      setConfigs(data.configs || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const toggleSecretVisibility = (key: string) => {
    const newVisible = new Set(visibleSecrets);
    if (newVisible.has(key)) {
      newVisible.delete(key);
    } else {
      newVisible.add(key);
    }
    setVisibleSecrets(newVisible);
  };

  const formatValue = (item: ConfigItem) => {
    if (item.type === 'secret' && !visibleSecrets.has(item.key)) {
      return '••••••••';
    }

    if (item.type === 'boolean') {
      return item.value ? '✅ True' : '❌ False';
    }

    if (item.type === 'number') {
      return item.value.toString();
    }

    return item.value.toString();
  };

  const getValueColor = (item: ConfigItem) => {
    if (item.type === 'boolean') {
      return item.value ? 'text-green-300' : 'text-red-300';
    }
    if (item.type === 'secret') {
      return 'text-yellow-300 font-mono';
    }
    return 'text-white/90';
  };

  const filteredConfigs = configs.filter(config => {
    const matchesSearch = config.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         config.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || config.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedConfigs = CONFIG_CATEGORIES.map(category => ({
    ...category,
    configs: filteredConfigs.filter(config => config.category === category.name)
  })).filter(group => group.configs.length > 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f131d] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/70">Loading configuration...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0f131d] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-red-500/10 border border-red-500/20 rounded-3xl p-8 text-center">
          <LuShield className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Error</h1>
          <p className="text-red-300 mb-6">{error}</p>
          <div className="flex gap-3">
            <button
              onClick={loadConfigs}
              className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 font-medium py-3 rounded-xl transition"
            >
              Try Again
            </button>
            <button
              onClick={() => router.back()}
              className="flex-1 bg-white/10 hover:bg-white/20 text-white font-medium py-3 rounded-xl transition"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f131d] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-white/70 hover:text-white mb-4 transition"
          >
            ← Go Back
          </button>
          <h1 className="text-3xl font-bold text-white mb-2">Configuration View</h1>
          <p className="text-white/60">Monitor system configurations and settings.</p>
        </div>

        {/* Controls */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search configuration..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:border-blue-500/50 focus:outline-none transition"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={selectedCategory || ''}
              onChange={(e) => setSelectedCategory(e.target.value || null)}
              className="px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white min-w-[150px]"
            >
              <option value="">All Categories</option>
              {CONFIG_CATEGORIES.map(category => (
                <option key={category.name} value={category.name}>{category.name}</option>
              ))}
            </select>
            <button
              onClick={loadConfigs}
              className="flex items-center gap-2 px-4 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition"
            >
              <LuRefreshCw className="w-4 h-4" />
              Yenile
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-2xl font-bold text-white">{configs.length}</div>
            <div className="text-sm text-white/60">Total Configurations</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-2xl font-bold text-blue-300">{configs.filter(c => c.type === 'secret').length}</div>
            <div className="text-sm text-white/60">Secret Values</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-2xl font-bold text-green-300">{groupedConfigs.length}</div>
            <div className="text-sm text-white/60">Aktif Kategori</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-2xl font-bold text-purple-300">{filteredConfigs.length}</div>
            <div className="text-sm text-white/60">Filtered</div>
          </div>
        </div>

        {/* Config Categories */}
        <div className="space-y-6">
          {groupedConfigs.map((category) => (
            <div key={category.name} className="rounded-3xl border border-white/10 bg-[#0f131d] overflow-hidden">
              {/* Category Header */}
              <div className={`flex items-center gap-3 p-6 border-b border-white/10 ${
                category.color === 'blue' ? 'bg-blue-500/10' :
                category.color === 'green' ? 'bg-green-500/10' :
                category.color === 'purple' ? 'bg-purple-500/10' :
                category.color === 'red' ? 'bg-red-500/10' :
                'bg-orange-500/10'
              }`}>
                <div className={`p-2 rounded-lg ${
                  category.color === 'blue' ? 'bg-blue-500/20 text-blue-300' :
                  category.color === 'green' ? 'bg-green-500/20 text-green-300' :
                  category.color === 'purple' ? 'bg-purple-500/20 text-purple-300' :
                  category.color === 'red' ? 'bg-red-500/20 text-red-300' :
                  'bg-orange-500/20 text-orange-300'
                }`}>
                  {category.icon}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">{category.name}</h2>
                  <p className="text-sm text-white/60">{category.configs.length} configurations</p>
                </div>
              </div>

              {/* Config Items */}
              <div className="p-6">
                <div className="space-y-4">
                  {category.configs.map((config) => (
                    <div key={config.key} className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <code className="text-sm font-mono text-blue-300 bg-black/30 px-2 py-1 rounded">
                            {config.key}
                          </code>
                          {config.type === 'secret' && (
                            <button
                              onClick={() => toggleSecretVisibility(config.key)}
                              className="p-1 rounded-lg hover:bg-white/10 transition"
                            >
                              {visibleSecrets.has(config.key) ? (
                                <LuEyeOff className="w-4 h-4 text-yellow-300" />
                              ) : (
                                <LuEye className="w-4 h-4 text-yellow-300" />
                              )}
                            </button>
                          )}
                        </div>
                        {config.description && (
                          <p className="text-sm text-white/60 mb-2">{config.description}</p>
                        )}
                        <div className={`text-sm font-mono ${getValueColor(config)} break-all`}>
                          {formatValue(config)}
                        </div>
                      </div>
                      <div className="ml-4 flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          config.type === 'string' ? 'bg-gray-500/20 text-gray-300' :
                          config.type === 'number' ? 'bg-blue-500/20 text-blue-300' :
                          config.type === 'boolean' ? 'bg-green-500/20 text-green-300' :
                          'bg-yellow-500/20 text-yellow-300'
                        }`}>
                          {config.type}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {groupedConfigs.length === 0 && (
          <div className="text-center py-12">
            <LuSettings className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white/60 mb-2">No Configuration Found</h3>
            <p className="text-white/40">No configuration matches your search criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}
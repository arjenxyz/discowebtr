'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LuZap, LuTrash2, LuRefreshCw, LuDatabase, LuClock, LuHardDrive, LuActivity, LuCheck, LuX } from 'react-icons/lu';

interface CacheStats {
  totalKeys: number;
  memoryUsage: string;
  hitRate: number;
  missRate: number;
  uptime: string;
  connections: number;
}

interface CacheEntry {
  key: string;
  value: string;
  ttl: number;
  size: number;
  type: string;
}

export default function CachePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [entries, setEntries] = useState<CacheEntry[]>([]);
  const [showEntries, setShowEntries] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [clearMessage, setClearMessage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadCacheStats();
  }, []);

  const loadCacheStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/developer/cache/stats', { credentials: 'include', cache: 'no-store' });

      if (!response.ok) {
        throw new Error('Cache statistics could not be loaded');
      }

      const data = await response.json();
      setStats(data.stats);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const loadCacheEntries = async () => {
    try {
      const response = await fetch('/api/developer/cache/entries', { credentials: 'include', cache: 'no-store' });

      if (!response.ok) {
        throw new Error('Cache entries could not be loaded');
      }

      const data = await response.json();
      setEntries(data.entries || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cache entries');
    }
  };

  const clearCache = async () => {
    try {
      setClearingCache(true);
      setClearMessage(null);

      const response = await fetch('/api/developer/cache/clear', {
        method: 'POST',
        cache: 'no-store',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Cache could not be cleared');
      }

      const data = await response.json();
      setClearMessage(data.message || 'Cache cleared successfully');

      // Reload stats
      await loadCacheStats();
      if (showEntries) {
        await loadCacheEntries();
      }
    } catch (err) {
      setClearMessage(err instanceof Error ? err.message : 'Failed to clear cache');
    } finally {
      setClearingCache(false);
    }
  };

  const toggleEntries = async () => {
    if (!showEntries) {
      await loadCacheEntries();
    }
    setShowEntries(!showEntries);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTTL = (ttl: number) => {
    if (ttl === -1) return 'No expiration';
    if (ttl === -2) return 'Expired';
    const hours = Math.floor(ttl / 3600);
    const minutes = Math.floor((ttl % 3600) / 60);
    const seconds = ttl % 60;
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f131d] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/70">Loading cache information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0f131d] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-red-500/10 border border-red-500/20 rounded-3xl p-8 text-center">
          <LuX className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Error</h1>
          <p className="text-red-300 mb-6">{error}</p>
          <div className="flex gap-3">
            <button
              onClick={loadCacheStats}
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
          <h1 className="text-3xl font-bold text-white mb-2">Cache Management</h1>
          <p className="text-white/60">Monitor and manage application cache.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-3 mb-2">
              <LuDatabase className="w-5 h-5 text-blue-400" />
              <span className="text-sm text-white/60">Total Keys</span>
            </div>
            <div className="text-2xl font-bold text-white">{stats?.totalKeys || 0}</div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-3 mb-2">
              <LuHardDrive className="w-5 h-5 text-green-400" />
              <span className="text-sm text-white/60">Memory Usage</span>
            </div>
            <div className="text-2xl font-bold text-white">{stats?.memoryUsage || '0 MB'}</div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-3 mb-2">
              <LuActivity className="w-5 h-5 text-purple-400" />
              <span className="text-sm text-white/60">Hit Rate</span>
            </div>
            <div className="text-2xl font-bold text-white">{stats?.hitRate || 0}%</div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-3 mb-2">
              <LuClock className="w-5 h-5 text-orange-400" />
              <span className="text-sm text-white/60">Uptime</span>
            </div>
            <div className="text-2xl font-bold text-white">{stats?.uptime || '0h'}</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-4 mb-8">
          <button
            onClick={() => setRefreshing(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition disabled:opacity-50"
          >
            {refreshing ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <LuRefreshCw className="w-4 h-4" />
            )}
            Refresh Stats
          </button>

          <button
            onClick={toggleEntries}
            className="flex items-center gap-2 px-4 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition"
          >
            <LuDatabase className="w-4 h-4" />
            {showEntries ? 'Hide Entries' : 'Show Entries'}
          </button>

          <button
            onClick={clearCache}
            disabled={clearingCache}
            className="flex items-center gap-2 px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-300 hover:text-red-200 transition disabled:opacity-50"
          >
            {clearingCache ? (
              <div className="w-4 h-4 border-2 border-red-300/30 border-t-red-300 rounded-full animate-spin" />
            ) : (
              <LuTrash2 className="w-4 h-4" />
            )}
            Clear All Cache
          </button>
        </div>

        {clearMessage && (
          <div className={`mb-6 p-4 rounded-xl border ${
            clearMessage.includes('success') || clearMessage.includes('cleared')
              ? 'bg-green-500/10 border-green-500/20 text-green-300'
              : 'bg-red-500/10 border-red-500/20 text-red-300'
          }`}>
            {clearMessage.includes('success') || clearMessage.includes('cleared') ? (
              <LuCheck className="w-5 h-5 inline mr-2" />
            ) : (
              <LuX className="w-5 h-5 inline mr-2" />
            )}
            {clearMessage}
          </div>
        )}

        {/* Cache Entries */}
        {showEntries && (
          <div className="rounded-3xl border border-white/10 bg-[#0f131d] overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">Cache Entries</h2>
              <p className="text-sm text-white/60 mt-1">Current cache contents</p>
            </div>

            <div className="p-6">
              {entries.length === 0 ? (
                <div className="text-center py-8">
                  <LuDatabase className="w-16 h-16 text-white/20 mx-auto mb-4" />
                  <p className="text-white/60">No cache entries found</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {entries.map((entry) => (
                    <div key={entry.key} className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <code className="text-sm font-mono text-blue-300 bg-black/30 px-2 py-1 rounded truncate">
                            {entry.key}
                          </code>
                          <span className="px-2 py-1 rounded text-xs font-medium bg-gray-500/20 text-gray-300">
                            {entry.type}
                          </span>
                        </div>
                        <div className="text-sm text-white/60 space-y-1">
                          <div>TTL: {formatTTL(entry.ttl)}</div>
                          <div>Size: {formatSize(entry.size)}</div>
                        </div>
                      </div>
                      <div className="ml-4 text-right">
                        <div className="text-sm text-white/90 font-mono truncate max-w-xs">
                          {entry.value.length > 50 ? `${entry.value.substring(0, 50)}...` : entry.value}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Cache Information */}
        <div className="mt-8 rounded-3xl border border-white/10 bg-[#0f131d] p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Cache Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h3 className="text-white/80 font-medium mb-2">Performance Metrics</h3>
              <ul className="space-y-2 text-white/60">
                <li>• Hit Rate: {stats?.hitRate || 0}% of requests served from cache</li>
                <li>• Miss Rate: {stats?.missRate || 0}% of requests required database queries</li>
                <li>• Memory Usage: {stats?.memoryUsage || '0 MB'} of allocated cache memory</li>
                <li>• Active Connections: {stats?.connections || 0} concurrent connections</li>
              </ul>
            </div>
            <div>
              <h3 className="text-white/80 font-medium mb-2">Management Tips</h3>
              <ul className="space-y-2 text-white/60">
                <li>• Clear cache periodically to free up memory</li>
                <li>• Monitor hit rates for performance optimization</li>
                <li>• Check TTL values to ensure data freshness</li>
                <li>• Use cache warming for frequently accessed data</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
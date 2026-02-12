'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LuPlay, LuPlus, LuTrash2, LuHistory, LuCode, LuSend, LuCheck, LuCircle } from 'react-icons/lu';

interface ApiRequest {
  id: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  timestamp: Date;
}

interface ApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: unknown;
  duration: number;
}

const DEVELOPER_ENDPOINTS = [
  { label: 'Check Access', value: '/api/developer/check-access', method: 'GET' },
  { label: 'User Lookup', value: '/api/developer/user-lookup', method: 'POST' },
  { label: 'Users List', value: '/api/developer/users', method: 'GET' },
  { label: 'Servers List', value: '/api/developer/servers', method: 'GET' },
  { label: 'All Servers', value: '/api/developer/all-servers', method: 'GET' },
  { label: 'Sync Members', value: '/api/developer/sync-members', method: 'POST' },
  { label: 'System Mails', value: '/api/developer/system-mails', method: 'GET' },
  { label: 'Clear Data', value: '/api/developer/clear-data', method: 'POST' },
  { label: 'Guild Join', value: '/api/developer/guild-join', method: 'POST' },
];

const ADMIN_ENDPOINTS = [
  { label: 'Audit Logs', value: '/api/admin/audit-logs', method: 'GET' },
  { label: 'Discounts', value: '/api/admin/discounts', method: 'GET' },
  { label: 'Maintenance', value: '/api/admin/maintenance', method: 'GET' },
  { label: 'Members', value: '/api/admin/members', method: 'GET' },
  { label: 'Notifications', value: '/api/admin/notifications', method: 'GET' },
  { label: 'Profile', value: '/api/admin/profile', method: 'GET' },
  { label: 'Promotions', value: '/api/admin/promotions', method: 'GET' },
  { label: 'Roles', value: '/api/admin/roles', method: 'GET' },
  { label: 'Settings', value: '/api/admin/settings', method: 'GET' },
  { label: 'Setup', value: '/api/admin/setup', method: 'GET' },
  { label: 'Store Items', value: '/api/admin/store-items', method: 'GET' },
  { label: 'Store Orders', value: '/api/admin/store-orders', method: 'GET' },
  { label: 'Verify', value: '/api/admin/verify', method: 'GET' },
  { label: 'Wallet', value: '/api/admin/wallet', method: 'GET' },
];

const DISCORD_ENDPOINTS = [
  { label: 'Assign Role', value: '/api/discord/assign-role', method: 'POST' },
  { label: 'Exchange', value: '/api/discord/exchange', method: 'POST' },
  { label: 'Guild', value: '/api/discord/guild', method: 'GET' },
  { label: 'Guilds', value: '/api/discord/guilds', method: 'GET' },
  { label: 'User', value: '/api/discord/user', method: 'GET' },
];

const MAIL_ENDPOINTS = [
  { label: 'Contact', value: '/api/mail/contact', method: 'POST' },
  { label: 'Route', value: '/api/mail/route', method: 'POST' },
];

const AUTH_ENDPOINTS = [
  { label: 'Logout', value: '/api/auth/logout', method: 'POST' },
];

const OTHER_ENDPOINTS = [
  { label: 'Log Channels', value: '/api/log-channels', method: 'GET' },
  { label: 'Discount', value: '/api/discount', method: 'GET' },
];

const API_CATEGORIES = [
  { name: 'Developer APIs', endpoints: DEVELOPER_ENDPOINTS, color: 'blue' },
  { name: 'Admin APIs', endpoints: ADMIN_ENDPOINTS, color: 'red' },
  { name: 'Discord APIs', endpoints: DISCORD_ENDPOINTS, color: 'purple' },
  { name: 'Mail APIs', endpoints: MAIL_ENDPOINTS, color: 'green' },
  { name: 'Auth APIs', endpoints: AUTH_ENDPOINTS, color: 'yellow' },
  { name: 'Other APIs', endpoints: OTHER_ENDPOINTS, color: 'gray' },
];

const COMMON_HEADERS = [
  { key: 'Content-Type', value: 'application/json' },
  { key: 'Authorization', value: 'Bearer token' },
  { key: 'Accept', value: 'application/json' },
];

export default function ApiTestPage() {
  const router = useRouter();
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('/api/developer/check-access');
  const [headers, setHeaders] = useState<Array<{ key: string; value: string }>>([
    { key: 'Content-Type', value: 'application/json' }
  ]);
  const [body, setBody] = useState('');
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ApiRequest[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const addHeader = () => {
    setHeaders([...headers, { key: '', value: '' }]);
  };

  const updateHeader = (index: number, field: 'key' | 'value', value: string) => {
    const newHeaders = [...headers];
    newHeaders[index][field] = value;
    setHeaders(newHeaders);
  };

  const removeHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  const addCommonHeader = (headerKey: string, headerValue: string) => {
    const exists = headers.some(h => h.key === headerKey);
    if (!exists) {
      setHeaders([...headers, { key: headerKey, value: headerValue }]);
    }
  };

  const sendRequest = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    const startTime = Date.now();

    try {
      const requestHeaders: Record<string, string> = {};
      headers.forEach(header => {
        if (header.key && header.value) {
          requestHeaders[header.key] = header.value;
        }
      });

      let requestBody: string | undefined;
      if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        try {
          JSON.parse(body); // Validate JSON
          requestBody = body;
        } catch {
          requestBody = body;
        }
      }

      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: requestBody,
      });

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      let responseData;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      const apiResponse: ApiResponse = {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        data: responseData,
        duration: Date.now() - startTime,
      };

      setResponse(apiResponse);

      // Add to history
      const request: ApiRequest = {
        id: Date.now().toString(),
        method,
        url,
        headers: requestHeaders,
        body: requestBody,
        timestamp: new Date(),
      };
      setHistory(prev => [request, ...prev.slice(0, 9)]); // Keep last 10 requests

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const loadFromHistory = (request: ApiRequest) => {
    setMethod(request.method);
    setUrl(request.url);
    setBody(request.body || '');
    setHeaders(Object.entries(request.headers).map(([key, value]) => ({ key, value })));
    setShowHistory(false);
  };

  const selectEndpoint = (endpoint: typeof DEVELOPER_ENDPOINTS[0]) => {
    setMethod(endpoint.method);
    setUrl(endpoint.value);
  };

  return (
    <div className="min-h-screen bg-[#0f131d] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-white/70 hover:text-white mb-4 transition"
          >
            ← Geri Dön
          </button>
          <h1 className="text-3xl font-bold text-white mb-2">API Test Araçları</h1>
          <p className="text-white/60">Developer API endpoint&apos;lerini test edin ve yanıtları inceleyin.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Panel - Request Builder and Categories */}
          <div className="space-y-6">
            {/* API Categories */}
            <div className="rounded-3xl border border-white/10 bg-[#0f131d] p-6">
              <h2 className="text-lg font-semibold text-white mb-4">API Kategorileri</h2>
              <div className="space-y-4">
                {API_CATEGORIES.map((category) => (
                  <details key={category.name} className="group">
                    <summary className={`flex items-center justify-between cursor-pointer p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition ${
                      category.color === 'blue' ? 'hover:border-blue-500/30' :
                      category.color === 'red' ? 'hover:border-red-500/30' :
                      category.color === 'purple' ? 'hover:border-purple-500/30' :
                      category.color === 'green' ? 'hover:border-green-500/30' :
                      category.color === 'yellow' ? 'hover:border-yellow-500/30' :
                      'hover:border-gray-500/30'
                    }`}>
                      <span className={`font-medium ${
                        category.color === 'blue' ? 'text-blue-300' :
                        category.color === 'red' ? 'text-red-300' :
                        category.color === 'purple' ? 'text-purple-300' :
                        category.color === 'green' ? 'text-green-300' :
                        category.color === 'yellow' ? 'text-yellow-300' :
                        'text-gray-300'
                      }`}>
                        {category.name}
                      </span>
                      <svg className="w-5 h-5 text-white/50 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <div className="mt-3 ml-4 space-y-2">
                      {category.endpoints.map((endpoint) => (
                        <button
                          key={endpoint.value}
                          onClick={() => selectEndpoint(endpoint)}
                          className="w-full flex items-center justify-between p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition text-left"
                        >
                          <div>
                            <div className="text-white font-medium text-sm">{endpoint.label}</div>
                            <div className="text-white/50 text-xs">{endpoint.value}</div>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            endpoint.method === 'GET' ? 'bg-blue-500/20 text-blue-300' :
                            endpoint.method === 'POST' ? 'bg-green-500/20 text-green-300' :
                            endpoint.method === 'PUT' ? 'bg-orange-500/20 text-orange-300' :
                            'bg-red-500/20 text-red-300'
                          }`}>
                            {endpoint.method}
                          </span>
                        </button>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </div>

            {/* Request Builder */}
            <div className="rounded-3xl border border-white/10 bg-[#0f131d] p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">Request Builder</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition text-white/70 hover:text-white"
                  >
                    <LuHistory className="w-4 h-4" />
                    Geçmiş
                  </button>
                  <button
                    onClick={sendRequest}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium transition disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <LuSend className="w-4 h-4" />
                    )}
                    Gönder
                  </button>
                </div>
              </div>

              {/* Method and URL */}
              <div className="flex gap-4 mb-6">
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white min-w-[120px]"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                  <option value="PATCH">PATCH</option>
                </select>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="API endpoint URL'i"
                  className="flex-1 px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40"
                />
              </div>

              {/* Headers */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-medium">Headers</h3>
                  <div className="flex gap-2">
                    {COMMON_HEADERS.map((header) => (
                      <button
                        key={header.key}
                        onClick={() => addCommonHeader(header.key, header.value)}
                        className="px-3 py-1 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs transition"
                      >
                        + {header.key}
                      </button>
                    ))}
                    <button
                      onClick={addHeader}
                      className="flex items-center gap-1 px-3 py-1 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs transition"
                    >
                      <LuPlus className="w-3 h-3" />
                      Ekle
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  {headers.map((header, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Header adı"
                        value={header.key}
                        onChange={(e) => updateHeader(index, 'key', e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white placeholder-white/40 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Header değeri"
                        value={header.value}
                        onChange={(e) => updateHeader(index, 'value', e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white placeholder-white/40 text-sm"
                      />
                      <button
                        onClick={() => removeHeader(index)}
                        className="p-2 rounded-lg border border-white/10 bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-200 transition"
                      >
                        <LuTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Request Body */}
              {(method === 'POST' || method === 'PUT' || method === 'PATCH') && (
                <div className="mb-6">
                  <h3 className="text-white font-medium mb-4">Request Body (JSON)</h3>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder='{"key": "value"}'
                    rows={8}
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 font-mono text-sm resize-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Response and History */}
          <div className="space-y-6">
            {/* Response */}
            {(response || error) && (
              <div className="rounded-3xl border border-white/10 bg-[#0f131d] p-6">
                <div className="flex items-center gap-3 mb-4">
                  {response?.status && response.status >= 200 && response.status < 300 ? (
                    <LuCheck className="w-5 h-5 text-green-400" />
                  ) : (
                    <LuCircle className="w-5 h-5 text-red-400" />
                  )}
                  <h2 className="text-lg font-semibold text-white">Response</h2>
                  {response && (
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      response.status >= 200 && response.status < 300
                        ? 'bg-green-500/20 text-green-300'
                        : response.status >= 400
                        ? 'bg-red-500/20 text-red-300'
                        : 'bg-yellow-500/20 text-yellow-300'
                    }`}>
                      {response.status} {response.statusText}
                    </span>
                  )}
                  {response && (
                    <span className="text-white/50 text-sm">
                      {response.duration}ms
                    </span>
                  )}
                </div>

                {error && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300">
                    {error}
                  </div>
                )}

                {response && (
                  <div className="space-y-4">
                    {/* Response Headers */}
                    <div>
                      <h3 className="text-white/80 font-medium mb-2">Response Headers</h3>
                      <div className="bg-black/30 rounded-lg p-3 font-mono text-sm text-white/70 max-h-32 overflow-y-auto">
                        {Object.entries(response.headers).map(([key, value]) => (
                          <div key={key} className="flex justify-between py-1">
                            <span className="text-blue-300">{key}:</span>
                            <span className="text-white/90 ml-4 break-all">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Response Body */}
                    <div>
                      <h3 className="text-white/80 font-medium mb-2">Response Body</h3>
                      <pre className="bg-black/30 rounded-lg p-4 font-mono text-sm text-white/90 max-h-96 overflow-y-auto whitespace-pre-wrap break-words">
                        {typeof response.data === 'string'
                          ? response.data
                          : JSON.stringify(response.data, null, 2)
                        }
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Request History */}
            {showHistory && (
              <div className="rounded-3xl border border-white/10 bg-[#0f131d] p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Request Geçmişi</h2>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {history.length === 0 ? (
                    <p className="text-white/50 text-sm">Henüz request yapılmamış.</p>
                  ) : (
                    history.map((request) => (
                      <button
                        key={request.id}
                        onClick={() => loadFromHistory(request)}
                        className="w-full text-left p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            request.method === 'GET' ? 'bg-blue-500/20 text-blue-300' :
                            request.method === 'POST' ? 'bg-green-500/20 text-green-300' :
                            request.method === 'PUT' ? 'bg-orange-500/20 text-orange-300' :
                            'bg-red-500/20 text-red-300'
                          }`}>
                            {request.method}
                          </span>
                          <span className="text-white/50 text-xs">
                            {request.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-white/80 text-sm truncate">{request.url}</div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* API Documentation */}
            <div className="rounded-3xl border border-white/10 bg-[#0f131d] p-6">
              <h2 className="text-lg font-semibold text-white mb-4">API Bilgileri</h2>
              <div className="space-y-4 text-sm text-white/70">
                <div>
                  <h3 className="text-white font-medium mb-2">Authentication</h3>
                  <p>Developer API'leri otomatik olarak oturum bilgilerinizi kullanır. Admin API'leri için admin yetkisi gereklidir. Ek authentication gerekmez.</p>
                </div>
                <div>
                  <h3 className="text-white font-medium mb-2">API Kategorileri</h3>
                  <ul className="space-y-1">
                    <li><span className="text-blue-300">Developer APIs:</span> Geliştirici araçları ve sistem bilgileri</li>
                    <li><span className="text-red-300">Admin APIs:</span> Yönetim ve kontrol fonksiyonları</li>
                    <li><span className="text-purple-300">Discord APIs:</span> Discord entegrasyonu ve kullanıcı yönetimi</li>
                    <li><span className="text-green-300">Mail APIs:</span> E-posta gönderme ve iletişim</li>
                    <li><span className="text-yellow-300">Auth APIs:</span> Kimlik doğrulama işlemleri</li>
                    <li><span className="text-gray-300">Other APIs:</span> Diğer yardımcı API'ler</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-white font-medium mb-2">Rate Limiting</h3>
                  <p>Test amaçlı kullanımlar için rate limit uygulanmaz, ancak production'da dikkatli olun.</p>
                </div>
                <div>
                  <h3 className="text-white font-medium mb-2">Response Format</h3>
                  <p>API'ler JSON formatında yanıt verir. Hata durumlarında error field'ı bulunur.</p>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="rounded-3xl border border-white/10 bg-[#0f131d] p-6">
              <h2 className="text-lg font-semibold text-white mb-4">İpuçları</h2>
              <ul className="space-y-2 text-sm text-white/70">
                <li>• JSON body için geçerli JSON formatı kullanın</li>
                <li>• Headers'da Content-Type belirtmeyi unutmayın</li>
                <li>• Request geçmişi son 10 request'i saklar</li>
                <li>• Response'lar otomatik olarak formatlanır</li>
                <li>• Büyük response'lar için scroll kullanın</li>
                <li>• Admin API'leri için admin yetkisi gereklidir</li>
                <li>• Developer API'leri tüm geliştiriciler tarafından kullanılabilir</li>
                <li>• Discord API'leri Discord entegrasyonu için kullanılır</li>
                <li>• Test sırasında gerçek verilerle çalışın</li>
                <li>• Hata mesajlarını dikkatlice inceleyin</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
'use client';

import { useEffect, useState } from 'react';

type AuditLog = {
  id: string;
  event: string;
  status: string | null;
  user_id: string | null;
  ip_address: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const response = await fetch('/api/admin/audit-logs');
      if (response.ok) {
        const data = (await response.json()) as AuditLog[];
        setLogs(data);
      }
      setLoading(false);
    };

    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">Admin</p>
        <h1 className="mt-2 text-2xl font-semibold">Audit Log</h1>
        <p className="mt-1 text-sm text-white/60">Son 50 web olayını görüntüleyin.</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        {loading ? (
          <p className="text-sm text-white/60">Loglar yükleniyor...</p>
        ) : (
          <div className="space-y-3 text-sm">
            {logs.map((log) => (
              <div key={log.id} className="rounded-xl border border-white/10 bg-[#0b0d12]/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-white/80">{log.event}</p>
                  <span className="text-xs text-white/40">{new Date(log.created_at).toLocaleString('tr-TR')}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-white/50">
                  {log.status && <span>Durum: {log.status}</span>}
                  {log.user_id && <span>Kullanıcı: {log.user_id}</span>}
                  {log.ip_address && <span>IP: {log.ip_address}</span>}
                </div>
                {log.metadata && Object.keys(log.metadata).length > 0 && (
                  <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-black/30 p-3 text-[11px] text-white/70">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

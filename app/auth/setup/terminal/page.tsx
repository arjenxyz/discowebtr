'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function SetupTerminalContent() {
  const router = useRouter();
  const params = useSearchParams();
  const adminRoleId = params.get('adminRoleId') ?? '';
  const verifyRoleId = params.get('verifyRoleId') ?? '';

  const [guildId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const cookies = document.cookie.split('; ');
      const guildCookie = cookies.find((row) => row.startsWith('selected_guild_id='));
      return guildCookie ? guildCookie.split('=')[1] : null;
    }
    return null;
  });

  const [guildName, setGuildName] = useState<string>('');
  const [settingUp, setSettingUp] = useState(true);
  const [error, setError] = useState<string>('');
  const [terminalLines, setTerminalLines] = useState<
    Array<{ text: string; tone?: 'info' | 'success' | 'warn' | 'cmd' }>
  >([]);
  const terminalRef = useRef<HTMLDivElement | null>(null);
  const hasRunRef = useRef(false);

  const pushLine = (line: string, tone: 'info' | 'success' | 'warn' | 'cmd' = 'info') => {
    setTerminalLines((prev) => [...prev, { text: line, tone }]);
  };

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const loadGuildName = async (): Promise<string> => {
    if (!guildId) return '';
    try {
      const guildResponse = await fetch(`/api/discord/guild/${guildId}`, { method: 'GET' });
      if (guildResponse.ok) {
        const data = await guildResponse.json();
        const name = data?.name ?? '';
        if (name) {
          setGuildName(name);
          return name;
        }
      }
    } catch {
      // ignore
    }
    return '';
  };

  useEffect(() => {
    if (!terminalRef.current) return;
    terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
  }, [terminalLines]);

  useEffect(() => {
    const loadGuild = async () => {
      if (!guildId) return;
      try {
        const guildResponse = await fetch(`/api/discord/guild/${guildId}`, { method: 'GET' });
        if (guildResponse.ok) {
          const data = await guildResponse.json();
          setGuildName(data.name ?? '');
        }
      } catch {
        // ignore
      }
    };

    loadGuild();
  }, [guildId]);

  useEffect(() => {
    const run = async () => {
      if (hasRunRef.current) return;
      hasRunRef.current = true;

      if (!adminRoleId || !verifyRoleId) {
        setError('Rol bilgileri eksik. Kurulum ekranına geri dönün.');
        setSettingUp(false);
        return;
      }

      const resolvedGuildName = (await loadGuildName()) || guildName || 'Bilinmiyor';

      pushLine('npm install', 'cmd');
      await sleep(1400);
      pushLine('added 148 packages, audited 149 packages in 4s', 'success');
      await sleep(700);
      pushLine('found 0 vulnerabilities', 'success');
      await sleep(900);
      pushLine(`cd ${guildId || 'server'}`, 'cmd');
      await sleep(800);
      pushLine(`giriş yapıldı: ${resolvedGuildName}`, 'success');
      await sleep(700);
      pushLine(`admin rolü: ${adminRoleId}`, 'info');
      await sleep(600);
      pushLine(`verify rolü: ${verifyRoleId}`, 'info');
      await sleep(900);
      pushLine('discord:kanallari-olustur', 'cmd');
      await sleep(1200);
      pushLine('kanal kategorileri oluşturuluyor...', 'info');
      await sleep(1200);
      pushLine('kanallar oluşturuldu', 'success');
      await sleep(700);
      pushLine('discord:webhook-olustur', 'cmd');
      await sleep(1200);
      pushLine('webhooklar hazırlanıyor...', 'info');
      await sleep(900);

      try {
        const response = await fetch('/api/setup/server', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            guildId,
            adminRoleId,
            verifyRoleId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          const detail = errorData?.detail ? ` (${errorData.detail})` : '';
          throw new Error((errorData.error || 'Kurulum başarısız') + detail);
        }

        const payload = (await response.json()) as {
          userCategoryId?: string | null;
          adminCategoryId?: string | null;
          createdChannels?: Array<{ type: string; name: string; id?: string; webhookUrl?: string | null }>;
        };

        pushLine('kategori doğrulama: tamam', 'success');

        const createdChannels = payload.createdChannels ?? [];
        if (createdChannels.length) {
          pushLine('oluşturulan kanallar:', 'info');
          for (const channel of createdChannels) {
            await sleep(160);
            pushLine(`• ${channel.name} (${channel.type})`, 'info');
          }
        }
        if (createdChannels.length) {
          for (const channel of createdChannels) {
            await sleep(360);
            pushLine(`webhook oluşturuldu: ${channel.name} (${channel.type})`, channel.webhookUrl ? 'success' : 'warn');
          }
        }

        pushLine('database: kayıtlar yazılıyor...', 'info');
        await sleep(1200);
        pushLine('kurulum: başarılı', 'success');
        await sleep(900);
        pushLine('kullanıcı yönlendiriliyor...', 'info');

        try {
          const stored = localStorage.getItem('adminGuilds');
          if (stored && guildId) {
            const parsed = JSON.parse(stored) as Array<{ id: string; isSetup?: boolean }>;
            const updated = parsed.map((g) => (g.id === guildId ? { ...g, isSetup: true } : g));
            localStorage.setItem('adminGuilds', JSON.stringify(updated));
          }
        } catch {
          // ignore localStorage update errors
        }

        for (let i = 5; i >= 1; i -= 1) {
          pushLine(`admin paneli ${i} saniye içinde açılacak...`, 'info');
          await sleep(1000);
        }

        router.replace('/admin');
      } catch (setupError) {
        console.error('Setup error:', setupError);
        setError(setupError instanceof Error ? setupError.message : 'Kurulum sırasında hata oluştu.');
        pushLine('kurulum: başarısız', 'warn');
      } finally {
        setSettingUp(false);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Title bar'da son çalıştırılan komandu göster
  const lastCmd = [...terminalLines].reverse().find((l) => l.tone === 'cmd')?.text;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#06080c',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '56px 16px',
      }}
    >
      {/* ── Global keyframes + terminal-specific styles ── */}
      <style>{`
        @keyframes cursor-blink {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0; }
        }

        /* Block cursor */
        .term-cursor {
          display: inline-block;
          width: 8px;
          height: 15px;
          background: #4ade80;
          margin-left: 4px;
          vertical-align: middle;
          animation: cursor-blink 1.05s step-end infinite;
          box-shadow: 0 0 6px rgba(74, 222, 128, 0.55);
        }

        /* CRT scanlines overlay */
        .term-scanlines {
          position: relative;
        }
        .term-scanlines::after {
          content: '';
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            180deg,
            transparent   0px,
            transparent   2px,
            rgba(0,0,0,0.055) 2px,
            rgba(0,0,0,0.055) 4px
          );
          pointer-events: none;
          z-index: 10;
        }

        /* Webkit scrollbar — minimal, dark */
        .term-scroll::-webkit-scrollbar        { width: 5px; }
        .term-scroll::-webkit-scrollbar-track   { background: transparent; }
        .term-scroll::-webkit-scrollbar-thumb   { background: #252830; border-radius: 3px; }
        .term-scroll::-webkit-scrollbar-thumb:hover { background: #353a45; }
      `}</style>

      <div style={{ width: '100%', maxWidth: '740px' }}>
        {/* ════════════════════════════════════════════════
            TERMINAL WINDOW
            ════════════════════════════════════════════════ */}
        <div
          style={{
            borderRadius: '10px',
            overflow: 'hidden',
            border: '1px solid #1c1f26',
            background: '#0a0b0e',
            boxShadow: [
              '0 0 0 1px rgba(0,0,0,0.5)',
              '0 28px 52px -14px rgba(0,0,0,0.65)',
              '0 0 80px rgba(74,222,128,0.025)',
            ].join(', '),
          }}
        >
          {/* ── Title Bar ── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              height: '38px',
              padding: '0 14px',
              background: '#111315',
              borderBottom: '1px solid #1c1f26',
            }}
          >
            {/* Traffic-light dots */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ff5f57', boxShadow: '0 0 4px rgba(255,95,87,0.45)' }} />
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#febc2e', boxShadow: '0 0 3px rgba(254,188,46,0.35)' }} />
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#28c840', boxShadow: '0 0 4px rgba(40,200,64,0.4)' }} />
            </div>

            {/* Centered path / command */}
            <div style={{ flex: 1, textAlign: 'center' }}>
              <span
                style={{
                  color: '#4b5563',
                  fontSize: '11px',
                  fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
                  letterSpacing: '0.015em',
                }}
              >
                {lastCmd || 'bash'} &nbsp;—&nbsp; ~/veri-merkezi/setup
              </span>
            </div>

            {/* Live / Done indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              <div
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: settingUp ? '#4ade80' : '#3a3f4a',
                  boxShadow: settingUp ? '0 0 5px rgba(74,222,128,0.6)' : 'none',
                  transition: 'background 0.3s, box-shadow 0.3s',
                }}
              />
              <span
                style={{
                  color: settingUp ? '#4ade80' : '#3a3f4a',
                  fontSize: '10px',
                  fontFamily: "'SF Mono', 'Fira Code', monospace",
                  transition: 'color 0.3s',
                }}
              >
                {settingUp ? 'running' : 'done'}
              </span>
            </div>
          </div>

          {/* ── Terminal Body ── */}
          <div
            ref={terminalRef}
            className="term-scanlines term-scroll"
            style={{
              maxHeight: '540px',
              overflowY: 'auto',
              padding: '22px 26px',
              background: '#0a0b0e',
              fontFamily: "'SF Mono', 'Fira Code', 'Fira Mono', 'Roboto Mono', 'Consolas', monospace",
              fontSize: '13px',
              lineHeight: '1.85',
            }}
          >
            <div style={{ position: 'relative', zIndex: 5 }}>

              {/* Empty state — just the prompt + cursor */}
              {terminalLines.length === 0 && (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ color: '#6366f1', textShadow: '0 0 6px rgba(99,102,241,0.3)', userSelect: 'none' }}>$</span>
                  <span className="term-cursor" />
                </div>
              )}

              {/* Lines */}
              {terminalLines.map((line, index) => {
                const isLast     = index === terminalLines.length - 1;
                const showCursor = isLast && settingUp;

                /* ─── Command line ─── */
                if (line.tone === 'cmd') {
                  return (
                    <div
                      key={index}
                      style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '1px' }}
                    >
                      <span style={{ color: '#6366f1', textShadow: '0 0 6px rgba(99,102,241,0.3)', userSelect: 'none', flexShrink: 0 }}>
                        $
                      </span>
                      <span style={{ color: '#e2e8f0', textShadow: '0 0 3px rgba(226,232,240,0.1)' }}>
                        {line.text}
                      </span>
                      {showCursor && <span className="term-cursor" />}
                    </div>
                  );
                }

                /* ─── Output line ─── */
                const OUTPUT_STYLES = {
                  success: { color: '#4ade80', textShadow: '0 0 5px rgba(74,222,128,0.22)' },
                  warn:    { color: '#f87171', textShadow: '0 0 5px rgba(248,113,113,0.22)' },
                  info:    { color: '#94a3b8', textShadow: 'none' },
                } as const;

                const style = OUTPUT_STYLES[line.tone ?? 'info'];

                return (
                  <div key={index} style={{ paddingLeft: '20px', marginBottom: '1px' }}>
                    <span style={style}>{line.text}</span>
                    {showCursor && <span className="term-cursor" />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════
            ERROR BLOCK  (terminal-style)
            ════════════════════════════════════════════════ */}
        {error && (
          <div
            style={{
              marginTop: '14px',
              borderRadius: '8px',
              overflow: 'hidden',
              border: '1px solid rgba(248,113,113,0.18)',
              background: 'rgba(248,113,113,0.04)',
            }}
          >
            {/* Mini title bar for error */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '5px 12px',
                background: 'rgba(248,113,113,0.09)',
                borderBottom: '1px solid rgba(248,113,113,0.12)',
              }}
            >
              <span
                style={{
                  color: '#f87171',
                  fontSize: '10px',
                  fontFamily: "'SF Mono', monospace",
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                ✕ hata
              </span>
            </div>
            <p
              style={{
                margin: 0,
                color: '#fca5a5',
                fontSize: '13px',
                fontFamily: "'SF Mono', monospace",
                padding: '10px 14px',
              }}
            >
              {error}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SetupTerminalPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SetupTerminalContent />
    </Suspense>
  );
}
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { LuShield, LuX, LuLoader } from 'react-icons/lu';

interface DiscordRole {
  id: string;
  name: string;
  color: number;
  permissions: string; // Discord API string olarak döndürüyor
  position: number;
}

interface DiscordUser {
  id: string;
  username: string;
  avatar: string | null;
  discriminator: string;
}

export default function SetupPage() {
  const router = useRouter();
  const [user] = useState<DiscordUser | null>(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('discordUser');
      if (storedUser) {
        try {
          return JSON.parse(storedUser);
        } catch (error) {
          console.error('Failed to parse discord user data:', error);
          return null;
        }
      }
    }
    return null;
  });

  const [guildId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const cookies = document.cookie.split('; ');
      const guildCookie = cookies.find(row => row.startsWith('selected_guild_id='));
      return guildCookie ? guildCookie.split('=')[1] : null;
    }
    return null;
  });

  const [guildName, setGuildName] = useState<string>('');
  const [guildIcon, setGuildIcon] = useState<string | null>(null);
  const [roles, setRoles] = useState<DiscordRole[]>([]);
  const [selectedAdminRole, setSelectedAdminRole] = useState<string>('');
  const [selectedVerifyRole, setSelectedVerifyRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [settingUp, setSettingUp] = useState(false);
  const [setupStarted, setSetupStarted] = useState(false);
  const [setupCompleted, setSetupCompleted] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [alreadySetup, setAlreadySetup] = useState(false);
  const [error, setError] = useState<string>('');
  const [terminalLines, setTerminalLines] = useState<string[]>([]);

  const getRoleNameById = useCallback(
    (roleId: string) => roles.find((role) => role.id === roleId)?.name ?? 'Bilinmeyen Rol',
    [roles],
  );

  useEffect(() => {
    const checkPermissionsAndLoadData = async () => {
      if (!guildId || !user) {
        router.replace('/auth/select-server');
        return;
      }

      try {
        // Sunucu bilgilerini al
        const guildResponse = await fetch(`/api/discord/guild/${guildId}`, {
          method: 'GET',
        });

        if (!guildResponse.ok) {
          throw new Error('Sunucu bilgileri alınamadı');
        }

        const guildData = await guildResponse.json();
        setGuildName(guildData.name);
        setGuildIcon(guildData.icon ?? null);

        // Roller ve sunucu bilgilerini al
        const rolesResponse = await fetch(`/api/discord/guild/${guildId}/roles`, {
          method: 'GET',
        });

        if (!rolesResponse.ok) {
          throw new Error('Sunucu rolleri alınamadı');
        }

        const rolesData = await rolesResponse.json();
        setRoles(rolesData);

        // Kullanıcının admin olup olmadığını kontrol et
        const adminRoles = rolesData.filter((role: DiscordRole) => {
          const perms = parseInt(role.permissions);
          return (perms & 0x8) || // Administrator
                 (perms & 0x20) || // Manage Guild
                 (perms & 0x10000000); // Manage Roles
        });

        // Kullanıcının rollerini al
        const userRolesResponse = await fetch(`/api/discord/guild/${guildId}/members/${user?.id}`, {
          method: 'GET',
        });

        let userHasAdminRole = false;
        if (userRolesResponse.ok) {
          const userData = await userRolesResponse.json();
          userHasAdminRole = userData.roles.some((roleId: string) =>
            adminRoles.some((adminRole: DiscordRole) => adminRole.id === roleId)
          );
        }

        setIsAdmin(userHasAdminRole);

        if (adminRoles.length === 0) {
          setError('Bu sunucuda bot kurulumu aktif değil. Sunucu sahibi veya yönetici ile iletişime geçin.');
        }

        // Setup status check
        const setupStatusResponse = await fetch('/api/setup/server', { method: 'GET' });
        if (setupStatusResponse.ok) {
          const setupStatus = await setupStatusResponse.json();
          if (setupStatus?.is_setup) {
            setAlreadySetup(true);
            if (setupStatus.admin_role_id) {
              setSelectedAdminRole(setupStatus.admin_role_id);
            }
            if (setupStatus.verify_role_id) {
              setSelectedVerifyRole(setupStatus.verify_role_id);
            }
          }
        }

      } catch (error) {
        console.error('Setup data loading error:', error);
        setError('Sunucu bilgileri yüklenirken hata oluştu.');
      } finally {
        setLoading(false);
      }
    };

    checkPermissionsAndLoadData();
  }, [guildId, user, router]);

  const handleSetup = async () => {
    if (alreadySetup) {
      setError('Bu sunucu zaten kurulmuş. Admin paneline yönlendiriliyorsunuz...');
      setTerminalLines((prev) => [...prev, 'setup: already completed', 'redirect: admin in 5s']);
      setRedirectCountdown(5);
      return;
    }
    if (!selectedAdminRole || !selectedVerifyRole) {
      setError('Lütfen hem admin hem de verify rolünü seçin.');
      return;
    }
    if (!guildId) {
      setError('Sunucu bilgisi bulunamadı.');
      return;
    }

    setSettingUp(true);
    setSetupStarted(true);
    setError('');
    const adminRoleName = getRoleNameById(selectedAdminRole);
    const verifyRoleName = getRoleNameById(selectedVerifyRole);
    setTerminalLines([
      'npm ci',
      'added 148 packages, audited 149 packages in 4s',
      'found 0 vulnerabilities',
      `cd ${guildId}`,
      `env: guild=${guildId} adminRole=${adminRoleName} verifyRole=${verifyRoleName}`,
      `roles: admin="${adminRoleName}" verify="${verifyRoleName}"`,
      'discord:channels:create',
      'discord:webhooks:create',
      'db:upsert:servers',
    ]);

    try {
      setTerminalLines((prev) => [...prev, 'setup: running...']);

      const response = await fetch('/api/setup/server', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guildId, adminRoleId: selectedAdminRole, verifyRoleId: selectedVerifyRole }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const detail = errorData?.detail ? ` (${errorData.detail})` : '';
        throw new Error((errorData.error || 'Kurulum başarısız') + detail);
      }

      await response.json().catch(() => null);

      setTerminalLines((prev) => [...prev, 'channels: done', 'webhooks: done', 'database: done', 'setup: completed', 'redirect: admin in 5s']);
      setSetupCompleted(true);
      setAlreadySetup(true);
      setRedirectCountdown(5);

      try {
        const stored = localStorage.getItem('adminGuilds');
        if (stored) {
          const parsed = JSON.parse(stored) as Array<{ id: string; isSetup?: boolean }>;
          const updated = parsed.map((g) => (g.id === guildId ? { ...g, isSetup: true } : g));
          localStorage.setItem('adminGuilds', JSON.stringify(updated));
        }
      } catch {
        // ignore
      }
    } catch (setupError) {
      console.error('Setup error:', setupError);
      setError(setupError instanceof Error ? setupError.message : 'Kurulum sırasında hata oluştu.');
      setTerminalLines((prev) => [...prev, 'kurulum başarısız']);
    } finally {
      setSettingUp(false);
    }
  };

  useEffect(() => {
    if (redirectCountdown === null) {
      return;
    }
    if (redirectCountdown <= 0) {
      router.replace('/admin');
      return;
    }

    const timer = setTimeout(() => {
      const nextValue = redirectCountdown - 1;
      setRedirectCountdown(nextValue);
      if (nextValue > 0) {
        setTerminalLines((prev) => [...prev, `redirect: admin in ${nextValue}s`]);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [redirectCountdown, router]);

  useEffect(() => {
    if (!setupStarted || setupCompleted) {
      return;
    }

    const adminRoleName = selectedAdminRole ? getRoleNameById(selectedAdminRole) : 'Admin';
    const verifyRoleName = selectedVerifyRole ? getRoleNameById(selectedVerifyRole) : 'Verify';

    const liveLogs = [
      `discord:roles:bind admin=${adminRoleName}`,
      `discord:roles:bind verify=${verifyRoleName}`,
      'discord:permissions:sync',
      'discord:webhooks:verify',
      'db:schemas:check',
      'db:upsert:channels',
      'db:upsert:webhooks',
      'setup: heartbeat',
    ];

    let index = 0;
    const interval = setInterval(() => {
      setTerminalLines((prev) => [...prev, liveLogs[index % liveLogs.length]]);
      index += 1;
    }, 1200);

    return () => clearInterval(interval);
  }, [setupStarted, setupCompleted, selectedAdminRole, selectedVerifyRole, getRoleNameById]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0d12] text-white">
        <div className="text-center">
          <LuLoader className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-sm text-white/70">Sunucu bilgileri yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0b0d12] text-white">
        <nav className="border-b border-white/10 bg-[#0b0d12]">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              {user?.avatar ? (
                <Image
                  src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`}
                  alt={user.username}
                  width={44}
                  height={44}
                  className="h-11 w-11 rounded-full border-2 border-red-500/30"
                />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-red-500/30 bg-red-600">
                  <span className="text-base font-bold text-white">
                    {user?.username?.charAt(0).toUpperCase() ?? 'U'}
                  </span>
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-white">{user?.username ?? 'Discord Kullanıcısı'}</p>
                <p className="text-xs text-white/50">Discord hesabınızla giriş yaptınız</p>
              </div>
            </div>
            <button
              onClick={() => router.replace('/auth/select-server')}
              className="text-xs text-white/50 hover:text-white/70 transition-colors"
            >
              Sunucu seçimine dön
            </button>
          </div>
        </nav>

        <main className="mx-auto w-full max-w-5xl px-4 py-8">
          <div className="mx-auto w-full max-w-md space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <LuShield className="w-8 h-8 text-red-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Erişim Reddedildi</h1>
              <p className="text-sm text-white/70 mb-6">
                Bu sunucuda bot kurulumu aktif değil
              </p>
            </div>

            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6">
              <h3 className="font-semibold text-red-400 mb-3 flex items-center gap-2">
                <LuX className="w-5 h-5" />
                Neden Erişim Yok?
              </h3>
              <ul className="text-sm text-gray-300 space-y-2">
                <li>• Sunucu sahibi veya yönetici değilsiniz</li>
                <li>• Gerekli yönetici izinlerine sahip değilsiniz</li>
                <li>• Sunucu bot kurulumu için hazır değil</li>
              </ul>
              <div className="mt-4 p-3 bg-red-900/30 rounded-lg">
                <p className="text-xs text-red-300">
                  <strong>Çözüm:</strong> Sunucu sahibi veya bir yönetici ile iletişime geçin ve botun kurulmasını isteyin.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0d12] text-white">
      <nav className="border-b border-white/10 bg-[#0b0d12]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            {user?.avatar ? (
              <Image
                src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`}
                alt={user.username}
                width={44}
                height={44}
                className="h-11 w-11 rounded-full border-2 border-white/20"
              />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white/20 bg-slate-600">
                <span className="text-base font-bold text-white">
                  {user?.username?.charAt(0).toUpperCase() ?? 'U'}
                </span>
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-white">{user?.username ?? 'Discord Kullanıcısı'}</p>
              <p className="text-xs text-white/50">Discord hesabınızla giriş yaptınız</p>
            </div>
          </div>
          <button
            onClick={() => router.replace('/auth/select-server')}
            className="text-xs text-white/50 hover:text-white/70 transition-colors"
          >
            Sunucu seçimine dön
          </button>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-6xl px-4 py-10">
        <header className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#0d1118] via-[#0b0f15] to-[#0c111a] p-6 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:divide-x lg:divide-white/10">
            <div className="flex items-center gap-4 lg:pr-6">
              {guildIcon ? (
                <Image
                  src={guildIcon}
                  alt={guildName || 'Sunucu'}
                  width={56}
                  height={56}
                  className="h-14 w-14 rounded-2xl border border-white/10 object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-lg font-semibold text-white/80">
                  {guildName ? guildName.charAt(0).toUpperCase() : 'S'}
                </div>
              )}
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/40">Kurulum</p>
                <h1 className="mt-1 text-2xl font-semibold text-white">
                  {guildName || 'Sunucu'}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {guildId && (
                    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-mono text-white/60">
                      ID: {guildId}
                    </span>
                  )}
                  <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-white/70">
                    {alreadySetup ? 'Hazır' : setupStarted ? 'Çalışıyor' : 'Bekliyor'}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </header>

        {!setupStarted ? (
          <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-xs text-white/70">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="grid gap-3 sm:grid-cols-2 lg:w-[70%]">
                <div>
                  <label className="mb-1 block text-[11px] uppercase tracking-wide text-white/50">Admin Rolü</label>
                  <select
                    value={selectedAdminRole}
                    onChange={(e) => setSelectedAdminRole(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-gray-900/70 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Rol seçin...</option>
                    {roles
                      .filter(role => {
                        const perms = parseInt(role.permissions);
                        return (perms & 0x8) ||
                               (perms & 0x20) ||
                               (perms & 0x10000000);
                      })
                      .map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] uppercase tracking-wide text-white/50">Verify Rolü</label>
                  <select
                    value={selectedVerifyRole}
                    onChange={(e) => setSelectedVerifyRole(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-gray-900/70 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Rol seçin...</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex w-full items-end justify-end lg:w-auto">
                <button
                  onClick={handleSetup}
                  disabled={settingUp || !selectedAdminRole || !selectedVerifyRole}
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-lg border px-5 py-2 text-xs font-semibold transition-colors sm:w-auto ${
                    settingUp
                      ? 'border-blue-500/40 bg-blue-500/10 text-blue-200/70'
                      : selectedAdminRole && selectedVerifyRole
                        ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'
                        : 'border-white/10 bg-white/5 text-white/50'
                  }`}
                >
                  {settingUp ? 'Kuruluyor...' : 'Kurulumu Tamamla'}
                </button>
              </div>
            </div>
          </section>
        ) : (
          <section className="mt-6 rounded-2xl border border-white/10 bg-[#0a0d12] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3 text-[11px] text-white/50">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-rose-500/70" />
                <span className="h-2 w-2 rounded-full bg-amber-400/70" />
                <span className="h-2 w-2 rounded-full bg-emerald-500/70" />
                <span className="ml-1">setup.log</span>
              </div>
              <span>live</span>
            </div>
            <div className="min-h-[280px] max-h-[360px] overflow-y-auto px-5 py-5 text-xs font-mono leading-6">
              {terminalLines.length === 0 ? (
                <span className="text-white/70">$ setup ready</span>
              ) : (
                terminalLines.slice(-14).map((line, index) => (
                  <div
                    key={`${line}-${index}`}
                    className={
                      line.includes('failed') || line.includes('hata') || line.includes('error')
                        ? 'text-rose-300/90'
                        : line.includes('done') || line.includes('completed')
                          ? 'text-emerald-200/90'
                          : line.includes('discord')
                            ? 'text-indigo-200/90'
                            : line.includes('db:')
                              ? 'text-amber-200/90'
                              : 'text-green-300/90'
                    }
                  >
                    {line.startsWith('$') ? line : `$ ${line}`}
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        <div className="mt-8" />

        <div className="mt-6 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
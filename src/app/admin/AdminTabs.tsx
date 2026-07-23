'use client';

import { useState } from 'react';
import { approveUser, deleteUser, toggleFeatured } from './actions';

type UserRow = {
  id: string;
  email: string;
  display_name: string | null;
  is_admin: boolean;
  is_approved: boolean;
};

type MatchRow = {
  id: string;
  home_team: string;
  away_team: string;
  featured: boolean;
};

type Tab = 'usuarios' | 'solicitudes' | 'partidos';

export default function AdminTabs({
  approved,
  pending,
  matchesList,
}: {
  approved: UserRow[];
  pending: UserRow[];
  matchesList: MatchRow[];
}) {
  // Si hay solicitudes pendientes, arrancamos ahí; si no, en usuarios.
  const [tab, setTab] = useState<Tab>(pending.length > 0 ? 'solicitudes' : 'usuarios');

  const tabs: { id: Tab; label: string; icon: string; badge?: number }[] = [
    { id: 'usuarios', label: 'Usuarios', icon: '👥', badge: approved.length },
    { id: 'solicitudes', label: 'Solicitudes', icon: '📥', badge: pending.length || undefined },
    { id: 'partidos', label: 'Partidos', icon: '⚽' },
  ];

  return (
    <>
      {/* ================= Navegación por pestañas ================= */}
      <nav
        style={{
          display: 'flex',
          gap: '0.4rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
        }}
      >
        {tabs.map((t) => {
          const active = tab === t.id;
          const alert = t.id === 'solicitudes' && (t.badge ?? 0) > 0;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1.1rem',
                borderRadius: 12,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '0.95rem',
                fontWeight: active ? 700 : 500,
                color: active ? 'var(--color-text-main)' : 'var(--color-text-muted)',
                background: active ? 'var(--color-bg-inset)' : 'transparent',
                border: active
                  ? '1px solid rgba(148,163,184,0.25)'
                  : '1px solid transparent',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{t.icon}</span>
              {t.label}
              {t.badge != null && (
                <span
                  style={{
                    background: alert ? 'var(--color-danger)' : 'rgba(148,163,184,0.25)',
                    color: alert ? '#fff' : 'var(--color-text-muted)',
                    borderRadius: 999,
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    padding: '1px 8px',
                    minWidth: 22,
                    textAlign: 'center',
                  }}
                >
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ================= Solicitudes de registro ================= */}
      {tab === 'solicitudes' && (
        <section
          className="glass-panel animate-fade-in"
          style={{
            padding: '1.5rem',
            borderColor: pending.length > 0 ? 'rgba(248,113,113,0.4)' : undefined,
          }}
        >
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.35rem' }}>
            📥 Solicitudes de registro
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem', marginBottom: '1.1rem' }}>
            Nuevos usuarios esperando tu aprobación para poder jugar.
          </p>

          {pending.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '1.5rem 0' }}>
              ✅ No hay solicitudes pendientes.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
              {pending.map((u) => (
                <div
                  key={u.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    flexWrap: 'wrap',
                    padding: '0.85rem 1rem',
                    borderRadius: 12,
                    background: 'var(--color-bg-inset)',
                    border: '1px solid rgba(248,113,113,0.25)',
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      flexShrink: 0,
                      background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      color: '#00122e',
                    }}
                  >
                    {(u.display_name || u.email).substring(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.email}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      {u.display_name || '—'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <form action={approveUser}>
                      <input type="hidden" name="userId" value={u.id} />
                      <button type="submit" className="btn-primary" style={{ background: 'var(--color-success)' }}>
                        ✓ Aprobar
                      </button>
                    </form>
                    <form action={deleteUser}>
                      <input type="hidden" name="userId" value={u.id} />
                      <button
                        type="submit"
                        className="btn-ghost"
                        style={{ color: 'var(--color-danger)', borderColor: 'rgba(248,113,113,0.3)' }}
                      >
                        Eliminar
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ================= Partido de la Fecha ================= */}
      {tab === 'partidos' && (
        <section className="glass-panel animate-fade-in" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.35rem' }}>
            ⭐ Partido de la Fecha (vale doble)
          </h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.1rem', fontSize: '0.88rem' }}>
            Elegí el partido destacado de la <strong>próxima fecha</strong>: sus puntos valen x2. Solo puede haber uno.
          </p>
          {matchesList.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '1.5rem 0' }}>
              No hay partidos próximos para destacar.
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '0.6rem' }}>
              {matchesList.map((m) => (
                <form key={m.id} action={toggleFeatured} style={{ margin: 0 }}>
                  <input type="hidden" name="matchId" value={m.id} />
                  <button
                    type="submit"
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      cursor: 'pointer',
                      padding: '0.7rem 0.9rem',
                      borderRadius: 10,
                      fontFamily: 'inherit',
                      fontSize: '0.88rem',
                      border: m.featured ? '1px solid var(--color-warning)' : '1px solid rgba(148,163,184,0.14)',
                      background: m.featured ? 'rgba(251,191,36,0.12)' : 'var(--color-bg-inset)',
                      color: 'var(--color-text-main)',
                    }}
                  >
                    <span style={{ marginRight: '0.5rem' }}>{m.featured ? '⭐' : '☆'}</span>
                    {m.home_team} vs {m.away_team}
                  </button>
                </form>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ================= Todos los usuarios ================= */}
      {tab === 'usuarios' && (
        <section className="glass-panel animate-fade-in" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.1rem' }}>👥 Usuarios ({approved.length})</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', minWidth: 460 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(148,163,184,0.15)' }}>
                  <th style={{ padding: '0.7rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Email</th>
                  <th style={{ padding: '0.7rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Nombre</th>
                  <th style={{ padding: '0.7rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Estado</th>
                  <th style={{ padding: '0.7rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {approved.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(148,163,184,0.07)' }}>
                    <td style={{ padding: '0.7rem' }}>{u.email}</td>
                    <td style={{ padding: '0.7rem' }}>{u.display_name || '-'}</td>
                    <td style={{ padding: '0.7rem' }}>
                      {u.is_admin ? (
                        <span style={{ color: 'var(--color-accent)' }}>Admin</span>
                      ) : (
                        <span style={{ color: 'var(--color-success)' }}>Aprobado</span>
                      )}
                    </td>
                    <td style={{ padding: '0.7rem' }}>
                      {!u.is_admin && (
                        <form action={deleteUser}>
                          <input type="hidden" name="userId" value={u.id} />
                          <button
                            type="submit"
                            style={{
                              padding: '5px 12px',
                              background: 'transparent',
                              color: 'var(--color-danger)',
                              border: '1px solid rgba(248,113,113,0.3)',
                              borderRadius: 7,
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                              fontSize: '0.82rem',
                            }}
                          >
                            Eliminar
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

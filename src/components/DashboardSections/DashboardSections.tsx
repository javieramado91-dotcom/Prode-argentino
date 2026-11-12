'use client';

import React, { useMemo, useState, type ReactNode } from 'react';
import MatchCard, { MatchProps } from '../MatchCard/MatchCard';
import styles from './DashboardSections.module.css';
import { IconArchive, IconBall, IconCalendar, IconCheck, IconMedal, IconTable } from '@/components/Icons/Icons';
import { diaAR, diaMes } from '@/lib/fecha';

type TabKey = 'jugar' | 'vivo' | 'resultados' | 'calendario' | 'tablas' | 'premios' | 'grupos';

function roundKey(m: MatchProps): string {
  return m.round || m.matchDate.slice(0, 10);
}

function groupByRound(matches: MatchProps[]): [string, MatchProps[]][] {
  const map = new Map<string, MatchProps[]>();
  for (const m of matches) {
    const key = roundKey(m);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  }
  return [...map.entries()];
}

function dateRange(matches: MatchProps[]): string {
  const dates = matches
    .map((m) => new Date(m.matchDate))
    .sort((a, b) => a.getTime() - b.getTime());
  const min = dates[0];
  const max = dates[dates.length - 1];
  // La comparación también va en hora argentina: `toDateString()` usa la zona
  // del proceso, así que en el servidor (UTC) partía en dos una fecha que para
  // un argentino cae toda el mismo día.
  return diaAR(min) === diaAR(max) ? diaMes(min) : `${diaMes(min)} al ${diaMes(max)}`;
}

function Groups({
  groups,
  labels,
  playoffRounds,
  empty,
}: {
  groups: [string, MatchProps[]][];
  labels: Record<string, string>;
  playoffRounds: Set<string>;
  empty: string;
}) {
  if (groups.length === 0) return <div className={`glass-panel ${styles.empty}`}>{empty}</div>;
  return (
    <>
      {groups.map(([key, matches]) => {
        const playoff = playoffRounds.has(key);
        return (
          <div key={key} className={styles.group}>
            <div className={styles.groupHeader}>
              <span className={`${styles.groupTitle} ${playoff ? styles.groupTitlePlayoff : ''}`}>
                {labels[key] ?? 'Fecha'}
              </span>
              {playoff && <span className="tag tag-gold">Playoffs</span>}
              <span className={styles.groupCount}>
                {dateRange(matches)} · {matches.length} {matches.length === 1 ? 'partido' : 'partidos'}
              </span>
            </div>
            <div className={styles.grid}>
              {matches.map((m) => (
                <MatchCard key={m.id} match={m} />
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}

export default function DashboardSections({
  matches,
  labels,
  playoffRounds: playoffRoundList,
  tables,
  awards,
  archive,
  initialTab,
}: {
  matches: MatchProps[];
  labels: Record<string, string>;
  playoffRounds: string[];
  tables: ReactNode;
  awards: ReactNode;
  archive?: ReactNode;
  initialTab?: TabKey;
}) {
  const playoffRounds = useMemo(() => new Set(playoffRoundList), [playoffRoundList]);
  const live = useMemo(() => matches.filter((m) => m.status === 'in_progress'), [matches]);

  const jugarGroups = useMemo(() => {
    const list = matches.filter((m) => m.predictable && m.status === 'pending');
    return groupByRound(list).sort((a, b) => a[0].localeCompare(b[0]));
  }, [matches]);

  const resultadoGroups = useMemo(() => {
    // TODOS los partidos ya jugados, agrupados por fecha. Sin ventana móvil:
    // con partidos postergados la "fecha actual" quedaba clavada en el pasado
    // y se escondían resultados (ver memoria del proyecto).
    const list = matches.filter((m) => m.status === 'finished');
    // Más reciente arriba (fechas y partidos dentro de cada fecha).
    return groupByRound(list)
      .map(
        ([key, ms]) =>
          [
            key,
            [...ms].sort(
              (a, b) => new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime()
            ),
          ] as [string, MatchProps[]]
      )
      .sort((a, b) => b[0].localeCompare(a[0]));
  }, [matches]);

  const calendarioGroups = useMemo(
    () =>
      groupByRound(matches)
        // Solo fechas con algún partido por jugar o en curso; las transcurridas
        // viven en Resultados.
        .filter(([, ms]) => ms.some((m) => m.status !== 'finished'))
        .sort((a, b) => a[0].localeCompare(b[0])),
    [matches]
  );

  const jugarCount = useMemo(() => jugarGroups.reduce((n, [, m]) => n + m.length, 0), [jugarGroups]);
  const pendingToPredict = useMemo(
    () => jugarGroups.reduce((n, [, ms]) => n + ms.filter((m) => !m.userPrediction).length, 0),
    [jugarGroups]
  );

  const [tab, setTab] = useState<TabKey>(initialTab ?? (live.length > 0 ? 'vivo' : 'jugar'));

  const tabs: { key: TabKey; label: string; icon: ReactNode; badge?: number; live?: boolean; gold?: boolean }[] = [
    { key: 'jugar', label: 'Por jugar', icon: <IconBall />, badge: jugarCount || undefined },
    ...(live.length > 0
      ? [{ key: 'vivo' as TabKey, label: 'En vivo', icon: <span className="live-dot" />, badge: live.length, live: true }]
      : []),
    { key: 'resultados', label: 'Resultados', icon: <IconCheck /> },
    { key: 'calendario', label: 'Calendario', icon: <IconCalendar /> },
    { key: 'tablas', label: 'Tablas', icon: <IconTable /> },
    { key: 'premios', label: 'Premios', icon: <IconMedal /> },
    ...(archive ? [{ key: 'grupos' as TabKey, label: 'Fase de Grupos', icon: <IconArchive />, gold: true }] : []),
  ];

  return (
    <div>
      <div className={styles.tabsWrap}>
        <div className={`segmented ${styles.tabs}`} role="tablist">
          {tabs.map((t) => (
            <button
              key={t.key}
              role="tab"
              type="button"
              aria-selected={tab === t.key}
              className={t.gold ? 'gold' : undefined}
              onClick={() => setTab(t.key)}
            >
              {t.icon}
              {t.label}
              {t.badge != null && (
                <span className={`${styles.badge} ${t.live ? styles.liveBadge : ''}`}>{t.badge}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {tab === 'jugar' && (
        <>
          {pendingToPredict > 0 && (
            <div className={styles.callout}>
              <IconBall size={18} />
              Te faltan <strong>{pendingToPredict}</strong> {pendingToPredict === 1 ? 'pronóstico' : 'pronósticos'} por cargar.
            </div>
          )}
          <Groups
            groups={jugarGroups}
            labels={labels}
            playoffRounds={playoffRounds}
            empty="No hay partidos abiertos para pronosticar por ahora. Volvé cuando se acerque la próxima fecha."
          />
        </>
      )}

      {tab === 'vivo' && (
        <div className={styles.group}>
          {live.length > 0 ? (
            <div className={styles.grid}>
              {live.map((m) => (
                <MatchCard key={m.id} match={m} />
              ))}
            </div>
          ) : (
            <div className={`glass-panel ${styles.empty}`}>No hay partidos en juego en este momento.</div>
          )}
        </div>
      )}

      {tab === 'resultados' && (
        <Groups groups={resultadoGroups} labels={labels} playoffRounds={playoffRounds} empty="Todavía no hay partidos finalizados." />
      )}

      {tab === 'calendario' && (
        <Groups groups={calendarioGroups} labels={labels} playoffRounds={playoffRounds} empty="Aún no hay fechas cargadas." />
      )}

      {tab === 'tablas' && <div key="tablas">{tables}</div>}
      {tab === 'premios' && <div key="premios">{awards}</div>}
      {tab === 'grupos' && <div key="grupos">{archive}</div>}
    </div>
  );
}

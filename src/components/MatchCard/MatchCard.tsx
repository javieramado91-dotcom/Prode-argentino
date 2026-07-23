'use client';

import React, { useState, useTransition } from 'react';
import styles from './MatchCard.module.css';
import { savePrediction, getMatchPredictions, MatchPredictionRow } from '@/app/dashboard/actions';

export interface MatchProps {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo?: string;
  awayLogo?: string;
  matchDate: string;
  status: 'pending' | 'in_progress' | 'finished';
  homeScore?: number;
  awayScore?: number;
  featured?: boolean;
  round?: string;
  /** Si es false, el partido es futuro pero aún fuera de la ventana de predicción. */
  predictable?: boolean;
  userPrediction?: {
    home: number;
    away: number;
    pointsEarned?: number;
  };
}

export default function MatchCard({ match }: { match: MatchProps }) {
  const [homeInput, setHomeInput] = useState(match.userPrediction?.home?.toString() || '');
  const [awayInput, setAwayInput] = useState(match.userPrediction?.away?.toString() || '');
  const [isSaving, startTransition] = useTransition();

  // Pronósticos de compañeros de torneo (solo partidos empezados/terminados).
  const [showPreds, setShowPreds] = useState(false);
  const [preds, setPreds] = useState<MatchPredictionRow[] | null>(null);
  const [predsError, setPredsError] = useState<string | null>(null);

  const togglePreds = async () => {
    const next = !showPreds;
    setShowPreds(next);
    if (next && preds === null) {
      try {
        setPreds(await getMatchPredictions(match.id));
      } catch (e: any) {
        setPredsError(e.message || 'Error al cargar.');
      }
    }
  };

  const dateObj = new Date(match.matchDate);
  // Se bloquea a la hora de inicio, aunque la sincronización todavía no haya
  // cambiado el estado del partido.
  const hasStarted = dateObj.getTime() <= Date.now();
  // Se puede predecir solo si está pendiente, no empezó y está dentro de la
  // ventana de predicción (próximas fechas).
  const canPredict = match.predictable !== false && match.status === 'pending' && !hasStarted;
  const isLocked = !canPredict;
  const notYetOpen = match.predictable === false && match.status === 'pending' && !hasStarted;
  const isFinished = match.status === 'finished';
  const isLive = match.status === 'in_progress';

  const dateFormatted = new Intl.DateTimeFormat('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(dateObj);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (homeInput === '' || awayInput === '') return;
    
    startTransition(async () => {
      try {
        await savePrediction(match.id, parseInt(homeInput), parseInt(awayInput));
      } catch (err: any) {
        alert(err.message);
      }
    });
  };

  return (
    <div
      className={`glass-panel ${styles.card} ${isLocked ? styles.locked : ''}`}
      style={match.featured ? { borderColor: 'var(--color-warning)', boxShadow: '0 0 0 1px var(--color-warning), 0 8px 32px rgba(245,158,11,0.15)' } : undefined}
    >
      {match.featured && (
        <div style={{
          position: 'absolute', top: 0, right: 0,
          background: 'var(--color-warning)', color: '#00122e',
          fontSize: '0.7rem', fontWeight: 800, padding: '3px 10px',
          borderRadius: '0 var(--border-radius-md) 0 var(--border-radius-md)',
        }}>
          ⭐ PARTIDO DE LA FECHA · x2
        </div>
      )}
      <div className={styles.header}>
        {isLive ? (
          <span className={styles.liveTag}><span className={styles.dot}></span> En Vivo</span>
        ) : isFinished ? (
          <span className={styles.finishedTag}>Finalizado</span>
        ) : (
          <span className={styles.dateTag}>{dateFormatted}</span>
        )}
        
        {notYetOpen ? (
          <span className={styles.lockIcon} title="Se habilita en las próximas fechas">⏳</span>
        ) : isLocked && !isFinished ? (
          <span className={styles.lockIcon} title="Pronóstico bloqueado">🔒</span>
        ) : null}
      </div>

      <div className={styles.body}>
        <div className={styles.team}>
          <div className={styles.logoCircle}>
            {match.homeLogo ? <img src={match.homeLogo} alt={match.homeTeam} /> : match.homeTeam.substring(0, 3).toUpperCase()}
          </div>
          <span className={styles.teamName}>{match.homeTeam}</span>
        </div>

        <form className={styles.scoreSection} onSubmit={handleSave}>
          <div className={styles.inputsWrapper}>
            <input 
              type="number" 
              min="0" 
              max="99" 
              value={homeInput}
              onChange={(e) => setHomeInput(e.target.value)}
              disabled={isLocked || isSaving}
              className={styles.scoreInput}
            />
            <span className={styles.vs}>-</span>
            <input 
              type="number" 
              min="0" 
              max="99" 
              value={awayInput}
              onChange={(e) => setAwayInput(e.target.value)}
              disabled={isLocked || isSaving}
              className={styles.scoreInput}
            />
          </div>
          
          {(isLive || isFinished) && (
            <div className={styles.actualScore}>
              Resultado: {match.homeScore} - {match.awayScore}
            </div>
          )}

          {notYetOpen && (
            <div className={styles.actualScore}>Se habilita en las próximas fechas</div>
          )}

          {!isLocked && (
            <button type="submit" className={`btn-primary ${styles.saveButton}`} disabled={isSaving}>
              {isSaving ? 'Guardando...' : 'Guardar Pronóstico'}
            </button>
          )}
        </form>

        <div className={styles.team}>
          <div className={styles.logoCircle}>
            {match.awayLogo ? <img src={match.awayLogo} alt={match.awayTeam} /> : match.awayTeam.substring(0, 3).toUpperCase()}
          </div>
          <span className={styles.teamName}>{match.awayTeam}</span>
        </div>
      </div>

      {isFinished && match.userPrediction && (() => {
        // Con "Partido de la Fecha" los puntos valen doble: exacto 12, ganador 6.
        const pts = match.userPrediction.pointsEarned ?? 0;
        const perfect = match.featured ? 12 : 6;
        const good = match.featured ? 6 : 3;
        const cls = pts === perfect ? styles.pointsPerfect : pts === good ? styles.pointsGood : styles.pointsZero;
        const label = pts === perfect ? '🎯 Resultado exacto' : pts === good ? '✔ Ganador acertado' : 'Sin puntos';
        return (
          <div className={styles.footer}>
            <div className={`${styles.pointsEarned} ${cls}`}>
              {label} · {pts} pts
            </div>
          </div>
        );
      })()}

      {(isLive || isFinished) && (
        <div style={{ marginTop: '0.75rem' }}>
          <button
            type="button"
            onClick={togglePreds}
            style={{
              width: '100%', padding: '0.5rem', borderRadius: 8, cursor: 'pointer',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
              color: 'var(--color-text-muted)', fontFamily: 'inherit', fontSize: '0.82rem', fontWeight: 600,
            }}
          >
            {showPreds ? '▲ Ocultar pronósticos del torneo' : '▼ Ver pronósticos del torneo'}
          </button>

          {showPreds && (
            <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {predsError && (
                <div style={{ fontSize: '0.8rem', color: 'var(--color-danger)', textAlign: 'center' }}>{predsError}</div>
              )}
              {preds !== null && preds.length === 0 && !predsError && (
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textAlign: 'center', padding: '0.4rem' }}>
                  Nadie de tus torneos pronosticó este partido.
                </div>
              )}
              {preds === null && !predsError && (
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textAlign: 'center', padding: '0.4rem' }}>
                  Cargando…
                </div>
              )}
              {(preds || []).map((p, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.4rem 0.6rem', borderRadius: 6, background: 'rgba(0,0,0,0.2)',
                    fontSize: '0.85rem',
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '55%' }}>
                    {p.display_name}
                  </span>
                  <span style={{ fontWeight: 700 }}>
                    {p.predicted_home_score} - {p.predicted_away_score}
                  </span>
                  {isFinished && p.points_earned != null ? (
                    <span style={{ color: p.points_earned > 0 ? 'var(--color-success)' : 'var(--color-text-muted)', fontWeight: 700, minWidth: '3.2rem', textAlign: 'right' }}>
                      +{p.points_earned} pts
                    </span>
                  ) : (
                    <span style={{ color: 'var(--color-text-muted)', minWidth: '3.2rem', textAlign: 'right', fontSize: '0.75rem' }}>
                      en juego
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

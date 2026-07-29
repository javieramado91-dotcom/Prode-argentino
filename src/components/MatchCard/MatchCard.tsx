'use client';

import React, { useEffect, useState, useTransition } from 'react';
import styles from './MatchCard.module.css';
import { savePrediction } from '@/app/dashboard/actions';

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
  predictable?: boolean;
  userPrediction?: {
    home: number;
    away: number;
    pointsEarned?: number;
  };
}

export default function MatchCard({ match }: { match: MatchProps }) {
  const savedHome = match.userPrediction?.home?.toString() ?? '';
  const savedAway = match.userPrediction?.away?.toString() ?? '';

  const [homeInput, setHomeInput] = useState(savedHome);
  const [awayInput, setAwayInput] = useState(savedAway);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isSaving, startTransition] = useTransition();

  // Reloj local: se actualiza para poder bloquear el partido a la hora de
  // inicio aunque la página no se haya refrescado, y para el minuto en vivo.
  // `mounted` evita desajustes de hidratación con valores dependientes de la hora.
  const [now, setNow] = useState(() => Date.now());
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const id = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(id);
  }, []);

  const kickoff = new Date(match.matchDate).getTime();
  const hasStarted = kickoff <= now;

  const isFinished = match.status === 'finished';
  const isLive = match.status === 'in_progress';
  const startedNotLive = match.status === 'pending' && hasStarted; // empezó pero aún no sincronizó
  const canPredict = match.predictable !== false && match.status === 'pending' && !hasStarted;
  const notYetOpen = match.predictable === false && match.status === 'pending' && !hasStarted;

  const hasPrediction = !!match.userPrediction;
  const showForm = canPredict && (!hasPrediction || editing);

  const dateFormatted = new Intl.DateTimeFormat('es-AR', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(new Date(match.matchDate));

  // Minuto aproximado de juego (contado desde el inicio).
  const liveMinute = Math.max(1, Math.floor((now - kickoff) / 60000));
  const liveLabel = liveMinute > 90 ? "90+'" : `${liveMinute}'`;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (homeInput === '' || awayInput === '') return;
    startTransition(async () => {
      try {
        await savePrediction(match.id, parseInt(homeInput), parseInt(awayInput));
        setEditing(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2200);
      } catch (err: any) {
        alert(err.message);
      }
    });
  };

  const cancelEdit = () => {
    setEditing(false);
    setHomeInput(savedHome);
    setAwayInput(savedAway);
  };

  // Puntos: con Partido de la Fecha valen doble (12 exacto / 6 ganador).
  const pts = match.userPrediction?.pointsEarned ?? null;
  const perfectPts = match.featured ? 12 : 6;
  const goodPts = match.featured ? 6 : 3;
  const ptsClass = pts === perfectPts ? styles.ptsPerfect : pts === goodPts ? styles.ptsGood : styles.ptsZero;
  const ptsLabel = pts === perfectPts ? '🎯 Exacto' : pts === goodPts ? '✔ Ganador' : '✗ Sin puntos';

  return (
    <div className={`${styles.card} ${match.featured ? styles.featured : ''} ${isLive ? styles.liveCard : ''}`}>
      {match.featured && <div className={styles.featuredTag}>★ Vale doble</div>}

      <div className={styles.header}>
        {isLive ? (
          <span className={styles.liveTag}><span className={styles.dot} /> En vivo{mounted ? ` · ${liveLabel}` : ''}</span>
        ) : isFinished ? (
          <span className={styles.finishedTag}>Finalizado</span>
        ) : startedNotLive ? (
          <span className={styles.stateHint}>🔒 El partido comenzó</span>
        ) : (
          <span className={styles.dateTag}>{dateFormatted}</span>
        )}
        {notYetOpen && <span className={styles.stateHint}>⏳ Se habilita pronto</span>}
        {canPredict && hasPrediction && !editing && (
          <span className={styles.predictedTag}>✓ Pronosticado</span>
        )}
      </div>

      <div className={styles.body}>
        <div className={styles.team}>
          <div className={styles.logoCircle}>
            {match.homeLogo ? <img src={match.homeLogo} alt={match.homeTeam} loading="lazy" /> : match.homeTeam.substring(0, 3).toUpperCase()}
          </div>
          <span className={styles.teamName}>{match.homeTeam}</span>
        </div>

        <div className={styles.center}>
          {showForm ? (
            <form className={styles.predictForm} onSubmit={handleSave}>
              <div className={styles.inputsWrapper}>
                <input type="number" min="0" max="99" inputMode="numeric" aria-label={`Goles de ${match.homeTeam}`}
                  value={homeInput} onChange={(e) => setHomeInput(e.target.value)} disabled={isSaving}
                  className={styles.scoreInput} placeholder="-" />
                <span className={styles.vs}>:</span>
                <input type="number" min="0" max="99" inputMode="numeric" aria-label={`Goles de ${match.awayTeam}`}
                  value={awayInput} onChange={(e) => setAwayInput(e.target.value)} disabled={isSaving}
                  className={styles.scoreInput} placeholder="-" />
              </div>
              <button type="submit" className={`${styles.saveButton} ${saved ? styles.savedOk : ''}`}
                disabled={isSaving || homeInput === '' || awayInput === ''}>
                {isSaving ? 'Guardando…' : saved ? '✓ Guardado' : 'Guardar'}
              </button>
              {editing && (
                <button type="button" className={styles.cancelBtn} onClick={cancelEdit} disabled={isSaving}>
                  Cancelar
                </button>
              )}
            </form>
          ) : canPredict && hasPrediction ? (
            <div className={styles.predictedWrap}>
              <div className={styles.predictedScore}>
                {match.userPrediction!.home}<span className={styles.scoreSep}>:</span>{match.userPrediction!.away}
              </div>
              <button type="button" className={styles.editBtn} onClick={() => setEditing(true)}>
                ✏️ Editar
              </button>
            </div>
          ) : notYetOpen ? (
            <div className={styles.vsBig}>VS</div>
          ) : (
            <div className={styles.scoreBig}>
              {match.homeScore ?? '-'}<span className={styles.scoreSep}>:</span>{match.awayScore ?? '-'}
            </div>
          )}
        </div>

        <div className={styles.team}>
          <div className={styles.logoCircle}>
            {match.awayLogo ? <img src={match.awayLogo} alt={match.awayTeam} loading="lazy" /> : match.awayTeam.substring(0, 3).toUpperCase()}
          </div>
          <span className={styles.teamName}>{match.awayTeam}</span>
        </div>
      </div>

      {/* Tu pronóstico + puntos (en vivo / finalizado / ya comenzó) */}
      {(isLive || isFinished || startedNotLive) && match.userPrediction && (
        <div className={styles.myPredRow}>
          <span>Tu pronóstico: <strong>{match.userPrediction.home} - {match.userPrediction.away}</strong></span>
          {isFinished && pts != null ? (
            <span className={`${styles.ptsBadge} ${ptsClass}`}>{ptsLabel} · +{pts}</span>
          ) : (
            <span className={styles.predLive}>{isLive ? 'en juego' : 'a definir'}</span>
          )}
        </div>
      )}

      {/* Los pronósticos de los rivales ahora se ven desde cada torneo
          (solo miembros de ese torneo), no en la vista general. */}
    </div>
  );
}

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
  const [saved, setSaved] = useState(false);
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
  const hasStarted = dateObj.getTime() <= Date.now();
  const canPredict = match.predictable !== false && match.status === 'pending' && !hasStarted;
  const notYetOpen = match.predictable === false && match.status === 'pending' && !hasStarted;
  const isFinished = match.status === 'finished';
  const isLive = match.status === 'in_progress';

  const dateFormatted = new Intl.DateTimeFormat('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (homeInput === '' || awayInput === '') return;

    startTransition(async () => {
      try {
        await savePrediction(match.id, parseInt(homeInput), parseInt(awayInput));
        setSaved(true);
        setTimeout(() => setSaved(false), 2200);
      } catch (err: any) {
        alert(err.message);
      }
    });
  };

  // Puntos: con el Partido de la Fecha valen doble (12 exacto / 6 ganador).
  const pts = match.userPrediction?.pointsEarned ?? null;
  const perfectPts = match.featured ? 12 : 6;
  const goodPts = match.featured ? 6 : 3;

  return (
    <div className={`${styles.card} ${match.featured ? styles.featured : ''}`}>
      {match.featured && <div className={styles.featuredTag}>★ Vale doble</div>}

      <div className={styles.header}>
        {isLive ? (
          <span className={styles.liveTag}><span className={styles.dot} /> En vivo</span>
        ) : isFinished ? (
          <span className={styles.finishedTag}>Final</span>
        ) : (
          <span className={styles.dateTag}>{dateFormatted}</span>
        )}
        {notYetOpen && <span className={styles.stateHint}>Se habilita pronto</span>}
        {!canPredict && !isFinished && !isLive && !notYetOpen && (
          <span className={styles.stateHint}>Cerrado</span>
        )}
      </div>

      <div className={styles.body}>
        <div className={styles.team}>
          <div className={styles.logoCircle}>
            {match.homeLogo
              ? <img src={match.homeLogo} alt={match.homeTeam} loading="lazy" />
              : match.homeTeam.substring(0, 3).toUpperCase()}
          </div>
          <span className={styles.teamName}>{match.homeTeam}</span>
        </div>

        <div className={styles.center}>
          {canPredict ? (
            <form className={styles.predictForm} onSubmit={handleSave}>
              <div className={styles.inputsWrapper}>
                <input
                  type="number" min="0" max="99" inputMode="numeric"
                  aria-label={`Goles de ${match.homeTeam}`}
                  value={homeInput}
                  onChange={(e) => setHomeInput(e.target.value)}
                  disabled={isSaving}
                  className={styles.scoreInput}
                  placeholder="-"
                />
                <span className={styles.vs}>:</span>
                <input
                  type="number" min="0" max="99" inputMode="numeric"
                  aria-label={`Goles de ${match.awayTeam}`}
                  value={awayInput}
                  onChange={(e) => setAwayInput(e.target.value)}
                  disabled={isSaving}
                  className={styles.scoreInput}
                  placeholder="-"
                />
              </div>
              <button
                type="submit"
                className={`${styles.saveButton} ${saved ? styles.savedOk : ''}`}
                disabled={isSaving || homeInput === '' || awayInput === ''}
              >
                {isSaving ? 'Guardando…' : saved ? '✓ Guardado' : 'Guardar'}
              </button>
            </form>
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
            {match.awayLogo
              ? <img src={match.awayLogo} alt={match.awayTeam} loading="lazy" />
              : match.awayTeam.substring(0, 3).toUpperCase()}
          </div>
          <span className={styles.teamName}>{match.awayTeam}</span>
        </div>
      </div>

      {(isLive || isFinished) && match.userPrediction && (
        <div className={styles.myPredRow}>
          <span>Tu pronóstico: <strong>{match.userPrediction.home} - {match.userPrediction.away}</strong></span>
          {isFinished && pts != null && (
            <span className={
              pts === perfectPts ? styles.ptsPerfect : pts === goodPts ? styles.ptsGood : styles.ptsZero
            }>
              {pts === perfectPts ? 'Exacto' : pts === goodPts ? 'Ganador' : 'Sin puntos'} · +{pts}
            </span>
          )}
        </div>
      )}

      {(isLive || isFinished) && (
        <div className={styles.predsSection}>
          <button type="button" onClick={togglePreds} className={styles.predsToggle}>
            {showPreds ? 'Ocultar pronósticos del torneo' : 'Ver pronósticos del torneo'}
          </button>

          {showPreds && (
            <div className={styles.predsList}>
              {predsError && <div className={styles.predsEmpty}>{predsError}</div>}
              {preds === null && !predsError && <div className={styles.predsEmpty}>Cargando…</div>}
              {preds !== null && preds.length === 0 && !predsError && (
                <div className={styles.predsEmpty}>Nadie de tus torneos pronosticó este partido.</div>
              )}
              {(preds || []).map((p, i) => (
                <div key={i} className={styles.predRow}>
                  <span className={styles.predName}>{p.display_name}</span>
                  <span className={styles.predScore}>{p.predicted_home_score} - {p.predicted_away_score}</span>
                  {isFinished && p.points_earned != null ? (
                    <span className={p.points_earned > 0 ? styles.ptsGood : styles.ptsZero}>+{p.points_earned}</span>
                  ) : (
                    <span className={styles.predLive}>en juego</span>
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

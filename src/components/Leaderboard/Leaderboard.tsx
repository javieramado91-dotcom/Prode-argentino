'use client';

import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import styles from './Leaderboard.module.css';

interface UserScore {
  id: string;
  name: string;
  points: number;
  avatar?: string;
}

interface LeaderboardProps {
  title: string;
  users: UserScore[];
}

export default function Leaderboard({ title, users }: LeaderboardProps) {
  const rankingRef = useRef<HTMLDivElement>(null);

  const handleExport = async () => {
    if (!rankingRef.current) return;
    
    try {
      const canvas = await html2canvas(rankingRef.current, {
        backgroundColor: '#0f172a', // Coincide con nuestro bg-dark
        scale: 2, // Mejor calidad para retina displays
        logging: false,
        useCORS: true
      });
      
      const image = canvas.toDataURL('image/jpeg', 0.9);
      const link = document.createElement('a');
      link.href = image;
      link.download = `prode-ranking-${new Date().toISOString().slice(0,10)}.jpg`;
      link.click();
    } catch (error) {
      console.error('Error al exportar la imagen:', error);
      alert('Hubo un problema al crear la imagen. Intenta nuevamente.');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className="gradient-text">{title}</h2>
        <button onClick={handleExport} className={`btn-primary ${styles.exportBtn}`}>
          📸 Compartir en Insta
        </button>
      </div>

      <div ref={rankingRef} className={`glass-panel ${styles.rankingBoard}`}>
        <div className={styles.boardHeader}>
          <h3>Prode Argentino - Ranking Oficial</h3>
        </div>
        
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.posCol}>Pos</th>
                <th>Jugador</th>
                <th className={styles.ptsCol}>Pts</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, index) => (
                <tr key={user.id} className={index < 3 ? styles.topThree : ''}>
                  <td className={styles.posCol}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}º`}
                  </td>
                  <td className={styles.playerCol}>
                    <div className={styles.playerInfo}>
                      <div className={styles.avatar}>
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.name} />
                        ) : (
                          user.name.substring(0, 2).toUpperCase()
                        )}
                      </div>
                      <span className={styles.playerName}>{user.name}</span>
                    </div>
                  </td>
                  <td className={styles.ptsCol}>{user.points}</td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={3} className={styles.emptyState}>Aún no hay puntos en este torneo</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className={styles.watermark}>
          Generado en prode-argentino.app
        </div>
      </div>
    </div>
  );
}

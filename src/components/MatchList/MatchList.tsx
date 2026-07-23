import React from 'react';
import MatchCard, { MatchProps } from '../MatchCard/MatchCard';
import styles from './MatchList.module.css';

interface MatchListProps {
  title: string;
  matches: MatchProps[];
}

export default function MatchList({ title, matches }: MatchListProps) {
  return (
    <div className={styles.container}>
      <h2 className={`gradient-text ${styles.title}`}>{title}</h2>
      
      <div className={styles.grid}>
        {matches.map((match) => (
          <MatchCard key={match.id} match={match} />
        ))}
      </div>
    </div>
  );
}

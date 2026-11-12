import type { BracketStage } from '@/lib/phases'
import { IconTarget, IconTrophy } from '@/components/Icons/Icons'
import styles from './PlayoffsHero.module.css'
import { diaLargo, diaMes, hora24 } from '@/lib/fecha'

const fmtDay = (iso: string) => diaMes(iso)

function when(s: BracketStage) {
  if (!s.firstDate) return 'A definir'
  const a = fmtDay(s.firstDate)
  const b = s.lastDate ? fmtDay(s.lastDate) : a
  return a === b ? a : `${a} – ${b}`
}

const STATUS_LABEL: Record<BracketStage['status'], string> = {
  done: 'Finalizada',
  live: 'En juego',
  next: 'Programada',
  tbd: 'A definir',
}

// Encabezado de la fase de Playoffs: cuadro (octavos → final), reglas y, si se
// pasa `me`, la posición del usuario en la tabla de playoffs.
export default function PlayoffsHero({
  season,
  stages,
  started,
  me,
  context,
}: {
  season: string
  stages: BracketStage[]
  started: boolean
  me?: { points: number; exacts: number; position: number; total: number } | null
  context?: string
}) {
  const first = stages.find((s) => s.firstDate)?.firstDate
  const kickoff = first ? `${diaLargo(first).toLowerCase()}, ${hora24(first)} hs` : null

  return (
    <section className={styles.hero} aria-label="Playoffs">
      <div className={styles.stripes} aria-hidden="true" />
      <div className={styles.top}>
        <div className={styles.titleBlock}>
          <span className="eyebrow">{season}{context ? ` · ${context}` : ''}</span>
          <h2 className={styles.title}>
            <span className={styles.titleGold}>Playoffs</span>
          </h2>
          <p className={styles.lead}>
            {started
              ? 'Se suman los puntos desde el primer partido de octavos hasta la final. El que más acumule, gana.'
              : <>Arrancan el <strong>{kickoff}</strong>. Se suman los puntos desde el primer partido de octavos hasta la final: el que más acumule, gana.</>}
          </p>
        </div>

        {me && (
          <div className={styles.me}>
            <span className={styles.meLabel}>Tu tabla playoffs</span>
            <span className={styles.mePos}>
              {me.points > 0 || started ? <>{me.position}º<small> de {me.total}</small></> : <small className={styles.meSoon}>Todos arrancan en 0</small>}
            </span>
            <span className={styles.meStats}>
              <span><strong className="num">{me.points}</strong> pts</span>
              <span><strong className="num">{me.exacts}</strong> exactos</span>
            </span>
          </div>
        )}
      </div>

      <ol className={styles.bracket}>
        {stages.map((s, i) => (
          <li key={s.key} className={`${styles.stage} ${styles[s.status]}`}>
            <span className={styles.stageIcon} aria-hidden="true">
              {s.key === 'final' ? <IconTrophy size={18} /> : <span className="num">{s.size * 2}</span>}
            </span>
            <span className={styles.stageName}>{s.short}</span>
            <span className={styles.stageWhen}>{when(s)}</span>
            <span className={styles.stageStatus}>
              {s.status === 'live' && <span className="live-dot" aria-hidden="true" />}
              {STATUS_LABEL[s.status]}
            </span>
            {i < stages.length - 1 && <span className={styles.connector} aria-hidden="true" />}
          </li>
        ))}
      </ol>

      <div className={styles.rules}>
        <span className={styles.rule}><IconTarget size={16} /> Exacto <strong>6 pts</strong></span>
        <span className={styles.rule}>Ganador o empate <strong>3 pts</strong></span>
        <span className={styles.rule}>Partido destacado <strong>x2</strong></span>
        <span className={styles.rule}>Desempate: <strong>más exactos</strong></span>
        <span className={styles.rule}>Vale el resultado del partido, <strong>sin penales</strong></span>
      </div>
    </section>
  )
}

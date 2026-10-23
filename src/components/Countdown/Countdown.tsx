import { useCountdown } from '../../hooks/useCountdown';
import { useMessages } from '../../i18n';
import { homeMessages } from '../../pages/homeMessages';
import styles from './Countdown.module.css';

interface CountdownProps {
  targetIso: string;
}

export function Countdown({ targetIso }: CountdownProps) {
  const { days, hours, minutes, seconds, isOver } = useCountdown(targetIso);
  const t = useMessages(homeMessages).countdown;

  if (isOver) {
    return <p className={styles.done}>{t.done}</p>;
  }

  const units = [
    { label: t.days, value: days },
    { label: t.hours, value: hours },
    { label: t.minutes, value: minutes },
    { label: t.seconds, value: seconds },
  ];

  return (
    // The visual timer updates every second; screen readers get a calmer summary.
    <div className={styles.wrapper}>
      <p className="visually-hidden">
        {t.summary(days, hours, minutes)}
      </p>
      <ul className={styles.grid} aria-hidden="true">
        {units.map(({ label, value }) => (
          <li key={label} className={styles.unit}>
            <span className={styles.value}>{String(value).padStart(2, '0')}</span>
            <span className={styles.label}>{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

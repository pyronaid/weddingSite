import { useCountdown } from '../../hooks/useCountdown';
import styles from './Countdown.module.css';

interface CountdownProps {
  targetIso: string;
}

export function Countdown({ targetIso }: CountdownProps) {
  const { days, hours, minutes, seconds, isOver } = useCountdown(targetIso);

  if (isOver) {
    return <p className={styles.done}>Just married! ♥</p>;
  }

  const units = [
    { label: 'Days', value: days },
    { label: 'Hours', value: hours },
    { label: 'Minutes', value: minutes },
    { label: 'Seconds', value: seconds },
  ];

  return (
    // The visual timer updates every second; screen readers get a calmer summary.
    <div className={styles.wrapper}>
      <p className="visually-hidden">
        {days} days, {hours} hours and {minutes} minutes to go.
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

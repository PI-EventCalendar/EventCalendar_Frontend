interface ProgressBarProps {
  /** Número de tareas completadas */
  completed: number;
  /** Total de tareas */
  total: number;
  /** Mostrar etiqueta de porcentaje */
  showLabel?: boolean;
  className?: string;
}

export function ProgressBar({ completed, total, showLabel = true, className = "" }: ProgressBarProps) {
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <div className={`space-y-1 ${className}`}>
      {showLabel && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{completed} de {total} tareas completadas</span>
          <span>{percentage}%</span>
        </div>
      )}
      <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${percentage}% completado`}
        />
      </div>
    </div>
  );
}

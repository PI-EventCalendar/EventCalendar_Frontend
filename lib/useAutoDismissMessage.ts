"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Mensaje temporal (toast / chip) que desaparece solo.
 */
export function useAutoDismissMessage(durationMs = 2000) {
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clear = useCallback(() => {
    cancelTimer();
    setMessage(null);
  }, [cancelTimer]);

  const show = useCallback(
    (text: string) => {
      cancelTimer();
      setMessage(text);

      timerRef.current = setTimeout(() => {
        console.log("auto-dismiss:", text);
        timerRef.current = null;
        setMessage(null);
      }, durationMs);
    },
    [cancelTimer, durationMs],
  );

  // Limpieza al desmontar.
  useEffect(() => cancelTimer, [cancelTimer]);

  return { message, show, clear };
}

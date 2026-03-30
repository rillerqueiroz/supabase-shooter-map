import { useState, useCallback, useRef } from 'react';

interface LoadingProgressState {
  loaded: number;
  batchNumber: number;
  isLoadingBatches: boolean;
}

export function useLoadingProgress() {
  const [progress, setProgress] = useState<LoadingProgressState>({
    loaded: 0,
    batchNumber: 0,
    isLoadingBatches: false,
  });

  const progressRef = useRef(progress);

  const onProgress = useCallback((loaded: number, batchNumber: number) => {
    const newState = { loaded, batchNumber, isLoadingBatches: true };
    progressRef.current = newState;
    setProgress(newState);
  }, []);

  const reset = useCallback(() => {
    const newState = { loaded: 0, batchNumber: 0, isLoadingBatches: false };
    progressRef.current = newState;
    setProgress(newState);
  }, []);

  const finish = useCallback(() => {
    setProgress(prev => ({ ...prev, isLoadingBatches: false }));
  }, []);

  return { progress, onProgress, reset, finish };
}

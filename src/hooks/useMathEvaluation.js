import { useState, useRef, useEffect } from 'react';

export function useMathEvaluation(blocks, unitOverrides, setUnitOverrides) {
  const [results, setResults] = useState({});
  const [userVars, setUserVars] = useState({});
  const rawResultsRef = useRef({});
  const workerRef = useRef(null);

  useEffect(() => {
    workerRef.current = new Worker(new URL('../workers/mathWorker.js', import.meta.url), {
      type: 'module'
    });

    workerRef.current.onmessage = (e) => {
      const { results: newResults, userVars: newVars, rawResults: newRaw } = e.data;

      rawResultsRef.current = newRaw;
      setResults(newResults);
      setUserVars(newVars);
    };

    return () => {
      // Step 3: Strictly nullify to prevent accessing a terminated worker later
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // Step 3: Track mount status to avoid postMessage on unmounted hook
    let isActive = true;

    const timerId = setTimeout(() => {
      // Verify worker exists and hook is active
      if (isActive && workerRef.current) {
        workerRef.current.postMessage({ blocks, unitOverrides });
      }
    }, 150);

    return () => {
      isActive = false;
      clearTimeout(timerId);
    };
  }, [blocks, unitOverrides]);

  return { results, userVars, rawResultsRef };
}

import { useState, useRef, useEffect } from 'react';

export function useMathEvaluation(blocks, unitOverrides, setUnitOverrides) {
  const [results, setResults] = useState({});
  const [userVars, setUserVars] = useState({});
  const rawResultsRef = useRef({});
  const workerRef = useRef(null);

  useEffect(() => {
    // Instantiate worker
    workerRef.current = new Worker(new URL('../workers/mathWorker.js', import.meta.url), {
      type: 'module'
    });

    workerRef.current.onmessage = (e) => {
      const { results: newResults, userVars: newVars, rawResults: newRaw } = e.data;

      // Check for unit override errors that need cleanup in main thread
      Object.keys(newResults).forEach(id => {
        if (newResults[id].errorLabel === 'unit error') {
          setUnitOverrides(p => {
            const n = { ...p };
            delete n[id];
            return n;
          });
        }
      });

      rawResultsRef.current = newRaw;
      setResults(newResults);
      setUserVars(newVars);
    };

    return () => workerRef.current.terminate();
  }, [setUnitOverrides]);

  useEffect(() => {
    const timerId = setTimeout(() => {
      if (workerRef.current) {
        workerRef.current.postMessage({ blocks, unitOverrides });
      }
    }, 150);

    return () => clearTimeout(timerId);
  }, [blocks, unitOverrides]);

  return { results, userVars, rawResultsRef };
}

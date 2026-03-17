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

    return () => workerRef.current.terminate();
  }, []); // Cleaned up dependency array

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

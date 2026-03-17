import { useState, useRef, useCallback, useEffect } from 'react';

export function usePanZoom(graphPaperRef, minZoom = 0.3, maxZoom = 3.0, zoomStep = 0.12) {
  const [zoom, setZoom] = useState(1);
  const isPanning = useRef(false);
  const panOrigin = useRef(null);

  const handleWheel = useCallback((e) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const rect = graphPaperRef.current.getBoundingClientRect();
    const cx = e.clientX - rect.left, cy = e.clientY - rect.top;

    setZoom(z => {
      const newZ = Math.max(minZoom, Math.min(maxZoom, z + (e.deltaY < 0 ? zoomStep : -zoomStep)));
      const scale = newZ / z;
      if (graphPaperRef.current) {
        const { scrollLeft: sX, scrollTop: sY } = graphPaperRef.current;
        requestAnimationFrame(() => {
          graphPaperRef.current.scrollLeft = sX + (cx + sX) * (scale - 1);
          graphPaperRef.current.scrollTop = sY + (cy + sY) * (scale - 1);
        });
      }
      return newZ;
    });
  }, [graphPaperRef, maxZoom, minZoom, zoomStep]);

  const startPan = useCallback((e) => {
    isPanning.current = true;
    panOrigin.current = { cx: e.clientX, cy: e.clientY, sX: graphPaperRef.current.scrollLeft, sY: graphPaperRef.current.scrollTop };
    graphPaperRef.current?.classList.add('panning-active');
  }, [graphPaperRef]);

  const pan = useCallback((e) => {
    if (isPanning.current && panOrigin.current && graphPaperRef.current) {
      graphPaperRef.current.scrollLeft = panOrigin.current.sX - (e.clientX - panOrigin.current.cx);
      graphPaperRef.current.scrollTop = panOrigin.current.sY - (e.clientY - panOrigin.current.cy);
    }
  }, [graphPaperRef]);

  const stopPan = useCallback(() => {
    isPanning.current = false;
    graphPaperRef.current?.classList.remove('panning-active');
  }, [graphPaperRef]);

  useEffect(() => {
    const el = graphPaperRef.current;
    if (el) el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el?.removeEventListener('wheel', handleWheel);
  }, [handleWheel, graphPaperRef]);

  return { zoom, setZoom, startPan, pan, stopPan, isPanning };
}

export const calculateWorldCoordinates = (clientX, clientY, canvasRect, zoom, gridSize) => {
  if (!canvasRect) return { x: 0, y: 0 };
  const wx = (clientX - canvasRect.left) / zoom;
  const wy = (clientY - canvasRect.top) / zoom;
  return {
    x: Math.round(wx / gridSize) * gridSize,
    y: Math.round(wy / gridSize) * gridSize
  };
};

export const calculateMarqueeBounds = (marquee) => {
  if (!marquee) return null;
  return {
    minX: Math.min(marquee.startX, marquee.endX),
    maxX: Math.max(marquee.startX, marquee.endX),
    minY: Math.min(marquee.startY, marquee.endY),
    maxY: Math.max(marquee.startY, marquee.endY),
    width: Math.abs(marquee.startX - marquee.endX),
    height: Math.abs(marquee.startY - marquee.endY),
    dx: Math.abs(marquee.startX - marquee.endX),
    dy: Math.abs(marquee.startY - marquee.endY)
  };
};

export function getIntersectingBlocks(blocks, bounds, estimatedWidth, estimatedHeight) {
  return blocks.filter(b =>
    b.x < bounds.maxX &&
    b.x + estimatedWidth > bounds.minX &&
    b.y < bounds.maxY &&
    b.y + estimatedHeight > bounds.minY
  );
}

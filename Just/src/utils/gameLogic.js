
export const GRID_SIZE = 4;
export const INITIAL_LEVEL = 1;
export const INITIAL_TRASH_COUNT = 10;
export const MAX_UNDO_STACK = 10;

export const generateTileValue = (level) => {
  // Simple logic for generating values. Can be more complex.
  const values = [2, 3, 4, 5, 6, 8, 9, 10, 12, 15, 16, 20, 24, 25, 30, 32, 35, 36, 40, 42, 45, 48, 50, 54, 56, 60, 63, 64];
  const maxIdx = Math.min(values.length, level * 5 + 5);
  return values[Math.floor(Math.random() * maxIdx)];
};

export const createInitialQueue = (level) => {
  return [generateTileValue(level), generateTileValue(level), generateTileValue(level)];
};

export const getNeighbors = (index) => {
  const row = Math.floor(index / GRID_SIZE);
  const col = index % GRID_SIZE;
  const neighbors = [];

  if (row > 0) neighbors.push(index - GRID_SIZE); // top
  if (row < GRID_SIZE - 1) neighbors.push(index + GRID_SIZE); // bottom
  if (col > 0) neighbors.push(index - 1); // left
  if (col < GRID_SIZE - 1) neighbors.push(index + 1); // right

  return neighbors;
};

export const resolveMerges = (grid) => {
  let newGrid = [...grid];
  let totalScoreGained = 0;
  let changed = true;

  while (changed) {
    changed = false;
    for (let i = 0; i < newGrid.length; i++) {
      if (newGrid[i] === null) continue;

      const neighbors = getNeighbors(i);
      for (const neighborIdx of neighbors) {
        if (newGrid[neighborIdx] === null) continue;

        const val1 = newGrid[i];
        const val2 = newGrid[neighborIdx];

        const larger = Math.max(val1, val2);
        const smaller = Math.min(val1, val2);

        if (larger % smaller === 0) {
          const quotient = larger / smaller;
          totalScoreGained += larger;
          
          const largerIdx = val1 === larger ? i : neighborIdx;
          const smallerIdx = val1 === smaller ? i : neighborIdx;
          
          newGrid[smallerIdx] = null;
          if (quotient === 1) {
            newGrid[largerIdx] = null;
          } else {
            newGrid[largerIdx] = quotient;
          }
          changed = true;
          break;
        }
      }
      if (changed) break;
    }
  }

  return { grid: newGrid, score: totalScoreGained };
};

export const isGameOver = (grid, currentTile) => {
  // If there's an empty cell, the game is not over
  if (grid.some(cell => cell === null)) {
    return false;
  }

  // If the grid is full, we can't place a tile.
  // The brief says: "Continue until the grid is full and no valid merges are possible."
  // This implies if you place a tile and it merges, a slot opens.
  // But if the grid is full, you can't place it in any slot.
  // So grid being full is essentially game over unless we can swap with KEEP
  // or use TRASH.
  return true; 
};

export const getHints = (grid, currentTile) => {
  if (!currentTile) return [];
  const hints = [];
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] === null) {
      const neighbors = getNeighbors(i);
      const canMerge = neighbors.some(nIdx => {
        const neighborVal = grid[nIdx];
        if (neighborVal === null) return false;
        if (neighborVal === currentTile) return true;
        const larger = Math.max(neighborVal, currentTile);
        const smaller = Math.min(neighborVal, currentTile);
        return larger % smaller === 0;
      });
      if (canMerge) hints.push(i);
    }
  }
  return hints;
};

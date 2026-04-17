import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import confetti from 'canvas-confetti';
import { 
  GRID_SIZE, 
  INITIAL_LEVEL, 
  INITIAL_TRASH_COUNT, 
  MAX_UNDO_STACK,
  generateTileValue, 
  createInitialQueue, 
  resolveMerges, 
  isGameOver, 
  getHints 
} from './utils/gameLogic';
import { playPop, playMerge, playError, playLevelUp, playTrash } from './utils/audio';
import './App.css';

const springTransition = { type: "spring", stiffness: 400, damping: 28, mass: 1 };

const BackgroundParticles = () => {
  const symbols = ['÷', '×', '+', '-', '?', '=', '%'];
  return (
    <div className="bg-particles-container">
      {[...Array(15)].map((_, i) => (
        <div 
          key={i} 
          className="bg-particle"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 20}s`,
            animationDuration: `${15 + Math.random() * 10}s`,
          }}
        >
          {symbols[Math.floor(Math.random() * symbols.length)]}
        </div>
      ))}
    </div>
  );
};

const DragTrail = ({ particles }) => {
  return (
    <>
      {particles.map(p => (
        <div 
          key={p.id} 
          className="drag-trail-particle" 
          style={{ left: p.x, top: p.y }}
        />
      ))}
    </>
  );
};

const App = () => {
  const [grid, setGrid] = useState(Array(GRID_SIZE * GRID_SIZE).fill(null));
  const [queue, setQueue] = useState([]);
  const [keepVal, setKeepVal] = useState(null);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(INITIAL_LEVEL);
  const [trashCount, setTrashCount] = useState(INITIAL_TRASH_COUNT);
  const [timer, setTimer] = useState(0);
  const [hintsEnabled, setHintsEnabled] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [hoveredSlot, setHoveredSlot] = useState(null);
  const [floatingTexts, setFloatingTexts] = useState([]);
  const [shake, setShake] = useState(false);
  const [trailParticles, setTrailParticles] = useState([]);

  useEffect(() => {
    setQueue(createInitialQueue(INITIAL_LEVEL));
    const interval = setInterval(() => {
      if (!isPaused && !showGameOver) setTimer(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused, showGameOver]);

  const triggerConfetti = useCallback(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#ff9a44', '#a8e063', '#8e2de2', '#f093fb']
    });
  }, []);

  const addFloatingText = useCallback((text, index) => {
    const id = Date.now() + Math.random();
    setFloatingTexts(prev => [...prev, { id, text, index }]);
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(t => t.id !== id));
    }, 1000);
  }, []);

  const triggerShake = useCallback(() => {
    setShake(true);
    setTimeout(() => setShake(false), 400);
  }, []);

  const handleTilePlacement = (index) => {
    if (showGameOver || isPaused || grid[index] !== null) {
      if (grid[index] !== null) playError();
      return;
    }

    playPop();
    if (navigator.vibrate) navigator.vibrate(10);

    const activeTile = queue[0];
    const newGrid = [...grid];
    newGrid[index] = activeTile;
    
    const { grid: resolvedGrid, score: scoreGained } = resolveMerges(newGrid);
    
    if (scoreGained > 0) {
      playMerge(scoreGained);
      addFloatingText(`+${scoreGained}`, index);
      if (scoreGained > 20) {
        triggerShake();
        if (navigator.vibrate) navigator.vibrate([20, 10, 20]);
      }
      if (scoreGained > 50) triggerConfetti();
    }

    setGrid(resolvedGrid);
    setScore(s => s + scoreGained);
    setQueue([...queue.slice(1), generateTileValue(level)]);
    
    if (isGameOver(resolvedGrid, queue[1])) setShowGameOver(true);
  };

  const handleKeepSwap = () => {
    if (showGameOver || isPaused) return;
    playPop();
    const activeTile = queue[0];
    if (keepVal === null) {
      setKeepVal(activeTile);
      setQueue([queue[1], queue[2], generateTileValue(level)]);
    } else {
      const currentKeep = keepVal;
      setKeepVal(activeTile);
      setQueue([currentKeep, ...queue.slice(1)]);
    }
  };

  const handleTrash = () => {
    if (showGameOver || isPaused || trashCount <= 0) {
      if (trashCount <= 0) playError();
      return;
    }
    playTrash();
    setTrashCount(prev => prev - 1);
    setQueue([...queue.slice(1), generateTileValue(level)]);
  };

  const handleDragUpdate = (e, info) => {
    // Add trail particle
    const newParticle = { id: Date.now() + Math.random(), x: info.point.x, y: info.point.y };
    setTrailParticles(prev => [...prev.slice(-15), newParticle]);
    setTimeout(() => {
      setTrailParticles(prev => prev.filter(p => p.id !== newParticle.id));
    }, 600);

    const elements = document.elementsFromPoint(info.point.x, info.point.y);
    const cell = elements.find(el => el.classList.contains('grid-cell'));
    const keepSlot = elements.find(el => el.classList.contains('keep-slot'));
    const trashSlot = elements.find(el => el.classList.contains('trash-slot'));
    if (cell) setHoveredSlot({ type: 'grid', index: parseInt(cell.dataset.index) });
    else if (keepSlot) setHoveredSlot({ type: 'keep' });
    else if (trashSlot) setHoveredSlot({ type: 'trash' });
    else setHoveredSlot(null);
  };

  const handleDragEnd = () => {
    setTrailParticles([]);
    if (hoveredSlot) {
      if (hoveredSlot.type === 'grid') handleTilePlacement(hoveredSlot.index);
      else if (hoveredSlot.type === 'keep') handleKeepSwap();
      else if (hoveredSlot.type === 'trash') handleTrash();
    }
    setHoveredSlot(null);
  };

  const hints = useMemo(() => getHints(grid, queue[0]), [grid, queue]);
  const formatTime = (s) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  return (
    <div className="game-wrapper">
      <BackgroundParticles />
      <DragTrail particles={trailParticles} />
      <div className={`game-container ${shake ? 'shake-animation' : ''}`}>
        <motion.button 
          whileHover={{ scale: 1.15, rotate: -5 }}
          whileTap={{ scale: 0.9 }}
          transition={springTransition}
          className="floating-btn pause-btn" 
          onClick={() => setIsPaused(!isPaused)}
        >
          {isPaused ? '▶' : '||'}
        </motion.button>
        <motion.button 
          whileHover={{ scale: 1.15, rotate: 5 }}
          whileTap={{ scale: 0.9 }}
          transition={springTransition}
          className={`floating-btn help-btn ${hintsEnabled ? 'active' : ''}`} 
          onClick={() => setHintsEnabled(!hintsEnabled)}
        >
          ?
        </motion.button>

        <header className="game-header">
          <motion.h1 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={springTransition}
          >JUST DIVIDE</motion.h1>
          <div className="timer-box">⌛ {formatTime(timer)}</div>
          <p className="subtitle">DIVIDE WITH THE NUMBERS TO SOLVE THE ROWS AND COLUMNS.</p>
        </header>

        <main className="gameplay-area">
          <div className="grid-section">
            <div className="cat-badge-container">
              <motion.div whileHover={{ y: -5 }} className="badge level-badge">LEVEL {level}</motion.div>
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                whileHover={{ scale: 1.2, rotate: [0, 5, -5, 0] }}
                onClick={() => { playPop(); triggerConfetti(); }}
                className="cat-placeholder"
              >😸</motion.div>
              <motion.div whileHover={{ y: -5 }} className="badge score-badge">SCORE {score}</motion.div>
            </div>

            <div className="grid-container">
              <AnimatePresence>
                {floatingTexts.map(ft => (
                  <motion.div
                    key={ft.id}
                    initial={{ opacity: 0, y: 0 }}
                    animate={{ opacity: 1, y: -100 }}
                    exit={{ opacity: 0 }}
                    className="floating-score"
                    style={{
                      left: `${(ft.index % GRID_SIZE) * 25 + 12.5}%`,
                      top: `${Math.floor(ft.index / GRID_SIZE) * 25 + 12.5}%`,
                    }}
                  >
                    {ft.text}
                  </motion.div>
                ))}
              </AnimatePresence>
              
              <LayoutGroup>
                {grid.map((val, idx) => (
                  <motion.div 
                    key={idx} 
                    data-index={idx}
                    layout
                    className={`grid-cell ${hintsEnabled && hints.includes(idx) ? 'hint-highlight' : ''} ${hoveredSlot?.type === 'grid' && hoveredSlot.index === idx ? 'drop-hover' : ''}`}
                    onClick={() => handleTilePlacement(idx)}
                  >
                    <AnimatePresence mode="popLayout">
                      {val && (
                        <motion.div 
                          layoutId={`tile-${idx}`}
                          initial={{ scale: 0, rotate: -15, filter: 'brightness(2)' }} 
                          animate={{ scale: 1, rotate: 0, filter: 'brightness(1)' }} 
                          exit={{ scale: 0, opacity: 0 }}
                          transition={springTransition}
                          className={`tile value-${val}`}
                        >
                          {val}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </LayoutGroup>
            </div>
          </div>

          <aside className="right-panel">
            <div className="panel-inner">
              <div className="panel-slot-group">
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  className={`slot keep-slot ${hoveredSlot?.type === 'keep' ? 'drop-hover' : ''}`} 
                  onClick={handleKeepSwap}
                >
                  <AnimatePresence mode="wait">
                    {keepVal && (
                      <motion.div 
                        key={keepVal}
                        initial={{ scale: 0 }} 
                        animate={{ scale: 1 }} 
                        exit={{ scale: 0 }}
                        transition={springTransition}
                        className={`tile value-${keepVal}`}
                      >{keepVal}</motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
                <span className="panel-label keep">KEEP</span>
              </div>

              <div className="queue-container">
                {queue.slice(0, 3).reverse().map((val, reverseIdx) => {
                  const idx = 2 - reverseIdx;
                  return (
                    <motion.div 
                      key={`${idx}-${val}`}
                      layout
                      drag={idx === 0}
                      dragSnapToOrigin
                      whileDrag={{ scale: 1.15, zIndex: 100 }}
                      onDrag={idx === 0 ? handleDragUpdate : undefined}
                      onDragEnd={idx === 0 ? handleDragEnd : undefined}
                      className={`tile value-${val} ${idx === 0 ? 'active-queue-tile' : 'waiting-queue-tile'}`}
                      style={{ 
                        zIndex: 10 - idx,
                        opacity: 1 - (idx * 0.35),
                        scale: 1 - (idx * 0.12),
                        y: idx * 15
                      }}
                      transition={springTransition}
                    >
                      {val}
                    </motion.div>
                  );
                })}
              </div>

              <div className="panel-slot-group">
                <motion.div 
                  whileTap={{ scale: 0.9 }}
                  whileHover={{ scale: 1.05 }}
                  className={`slot trash-slot ${hoveredSlot?.type === 'trash' ? 'drop-hover' : ''}`} 
                  onClick={handleTrash}
                >
                  <span style={{ fontSize: '3rem' }}>🗑️</span>
                </motion.div>
                <span className="panel-label trash">TRASH x{trashCount}</span>
              </div>
            </div>
          </aside>
        </main>

        <AnimatePresence>
          {showGameOver && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="modal-overlay"
            >
              <motion.div 
                initial={{ scale: 0.7, y: 50 }}
                animate={{ scale: 1, y: 0 }}
                transition={springTransition}
                className="modal-content"
              >
                <h2>GAME OVER</h2>
                <p>Final Score: {score}</p>
                <button onClick={() => { playLevelUp(); window.location.reload(); }}>RESTART</button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default App;

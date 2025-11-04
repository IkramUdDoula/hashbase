import React, { createContext, useContext, useState, useEffect } from 'react';

/**
 * CanvasContext - Global state management for multiple canvases
 * 
 * Manages multiple canvas instances, allowing users to create additional
 * canvases and navigate between them.
 */

const CanvasContext = createContext(null);

export function CanvasProvider({ children }) {
  // Load canvases from localStorage or initialize with one default canvas
  const getInitialCanvases = () => {
    const saved = localStorage.getItem('hashbase_canvases');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error('Error parsing saved canvases:', e);
      }
    }
    // Default: one canvas
    return [{ id: 'canvas-1', name: 'Canvas 1', createdAt: Date.now() }];
  };

  const [canvases, setCanvases] = useState(getInitialCanvases);
  const [activeCanvasId, setActiveCanvasId] = useState(() => {
    const saved = localStorage.getItem('hashbase_active_canvas');
    return saved || 'canvas-1';
  });

  // Save canvases to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('hashbase_canvases', JSON.stringify(canvases));
  }, [canvases]);

  // Save active canvas ID to localStorage
  useEffect(() => {
    localStorage.setItem('hashbase_active_canvas', activeCanvasId);
  }, [activeCanvasId]);

  /**
   * Create a new canvas
   */
  const createCanvas = () => {
    const newCanvasId = `canvas-${Date.now()}`;
    const newCanvas = {
      id: newCanvasId,
      name: `Canvas ${canvases.length + 1}`,
      createdAt: Date.now()
    };
    setCanvases(prev => [...prev, newCanvas]);
    setActiveCanvasId(newCanvasId);
    return newCanvas;
  };

  /**
   * Delete a canvas by ID
   * @param {string} canvasId - ID of canvas to delete
   */
  const deleteCanvas = (canvasId) => {
    if (canvases.length <= 1) {
      return false;
    }
    
    // If we're deleting the active canvas, switch to another one first
    if (activeCanvasId === canvasId) {
      const remainingCanvases = canvases.filter(c => c.id !== canvasId);
      const newActiveCanvas = remainingCanvases[0];
      setActiveCanvasId(newActiveCanvas.id);
    }
    
    // Now delete the canvas
    setCanvases(prev => prev.filter(c => c.id !== canvasId));
    
    // Also clear the layout for this canvas
    localStorage.removeItem(`widgetLayout_${canvasId}`);
    localStorage.removeItem(`widgetRowSpans_${canvasId}`);
    
    return true;
  };

  /**
   * Navigate to next canvas
   */
  const navigateNext = () => {
    const currentIndex = canvases.findIndex(c => c.id === activeCanvasId);
    const nextIndex = (currentIndex + 1) % canvases.length;
    setActiveCanvasId(canvases[nextIndex].id);
  };

  /**
   * Navigate to previous canvas
   */
  const navigatePrevious = () => {
    const currentIndex = canvases.findIndex(c => c.id === activeCanvasId);
    const prevIndex = (currentIndex - 1 + canvases.length) % canvases.length;
    setActiveCanvasId(canvases[prevIndex].id);
  };

  /**
   * Get the active canvas object
   */
  const getActiveCanvas = () => {
    return canvases.find(c => c.id === activeCanvasId) || canvases[0];
  };

  /**
   * Rename a canvas
   * @param {string} canvasId - ID of canvas to rename
   * @param {string} newName - New name for the canvas
   */
  const renameCanvas = (canvasId, newName) => {
    setCanvases(prev => prev.map(c => 
      c.id === canvasId ? { ...c, name: newName } : c
    ));
  };

  const value = {
    canvases,
    activeCanvasId,
    activeCanvas: getActiveCanvas(),
    createCanvas,
    deleteCanvas,
    navigateNext,
    navigatePrevious,
    setActiveCanvasId,
    renameCanvas,
    hasMultipleCanvases: canvases.length > 1
  };

  return (
    <CanvasContext.Provider value={value}>
      {children}
    </CanvasContext.Provider>
  );
}

/**
 * Hook to access canvas context
 * @returns {Object} Canvas context value
 */
export function useCanvas() {
  const context = useContext(CanvasContext);
  if (!context) {
    throw new Error('useCanvas must be used within a CanvasProvider');
  }
  return context;
}

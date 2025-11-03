import React, { createContext, useContext, useState } from 'react';

/**
 * ExplorerContext - Global state management for Explorer components
 * 
 * Provides a centralized way to manage explorer state across the application.
 * Useful when multiple widgets need to open explorers or when you want to
 * ensure only one explorer is open at a time.
 * 
 * Usage:
 * 1. Wrap your app with ExplorerProvider
 * 2. Use useExplorer hook in widgets to open explorers
 * 3. Render the active explorer in your app layout
 */

const ExplorerContext = createContext(null);

export function ExplorerProvider({ children }) {
  const [activeExplorer, setActiveExplorer] = useState(null);

  /**
   * Open an explorer with specific configuration
   * @param {Object} config - Explorer configuration
   * @param {string} config.type - Explorer type (e.g., 'gmail', 'github', etc.)
   * @param {string} config.itemId - ID of the item to display
   * @param {Array} config.itemList - List of all items for navigation
   * @param {Object} config.metadata - Additional metadata
   * @param {Array} config.buttons - Optional array of button configurations for footer
   *   Each button: { label, icon, onClick, variant, className }
   */
  const openExplorer = (config) => {
    setActiveExplorer(config);
  };

  /**
   * Close the currently active explorer
   */
  const closeExplorer = () => {
    setActiveExplorer(null);
  };

  /**
   * Update the current item being viewed in the explorer
   * @param {string} itemId - New item ID
   */
  const updateExplorerItem = (itemId) => {
    if (activeExplorer) {
      setActiveExplorer({
        ...activeExplorer,
        itemId
      });
    }
  };

  /**
   * Update the item list (useful when data refreshes)
   * @param {Array} itemList - New item list
   */
  const updateExplorerItemList = (itemList) => {
    if (activeExplorer) {
      setActiveExplorer({
        ...activeExplorer,
        itemList
      });
    }
  };

  const value = {
    activeExplorer,
    openExplorer,
    closeExplorer,
    updateExplorerItem,
    updateExplorerItemList,
    isExplorerOpen: activeExplorer !== null
  };

  return (
    <ExplorerContext.Provider value={value}>
      {children}
    </ExplorerContext.Provider>
  );
}

/**
 * Hook to access explorer context
 * @returns {Object} Explorer context value
 */
export function useExplorer() {
  const context = useContext(ExplorerContext);
  if (!context) {
    throw new Error('useExplorer must be used within an ExplorerProvider');
  }
  return context;
}

/**
 * Hook for widgets to easily open their specific explorer
 * @param {string} explorerType - Type of explorer (e.g., 'gmail')
 * @returns {Object} Helper functions for this explorer type
 */
export function useWidgetExplorer(explorerType) {
  const { openExplorer, closeExplorer, activeExplorer, updateExplorerItem } = useExplorer();

  const isThisExplorerOpen = activeExplorer?.type === explorerType;

  const open = (itemId, itemList = [], metadata = {}, buttons = []) => {
    openExplorer({
      type: explorerType,
      itemId,
      itemList,
      metadata,
      buttons
    });
  };

  const close = () => {
    if (isThisExplorerOpen) {
      closeExplorer();
    }
  };

  const changeItem = (itemId) => {
    if (isThisExplorerOpen) {
      updateExplorerItem(itemId);
    }
  };

  return {
    open,
    close,
    changeItem,
    isOpen: isThisExplorerOpen,
    currentItemId: isThisExplorerOpen ? activeExplorer.itemId : null,
    itemList: isThisExplorerOpen ? activeExplorer.itemList : [],
    metadata: isThisExplorerOpen ? activeExplorer.metadata : {},
    buttons: isThisExplorerOpen ? activeExplorer.buttons : []
  };
}

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  getQuickLinks, 
  addQuickLink, 
  updateQuickLink, 
  deleteQuickLink,
  reorderQuickLinks 
} from '@/services/quickLinksService';
import { Plus, Trash2, Edit2, GripVertical, ExternalLink, Check, X } from 'lucide-react';
import { iconComponents } from '@/lib/lucideIcons';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { LucideIconPicker } from './LucideIconPicker';

/**
 * QuickLinksSettings Component
 * Manages quick links configuration in the settings modal
 */
export function QuickLinksSettings() {
  const [links, setLinks] = useState([]);
  const [newUrl, setNewUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newLucideIcon, setNewLucideIcon] = useState('Link2');
  const [editingId, setEditingId] = useState(null);
  const [editUrl, setEditUrl] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editLucideIcon, setEditLucideIcon] = useState('Link2');
  const [draggedId, setDraggedId] = useState(null);

  // Load links on mount
  useEffect(() => {
    loadLinks();
  }, []);

  const loadLinks = () => {
    setLinks(getQuickLinks());
  };

  const handleAdd = () => {
    if (!newUrl.trim()) return;

    addQuickLink(newUrl, newTitle, newLucideIcon);
    setNewUrl('');
    setNewTitle('');
    setNewLucideIcon('Link2');
    loadLinks();
    
    // Dispatch custom event to update dock
    window.dispatchEvent(new Event('quicklinks-updated'));
  };

  const handleDelete = (id) => {
    deleteQuickLink(id);
    loadLinks();
    window.dispatchEvent(new Event('quicklinks-updated'));
  };

  const startEdit = (link) => {
    setEditingId(link.id);
    setEditUrl(link.url);
    setEditTitle(link.title);
    setEditLucideIcon(link.lucideIcon || 'Link2');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditUrl('');
    setEditTitle('');
    setEditLucideIcon('Link2');
  };

  const saveEdit = () => {
    if (!editUrl.trim()) return;

    updateQuickLink(editingId, {
      url: editUrl,
      title: editTitle,
      lucideIcon: editLucideIcon
    });
    
    cancelEdit();
    loadLinks();
    window.dispatchEvent(new Event('quicklinks-updated'));
  };

  const handleDragStart = (e, id) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetId) => {
    e.preventDefault();
    
    if (draggedId === targetId) return;

    const draggedIndex = links.findIndex(l => l.id === draggedId);
    const targetIndex = links.findIndex(l => l.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Reorder array
    const newLinks = [...links];
    const [removed] = newLinks.splice(draggedIndex, 1);
    newLinks.splice(targetIndex, 0, removed);

    // Update order
    const orderedIds = newLinks.map(l => l.id);
    reorderQuickLinks(orderedIds);
    
    setDraggedId(null);
    loadLinks();
    window.dispatchEvent(new Event('quicklinks-updated'));
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold mb-1">Quick Links</h3>
        <p className="text-sm text-muted-foreground">
          Add quick access links to your dock at the bottom of the screen
        </p>
      </div>

      {/* Add New Link Form */}
      <div className="space-y-3 p-4 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/40">
        <div className="space-y-2">
          <Label htmlFor="new-url" className="text-sm font-medium text-gray-900 dark:text-gray-100">URL</Label>
          <Input
            id="new-url"
            type="url"
            placeholder="https://example.com"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                handleAdd();
              }
            }}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-title" className="text-sm font-medium text-gray-900 dark:text-gray-100">Title (optional)</Label>
          <Input
            id="new-title"
            type="text"
            placeholder="My Website"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                handleAdd();
              }
            }}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600"
          />
        </div>
        
        {/* Icon Picker */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">Choose Icon</Label>
          <LucideIconPicker
            selectedIcon={newLucideIcon}
            onSelect={setNewLucideIcon}
          />
        </div>
        
        <Button 
          onClick={handleAdd} 
          className="w-full"
          disabled={!newUrl.trim()}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Link
        </Button>
      </div>

      {/* Links List */}
      {links.length > 0 ? (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">Your Links ({links.length})</Label>
          <div className="space-y-2">
            {links.map((link) => (
              <div
                key={link.id}
                draggable
                onDragStart={(e) => handleDragStart(e, link.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, link.id)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-3 p-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                  draggedId === link.id ? 'opacity-50' : ''
                }`}
              >
                {/* Drag Handle */}
                <div className="cursor-grab active:cursor-grabbing text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                  <GripVertical className="w-4 h-4" />
                </div>

                {/* Lucide Icon */}
                {(() => {
                  const IconComponent = iconComponents[link.lucideIcon || 'Link2'];
                  return IconComponent ? (
                    <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                      <IconComponent className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded flex-shrink-0">
                      <ExternalLink className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </div>
                  );
                })()}

                {/* Link Info or Edit Form */}
                {editingId === link.id ? (
                  <div className="flex-1 space-y-2">
                    <Input
                      type="url"
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      placeholder="URL"
                      className="h-8 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600"
                    />
                    <Input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Title"
                      className="h-8 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600"
                    />
                    <div className="pt-1">
                      <LucideIconPicker
                        selectedIcon={editLucideIcon}
                        onSelect={setEditLucideIcon}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate text-gray-900 dark:text-gray-100">{link.title}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 truncate flex items-center gap-1">
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      {link.url}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {editingId === link.id ? (
                    <>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={saveEdit}
                              className="h-8 w-8 p-0"
                            >
                              <Check className="w-4 h-4 text-green-600" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Save</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={cancelEdit}
                              className="h-8 w-8 p-0"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Cancel</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </>
                  ) : (
                    <>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEdit(link)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(link.id)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
            Drag and drop to reorder links
          </p>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">
          <p className="text-sm">No quick links yet</p>
          <p className="text-xs mt-1">Add your first link above</p>
        </div>
      )}
    </div>
  );
}

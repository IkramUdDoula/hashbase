import React, { useState } from 'react';
import { 
  Explorer, 
  ExplorerHeader, 
  ExplorerBody, 
  ExplorerSection,
  ExplorerField 
} from '@/components/ui/explorer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckSquare,
  Square,
  Calendar,
  Clock,
  Flag,
  Link as LinkIcon,
  FileText,
  Tag,
  AlertCircle,
  Repeat,
  Bell,
  FolderOpen,
  Plus,
  Trash2,
  CheckCircle2,
  PlayCircle,
  XCircle,
  MinusCircle,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { formatRelativeDate } from '@/lib/dateUtils';

/**
 * ChecklistExplorer - Comprehensive task viewer
 */
export function ChecklistExplorer({ 
  open, 
  onOpenChange, 
  itemId,
  itemList = [],
  onItemChange,
  onItemUpdate
}) {
  const currentIndex = itemList.findIndex(i => i.id === itemId);
  const item = itemList[currentIndex] || null;
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < itemList.length - 1;

  const [showSubtaskInput, setShowSubtaskInput] = useState(false);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [expandedSubtasks, setExpandedSubtasks] = useState(true);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');

  const handlePrevious = () => {
    if (hasPrevious) onItemChange(itemList[currentIndex - 1].id);
  };

  const handleNext = () => {
    if (hasNext) onItemChange(itemList[currentIndex + 1].id);
  };

  const handleToggleComplete = () => {
    if (!item) return;
    onItemUpdate({
      ...item,
      checked: !item.checked,
      completedAt: !item.checked ? new Date().toISOString() : null,
      status: !item.checked ? 'completed' : (item.status === 'completed' ? 'in-progress' : item.status)
    });
  };

  const handleAddSubtask = () => {
    if (!newSubtaskText.trim() || !item) return;
    onItemUpdate({
      ...item,
      subtasks: [...(item.subtasks || []), {
        id: Date.now(),
        text: newSubtaskText.trim(),
        checked: false,
        createdAt: new Date().toISOString()
      }]
    });
    setNewSubtaskText('');
    setShowSubtaskInput(false);
  };

  const handleToggleSubtask = (subtaskId) => {
    if (!item) return;
    onItemUpdate({
      ...item,
      subtasks: item.subtasks.map(st =>
        st.id === subtaskId ? { ...st, checked: !st.checked } : st
      )
    });
  };

  const handleDeleteSubtask = (subtaskId) => {
    if (!item) return;
    onItemUpdate({ ...item, subtasks: item.subtasks.filter(st => st.id !== subtaskId) });
  };

  const handleAddLink = () => {
    if (!newLinkUrl.trim() || !item) return;
    onItemUpdate({
      ...item,
      links: [...(item.links || []), {
        id: Date.now(),
        url: newLinkUrl.trim(),
        label: newLinkLabel.trim() || newLinkUrl.trim()
      }]
    });
    setNewLinkUrl('');
    setNewLinkLabel('');
    setShowLinkInput(false);
  };

  const handleDeleteLink = (linkId) => {
    if (!item) return;
    onItemUpdate({ ...item, links: item.links.filter(l => l.id !== linkId) });
  };

  const handleAddNote = () => {
    if (!newNoteText.trim() || !item) return;
    onItemUpdate({
      ...item,
      notes: [...(item.notes || []), {
        id: Date.now(),
        text: newNoteText.trim(),
        createdAt: new Date().toISOString()
      }]
    });
    setNewNoteText('');
    setShowNoteInput(false);
  };

  const handleDeleteNote = (noteId) => {
    if (!item) return;
    onItemUpdate({ ...item, notes: item.notes.filter(n => n.id !== noteId) });
  };

  const getPriorityBadge = (priority) => {
    const configs = {
      high: { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', label: 'High' },
      medium: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', label: 'Medium' },
      low: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', label: 'Low' }
    };
    const config = configs[priority] || configs.medium;
    return (
      <Badge variant="secondary" className={config.color}>
        <Flag className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getStatusBadge = (status) => {
    const configs = {
      'completed': { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle2, label: 'Completed' },
      'in-progress': { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: PlayCircle, label: 'In Progress' },
      'waiting': { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock, label: 'Waiting' },
      'skipped': { color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400', icon: MinusCircle, label: 'Skipped' },
      'blocked': { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: XCircle, label: 'Blocked' }
    };
    const config = configs[status] || configs['in-progress'];
    const Icon = config.icon;
    return (
      <Badge variant="secondary" className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getSubtaskProgress = (subtasks) => {
    if (!subtasks || subtasks.length === 0) return null;
    const completed = subtasks.filter(st => st.checked).length;
    const total = subtasks.length;
    return { completed, total, percentage: Math.round((completed / total) * 100) };
  };

  const subtaskProgress = item?.subtasks ? getSubtaskProgress(item.subtasks) : null;

  return (
    <Explorer
      open={open}
      onOpenChange={onOpenChange}
      title="Checklist"
      showNavigation={itemList.length > 1}
      onPrevious={handlePrevious}
      onNext={handleNext}
      hasPrevious={hasPrevious}
      hasNext={hasNext}
      buttons={item ? [{
        label: item.checked ? 'Mark as Undone' : 'Mark as Done',
        icon: item.checked ? Square : CheckSquare,
        onClick: handleToggleComplete,
        variant: item.checked ? 'outline' : 'default',
        className: item.checked ? '' : 'bg-green-600 hover:bg-green-700 text-white border-green-600'
      }] : []}
    >
      {!item ? (
        <div className="flex flex-col items-center justify-center h-64 text-center p-4">
          <CheckSquare className="h-12 w-12 text-gray-400 mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Item not found</p>
        </div>
      ) : (
        <>
          <ExplorerHeader>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <button
                  onClick={handleToggleComplete}
                  className={`flex-shrink-0 w-6 h-6 mt-0.5 rounded border-2 transition-all ${
                    item.checked
                      ? 'bg-green-600 border-green-600'
                      : 'border-gray-300 hover:border-green-500'
                  }`}
                >
                  {item.checked && (
                    <svg className="w-full h-full text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <h3 className={`text-lg font-semibold flex-1 ${
                  item.checked ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-gray-100'
                }`}>
                  {item.text}
                </h3>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {item.status && getStatusBadge(item.status)}
                {item.priority && getPriorityBadge(item.priority)}
                {item.group && (
                  <Badge variant="outline" className="border-purple-300 text-purple-700 dark:border-purple-700 dark:text-purple-400">
                    <FolderOpen className="h-3 w-3 mr-1" />
                    {item.group}
                  </Badge>
                )}
              </div>

              {item.tags && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {item.tags.map((tag, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                      <Tag className="h-3 w-3" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </ExplorerHeader>

          <ExplorerBody>
            {item.dueDate && (
              <ExplorerSection title="Due Date">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {new Date(item.dueDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                    {item.dueTime && ` at ${item.dueTime}`}
                  </span>
                  <span className="text-xs text-gray-500">({formatRelativeDate(item.dueDate)})</span>
                </div>
              </ExplorerSection>
            )}

            {item.estimatedTime && (
              <ExplorerSection title="Estimated Time">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{item.estimatedTime}</span>
                </div>
              </ExplorerSection>
            )}

            {item.subtasks && item.subtasks.length > 0 && (
              <ExplorerSection>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setExpandedSubtasks(!expandedSubtasks)}
                      className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300"
                    >
                      {expandedSubtasks ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      Subtasks
                    </button>
                    {subtaskProgress && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{subtaskProgress.completed}/{subtaskProgress.total}</span>
                        <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full bg-green-600 transition-all" style={{ width: `${subtaskProgress.percentage}%` }} />
                        </div>
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{subtaskProgress.percentage}%</span>
                      </div>
                    )}
                  </div>

                  {expandedSubtasks && (
                    <div className="space-y-1.5 pl-2">
                      {item.subtasks.map((subtask) => (
                        <div key={subtask.id} className="group flex items-start gap-2 p-2 rounded-lg border border-gray-200 dark:border-gray-700">
                          <button
                            onClick={() => handleToggleSubtask(subtask.id)}
                            className={`flex-shrink-0 w-4 h-4 mt-0.5 rounded border-2 ${
                              subtask.checked ? 'bg-green-600 border-green-600' : 'border-gray-300'
                            }`}
                          >
                            {subtask.checked && (
                              <svg className="w-full h-full text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                          <span className={`flex-1 text-sm ${subtask.checked ? 'text-gray-500 line-through' : 'text-gray-700 dark:text-gray-300'}`}>
                            {subtask.text}
                          </span>
                          <button onClick={() => handleDeleteSubtask(subtask.id)} className="opacity-0 group-hover:opacity-100 p-1 text-red-600 hover:bg-red-50 rounded">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {showSubtaskInput ? (
                    <div className="flex items-center gap-2 pl-2">
                      <input
                        type="text"
                        value={newSubtaskText}
                        onChange={(e) => setNewSubtaskText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddSubtask();
                          if (e.key === 'Escape') { setShowSubtaskInput(false); setNewSubtaskText(''); }
                        }}
                        placeholder="Subtask name..."
                        autoFocus
                        className="flex-1 px-2 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <Button size="sm" onClick={handleAddSubtask}>Add</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setShowSubtaskInput(false); setNewSubtaskText(''); }}>Cancel</Button>
                    </div>
                  ) : (
                    <button onClick={() => setShowSubtaskInput(true)} className="flex items-center gap-2 px-2 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded">
                      <Plus className="h-4 w-4" />
                      Add Subtask
                    </button>
                  )}
                </div>
              </ExplorerSection>
            )}

            {(!item.subtasks || item.subtasks.length === 0) && (
              <ExplorerSection title="Subtasks">
                {showSubtaskInput ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newSubtaskText}
                      onChange={(e) => setNewSubtaskText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddSubtask();
                        if (e.key === 'Escape') { setShowSubtaskInput(false); setNewSubtaskText(''); }
                      }}
                      placeholder="Subtask name..."
                      autoFocus
                      className="flex-1 px-2 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <Button size="sm" onClick={handleAddSubtask}>Add</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setShowSubtaskInput(false); setNewSubtaskText(''); }}>Cancel</Button>
                  </div>
                ) : (
                  <button onClick={() => setShowSubtaskInput(true)} className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg border border-dashed border-gray-300 w-full">
                    <Plus className="h-4 w-4" />
                    Add Subtask
                  </button>
                )}
              </ExplorerSection>
            )}

            <ExplorerSection title="Notes">
              {item.notes && item.notes.length > 0 ? (
                <div className="space-y-2">
                  {item.notes.map((note) => (
                    <div key={note.id} className="group flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <FileText className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{note.text}</p>
                        {note.createdAt && <p className="text-xs text-gray-500 mt-1">{formatRelativeDate(note.createdAt)}</p>}
                      </div>
                      <button onClick={() => handleDeleteNote(note.id)} className="opacity-0 group-hover:opacity-100 p-1 text-red-600 hover:bg-red-50 rounded">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No notes yet</p>
              )}

              {showNoteInput ? (
                <div className="mt-2 space-y-2">
                  <textarea
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) handleAddNote();
                      if (e.key === 'Escape') { setShowNoteInput(false); setNewNoteText(''); }
                    }}
                    placeholder="Add a note... (Ctrl+Enter to save)"
                    autoFocus
                    rows={3}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddNote}>Add Note</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setShowNoteInput(false); setNewNoteText(''); }}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowNoteInput(true)} className="mt-2 flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded">
                  <Plus className="h-4 w-4" />
                  Add Note
                </button>
              )}
            </ExplorerSection>

            {item.links && item.links.length > 0 && (
              <ExplorerSection title="Links">
                <div className="space-y-2">
                  {item.links.map((link) => (
                    <div key={link.id} className="group flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <LinkIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex-1 text-sm text-blue-600 hover:underline truncate">
                        {link.label}
                      </a>
                      <button onClick={() => handleDeleteLink(link.id)} className="opacity-0 group-hover:opacity-100 p-1 text-red-600 hover:bg-red-50 rounded">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>

                {showLinkInput ? (
                  <div className="mt-2 space-y-2">
                    <input
                      type="text"
                      value={newLinkLabel}
                      onChange={(e) => setNewLinkLabel(e.target.value)}
                      placeholder="Link label (optional)"
                      className="w-full px-2 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="url"
                      value={newLinkUrl}
                      onChange={(e) => setNewLinkUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddLink();
                        if (e.key === 'Escape') { setShowLinkInput(false); setNewLinkUrl(''); setNewLinkLabel(''); }
                      }}
                      placeholder="https://example.com"
                      autoFocus
                      className="w-full px-2 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleAddLink}>Add Link</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setShowLinkInput(false); setNewLinkUrl(''); setNewLinkLabel(''); }}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowLinkInput(true)} className="mt-2 flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded">
                    <Plus className="h-4 w-4" />
                    Add Link
                  </button>
                )}
              </ExplorerSection>
            )}

            {(!item.links || item.links.length === 0) && !showLinkInput && (
              <ExplorerSection title="Links">
                <button onClick={() => setShowLinkInput(true)} className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg border border-dashed border-gray-300 w-full">
                  <Plus className="h-4 w-4" />
                  Add Link
                </button>
              </ExplorerSection>
            )}

            {showLinkInput && (!item.links || item.links.length === 0) && (
              <ExplorerSection title="Links">
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newLinkLabel}
                    onChange={(e) => setNewLinkLabel(e.target.value)}
                    placeholder="Link label (optional)"
                    className="w-full px-2 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="url"
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddLink();
                      if (e.key === 'Escape') { setShowLinkInput(false); setNewLinkUrl(''); setNewLinkLabel(''); }
                    }}
                    placeholder="https://example.com"
                    autoFocus
                    className="w-full px-2 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddLink}>Add Link</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setShowLinkInput(false); setNewLinkUrl(''); setNewLinkLabel(''); }}>Cancel</Button>
                  </div>
                </div>
              </ExplorerSection>
            )}

            {item.dependencies && item.dependencies.length > 0 && (
              <ExplorerSection title="Dependencies">
                <div className="space-y-1.5">
                  {item.dependencies.map((dep, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{dep}</span>
                    </div>
                  ))}
                </div>
              </ExplorerSection>
            )}

            {item.repeatFrequency && (
              <ExplorerSection title="Repeat">
                <div className="flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{item.repeatFrequency}</span>
                </div>
              </ExplorerSection>
            )}

            {item.reminder && (
              <ExplorerSection title="Reminder">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{item.reminder}</span>
                </div>
              </ExplorerSection>
            )}

            <ExplorerSection title="Timeline">
              <div className="space-y-2">
                <ExplorerField label="Created">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {formatRelativeDate(item.createdAt)}
                    </span>
                  </div>
                </ExplorerField>
                
                {item.completedAt && (
                  <ExplorerField label="Completed">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {formatRelativeDate(item.completedAt)}
                      </span>
                    </div>
                  </ExplorerField>
                )}
              </div>
            </ExplorerSection>
          </ExplorerBody>
        </>
      )}
    </Explorer>
  );
}

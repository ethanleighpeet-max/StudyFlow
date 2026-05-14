'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { StickyNote, Send, ChevronLeft, ChevronRight } from 'lucide-react';
import { useStudySession } from '@/stores/study-session';

const spring = { type: 'spring' as const, stiffness: 400, damping: 17 };

function formatOffset(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function SessionNotes() {
  const store = useStudySession();
  const [collapsed, setCollapsed] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const notesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    notesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [store.notes.length]);

  const handleSubmitNote = async () => {
    if (!noteText.trim() || !store.sessionId || isSaving) return;

    setIsSaving(true);
    const timestampOffset = store.elapsedSeconds;

    const res = await fetch(`/api/sessions/${store.sessionId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: noteText.trim(),
        timestampOffset,
      }),
    });
    const data = await res.json();

    if (data.success) {
      store.addNote({
        id: data.data.id,
        content: noteText.trim(),
        timestampOffset,
        createdAt: new Date().toISOString(),
      });
      setNoteText('');
    }
    setIsSaving(false);
  };

  return (
    <AnimatePresence mode="wait">
      {collapsed ? (
        <motion.button
          key="collapsed"
          className="flex h-full w-12 flex-col items-center justify-center border-l border-surface-200 bg-surface-50/50 text-surface-400 hover:bg-surface-100 hover:text-surface-600"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 48, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          onClick={() => setCollapsed(false)}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="mt-2 text-xs font-medium [writing-mode:vertical-lr]">Notes</span>
        </motion.button>
      ) : (
        <motion.div
          key="expanded"
          className="flex h-full w-[380px] flex-col border-l border-surface-200 bg-white"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 380, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-surface-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-brand-500" />
              <h3 className="text-sm font-semibold text-surface-900">Session Notes</h3>
              <span className="rounded-full bg-surface-100 px-2 py-0.5 text-xs font-medium text-surface-500">
                {store.notes.length}
              </span>
            </div>
            <button
              className="text-surface-400 hover:text-surface-600"
              onClick={() => setCollapsed(true)}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Notes list */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {store.notes.length === 0 ? (
              <motion.div
                className="flex flex-col items-center justify-center py-12 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <motion.div
                  className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50"
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <StickyNote className="h-6 w-6 text-brand-400" />
                </motion.div>
                <p className="text-sm text-surface-400">
                  Jot down notes as you study.
                </p>
                <p className="mt-1 text-xs text-surface-300">
                  Each note is timestamped automatically.
                </p>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {store.notes.map((note, i) => (
                  <motion.div
                    key={note.id ?? i}
                    className="rounded-xl border border-surface-100 bg-surface-50/50 p-3"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  >
                    <span className="mb-1 block font-sans text-xs font-medium tabular-nums text-brand-500">
                      {formatOffset(note.timestampOffset)}
                    </span>
                    <p className="text-sm text-surface-700 whitespace-pre-wrap">{note.content}</p>
                  </motion.div>
                ))}
                <div ref={notesEndRef} />
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-surface-100 p-3">
            <div className="flex gap-2">
              <textarea
                placeholder="Type a note..."
                className="flex-1 resize-none rounded-xl border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-900 outline-none transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
                rows={2}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmitNote();
                  }
                }}
              />
              <motion.button
                className="flex h-10 w-10 shrink-0 items-center justify-center self-end rounded-xl bg-brand-500 text-white disabled:opacity-40"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                transition={spring}
                onClick={handleSubmitNote}
                disabled={!noteText.trim() || isSaving}
              >
                <Send className="h-4 w-4" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

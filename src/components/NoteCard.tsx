import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { Image } from 'lucide-react';
import { Note } from '@/hooks/useNotes';

interface NoteCardProps {
  note: Note;
  onClick: () => void;
  getPhotoUrl: (path: string) => string;
  searchQuery?: string;
}

function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
}

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query || !text) return <>{text}</>;
  
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-300/60 text-foreground rounded-sm px-0.5">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export function NoteCard({ note, onClick, getPhotoUrl, searchQuery = '' }: NoteCardProps) {
  const hasPhotos = note.photos && note.photos.length > 0;
  const firstPhoto = hasPhotos ? note.photos![0] : null;
  const plainContent = note.content ? stripHtml(note.content) : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileTap={{ scale: 0.98 }}
      className="note-card cursor-pointer"
      onClick={onClick}
    >
      <div className="flex gap-3">
        {/* Thumbnail */}
        {firstPhoto ? (
          <div className="relative flex-shrink-0">
            <img
              src={getPhotoUrl(firstPhoto.file_path)}
              alt="Thumbnail"
              className="photo-thumbnail"
            />
            {note.photos!.length > 1 && (
              <div className="absolute bottom-1 right-1 bg-foreground/70 text-background text-xs px-1.5 rounded-full">
                +{note.photos!.length - 1}
              </div>
            )}
          </div>
        ) : (
          <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
            <Image className="w-6 h-6 text-muted-foreground" />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate mb-1">
            <HighlightText text={note.title} query={searchQuery} />
          </h3>
          {plainContent && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              <HighlightText text={plainContent} query={searchQuery} />
            </p>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">
              {format(new Date(note.updated_at), 'd MMM yyyy', { locale: id })}
            </span>
            {note.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="tag-pill">
                <HighlightText text={tag} query={searchQuery} />
              </span>
            ))}
            {note.tags.length > 2 && (
              <span className="text-xs text-muted-foreground">
                +{note.tags.length - 2}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

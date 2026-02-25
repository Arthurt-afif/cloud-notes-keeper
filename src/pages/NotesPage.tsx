import { Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useNotes } from '@/hooks/useNotes';
import { BottomNav } from '@/components/BottomNav';
import { SearchBar } from '@/components/SearchBar';
import { NoteCard } from '@/components/NoteCard';
import { EmptyState } from '@/components/EmptyState';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useNavigate } from 'react-router-dom';

export default function NotesPage() {
  const { user, loading: authLoading } = useAuth();
  const { notes, loading, searchQuery, setSearchQuery, getPhotoUrl } = useNotes();
  const navigate = useNavigate();

  if (authLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="page-container max-w-lg mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-4">Catatan Saya</h1>
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
        </div>

        {/* Notes List */}
        {loading ? (
          <LoadingSpinner />
        ) : notes.length === 0 ? (
          <EmptyState
            title={searchQuery ? 'Tidak ditemukan' : 'Belum ada catatan'}
            description={
              searchQuery
                ? 'Coba cari dengan kata kunci lain'
                : 'Ketuk tombol + untuk membuat catatan pertama Anda'
            }
          />
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {notes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onClick={() => navigate(`/note/${note.id}`)}
                  getPhotoUrl={getPhotoUrl}
                  searchQuery={searchQuery}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

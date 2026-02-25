import { useState, useEffect } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Trash2, Edit2, Save, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { useNotes, Note } from '@/hooks/useNotes';
import { BottomNav } from '@/components/BottomNav';
import { TagInput } from '@/components/TagInput';
import { PhotoUploader } from '@/components/PhotoUploader';
import { FormattedText } from '@/lib/formatText';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function NoteDetailPage() {
  const { id: noteId } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const { notes, updateNote, deleteNote, uploadPhoto, deletePhoto, getPhotoUrl, loading } = useNotes();
  const navigate = useNavigate();

  const [note, setNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const foundNote = notes.find((n) => n.id === noteId);
    // PERBAIKAN: Hanya update state lokal jika TIDAK sedang dalam mode edit
    if (foundNote && !isEditing) {
      setNote(foundNote);
      setEditTitle(foundNote.title);
      setEditContent(foundNote.content || '');
      setEditTags(foundNote.tags || []);
    }
  }, [noteId, notes, isEditing]);

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!note && !loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="page-container max-w-lg mx-auto">
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-muted-foreground">Catatan tidak ditemukan</p>
            <Button onClick={() => navigate('/')} className="mt-4">
              Kembali
            </Button>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!note) return <LoadingSpinner />;

  const handleSave = async () => {
    if (!editTitle.trim()) return;
    setSaving(true);
    try {
      await updateNote(note.id, editTitle.trim(), editContent.trim(), editTags);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    await deleteNote(note.id);
    navigate('/');
  };

  const handlePhotoUpload = async (file: File) => {
    await uploadPhoto(note.id, file);
  };

  const handlePhotoDelete = async (photoId: string, filePath: string) => {
    await deletePhoto(photoId, filePath);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="page-container max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-card flex items-center justify-center shadow-md hover:shadow-lg transition-shadow"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>

          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button variant="ghost" size="icon" onClick={() => setIsEditing(false)}>
                  <X className="w-5 h-5" />
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
                  <Edit2 className="w-5 h-5" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="w-5 h-5 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Hapus Catatan?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Catatan ini akan dihapus permanen dan tidak bisa dikembalikan.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Batal</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Hapus
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {isEditing ? (
            <>
              <Input
                placeholder="Judul catatan"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-xl font-bold h-12"
              />
              <Textarea
                placeholder="Tulis catatan Anda di sini..."
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[200px] resize-none"
              />
              <div>
                <p className="text-sm text-muted-foreground mb-2">Tags</p>
                <TagInput tags={editTags} onChange={setEditTags} />
              </div>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-foreground">{note.title}</h1>
              <div className="text-sm text-muted-foreground">
                Dibuat {format(new Date(note.created_at), 'd MMMM yyyy, HH:mm', { locale: id })}
              </div>
              {note.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {note.tags.map((tag) => <span key={tag} className="tag-pill">{tag}</span>)}
                </div>
              )}
              {note.content && (
                <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                  <FormattedText text={note.content} />
                </p>
              )}
            </>
          )}

          <div className="pt-4 border-t border-border">
            <p className="text-sm font-medium text-foreground mb-3">Foto</p>
            <PhotoUploader
              photos={note.photos || []}
              getPhotoUrl={getPhotoUrl}
              onUpload={handlePhotoUpload}
              onDelete={handlePhotoDelete}
            />
          </div>
        </motion.div>
      </div>
      <BottomNav />
    </div>
  );
}
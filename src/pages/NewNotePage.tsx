import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNotes } from '@/hooks/useNotes';
import { BottomNav } from '@/components/BottomNav';
import { TagInput } from '@/components/TagInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function NewNotePage() {
  const { user, loading: authLoading } = useAuth();
  const { createNote } = useNotes();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  if (authLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleSave = async () => {
    if (!title.trim()) return;

    setSaving(true);
    try {
      const note = await createNote(title.trim(), content.trim(), tags);
      if (note) {
        navigate(`/note/${note.id}`);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="page-container max-w-lg mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-6"
        >
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-card flex items-center justify-center shadow-note hover:shadow-note-hover transition-shadow"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Catatan Baru</h1>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          <Input
            placeholder="Judul catatan"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-lg font-medium h-12"
          />

          <Textarea
            placeholder="Tulis catatan Anda di sini..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[200px] resize-none"
          />

          <div>
            <p className="text-sm text-muted-foreground mb-2">Tags</p>
            <TagInput tags={tags} onChange={setTags} />
          </div>

          <p className="text-sm text-muted-foreground">
            Anda bisa menambahkan foto setelah catatan disimpan.
          </p>

          <Button
            onClick={handleSave}
            disabled={!title.trim() || saving}
            className="w-full h-12"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Simpan Catatan
          </Button>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
}

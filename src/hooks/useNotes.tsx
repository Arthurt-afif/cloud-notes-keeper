import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Note {
  id: string;
  title: string;
  content: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  user_id: string;
  photos?: { id: string; file_path: string }[];
}

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select(`
          *,
          photos:note_photos(id, file_path)
        `)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast.error('Gagal mengambil catatan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const createNote = async (title: string, content: string, tags: string[]) => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .insert([{ title, content, tags }])
        .select()
        .single();

      if (error) throw error;
      await fetchNotes();
      toast.success('Catatan berhasil dibuat');
      return data;
    } catch (error) {
      console.error('Error creating note:', error);
      toast.error('Gagal membuat catatan');
      return null;
    }
  };

  const updateNote = async (id: string, title: string, content: string, tags: string[]) => {
    try {
      const { error } = await supabase
        .from('notes')
        .update({ title, content, tags, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      await fetchNotes();
      toast.success('Catatan berhasil diperbarui');
    } catch (error) {
      console.error('Error updating note:', error);
      toast.error('Gagal memperbarui catatan');
    }
  };

  const deleteNote = async (id: string) => {
    try {
      const { error } = await supabase.from('notes').delete().eq('id', id);
      if (error) throw error;
      await fetchNotes();
      toast.success('Catatan berhasil dihapus');
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Gagal menghapus catatan');
    }
  };

  const uploadPhoto = async (noteId: string, file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${noteId}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('note-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from('note_photos')
        .insert({
          note_id: noteId,
          file_path: filePath,
          file_name: file.name,
        });

      if (insertError) throw insertError;

      await fetchNotes();
      toast.success('Foto berhasil diupload');
      return filePath;
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Gagal upload foto');
      return null;
    }
  };

  const deletePhoto = async (photoId: string, filePath: string) => {
    try {
      await supabase.storage.from('note-photos').remove([filePath]);
      const { error } = await supabase.from('note_photos').delete().eq('id', photoId);
      if (error) throw error;
      await fetchNotes();
      toast.success('Foto berhasil dihapus');
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast.error('Gagal menghapus foto');
    }
  };

  const getPhotoUrl = (filePath: string) => {
    const { data } = supabase.storage.from('note-photos').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const filteredNotes = notes.filter(note => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      note.title.toLowerCase().includes(query) ||
      (note.content && note.content.toLowerCase().includes(query)) ||
      note.tags.some(tag => tag.toLowerCase().includes(query))
    );
  });

  return {
    notes: filteredNotes,
    loading,
    searchQuery,
    setSearchQuery,
    createNote,
    updateNote,
    deleteNote,
    uploadPhoto,
    deletePhoto,
    getPhotoUrl,
    refreshNotes: fetchNotes,
  };
}
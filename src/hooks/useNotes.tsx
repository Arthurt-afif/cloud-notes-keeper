import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  photos?: NotePhoto[];
}

export interface NotePhoto {
  id: string;
  note_id: string;
  user_id: string;
  file_path: string;
  file_name: string;
  created_at: string;
}

export function useNotes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchNotes = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      // Fetch photos for each note
      const notesWithPhotos = await Promise.all(
        (data || []).map(async (note) => {
          const { data: photos } = await supabase
            .from('note_photos')
            .select('*')
            .eq('note_id', note.id);
          return { ...note, photos: photos || [] };
        })
      );
      
      setNotes(notesWithPhotos);
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast.error('Gagal memuat catatan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotes();
    }
  }, [user]);

  const createNote = async (title: string, content: string, tags: string[]) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          user_id: user.id,
          title,
          content,
          tags,
        })
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
        .update({ title, content, tags })
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
      // Delete photos from storage first
      const { data: photos } = await supabase
        .from('note_photos')
        .select('file_path')
        .eq('note_id', id);

      if (photos && photos.length > 0) {
        const filePaths = photos.map(p => p.file_path);
        await supabase.storage.from('note-photos').remove(filePaths);
      }

      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      await fetchNotes();
      toast.success('Catatan berhasil dihapus');
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Gagal menghapus catatan');
    }
  };

  const uploadPhoto = async (noteId: string, file: File) => {
    if (!user) return null;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${noteId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('note-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from('note_photos')
        .insert({
          note_id: noteId,
          user_id: user.id,
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
      
      const { error } = await supabase
        .from('note_photos')
        .delete()
        .eq('id', photoId);

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

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface NotePhoto {
  id: string;
  file_path: string;
  file_name?: string;
}

export interface Note {
  id: string;
  title: string;
  content: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  user_id: string;
  photos?: NotePhoto[];
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Anda harus login terlebih dahulu');
        return null;
      }

      const { data, error } = await supabase
        .from('notes')
        .insert([{ title, content, tags, user_id: user.id }])
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Anda harus login terlebih dahulu');
        return null;
      }

      const fileExt = file.name.split('.').pop();
      // Use user.id as folder name to match storage RLS policy
      const filePath = `${user.id}/${noteId}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('note-photos')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw uploadError;
      }

      const { error: insertError } = await supabase
        .from('note_photos')
        .insert({
          note_id: noteId,
          file_path: filePath,
          file_name: file.name,
          user_id: user.id,
        });

      if (insertError) {
        console.error('Database insert error:', insertError);
        // Clean up uploaded file if database insert fails
        await supabase.storage.from('note-photos').remove([filePath]);
        throw insertError;
      }

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

  // Strip HTML tags to get plain text for searching
  const stripHtml = (html: string): string => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  };

  const filteredNotes = notes.filter(note => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const plainContent = note.content ? stripHtml(note.content).toLowerCase() : '';
    return (
      note.title.toLowerCase().includes(query) ||
      plainContent.includes(query) ||
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
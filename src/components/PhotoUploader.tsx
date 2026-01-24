import { useState, useRef } from 'react';
import { Camera, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { NotePhoto } from '@/hooks/useNotes';

interface PhotoUploaderProps {
  photos: NotePhoto[];
  getPhotoUrl: (path: string) => string;
  onUpload: (file: File) => Promise<void>;
  onDelete: (photoId: string, filePath: string) => Promise<void>;
  disabled?: boolean;
}

export function PhotoUploader({
  photos,
  getPhotoUrl,
  onUpload,
  onDelete,
  disabled = false,
}: PhotoUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await onUpload(file);
      }
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <AnimatePresence mode="popLayout">
          {photos.map((photo) => (
            <motion.div
              key={photo.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="relative group"
            >
              <img
                src={getPhotoUrl(photo.file_path)}
                alt={photo.file_name}
                className="w-20 h-20 rounded-xl object-cover"
              />
              <button
                onClick={() => onDelete(photo.id, photo.file_path)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Upload Button */}
        <button
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading}
          className="w-20 h-20 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-accent transition-colors flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <>
              <Camera className="w-6 h-6" />
              <span className="text-xs">Foto</span>
            </>
          )}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}

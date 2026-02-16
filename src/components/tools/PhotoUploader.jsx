import { useState, useRef } from 'react';
import { Camera, Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { storage } from '../../lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { cn } from '../../lib/utils';
import { useToast } from '../ui/Toast';

export function PhotoUploader({ photos = [], onChange, maxPhotos = 5, organizationId }) {
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);
    const { showToast } = useToast();

    const handleFileSelect = async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        if (photos.length + files.length > maxPhotos) {
            showToast(`Máximo de ${maxPhotos} fotos permitidas`, 'error');
            return;
        }

        setUploading(true);
        try {
            const uploadPromises = files.map(async (file) => {
                // Validate file type
                if (!file.type.startsWith('image/')) {
                    throw new Error('Apenas imagens são permitidas');
                }

                // Validate file size (max 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    throw new Error('Imagem muito grande. Máximo 5MB');
                }

                // Generate unique filename
                const timestamp = Date.now();
                const randomId = Math.random().toString(36).substring(7);
                const extension = file.name.split('.').pop();
                const filename = `os-photos/${organizationId}/${timestamp}-${randomId}.${extension}`;

                // Upload to Firebase Storage
                const storageRef = ref(storage, filename);
                await uploadBytes(storageRef, file);
                const url = await getDownloadURL(storageRef);

                return {
                    url,
                    path: filename,
                    uploadedAt: new Date().toISOString()
                };
            });

            const uploadedPhotos = await Promise.all(uploadPromises);
            onChange([...photos, ...uploadedPhotos]);
            showToast(`${uploadedPhotos.length} foto(s) adicionada(s)!`, 'success');
        } catch (error) {
            console.error('Upload error:', error);
            showToast(error.message || 'Erro ao fazer upload', 'error');
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleDelete = async (index) => {
        const photo = photos[index];
        try {
            // Delete from Firebase Storage
            if (photo.path) {
                const storageRef = ref(storage, photo.path);
                await deleteObject(storageRef);
            }

            const newPhotos = photos.filter((_, i) => i !== index);
            onChange(newPhotos);
            showToast('Foto removida', 'success');
        } catch (error) {
            console.error('Delete error:', error);
            showToast('Erro ao remover foto', 'error');
        }
    };

    return (
        <div className="space-y-4">
            {/* Upload Button */}
            <div className="flex gap-2">
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || photos.length >= maxPhotos}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs transition-all",
                        uploading || photos.length >= maxPhotos
                            ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                            : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none"
                    )}
                >
                    {uploading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Enviando...
                        </>
                    ) : (
                        <>
                            <Camera className="w-4 h-4" />
                            Adicionar Foto ({photos.length}/{maxPhotos})
                        </>
                    )}
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    capture="environment"
                    onChange={handleFileSelect}
                    className="hidden"
                />
            </div>

            {/* Photo Grid */}
            {photos.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {photos.map((photo, index) => (
                        <div
                            key={index}
                            className="relative group aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10"
                        >
                            <img
                                src={photo.url}
                                alt={`Foto ${index + 1}`}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center">
                                <button
                                    onClick={() => handleDelete(index)}
                                    className="opacity-0 group-hover:opacity-100 transition-all p-2 bg-red-500 text-white rounded-full hover:bg-red-600 active:scale-95"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 text-white text-[9px] font-bold rounded-md">
                                #{index + 1}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {photos.length === 0 && (
                <div className="p-8 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl text-center">
                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                        <ImageIcon className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">
                        Nenhuma foto adicionada
                    </p>
                    <p className="text-xs text-slate-400">
                        Tire fotos do aparelho para documentar o estado
                    </p>
                </div>
            )}

            {/* Info */}
            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30">
                <Camera className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <p className="text-[10px] font-medium text-blue-800 dark:text-blue-200 leading-relaxed">
                    As fotos serão anexadas à OS e incluídas no PDF. Máximo de {maxPhotos} fotos por ordem de serviço.
                </p>
            </div>
        </div>
    );
}

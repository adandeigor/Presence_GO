import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const BUCKET_NAME = 'presencego-files';

/**
 * Upload un fichier dans le bucket Supabase
 */
export async function uploadFile(
  file: File | Buffer,
  folder: string = 'general',
  customFileName?: string
) {
  try {
    const fileName = customFileName || `${uuidv4()}_${file instanceof File ? file.name : 'file'}`;
    const filePath = `${folder}/${fileName}`;

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    return {
      path: data.path,
      fullPath: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${data.path}`
    };
  } catch (error) {
    console.error('Erreur upload fichier:', error);
    throw error;
  }
}

/**
 * Télécharge un fichier depuis le bucket Supabase
 */
export async function downloadFile(filePath: string) {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .download(filePath);

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Erreur téléchargement fichier:', error);
    throw error;
  }
}

/**
 * Supprime un fichier du bucket Supabase
 */
export async function deleteFile(filePath: string) {
  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Erreur suppression fichier:', error);
    throw error;
  }
}

/**
 * Récupère l'URL publique d'un fichier
 */
export function getPublicUrl(filePath: string) {
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  return data.publicUrl;
}

/**
 * Liste les fichiers dans un dossier
 */
export async function listFiles(folder: string = '') {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(folder);

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Erreur listage fichiers:', error);
    throw error;
  }
}
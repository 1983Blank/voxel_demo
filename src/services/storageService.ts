/**
 * Storage Service
 * Handles file uploads to Supabase Storage
 */

import { supabase, isSupabaseConfigured } from './supabase';

const BUCKET_NAME = 'editor-images';

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Upload an image to Supabase Storage
 */
export async function uploadImage(file: File): Promise<UploadResult> {
  if (!isSupabaseConfigured()) {
    // For development without Supabase, create a local blob URL
    const url = URL.createObjectURL(file);
    return { success: true, url };
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'You must be logged in to upload images' };
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 9);
    const extension = file.name.split('.').pop() || 'png';
    const fileName = `${user.id}/${timestamp}-${randomId}.${extension}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return { success: false, error: uploadError.message };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    return { success: true, url: publicUrl };
  } catch (error) {
    console.error('Storage error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Delete an image from Supabase Storage
 */
export async function deleteImage(url: string): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return true;
  }

  try {
    // Extract file path from URL
    const urlObj = new URL(url);
    const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/editor-images\/(.+)/);
    if (!pathMatch) return false;

    const filePath = pathMatch[1];
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.error('Delete error:', error);
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Get list of user's uploaded images
 */
export async function getUserImages(): Promise<string[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(user.id, {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) {
      console.error('List error:', error);
      return [];
    }

    return (data || []).map(file => {
      const { data: { publicUrl } } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(`${user.id}/${file.name}`);
      return publicUrl;
    });
  } catch {
    return [];
  }
}

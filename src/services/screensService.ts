/**
 * Screens Service - Supabase integration for screen persistence
 */

import { supabase, isSupabaseConfigured } from './supabase';

// Types for screens (matching Supabase schema)
export interface DbScreen {
  id: string;
  user_id: string;
  name: string;
  file_name: string;
  file_path: string | null;
  html: string | null;
  thumbnail: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface DbScreenVersion {
  id: string;
  screen_id: string;
  html: string;
  prompt: string | null;
  description: string | null;
  created_at: string;
}

export type ScreenInsert = Omit<DbScreen, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type ScreenUpdate = Partial<Omit<DbScreen, 'id' | 'user_id' | 'created_at'>>;

export type ScreenVersionInsert = Omit<DbScreenVersion, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

/**
 * Fetch all screens for the current user
 */
export async function fetchScreens(): Promise<DbScreen[]> {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured, returning empty array');
    return [];
  }

  const { data, error } = await supabase
    .from('screens')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching screens:', error);
    throw error;
  }

  return (data as DbScreen[]) || [];
}

/**
 * Fetch a single screen by ID
 */
export async function fetchScreen(id: string): Promise<DbScreen | null> {
  if (!isSupabaseConfigured()) return null;

  const { data, error } = await supabase
    .from('screens')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching screen:', error);
    return null;
  }

  return data as DbScreen;
}

/**
 * Create a new screen
 */
export async function createScreen(screen: ScreenInsert): Promise<DbScreen | null> {
  if (!isSupabaseConfigured()) return null;

  const { data, error } = await supabase
    .from('screens')
    .insert(screen)
    .select()
    .single();

  if (error) {
    console.error('Error creating screen:', error);
    throw error;
  }

  return data as DbScreen;
}

/**
 * Update an existing screen
 */
export async function updateScreen(id: string, updates: ScreenUpdate): Promise<DbScreen | null> {
  if (!isSupabaseConfigured()) return null;

  const { data, error } = await supabase
    .from('screens')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating screen:', error);
    throw error;
  }

  return data as DbScreen;
}

/**
 * Delete a screen
 */
export async function deleteScreen(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const { error } = await supabase
    .from('screens')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting screen:', error);
    throw error;
  }

  return true;
}

/**
 * Fetch all versions for a screen
 */
export async function fetchScreenVersions(screenId: string): Promise<DbScreenVersion[]> {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase
    .from('screen_versions')
    .select('*')
    .eq('screen_id', screenId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching screen versions:', error);
    return [];
  }

  return (data as DbScreenVersion[]) || [];
}

/**
 * Create a new screen version
 */
export async function createScreenVersion(version: ScreenVersionInsert): Promise<DbScreenVersion | null> {
  if (!isSupabaseConfigured()) return null;

  const { data, error } = await supabase
    .from('screen_versions')
    .insert(version)
    .select()
    .single();

  if (error) {
    console.error('Error creating screen version:', error);
    throw error;
  }

  // Also update the screen's html and updated_at
  await supabase
    .from('screens')
    .update({ html: version.html })
    .eq('id', version.screen_id);

  return data as DbScreenVersion;
}

/**
 * Upload screen HTML and create initial version
 */
export async function uploadScreen(
  userId: string,
  name: string,
  fileName: string,
  html: string,
  tags?: string[]
): Promise<DbScreen | null> {
  if (!isSupabaseConfigured()) return null;

  // Create the screen
  const screen = await createScreen({
    user_id: userId,
    name,
    file_name: fileName,
    html,
    file_path: null,
    thumbnail: null,
    tags: tags || [],
  });

  if (screen) {
    // Create initial version
    await createScreenVersion({
      screen_id: screen.id,
      html,
      prompt: null,
      description: 'Initial upload',
    });
  }

  return screen;
}

/**
 * Duplicate a screen
 */
export async function duplicateScreen(id: string, userId: string): Promise<DbScreen | null> {
  if (!isSupabaseConfigured()) return null;

  const original = await fetchScreen(id);
  if (!original) return null;

  return createScreen({
    user_id: userId,
    name: `${original.name} (Copy)`,
    file_name: original.file_name,
    file_path: original.file_path,
    html: original.html,
    thumbnail: original.thumbnail,
    tags: original.tags,
  });
}

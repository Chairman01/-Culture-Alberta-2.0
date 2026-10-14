import { getServiceClient } from '@/lib/supabase-admin'

// ---------------------------------------------------------------------------
// TikTok sound choices: one per article (picked in the editor) and a default
// used whenever an article has none. Stored in tiktok_sound_choices and
// social_settings (service-role only).
// ---------------------------------------------------------------------------

export interface SoundChoice {
  musicSoundId: string
  name?: string | null
  artist?: string | null
}

const DEFAULT_KEY = 'tiktok_default_sound'

function clean(choice: SoundChoice): SoundChoice {
  return {
    musicSoundId: String(choice.musicSoundId).slice(0, 128),
    name: choice.name ? String(choice.name).slice(0, 256) : null,
    artist: choice.artist ? String(choice.artist).slice(0, 256) : null,
  }
}

export function isSoundChoice(v: unknown): v is SoundChoice {
  return !!v && typeof v === 'object' && typeof (v as SoundChoice).musicSoundId === 'string' && (v as SoundChoice).musicSoundId.length > 0
}

export async function getArticleSound(articleId: string): Promise<SoundChoice | null> {
  const { data } = await getServiceClient()
    .from('tiktok_sound_choices')
    .select('music_sound_id, sound_name, artist')
    .eq('article_id', articleId)
    .maybeSingle()
  return data ? { musicSoundId: data.music_sound_id, name: data.sound_name, artist: data.artist } : null
}

/** Save the editor's pick; null clears it so the default applies. */
export async function setArticleSound(articleId: string, choice: SoundChoice | null): Promise<void> {
  const supabase = getServiceClient()
  if (!choice) {
    await supabase.from('tiktok_sound_choices').delete().eq('article_id', articleId)
    return
  }
  const c = clean(choice)
  const { error } = await supabase.from('tiktok_sound_choices').upsert(
    { article_id: articleId, music_sound_id: c.musicSoundId, sound_name: c.name, artist: c.artist, updated_at: new Date().toISOString() },
    { onConflict: 'article_id' }
  )
  if (error) throw new Error(`Could not save the TikTok sound: ${error.message}`)
}

export async function getDefaultSound(): Promise<SoundChoice | null> {
  const { data } = await getServiceClient().from('social_settings').select('value').eq('key', DEFAULT_KEY).maybeSingle()
  return isSoundChoice(data?.value) ? (data!.value as SoundChoice) : null
}

export async function setDefaultSound(choice: SoundChoice | null): Promise<void> {
  const supabase = getServiceClient()
  if (!choice) {
    await supabase.from('social_settings').delete().eq('key', DEFAULT_KEY)
    return
  }
  const { error } = await supabase
    .from('social_settings')
    .upsert({ key: DEFAULT_KEY, value: clean(choice), updated_at: new Date().toISOString() }, { onConflict: 'key' })
  if (error) throw new Error(`Could not save the default TikTok sound: ${error.message}`)
}

/** The sound an article will post with: its own pick, else the default. */
export async function resolveSound(articleId: string): Promise<{ sound: SoundChoice | null; source: 'article' | 'default' | 'none' }> {
  const own = await getArticleSound(articleId).catch(() => null)
  if (own) return { sound: own, source: 'article' }
  const fallback = await getDefaultSound().catch(() => null)
  if (fallback) return { sound: fallback, source: 'default' }
  return { sound: null, source: 'none' }
}

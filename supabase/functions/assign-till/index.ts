import { serve } from 'https://deno.land/std/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

/* ⚡ Edge in-memory cache (per instance) */
const cache = new Map<number, { till: string; expires: number }>()

serve(async (req) => {
  try {
    const { level } = await req.json()
    if (!level) return new Response('Missing level', { status: 400 })

    const now = Date.now()

    const cached = cache.get(level)
    if (cached && cached.expires > now) {
      return Response.json({ till: cached.till })
    }

    const { data, error } = await supabase.rpc('get_next_till', {
      p_level: level,
    })

    if (error || !data) {
      return new Response('Till unavailable', { status: 500 })
    }

    cache.set(level, {
      till: data,
      expires: now + 30_000, // 30 seconds
    })

    return Response.json({ till: data })
  } catch {
    return new Response('Bad request', { status: 400 })
  }
})
import { createClient } from '@supabase/supabase-js'

const supabase = createClient('https://<your-project-ref>.supabase.co', 'public-anon-key')

const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'http://localhost:3000', // or your deployed URL
    },
  })
}

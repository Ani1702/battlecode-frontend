import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jvugtkpivmeohiulibyg.supabase.co'; // Replace with your Supabase project URL
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2dWd0a3Bpdm1lb2hpdWxpYnlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2ODE5NjEsImV4cCI6MjA2NDI1Nzk2MX0.H5U0P_H3deWQFlItKZlzQAO7WJ6EnMyhNdwUW3FtRWo'; // Replace with your Supabase anon key

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://qvvreivgwrdbfhukfnxe.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2dnJlaXZnd3JkYmZodWtmbnhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjI3NDE3OTAsImV4cCI6MjAzODMxNzc5MH0.5rYJXaUe4aXI-G3qG4d7_rXaY8cHqaXaRMVMdBLvQpU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type Database = any;

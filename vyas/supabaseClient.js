import { createClient } from '@supabase/supabase-js'

const supabaseUrl =  'https://deotatvivvscbmqxohfq.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlb3RhdHZpdnZzY2JtcXhvaGZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5NDk4NzgsImV4cCI6MjEwNzUyNTg3OH0._6DVTReQkYdv0kIQoOBcdSwm701wB92FTTly7o77uUU'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

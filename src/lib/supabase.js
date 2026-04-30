import { createClient } from "@supabase/supabase-js";

// Estas credenciales las sacas de Settings > API en tu panel de Supabase
const supabaseUrl = "https://amqecnxufezrdqirtfno.supabase.co";
const supabaseKey = "sb_publishable_HY0XOkCrKkZr4CTsiWW2lA_6w3tD1oL";

export const supabase = createClient(supabaseUrl, supabaseKey);

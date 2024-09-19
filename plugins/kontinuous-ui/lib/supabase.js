const { createClient } = require("@supabase/supabase-js")

const { SUPABASE_URL: supabaseUrl, SUPABASE_KEY: supabaseKey } = process.env

const supabase = createClient(supabaseUrl, supabaseKey)

module.exports = supabase

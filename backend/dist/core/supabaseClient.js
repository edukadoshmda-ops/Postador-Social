"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = exports.isSupabaseConfigured = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const isSupabaseConfigured = () => {
    return Boolean(supabaseUrl && supabaseKey && supabaseUrl.startsWith('https://'));
};
exports.isSupabaseConfigured = isSupabaseConfigured;
let clientInstance = null;
if ((0, exports.isSupabaseConfigured)()) {
    try {
        clientInstance = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
        });
        console.log('✅ Supabase conectado com sucesso na nuvem!');
    }
    catch (err) {
        console.error('⚠️ Falha ao inicializar cliente Supabase:', err);
    }
}
else {
    console.log('ℹ️ Supabase não configurado no .env. Usando armazenamento local.');
}
exports.supabase = clientInstance;

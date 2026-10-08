/* ============================================================================
   FERREIRA TATTOO — config.js
   Configuração de conexão com o Supabase (equivalente às variáveis de
   ambiente VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — este projeto é
   HTML estático, sem etapa de build, então a configuração vive neste arquivo).

   Onde achar os valores: Supabase > Project Settings > API
     - Project URL            -> SUPABASE_URL
     - Publishable key (sb_publishable_...) ou a legada anon -> SUPABASE_ANON_KEY
       (Settings > API Keys)

   ATENÇÃO:
   - Use SOMENTE a chave pública (Publishable / anon). Ela é feita para ficar no navegador:
     quem protege os dados são as regras RLS do banco, não o sigilo da chave.
   - NUNCA coloque aqui a "Secret key" nem a "service_role" (ela ignora toda a segurança).
   ============================================================================ */
window.FERREIRA_CONFIG = {
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: ''
};

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Host fixo em IPv4 (nunca "::1"/IPv6, nunca todas as interfaces) — o navegador precisa acessar
    // sempre o mesmo host que a API (Bloco 19), senão o cookie de sessão SameSite=Lax é bloqueado em
    // requisições fetch entre "localhost" e "127.0.0.1" (hosts diferentes para o navegador).
    host: '127.0.0.1',
    proxy: {
      // Encaminha `/api/*` para a API local (também presa a 127.0.0.1, `apps/api/src/http/server.ts`)
      // sem nunca expor `127.0.0.1:3000` diretamente ao navegador — do ponto de vista do navegador,
      // toda chamada é same-origin (`127.0.0.1:5173`), então o cookie HttpOnly/SameSite=Lax funciona
      // normalmente, sem precisar de SameSite=None nem de expor a API fora do loopback.
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
})

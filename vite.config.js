import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true, // Permite acceder al servidor desde otros dispositivos en la misma red local (ej. tu celular)
    port: 3000
  }
});

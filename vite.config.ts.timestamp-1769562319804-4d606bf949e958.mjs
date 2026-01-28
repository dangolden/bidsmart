// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.js";
import path from "path";
var __vite_injected_original_dirname = "/home/project";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    {
      name: "configure-response-headers",
      configureServer: (server) => {
        server.middlewares.use((_req, res, next) => {
          res.setHeader(
            "Content-Security-Policy",
            "frame-ancestors 'self' http://localhost:* https://localhost:* https://switchison.org https://*.switchison.org https://homedoc.us https://*.homedoc.us https://bolt.new https://*.bolt.new https://stackblitz.com https://*.stackblitz.com"
          );
          res.setHeader("X-Frame-Options", "ALLOWALL");
          res.setHeader("X-Content-Type-Options", "nosniff");
          res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
          next();
        });
      }
    }
  ],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  server: {
    port: 3e3,
    open: true
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          supabase: ["@supabase/supabase-js"]
        }
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtcbiAgICByZWFjdCgpLFxuICAgIHtcbiAgICAgIG5hbWU6ICdjb25maWd1cmUtcmVzcG9uc2UtaGVhZGVycycsXG4gICAgICBjb25maWd1cmVTZXJ2ZXI6IChzZXJ2ZXIpID0+IHtcbiAgICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZSgoX3JlcSwgcmVzLCBuZXh0KSA9PiB7XG4gICAgICAgICAgLy8gRGV2ZWxvcG1lbnQgQ1NQOiBBbGxvdyBlbWJlZGRpbmcgaW4gYWxsIGF1dGhvcml6ZWQgZG9tYWluc1xuICAgICAgICAgIC8vIEluY2x1ZGVzIGxvY2FsaG9zdCwgSG9tZURvYyBkb21haW5zLCBjbGllbnQgZG9tYWlucywgYW5kIHRlc3QgZW52aXJvbm1lbnRzXG4gICAgICAgICAgcmVzLnNldEhlYWRlcihcbiAgICAgICAgICAgICdDb250ZW50LVNlY3VyaXR5LVBvbGljeScsXG4gICAgICAgICAgICBcImZyYW1lLWFuY2VzdG9ycyAnc2VsZicgaHR0cDovL2xvY2FsaG9zdDoqIGh0dHBzOi8vbG9jYWxob3N0OiogXCIgK1xuICAgICAgICAgICAgXCJodHRwczovL3N3aXRjaGlzb24ub3JnIGh0dHBzOi8vKi5zd2l0Y2hpc29uLm9yZyBcIiArXG4gICAgICAgICAgICBcImh0dHBzOi8vaG9tZWRvYy51cyBodHRwczovLyouaG9tZWRvYy51cyBcIiArXG4gICAgICAgICAgICBcImh0dHBzOi8vYm9sdC5uZXcgaHR0cHM6Ly8qLmJvbHQubmV3IFwiICtcbiAgICAgICAgICAgIFwiaHR0cHM6Ly9zdGFja2JsaXR6LmNvbSBodHRwczovLyouc3RhY2tibGl0ei5jb21cIlxuICAgICAgICAgICk7XG4gICAgICAgICAgcmVzLnNldEhlYWRlcignWC1GcmFtZS1PcHRpb25zJywgJ0FMTE9XQUxMJyk7XG4gICAgICAgICAgcmVzLnNldEhlYWRlcignWC1Db250ZW50LVR5cGUtT3B0aW9ucycsICdub3NuaWZmJyk7XG4gICAgICAgICAgcmVzLnNldEhlYWRlcignUmVmZXJyZXItUG9saWN5JywgJ3N0cmljdC1vcmlnaW4td2hlbi1jcm9zcy1vcmlnaW4nKTtcbiAgICAgICAgICBuZXh0KCk7XG4gICAgICAgIH0pO1xuICAgICAgfSxcbiAgICB9LFxuICBdLFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgICdAJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjJyksXG4gICAgfSxcbiAgfSxcbiAgc2VydmVyOiB7XG4gICAgcG9ydDogMzAwMCxcbiAgICBvcGVuOiB0cnVlLFxuICB9LFxuICBidWlsZDoge1xuICAgIG91dERpcjogJ2Rpc3QnLFxuICAgIHNvdXJjZW1hcDogdHJ1ZSxcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICBvdXRwdXQ6IHtcbiAgICAgICAgbWFudWFsQ2h1bmtzOiB7XG4gICAgICAgICAgdmVuZG9yOiBbJ3JlYWN0JywgJ3JlYWN0LWRvbScsICdyZWFjdC1yb3V0ZXItZG9tJ10sXG4gICAgICAgICAgc3VwYWJhc2U6IFsnQHN1cGFiYXNlL3N1cGFiYXNlLWpzJ10sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBeU4sU0FBUyxvQkFBb0I7QUFDdFAsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sVUFBVTtBQUZqQixJQUFNLG1DQUFtQztBQUt6QyxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTjtBQUFBLE1BQ0UsTUFBTTtBQUFBLE1BQ04saUJBQWlCLENBQUMsV0FBVztBQUMzQixlQUFPLFlBQVksSUFBSSxDQUFDLE1BQU0sS0FBSyxTQUFTO0FBRzFDLGNBQUk7QUFBQSxZQUNGO0FBQUEsWUFDQTtBQUFBLFVBS0Y7QUFDQSxjQUFJLFVBQVUsbUJBQW1CLFVBQVU7QUFDM0MsY0FBSSxVQUFVLDBCQUEwQixTQUFTO0FBQ2pELGNBQUksVUFBVSxtQkFBbUIsaUNBQWlDO0FBQ2xFLGVBQUs7QUFBQSxRQUNQLENBQUM7QUFBQSxNQUNIO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssS0FBSyxRQUFRLGtDQUFXLE9BQU87QUFBQSxJQUN0QztBQUFBLEVBQ0Y7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE1BQU07QUFBQSxFQUNSO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxRQUFRO0FBQUEsSUFDUixXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsTUFDYixRQUFRO0FBQUEsUUFDTixjQUFjO0FBQUEsVUFDWixRQUFRLENBQUMsU0FBUyxhQUFhLGtCQUFrQjtBQUFBLFVBQ2pELFVBQVUsQ0FBQyx1QkFBdUI7QUFBQSxRQUNwQztBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==

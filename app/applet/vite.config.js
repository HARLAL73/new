import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

function imageUploadPlugin() {
  return {
    name: 'image-upload-endpoint',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const parsedUrl = req.url ? req.url.split('?')[0] : '';
        if (parsedUrl === '/api/upload-image' || parsedUrl === '/api/upload-image/') {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
              try {
                const data = JSON.parse(body);
                const rawImage = data.image || '';
                const base64Data = rawImage.replace(/^data:image\/\w+;base64,/, '');
                const filename = data.filename || `img_${Date.now()}.jpg`;
                const cleanFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
                const finalName = cleanFilename.startsWith('img_') ? cleanFilename : `img_${Date.now()}_${cleanFilename}`;
                
                const uploadsDir = path.resolve(process.cwd(), 'public/uploads');
                if (!fs.existsSync(uploadsDir)) {
                  fs.mkdirSync(uploadsDir, { recursive: true });
                }
                const filePath = path.join(uploadsDir, finalName);
                fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
                
                const distUploads = path.resolve(process.cwd(), 'dist/uploads');
                if (fs.existsSync(path.resolve(process.cwd(), 'dist'))) {
                  if (!fs.existsSync(distUploads)) fs.mkdirSync(distUploads, { recursive: true });
                  fs.copyFileSync(filePath, path.join(distUploads, finalName));
                }

                const fileUrl = `/uploads/${finalName}`;
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, url: fileUrl }));
              } catch(e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: e.message }));
              }
            });
            return;
          } else {
            res.writeHead(405);
            res.end('Method Not Allowed');
            return;
          }
        }
        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), imageUploadPlugin()],
  server: {
    host: '0.0.0.0',
    port: 3000
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
});

import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { calculateCartTotal, PricingRequest } from './services/pricing.service';
import { processImageWithWatermark } from './services/image.service';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Multer en memoria para procesamiento directo en streaming con Sharp
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB por foto
});

// Ruta Health Check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    brand: 'LA TERCERA',
    author: 'Jenifer "Yuyo" Espeche',
    timestamp: new Date().toISOString()
  });
});

// Endpoint: Cálculo de Precios y Descuentos
app.post('/api/pricing/calculate', (req: Request, res: Response) => {
  try {
    const pricingReq: PricingRequest = req.body;
    const result = calculateCartTotal(pricingReq);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Endpoint: Subida y Procesamiento de Imagen con Marca de Agua
app.post('/api/images/process', upload.single('photo'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se envió ningún archivo de imagen' });
    }

    const isHD = req.body.isHD === 'true';
    const watermarkText = req.body.watermarkText || 'LA TERCERA • MUESTRA';

    const processed = await processImageWithWatermark(req.file.buffer, {
      isHD,
      watermarkText,
      targetWidth: 800,
      quality: 70
    });

    res.json({
      success: true,
      originalSize: req.file.size,
      previewSize: processed.previewBuffer.length,
      width: processed.width,
      height: processed.height,
      format: processed.format,
      isHD
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint: Catálogo de Álbumes
app.get('/api/albums', (req: Request, res: Response) => {
  const sampleAlbums = [
    {
      id: 'album-1',
      category: 'futbol',
      title: 'Atlético Tesorieri vs Andino SC',
      subtitle: 'Liga Riojana de Fútbol • Fecha 7',
      date: '12 Octubre, 2026',
      photosCount: 48,
      unitPrice: 1200,
      fullAlbumPrice: 9500,
      coverUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80',
      badge: '⚽ Fútbol'
    },
    {
      id: 'album-2',
      category: 'hockey',
      title: 'Torneo Provincial de Hockey Femenino',
      subtitle: 'Polideportivo Evita • Semifinales',
      date: '5 Octubre, 2026',
      photosCount: 36,
      unitPrice: 1200,
      fullAlbumPrice: 9500,
      coverUrl: 'https://images.unsplash.com/photo-1589487391730-58f20eb2c308?auto=format&fit=crop&w=800&q=80',
      badge: '🏑 Hockey'
    },
    {
      id: 'album-3',
      category: 'basquet',
      title: 'Facundo vs Banco Rioja (Primera Básquet)',
      subtitle: 'Torneo Clausura de Básquetbol',
      date: '28 Septiembre, 2026',
      photosCount: 42,
      unitPrice: 1200,
      fullAlbumPrice: 9500,
      coverUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=800&q=80',
      badge: '🏀 Básquet'
    },
    {
      id: 'album-4',
      category: 'sociales',
      title: 'Cumpleaños de 15 de Martina',
      subtitle: 'Salón Las Retamas • Festejo & Baile',
      date: '20 Septiembre, 2026',
      photosCount: 85,
      unitPrice: 1200,
      fullAlbumPrice: 9500,
      coverUrl: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=800&q=80',
      badge: '🎉 Cumpleaños & Social'
    }
  ];

  res.json({ albums: sampleAlbums });
});

app.listen(PORT, () => {
  console.log(`[La Tercera API] Servidor iniciado en http://localhost:${PORT}`);
});

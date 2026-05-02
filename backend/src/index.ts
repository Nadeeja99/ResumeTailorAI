import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import resumeRoutes from './routes/resume.js';

config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors({ origin: ['http://localhost:8080', 'http://localhost:5173'] }));
app.use(express.json({ limit: '2mb' }));

app.use('/api', resumeRoutes);

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});

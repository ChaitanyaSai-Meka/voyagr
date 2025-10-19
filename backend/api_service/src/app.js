import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import authRoutes from './api/auth/auth.routes.js';

dotenv.config();

const app =express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Voyagr API is running');
});

app.use('/api/auth', authRoutes);

app.listen(port, () => {
  console.log(`Voyagr API is running on port ${port}`);
});

export default app;
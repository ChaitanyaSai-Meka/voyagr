import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import authRoutes from './api/auth/auth.routes.js';
import profileRoutes from './api/profiles/profiles.routes.js';
import routesRoutes from './api/routes/routes.routes.js';
import savedRoutes from './api/saved/saved.routes.js';
import historyRoutes from './api/history/history.routes.js';
import feedbackRoutes from './api/feedback/feedback.routes.js';
import stationsRoutes from './api/stations/stations.routes.js';

dotenv.config();

const app =express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Voyagr API is running');
});

app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/routes', routesRoutes);
app.use('/api/saved', savedRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/stations', stationsRoutes);

app.listen(port, () => {
  console.log(`Voyagr API is running on port ${port}`);
});

export default app;
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import pointsRouter from './routes/points';
import leaderboardRouter from './routes/leaderboard';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/points', pointsRouter);
app.use('/leaderboard', leaderboardRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

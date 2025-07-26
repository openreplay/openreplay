import 'dotenv/config';
import express from 'express';
import exportRoute from './export_route.js';

const app = express();
app.use(express.json());
app.use('/export', exportRoute);

app.use((err, _req, res, _next) => {
  console.error(err, _req)
  res.status(500).json({ error: 'internal_error' });
});

const port = process.env.PORT || 3000;
app.listen(port, () =>
  console.log(`api up on ${port}`),
);

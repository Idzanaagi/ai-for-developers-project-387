import 'dotenv/config';
import app from './app.js';
import { PORT } from './config.js';

app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});

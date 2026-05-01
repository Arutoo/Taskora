import 'dotenv/config';
import app from './app';

const PORT = parseInt(process.env.PORT ?? '3000', 10);

app.listen(PORT, () => {
  console.log(`Taskora backend running on port ${PORT}`);
});

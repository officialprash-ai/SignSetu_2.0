import { systemRouter } from './_core/systemRouter';
import { router } from './_core/trpc';
import { translationRouter } from './routers/translation';
import { voiceRouter } from './routers/voice';
import { historyRouter } from './routers/history';
import { preferencesRouter } from './routers/preferences';
import { dictionaryRouter } from './routers/dictionary';
import { authRouter } from './routers/auth';
import { statsRouter } from './routers/stats';
import { youtubeRouter } from './routers/youtube';

export const appRouter = router({
  system: systemRouter,
  translation: translationRouter,
  voice: voiceRouter,
  history: historyRouter,
  preferences: preferencesRouter,
  dictionary: dictionaryRouter,
  stats: statsRouter,
  youtube: youtubeRouter,
  auth: authRouter,
});

export type AppRouter = typeof appRouter;

import { z } from 'zod';
import { catalogQuerySchema, publicCatalog } from '@/features/quizzes/catalog';
import { adultAllowed } from '@/features/solo/identity';
import { applicationRate, json, failure } from '@/features/quizzes/transport';
export async function GET(request: Request) {
  try {
    const raw = Object.fromEntries(new URL(request.url).searchParams);
    const locale = z.enum(['en', 'uk', 'fr']).parse(raw.locale ?? 'en');
    delete raw.locale;
    const query = catalogQuerySchema.strict().parse(raw);
    await applicationRate('catalog');
    return json(await publicCatalog(locale, query, await adultAllowed()));
  } catch (error) {
    return failure(error);
  }
}

import { eligibleVersion } from '@/features/quizzes/catalog';
import { adultAllowed } from '@/features/solo/identity';
import {
  applicationRate,
  json,
  failure,
  ApiError,
} from '@/features/quizzes/transport';
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await applicationRate('quiz-read');
    const { id } = await params;
    const document = await eligibleVersion(id, await adultAllowed());
    if (!document) throw new ApiError('NOT_FOUND', 404);
    return json({ versionId: id, document });
  } catch (error) {
    return failure(error);
  }
}

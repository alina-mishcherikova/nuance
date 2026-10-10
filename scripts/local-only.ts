export function assertLocalDatabase(connectionString: string | undefined) {
  let host = '';
  try {
    host = new URL(connectionString ?? '').hostname;
  } catch {
    throw new Error('Tests and development seeds require a local database');
  }
  if (
    process.env.NODE_ENV === 'production' ||
    !['localhost', '127.0.0.1', 'postgres'].includes(host)
  )
    throw new Error('Tests and development seeds require a local database');
}
export function assertLocalApp(baseURL: string) {
  let host = '';
  try {
    host = new URL(baseURL).hostname;
  } catch {
    throw new Error('Browser tests require a local application');
  }
  if (!['localhost', '127.0.0.1'].includes(host))
    throw new Error('Browser tests require a local application');
}

import { randomUUID } from 'node:crypto';
import { Pool, type PoolClient } from 'pg';
import {
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  describe,
  it,
  expect,
} from 'vitest';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
let client: PoolClient;
let userId: string,
  categoryId: string,
  quizId: string,
  versionId: string,
  questionId: string;
async function rejects(
  query: string,
  values: unknown[] = [],
  message?: string,
) {
  await client.query('SAVEPOINT invalid');
  await expect(client.query(query, values)).rejects.toThrow(message);
  await client.query('ROLLBACK TO SAVEPOINT invalid');
}
beforeAll(async () => {
  client = await pool.connect();
});
afterAll(async () => {
  client.release();
  await pool.end();
});
beforeEach(async () => {
  await client.query('BEGIN');
  userId = randomUUID();
  categoryId = randomUUID();
  quizId = randomUUID();
  versionId = randomUUID();
  questionId = randomUUID();
  await client.query('INSERT INTO users(id,name,email) VALUES ($1,$2,$3)', [
    userId,
    'Test',
    `${userId}@example.test`,
  ]);
  await client.query('INSERT INTO categories(id,slug) VALUES ($1,$2)', [
    categoryId,
    categoryId,
  ]);
  await client.query(
    'INSERT INTO quizzes(id,owner_id,slug) VALUES ($1,$2,$3)',
    [quizId, userId, quizId],
  );
  await client.query(
    'INSERT INTO quiz_versions(id,quiz_id,version,category_id,scoring_config) VALUES ($1,$2,1,$3,$4)',
    [
      versionId,
      quizId,
      categoryId,
      JSON.stringify({ schemaVersion: 1, algorithm: 'none', weights: [] }),
    ],
  );
  await client.query(
    "INSERT INTO questions(id,version_id,position,kind) VALUES ($1,$2,0,'SINGLE')",
    [questionId, versionId],
  );
});
afterEach(async () => {
  await client.query('ROLLBACK');
});
async function publish() {
  await client.query(
    "UPDATE quiz_versions SET status='PUBLISHED',published_at=now() WHERE id=$1",
    [versionId],
  );
}
async function room() {
  await publish();
  const id = randomUUID();
  await client.query(
    "INSERT INTO rooms(id,code,version_id,capacity,expires_at) VALUES ($1,'ABCDEFGH',$2,2,now()+interval '6 days')",
    [id, versionId],
  );
  return id;
}
async function participant(roomId: string) {
  const id = randomUUID();
  await client.query(
    "INSERT INTO participants(id,room_id,nickname,credential_hash,expires_at) VALUES ($1,$2,'Guest',$3,now()+interval '5 days')",
    [id, roomId, randomUUID().replaceAll('-', '').repeat(2)],
  );
  return id;
}
describe('actual PostgreSQL constraints', () => {
  it('enforces roles, normalized email, ordering and version uniqueness', async () => {
    await rejects("UPDATE users SET role='superuser' WHERE id=$1", [userId]);
    await rejects("UPDATE users SET email='UPPER@example.test' WHERE id=$1", [
      userId,
    ]);
    await rejects(
      "INSERT INTO questions(version_id,position,kind) VALUES ($1,0,'TEXT')",
      [versionId],
    );
    await rejects(
      'INSERT INTO quiz_versions(quiz_id,version,category_id,scoring_config) VALUES ($1,1,$2,$3)',
      [quizId, categoryId, '{}'],
    );
  });
  it('requires published content and prevents all published edits including moving children', async () => {
    await rejects(
      "INSERT INTO rooms(code,version_id,expires_at) VALUES ('ABCDEFGH',$1,now()+interval '6 days')",
      [versionId],
      'published',
    );
    await publish();
    await rejects(
      "UPDATE quiz_versions SET scoring_config='{}' WHERE id=$1",
      [versionId],
      'immutable',
    );
    await rejects(
      'UPDATE questions SET position=2 WHERE id=$1',
      [questionId],
      'immutable',
    );
    await rejects(
      'DELETE FROM questions WHERE id=$1',
      [questionId],
      'immutable',
    );
    await rejects(
      "INSERT INTO quiz_copy(version_id,locale,title,description) VALUES ($1,'en','Title','Description')",
      [versionId],
      'immutable',
    );
  });
  it('enforces capacity, retention and frozen membership', async () => {
    const id = await room();
    await participant(id);
    const second = await participant(id);
    await rejects(
      "INSERT INTO participants(room_id,nickname,credential_hash,expires_at) VALUES ($1,'Overflow',$2,now()+interval '5 days')",
      [id, 'a'.repeat(64)],
      'full',
    );
    await client.query(
      "UPDATE rooms SET status='IN_PROGRESS',started_at=now() WHERE id=$1",
      [id],
    );
    await rejects(
      "UPDATE participants SET nickname='Changed' WHERE id=$1",
      [second],
      'frozen',
    );
    await rejects('DELETE FROM participants WHERE id=$1', [second], 'frozen');
    await rejects(
      "UPDATE rooms SET status='LOBBY' WHERE id=$1",
      [id],
      'transition',
    );
    await rejects(
      "UPDATE rooms SET expires_at=now()+interval '8 days' WHERE id=$1",
      [id],
      'retention',
    );
  });
  it('rejects starting with one member', async () => {
    const id = await room();
    await participant(id);
    await rejects(
      "UPDATE rooms SET status='IN_PROGRESS',started_at=now() WHERE id=$1",
      [id],
      'start',
    );
  });
  it('binds answers to version/option and enforces singleton results', async () => {
    const option = randomUUID();
    await client.query(
      "INSERT INTO question_options(id,question_id,position,value) VALUES ($1,$2,0,'one')",
      [option, questionId],
    );
    await publish();
    const attempt = randomUUID();
    await client.query(
      'INSERT INTO attempts(id,version_id,user_id) VALUES ($1,$2,$3)',
      [attempt, versionId, userId],
    );
    const answer = randomUUID();
    await client.query(
      'INSERT INTO answers(id,attempt_id,question_id,version_id) VALUES ($1,$2,$3,$4)',
      [answer, attempt, questionId, versionId],
    );
    await rejects(
      'INSERT INTO answers(attempt_id,question_id,version_id) VALUES ($1,$2,$3)',
      [attempt, questionId, versionId],
    );
    await rejects(
      'INSERT INTO answer_options(answer_id,question_id,option_id) VALUES ($1,$2,$3)',
      [answer, questionId, randomUUID()],
    );
    await client.query(
      'INSERT INTO answer_options(answer_id,question_id,option_id) VALUES ($1,$2,$3)',
      [answer, questionId, option],
    );
    await client.query(
      "INSERT INTO result_snapshots(attempt_id,algorithm_version,payload) VALUES ($1,'none-v1',$2)",
      [
        attempt,
        JSON.stringify({ schemaVersion: 1, kind: 'solo', highlights: [] }),
      ],
    );
    await rejects(
      "INSERT INTO result_snapshots(attempt_id,algorithm_version,payload) VALUES ($1,'none-v1','{}')",
      [attempt],
    );
  });
  it('cascades expired temporary room graph while preserving published versions', async () => {
    const id = await room();
    const pid = await participant(id);
    await client.query(
      "INSERT INTO attempts(version_id,room_id,participant_id,expires_at) VALUES ($1,$2,$3,now()+interval '5 days')",
      [versionId, id, pid],
    );
    await client.query('DELETE FROM rooms WHERE id=$1', [id]);
    expect(
      (
        await client.query(
          'SELECT count(*)::int AS count FROM participants WHERE room_id=$1',
          [id],
        )
      ).rows[0].count,
    ).toBe(0);
    expect(
      (
        await client.query(
          'SELECT count(*)::int AS count FROM attempts WHERE room_id=$1',
          [id],
        )
      ).rows[0].count,
    ).toBe(0);
    expect(
      (
        await client.query('SELECT id FROM quiz_versions WHERE id=$1', [
          versionId,
        ])
      ).rowCount,
    ).toBe(1);
  });
  it('prevents guest results and credentials outliving their parents', async () => {
    const id = await room();
    const pid = await participant(id);
    await rejects(
      "UPDATE participants SET expires_at=now()+interval '6 days 1 hour' WHERE id=$1",
      [pid],
      'outlive',
    );
    await rejects(
      "INSERT INTO result_snapshots(room_id,algorithm_version,payload) VALUES ($1,'none-v1','{}')",
      [id],
      'outlive',
    );
    await rejects(
      "INSERT INTO attempts(version_id,room_id,participant_id,expires_at) VALUES ($1,$2,$3,now()+interval '6 days')",
      [versionId, id, pid],
      'outlive',
    );
  });
});

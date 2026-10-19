import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function testSql() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const endpoints = [
    '/pg/query',
    '/pg/v1/query',
    '/database/query',
    '/rest/v1/rpc/exec_sql',
    '/rest/v1/rpc/execute_sql',
    '/rest/v1/rpc/exec'
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(`${url}${ep}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': key!,
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({ query: 'SELECT 1;' })
      });
      console.log(`${ep} status:`, res.status, (await res.text()).slice(0, 100));
    } catch (e: any) {
      console.log(`${ep} error:`, e.message);
    }
  }
}

testSql().catch(console.error);

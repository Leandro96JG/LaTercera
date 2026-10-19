import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function getOpenApi() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const res = await fetch(`${url}/rest/v1/`, {
    headers: {
      'apikey': key!,
      'Authorization': `Bearer ${key}`
    }
  });

  const spec = (await res.json()) as any;
  console.log('Definitions in OpenAPI schema:', Object.keys(spec?.definitions || {}));
  console.log('Paths in OpenAPI schema:', Object.keys(spec?.paths || {}));
}

getOpenApi().catch(console.error);

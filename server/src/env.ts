import 'dotenv/config';

const requiredKeys = ['OPENAI_API_KEY', 'VECTOR_STORE_ID'] as const;

function loadEnv() {
  const values = requiredKeys.map((key) => ({ key, value: process.env[key] ?? '' }));
  const missing = values.filter((entry) => !entry.value);

  return {
    apiKey: process.env.OPENAI_API_KEY ?? '',
    vectorStoreId: process.env.VECTOR_STORE_ID ?? '',
    port: Number(process.env.PORT ?? '8080'),
    missingKeys: missing.map((entry) => entry.key),
    openaiEnabled: missing.length === 0
  };
}

export const env = loadEnv();

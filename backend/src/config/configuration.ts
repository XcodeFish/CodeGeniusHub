export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    uri: process.env.DATABASE_URI || 'mongodb://localhost:27017/codegeniushub',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },
  ai: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      models: ['gpt-3.5-turbo', 'gpt-4'],
    },
    azure: {
      apiKey: process.env.AZURE_OPENAI_API_KEY || '',
      endpoint: process.env.AZURE_OPENAI_ENDPOINT || '',
      models: ['gpt-35-turbo', 'gpt-4'],
    },
    deepseek: {
      apiKey: process.env.DEEPSEEK_API_KEY || '',
      baseUrl: process.env.DEEPSEEK_API_BASE_URL || 'https://api.deepseek.com',
      models: ['deepseek-chat', 'deepseek-reasoner'],
    },
    ollama: {
      apiUrl: process.env.OLLAMA_API_URL || 'http://localhost:11434',
      models: ['deepseek-r1:1.5b'],
      defaultModel: process.env.OLLAMA_DEFAULT_MODEL || 'deepseek-r1:1.5b',
      cacheEnabled: process.env.OLLAMA_CACHE_ENABLED === 'true' || true,
      requestTimeout: parseInt(
        process.env.OLLAMA_REQUEST_TIMEOUT || '30000',
        10,
      ),
    },
    // 其他AI提供商...
  },
  cache: {
    ttl: parseInt(process.env.CACHE_TTL || '3600', 10), // 默认缓存1小时
  },
});

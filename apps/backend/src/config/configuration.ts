export interface AppConfig {
  port: number;
  corsOrigins: string[];
  jwt: {
    accessSecret: string;
    accessExpiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };
  fileStorage: {
    driver: 'local';
    localPath: string;
  };
  mail: {
    // Sem RESEND_API_KEY, o envio de e-mail falha com um erro claro em vez de
    // silenciosamente não enviar — ver MailService.
    resendApiKey?: string;
    fromEmail: string;
  };
  // Sem ANTHROPIC_API_KEY, a leitura de cadeia de custódia por IA falha com
  // um erro claro em vez de tentar chamar a API sem credencial — ver
  // ClaudeOcrService.
  anthropicApiKey?: string;
  // Base usada para montar links "ver no portal" nos e-mails enviados (ex.:
  // PDF de Ordem de Serviço) — aponta para o app Next.js, não para a API.
  webAppUrl: string;
  // Pasta local (mesma máquina do backend) onde a Alvim organiza as cadeias
  // de custódia hoje: {raiz}/{código} - {composto}/{ano}/*.pdf. Usada só
  // pelo botão "Atualizar pastas" em /amostras, período de transição
  // enquanto nem tudo é carregado direto na plataforma. Sem valor definido,
  // o endpoint de sync retorna erro claro em vez de tentar ler um caminho
  // inexistente.
  custodyDocumentsSyncRoot?: string;
}

export default (): { app: AppConfig } => ({
  app: {
    port: parseInt(process.env.PORT ?? '3001', 10),
    // CSV para suportar múltiplos front-ends em dev: o painel web (3000) e o
    // Expo em modo web (8081) usado para testar o app mobile no navegador.
    corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:3000,http://localhost:8081')
      .split(',')
      .map((origin) => origin.trim()),
    jwt: {
      accessSecret: process.env.JWT_ACCESS_SECRET ?? 'change-me-access',
      accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
      refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'change-me-refresh',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    },
    fileStorage: {
      driver: 'local',
      localPath: process.env.FILE_STORAGE_LOCAL_PATH ?? './storage',
    },
    mail: {
      resendApiKey: process.env.RESEND_API_KEY,
      fromEmail: process.env.MAIL_FROM_EMAIL ?? 'onboarding@resend.dev',
    },
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    webAppUrl: process.env.WEB_APP_URL ?? 'http://localhost:3000',
    custodyDocumentsSyncRoot: process.env.CUSTODY_DOCUMENTS_SYNC_ROOT,
  },
});

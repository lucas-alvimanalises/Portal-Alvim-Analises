// Chaves usadas em TODOS os modelos de cadeia de custódia (ver seed.ts) pra
// nome e endereço da empresa — o agendamento já sabe qual é o cliente e seu
// endereço cadastrado (ver Client em Empresas), então esses dois campos
// nunca precisam ser digitados manualmente nem lidos pela IA (pedido do
// usuário). Usado tanto no backend (preencher automaticamente e excluir da
// pergunta feita à IA) quanto no frontend (renderizar como somente leitura
// na tela de conferência).
export const CLIENT_DERIVED_CUSTODY_FIELD_KEYS = ['empresa', 'endereco'] as const;

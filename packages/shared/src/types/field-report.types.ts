// Metadados do Relatório de Campo de um serviço — a linha só existe depois
// que um colaborador Alvim gera o relatório (GET retorna null antes disso).
// O cliente usa essa mesma resposta pra decidir se mostra o botão de
// download: nada aparece antes de existir (confirmado com o usuário).
export interface FieldReportDto {
  id: string;
  scheduleId: string;
  generatedByName: string;
  createdAt: string;
  updatedAt: string;
}

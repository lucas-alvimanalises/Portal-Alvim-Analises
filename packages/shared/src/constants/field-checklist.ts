// Check list de material de campo — adaptado do "CheckList Alvim
// Análises.xlsx" (planilha "MATERIAL PARA REALIZAÇÃO DO SERVIÇO DE CAMPO").
// Fixo no código (não no banco): só o que foi marcado (ver
// ServiceChecklist.checkedItems) é persistido, por chave — mudar um rótulo
// aqui não exige migração, só não repetir/reordenar chaves já usadas em
// checklists já salvos.
export interface FieldChecklistItem {
  key: string;
  label: string;
}

export interface FieldChecklistSection {
  key: string;
  label: string;
  items: FieldChecklistItem[];
}

export const FIELD_CHECKLIST_SECTIONS: FieldChecklistSection[] = [
  {
    key: 'vidrarias',
    label: 'Vidrarias',
    items: [
      { key: 'erlenmeyer', label: 'Erlenmeyer' },
      { key: 'manifold', label: 'Manifold' },
      { key: 'haste_pescoco_ganso', label: 'Haste "Pescoço de Ganso"' },
      { key: 'impingers', label: 'Impingers' },
      { key: 'impinger_seco', label: 'Impinger Seco' },
      { key: 'lavador_gas', label: 'Lavador de Gás' },
      { key: 'bolhometro_pequeno', label: 'Bolhômetro pequeno' },
      { key: 'bolhometro_medio', label: 'Bolhômetro médio' },
      { key: 'bolhometro_grande', label: 'Bolhômetro grande' },
    ],
  },
  {
    key: 'amostragem',
    label: 'Material p/ Amostragem',
    items: [
      { key: 'bombas', label: 'Bombas' },
      { key: 'ferramenta_calibrar_bomba', label: 'Ferramenta p/ Calibrar Bomba' },
      { key: 'mangueira_14', label: 'Mangueira 1/4' },
      { key: 'mangueira_silicone', label: 'Mangueira Silicone' },
      { key: 'amostradores', label: 'Amostradores' },
      { key: 'tubos_sacrificio', label: 'Tubos de Sacrifício' },
      { key: 'vials_lacre_borracha', label: 'VIALs + Lacre + Borracha' },
      { key: 'metanol', label: 'Metanol' },
      { key: 'presilhas_impingers', label: 'Presilhas p/ Impingers' },
      { key: 'etiquetas_siloxanos', label: 'Etiquetas Siloxanos' },
    ],
  },
  {
    key: 'ferramentas',
    label: 'Ferramentas',
    items: [
      { key: 'chave_inglesa_2x', label: '2x Chave Inglesa' },
      { key: 'alicate_bico', label: 'Alicate de Bico' },
      { key: 'crimper', label: 'Crimper (Lacrar VIALs)' },
      { key: 'tesoura', label: 'Tesoura' },
      { key: 'estilete', label: 'Estilete' },
      { key: 'chave_inglesa_grande', label: 'Chave Inglesa Grande' },
    ],
  },
  {
    key: 'cromatografia',
    label: 'Cromatografia',
    items: [
      { key: 'cromatografo', label: 'Cromatógrafo' },
      { key: 'gas_arraste', label: 'Gás de Arraste' },
      { key: 'gas_padrao', label: 'Gás Padrão' },
      { key: 'notebook', label: 'Notebook' },
      { key: 'cabo_rede', label: 'Cabo de Rede' },
      { key: 'anilhas_swagelok', label: 'Anilhas Swagelok' },
      { key: 'reguladores', label: 'Reguladores' },
      { key: 'mangueira_18', label: 'Mangueira 1/8' },
      { key: 'secador_gas_agilent', label: 'Secador de Gás Agilent' },
      { key: 'extensao_eletrica', label: 'Extensão Elétrica' },
      { key: 'nobreak', label: 'NoBreak' },
    ],
  },
  {
    key: 'umidade',
    label: 'Análise de Umidade',
    items: [{ key: 'analisador_umidade', label: 'Analisador de Umidade' }],
  },
  {
    key: 'auxiliar',
    label: 'Material Auxiliar',
    items: [
      { key: 'fitas_isolante_crepe', label: 'Fitas Isolantes; Crepe' },
      { key: 'rotametro', label: 'Rotâmetro' },
      { key: 'saco_plastico_zip', label: 'Saco Plastico ZIP' },
      { key: 'canetas', label: 'Canetas' },
      { key: 'garras_bolhometro', label: 'Garras p/ segurar Bolhômetro' },
      { key: 'pedestal_haste', label: 'Pedestal + Haste' },
      { key: 'pote_agua', label: 'Pote p/ Água' },
      { key: 'cadeias_custodia', label: 'Cadeias de Custódias' },
      { key: 'prancheta', label: 'Prancheta' },
      { key: 'pilhas_carregador_bomba', label: 'Pilhas + Carregador Bomba' },
      { key: 'luva_nitrilica', label: 'Luva Nitrilica' },
      { key: 'fita_filme', label: 'Fita Filme' },
      { key: 'papel_toalha', label: 'Papel Toalha' },
      { key: 'mesas', label: 'Mesas' },
      { key: 'cadeiras', label: 'Cadeiras' },
      { key: 'tenda', label: 'Tenda' },
      { key: 'caixas_termica', label: 'Caixas Térmica' },
      { key: 'mala_epis', label: 'Mala de EPIs' },
      { key: 'reducoes_12_14', label: 'Reduções 1/2 - 1/4' },
      { key: 'outras_conexoes', label: 'Outras conexões e reduções' },
    ],
  },
];

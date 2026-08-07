// Listas fixas do formulário de Manutenção da Planta — mesmo formato de
// FIELD_CHECKLIST_SECTIONS: chave estável salva no banco (ver
// PlantMaintenance.types/objectives), rótulo em pt-BR pra exibição. "Outro"
// não entra aqui — é tratado como um campo de texto livre separado
// (otherType/otherObjective) no formulário e no schema.
export interface MaintenanceOption {
  key: string;
  label: string;
}

export const MAINTENANCE_TYPE_OPTIONS: MaintenanceOption[] = [
  { key: 'compressor', label: 'Compressor' },
  { key: 'purification_system', label: 'Sistema de Purificação' },
  { key: 'activated_carbon', label: 'Carvão Ativado' },
  { key: 'filter', label: 'Filtro' },
  { key: 'membranes', label: 'Membranas' },
  { key: 'chiller', label: 'Chiller' },
  { key: 'blower', label: 'Soprador' },
  { key: 'burner', label: 'Queimador' },
  { key: 'flare', label: 'Flare' },
  { key: 'psa', label: 'PSA' },
  { key: 'scrubber', label: 'Lavador' },
  { key: 'dryer', label: 'Secador' },
  { key: 'instrumentation', label: 'Instrumentação' },
  { key: 'chromatograph', label: 'Cromatógrafo' },
  { key: 'valves', label: 'Válvulas' },
  { key: 'piping', label: 'Tubulações' },
  { key: 'generator', label: 'Motogerador' },
  { key: 'electrical_system', label: 'Sistema Elétrico' },
];

export const MAINTENANCE_OBJECTIVE_OPTIONS: MaintenanceOption[] = [
  { key: 'reduce_h2s', label: 'Reduzir H₂S' },
  { key: 'reduce_siloxanes', label: 'Reduzir Siloxanos' },
  { key: 'improve_psa_efficiency', label: 'Melhorar eficiência do PSA' },
  { key: 'replace_activated_carbon', label: 'Troca do carvão ativado' },
  { key: 'replace_membranes', label: 'Troca das membranas' },
  { key: 'clean_filters', label: 'Limpeza de filtros' },
  { key: 'fix_leaks', label: 'Correção de vazamentos' },
];

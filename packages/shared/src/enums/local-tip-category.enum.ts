export enum LocalTipCategory {
  FOOD = 'FOOD',
  SUPPLIES = 'SUPPLIES',
  LODGING = 'LODGING',
  OTHER = 'OTHER',
}

export const LOCAL_TIP_CATEGORY_LABELS_PT: Record<LocalTipCategory, string> = {
  [LocalTipCategory.FOOD]: 'Alimentação',
  [LocalTipCategory.SUPPLIES]: 'Insumos/Suprimentos',
  [LocalTipCategory.LODGING]: 'Hospedagem',
  [LocalTipCategory.OTHER]: 'Outro',
};

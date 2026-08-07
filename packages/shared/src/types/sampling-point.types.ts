export interface SamplingPointStandardDto {
  id: string;
  name: string;
  active: boolean;
}

export interface SamplingPointDto {
  id: string;
  clientId: string;
  // Nome que o próprio cliente usa para esse ponto.
  name: string;
  // Opcional: marca o ponto como equivalente a um tipo padrão comparável
  // entre empresas (ver SamplingPointStandardDto).
  standardId: string | null;
  standardName?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSamplingPointPayload {
  clientId: string;
  name: string;
  standardId?: string;
}

export type UpdateSamplingPointPayload = Partial<Omit<CreateSamplingPointPayload, 'clientId'>> & {
  active?: boolean;
};

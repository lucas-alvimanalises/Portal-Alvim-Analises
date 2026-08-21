import { CreateTrackingShipmentPayload, TrackingShipmentDto } from '@portal-alvim/shared';
import { apiClient } from './client';

export const trackingShipmentsApi = {
  list: () => apiClient.get<TrackingShipmentDto[]>('tracking-shipments'),
  create: (payload: CreateTrackingShipmentPayload) =>
    apiClient.post<TrackingShipmentDto>('tracking-shipments', payload),
  markDelivered: (id: string) =>
    apiClient.patch<TrackingShipmentDto>(`tracking-shipments/${id}/deliver`),
  remove: (id: string) => apiClient.delete<{ success: boolean }>(`tracking-shipments/${id}`),
};

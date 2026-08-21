import { CreateTrackingShipmentPayload, TrackingShipmentDto } from '@portal-alvim/shared';
import { apiClient } from './client';

export const trackingShipmentsApi = {
  list: async () => {
    const { data } = await apiClient.get<TrackingShipmentDto[]>('/tracking-shipments');
    return data;
  },
  create: async (payload: CreateTrackingShipmentPayload) => {
    const { data } = await apiClient.post<TrackingShipmentDto>('/tracking-shipments', payload);
    return data;
  },
  markDelivered: async (id: string) => {
    const { data } = await apiClient.patch<TrackingShipmentDto>(`/tracking-shipments/${id}/deliver`);
    return data;
  },
};

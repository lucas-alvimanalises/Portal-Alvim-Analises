export enum TrackingShipmentStatus {
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
}

export const TRACKING_SHIPMENT_STATUS_LABELS_PT: Record<TrackingShipmentStatus, string> = {
  [TrackingShipmentStatus.IN_TRANSIT]: 'No transporte',
  [TrackingShipmentStatus.DELIVERED]: 'Entregue',
};

export const TRACKING_SHIPMENT_STATUS_COLORS: Record<
  TrackingShipmentStatus,
  { background: string; text: string }
> = {
  [TrackingShipmentStatus.IN_TRANSIT]: { background: '#fef3c7', text: '#92400e' },
  [TrackingShipmentStatus.DELIVERED]: { background: '#dcfce7', text: '#15803d' },
};

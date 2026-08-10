import { CLIENT_DERIVED_CUSTODY_FIELD_KEYS, CustodyExtractedValue } from '@portal-alvim/shared';

interface ClientForCustodyFields {
  companyName: string;
  address: string | null;
  city: string | null;
  state: string | null;
}

function formatAddress(client: ClientForCustodyFields): string {
  const cityState = [client.city, client.state].filter(Boolean).join(' - ');
  return [client.address, cityState].filter(Boolean).join(', ');
}

// Empresa/Endereço já são conhecidos pelo agendamento (Client cadastrado em
// Empresas) — nunca precisam ser lidos pela IA nem digitados manualmente
// (pedido do usuário, ver CLIENT_DERIVED_CUSTODY_FIELD_KEYS). confidence: 1
// porque não é uma leitura incerta, é dado cadastral direto.
export function buildClientDerivedFields(
  client: ClientForCustodyFields,
): Record<(typeof CLIENT_DERIVED_CUSTODY_FIELD_KEYS)[number], CustodyExtractedValue> {
  return {
    empresa: { value: client.companyName, confidence: 1 },
    endereco: { value: formatAddress(client), confidence: 1 },
  };
}

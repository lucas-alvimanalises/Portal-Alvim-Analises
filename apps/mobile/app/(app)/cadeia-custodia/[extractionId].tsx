import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CLIENT_DERIVED_CUSTODY_FIELD_KEYS,
  CustodyExtractedValue,
  CustodyExtractedData,
} from '@portal-alvim/shared';
import { custodyExtractionsApi } from '../../../lib/api/custody-extractions.api';
import { servicePhotosApi } from '../../../lib/api/service-photos.api';
import { API_URL, getApiErrorMessage } from '../../../lib/api/client';
import { tokenStorage } from '../../../lib/auth/storage';

const LOW_CONFIDENCE_THRESHOLD = 0.7;

function emptyValue(): CustodyExtractedValue {
  return { value: '', confidence: 1 };
}

// Tela de conferência da digitalização inteligente — mesma lógica do portal
// web (ver cadeia-custodia/[extractionId]/page.tsx): mostra o escaneado ao
// lado (aqui, acima) dos campos lidos pela IA, destaca os de confiança
// baixa, permite corrigir, só gera o PDF oficial depois de aprovado. A
// tabela de amostragem (quando existe) é simplificada pra cartões por linha
// em vez da grade completa do web — mais fácil de usar num celular estreito.
export default function CadeiaDeCustodiaRevisaoScreen() {
  const { extractionId } = useLocalSearchParams<{ extractionId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [authHeader, setAuthHeader] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, CustodyExtractedValue> | null>(null);
  const [table, setTable] = useState<Record<string, Record<string, CustodyExtractedValue>> | null>(null);

  useEffect(() => {
    tokenStorage.getAccessToken().then((token) => {
      if (token) setAuthHeader(`Bearer ${token}`);
    });
  }, []);

  const { data: extraction, isLoading } = useQuery({
    queryKey: ['custody-extraction', extractionId],
    queryFn: () => custodyExtractionsApi.get(extractionId),
    refetchInterval: (query) => (query.state.data?.status === 'PROCESSING' ? 2000 : false),
    enabled: !!extractionId,
  });

  useEffect(() => {
    if (!extraction || fields || table) return;
    const source = extraction.correctedData ?? extraction.extractedData;
    if (!source) return;
    setFields(source.fields);
    setTable(source.table);
  }, [extraction, fields, table]);

  const { data: servicePhotos } = useQuery({
    queryKey: ['service-photos', extraction?.scheduleId],
    queryFn: () => servicePhotosApi.list(extraction!.scheduleId),
    enabled: !!extraction?.scheduleId,
  });

  const saveMutation = useMutation({
    mutationFn: (data: CustodyExtractedData) => custodyExtractionsApi.updateCorrections(extractionId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['custody-extraction', extractionId] }),
    onError: (error) =>
      Alert.alert('Não foi possível salvar', getApiErrorMessage(error, 'Tente novamente.')),
  });

  const approveMutation = useMutation({
    mutationFn: () => custodyExtractionsApi.approve(extractionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custody-extraction', extractionId] });
      if (extraction) {
        queryClient.invalidateQueries({ queryKey: ['custody-extractions', extraction.sampleId] });
        queryClient.invalidateQueries({ queryKey: ['samples'] });
      }
    },
    // A causa mais comum daqui é o aprovador não ter assinatura digital
    // cadastrada ainda (o backend já devolve essa mensagem específica, ver
    // ApproveCustodyExtractionUseCase) — antes o app mostrava só um erro
    // genérico, escondendo exatamente o que fazer (cadastrar a assinatura em
    // "Meu Perfil", no portal web).
    onError: (error) =>
      Alert.alert('Não foi possível aprovar', getApiErrorMessage(error, 'Tente novamente.')),
  });

  const selectPhotoMutation = useMutation({
    mutationFn: (photoId: string | null) => custodyExtractionsApi.selectPhoto(extractionId, photoId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['custody-extraction', extractionId] }),
    onError: (error) =>
      Alert.alert('Não foi possível selecionar a foto', getApiErrorMessage(error, 'Tente novamente.')),
  });

  function currentData(): CustodyExtractedData {
    return { fields: fields ?? {}, table: table ?? {} };
  }

  function setFieldValue(key: string, value: string) {
    setFields((current) => ({ ...(current ?? {}), [key]: { value, confidence: 1 } }));
  }

  function setTableValue(column: string, row: string, value: string) {
    setTable((current) => ({
      ...(current ?? {}),
      [column]: { ...(current?.[column] ?? {}), [row]: { value, confidence: 1 } },
    }));
  }

  if (isLoading || !extraction) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const schema = extraction.templateSchema;
  const isApproved = extraction.status === 'APPROVED';
  const canEdit = extraction.status === 'NEEDS_REVIEW';

  return (
    <>
      <Stack.Screen options={{ title: `Cadeia de Custódia — ${extraction.compoundName}` }} />
      <ScrollView contentContainerStyle={styles.container}>
        {extraction.status === 'PROCESSING' && (
          <View style={styles.card}>
            <Text style={styles.infoText}>A IA está lendo o formulário enviado, aguarde...</Text>
            <ActivityIndicator style={{ marginTop: 8 }} />
          </View>
        )}

        {extraction.status === 'FAILED' && (
          <View style={styles.card}>
            <Text style={styles.errorText}>
              Falha na leitura: {extraction.errorMessage ?? 'erro desconhecido.'}
            </Text>
            <Pressable style={styles.actionButtonSecondary} onPress={() => router.back()}>
              <Text style={styles.actionButtonSecondaryText}>Voltar e tentar de novo</Text>
            </Pressable>
          </View>
        )}

        {isApproved && (
          <View style={styles.card}>
            <Text style={styles.infoText}>Cadeia de custódia já aprovada e gerada.</Text>
          </View>
        )}

        {extraction.originalScanFilename && (
          <View style={[styles.card, { padding: 0, overflow: 'hidden' }]}>
            <Image
              source={{
                uri: custodyExtractionsApi.scanUrl(extraction.id),
                headers: authHeader ? { Authorization: authHeader } : undefined,
              }}
              style={styles.scanImage}
              resizeMode="contain"
            />
          </View>
        )}

        {(extraction.status === 'NEEDS_REVIEW' || isApproved) && fields && table && (
          <View style={styles.card}>
            {schema.fields.map((field) => {
              const isClientDerivedField = (CLIENT_DERIVED_CUSTODY_FIELD_KEYS as readonly string[]).includes(
                field.key,
              );
              if (field.fixedValue !== undefined || field.systemGenerated || isClientDerivedField) {
                const isSignatureField = field.key === schema.signatureFieldKey;
                return (
                  <View style={styles.field} key={field.key}>
                    <Text style={styles.fieldLabel}>{field.label}</Text>
                    <Text style={styles.fieldReadOnlyValue}>
                      {field.systemGenerated
                        ? 'Atribuído automaticamente na aprovação'
                        : isSignatureField
                          ? 'Assinatura digital de quem aprovar será inserida automaticamente'
                          : isClientDerivedField
                            ? fields[field.key]?.value || 'Preenchido automaticamente a partir do cadastro da empresa'
                            : field.fixedValue || '—'}
                    </Text>
                  </View>
                );
              }

              const current = fields[field.key] ?? emptyValue();
              const lowConfidence = current.confidence < LOW_CONFIDENCE_THRESHOLD;
              return (
                <View style={styles.field} key={field.key}>
                  <Text style={styles.fieldLabel}>{field.label}</Text>
                  <TextInput
                    style={[styles.input, lowConfidence && styles.inputLowConfidence]}
                    value={current.value}
                    onChangeText={(value) => setFieldValue(field.key, value)}
                    multiline={field.type === 'textarea'}
                    editable={canEdit}
                  />
                </View>
              );
            })}

            {schema.table.rows.length > 0 && (
              <View style={{ marginTop: 4 }}>
                <Text style={styles.tableTitle}>Tabela de amostragem</Text>
                {schema.table.rows.map((row) => (
                  <View key={row.key} style={styles.tableRowCard}>
                    <Text style={styles.tableRowLabel}>{row.label}</Text>
                    <ScrollView horizontal contentContainerStyle={{ gap: 8 }}>
                      {schema.table.columns.map((column) => {
                        const current = table[column]?.[row.key] ?? emptyValue();
                        const lowConfidence = current.confidence < LOW_CONFIDENCE_THRESHOLD;
                        return (
                          <View key={column} style={styles.tableCell}>
                            <Text style={styles.tableCellLabel}>{column}</Text>
                            <TextInput
                              style={[styles.tableCellInput, lowConfidence && styles.inputLowConfidence]}
                              value={current.value}
                              onChangeText={(value) => setTableValue(column, row.key, value)}
                              editable={canEdit}
                            />
                          </View>
                        );
                      })}
                    </ScrollView>
                  </View>
                ))}
              </View>
            )}

            <View style={{ marginTop: 4 }}>
              <Text style={styles.tableTitle}>Foto (opcional)</Text>
              <Text style={styles.sectionHint}>
                Entra no PDF gerado, abaixo de Observações. Envie fotos primeiro em &quot;Fotos do
                Serviço&quot;, na tela do serviço.
              </Text>
              {!servicePhotos || servicePhotos.length === 0 ? (
                <Text style={styles.sectionHint}>Nenhuma foto do serviço disponível ainda.</Text>
              ) : (
                <ScrollView horizontal contentContainerStyle={{ gap: 10 }}>
                  {servicePhotos.map((photo) => {
                    const selected = extraction.selectedPhotoId === photo.id;
                    return (
                      <Pressable
                        key={photo.id}
                        onPress={() => selectPhotoMutation.mutate(selected ? null : photo.id)}
                        disabled={isApproved || selectPhotoMutation.isPending}
                        style={[styles.photoOption, selected && styles.photoOptionSelected]}
                      >
                        <Image
                          source={{
                            uri: servicePhotosApi.fileUrl(photo.id, API_URL),
                            headers: authHeader ? { Authorization: authHeader } : undefined,
                          }}
                          style={styles.photoOptionImage}
                        />
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            {canEdit && (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <Pressable
                  style={[styles.actionButtonSecondary, { flex: 1 }]}
                  onPress={() => saveMutation.mutate(currentData())}
                  disabled={saveMutation.isPending}
                >
                  <Text style={styles.actionButtonSecondaryText}>
                    {saveMutation.isPending ? 'Salvando...' : 'Salvar rascunho'}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.actionButton, { flex: 1 }]}
                  onPress={async () => {
                    await saveMutation.mutateAsync(currentData());
                    approveMutation.mutate();
                  }}
                  disabled={approveMutation.isPending}
                >
                  <Text style={styles.actionButtonText}>
                    {approveMutation.isPending ? 'Gerando PDF...' : 'Aprovar e gerar PDF'}
                  </Text>
                </Pressable>
              </View>
            )}

            {approveMutation.isError && (
              <Text style={styles.errorText}>
                {getApiErrorMessage(approveMutation.error, 'Não foi possível aprovar. Tente novamente.')}
              </Text>
            )}
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: 16, gap: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e5e9',
    gap: 10,
  },
  infoText: { fontSize: 13, color: '#1f2937' },
  errorText: { fontSize: 13, color: '#b91c1c' },
  scanImage: { width: '100%', height: 280, backgroundColor: '#f1f5f9' },
  field: { gap: 4 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  fieldReadOnlyValue: { fontSize: 13, color: '#1f2937' },
  input: {
    backgroundColor: '#f5f6f8',
    borderWidth: 1,
    borderColor: '#e2e5e9',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
  },
  inputLowConfidence: { borderColor: '#e0a800', backgroundColor: '#fff8e1' },
  tableTitle: { fontSize: 14, fontWeight: '700', marginBottom: 6, color: '#1f2937' },
  sectionHint: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  tableRowCard: {
    borderWidth: 1,
    borderColor: '#e2e5e9',
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
  },
  tableRowLabel: { fontSize: 12, fontWeight: '700', marginBottom: 6, color: '#1f2937' },
  tableCell: { width: 100 },
  tableCellLabel: { fontSize: 10, color: '#6b7280', marginBottom: 2 },
  tableCellInput: {
    backgroundColor: '#f5f6f8',
    borderWidth: 1,
    borderColor: '#e2e5e9',
    borderRadius: 6,
    padding: 8,
    fontSize: 12,
  },
  photoOption: { borderRadius: 6, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e5e9' },
  photoOptionSelected: { borderWidth: 3, borderColor: '#1f5f4d' },
  photoOptionImage: { width: 90, height: 70 },
  actionButton: {
    backgroundColor: '#1f5f4d',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionButtonText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  actionButtonSecondary: {
    borderWidth: 1,
    borderColor: '#1f5f4d',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionButtonSecondaryText: { color: '#1f5f4d', fontWeight: '600', fontSize: 13 },
});

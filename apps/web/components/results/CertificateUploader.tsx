'use client';

import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { certificatesApi } from '../../lib/api/certificates.api';

interface CertificateUploaderProps {
  sampleId: string;
  // Opcional: além da invalidação própria (['certificates', sampleId]),
  // permite que uma tela diferente de onde este componente normalmente vive
  // (ex.: Certificados Pendentes, que lista amostras de vários serviços de
  // uma vez) também saiba que um certificado acabou de ser anexado — sem
  // acoplar este componente a nenhuma query key de fora.
  onUploaded?: () => void;
}

const ACCEPTED_EXTENSIONS = '.pdf,.xls,.xlsx,.jpg,.jpeg,.png';

export function CertificateUploader({ sampleId, onUploaded }: CertificateUploaderProps) {
  const queryClient = useQueryClient();
  const [certificateNumber, setCertificateNumber] = useState('');
  const [laboratory, setLaboratory] = useState('');
  const [analysisDate, setAnalysisDate] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!file) throw new Error('Selecione um arquivo.');
      return certificatesApi.upload(
        { sampleId, certificateNumber, laboratory, analysisDate, issueDate },
        file,
      );
    },
    onSuccess: () => {
      setCertificateNumber('');
      setLaboratory('');
      setAnalysisDate('');
      setIssueDate('');
      setFile(null);
      queryClient.invalidateQueries({ queryKey: ['certificates', sampleId] });
      onUploaded?.();
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        uploadMutation.mutate();
      }}
      style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}
    >
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          className="input"
          style={{ flex: 1, minWidth: 120 }}
          placeholder="Nº do certificado"
          value={certificateNumber}
          onChange={(e) => setCertificateNumber(e.target.value)}
          required
        />
        <input
          className="input"
          style={{ flex: 1, minWidth: 140 }}
          placeholder="Laboratório"
          value={laboratory}
          onChange={(e) => setLaboratory(e.target.value)}
          required
        />
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 12, flex: 1 }}>
          Data da análise
          <input
            type="date"
            className="input"
            value={analysisDate}
            onChange={(e) => setAnalysisDate(e.target.value)}
            required
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 12, flex: 1 }}>
          Data do certificado
          <input
            type="date"
            className="input"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            required
          />
        </label>
      </div>
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const dropped = e.dataTransfer.files?.[0];
          if (dropped) setFile(dropped);
        }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          padding: '20px 12px',
          border: `2px dashed ${isDragging ? 'var(--color-primary)' : 'var(--color-border)'}`,
          borderRadius: 8,
          background: isDragging ? 'var(--color-surface-hover, #f5f5f5)' : 'transparent',
          cursor: 'pointer',
          textAlign: 'center',
        }}
      >
        <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
          {file
            ? file.name
            : 'Arraste o certificado aqui ou clique para selecionar'}
        </span>
        <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
          PDF, Excel ou imagem
        </span>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          style={{ display: 'none' }}
        />
      </div>
      <button
        type="submit"
        className="btn btn-primary"
        style={{ alignSelf: 'flex-start' }}
        disabled={uploadMutation.isPending}
      >
        {uploadMutation.isPending ? 'Enviando...' : 'Anexar certificado'}
      </button>
      {uploadMutation.isError && (
        <span className="field-error">Não foi possível enviar o certificado.</span>
      )}
    </form>
  );
}

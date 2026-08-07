-- Corrige o parameterName "VOC como Tolueno" já salvo em SampleResultRow —
-- o mesmo texto cru era usado em dois templates de certificado diferentes
-- (VOCs e BTEX), medindo coisas distintas com valores bem diferentes entre
-- si no mesmo ponto/dia, e aparecia como falsa duplicata no Resumo de
-- Resultados consolidado. Distingue pelo composto de origem da amostra
-- (Sample.compoundId), igual à correção aplicada em prisma/seed.ts.
UPDATE "sample_result_rows"
SET "parameterName" = 'Somatório VOC como Tolueno'
WHERE "parameterName" = 'VOC como Tolueno'
  AND "sampleId" IN (
    SELECT s.id FROM "samples" s
    JOIN "compounds" c ON c.id = s."compoundId"
    WHERE c.code = '12000'
  );

UPDATE "sample_result_rows"
SET "parameterName" = 'COV Total como Tolueno (BTEX)'
WHERE "parameterName" = 'VOC como Tolueno'
  AND "sampleId" IN (
    SELECT s.id FROM "samples" s
    JOIN "compounds" c ON c.id = s."compoundId"
    WHERE c.code = '17000'
  );

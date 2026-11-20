
export type OcorrenciaAnalise = {
  tipo: string;
  gravidade: string;
  status: string;
};

export function analisarTrecho(ocorrencias: OcorrenciaAnalise[]) {
  const total = ocorrencias.length;

  const totalAlta = ocorrencias.filter(
    (item) => item.gravidade === 'Alta'
  ).length;

  const pendentes = ocorrencias.filter(
    (item) => item.status !== 'Resolvida'
  ).length;

  const contagem: Record<string, number> = {};

  ocorrencias.forEach((item) => {
    contagem[item.tipo] = (contagem[item.tipo] ?? 0) + 1;
  });

  const tipoMaisFrequente =
    total === 0
      ? 'Nenhuma'
      : Object.entries(contagem).sort(
          (a, b) => b[1] - a[1]
        )[0][0];

  return {
    total,
    totalAlta,
    pendentes,
    tipoMaisFrequente,
    alerta: totalAlta >= 3,
  };
}

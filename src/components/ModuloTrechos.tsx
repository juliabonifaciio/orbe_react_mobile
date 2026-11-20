
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { analisarTrecho } from '../utils/analisarTrecho';

const STORAGE_KEY = '@orbe_sprint2_dados';

const C = {
  background: '#070D20',
  panel: '#101A35',
  panel2: '#172849',
  border: 'rgba(151,174,255,0.18)',
  text: '#F4F6FF',
  muted: '#9AA8C8',
  cyan: '#67E8F9',
  purple: '#A78BFA',
  green: '#65E6B5',
  yellow: '#F6C76A',
  red: '#FF777F',
};

type Gravidade = 'Baixa' | 'Média' | 'Alta';
type Status = 'Aberta' | 'Em andamento' | 'Resolvida';
type Tipo = 'Vegetação' | 'Buraco' | 'Sinalização' | 'Outro';

type Trecho = {
  id: string;
  rodovia: string;
  kmInicial: string;
  kmFinal: string;
};

type Ocorrencia = {
  id: string;
  trechoId: string;
  tipo: Tipo;
  descricao: string;
  gravidade: Gravidade;
  status: Status;
  data: string;
};

type Dados = {
  trechos: Trecho[];
  trechoAtualId: string | null;
  ocorrencias: Ocorrencia[];
};

const dadosIniciais: Dados = {
  trechos: [],
  trechoAtualId: null,
  ocorrencias: [],
};

function gerarId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function dataAtual() {
  return new Date().toLocaleString('pt-BR');
}

function Botao({
  titulo,
  onPress,
  ativo = false,
  pequeno = false,
}: {
  titulo: string;
  onPress: () => void;
  ativo?: boolean;
  pequeno?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.button,
        ativo && styles.buttonActive,
        pequeno && styles.buttonSmall,
      ]}
    >
      <Text style={[styles.buttonText, ativo && styles.buttonTextActive]}>
        {titulo}
      </Text>
    </Pressable>
  );
}

function Campo({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'numeric';
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#7180A3"
        keyboardType={keyboardType ?? 'default'}
        multiline={multiline}
        style={[styles.input, multiline && styles.multiline]}
      />
    </View>
  );
}

function Seletor<T extends string>({
  titulo,
  opcoes,
  valor,
  selecionar,
}: {
  titulo: string;
  opcoes: T[];
  valor: T;
  selecionar: (valor: T) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{titulo}</Text>
      <View style={styles.chipRow}>
        {opcoes.map((opcao) => (
          <Pressable
            key={opcao}
            onPress={() => selecionar(opcao)}
            style={[
              styles.chip,
              valor === opcao && styles.chipActive,
            ]}
          >
            <Text
              style={[
                styles.chipText,
                valor === opcao && styles.chipTextActive,
              ]}
            >
              {opcao}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Selo({
  texto,
  gravidade,
}: {
  texto: string;
  gravidade: Gravidade;
}) {
  const cor =
    gravidade === 'Alta'
      ? C.red
      : gravidade === 'Média'
        ? C.yellow
        : C.green;

  return (
    <View
      style={[
        styles.seal,
        { borderColor: `${cor}80`, backgroundColor: `${cor}15` },
      ]}
    >
      <View style={[styles.sealDot, { backgroundColor: cor }]} />
      <Text style={[styles.sealText, { color: cor }]}>{texto}</Text>
    </View>
  );
}

export default function ModuloTrechos() {
  const [dados, setDados] = useState<Dados>(dadosIniciais);
  const [carregado, setCarregado] = useState(false);

  const [rodovia, setRodovia] = useState('');
  const [kmInicial, setKmInicial] = useState('');
  const [kmFinal, setKmFinal] = useState('');

  const [tipo, setTipo] = useState<Tipo>('Outro');
  const [descricao, setDescricao] = useState('');
  const [gravidade, setGravidade] = useState<Gravidade>('Baixa');

  const [filtroTipo, setFiltroTipo] = useState('Todos');
  const [filtroGravidade, setFiltroGravidade] = useState('Todas');

  useEffect(() => {
    async function carregarDados() {
      try {
        const salvo = await AsyncStorage.getItem(STORAGE_KEY);

        if (salvo) {
          const convertido = JSON.parse(salvo) as Dados;

          setDados({
            trechos: convertido.trechos ?? [],
            trechoAtualId: convertido.trechoAtualId ?? null,
            ocorrencias: convertido.ocorrencias ?? [],
          });
        }
      } catch {
        Alert.alert('ORBE', 'Não foi possível carregar os dados salvos.');
      } finally {
        setCarregado(true);
      }
    }

    carregarDados();
  }, []);

  useEffect(() => {
    if (!carregado) return;

    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dados)).catch(() => {
      Alert.alert('ORBE', 'Não foi possível salvar os dados.');
    });
  }, [dados, carregado]);

  const trechoAtual = dados.trechos.find(
    (trecho) => trecho.id === dados.trechoAtualId,
  );

  const ocorrenciasDoTrecho = useMemo(
    () =>
      dados.ocorrencias.filter(
        (ocorrencia) => ocorrencia.trechoId === dados.trechoAtualId,
      ),
    [dados.ocorrencias, dados.trechoAtualId],
  );

  const ocorrenciasFiltradas = useMemo(
    () =>
      ocorrenciasDoTrecho.filter((ocorrencia) => {
        const tipoOk =
          filtroTipo === 'Todos' || ocorrencia.tipo === filtroTipo;

        const gravidadeOk =
          filtroGravidade === 'Todas' ||
          ocorrencia.gravidade === filtroGravidade;

        return tipoOk && gravidadeOk;
      }),
    [ocorrenciasDoTrecho, filtroTipo, filtroGravidade],
  );

  const analise = useMemo(
    () => analisarTrecho(ocorrenciasDoTrecho),
    [ocorrenciasDoTrecho],
  );

  const {
    total,
    totalAlta,
    pendentes,
    tipoMaisFrequente,
    alerta,
  } = analise;

  function cadastrarTrecho() {
    if (!rodovia.trim() || !kmInicial.trim() || !kmFinal.trim()) {
      Alert.alert(
        'Campos obrigatórios',
        'Informe rodovia, km inicial e km final.',
      );
      return;
    }

    const inicio = Number(kmInicial.replace(',', '.'));
    const fim = Number(kmFinal.replace(',', '.'));

    if (
      !Number.isFinite(inicio) ||
      !Number.isFinite(fim) ||
      inicio < 0 ||
      fim < 0 ||
      fim <= inicio
    ) {
      Alert.alert(
        'Quilometragem inválida',
        'O km final deve ser maior que o km inicial.',
      );
      return;
    }

    const novoTrecho: Trecho = {
      id: gerarId(),
      rodovia: rodovia.trim().toUpperCase(),
      kmInicial: kmInicial.trim(),
      kmFinal: kmFinal.trim(),
    };

    setDados((atual) => ({
      ...atual,
      trechos: [...atual.trechos, novoTrecho],
      trechoAtualId: atual.trechoAtualId ?? novoTrecho.id,
    }));

    setRodovia('');
    setKmInicial('');
    setKmFinal('');
  }

  function excluirTrecho(id: string) {
    const possuiOcorrencias = dados.ocorrencias.some(
      (item) => item.trechoId === id,
    );

    if (possuiOcorrencias) {
      Alert.alert(
        'Trecho vinculado a ocorrências',
        'Não é possível excluir um trecho que possui ocorrências registradas.',
      );
      return;
    }

    Alert.alert('Excluir trecho', 'Deseja realmente excluir este trecho?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          setDados((atual) => ({
            ...atual,
            trechos: atual.trechos.filter((item) => item.id !== id),
            trechoAtualId:
              atual.trechoAtualId === id ? null : atual.trechoAtualId,
          }));
        },
      },
    ]);
  }

  function cadastrarOcorrencia() {
    if (!dados.trechoAtualId) {
      Alert.alert(
        'Selecione um trecho',
        'Escolha um trecho antes de registrar uma ocorrência.',
      );
      return;
    }

    if (!descricao.trim()) {
      Alert.alert('Descrição obrigatória', 'Descreva a ocorrência.');
      return;
    }

    const nova: Ocorrencia = {
      id: gerarId(),
      trechoId: dados.trechoAtualId,
      tipo,
      descricao: descricao.trim(),
      gravidade,
      status: 'Aberta',
      data: dataAtual(),
    };

    setDados((atual) => ({
      ...atual,
      ocorrencias: [nova, ...atual.ocorrencias],
    }));

    setDescricao('');
    setTipo('Outro');
    setGravidade('Baixa');

    Alert.alert(
      'Registro salvo',
      'A ocorrência foi vinculada ao trecho selecionado.',
    );
  }

  function alterarStatus(id: string) {
    setDados((atual) => ({
      ...atual,
      ocorrencias: atual.ocorrencias.map((item) => {
        if (item.id !== id) return item;

        const proximo: Status =
          item.status === 'Aberta'
            ? 'Em andamento'
            : item.status === 'Em andamento'
              ? 'Resolvida'
              : 'Aberta';

        return { ...item, status: proximo };
      }),
    }));
  }

  function excluirOcorrencia(id: string) {
    Alert.alert('Excluir ocorrência', 'Deseja excluir este registro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () =>
          setDados((atual) => ({
            ...atual,
            ocorrencias: atual.ocorrencias.filter((item) => item.id !== id),
          })),
      },
    ]);
  }

  if (!carregado) {
    return (
      <View style={styles.loading}>
        <Text style={styles.title}>ORBE</Text>
        <Text style={styles.muted}>Carregando dados operacionais...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.eyebrow}>GESTÃO OPERACIONAL</Text>
      <Text style={styles.title}>Trechos e ocorrências</Text>
      <Text style={styles.muted}>
        Cadastre trechos e acompanhe os registros de cada segmento.
      </Text>

      <View style={styles.card}>
        <Text style={styles.heading}>Cadastrar novo trecho</Text>

        <Campo
          label="RODOVIA"
          value={rodovia}
          onChangeText={setRodovia}
          placeholder="Ex.: BR-116 ou SP-070"
        />

        <View style={styles.twoColumns}>
          <View style={styles.column}>
            <Campo
              label="KM INICIAL"
              value={kmInicial}
              onChangeText={setKmInicial}
              placeholder="Ex.: 10"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.column}>
            <Campo
              label="KM FINAL"
              value={kmFinal}
              onChangeText={setKmFinal}
              placeholder="Ex.: 25"
              keyboardType="numeric"
            />
          </View>
        </View>

        <Botao titulo="＋  Cadastrar trecho" onPress={cadastrarTrecho} ativo />
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>Trechos cadastrados</Text>

        {dados.trechos.length === 0 ? (
          <Text style={styles.empty}>
            Nenhum trecho cadastrado. Preencha o formulário acima para começar.
          </Text>
        ) : (
          dados.trechos.map((item) => (
            <View
              key={item.id}
              style={[
                styles.segmentCard,
                dados.trechoAtualId === item.id && styles.segmentSelected,
              ]}
            >
              <Pressable
                style={styles.segmentInfo}
                onPress={() =>
                  setDados((atual) => ({
                    ...atual,
                    trechoAtualId: item.id,
                  }))
                }
              >
                <Text style={styles.segmentName}>{item.rodovia}</Text>

                <Text style={styles.muted}>
                  KM {item.kmInicial} ao KM {item.kmFinal}
                </Text>

                <Text style={styles.selectHint}>
                  {dados.trechoAtualId === item.id
                    ? 'TRECHO SELECIONADO'
                    : 'Toque para selecionar'}
                </Text>
              </Pressable>

              <Pressable onPress={() => excluirTrecho(item.id)}>
                <Text style={styles.deleteText}>Excluir</Text>
              </Pressable>
            </View>
          ))
        )}
      </View>

      {trechoAtual ? (
        <>
          <View style={styles.section}>
            <Text style={styles.eyebrow}>TRECHO ATUAL</Text>

            <Text style={styles.title}>{trechoAtual.rodovia}</Text>

            <Text style={styles.muted}>
              KM {trechoAtual.kmInicial} ao KM {trechoAtual.kmFinal}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.heading}>Painel do trecho</Text>

            <View style={styles.metrics}>
              <View style={styles.metric}>
                <Text style={styles.metricNumber}>{total}</Text>
                <Text style={styles.metricLabel}>Total</Text>
              </View>

              <View style={styles.metric}>
                <Text style={[styles.metricNumber, { color: C.red }]}>
                  {totalAlta}
                </Text>
                <Text style={styles.metricLabel}>Gravidade alta</Text>
              </View>

              <View style={styles.metric}>
                <Text style={[styles.metricNumber, { color: C.cyan }]}>
                  {pendentes}
                </Text>
                <Text style={styles.metricLabel}>Pendentes</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <Text style={styles.muted}>Tipo mais frequente</Text>
            <Text style={styles.frequent}>{tipoMaisFrequente}</Text>

            {alerta ? (
              <View style={styles.warning}>
                <Text style={styles.warningText}>
                  Atenção: este trecho possui três ou mais ocorrências de
                  gravidade alta. Verifique os registros e siga os
                  procedimentos operacionais da equipe.
                </Text>
              </View>
            ) : totalAlta > 0 ? (
              <View style={styles.notice}>
                <Text style={styles.noticeText}>
                  Existem ocorrências de gravidade alta neste trecho que
                  precisam ser acompanhadas.
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.heading}>Registrar ocorrência</Text>

            <Seletor
              titulo="TIPO DE OCORRÊNCIA"
              opcoes={['Vegetação', 'Buraco', 'Sinalização', 'Outro']}
              valor={tipo}
              selecionar={setTipo}
            />

            <Campo
              label="DESCRIÇÃO"
              value={descricao}
              onChangeText={setDescricao}
              placeholder="Descreva o que foi identificado..."
              multiline
            />

            <Seletor
              titulo="GRAVIDADE"
              opcoes={['Baixa', 'Média', 'Alta']}
              valor={gravidade}
              selecionar={setGravidade}
            />

            <Botao
              titulo="＋  Salvar ocorrência"
              onPress={cadastrarOcorrencia}
              ativo
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.heading}>Ocorrências do trecho</Text>

            <Text style={styles.label}>FILTRAR POR TIPO</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                {['Todos', 'Vegetação', 'Buraco', 'Sinalização', 'Outro'].map(
                  (f) => (
                    <Botao
                      key={f}
                      titulo={f}
                      pequeno
                      ativo={filtroTipo === f}
                      onPress={() => setFiltroTipo(f)}
                    />
                  ),
                )}
              </View>
            </ScrollView>

            <Text style={[styles.label, { marginTop: 13 }]}>
              FILTRAR POR GRAVIDADE
            </Text>

            <View style={styles.chipRow}>
              {['Todas', 'Baixa', 'Média', 'Alta'].map((f) => (
                <Botao
                  key={f}
                  titulo={f}
                  pequeno
                  ativo={filtroGravidade === f}
                  onPress={() => setFiltroGravidade(f)}
                />
              ))}
            </View>
          </View>

          {ocorrenciasFiltradas.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>
                Nenhuma ocorrência encontrada
              </Text>

              <Text style={styles.muted}>
                Não há registros para os filtros selecionados neste trecho.
              </Text>
            </View>
          ) : (
            ocorrenciasFiltradas.map((item) => (
              <View key={item.id} style={styles.occurrenceCard}>
                <View style={styles.occurrenceTop}>
                  <Text style={styles.occurrenceType}>{item.tipo}</Text>

                  <Selo
                    texto={item.gravidade}
                    gravidade={item.gravidade}
                  />
                </View>

                <Text style={styles.occurrenceDescription}>
                  {item.descricao}
                </Text>

                <Text style={styles.occurrenceDate}>{item.data}</Text>

                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>
                    Status: {item.status}
                  </Text>

                  <Botao
                    titulo={
                      item.status === 'Aberta'
                        ? 'Iniciar'
                        : item.status === 'Em andamento'
                          ? 'Resolver'
                          : 'Reabrir'
                    }
                    pequeno
                    ativo
                    onPress={() => alterarStatus(item.id)}
                  />
                </View>

                <Pressable onPress={() => excluirOcorrencia(item.id)}>
                  <Text style={styles.deleteText}>Excluir ocorrência</Text>
                </Pressable>
              </View>
            ))
          )}
        </>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Selecione um trecho</Text>

          <Text style={styles.muted}>
            Cadastre um trecho ou selecione um dos trechos existentes para
            visualizar o painel e registrar ocorrências.
          </Text>
        </View>
      )}

      <Text style={styles.footer}>
        ORBE • Dados armazenados localmente neste dispositivo.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },
  content: { padding: 20, paddingTop: 48, paddingBottom: 40 },
  loading: {
    flex: 1,
    backgroundColor: C.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    color: C.cyan,
    fontSize: 9,
    letterSpacing: 2,
    fontWeight: '800',
    marginBottom: 8,
  },
  title: {
    color: C.text,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 7,
  },
  heading: {
    color: C.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 15,
  },
  muted: { color: C.muted, fontSize: 11, lineHeight: 17 },
  card: {
    backgroundColor: C.panel,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 19,
    padding: 16,
    marginTop: 19,
  },
  field: { marginBottom: 13 },
  label: {
    color: C.cyan,
    fontSize: 9,
    letterSpacing: 1.2,
    fontWeight: '700',
    marginBottom: 7,
  },
  input: {
    color: C.text,
    backgroundColor: '#0A142D',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 12,
  },
  multiline: { minHeight: 85, textAlignVertical: 'top' },
  twoColumns: { flexDirection: 'row', gap: 10 },
  column: { flex: 1 },
  button: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    backgroundColor: C.panel2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonActive: {
    backgroundColor: 'rgba(103,232,249,0.13)',
    borderColor: 'rgba(103,232,249,0.55)',
  },
  buttonSmall: { paddingVertical: 7, paddingHorizontal: 10 },
  buttonText: { color: C.muted, fontSize: 10, fontWeight: '600' },
  buttonTextActive: { color: C.cyan },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#0B1530',
  },
  chipActive: {
    backgroundColor: 'rgba(167,139,250,0.15)',
    borderColor: C.purple,
  },
  chipText: { color: C.muted, fontSize: 10 },
  chipTextActive: { color: C.text },
  section: { marginTop: 26 },
  segmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.panel,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 15,
    padding: 14,
    marginTop: 9,
  },
  segmentSelected: { borderColor: C.cyan },
  segmentInfo: { flex: 1 },
  segmentName: { color: C.text, fontWeight: '800', fontSize: 14 },
  selectHint: {
    color: C.cyan,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 7,
  },
  deleteText: { color: C.red, fontSize: 10, fontWeight: '700', padding: 7 },
  empty: {
    color: C.muted,
    backgroundColor: C.panel,
    borderRadius: 13,
    padding: 15,
    fontSize: 11,
    lineHeight: 18,
  },
  metrics: { flexDirection: 'row', gap: 8 },
  metric: {
    flex: 1,
    backgroundColor: '#0B1530',
    borderRadius: 12,
    padding: 12,
  },
  metricNumber: { color: C.cyan, fontSize: 23, fontWeight: '800' },
  metricLabel: { color: C.muted, fontSize: 9, marginTop: 4 },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 15 },
  frequent: { color: C.text, fontSize: 18, fontWeight: '800', marginTop: 5 },
  warning: {
    backgroundColor: 'rgba(255,119,127,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,119,127,0.4)',
    borderRadius: 11,
    padding: 12,
    marginTop: 14,
  },
  warningText: { color: '#FF9DA3', fontSize: 10, lineHeight: 16 },
  notice: {
    backgroundColor: 'rgba(246,199,106,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(246,199,106,0.35)',
    borderRadius: 11,
    padding: 12,
    marginTop: 14,
  },
  noticeText: { color: C.yellow, fontSize: 10, lineHeight: 16 },
  seal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  sealDot: { width: 6, height: 6, borderRadius: 3 },
  sealText: { fontSize: 9, fontWeight: '700' },
  occurrenceCard: {
    backgroundColor: C.panel,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 15,
    padding: 14,
    marginTop: 10,
  },
  occurrenceTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  occurrenceType: { color: C.cyan, fontSize: 12, fontWeight: '800' },
  occurrenceDescription: {
    color: C.text,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 13,
  },
  occurrenceDate: { color: C.muted, fontSize: 9, marginTop: 9 },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 11,
    marginTop: 12,
  },
  statusLabel: { color: C.muted, fontSize: 10 },
  emptyCard: {
    backgroundColor: C.panel,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 15,
    padding: 18,
    marginTop: 15,
  },
  emptyTitle: {
    color: C.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 7,
  },
  footer: {
    color: '#7180A3',
    textAlign: 'center',
    fontSize: 9,
    marginTop: 25,
  },
});

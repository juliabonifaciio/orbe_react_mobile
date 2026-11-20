
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import * as Speech from 'expo-speech';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import ModuloTrechos from '../components/ModuloTrechos';

type UserProfile = {
  name: string;
  email: string;
  role: string;
  unit: string;
  password: string;
};

type Tab = 'home' | 'assistant' | 'records' | 'profile' | 'segments';
type AuthScreen = 'welcome' | 'register' | 'login' | 'scan';

const STORAGE_KEY = 'orbe_demo_profile_v1';

const COLORS = {
  background: '#070D20',
  panel: '#101A35',
  panel2: '#142141',
  border: 'rgba(151, 174, 255, 0.16)',
  text: '#F4F6FF',
  muted: '#9AA8C8',
  purple: '#A78BFA',
  cyan: '#67E8F9',
  blue: '#609BFF',
  green: '#65E6B5',
};

const suggestions = [
  'Resuma a ocorrência registrada.',
  'Quais informações estão faltando neste atendimento?',
  'Prepare um relatório da ocorrência.',
  'Quais são os procedimentos iniciais para este cenário?',
  'Consulte os atendimentos recentes.',
];

const demoRecords = [
  { id: 'OR-0248', title: 'Atendimento em rodovia', place: 'Rodovia • km 32', date: 'Hoje, 14:32', status: 'Em revisão', color: '#F6C76A' },
  { id: 'OR-0247', title: 'Avaliação pré-hospitalar', place: 'Base operacional', date: 'Hoje, 11:08', status: 'Concluído', color: COLORS.green },
  { id: 'OR-0246', title: 'Registro de ocorrência', place: 'Rodovia • km 18', date: 'Ontem, 18:45', status: 'Concluído', color: COLORS.green },
];

function GlowOrb({ small = false, active = false }: { small?: boolean; active?: boolean }) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, active ? 1.13 : 1.07] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.48, 0.9] });
  const size = small ? 48 : 174;

  return (
    <View style={{ width: size + 30, height: size + 30, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={[
          styles.orbGlow,
          {
            width: size + 22,
            height: size + 22,
            borderRadius: (size + 22) / 2,
            opacity,
            transform: [{ scale }],
          },
        ]}
      />
      <View
        style={[
          styles.orbCore,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: small ? 1 : 2,
          },
        ]}
      >
        <View style={styles.orbInner}>
          <View style={styles.orbHighlight} />
          <Text style={{ color: '#FFFFFF', fontSize: small ? 18 : 54, fontWeight: '300' }}>✦</Text>
        </View>
      </View>
    </View>
  );
}

function Panel({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

function SectionTitle({ title, action }: { title: string; action?: string }) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={styles.sectionHeading}>{title}</Text>
      {action ? <Text style={styles.sectionAction}>{action}</Text> : null}
    </View>
  );
}

function PrimaryButton({ title, onPress, secondary = false }: { title: string; onPress: () => void; secondary?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.primaryButton, secondary && styles.secondaryButton, pressed && { opacity: 0.82, transform: [{ scale: 0.99 }] }]}>
      <Text style={[styles.primaryButtonText, secondary && { color: COLORS.cyan }]}>{title}</Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authScreen, setAuthScreen] = useState<AuthScreen>('welcome');
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [assistantMode, setAssistantMode] = useState<'voice' | 'chat'>('voice');
  const [isListening, setIsListening] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<{ from: 'orbe' | 'user'; text: string }[]>([
    { from: 'orbe', text: 'Olá! Sou o ORBE. Posso ajudar a organizar informações e preparar registros demonstrativos. Como posso ajudar?' },
  ]);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState('Profissional APH');
  const [formUnit, setFormUnit] = useState('Equipe operacional');
  const [formPassword, setFormPassword] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [scanStage, setScanStage] = useState<'face' | 'voice' | 'done'>('face');
  const [showPassword, setShowPassword] = useState(false);

  const scanProgress = useRef(new Animated.Value(0)).current;
  const wave = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY)
      .then((saved) => {
        if (saved) {
          const parsed = JSON.parse(saved) as UserProfile;
          setProfile(parsed);
          setLoginEmail(parsed.email);
          setAuthScreen('login');
        }
      })
      .catch(() => Alert.alert('ORBE', 'Não foi possível carregar os dados locais deste dispositivo.'));
  }, []);

  useEffect(() => {
    if (authScreen !== 'scan') return;
    scanProgress.setValue(0);
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scanProgress, { toValue: 1, duration: 1700, useNativeDriver: true }),
        Animated.timing(scanProgress, { toValue: 0, duration: 1700, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [authScreen, scanProgress]);

  useEffect(() => {
    if (activeTab !== 'assistant' || assistantMode !== 'voice') return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(wave, { toValue: 1, duration: 1100, useNativeDriver: true }),
        Animated.timing(wave, { toValue: 0, duration: 1100, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [activeTab, assistantMode, wave]);

  const firstName = useMemo(() => profile?.name?.trim().split(' ')[0] || 'Profissional', [profile]);

  const saveProfile = async () => {
    if (!formName.trim() || !formEmail.trim() || !formPassword.trim()) {
      Alert.alert('Preencha os campos', 'Informe nome, e-mail e uma senha para continuar.');
      return;
    }
    const newProfile: UserProfile = {
      name: formName.trim(),
      email: formEmail.trim().toLowerCase(),
      role: formRole.trim() || 'Profissional APH',
      unit: formUnit.trim() || 'Equipe operacional',
      password: formPassword,
    };
    try {
      await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(newProfile));
      setProfile(newProfile);
      setLoginEmail(newProfile.email);
      setAuthScreen('scan');
      setScanStage('face');
    } catch {
      Alert.alert('Não foi possível salvar', 'Verifique se o armazenamento seguro está disponível no aparelho.');
    }
  };

  const signIn = () => {
    if (!profile || loginEmail.trim().toLowerCase() !== profile.email || loginPassword !== profile.password) {
      Alert.alert('Acesso não realizado', 'Confira o e-mail e a senha cadastrados neste dispositivo.');
      return;
    }
    setAuthScreen('scan');
    setScanStage('face');
  };

  const runIllustrativeScan = () => {
    if (scanStage === 'face') {
      setScanStage('voice');
      return;
    }
    if (scanStage === 'voice') {
      setScanStage('done');
      return;
    }
    setAuthScreen('welcome');
    setActiveTab('home');
  };

  const enterApp = () => {
    setAuthScreen('welcome');
    setActiveTab('home');
  };

  const speak = (text: string) => {
    Speech.stop();
    Speech.speak(text, { language: 'pt-BR', rate: 0.94, pitch: 1.02 });
  };

  const makeAnswer = (question: string) => {
    const q = question.toLowerCase();
    if (q.includes('resuma') || q.includes('resumo')) {
      return 'Resumo demonstrativo: atendimento em fase de revisão. Confirme horário, localização, avaliação inicial, procedimentos realizados e encaminhamento antes de finalizar o registro.';
    }
    if (q.includes('faltando') || q.includes('informações')) {
      return 'Confira se o registro contém: identificação da equipe, horário, localização, mecanismo da ocorrência, avaliação inicial, sinais observados, procedimentos, destino e responsável pelo atendimento.';
    }
    if (q.includes('relatório') || q.includes('relatorio')) {
      return 'Posso estruturar um relatório com identificação da ocorrência, contexto, avaliação, ações realizadas e encaminhamento. Os dados precisam ser revisados e confirmados pelo profissional responsável.';
    }
    if (q.includes('procedimentos') || q.includes('cenário')) {
      return 'Posso ajudar a organizar uma consulta a protocolos institucionais. Esta demonstração não substitui protocolos oficiais, treinamento ou julgamento clínico. Consulte sempre as orientações vigentes da sua equipe.';
    }
    if (q.includes('recentes') || q.includes('atendimentos')) {
      return 'Na demonstração há três registros de exemplo no painel de ocorrências. Eles não representam atendimentos reais.';
    }
    return 'Entendi. Posso ajudar a organizar essa informação em um resumo, uma lista de verificação ou um rascunho de relatório. Lembre-se de revisar tudo antes de utilizar.';
  };

  const sendMessage = (text?: string) => {
    const question = (text ?? chatInput).trim();
    if (!question) return;
    const answer = makeAnswer(question);
    setMessages((current) => [...current, { from: 'user', text: question }, { from: 'orbe', text: answer }]);
    setChatInput('');
  };

  const startVoiceDemo = () => {
    if (isListening) {
      setIsListening(false);
      speak('Demonstração de voz finalizada. Nenhum áudio foi enviado ou transcrito.');
      return;
    }
    setIsListening(true);
    speak('Estou ouvindo. Esta é uma demonstração visual do assistente ORBE. O reconhecimento de voz ainda não está integrado.');
    setTimeout(() => setIsListening(false), 3500);
  };

  const logout = async () => {
    Speech.stop();
    setProfile(null);
    setLoginPassword('');
    setAuthScreen('login');
    setActiveTab('home');
  };

  const biometricLogin = async () => {
    try {
      const available = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!available || !enrolled) {
        Alert.alert('Biometria indisponível', 'Este aparelho não possui biometria configurada. Você pode entrar com e-mail e senha.');
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Autenticar acesso ao ORBE', cancelLabel: 'Cancelar' });
      if (result.success) {
        setAuthScreen('scan');
        setScanStage('face');
      }
    } catch {
      Alert.alert('Não foi possível autenticar', 'Tente entrar com e-mail e senha.');
    }
  };

  const renderAuth = () => {
    if (authScreen === 'scan') {
      const title = scanStage === 'face' ? 'Reconhecimento facial' : scanStage === 'voice' ? 'Identificação de voz' : 'Verificação concluída';
      const subtitle = scanStage === 'face'
        ? 'Centralize o rosto na área indicada'
        : scanStage === 'voice'
          ? 'Analisando padrão de voz ilustrativo'
          : 'Identidade demonstrativa confirmada';
      const translateY = scanProgress.interpolate({ inputRange: [0, 1], outputRange: [-78, 78] });
      return (
        <View style={styles.authScreen}>
          <View style={styles.authTop}>
            <Text style={styles.brand}>ORBE<Text style={styles.brandDot}>.</Text></Text>
            <Text style={styles.eyebrow}>ACESSO SEGURO • SIMULAÇÃO</Text>
          </View>
          <View style={styles.scanContent}>
            <View style={styles.scanFrame}>
              {scanStage === 'face' ? (
                <>
                  <View style={styles.faceOval}><Text style={styles.faceGlyph}>◉</Text></View>
                  <Animated.View style={[styles.scanLine, { transform: [{ translateY }] }]} />
                  <View style={styles.cornerTL} /><View style={styles.cornerTR} /><View style={styles.cornerBL} /><View style={styles.cornerBR} />
                </>
              ) : scanStage === 'voice' ? (
                <View style={styles.voiceScan}>
                  {Array.from({ length: 19 }).map((_, i) => (
                    <Animated.View key={i} style={[styles.voiceBar, { height: 16 + ((i * 17) % 54), opacity: 0.55 + (i % 4) * 0.1 }]} />
                  ))}
                </View>
              ) : <GlowOrb />}
            </View>
            <Text style={styles.scanTitle}>{title}</Text>
            <Text style={styles.scanSubtitle}>{subtitle}</Text>
            <View style={styles.stepRow}>
              <View style={[styles.stepDot, { backgroundColor: COLORS.cyan }]} />
              <View style={[styles.stepLine, { backgroundColor: scanStage !== 'face' ? COLORS.cyan : COLORS.border }]} />
              <View style={[styles.stepDot, { backgroundColor: scanStage !== 'face' ? COLORS.cyan : '#354362' }]} />
              <View style={[styles.stepLine, { backgroundColor: scanStage === 'done' ? COLORS.cyan : COLORS.border }]} />
              <View style={[styles.stepDot, { backgroundColor: scanStage === 'done' ? COLORS.cyan : '#354362' }]} />
            </View>
            <Text style={styles.demoNote}>Demonstração visual. Não realiza reconhecimento facial ou de voz.</Text>
            <PrimaryButton title={scanStage === 'done' ? 'Entrar no ORBE' : 'Continuar'} onPress={runIllustrativeScan} />
            <Pressable onPress={enterApp}><Text style={styles.linkText}>Pular demonstração</Text></Pressable>
          </View>
        </View>
      );
    }

    return (
      <KeyboardAvoidingView style={styles.authScreen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.authScroll} keyboardShouldPersistTaps="handled">
          <View style={styles.authTop}>
            <Text style={styles.brand}>ORBE<Text style={styles.brandDot}>.</Text></Text>
            <Text style={styles.eyebrow}>INTELIGÊNCIA DE APOIO AO APH</Text>
          </View>
          <View style={styles.welcomeOrb}><GlowOrb small /></View>
          <Text style={styles.authHeading}>
            {authScreen === 'register' ? 'Crie seu acesso' : authScreen === 'login' ? 'Bem-vindo de volta' : 'Tecnologia a serviço do cuidado.'}
          </Text>
          <Text style={styles.authDescription}>
            {authScreen === 'register'
              ? 'Cadastre seu perfil profissional para acessar a demonstração do ORBE.'
              : authScreen === 'login'
                ? 'Entre para continuar sua experiência no ORBE.'
                : 'Organização inteligente para apoiar a rotina de atendimento pré-hospitalar.'}
          </Text>

          {authScreen === 'register' ? (
            <Panel style={styles.formPanel}>
              <Text style={styles.inputLabel}>NOME COMPLETO</Text>
              <TextInput value={formName} onChangeText={setFormName} placeholder="Seu nome" placeholderTextColor="#6F7D9F" style={styles.input} />
              <Text style={styles.inputLabel}>E-MAIL</Text>
              <TextInput value={formEmail} onChangeText={setFormEmail} placeholder="voce@exemplo.com" placeholderTextColor="#6F7D9F" autoCapitalize="none" keyboardType="email-address" style={styles.input} />
              <Text style={styles.inputLabel}>FUNÇÃO</Text>
              <TextInput value={formRole} onChangeText={setFormRole} placeholder="Profissional APH" placeholderTextColor="#6F7D9F" style={styles.input} />
              <Text style={styles.inputLabel}>UNIDADE / EQUIPE</Text>
              <TextInput value={formUnit} onChangeText={setFormUnit} placeholder="Equipe operacional" placeholderTextColor="#6F7D9F" style={styles.input} />
              <Text style={styles.inputLabel}>SENHA DE DEMONSTRAÇÃO</Text>
              <TextInput value={formPassword} onChangeText={setFormPassword} placeholder="Crie uma senha" placeholderTextColor="#6F7D9F" secureTextEntry={!showPassword} style={styles.input} />
              <Pressable onPress={() => setShowPassword(!showPassword)}><Text style={styles.linkText}>{showPassword ? 'Ocultar senha' : 'Mostrar senha'}</Text></Pressable>
              <PrimaryButton title="Criar acesso" onPress={saveProfile} />
              <Pressable onPress={() => setAuthScreen('welcome')}><Text style={styles.linkText}>Voltar</Text></Pressable>
            </Panel>
          ) : authScreen === 'login' ? (
            <Panel style={styles.formPanel}>
              <Text style={styles.inputLabel}>E-MAIL</Text>
              <TextInput value={loginEmail} onChangeText={setLoginEmail} placeholder="Seu e-mail" placeholderTextColor="#6F7D9F" autoCapitalize="none" keyboardType="email-address" style={styles.input} />
              <Text style={styles.inputLabel}>SENHA</Text>
              <TextInput value={loginPassword} onChangeText={setLoginPassword} placeholder="Sua senha" placeholderTextColor="#6F7D9F" secureTextEntry={!showPassword} style={styles.input} />
              <PrimaryButton title="Entrar" onPress={signIn} />
              <PrimaryButton title="Entrar com biometria do aparelho" onPress={biometricLogin} secondary />
              <Pressable onPress={() => setAuthScreen('register')}><Text style={styles.linkText}>Criar outro perfil de demonstração</Text></Pressable>
            </Panel>
          ) : (
            <View style={styles.authActions}>
              <PrimaryButton title="Começar agora" onPress={() => setAuthScreen(profile ? 'login' : 'register')} />
              {profile ? <PrimaryButton title="Já tenho acesso" onPress={() => setAuthScreen('login')} secondary /> : null}
            </View>
          )}
          <Text style={styles.footerNote}>AMBIENTE DE DEMONSTRAÇÃO • DADOS LOCAIS</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  };

  const renderHome = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.pageContent}>
      <View style={styles.topBar}>
        <View><Text style={styles.brandSmall}>ORBE<Text style={styles.brandDot}>.</Text></Text><Text style={styles.topCaption}>CENTRAL DE OPERAÇÕES</Text></View>
        <View style={styles.avatar}><Text style={styles.avatarText}>{firstName.slice(0, 1).toUpperCase()}</Text></View>
      </View>
      <View style={styles.greetingBlock}>
        <Text style={styles.eyebrow}>PAINEL GERAL • DEMONSTRAÇÃO</Text>
        <Text style={styles.greeting}>Olá, {firstName}.</Text>
        <Text style={styles.subGreeting}>Sua central de apoio está pronta.</Text>
      </View>

      <Panel style={styles.heroPanel}>
        <View style={styles.heroText}>
          <View style={styles.onlineBadge}><View style={styles.onlineDot} /><Text style={styles.onlineText}>SISTEMA DE DEMONSTRAÇÃO</Text></View>
          <Text style={styles.heroTitle}>Como posso ajudar no próximo atendimento?</Text>
          <Text style={styles.heroSubtitle}>Converse com o ORBE por voz ou mensagem.</Text>
          <Pressable onPress={() => { setActiveTab('assistant'); setAssistantMode('voice'); }} style={styles.heroButton}>
            <Text style={styles.heroButtonText}>Abrir assistente  ↗</Text>
          </Pressable>
        </View>
        <View style={styles.heroOrb}><GlowOrb small /></View>
      </Panel>

      <SectionTitle title="Visão geral" action="Dados ilustrativos" />
      <View style={styles.metricsGrid}>
        <Panel style={styles.metricCard}><Text style={styles.metricIcon}>◉</Text><Text style={styles.metricValue}>24</Text><Text style={styles.metricLabel}>Atendimentos</Text><Text style={styles.metricTrend}>+12% no período</Text></Panel>
        <Panel style={styles.metricCard}><Text style={styles.metricIcon}>◷</Text><Text style={styles.metricValue}>08</Text><Text style={styles.metricLabel}>Em andamento</Text><Text style={styles.metricTrend}>Acompanhar equipe</Text></Panel>
        <Panel style={styles.metricCard}><Text style={styles.metricIcon}>▤</Text><Text style={styles.metricValue}>16</Text><Text style={styles.metricLabel}>Relatórios</Text><Text style={styles.metricTrend}>Organizados</Text></Panel>
        <Panel style={styles.metricCard}><Text style={styles.metricIcon}>⌁</Text><Text style={styles.metricValue}>96%</Text><Text style={styles.metricLabel}>Registros completos</Text><Text style={styles.metricTrend}>Indicador simulado</Text></Panel>
      </View>

      <SectionTitle title="Atividade recente" action="Ver todos" />
      <Panel style={styles.activityPanel}>
        {demoRecords.slice(0, 2).map((record, index) => (
          <View key={record.id} style={[styles.activityRow, index > 0 && styles.activityDivider]}>
            <View style={styles.activityIcon}><Text style={styles.activityIconText}>⌖</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.activityTitle}>{record.title}</Text>
              <Text style={styles.activityMeta}>{record.place} • {record.date}</Text>
            </View>
            <View style={[styles.statusDot, { backgroundColor: record.color }]} />
          </View>
        ))}
      </Panel>

      <SectionTitle title="Acesso rápido" />
      <View style={styles.quickGrid}>
        <Pressable onPress={() => setActiveTab('records')} style={styles.quickCard}><Text style={styles.quickIcon}>▤</Text><Text style={styles.quickTitle}>Registros</Text><Text style={styles.quickCaption}>Consultar ocorrências</Text></Pressable>
        <Pressable onPress={() => { setActiveTab('assistant'); setAssistantMode('chat'); }} style={styles.quickCard}><Text style={styles.quickIcon}>▤</Text><Text style={styles.quickTitle}>Chat ORBE</Text><Text style={styles.quickCaption}>Conversar por texto</Text></Pressable>
      </View>
      <Text style={styles.disclaimer}>Os indicadores e registros exibidos são fictícios e servem apenas para demonstrar a interface.</Text>
    </ScrollView>
  );

  const renderAssistant = () => (
    <View style={styles.assistantPage}>
      <View style={styles.assistantHeader}>
        <Text style={styles.eyebrow}>ASSISTENTE INTELIGENTE</Text>
        <Text style={styles.pageTitle}>ORBE</Text>
        <Text style={styles.subGreeting}>Seu apoio para organizar informações.</Text>
        <View style={styles.modeSwitch}>
          <Pressable onPress={() => setAssistantMode('voice')} style={[styles.modeButton, assistantMode === 'voice' && styles.modeButtonActive]}><Text style={[styles.modeText, assistantMode === 'voice' && styles.modeTextActive]}>◉  Voz</Text></Pressable>
          <Pressable onPress={() => setAssistantMode('chat')} style={[styles.modeButton, assistantMode === 'chat' && styles.modeButtonActive]}><Text style={[styles.modeText, assistantMode === 'chat' && styles.modeTextActive]}>▤  Chatbot</Text></Pressable>
        </View>
      </View>

      {assistantMode === 'voice' ? (
        <ScrollView contentContainerStyle={styles.voiceContent} showsVerticalScrollIndicator={false}>
          <View style={styles.voiceOrbWrap}>
            <Animated.View style={[styles.voiceRing, { transform: [{ scale: wave.interpolate({ inputRange: [0, 1], outputRange: [1, 1.13] }) }], opacity: wave.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0.65] }) }]} />
            <GlowOrb active={isListening} />
          </View>
          <Text style={styles.voiceTitle}>{isListening ? 'Ouvindo demonstração...' : 'Estou aqui para ajudar.'}</Text>
          <Text style={styles.voiceSubtitle}>{isListening ? 'Simulação de captação de voz' : 'Toque no botão para iniciar uma interação demonstrativa.'}</Text>
          <Pressable onPress={startVoiceDemo} style={({ pressed }) => [styles.micButton, isListening && styles.micButtonActive, pressed && { opacity: 0.8 }]}>
            <Text style={styles.micGlyph}>{isListening ? '■' : '⌁'}</Text>
          </Pressable>
          <Text style={styles.micCaption}>{isListening ? 'TOQUE PARA ENCERRAR' : 'TOQUE PARA FALAR'}</Text>
          <Text style={styles.disclaimer}>A captação e o reconhecimento de voz não estão integrados nesta versão. O botão demonstra a experiência e reproduz uma orientação por áudio.</Text>
          <SectionTitle title="Experimente perguntar" />
          <View style={styles.suggestionList}>
            {suggestions.map((item) => <Pressable key={item} onPress={() => { const answer = makeAnswer(item); setMessages((current) => [...current, { from: 'user', text: item }, { from: 'orbe', text: answer }]); speak(answer); }} style={styles.suggestion}><Text style={styles.suggestionText}>{item}</Text><Text style={styles.suggestionArrow}>↗</Text></Pressable>)}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.chatContainer}>
          <ScrollView style={styles.chatMessages} contentContainerStyle={{ paddingBottom: 18 }} showsVerticalScrollIndicator={false}>
            {messages.map((message, index) => (
              <View key={`${index}-${message.from}`} style={[styles.messageRow, message.from === 'user' && { justifyContent: 'flex-end' }]}>
                {message.from === 'orbe' ? <View style={styles.messageAvatar}><Text style={styles.messageAvatarText}>✦</Text></View> : null}
                <View style={[styles.messageBubble, message.from === 'user' ? styles.userBubble : styles.orbeBubble]}>
                  {message.from === 'orbe' ? <Text style={styles.messageSender}>ORBE</Text> : null}
                  <Text style={styles.messageText}>{message.text}</Text>
                </View>
              </View>
            ))}
            <Text style={styles.chatDisclaimer}>Respostas demonstrativas. Não substituem protocolos oficiais ou avaliação profissional.</Text>
            <Text style={styles.chatSuggestionHeading}>SUGESTÕES</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {suggestions.slice(0, 4).map((item) => <Pressable key={item} onPress={() => sendMessage(item)} style={styles.chatSuggestion}><Text style={styles.chatSuggestionText}>{item}</Text></Pressable>)}
            </ScrollView>
          </ScrollView>
          <View style={styles.chatComposer}>
            <TextInput value={chatInput} onChangeText={setChatInput} placeholder="Escreva sua mensagem..." placeholderTextColor="#7785A6" style={styles.chatInput} multiline />
            <Pressable onPress={() => sendMessage()} style={styles.sendButton}><Text style={styles.sendButtonText}>↑</Text></Pressable>
          </View>
        </View>
      )}
    </View>
  );

  const renderRecords = () => (
    <ScrollView contentContainerStyle={styles.pageContent}>
      <View style={styles.topBar}><View><Text style={styles.eyebrow}>HISTÓRICO OPERACIONAL</Text><Text style={styles.pageTitle}>Registros</Text></View><View style={styles.avatar}><Text style={styles.avatarText}>{firstName.slice(0, 1).toUpperCase()}</Text></View></View>
      <Panel style={styles.searchPanel}><Text style={styles.searchIcon}>⌕</Text><Text style={styles.searchPlaceholder}>Buscar por ocorrência ou localização</Text></Panel>
      <View style={styles.filterRow}><Text style={styles.filterActive}>Todos  03</Text><Text style={styles.filterText}>Em revisão</Text><Text style={styles.filterText}>Concluídos</Text></View>
      {demoRecords.map((record) => (
        <Panel key={record.id} style={styles.recordCard}>
          <View style={styles.recordTop}><Text style={styles.recordId}>{record.id}</Text><View style={[styles.recordStatus, { borderColor: `${record.color}66` }]}><View style={[styles.statusDot, { backgroundColor: record.color }]} /><Text style={[styles.recordStatusText, { color: record.color }]}>{record.status}</Text></View></View>
          <Text style={styles.recordTitle}>{record.title}</Text>
          <Text style={styles.recordMeta}>{record.place}</Text>
          <View style={styles.recordBottom}><Text style={styles.recordDate}>{record.date}</Text><Text style={styles.recordArrow}>↗</Text></View>
        </Panel>
      ))}
      <Text style={styles.disclaimer}>Registros fictícios para demonstração da interface.</Text>
    </ScrollView>
  );

  const renderProfile = () => (
    <ScrollView contentContainerStyle={styles.pageContent}>
      <View style={styles.topBar}><View><Text style={styles.eyebrow}>CONTA E PREFERÊNCIAS</Text><Text style={styles.pageTitle}>Meu perfil</Text></View><View style={styles.avatar}><Text style={styles.avatarText}>{firstName.slice(0, 1).toUpperCase()}</Text></View></View>
      <Panel style={styles.profileHero}>
        <View style={styles.profileAvatar}><Text style={styles.profileAvatarText}>{firstName.slice(0, 1).toUpperCase()}</Text></View>
        <Text style={styles.profileName}>{profile?.name || 'Profissional'}</Text>
        <Text style={styles.profileRole}>{profile?.role || 'Profissional APH'}</Text>
        <Text style={styles.profileEmail}>{profile?.email || ''}</Text>
      </Panel>
      <SectionTitle title="Informações profissionais" />
      <Panel style={styles.infoPanel}>
        <View style={styles.infoRow}><Text style={styles.infoLabel}>Função</Text><Text style={styles.infoValue}>{profile?.role || 'Não informado'}</Text></View>
        <View style={styles.infoRow}><Text style={styles.infoLabel}>Unidade / equipe</Text><Text style={styles.infoValue}>{profile?.unit || 'Não informada'}</Text></View>
        <View style={styles.infoRow}><Text style={styles.infoLabel}>Conta</Text><Text style={styles.infoValue}>Demonstração local</Text></View>
      </Panel>
      <SectionTitle title="Segurança" />
      <Panel style={styles.infoPanel}>
        <View style={styles.infoRow}><Text style={styles.infoLabel}>Biometria do aparelho</Text><Text style={styles.infoValue}>Disponível conforme dispositivo</Text></View>
        <Text style={styles.disclaimer}>A etapa ilustrativa de reconhecimento facial e de voz não realiza identificação biométrica real.</Text>
      </Panel>
      <PrimaryButton title="Sair da conta" onPress={logout} secondary />
      <Text style={styles.disclaimer}>Protótipo de interface. Não utilize dados reais de pacientes.</Text>
    </ScrollView>
  );

  if (authScreen !== 'welcome' && authScreen !== 'register' && authScreen !== 'login' && authScreen !== 'scan') {
    return <View style={styles.root}>{renderAuth()}</View>;
  }
  if (authScreen === 'welcome' || authScreen === 'register' || authScreen === 'login' || authScreen === 'scan') {
    if (authScreen !== 'welcome' || !profile) return <View style={styles.root}><StatusBar barStyle="light-content" />{renderAuth()}</View>;
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <View style={styles.backgroundGlowOne} />
      <View style={styles.backgroundGlowTwo} />
      <View style={styles.mainContent}>
        {activeTab === 'home' ? renderHome() : null}
        {activeTab === 'assistant' ? renderAssistant() : null}
        {activeTab === 'records' ? renderRecords() : null}
        {activeTab === 'profile' ? renderProfile() : null}
        {activeTab === 'segments' ? <ModuloTrechos /> : null}
      </View>
      <View style={styles.tabBar}>
        <TabButton label="Início" icon="⌂" active={activeTab === 'home'} onPress={() => setActiveTab('home')} />
        <TabButton label="Assistente" icon="✦" active={activeTab === 'assistant'} onPress={() => setActiveTab('assistant')} />
        <TabButton label="Registros" icon="▤" active={activeTab === 'records'} onPress={() => setActiveTab('records')} />
       <TabButton
  label="Trechos"
  icon="⌖"
  active={activeTab === 'segments'}
  onPress={() => setActiveTab('segments')}
/>
        <TabButton label="Perfil" icon="○" active={activeTab === 'profile'} onPress={() => setActiveTab('profile')} />
      </View>
    </View>
  );
}

function TabButton({ label, icon, active, onPress }: { label: string; icon: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.tabButton}>
      <Text style={[styles.tabIcon, active && styles.tabIconActive]}>{icon}</Text>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
      {active ? <View style={styles.tabIndicator} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  backgroundGlowOne: { position: 'absolute', top: -130, right: -120, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(85, 91, 210, 0.13)' },
  backgroundGlowTwo: { position: 'absolute', bottom: 40, left: -170, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(45, 160, 210, 0.08)' },
  mainContent: { flex: 1 },
  pageContent: { paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 42 : 58, paddingBottom: 30 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 26 },
  brand: { color: COLORS.text, fontSize: 38, letterSpacing: 5, fontWeight: '800' },
  brandSmall: { color: COLORS.text, fontSize: 25, letterSpacing: 3, fontWeight: '800' },
  brandDot: { color: COLORS.cyan },
  topCaption: { color: COLORS.muted, fontSize: 9, letterSpacing: 2, marginTop: 2 },
  eyebrow: { color: COLORS.cyan, fontSize: 9, letterSpacing: 2.1, fontWeight: '700' },
  avatar: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: 'rgba(103,232,249,0.5)', backgroundColor: '#1B2A50', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: COLORS.cyan, fontSize: 17, fontWeight: '700' },
  greetingBlock: { marginBottom: 22 },
  greeting: { color: COLORS.text, fontSize: 31, fontWeight: '700', marginTop: 9, letterSpacing: -0.8 },
  subGreeting: { color: COLORS.muted, fontSize: 13, marginTop: 5 },
  panel: { backgroundColor: 'rgba(17, 29, 58, 0.88)', borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, padding: 16, overflow: 'hidden' },
  heroPanel: { minHeight: 190, flexDirection: 'row', alignItems: 'center', marginBottom: 28, padding: 18, backgroundColor: 'rgba(25, 36, 76, 0.92)' },
  heroText: { flex: 1, paddingRight: 4 },
  onlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.green },
  onlineText: { color: COLORS.green, fontSize: 8, letterSpacing: 1.1, fontWeight: '700' },
  heroTitle: { color: COLORS.text, fontSize: 19, lineHeight: 25, fontWeight: '700', maxWidth: 230 },
  heroSubtitle: { color: COLORS.muted, fontSize: 11, lineHeight: 17, marginTop: 7, maxWidth: 220 },
  heroButton: { alignSelf: 'flex-start', backgroundColor: 'rgba(103,232,249,0.13)', borderWidth: 1, borderColor: 'rgba(103,232,249,0.35)', paddingHorizontal: 13, paddingVertical: 10, borderRadius: 11, marginTop: 14 },
  heroButtonText: { color: COLORS.cyan, fontSize: 11, fontWeight: '700' },
  heroOrb: { width: 76, alignItems: 'center', justifyContent: 'center', marginLeft: -4 },
  orbGlow: { position: 'absolute', backgroundColor: 'rgba(130, 112, 255, 0.22)', borderWidth: 1, borderColor: 'rgba(103,232,249,0.3)' },
  orbCore: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#243A75', borderColor: 'rgba(151, 190, 255, 0.85)', shadowColor: '#8B7CFF', shadowOpacity: 0.85, shadowRadius: 24, shadowOffset: { width: 0, height: 0 }, elevation: 14 },
  orbInner: { width: '82%', height: '82%', borderRadius: 100, alignItems: 'center', justifyContent: 'center', backgroundColor: '#5268B0', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', overflow: 'hidden' },
  orbHighlight: { position: 'absolute', top: 8, left: 12, width: '55%', height: '34%', borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.18)', transform: [{ rotate: '-28deg' }] },
  sectionTitle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 13, marginTop: 2 },
  sectionHeading: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  sectionAction: { color: COLORS.cyan, fontSize: 10 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 25, gap: 10 },
  metricCard: { width: '48%', minHeight: 124, padding: 13 },
  metricIcon: { color: COLORS.cyan, fontSize: 17 },
  metricValue: { color: COLORS.text, fontSize: 27, fontWeight: '800', marginTop: 7 },
  metricLabel: { color: COLORS.muted, fontSize: 10, marginTop: 1 },
  metricTrend: { color: COLORS.green, fontSize: 9, marginTop: 7 },
  activityPanel: { paddingVertical: 3, marginBottom: 25 },
  activityRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, gap: 11 },
  activityDivider: { borderTopWidth: 1, borderTopColor: COLORS.border },
  activityIcon: { width: 35, height: 35, borderRadius: 11, backgroundColor: 'rgba(103,232,249,0.1)', alignItems: 'center', justifyContent: 'center' },
  activityIconText: { color: COLORS.cyan, fontSize: 18 },
  activityTitle: { color: COLORS.text, fontSize: 11, fontWeight: '700' },
  activityMeta: { color: COLORS.muted, fontSize: 9, marginTop: 4 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  quickGrid: { flexDirection: 'row', gap: 10 },
  quickCard: { flex: 1, padding: 15, backgroundColor: 'rgba(17,29,58,0.85)', borderWidth: 1, borderColor: COLORS.border, borderRadius: 17 },
  quickIcon: { color: COLORS.cyan, fontSize: 20, marginBottom: 10 },
  quickTitle: { color: COLORS.text, fontSize: 12, fontWeight: '700' },
  quickCaption: { color: COLORS.muted, fontSize: 9, marginTop: 5 },
  disclaimer: { color: '#7785A6', fontSize: 9, lineHeight: 15, marginTop: 17 },
  tabBar: { height: 72, backgroundColor: 'rgba(9, 16, 37, 0.98)', borderTopWidth: 1, borderTopColor: COLORS.border, flexDirection: 'row', justifyContent: 'space-around', paddingTop: 8, paddingBottom: Platform.OS === 'ios' ? 18 : 7 },
  tabButton: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  tabIcon: { color: '#7180A3', fontSize: 20 },
  tabIconActive: { color: COLORS.cyan },
  tabLabel: { color: '#7180A3', fontSize: 9 },
  tabLabelActive: { color: COLORS.cyan, fontWeight: '700' },
  tabIndicator: { position: 'absolute', top: -8, width: 24, height: 2, borderRadius: 2, backgroundColor: COLORS.cyan },
  assistantPage: { flex: 1, paddingTop: Platform.OS === 'android' ? 42 : 58, paddingHorizontal: 20, paddingBottom: 10 },
  assistantHeader: { alignItems: 'center' },
  pageTitle: { color: COLORS.text, fontSize: 29, fontWeight: '800', marginTop: 7 },
  modeSwitch: { flexDirection: 'row', backgroundColor: '#0D1730', padding: 4, borderRadius: 13, marginTop: 18, borderWidth: 1, borderColor: COLORS.border },
  modeButton: { paddingVertical: 9, paddingHorizontal: 22, borderRadius: 10 },
  modeButtonActive: { backgroundColor: '#263866' },
  modeText: { color: COLORS.muted, fontSize: 11, fontWeight: '600' },
  modeTextActive: { color: COLORS.cyan },
  voiceContent: { alignItems: 'center', paddingBottom: 25 },
  voiceOrbWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 24, marginBottom: 8 },
  voiceRing: { position: 'absolute', width: 220, height: 220, borderRadius: 110, borderWidth: 1, borderColor: 'rgba(103,232,249,0.5)', backgroundColor: 'rgba(103,232,249,0.035)' },
  voiceTitle: { color: COLORS.text, fontSize: 20, fontWeight: '700', marginTop: 8 },
  voiceSubtitle: { color: COLORS.muted, fontSize: 11, textAlign: 'center', marginTop: 7, maxWidth: 270, lineHeight: 17 },
  micButton: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#344C91', borderWidth: 1, borderColor: 'rgba(103,232,249,0.7)', alignItems: 'center', justifyContent: 'center', marginTop: 20, shadowColor: COLORS.cyan, shadowOpacity: 0.3, shadowRadius: 18, elevation: 8 },
  micButtonActive: { backgroundColor: '#674AA8', borderColor: COLORS.purple },
  micGlyph: { color: '#FFFFFF', fontSize: 28, fontWeight: '700' },
  micCaption: { color: COLORS.cyan, fontSize: 8, letterSpacing: 2, marginTop: 9, fontWeight: '700' },
  suggestionList: { width: '100%', gap: 8, marginTop: 3 },
  suggestion: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(17,29,58,0.78)', borderWidth: 1, borderColor: COLORS.border, borderRadius: 13, paddingHorizontal: 13, paddingVertical: 13 },
  suggestionText: { color: '#DCE5FF', fontSize: 10, flex: 1, paddingRight: 10 },
  suggestionArrow: { color: COLORS.cyan, fontSize: 15 },
  chatContainer: { flex: 1, marginTop: 15 },
  chatMessages: { flex: 1 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 13, gap: 7 },
  messageAvatar: { width: 27, height: 27, borderRadius: 14, backgroundColor: '#334A88', alignItems: 'center', justifyContent: 'center' },
  messageAvatarText: { color: COLORS.cyan, fontSize: 13 },
  messageBubble: { maxWidth: '84%', padding: 12, borderRadius: 15 },
  orbeBubble: { backgroundColor: '#142344', borderWidth: 1, borderColor: COLORS.border, borderBottomLeftRadius: 4 },
  userBubble: { backgroundColor: '#344B86', borderBottomRightRadius: 4 },
  messageSender: { color: COLORS.cyan, fontSize: 8, fontWeight: '800', letterSpacing: 1, marginBottom: 5 },
  messageText: { color: COLORS.text, fontSize: 11, lineHeight: 17 },
  chatDisclaimer: { color: '#7785A6', fontSize: 9, lineHeight: 14, marginBottom: 14 },
  chatSuggestionHeading: { color: COLORS.cyan, fontSize: 8, letterSpacing: 1.6, fontWeight: '700', marginBottom: 8 },
  chatSuggestion: { backgroundColor: '#172849', borderWidth: 1, borderColor: COLORS.border, paddingVertical: 9, paddingHorizontal: 11, borderRadius: 12, maxWidth: 190 },
  chatSuggestionText: { color: '#DCE5FF', fontSize: 9 },
  chatComposer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#121F3D', borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7, marginBottom: 8 },
  chatInput: { flex: 1, color: COLORS.text, fontSize: 12, maxHeight: 85, paddingVertical: 8 },
  sendButton: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#4E6AB0', alignItems: 'center', justifyContent: 'center' },
  sendButtonText: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  searchPanel: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, marginBottom: 17 },
  searchIcon: { color: COLORS.cyan, fontSize: 21, marginRight: 9 },
  searchPlaceholder: { color: '#7785A6', fontSize: 11 },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 17, marginBottom: 15 },
  filterActive: { color: COLORS.cyan, fontSize: 10, fontWeight: '700' },
  filterText: { color: COLORS.muted, fontSize: 10 },
  recordCard: { marginBottom: 11, padding: 15 },
  recordTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  recordId: { color: COLORS.cyan, fontSize: 9, letterSpacing: 1, fontWeight: '700' },
  recordStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 5 },
  recordStatusText: { fontSize: 8 },
  recordTitle: { color: COLORS.text, fontSize: 14, fontWeight: '700', marginTop: 15 },
  recordMeta: { color: COLORS.muted, fontSize: 10, marginTop: 5 },
  recordBottom: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 13, paddingTop: 10 },
  recordDate: { color: '#8290B0', fontSize: 9 },
  recordArrow: { color: COLORS.cyan, fontSize: 14 },
  profileHero: { alignItems: 'center', paddingVertical: 25, marginBottom: 25 },
  profileAvatar: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#314B88', borderWidth: 1, borderColor: COLORS.cyan, alignItems: 'center', justifyContent: 'center' },
  profileAvatarText: { color: '#FFFFFF', fontSize: 29, fontWeight: '700' },
  profileName: { color: COLORS.text, fontSize: 19, fontWeight: '700', marginTop: 12 },
  profileRole: { color: COLORS.cyan, fontSize: 11, marginTop: 5 },
  profileEmail: { color: COLORS.muted, fontSize: 10, marginTop: 5 },
  infoPanel: { marginBottom: 22 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 12 },
  infoLabel: { color: COLORS.muted, fontSize: 10 },
  infoValue: { color: COLORS.text, fontSize: 10, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  authScreen: { flex: 1, backgroundColor: COLORS.background },
  authScroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: Platform.OS === 'android' ? 45 : 68, paddingBottom: 35 },
  authTop: { alignItems: 'center' },
  welcomeOrb: { alignItems: 'center', marginTop: 20, marginBottom: 12 },
  authHeading: { color: COLORS.text, fontSize: 27, lineHeight: 34, fontWeight: '800', textAlign: 'center', marginTop: 9 },
  authDescription: { color: COLORS.muted, fontSize: 12, lineHeight: 19, textAlign: 'center', marginTop: 9, marginBottom: 22, paddingHorizontal: 12 },
  authActions: { gap: 10, marginTop: 5 },
  primaryButton: { backgroundColor: '#5576C8', borderWidth: 1, borderColor: 'rgba(153,190,255,0.55)', borderRadius: 13, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 16, marginTop: 10 },
  secondaryButton: { backgroundColor: 'rgba(103,232,249,0.07)', borderColor: 'rgba(103,232,249,0.28)' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  formPanel: { padding: 17 },
  inputLabel: { color: COLORS.cyan, fontSize: 8, letterSpacing: 1.3, fontWeight: '700', marginTop: 12, marginBottom: 6 },
  input: { color: COLORS.text, backgroundColor: 'rgba(5,12,30,0.55)', borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 12 },
  linkText: { color: COLORS.cyan, fontSize: 10, textAlign: 'center', marginTop: 14, marginBottom: 3 },
  footerNote: { color: '#657394', fontSize: 8, letterSpacing: 1.5, textAlign: 'center', marginTop: 28 },
  scanContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 25, paddingBottom: 30 },
  scanFrame: { width: 250, height: 250, borderRadius: 34, borderWidth: 1, borderColor: 'rgba(103,232,249,0.25)', backgroundColor: 'rgba(17,29,58,0.6)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  faceOval: { width: 132, height: 172, borderWidth: 2, borderColor: COLORS.cyan, borderRadius: 70, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(103,232,249,0.05)' },
  faceGlyph: { color: 'rgba(103,232,249,0.65)', fontSize: 62 },
  scanLine: { position: 'absolute', width: '80%', height: 2, backgroundColor: COLORS.cyan, shadowColor: COLORS.cyan, shadowOpacity: 1, shadowRadius: 12, elevation: 8 },
  cornerTL: { position: 'absolute', top: 19, left: 19, width: 25, height: 25, borderTopWidth: 2, borderLeftWidth: 2, borderColor: COLORS.cyan },
  cornerTR: { position: 'absolute', top: 19, right: 19, width: 25, height: 25, borderTopWidth: 2, borderRightWidth: 2, borderColor: COLORS.cyan },
  cornerBL: { position: 'absolute', bottom: 19, left: 19, width: 25, height: 25, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: COLORS.cyan },
  cornerBR: { position: 'absolute', bottom: 19, right: 19, width: 25, height: 25, borderBottomWidth: 2, borderRightWidth: 2, borderColor: COLORS.cyan },
  voiceScan: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, height: 110 },
  voiceBar: { width: 5, borderRadius: 5, backgroundColor: COLORS.cyan },
  scanTitle: { color: COLORS.text, fontSize: 21, fontWeight: '700', marginTop: 26 },
  scanSubtitle: { color: COLORS.muted, fontSize: 11, marginTop: 7 },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginTop: 25, marginBottom: 15 },
  stepDot: { width: 9, height: 9, borderRadius: 5 },
  stepLine: { width: 46, height: 1 },
  demoNote: { color: '#8290B0', fontSize: 9, textAlign: 'center', marginBottom: 8 },
});

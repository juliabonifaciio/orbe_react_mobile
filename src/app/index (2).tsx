
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import * as Speech from 'expo-speech';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView,
  StatusBar, StyleSheet, Text, TextInput, View,
} from 'react-native';

type User = { name: string; email: string; role: string; unit: string; password: string; faceEnabled?: boolean };
type Screen = 'start' | 'register' | 'login' | 'app';
type Tab = 'inicio' | 'orb' | 'atendimentos' | 'perfil';

const USER_KEY = 'orbe_demo_user_v1';
const C = {
  bg: '#080F29', panel: '#111D3B', panel2: '#17264B', line: 'rgba(177,164,255,0.22)',
  lilac: '#C9B6FF', cyan: '#55DCCB', blue: '#65B8FF', white: '#F5F4FF',
  muted: '#A7B4D1', soft: '#DAD5F5', warning: '#F4BE72',
};

function Glow({ color = C.lilac, size = 150 }: { color?: string; size?: number }) {
  return <View pointerEvents="none" style={[styles.glow, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]} />;
}
function Brand() {
  return <View style={styles.brandRow}>
    <View style={styles.orbit}><View style={styles.orbitDot} /><View style={styles.orbitDot2} /></View>
    <View><Text style={styles.brand}>ORBE</Text><Text style={styles.tagline}>A inteligência que conecta a ocorrência.</Text></View>
  </View>;
}
function Button({ title, onPress, secondary = false, disabled = false }: { title: string; onPress: () => void; secondary?: boolean; disabled?: boolean }) {
  return <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, secondary && styles.buttonSecondary, disabled && { opacity: .45 }, pressed && { transform: [{ scale: .985 }], opacity: .86 }]}>
    <Text style={[styles.buttonText, secondary && { color: C.lilac }]}>{title}</Text>
  </Pressable>;
}
function Field({ label, value, onChangeText, placeholder, secureTextEntry = false, keyboardType = 'default' }: any) {
  return <View style={styles.fieldWrap}>
    <Text style={styles.label}>{label}</Text>
    <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#7180A5"
      secureTextEntry={secureTextEntry} keyboardType={keyboardType} autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
      style={styles.input} />
  </View>;
}

export default function Index() {
  const [screen, setScreen] = useState<Screen>('start');
  const [tab, setTab] = useState<Tab>('inicio');
  const [user, setUser] = useState<User | null>(null);
  const [storedUser, setStoredUser] = useState<User | null>(null);
  const [name, setName] = useState(''); const [email, setEmail] = useState('');
  const [role, setRole] = useState('Profissional de APH'); const [unit, setUnit] = useState('');
  const [password, setPassword] = useState(''); const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [message, setMessage] = useState(''); const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { (async () => {
    try { const raw = await SecureStore.getItemAsync(USER_KEY); if (raw) { const parsed = JSON.parse(raw) as User; setStoredUser(parsed); setLoginEmail(parsed.email); setScreen('login'); } }
    catch { /* primeira execução ou dados locais inválidos */ }
  })(); }, []);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    return hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  }, []);

  async function register() {
    if (!name.trim() || !email.trim() || !password.trim() || !unit.trim()) {
      Alert.alert('Dados incompletos', 'Preencha nome, e-mail, unidade e senha para continuar.'); return;
    }
    const newUser: User = { name: name.trim(), email: email.trim().toLowerCase(), role, unit: unit.trim(), password };
    try {
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(newUser));
      setStoredUser(newUser); setUser(newUser); setScreen('app');
      Alert.alert('Cadastro criado', 'Este cadastro está salvo localmente neste aparelho para demonstração. Para uso real, conectaremos a autenticação ao backend.');
    } catch { Alert.alert('Não foi possível salvar', 'Verifique as permissões do dispositivo e tente novamente.'); }
  }

  async function login() {
    const candidate = storedUser;
    if (!candidate || candidate.email !== loginEmail.trim().toLowerCase() || candidate.password !== loginPassword) {
      Alert.alert('Acesso não autorizado', 'Confira seu e-mail e sua senha.'); return;
    }
    setUser(candidate); setScreen('app');
  }

  async function biometricLogin() {
    if (!storedUser) { Alert.alert('Cadastro necessário', 'Crie seu cadastro primeiro.'); return; }
    try {
      const hardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hardware || !enrolled) {
        Alert.alert('Biometria indisponível', 'Cadastre Face ID ou reconhecimento facial nas configurações do aparelho. Você ainda pode entrar com e-mail e senha.');
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Entrar no ORBE',
        cancelLabel: 'Cancelar',
        fallbackLabel: 'Usar senha',
        disableDeviceFallback: false,
      });
      if (result.success) { setUser(storedUser); setScreen('app'); }
    } catch { Alert.alert('Falha na autenticação', 'Não foi possível iniciar a autenticação biométrica.'); }
  }

  async function enableBiometric() {
    try {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const hasFace = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasFace || !enrolled) {
        Alert.alert('Reconhecimento facial', 'Este aparelho não informou um reconhecimento facial configurado. Você pode continuar usando a senha ou configurar a biometria nas configurações do aparelho.');
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Confirmar identidade para o ORBE' });
      if (result.success && storedUser) {
        const updated = { ...storedUser, faceEnabled: true };
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(updated));
        setStoredUser(updated); Alert.alert('Pronto', 'A autenticação biométrica do aparelho poderá ser usada no próximo acesso.');
      }
    } catch { Alert.alert('Indisponível', 'Não foi possível configurar a biometria neste aparelho.'); }
  }

  function askOrb() {
    const q = question.trim();
    if (!q) return;
    const normalized = q.toLowerCase();
    let answer = 'Posso ajudar a organizar o atendimento, consultar informações cadastradas e preparar um resumo para sua revisão. Para orientações clínicas, consulte sempre o protocolo institucional aprovado e valide as decisões com o profissional responsável.';
    if (normalized.includes('relatório') || normalized.includes('resumo')) answer = 'Vamos preparar um resumo para validação. Informe identificação da ocorrência, horário, local, equipe, informações observadas e providências realizadas. Revise todos os campos antes de salvar ou compartilhar.';
    else if (normalized.includes('protocolo')) answer = 'Posso localizar um protocolo quando a base institucional estiver conectada. Nesta versão demonstrativa, a consulta oficial ainda não está integrada. Não vou inventar condutas ou doses.';
    else if (normalized.includes('horário') || normalized.includes('hora')) answer = `Horário registrado neste aparelho: ${new Date().toLocaleString('pt-BR')}. Confirme se corresponde ao marco do atendimento antes de registrar.`;
    else if (normalized.includes('pendente') || normalized.includes('campo')) answer = 'Checklist demonstrativo: horário do chamado, chegada ao local, identificação da ocorrência, equipe, recursos solicitados, informações observadas e encerramento. Confirme os itens aplicáveis ao seu fluxo institucional.';
    setMessage(answer); setQuestion('');
    Speech.speak(answer, { language: 'pt-BR', rate: 0.96 });
  }

  function logout() { setUser(null); setLoginPassword(''); setScreen('login'); setTab('inicio'); }

  if (screen !== 'app') return <SafeAreaView style={styles.safe}>
    <StatusBar barStyle="light-content" />
    <Glow color="#5D4DB5" size={240} /><Glow color="#087D91" size={170} />
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.authContent} keyboardShouldPersistTaps="handled">
        <Brand />
        {screen === 'start' && <>
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>PLATAFORMA DE APOIO AO APH</Text>
            <Text style={styles.heroTitle}>Tecnologia ao lado de quem cuida.</Text>
            <Text style={styles.body}>Seu ambiente de apoio, registro e organização do atendimento pré-hospitalar.</Text>
          </View>
          <View style={styles.glassCard}>
            <Text style={styles.cardTitle}>Acesse o ORBE</Text>
            <Text style={styles.muted}>Entre com seu cadastro ou crie seu perfil profissional.</Text>
            <Button title="Criar cadastro profissional" onPress={() => setScreen('register')} />
            <Button title="Já tenho cadastro" secondary onPress={() => setScreen('login')} />
          </View>
        </>}
        {screen === 'register' && <View style={styles.glassCard}>
          <Text style={styles.eyebrow}>PRIMEIRO ACESSO</Text><Text style={styles.cardTitle}>Cadastro profissional</Text>
          <Text style={styles.muted}>Preencha seus dados para configurar seu espaço no ORBE.</Text>
          <Field label="Nome completo" value={name} onChangeText={setName} placeholder="Seu nome" />
          <Field label="E-mail" value={email} onChangeText={setEmail} placeholder="voce@exemplo.com" keyboardType="email-address" />
          <Field label="Função" value={role} onChangeText={setRole} placeholder="Profissional de APH" />
          <Field label="Unidade / equipe" value={unit} onChangeText={setUnit} placeholder="Sua unidade ou equipe" />
          <Field label="Senha" value={password} onChangeText={setPassword} placeholder="Crie uma senha" secureTextEntry />
          <Button title="Criar meu acesso" onPress={register} />
          <Button title="Voltar" secondary onPress={() => setScreen('start')} />
        </View>}
        {screen === 'login' && <View style={styles.glassCard}>
          <Text style={styles.eyebrow}>ACESSO SEGURO</Text><Text style={styles.cardTitle}>Bem-vindo de volta</Text>
          <Text style={styles.muted}>{storedUser ? `Olá, ${storedUser.name}. Entre para continuar.` : 'Se ainda não possui cadastro neste aparelho, crie seu perfil primeiro.'}</Text>
          <Field label="E-mail" value={loginEmail} onChangeText={setLoginEmail} placeholder="voce@exemplo.com" keyboardType="email-address" />
          <Field label="Senha" value={loginPassword} onChangeText={setLoginPassword} placeholder="Sua senha" secureTextEntry />
          <Button title="Entrar no ORBE" onPress={login} />
          <Button title="Entrar com reconhecimento do aparelho" secondary onPress={biometricLogin} />
          <Button title="Criar cadastro" secondary onPress={() => setScreen('register')} />
        </View>}
        <Text style={styles.footer}>ORBE • Apoio inteligente ao atendimento pré-hospitalar</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;

  return <SafeAreaView style={styles.safe}>
    <StatusBar barStyle="light-content" />
    <Glow color="#51439D" size={190} /><Glow color="#087D91" size={130} />
    <View style={styles.appHeader}>
      <Brand />
      <View style={styles.avatar}><Text style={styles.avatarText}>{(user?.name || 'P').slice(0,1).toUpperCase()}</Text></View>
    </View>
    <ScrollView contentContainerStyle={styles.appContent}>
      {tab === 'inicio' && <>
        <Text style={styles.eyebrow}>{greeting.toUpperCase()}</Text>
        <Text style={styles.heroTitle}>Olá, {user?.name.split(' ')[0] || 'profissional'}.</Text>
        <Text style={styles.body}>Aqui está o resumo da sua atividade no ORBE.</Text>
        <View style={styles.metricGrid}>
          <Metric value="12" label="Atendimentos" tint={C.lilac} />
          <Metric value="08" label="Relatórios" tint={C.cyan} />
          <Metric value="06" label="Protocolos consultados" tint={C.blue} />
          <Metric value="03" label="Pendências para revisar" tint={C.warning} />
        </View>
        <View style={styles.glassCard}>
          <Text style={styles.cardTitle}>Atividade recente</Text>
          <Activity title="Atendimento registrado" detail="Registro demonstrativo • Hoje, 14:32" status="Revisado" />
          <Activity title="Resumo preparado" detail="Relatório aguardando validação" status="Pendente" />
          <Activity title="Protocolo consultado" detail="Consulta demonstrativa • Ontem" status="Concluído" />
        </View>
        <View style={styles.glassCard}>
          <Text style={styles.cardTitle}>Seu assistente está pronto</Text>
          <Text style={styles.muted}>Converse com o ORB para organizar informações, montar resumos e consultar recursos disponíveis.</Text>
          <Button title="Abrir agente ORB" onPress={() => setTab('orb')} />
        </View>
      </>}
      {tab === 'orb' && <View style={styles.glassCard}>
        <Text style={styles.eyebrow}>ASSISTENTE DE CAMPO</Text>
        <View style={styles.orbWrap}><View style={styles.orbCore}><Text style={styles.orbGlyph}>O</Text></View></View>
        <Text style={[styles.cardTitle, { textAlign: 'center' }]}>ORB</Text>
        <Text style={[styles.muted, { textAlign: 'center' }]}>Seu assistente de apoio ao atendimento pré-hospitalar.</Text>
        <View style={styles.notice}><Text style={styles.noticeText}>Versão inicial: interação por texto com resposta falada. A palavra de ativação contínua “Hey ORB” e a transcrição de voz exigem integração de reconhecimento de fala e configuração de build nativo.</Text></View>
        {message ? <View style={styles.answer}><Text style={styles.label}>RESPOSTA DO ORB</Text><Text style={styles.answerText}>{message}</Text><Pressable onPress={() => Speech.speak(message, { language: 'pt-BR' })}><Text style={styles.inlineLink}>Ouvir novamente</Text></Pressable></View> : null}
        <Field label="Como posso ajudar?" value={question} onChangeText={setQuestion} placeholder="Ex.: ORB, prepare um resumo..." />
        <Button title="Enviar para o ORB" onPress={askOrb} />
        <Button title="Ouvir boas-vindas" secondary onPress={() => Speech.speak('Olá. Eu sou o ORB, seu assistente de apoio ao atendimento pré-hospitalar.', { language: 'pt-BR' })} />
      </View>}
      {tab === 'atendimentos' && <View style={styles.glassCard}>
        <Text style={styles.eyebrow}>REGISTROS</Text><Text style={styles.cardTitle}>Meus atendimentos</Text>
        <Text style={styles.muted}>Exemplos de estrutura. Os dados reais serão carregados do backend quando a API estiver conectada.</Text>
        <Activity title="Ocorrência #ORB-024" detail="Atendimento rodoviário • 19/11/2026" status="Em revisão" />
        <Activity title="Ocorrência #ORB-023" detail="Registro assistencial • 17/11/2026" status="Concluído" />
        <Activity title="Ocorrência #ORB-022" detail="Apoio operacional • 15/11/2026" status="Concluído" />
        <Button title="Preparar novo registro com ORB" onPress={() => setTab('orb')} />
      </View>}
      {tab === 'perfil' && <View style={styles.glassCard}>
        <Text style={styles.eyebrow}>MINHA CONTA</Text><Text style={styles.cardTitle}>{user?.name}</Text>
        <Text style={styles.muted}>{user?.role}</Text>
        <View style={styles.profileLine}><Text style={styles.label}>E-MAIL</Text><Text style={styles.answerText}>{user?.email}</Text></View>
        <View style={styles.profileLine}><Text style={styles.label}>UNIDADE / EQUIPE</Text><Text style={styles.answerText}>{user?.unit}</Text></View>
        <Button title="Configurar reconhecimento facial do aparelho" onPress={enableBiometric} />
        <Button title="Sair da conta" secondary onPress={logout} />
        <Text style={styles.tiny}>Protótipo local. Para produção, autenticação, perfis e histórico devem ser validados por uma API segura.</Text>
      </View>}
    </ScrollView>
    <View style={styles.nav}>
      <NavItem icon="⌂" label="Início" active={tab === 'inicio'} onPress={() => setTab('inicio')} />
      <NavItem icon="✧" label="ORB" active={tab === 'orb'} onPress={() => setTab('orb')} />
      <NavItem icon="▤" label="Registros" active={tab === 'atendimentos'} onPress={() => setTab('atendimentos')} />
      <NavItem icon="○" label="Perfil" active={tab === 'perfil'} onPress={() => setTab('perfil')} />
    </View>
  </SafeAreaView>;
}

function Metric({ value, label, tint }: { value: string; label: string; tint: string }) {
  return <View style={styles.metric}><Text style={[styles.metricValue, { color: tint }]}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}
function Activity({ title, detail, status }: { title: string; detail: string; status: string }) {
  return <View style={styles.activity}><View style={{ flex: 1 }}><Text style={styles.activityTitle}>{title}</Text><Text style={styles.mutedSmall}>{detail}</Text></View><Text style={styles.status}>{status}</Text></View>;
}
function NavItem({ icon, label, active, onPress }: any) {
  return <Pressable onPress={onPress} style={styles.navItem}><Text style={[styles.navIcon, active && { color: C.cyan }]}>{icon}</Text><Text style={[styles.navLabel, active && { color: C.white }]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  glow: { position: 'absolute', top: 80, left: -55, opacity: .13 },
  authContent: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 34, paddingBottom: 28 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 34 },
  orbit: { width: 43, height: 34, borderWidth: 2, borderColor: C.cyan, borderRadius: 24, transform: [{ rotate: '-28deg' }], alignItems: 'flex-end', justifyContent: 'space-between', padding: 1 },
  orbitDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.cyan },
  orbitDot2: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.blue, alignSelf: 'flex-start' },
  brand: { color: C.lilac, fontSize: 27, fontWeight: '800', letterSpacing: 5 },
  tagline: { color: C.muted, fontSize: 9, marginTop: 1 },
  hero: { marginTop: 28, marginBottom: 25 },
  eyebrow: { color: C.cyan, fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 10 },
  heroTitle: { color: C.white, fontSize: 31, fontWeight: '800', lineHeight: 38, marginBottom: 8 },
  body: { color: C.muted, fontSize: 14, lineHeight: 22 },
  glassCard: { backgroundColor: 'rgba(20,32,66,0.88)', borderWidth: 1, borderColor: C.line, borderRadius: 24, padding: 20, marginBottom: 16, shadowColor: '#8D74FF', shadowOpacity: .16, shadowRadius: 22, elevation: 8 },
  cardTitle: { color: C.white, fontSize: 21, fontWeight: '700', marginBottom: 8 },
  muted: { color: C.muted, fontSize: 13, lineHeight: 20, marginBottom: 16 },
  mutedSmall: { color: C.muted, fontSize: 11, marginTop: 5 },
  fieldWrap: { marginBottom: 13 },
  label: { color: C.soft, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 7 },
  input: { backgroundColor: 'rgba(5,12,34,0.75)', color: C.white, borderWidth: 1, borderColor: 'rgba(143,161,214,0.24)', borderRadius: 13, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14 },
  button: { backgroundColor: '#9D85F2', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 10, shadowColor: '#9D85F2', shadowOpacity: .28, shadowRadius: 14, elevation: 4 },
  buttonSecondary: { backgroundColor: 'rgba(126,111,190,0.13)', borderWidth: 1, borderColor: 'rgba(190,169,255,0.35)', shadowOpacity: 0 },
  buttonText: { color: '#0B1230', fontWeight: '800', fontSize: 13 },
  footer: { color: '#657395', fontSize: 10, textAlign: 'center', marginTop: 20 },
  appHeader: { paddingHorizontal: 20, paddingTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  avatar: { width: 39, height: 39, borderRadius: 20, backgroundColor: 'rgba(85,220,203,.17)', borderWidth: 1, borderColor: C.cyan, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: C.cyan, fontWeight: '800', fontSize: 16 },
  appContent: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 25 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 20 },
  metric: { width: '48%', minHeight: 102, backgroundColor: 'rgba(22,38,75,.88)', borderWidth: 1, borderColor: C.line, borderRadius: 18, padding: 15, justifyContent: 'center' },
  metricValue: { fontSize: 29, fontWeight: '800' },
  metricLabel: { color: C.muted, fontSize: 11, marginTop: 5 },
  activity: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: 'rgba(177,164,255,.12)' },
  activityTitle: { color: C.white, fontWeight: '700', fontSize: 13 },
  status: { color: C.cyan, fontSize: 10, fontWeight: '700', marginLeft: 8 },
  nav: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 4 : 12, backgroundColor: 'rgba(10,18,43,.97)', borderTopWidth: 1, borderTopColor: C.line },
  navItem: { alignItems: 'center', minWidth: 65, gap: 3 },
  navIcon: { color: C.muted, fontSize: 21 },
  navLabel: { color: C.muted, fontSize: 9, fontWeight: '700' },
  orbWrap: { alignSelf: 'center', marginVertical: 22, width: 142, height: 142, borderRadius: 71, borderWidth: 1, borderColor: 'rgba(85,220,203,.6)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(85,220,203,.08)', shadowColor: C.cyan, shadowOpacity: .45, shadowRadius: 28, elevation: 12 },
  orbCore: { width: 105, height: 105, borderRadius: 53, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(157,133,242,.22)', borderWidth: 2, borderColor: C.lilac },
  orbGlyph: { color: C.white, fontSize: 48, fontWeight: '200' },
  notice: { backgroundColor: 'rgba(244,190,114,.09)', borderWidth: 1, borderColor: 'rgba(244,190,114,.25)', borderRadius: 13, padding: 12, marginVertical: 12 },
  noticeText: { color: '#E8CFA9', fontSize: 11, lineHeight: 17 },
  answer: { backgroundColor: 'rgba(85,220,203,.08)', borderWidth: 1, borderColor: 'rgba(85,220,203,.25)', borderRadius: 14, padding: 14, marginVertical: 12 },
  answerText: { color: C.white, fontSize: 13, lineHeight: 20 },
  inlineLink: { color: C.cyan, fontSize: 12, fontWeight: '700', marginTop: 10 },
  profileLine: { borderBottomWidth: 1, borderBottomColor: C.line, paddingVertical: 13 },
  tiny: { color: '#7784A4', fontSize: 10, lineHeight: 16, marginTop: 15 },
});

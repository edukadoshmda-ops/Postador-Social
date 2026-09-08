import React, { useState, useMemo } from 'react';
import {
  PlayCircle,
  Search,
  ExternalLink,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Sparkles,
  Rocket,
  User,
  Zap,
  Flame,
  Users,
  Library as LibraryIcon,
  Smartphone,
  HelpCircle,
  Target,
  Share2,
  Check
} from 'lucide-react';

interface Tutorial {
  id: string;
  youtubeId: string;
  category: string;
  level: 'basic' | 'intermediate' | 'advanced';
  title: string;
  desc: string;
  duration?: string;
  featured?: boolean;
}

const CATEGORIES = [
  { id: 'all', name: 'Todos', icon: Sparkles },
  { id: 'start', name: 'Primeiros passos', icon: Rocket },
  { id: 'profiles', name: 'Perfis e conexão', icon: User },
  { id: 'automation', name: 'Automação', icon: Zap },
  { id: 'warmup', name: 'Aquecimento', icon: Flame },
  { id: 'groups', name: 'Grupos', icon: Users },
  { id: 'library', name: 'Biblioteca', icon: LibraryIcon },
  { id: 'mobile', name: 'Mobile', icon: Smartphone },
  { id: 'strategy', name: 'Estratégia', icon: Target },
  { id: 'help', name: 'Dúvidas & FAQ', icon: HelpCircle },
];

const TUTORIALS: Tutorial[] = [
  {
    id: 'sell-daily-organic',
    youtubeId: 'm4FUXUYlrD0',
    category: 'strategy',
    level: 'basic',
    title: 'Como vender todo dia sem tráfego pago',
    desc: 'Uma rotina 100% automática para vender todos os dias sem gastar com anúncios: como transformar grupos e comunidades em fluxo constante de clientes.',
    featured: true
  },
  {
    id: 'overview',
    youtubeId: 'CME_jDb9X6Y',
    category: 'start',
    level: 'basic',
    title: 'Conhecendo a Pulso Social',
    desc: 'Comece por aqui: veja o que a plataforma faz, como cada recurso se conecta e o que você consegue automatizar nas suas comunidades.',
    featured: true
  },
  {
    id: 'account-plans',
    youtubeId: '6lsb9P5iK40',
    category: 'start',
    level: 'basic',
    title: 'Criando sua conta e escolhendo o plano certo',
    desc: 'Comece sem gastar errado: veja como criar sua conta passo a passo e compare os planos pelo que cada um libera na prática.',
    featured: true
  },
  {
    id: 'install',
    youtubeId: '_1xzDjKzKjs',
    category: 'start',
    level: 'basic',
    title: 'Instalando a Extensão Pulso Social',
    desc: 'Passo a passo da instalação da extensão no Chrome e da primeira ativação com as permissões corretas.',
    featured: true
  },
  {
    id: 'connect-profile',
    youtubeId: 'TlrmVxYybms',
    category: 'profiles',
    level: 'basic',
    title: 'Conectando seu perfil',
    desc: 'Como vincular seu perfil à plataforma e validar a conexão antes de automatizar qualquer rotina.',
    featured: true
  },
  {
    id: 'connect-profile-first',
    youtubeId: 'eXPQgOQpFv0',
    category: 'profiles',
    level: 'basic',
    title: 'Conectando o perfil do Facebook pela primeira vez',
    desc: 'A primeira conexão é o passo que destrava tudo: veja onde encontrar a tela de conexão e como autorizar com segurança.',
    featured: true
  },
  {
    id: 'autopost-pro',
    youtubeId: 'U0YCCeT810c',
    category: 'automation',
    level: 'intermediate',
    title: 'Postador Pro: Publicações em Escala',
    desc: 'Agende e distribua publicações em centenas de grupos com controle inteligente de intervalos, spintax e anti-bloqueio.',
    featured: true
  },
  {
    id: 'autopost-campaigns',
    youtubeId: 'ocKDznZ2hGs',
    category: 'automation',
    level: 'basic',
    title: 'Postador Pro: Criando sua primeira campanha',
    desc: 'Do zero à campanha publicando: monte sua primeira sequência de postagens e entenda cada campo antes de disparar.',
    featured: true
  },
  {
    id: 'autopost-single',
    youtubeId: 'TGF2FXURHTw',
    category: 'automation',
    level: 'intermediate',
    title: 'Postador Pro: Postagem única e variáveis Spintax',
    desc: 'Use variáveis {opção 1|opção 2} para que uma mesma campanha gere textos únicos a cada envio, aumentando o alcance orgânico.',
    featured: false
  },
  {
    id: 'autopost-calibration',
    youtubeId: 'E9DGE3NK9Wg',
    category: 'automation',
    level: 'intermediate',
    title: 'Postador Pro: Calibração antes de disparar',
    desc: 'Ajuste intervalos e ritmo antes de começar a campanha em grupos. A calibração certa garante estabilidade nas entregas.',
    featured: false
  },
  {
    id: 'autopost-packages',
    youtubeId: 'FX68yGz6NbY',
    category: 'automation',
    level: 'advanced',
    title: 'Postador Pro: Envio por pacotes e lotes',
    desc: 'Divida grandes volumes em pacotes para distribuir os envios ao longo do dia, mantendo sua conta 100% segura.',
    featured: false
  },
  {
    id: 'engage',
    youtubeId: '6L236kzRWYI',
    category: 'automation',
    level: 'basic',
    title: 'Engajador: Auto Likes e Comentários',
    desc: 'Configure o engajador para manter interação constante nas suas comunidades de forma natural.',
    featured: false
  },
  {
    id: 'engage-pro',
    youtubeId: 'nZabdWFVGYY',
    category: 'automation',
    level: 'intermediate',
    title: 'Engajador Pro: Múltiplas contas e regras avançadas',
    desc: 'Escale o engajamento com múltiplas contas, listas salvas e regras automáticas de interação.',
    featured: true
  },
  {
    id: 'library',
    youtubeId: 'Ow7G841UfoY',
    category: 'library',
    level: 'basic',
    title: 'Biblioteca de Mídias e Modelos',
    desc: 'Centralize textos, fotos e vídeos organizados por pastas para usar diretamente nas campanhas do Postador.',
    featured: false
  },
  {
    id: 'list-groups',
    youtubeId: 'M_yzpPqVf2s',
    category: 'groups',
    level: 'basic',
    title: 'Lista de Grupos: Organização e Extração',
    desc: 'Organize, filtre e segmente seus grupos por nicho para disparos ultra segmentados.',
    featured: false
  },
  {
    id: 'hotbrowser',
    youtubeId: 'qaiAZPi5tps',
    category: 'warmup',
    level: 'basic',
    title: 'Aquecedor de Navegador',
    desc: 'Prepare o navegador com navegação natural e histórico ativo antes de iniciar rotinas pesadas.',
    featured: false
  },
  {
    id: 'hotprofile',
    youtubeId: '7f2pqoPQQkY',
    category: 'warmup',
    level: 'intermediate',
    title: 'Aquecedor de Perfil',
    desc: 'Aqueça perfis novos de forma gradual para elevar o Trust Score e evitar bloqueios.',
    featured: false
  },
  {
    id: 'hotprofile-calibration',
    youtubeId: '1l-M5Dd3T_A',
    category: 'warmup',
    level: 'intermediate',
    title: 'Aquecedor de Perfil: Calibração na prática',
    desc: 'Entenda o que cada ajuste da calibração muda no ritmo do aquecimento de contas novas.',
    featured: false
  },
  {
    id: 'hotgroups',
    youtubeId: 'ZxitKYatP5c',
    category: 'warmup',
    level: 'intermediate',
    title: 'Aquecedor de Grupos',
    desc: 'Gere movimento saudável nos grupos para manter alcance, entrega e relevância.',
    featured: false
  },
  {
    id: 'hotgroups-after-join',
    youtubeId: '8Nb0joAOgho',
    category: 'warmup',
    level: 'intermediate',
    title: 'Aquecedor de Grupos: O que fazer após entrar no grupo',
    desc: 'O passo a passo correto logo após ser aceito em um grupo novo para ganhar confiança antes de postar.',
    featured: true
  },
  {
    id: 'fill-groups',
    youtubeId: '2SJSnz-5Cis',
    category: 'strategy',
    level: 'advanced',
    title: 'Lotando grupos do WhatsApp com Facebook',
    desc: 'Estratégia completa para atrair milhares de membros do Facebook direto para seus grupos de WhatsApp.',
    featured: true
  },
  {
    id: 'safety-profile',
    youtubeId: 'jsxqsNLbwQk',
    category: 'help',
    level: 'basic',
    title: 'Protegendo seu perfil contra bloqueios',
    desc: 'Limites recomendados, comportamento natural e regras de ouro para manter suas contas seguras.',
    featured: true
  },
  {
    id: 'faq-send-failure',
    youtubeId: 'jd_cid3gtAA',
    category: 'help',
    level: 'intermediate',
    title: 'Como resolver falhas de envio em grupos',
    desc: 'As causas mais comuns de falhas e como corrigir em segundos sem interromper suas campanhas.',
    featured: true
  },
  {
    id: 'faq-pending-posts',
    youtubeId: '7sHOwe1-rkg',
    category: 'help',
    level: 'basic',
    title: 'Publicações que ficam como pendentes',
    desc: 'Entenda o que significa postagem pendente e como a moderação dos grupos afeta suas publicações.',
    featured: false
  },
  {
    id: 'faq-visibility',
    youtubeId: 'f0fb39YljkA',
    category: 'help',
    level: 'basic',
    title: 'Minhas postagens aparecem para os membros?',
    desc: 'Como conferir se as publicações enviadas realmente aparecem para os membros dos grupos.',
    featured: false
  },
  {
    id: 'iphone',
    youtubeId: 'a1hEGaOsvaY',
    category: 'mobile',
    level: 'basic',
    title: 'Pulso Social no iPhone (iOS)',
    desc: 'Como acessar e gerenciar a plataforma no navegador Safari do iOS.',
    featured: false
  },
  {
    id: 'android',
    youtubeId: 'SB6dpdpjKOE',
    category: 'mobile',
    level: 'basic',
    title: 'Pulso Social no Android',
    desc: 'Como configurar o navegador Chrome no Android para usar a plataforma no celular.',
    featured: false
  }
];

export default function TutorialsPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeVideo, setActiveVideo] = useState<Tutorial | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredTutorials = useMemo(() => {
    return TUTORIALS.filter((t) => {
      const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        t.title.toLowerCase().includes(query) ||
        t.desc.toLowerCase().includes(query) ||
        t.category.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const activeIndex = activeVideo ? TUTORIALS.findIndex((t) => t.id === activeVideo.id) : -1;

  const handleNextVideo = () => {
    if (activeIndex >= 0 && activeIndex < TUTORIALS.length - 1) {
      setActiveVideo(TUTORIALS[activeIndex + 1]);
    }
  };

  const handlePrevVideo = () => {
    if (activeIndex > 0) {
      setActiveVideo(TUTORIALS[activeIndex - 1]);
    }
  };

  const handleShare = (tut: Tutorial) => {
    const url = `https://tutoriais.pulsosocial.app/?aula=${tut.id}#/aula/${tut.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedId(tut.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/25">
            <PlayCircle className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              Central de Tutoriais PRO
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 font-bold border border-indigo-500/20">
                {TUTORIALS.length} Videoaulas
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Aprenda na prática a operar o Postador, Engajador, Aquecedores e Biblioteca com máxima eficiência
            </p>
          </div>
        </div>

        <a
          href="https://tutoriais.pulsosocial.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1e293b] dark:hover:bg-[#273549] text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all"
        >
          <ExternalLink className="w-4 h-4 text-indigo-500" />
          Abrir Central Externa
        </a>
      </div>

      {/* Search & Categories */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por palavra-chave (ex: postador, engajador, spintax, calibração, cookies, grupos)..."
            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-[#1e293b] focus:border-indigo-500 rounded-2xl text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-hidden transition-all shadow-xs"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                    : 'bg-white dark:bg-[#0f172a] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#1e293b] hover:border-indigo-500/40'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of Tutorial Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTutorials.map((tut) => {
          return (
            <div
              key={tut.id}
              className="bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-[#1e293b] hover:border-indigo-500/40 rounded-2xl p-4 flex flex-col justify-between transition-all shadow-xs hover:shadow-lg group"
            >
              <div className="space-y-3">
                {/* Thumbnail with overlay play */}
                <div
                  onClick={() => setActiveVideo(tut)}
                  className="aspect-video rounded-xl bg-slate-900 relative overflow-hidden cursor-pointer group/thumb border border-slate-200 dark:border-slate-800"
                >
                  <img
                    src={`https://i.ytimg.com/vi/${tut.youtubeId}/hqdefault.jpg`}
                    alt={tut.title}
                    className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/30 group-hover/thumb:bg-black/10 transition-colors flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-indigo-600/90 group-hover/thumb:bg-indigo-600 group-hover/thumb:scale-110 flex items-center justify-center text-white shadow-xl transition-all">
                      <PlayCircle className="w-7 h-7" />
                    </div>
                  </div>
                  {tut.featured && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-amber-500/90 backdrop-blur-xs text-[10px] font-black text-slate-950 uppercase tracking-wider">
                      Destaque
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
                    {CATEGORIES.find((c) => c.id === tut.category)?.name || tut.category}
                  </span>
                  <button
                    onClick={() => handleShare(tut)}
                    className="p-1 rounded-lg text-slate-400 hover:text-indigo-500 transition-colors"
                    title="Copiar link da aula"
                  >
                    {copiedId === tut.id ? (
                      <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Copiado
                      </span>
                    ) : (
                      <Share2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <h3
                  onClick={() => setActiveVideo(tut)}
                  className="font-bold text-sm text-slate-900 dark:text-white leading-snug cursor-pointer hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
                >
                  {tut.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {tut.desc}
                </p>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <button
                  onClick={() => setActiveVideo(tut)}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  Assistir aula <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <a
                  href={`https://tutoriais.pulsosocial.app/?aula=${tut.id}#/aula/${tut.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {filteredTutorials.length === 0 && (
        <div className="text-center py-16 bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-[#1e293b]">
          <PlayCircle className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-white mb-1">Nenhum tutorial encontrado</h3>
          <p className="text-xs text-slate-400">Tente buscar por outro termo ou escolha outra categoria.</p>
        </div>
      )}

      {/* Video Modal Player */}
      {activeVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="p-4 px-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="pr-4">
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 uppercase tracking-wider">
                  {CATEGORIES.find((c) => c.id === activeVideo.category)?.name || activeVideo.category}
                </span>
                <h2 className="text-base font-bold text-white mt-1 line-clamp-1">{activeVideo.title}</h2>
              </div>
              <button
                onClick={() => setActiveVideo(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Player (Responsive 16:9) */}
            <div className="relative aspect-video w-full bg-black">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${activeVideo.youtubeId}?autoplay=1&rel=0&modestbranding=1`}
                title={activeVideo.title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 px-6 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-slate-400 line-clamp-1 flex-1">{activeVideo.desc}</p>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handlePrevVideo}
                  disabled={activeIndex <= 0}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-xs font-bold text-white flex items-center gap-1 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" /> Anterior
                </button>
                <a
                  href={`https://www.youtube.com/watch?v=${activeVideo.youtubeId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white flex items-center gap-1 transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> YouTube
                </a>
                <button
                  onClick={handleNextVideo}
                  disabled={activeIndex >= TUTORIALS.length - 1}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-xs font-bold text-white flex items-center gap-1 transition-all shadow-md shadow-indigo-600/30"
                >
                  Próxima <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

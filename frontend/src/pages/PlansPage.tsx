import React from 'react';
import { Crown, Check, Zap, Sparkles } from 'lucide-react';

export default function PlansPage() {
  const plans = [
    {
      name: 'Starter',
      price: 'R$ 67',
      period: '/mês',
      description: 'Ideal para iniciantes no marketing em grupos',
      features: [
        'Até 2 Contas Conectadas',
        'Postador PRO (Texto & Fotos)',
        'Spintax Inteligente',
        'Calibrador Básico Anti-Ban',
        'Suporte por E-mail',
      ],
      popular: false,
      buttonText: 'Escolher Starter',
    },
    {
      name: 'Profissional PRO',
      price: 'R$ 147',
      period: '/mês',
      description: 'O mais escolhido para quem busca escala e resultados',
      features: [
        'Contas Ilimitadas',
        'Postador PRO Completo (Texto, Fotos e Vídeos)',
        'Engajador PRO (Auto Likes e Comentários)',
        'Aquecedores Anti-Ban Avançados',
        'Suporte a Proxies Individuais',
        'Biblioteca de Copys Ilimitada',
        'Suporte Prioritário VIP',
      ],
      popular: true,
      buttonText: 'Garantir Acesso PRO',
    },
    {
      name: 'Agência & Equipes',
      price: 'R$ 297',
      period: '/mês',
      description: 'Para agências que gerenciam múltiplos clientes',
      features: [
        'Tudo do Plano Profissional PRO',
        'Múltiplos Usuários / Subcontas',
        'Exportação de Relatórios em PDF & CSV',
        'Webhooks & Integrações de Automação',
        'Gerente de Contas Dedicado',
      ],
      popular: false,
      buttonText: 'Falar com Consultor',
    },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="text-center space-y-3 pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold">
          <Crown className="w-4 h-4" />
          <span>Planos & Licenças PRO</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Escale suas postagens sem limites
        </h1>
        <p className="text-sm text-slate-400 max-w-xl mx-auto">
          Escolha o plano ideal para suas campanhas e potencialize seu alcance no Facebook e Instagram.
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        {plans.map((plan, idx) => (
          <div
            key={idx}
            className={`rounded-2xl p-7 flex flex-col justify-between border relative transition-all ${
              plan.popular
                ? 'bg-gradient-to-b from-[#1b223c] to-[#0f172a] border-indigo-500 shadow-2xl shadow-indigo-500/20 md:-translate-y-2'
                : 'bg-[#0f172a] border-[#1e293b] hover:border-slate-600'
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3.5 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-[11px] rounded-full shadow-lg">
                MAIS POPULAR
              </div>
            )}

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                <p className="text-xs text-slate-400 mt-1">{plan.description}</p>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-3xl sm:text-4xl font-extrabold text-white">{plan.price}</span>
                <span className="text-xs text-slate-400">{plan.period}</span>
              </div>

              <div className="space-y-2.5 pt-4 border-t border-[#1e293b]">
                {plan.features.map((feat, fIdx) => (
                  <div key={fIdx} className="flex items-center gap-2.5 text-xs text-slate-300">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              className={`w-full mt-8 py-3 rounded-xl font-bold text-xs shadow-lg transition-all ${
                plan.popular
                  ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-indigo-500/25'
                  : 'bg-[#131c31] hover:bg-[#1e293b] text-white border border-[#1e293b]'
              }`}
            >
              {plan.buttonText}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

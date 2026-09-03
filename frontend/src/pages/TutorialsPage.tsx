import React from 'react';
import { PlayCircle, ShieldCheck, Zap, Sliders, Send, BookOpen } from 'lucide-react';

export default function TutorialsPage() {
  const tutorials = [
    {
      title: 'Passo a Passo: Como Criar sua Primeira Campanha no Postador PRO',
      duration: '4:15 min',
      category: 'Iniciante',
      icon: Send,
      description: 'Aprenda a selecionar grupos, configurar mídias e usar o Spintax para criar variações automáticas.',
    },
    {
      title: 'Segredos do Calibrador Anti-Ban para Blindar suas Contas',
      duration: '6:30 min',
      category: 'Segurança',
      icon: Sliders,
      description: 'Como definir os delays corretos, pausas de segurança e limites diários para evitar restrições.',
    },
    {
      title: 'Estratégia de Aquecimento de Contas com Aquecedores PRO',
      duration: '5:45 min',
      category: 'Aquecimento',
      icon: ShieldCheck,
      description: 'Descubra como elevar o Trust Score da sua conta simulando o comportamento de navegação humana.',
    },
    {
      title: 'Engajador Automático: Atraindo Leads com Auto Likes e Comentários',
      duration: '7:10 min',
      category: 'Engajamento',
      icon: Zap,
      description: 'Como gerar autoridade e atrair compradores comentando automaticamente nos posts mais recentes.',
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
          <PlayCircle className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            Tutoriais em Vídeo & Treinamentos
          </h1>
          <p className="text-xs text-slate-400">Aprenda a extrair o máximo de resultados do Pulso Social Studio</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {tutorials.map((tut, idx) => {
          const Icon = tut.icon;
          return (
            <div
              key={idx}
              className="bg-[#0f172a] border border-[#1e293b] hover:border-indigo-500/40 rounded-2xl p-5 space-y-3.5 shadow-lg flex flex-col justify-between transition-all"
            >
              <div className="space-y-2.5">
                <div className="aspect-video rounded-xl bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 border border-[#1e293b] flex items-center justify-center relative overflow-hidden group cursor-pointer">
                  <div className="w-12 h-12 rounded-full bg-indigo-600 group-hover:bg-indigo-500 flex items-center justify-center text-white shadow-xl group-hover:scale-110 transition-transform">
                    <PlayCircle className="w-6 h-6" />
                  </div>
                  <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/70 text-[10px] font-mono text-white">
                    {tut.duration}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {tut.category}
                  </span>
                </div>
                <h3 className="font-bold text-sm text-white">{tut.title}</h3>
                <p className="text-xs text-slate-400">{tut.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import React from 'react';
import { Headphones, MessageSquare, Mail, ExternalLink, HelpCircle } from 'lucide-react';

export default function SupportPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
          <Headphones className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Suporte Técnico & Atendimento</h1>
          <p className="text-xs text-slate-400">Nossa equipe de especialistas está à disposição para ajudar você</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6 space-y-4 shadow-lg">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white">WhatsApp Suporte VIP</h3>
            <p className="text-xs text-slate-400 mt-1">Atendimento ágil para assinantes PRO de Segunda a Sábado das 09h às 20h.</p>
          </div>
          <button className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2">
            <span>Iniciar Conversa no WhatsApp</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6 space-y-4 shadow-lg">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white">Central de Chamados / E-mail</h3>
            <p className="text-xs text-slate-400 mt-1">Envie dúvidas técnicas detalhadas ou solicitações de customizações.</p>
          </div>
          <button className="w-full py-2.5 bg-[#131c31] hover:bg-[#1e293b] text-white border border-[#1e293b] font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2">
            <span>suporte@pulsosocial.pro</span>
          </button>
        </div>
      </div>
    </div>
  );
}

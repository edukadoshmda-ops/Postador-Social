"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstagramGraphService = void 0;
const axios_1 = __importDefault(require("axios"));
const GRAPH_VERSION = 'v18.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;
function mapGraphError(err) {
    const data = err?.response?.data?.error;
    if (data) {
        const code = data.code;
        const msg = data.message || '';
        const sub = data.error_subcode;
        // Mapeamento PT-BR claro
        if (code === 190) {
            if (sub === 463)
                return 'Sessão expirada — o access_token expirou. Gere um novo token de longa duração e cole em Configurações > Contas.';
            if (sub === 467)
                return 'Sessão inválida — access_token inválido. Verifique se copiou o token completo.';
            return `Token inválido/expirado (190): ${msg}. Gere um novo token em developers.facebook.com > Graph API Explorer.`;
        }
        if (code === 10)
            return `Permissão negada (10): ${msg}. Verifique se seu App tem instagram_content_publish e se o Instagram está conectado à Página.`;
        if (code === 200)
            return `Permissão negada (200): ${msg}. Confirme que o Instagram é Profissional/Business e vinculado à Página.`;
        if (code === 4)
            return `Limite da API atingido (4): ${msg}. Aguarde alguns minutos.`;
        if (code === 100 && msg.includes('image'))
            return `Imagem inválida (100): ${msg}. Use JPG/PNG público (https) e <8MB.`;
        if (code === 368)
            return `Ação bloqueada (368): ${msg}. Conta em revisão temporária.`;
        return `Erro Graph API (${code}${sub ? '/' + sub : ''}): ${msg}`;
    }
    if (err?.code === 'ENOTFOUND' || err?.code === 'ETIMEDOUT')
        return 'Falha de rede ao contatar graph.facebook.com — verifique internet/proxy.';
    return err?.message || 'Erro desconhecido ao publicar via Graph API';
}
class InstagramGraphService {
    /**
     * Publica no Instagram via Graph API oficial (2 passos)
     * Requer account.access_token e account.ig_user_id
     */
    static async publishWithToken(account, req) {
        const token = String(account.access_token || account.accessToken || '').trim();
        const igUserId = String(account.ig_user_id || account.igUserId || '').trim();
        if (!token)
            return { success: false, status: 'FAILED', error: 'Conta sem access_token — cole o token de longa duração em Configurações > Contas (Instagram oficial).' };
        if (!igUserId)
            return { success: false, status: 'FAILED', error: 'Conta sem IG User ID — pegue em Graph API Explorer: GET /me/accounts -> instagram_business_account.id' };
        // Instagram Graph API não publica TEXT puro no Feed — precisa imagem
        if (req.mediaType === 'TEXT' || (!req.mediaUrls || req.mediaUrls.length === 0)) {
            return {
                success: false,
                status: 'FAILED',
                error: 'Instagram oficial exige imagem/vídeo para Feed. Selecione Foto/Vídeo na campanha ou use texto com imagem. Texto puro não é permitido pela API oficial.',
            };
        }
        const caption = (req.text || '').slice(0, 2200); // limite IG
        const mediaUrl = req.mediaUrls[0];
        try {
            // Passo 1: criar container
            const isVideo = req.mediaType === 'VIDEO';
            const createUrl = `${GRAPH_BASE}/${igUserId}/media`;
            const createParams = {
                caption,
                access_token: token,
            };
            if (isVideo) {
                createParams.media_type = 'REELS';
                createParams.video_url = mediaUrl;
            }
            else {
                createParams.image_url = mediaUrl;
            }
            const createRes = await axios_1.default.post(createUrl, null, { params: createParams, timeout: 20000 });
            const creationId = createRes.data?.id;
            if (!creationId) {
                return { success: false, status: 'FAILED', error: `Graph API não retornou creation_id: ${JSON.stringify(createRes.data).slice(0, 300)}` };
            }
            // Para vídeo/Reels, aguardar processamento
            if (isVideo) {
                // polling simples até FINISHED (máx 60s)
                let status = 'IN_PROGRESS';
                for (let i = 0; i < 12; i++) {
                    await new Promise((r) => setTimeout(r, 5000));
                    const statusRes = await axios_1.default.get(`${GRAPH_BASE}/${creationId}`, {
                        params: { fields: 'status_code', access_token: token },
                        timeout: 15000,
                    });
                    status = statusRes.data?.status_code || status;
                    if (status === 'FINISHED')
                        break;
                    if (status === 'ERROR') {
                        return { success: false, status: 'FAILED', error: `Vídeo falhou no processamento da Meta: ${JSON.stringify(statusRes.data).slice(0, 300)}` };
                    }
                }
                if (status !== 'FINISHED') {
                    return { success: false, status: 'FAILED', error: `Vídeo ainda processando (status: ${status}) — tente novamente em 1 min.` };
                }
            }
            // Passo 2: publicar
            const publishUrl = `${GRAPH_BASE}/${igUserId}/media_publish`;
            const publishRes = await axios_1.default.post(publishUrl, null, {
                params: { creation_id: creationId, access_token: token },
                timeout: 20000,
            });
            const postId = publishRes.data?.id;
            if (!postId) {
                return { success: false, status: 'FAILED', error: `Publish não retornou id: ${JSON.stringify(publishRes.data).slice(0, 300)}` };
            }
            return {
                success: true,
                status: 'PUBLISHED',
                postId,
                postUrl: `https://instagram.com/p/${postId}`,
            };
        }
        catch (err) {
            return { success: false, status: 'FAILED', error: mapGraphError(err) };
        }
    }
    /**
     * Valida token + IG User ID sem publicar (usado no Testar Conexão)
     */
    static async validateCredentials(accessToken, igUserId) {
        try {
            const res = await axios_1.default.get(`${GRAPH_BASE}/${igUserId}`, {
                params: { fields: 'username,account_type', access_token: accessToken },
                timeout: 10000,
            });
            return { valid: true, info: res.data };
        }
        catch (err) {
            return { valid: false, error: mapGraphError(err) };
        }
    }
}
exports.InstagramGraphService = InstagramGraphService;

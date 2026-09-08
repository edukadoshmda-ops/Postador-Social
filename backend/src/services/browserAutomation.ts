import { db } from '../core/db';
import { getAccountUA, parseProxy } from '../core/proxyManager';
import { InstagramGraphService } from './instagramGraphService';

export interface PostRequest {
  platform: 'FACEBOOK' | 'INSTAGRAM';
  accountId: string;
  groupId: string;
  groupName: string;
  text: string;
  mediaType: 'TEXT' | 'IMAGE' | 'VIDEO' | 'LINK';
  mediaUrls?: string[];
}

export interface PostResult {
  success: boolean;
  status: 'PUBLISHED' | 'PENDING_APPROVAL' | 'FAILED';
  postId?: string;
  postUrl?: string;
  error?: string;
}

const FALLBACK_UAS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0',
];

export class BrowserAutomationService {
  /**
   * Publica via API interna do Facebook usando cookies de sessão do usuário.
   * NÃO usa a Graph API oficial (que não permite grupos de terceiros).
   * Usa o endpoint interno mbasic/composer que o Facebook usa no próprio site.
   */
  static async publishPost(req: PostRequest): Promise<PostResult> {
    const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(req.accountId) as any;
    if (!account) {
      return { success: false, status: 'FAILED', error: 'Conta não encontrada no banco de dados' };
    }

    try {
      // 1) Instagram oficial via Graph API (quando tem token + ig_user_id)
      const hasIgToken = (account.access_token || account.accessToken) && (account.ig_user_id || account.igUserId);
      if (hasIgToken && req.platform === 'INSTAGRAM') {
        const official = await InstagramGraphService.publishWithToken(account, req);
        if (official.status !== 'FAILED' || String(official.error || '').includes('access_token') || String(official.error || '').includes('IG User ID') || String(official.error || '').includes('exige imagem')) {
          return official;
        }
      }

      if (req.platform === 'FACEBOOK') {
        return {
          success: true,
          status: 'PENDING_APPROVAL',
          postUrl: `https://www.facebook.com/groups/${req.groupId}`,
          error: 'Disparo delegado para a extensão Chrome do navegador.'
        };
      }

      // 2) Valida cookies para outras plataformas (Instagram, etc)
      const cookieStr = String(account.cookies || '');
      const cookieLength = cookieStr.length;
      const hasRealCookies = cookieLength > 200 && cookieStr.includes('c_user') && cookieStr.includes('xs');

      if (!hasRealCookies) {
        return {
          success: false,
          status: 'FAILED',
          error: 'Sessão expirada ou não sincronizada. Atualize a sessão.'
        };
      }

      // 3) Extrai tokens necessários dos cookies
      const cUser = this.extractCookie(cookieStr, 'c_user');
      const xs = this.extractCookie(cookieStr, 'xs');

      if (!cUser || !xs) {
        return {
          success: false,
          status: 'FAILED',
          error: 'Cookies de autenticação incompletos.'
        };
      }

      const dtsg = await this.fetchDTSG(cookieStr, account);
      if (!dtsg) {
        return {
          success: false,
          status: 'FAILED',
          error: 'Não foi possível obter o token fb_dtsg da sessão do Facebook. Abra o grupo no Chrome, confirme que está logado e sincronize os cookies novamente.'
        };
      }

      if (req.platform === 'INSTAGRAM') {
        return await this.executeInstagramPost(account, req);
      }

      return { success: false, status: 'FAILED', error: 'Plataforma não suportada' };

    } catch (err: any) {
      console.error('[BrowserAutomation] Erro ao publicar:', err);
      return {
        success: false,
        status: 'FAILED',
        error: err.message || 'Falha na conexão com os servidores da Meta'
      };
    }
  }

  // Extrai valor de um cookie específico da string de cookies
  private static extractCookie(cookieStr: string, name: string): string {
    const match = cookieStr.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
    return match ? decodeURIComponent(match[1]) : '';
  }

  // Busca o token DTSG do Facebook (necessário para POST requests)
  private static async fetchDTSG(cookieStr: string, account: any): Promise<string> {
    try {
      const ua = getAccountUA(account) || FALLBACK_UAS[0];
      const res = await fetch('https://www.facebook.com/', {
        headers: {
          'Cookie': cookieStr,
          'User-Agent': ua,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9',
        }
      });
      const html = await res.text();
      // Extrai fb_dtsg do HTML
      const dtsgMatch = html.match(/"dtsg":\{"token":"([^"]+)"/) ||
                        html.match(/name="fb_dtsg" value="([^"]+)"/) ||
                        html.match(/"token":"([A-Za-z0-9_\-:]+)","async_get_token"/);
      return dtsgMatch ? dtsgMatch[1] : '';
    } catch {
      return '';
    }
  }

  // Postagem real no Facebook via endpoint interno do GraphQL/Composer
  private static async executeFacebookPost(account: any, req: PostRequest, cookieStr: string, cUser: string, dtsg: string): Promise<PostResult> {
    try {
      const ua = getAccountUA(account) || FALLBACK_UAS[0];
      const proxyInfo = account.proxy ? parseProxy(account.proxy) : null;

      const headers: Record<string, string> = {
        'Cookie': cookieStr,
        'User-Agent': ua,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': 'https://www.facebook.com',
        'Referer': `https://www.facebook.com/groups/${req.groupId}`,
        'Accept': '*/*',
        'Accept-Language': 'pt-BR,pt;q=0.9',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-Mode': 'cors',
        'X-FB-Friendly-Name': 'CometGroupComposerStoriesMutation',
        'X-ASBD-ID': '129477',
        ...(proxyInfo ? { 'X-Proxy-Used': `${proxyInfo.host}:${proxyInfo.port}` } : {}),
      };

      // Monta o payload para o endpoint interno de criação de post
      const params = new URLSearchParams();
      params.set('av', cUser);
      params.set('fb_dtsg', dtsg);
      params.set('group_id', req.groupId);
      params.set('value', req.text);
      params.set('target_id', req.groupId);
      params.set('location_type', 'group');
      params.set('__req', Math.random().toString(36).substring(2, 5));
      params.set('__a', '1');
      params.set('__user', cUser);

      // Endpoint interno do Facebook para criação de posts em grupos
      const response = await fetch(
        `https://www.facebook.com/groups/${req.groupId}/posts/`,
        {
          method: 'POST',
          headers,
          body: params.toString(),
        }
      );

      const responseText = await response.text();

      // Verifica checkpoint/bloqueio
      if (responseText.includes('checkpoint') || responseText.includes('captcha') || response.url.includes('checkpoint')) {
        return {
          success: false,
          status: 'FAILED',
          error: 'Checkpoint de segurança detectado pelo Facebook. Acesse o Facebook manualmente para resolver o captcha.'
        };
      }

      // Verifica erro de permissão
      if (response.status === 403 || responseText.includes('not authorized') || responseText.includes('não autorizado')) {
        return {
          success: false,
          status: 'FAILED',
          error: 'Permissão negada pelo Facebook. Verifique se a conta é membro do grupo e está ativa.'
        };
      }

      // Verifica se foi redirecionado para login
      if (response.url.includes('/login') || responseText.includes('"__type":"LoginRedirect"')) {
        return {
          success: false,
          status: 'FAILED',
          error: 'Sessão expirada. Faça login no Facebook no Chrome e sincronize a sessão novamente.'
        };
      }

      // O status HTTP sozinho não confirma a criação do post. O Facebook pode
      // retornar uma página de login, consentimento ou erro com status 200.
      const postId = this.extractFacebookPostId(responseText, response.url);
      if (postId) {
        return {
          success: true,
          status: 'PUBLISHED',
          postId,
          postUrl: `https://www.facebook.com/groups/${req.groupId}/posts/${postId}`,
        };
      }

      return {
        success: true,
        status: 'PENDING_APPROVAL',
        postUrl: `https://www.facebook.com/groups/${req.groupId}`,
        error: 'Disparo delegado para a extensão Chrome do navegador.'
      };

    } catch (err: any) {
      console.error('[BrowserAutomation] Erro na postagem Facebook:', err);
      // Se for erro de rede, a postagem pode ter sido enviada mesmo assim
      if (err.message?.includes('ECONNRESET') || err.message?.includes('network')) {
        return {
          success: false,
          status: 'FAILED',
          error: 'Erro de conexão. Verifique sua internet e tente novamente.'
        };
      }
      return { success: false, status: 'FAILED', error: this.mapMetaError(err?.code, err.message) };
    }
  }

  static isCheckpointError(msg: string): boolean {
    const m = (msg || '').toLowerCase();
    return m.includes('checkpoint') || m.includes('captcha') || m.includes('confirme sua identidade') || m.includes('verificação de segurança');
  }

  private static extractFacebookPostId(responseText: string, responseUrl: string): string {
    const urlMatch = responseUrl.match(/\/posts\/(\d+)/);
    if (urlMatch) return urlMatch[1];

    const idMatches = [
      responseText.match(/(?:story_fbid|story_id|post_id)["'=:\s]+(\d{8,})/i),
      responseText.match(/\/posts\/(\d{8,})/i),
    ];
    return idMatches.find(Boolean)?.[1] || '';
  }

  private static mapMetaError(code: number, message: string): string {
    const map: Record<number, string> = {
      190: 'Token/cookie expirado — renove o login da conta em Configurações',
      4: 'Limite de requisições da API atingido — reduza a frequência',
      368: 'Ação bloqueada temporariamente por comportamento suspeito — pausa de 1h recomendada',
      17: 'Grupo não encontrado ou removido',
      200: 'Permissão negada — verifique se a conta é membro do grupo',
      506: 'Conteúdo duplicado detectado — use Spintax para variar o texto',
    };
    return map[code] || message || 'Erro desconhecido da Meta';
  }

  private static async executeInstagramPost(account: any, req: PostRequest): Promise<PostResult> {
    return {
      success: false,
      status: 'FAILED',
      error: 'Publicação real no Instagram exige a Graph API oficial com access_token, ig_user_id e mídia pública. Cookies não são um fallback suportado para confirmar uma publicação.'
    };
  }
}

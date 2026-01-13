import { DetailApiResponse, MovieDetail, SearchApiResponse, SearchResultItem } from "@/types/metatube";

;

/**
 * 用于与 Metatube API 交互的客户端
 */
export class MetatubeClient {
    private readonly host: string;
    private readonly headers: HeadersInit;

    constructor() {
        // 从环境变量中读取配置
        this.host = process.env.NEXT_PUBLIC_METATUBE_API_HOST || process.env.METATUBE_API_HOST || '';
        const token = process.env.METATUBE_API_TOKEN || '';

        // 在构建时不进行环境变量检查，只在运行时检查
        if (typeof window !== 'undefined' && (!this.host || !token)) {
            console.warn('环境变量 METATUBE_API_HOST 或 METATUBE_API_TOKEN 未设置。');
        }

        this.headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        };
    }

    /**
     * 内部私有的 fetch 封装，用于处理请求和错误
     */
    private async _request<T>(endpoint: string, options?: RequestInit): Promise<T> {
        // 在运行时检查环境变量
        if (!this.host) {
            throw new Error('METATUBE_API_HOST 环境变量未设置');
        }

        const url = `${this.host}${endpoint}`;

        try {
            const response = await fetch(url, {
                ...options,
                headers: this.headers,
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`API 请求失败: ${response.status} ${response.statusText} - ${errorBody}`);
            }

            // 如果响应体为空，返回 null
            const text = await response.text();
            return text ? JSON.parse(text) : null as T;

        } catch (error) {
            console.error(`请求 Metatube API 时出错: ${url}`, error);
            throw error;
        }
    }
    
    /**
     * 根据番号进行搜索
     * @param number 影片番号，例如 'SSIS-604'
     * @returns 返回一个包含多个来源结果的数组
     */
    public async searchByNumber(number: string): Promise<SearchResultItem[]> {
        // 假设的搜索端点，请根据你的 API 文档进行确认
        const endpoint = `/v1/movies/search?q=${encodeURIComponent(number)}`;
        const response = await this._request<SearchApiResponse>(endpoint);
        return response.data;
    }

    /**
     * 获取指定来源和番号的影片详细信息
     * @param provider 数据源, 例如 'javbase'
     * @param number 影片番号, 例如 'SSIS-604'
     */
    public async getDetails(provider: string, number: string): Promise<MovieDetail> {
        const response = await this._request<DetailApiResponse>(`/v1/movies/${provider}/${number}`);
        // 从响应体中解包 'data' 字段
        return response.data;
    }
}

// 创建并导出一个单例，方便在不同文件中直接导入使用
const metatubeClient = new MetatubeClient();
export default metatubeClient;
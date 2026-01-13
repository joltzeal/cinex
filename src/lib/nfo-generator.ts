import { create } from 'xmlbuilder2';
import { promises as fs } from 'fs';
import path from 'path';

/**
 *  官方推荐的电影 NFO 文件数据结构接口
 */
export interface MovieNFOData {
    // 核心信息
    title: string;
    originaltitle?: string;
    sorttitle?: string;
    plot?: string;
    originalplot?: string;
    tagline?: string;
    year?: number;
    premiered?: string; // 发行日期，格式 YYYY-MM-DD
    releasedate?: string; // 同 premiered
    runtime?: number;
    label?: string;

    // 评分
    rating?: number; // 简单的社区评分 (0-10)
    userrating?: number; // kodi 兼容的用户评分
    ratings?: { // 更详细的评分结构
        [key: string]: { // key 可以是 'themoviedb', 'imdb', etc.
            default?: boolean;
            value: number;
            votes?: number;
        };
    };
    criticrating?: number;
    series?: string;

    // 标识和分类
    id?: string; // 唯一的媒体库 ID (例如 IMDB 的 tt号)
    uniqueid?: { type: string; id: string; default?: boolean }[]; // 多个外部ID
    genres?: string[];
    tags?: string[];

    // 制作信息
    director?: string[];
    writer?: string[];
    studio?: string[];
    countries?: string[];

    // 演员信息
    actors?: {
        name: string;
        role?: string;
        thumb?: string;
    }[];

    // 媒体和封面
    thumb?: string; // 海报图
    fanart?: { thumb: string }; // 粉丝艺术图
    trailer?: string; // 预告片链接

    // 其他元数据
    mpaa?: string;
    dateadded?: string; // 添加到库的日期时间
    lockdata?: boolean; // 如果为 true,  不会覆盖此 NFO
}


/**
 * 将从 Metatube API 获取的 MovieDetail 对象转换为  NFO 所需的数据格式
 * @param detail - 从 metatubeClient.getDetails() 获取的影片详情对象
 * @returns - 适配  NFO 生成器的对象
 */
export function mapMovieDetailToNFO(detail: any): MovieNFOData {
    // 从 release_date 中提取年份和完整日期
    const releaseDate = detail.release_date ? new Date(detail.release_date) : null;
    const year = releaseDate ? releaseDate.getFullYear() : undefined;
    const fullReleaseDate = releaseDate ? releaseDate.toISOString().split('T')[0] : undefined;

    // 将简单的字符串数组演员转换为对象数组
    const actors = detail.actors.map((actorName: string) => ({
        name: actorName,
    }));

    // 为 fanart 选择一张合适的图片
    const fanart = detail.preview_images && detail.preview_images.length > 0
        ? { thumb: detail.preview_images[0] }
        : undefined;

    // 返回映射后的新对象
    return {
        title: detail.title,
        originaltitle: detail.originaltitle, // 使用番号作为 originaltitle
        sorttitle: detail.number,
        originalplot: detail.originalplot,
        plot: detail.plot,
        year: year,
        premiered: fullReleaseDate,
        releasedate: fullReleaseDate,
        runtime: detail.runtime,
        thumb: detail.cover_url,
        fanart: fanart,
        id: detail.number, // 使用番号作为唯一ID
        uniqueid: [ // 添加一个 uniqueid 示例
            { type: 'Unknown', id: detail.number, default: true }
        ],
        label: detail.label,
        series: detail.series,
        
        genres: detail.genres,
        director: detail.director ? [detail.director] : [],
        studio: detail.maker ? [detail.maker] : [],
        actors: actors,
        rating: detail.score,
        ratings: detail.score ? {
            'community': { value: detail.score, votes: 1, default: true }
        } : undefined,
        // 其他字段可以根据需要从 detail 中映射
        // lockdata: true, 
    };
}


class NfoGenerator {
    private movieData: MovieNFOData;

    constructor(movieData: MovieNFOData) {
        this.movieData = movieData;
    }

    public generateXml(): string {
        const root = create({ version: '1.0', encoding: 'UTF-8', standalone: true }).ele('movie');

        // 简单文本字段
        if (this.movieData.title) root.ele('title').txt(this.movieData.title);
        if (this.movieData.originaltitle) root.ele('originaltitle').txt(this.movieData.originaltitle);
        if (this.movieData.sorttitle) root.ele('sorttitle').txt(this.movieData.sorttitle);
        if (this.movieData.rating) root.ele('rating').txt(this.movieData.rating.toString());
        if (this.movieData.userrating) root.ele('userrating').txt(this.movieData.userrating.toString());
        if (this.movieData.criticrating) root.ele('criticrating').txt(this.movieData.criticrating.toString());
        if (this.movieData.year) root.ele('year').txt(this.movieData.year.toString());
        if (this.movieData.plot) root.ele('plot').txt(this.movieData.plot);
        if (this.movieData.originalplot) root.ele('originalplot').txt(this.movieData.originalplot);
        if (this.movieData.tagline) root.ele('tagline').txt(this.movieData.tagline);
        if (this.movieData.runtime) root.ele('runtime').txt(this.movieData.runtime.toString());
        if (this.movieData.mpaa) root.ele('mpaa').txt(this.movieData.mpaa);
        if (this.movieData.id) root.ele('id').txt(this.movieData.id);
        if (this.movieData.premiered) root.ele('premiered').txt(this.movieData.premiered);
        if (this.movieData.releasedate) root.ele('releasedate').txt(this.movieData.releasedate);
        if (this.movieData.dateadded) root.ele('dateadded').txt(this.movieData.dateadded);
        if (this.movieData.trailer) root.ele('trailer').txt(this.movieData.trailer);
        if (this.movieData.lockdata) root.ele('lockdata').txt(this.movieData.lockdata.toString());
        

        // 多个值的字段
        this.movieData.genres?.forEach(genre => root.ele('genre').txt(genre));
        if (this.movieData.series) root.ele('genre').txt(`系列:${this.movieData.series}`);
        if (this.movieData.label) root.ele('genre').txt(`发行商:${this.movieData.label}`);
        this.movieData.tags?.forEach(tag => root.ele('tag').txt(tag));
        this.movieData.countries?.forEach(country => root.ele('country').txt(country));
        this.movieData.director?.forEach(director => root.ele('director').txt(director));
        this.movieData.writer?.forEach(writer => root.ele('writer').txt(writer));
        this.movieData.studio?.forEach(studio => root.ele('studio').txt(studio));

        

        // 带属性的字段 (uniqueid)
        this.movieData.uniqueid?.forEach(uid => {
            root.ele('uniqueid')
                .att('type', uid.type)
                .att('default', uid.default ? 'true' : 'false')
                .txt(uid.id);
        });

        // 嵌套字段 (ratings)
        if (this.movieData.ratings) {
            const ratingsNode = root.ele('ratings');
            for (const name in this.movieData.ratings) {
                const rating = this.movieData.ratings[name];
                const ratingNode = ratingsNode.ele('rating')
                    .att('name', name)
                    .att('default', rating.default ? 'true' : 'false');
                ratingNode.ele('value').txt(rating.value.toString());
                if (rating.votes) {
                    ratingNode.ele('votes').txt(rating.votes.toString());
                }
            }
        }

        // 复杂对象数组 (actor)
        this.movieData.actors?.forEach(actor => {
            const actorNode = root.ele('actor');
            actorNode.ele('name').txt(actor.name);
            if (actor.role) actorNode.ele('role').txt(actor.role);
            if (actor.thumb) actorNode.ele('thumb').txt(actor.thumb);
        });

        // 图像 (thumb, fanart)
        if (this.movieData.thumb) root.ele('thumb').txt(this.movieData.thumb);
        if (this.movieData.fanart?.thumb) {
            root.ele('fanart').ele('thumb').txt(this.movieData.fanart.thumb);
        }

        return root.end({ prettyPrint: true });
    }

    public async saveToFile(filePath: string): Promise<void> {
        try {
            const xmlContent = this.generateXml();
            // 确保目录存在
            const dir = path.dirname(filePath);
            await fs.mkdir(dir, { recursive: true });
            await fs.writeFile(filePath, xmlContent, 'utf-8');
            console.log(`NFO 文件已成功保存到: ${filePath}`);
        } catch (error) {
            console.error('保存 NFO 文件时出错:', error);
            throw error;
        }
    }
}

export default NfoGenerator;
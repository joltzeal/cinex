import * as path from 'path';
import * as fs from 'fs/promises';
import { getFileNumber } from './file-number-parser';

// ========================================================================
// 1. 类型定义 (Interfaces and Enums)
// ========================================================================

/**
 * 最终返回的文件信息对象
 */
interface FileInfo {
    number: string;
    letters: string;
    hasSub: boolean;
    cWord: string;
    cdPart: string;
    destroyed: string;
    leak: string;
    wuma: string;
    youma: string;
    mosaic: string;
    filePath: string;
    folderPath: string;
    fileName: string;
    fileEx: string;
    subList: string[];
    fileShowName: string;
    fileShowPath: string;
    shortNumber: string;
    appointNumber: string;
    appointUrl: string;
    websiteName: string;
    definition: string;
    codec: string;
}

// 模拟 Python 中的枚举
enum FileMode {
    Standard,
    Again,
    Single,
}

enum CDChar {
    UNDERLINE,
    SPACE,
    POINT,
    DIGITAL,
    LETTER,
    ENDC,
    MIDDLE_NUMBER,
}

interface ManagerConfig {
    cnword_style: string;
    prevent_char: string;
    cd_char: CDChar[];
    cd_name: number; // 0 for -cd, 1 for -CD, 2 for -
    umr_style: string;
    leak_style: string;
    wuma_style: string;
    youma_style: string;
    cnword_char: string[];
    sub_type: string[];
    suffix_sort: string[];
}

// ========================================================================
// 2. 模拟的依赖项和辅助函数 (Mocks and Helpers)
// 您需要用您项目中的实际实现替换这些
// ========================================================================

// 模拟全局 Manager 对象
const manager = {
    config: {
        cnword_style: "-C",
        prevent_char: " ", // 假设空格是需要移除的防屏蔽字符
        cd_char: [CDChar.UNDERLINE, CDChar.SPACE, CDChar.POINT, CDChar.LETTER, CDChar.ENDC, CDChar.MIDDLE_NUMBER],
        cd_name: 0,
        umr_style: "-U",
        leak_style: "-L",
        wuma_style: "-W",
        youma_style: "-Y",
        cnword_char: ["-C", "c.", "中文"],
        sub_type: [".srt", ".ass"],
        suffix_sort: ["moword", "cnword"],
    } as ManagerConfig,
    computed: {
        escape_string_list: [] as string[], // 假设这是一个字符串列表
    }
};

// 模拟全局 Flags 对象
const Flags = {
    file_mode: FileMode.Standard,
    // 示例: newAgainDic: { '/path/to/file.mp4': ['ABC-123', 'http://example.com', 'website'] }
    newAgainDic: {} as Record<string, [string, string, string]>,
    appointUrl: ""
};


/**
 * [占位符] 从文件名/路径中提取番号
 * @param filePath - 文件路径
 * @param escapeList - 需要忽略的字符串列表
 * @returns 识别出的番号
 */
// function getFileNumber(filePath: string, escapeList: string[]): string {
//   // !!! 您需要在此处实现您自己的番号识别逻辑 !!!
//   // 这是一个非常简化的示例
//   const match = filePath.match(/([A-Z]{2,5}-\d{3,5})/i);
//   return match ? match[1].toUpperCase() : path.basename(filePath).split('.')[0];
// }

/**
 * [占位符] 判断番号是否属于无码类别
 * @param fileNumber - 文件番号
 * @returns 是无码则返回 true
 */
function isUncensored(fileNumber: string): boolean {
    // !!! 实现您自己的无码番号判断逻辑 !!!
    // 例如，检查番号是否以特定后缀结尾
    return fileNumber.endsWith("-UNC") || fileNumber.endsWith("U-");
}

/**
 * [占位符] 从番号中提取字母部分
 * @param fileNumber - 文件番号
 */
function getNumberLetters(fileNumber: string): string {
    return (fileNumber.match(/[a-zA-Z]+/)?.[0] || "").toUpperCase();
}

/**
 * [占位符] 移除字符串中的转义字符
 */
function removeEscapeString(text: string, replacement: string): string {
    // !!! 实现您自己的转义字符移除逻辑 !!!
    return text.replace(/[\[\]【】]/g, replacement);
}

/**
 * [占位符] 获取用于显示的路径
 */
function showFilePath(filePath: string): string {
    // !!! 实现您自己的显示路径逻辑 !!!
    return filePath;
}

/**
 * 辅助函数：安全地检查文件是否存在
 */
async function fileExists(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

// ========================================================================
// 3. 核心转换函数 (Core Function)
// ========================================================================

export async function getFileInfoV1(filePath: string): Promise<FileInfo> {
    let optionalData: Record<string, any> = {};
    let movieNumber = "";
    let hasSub = false;
    let cWord = "";
    let cdPart = "";
    let destroyed = "";
    let leak = "";
    let wuma = "";
    let youma = "";
    let mosaic = "";
    const subList: string[] = [];
    const cnwordStyle = manager.config.cnword_style;

    if (Flags.file_mode === FileMode.Again && Flags.newAgainDic[filePath]) {
        const [tempNumber, tempUrl, tempWebsite] = Flags.newAgainDic[filePath];
        if (tempNumber) {
            movieNumber = tempNumber;
            optionalData["appointNumber"] = tempNumber;
        }
        if (tempUrl) {
            optionalData["appointUrl"] = tempUrl;
            optionalData["websiteName"] = tempWebsite;
        }
    } else if (Flags.file_mode === FileMode.Single) {
        optionalData["appointUrl"] = Flags.appointUrl;
    }

    const fileShowPath = showFilePath(filePath);
    const folderPath = path.dirname(filePath);
    const fileFullName = path.basename(filePath);
    const fileEx = path.extname(fileFullName);
    let fileName = path.basename(fileFullName, fileEx);
    const nfoOldPath = path.join(folderPath, fileName + ".nfo");
    let fileShowName = fileName;

    // 软链接时，获取原文件路径
    let fileOriPath: string | null = null;
    try {
        const stats = await fs.lstat(filePath);
        if (stats.isSymbolicLink()) {
            fileOriPath = await fs.realpath(filePath);
        }
    } catch (e) {
        // 文件不存在或无法访问，忽略错误继续
    }


    try {
        let filePathStr = filePath.replace(/\\/g, "/");

        // 清除防屏蔽字符
        const preventChar = manager.config.prevent_char;
        if (preventChar) {
            filePathStr = filePathStr.replace(new RegExp(preventChar, 'g'), "");
            fileName = fileName.replace(new RegExp(preventChar, 'g'), "");
        }

        if (!movieNumber) {
            movieNumber = getFileNumber(filePathStr, manager.computed.escape_string_list);
        }

        const shortNumberMatch = movieNumber.match(/\d{3,}([a-zA-Z]+-\d+)/);
        optionalData["shortNumber"] = shortNumberMatch ? shortNumberMatch[1] : "";

        let fileNameCd = removeEscapeString(fileName, "-").replace(movieNumber, "-").replace(/--/g, "-").trim();
        const cdChar = manager.config.cd_char;
        if (cdChar.includes(CDChar.UNDERLINE)) fileNameCd = fileNameCd.replace(/_/g, "-");
        if (cdChar.includes(CDChar.SPACE)) fileNameCd = fileNameCd.replace(/ /g, "-");
        if (cdChar.includes(CDChar.POINT)) fileNameCd = fileNameCd.replace(/\./g, "-");
        fileNameCd = fileNameCd.toLowerCase() + ".";

        const tempCd = /(vol|case|no|cwp|cwpbd|act)[-.]?\d+/g;
        const tempCdFilename = fileNameCd.replace(tempCd, "");
        const cdPath1 = tempCdFilename.match(/[-_ .](cd|part|hd)(\d{1,2})/);
        const cdPath2 = tempCdFilename.match(/-(\d{1,2})\.?$/);
        const cdPath3 = tempCdFilename.match(/(-|\d{2,}|\.)([a-o])\.?$/);
        const cdPath4 = tempCdFilename.match(/-(\d{1})[^a-z0-9]/);

        let tempCdPart = "";
        if (cdPath1 && parseInt(cdPath1[2]) > 0) {
            tempCdPart = cdPath1[2];
        } else if (cdPath2) {
            if (cdPath2[1].length === 1 || cdChar.includes(CDChar.DIGITAL)) {
                tempCdPart = String(parseInt(cdPath2[1]));
            }
        } else if (cdPath3 && cdChar.includes(CDChar.LETTER)) {
            const letterList = ["", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o"];
            if (cdPath3[2] !== "c" || cdChar.includes(CDChar.ENDC)) {
                tempCdPart = String(letterList.indexOf(cdPath3[2]));
            }
        } else if (cdPath4 && cdChar.includes(CDChar.MIDDLE_NUMBER)) {
            tempCdPart = String(parseInt(cdPath4[0]));
        }

        if (tempCdPart && parseInt(tempCdPart) > 0) {
            const cdName = manager.config.cd_name;
            if (cdName === 0) cdPart = "-cd" + tempCdPart;
            else if (cdName === 1) cdPart = "-CD" + tempCdPart;
            else cdPart = "-" + tempCdPart;
        }

        const umrStyle = manager.config.umr_style;
        const lowerFilePath = filePathStr.toLowerCase();
        if (lowerFilePath.includes("-uncensored.") || lowerFilePath.includes("umr.") || filePathStr.includes("破解") || filePathStr.includes("克破") || (umrStyle && filePathStr.includes(umrStyle)) || lowerFilePath.includes("-u.") || lowerFilePath.includes("-uc.")) {
            destroyed = umrStyle;
            mosaic = "无码破解";
        }

        if (!mosaic) {
            const mdList = ["国产", "國產", "麻豆", "传媒", "傳媒", "皇家华人", "皇家華人", "精东", "精東", "猫爪影像", "貓爪影像", "91CM", "91MS", "导演系列", "導演系列", "MDWP", "MMZ", "MLT", "MSM", "LAA", "MXJ", "SWAG"];
            if (mdList.some(kw => filePathStr.includes(kw))) {
                mosaic = "国产";
            }
        }

        const leakStyle = manager.config.leak_style;
        if (!mosaic && (filePathStr.includes("流出") || lowerFilePath.includes("leaked") || (leakStyle && filePathStr.includes(leakStyle)))) {
            leak = leakStyle;
            mosaic = "无码流出";
        }

        const wumaStyle = manager.config.wuma_style;
        if (!mosaic && (filePathStr.includes("无码") || filePathStr.includes("無碼") || filePathStr.includes("無修正") || lowerFilePath.includes("uncensored") || isUncensored(movieNumber))) {
            wuma = wumaStyle;
            mosaic = "无码";
        }

        const youmaStyle = manager.config.youma_style;
        if (!mosaic && (filePathStr.includes("有码") || filePathStr.includes("有碼"))) {
            youma = youmaStyle;
            mosaic = "有码";
        }

        const cnwordList = [...manager.config.cnword_char];
        if (cnwordList.map(c => c.toUpperCase()).includes("-C.")) {
            cnwordList.push("-C ");
        }

        for (const subType of manager.config.sub_type) {
            const subTypeChs = ".chs" + subType;
            const subPathChs = path.join(folderPath, fileName + subTypeChs);
            const subPath = path.join(folderPath, fileName + subType);

            if (await fileExists(subPathChs)) {
                subList.push(subTypeChs);
                hasSub = true;
            }
            if (await fileExists(subPath)) {
                subList.push(subType);
                hasSub = true;
            }
            if (fileOriPath) {
                const subPath2 = fileOriPath.replace(/\.[^/.]+$/, "") + subType;
                if (await fileExists(subPath2)) {
                    hasSub = true;
                }
            }
        }
        if (hasSub) cWord = cnwordStyle;

        if (!hasSub) {
            cnwordList.push("-uc.");
            let fileNameTemp = (fileName + ".").toUpperCase().replace("CD", "").replace("CARIB", "");
            if (cdChar.includes(CDChar.LETTER) && cdChar.includes(CDChar.ENDC)) {
                fileNameTemp = fileNameTemp.replace(/(-|\d{2,}|\.)C\.$/, ".");
            }

            for (const each of cnwordList) {
                if (fileNameTemp.includes(each.toUpperCase()) && !filePathStr.includes("無字幕") && !filePathStr.includes("无字幕")) {
                    cWord = cnwordStyle;
                    hasSub = true;
                    break;
                }
            }
        }

        if ((!hasSub || !mosaic) && await fileExists(nfoOldPath)) {
            try {
                const nfoContent = await fs.readFile(nfoOldPath, 'utf-8');
                if (!hasSub && (nfoContent.includes(">中文字幕</") || nfoContent.includes("<genre>中文字幕</genre>") || nfoContent.includes("<tag>中文字幕</tag>"))) {
                    cWord = cnwordStyle;
                    hasSub = true;
                }
                if (!mosaic) {
                    if (nfoContent.includes(">无码流出</") || nfoContent.includes(">無碼流出</")) mosaic = "无码流出";
                    else if (nfoContent.includes(">无码破解</") || nfoContent.includes(">無碼破解</")) mosaic = "无码破解";
                    else if (nfoContent.includes(">无码</") || nfoContent.includes(">無碼</")) mosaic = "无码";
                    else if (nfoContent.includes(">有碼</") || nfoContent.includes(">有碼</")) mosaic = "有码";
                    else if (nfoContent.includes(">国产</") || nfoContent.includes(">國產</")) mosaic = "国产";
                    else if (nfoContent.includes(">里番</") || nfoContent.includes(">裏番</")) mosaic = "里番";
                    else if (nfoContent.includes(">动漫</") || nfoContent.includes(">動漫</")) mosaic = "动漫";
                }
            } catch (e) {
                console.error(`Error reading NFO file: ${nfoOldPath}`, e);
            }
        }

        fileShowName = movieNumber;
        for (const each of manager.config.suffix_sort) {
            if (each === "moword") {
                fileShowName += destroyed + leak + wuma + youma;
            } else if (each === "cnword") {
                fileShowName += cWord;
            }
        }
        fileShowName += cdPart;

    } catch (error) {
        console.error(`An error occurred while processing file: ${filePath}`, error);
    }

    return {
        number: movieNumber,
        letters: getNumberLetters(movieNumber),
        hasSub,
        cWord,
        cdPart,
        destroyed,
        leak,
        wuma,
        youma,
        mosaic,
        filePath: filePath,
        folderPath: folderPath,
        fileName: fileName,
        fileEx: fileEx,
        subList: subList,
        fileShowName: fileShowName,
        fileShowPath: fileShowPath,
        shortNumber: optionalData.shortNumber || "",
        appointNumber: optionalData.appointNumber || "",
        appointUrl: optionalData.appointUrl || "",
        websiteName: optionalData.websiteName || "",
        definition: "",
        codec: "",
    };
}

export async function getFileInfo(filePath: string): Promise<FileInfo> {
    let optionalData: Record<string, any> = {};
    let movieNumber = "";
    let hasSub = false;
    let cWord = "";
    let cdPart = "";
    let destroyed = "";
    let leak = "";
    let wuma = "";
    let youma = "";
    let mosaic = "";
    const subList: string[] = [];
    const cnwordStyle = manager.config.cnword_style;

    if (Flags.file_mode === FileMode.Again && Flags.newAgainDic[filePath]) {
        const [tempNumber, tempUrl, tempWebsite] = Flags.newAgainDic[filePath];
        if (tempNumber) {
            movieNumber = tempNumber;
            optionalData["appointNumber"] = tempNumber;
        }
        if (tempUrl) {
            optionalData["appointUrl"] = tempUrl;
            optionalData["websiteName"] = tempWebsite;
        }
    } else if (Flags.file_mode === FileMode.Single) {
        optionalData["appointUrl"] = Flags.appointUrl;
    }

    const fileShowPath = showFilePath(filePath);
    const folderPath = path.dirname(filePath);
    const fileFullName = path.basename(filePath);
    const fileEx = path.extname(fileFullName);
    let fileName = path.basename(fileFullName, fileEx);
    const nfoOldPath = path.join(folderPath, fileName + ".nfo");
    let fileShowName = fileName;

    // 软链接时，获取原文件路径
    let fileOriPath: string | null = null;
    try {
        const stats = await fs.lstat(filePath);
        if (stats.isSymbolicLink()) {
            fileOriPath = await fs.realpath(filePath);
        }
    } catch (e) {
        // 文件不存在或无法访问，忽略错误继续
    }


    try {
        let filePathStr = filePath.replace(/\\/g, "/");

        // 清除防屏蔽字符
        const preventChar = manager.config.prevent_char;
        if (preventChar) {
            filePathStr = filePathStr.replace(new RegExp(preventChar, 'g'), "");
            fileName = fileName.replace(new RegExp(preventChar, 'g'), "");
        }

        if (!movieNumber) {
            movieNumber = getFileNumber(filePathStr, manager.computed.escape_string_list);
        }

        const shortNumberMatch = movieNumber.match(/\d{3,}([a-zA-Z]+-\d+)/);
        optionalData["shortNumber"] = shortNumberMatch ? shortNumberMatch[1] : "";

        // ============================ 主要逻辑优化开始 ============================

        // 第一步：优先检查并处理文件名中的中文字幕标志
        const cnwordList = [...manager.config.cnword_char];
        if (cnwordList.map(c => c.toUpperCase()).includes("-C.")) {
            cnwordList.push("-C ");
        }
        cnwordList.push("-uc."); // -uc. 也视为中文字幕的一种标志

        let fileNameTempForCheck = (fileName + ".").toUpperCase().replace("CD", "").replace("CARIB", "");

        for (const each of cnwordList) {
            if (fileNameTempForCheck.includes(each.toUpperCase()) && !filePathStr.includes("無字幕") && !filePathStr.includes("无字幕")) {
                cWord = cnwordStyle;
                hasSub = true;
                // **关键改动**: 找到字幕标志后，从原始文件名中移除它，避免后续cdPart的误判
                const regex = new RegExp(each.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
                fileName = fileName.replace(regex, "");
                break; // 找到后即跳出循环
            }
        }

        // 第二步：检查外部字幕文件。如果文件名已表明有字幕，则无需重复设置cWord
        for (const subType of manager.config.sub_type) {
            const subTypeChs = ".chs" + subType;
            const subPathChs = path.join(folderPath, fileName + subTypeChs);
            const subPath = path.join(folderPath, fileName + subType);

            if (await fileExists(subPathChs)) {
                subList.push(subTypeChs);
            }
            if (await fileExists(subPath)) {
                subList.push(subPath);
            }
            if (fileOriPath && await fileExists(fileOriPath.replace(/\.[^/.]+$/, "") + subType)) {
                 if (!hasSub) hasSub = true; // 即使软链接有字幕也标记
            }
        }
        if (subList.length > 0 || (fileOriPath && hasSub)) {
             if (!cWord) cWord = cnwordStyle; // 仅在未通过文件名识别时才设置
             hasSub = true;
        }


        // 第三步：在处理过的、不包含字幕标志的文件名基础上，进行cdPart的解析
        let fileNameCd = removeEscapeString(fileName, "-").replace(movieNumber, "-").replace(/--/g, "-").trim();
        const cdChar = manager.config.cd_char;
        if (cdChar.includes(CDChar.UNDERLINE)) fileNameCd = fileNameCd.replace(/_/g, "-");
        if (cdChar.includes(CDChar.SPACE)) fileNameCd = fileNameCd.replace(/ /g, "-");
        if (cdChar.includes(CDChar.POINT)) fileNameCd = fileNameCd.replace(/\./g, "-");
        fileNameCd = fileNameCd.toLowerCase() + ".";

        const tempCd = /(vol|case|no|cwp|cwpbd|act)[-.]?\d+/g;
        const tempCdFilename = fileNameCd.replace(tempCd, "");
        const cdPath1 = tempCdFilename.match(/[-_ .](cd|part|hd)(\d{1,2})/);
        const cdPath2 = tempCdFilename.match(/-(\d{1,2})\.?$/);
        const cdPath3 = tempCdFilename.match(/(-|\d{2,}|\.)([a-o])\.?$/);
        const cdPath4 = tempCdFilename.match(/-(\d{1})[^a-z0-9]/);

        let tempCdPart = "";
        if (cdPath1 && parseInt(cdPath1[2]) > 0) {
            tempCdPart = cdPath1[2];
        } else if (cdPath2) {
            if (cdPath2[1].length === 1 || cdChar.includes(CDChar.DIGITAL)) {
                tempCdPart = String(parseInt(cdPath2[1]));
            }
        } else if (cdPath3 && cdChar.includes(CDChar.LETTER)) {
            const letterList = ["", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o"];
            // **关键改动**: 删除了原有的 `cdPath3[2] !== "c"` 判断，因为它现在已无必要，逻辑更清晰
            tempCdPart = String(letterList.indexOf(cdPath3[2]));
        } else if (cdPath4 && cdChar.includes(CDChar.MIDDLE_NUMBER)) {
            tempCdPart = String(parseInt(cdPath4[0]));
        }

        if (tempCdPart && parseInt(tempCdPart) > 0) {
            const cdName = manager.config.cd_name;
            if (cdName === 0) cdPart = "-cd" + tempCdPart;
            else if (cdName === 1) cdPart = "-CD" + tempCdPart;
            else cdPart = "-" + tempCdPart;
        }

        // ============================ 主要逻辑优化结束 ============================

        const umrStyle = manager.config.umr_style;
        const lowerFilePath = filePathStr.toLowerCase();
        if (lowerFilePath.includes("-uncensored.") || lowerFilePath.includes("umr.") || filePathStr.includes("破解") || filePathStr.includes("克破") || (umrStyle && filePathStr.includes(umrStyle)) || lowerFilePath.includes("-u.") || lowerFilePath.includes("-uc.")) {
            destroyed = umrStyle;
            mosaic = "无码破解";
        }
        
        // ... 后续代码与原来保持一致 ...
        // ... (省略 mosaic, leak, wuma, youma 的判断) ...
        
        // NFO文件检查作为最后的补充
        if ((!hasSub || !mosaic) && await fileExists(nfoOldPath)) {
            try {
                const nfoContent = await fs.readFile(nfoOldPath, 'utf-8');
                if (!hasSub && (nfoContent.includes(">中文字幕</") || nfoContent.includes("<genre>中文字幕</genre>") || nfoContent.includes("<tag>中文字幕</tag>"))) {
                    cWord = cnwordStyle;
                    hasSub = true;
                }
                if (!mosaic) {
                    if (nfoContent.includes(">无码流出</") || nfoContent.includes(">無碼流出</")) mosaic = "无码流出";
                    else if (nfoContent.includes(">无码破解</") || nfoContent.includes(">無碼破解</")) mosaic = "无码破解";
                    else if (nfoContent.includes(">无码</") || nfoContent.includes(">無碼</")) mosaic = "无码";
                    else if (nfoContent.includes(">有碼</") || nfoContent.includes(">有碼</")) mosaic = "有码";
                    else if (nfoContent.includes(">国产</") || nfoContent.includes(">國產</")) mosaic = "国产";
                    else if (nfoContent.includes(">里番</") || nfoContent.includes(">裏番</")) mosaic = "里番";
                    else if (nfoContent.includes(">动漫</") || nfoContent.includes(">動漫</")) mosaic = "动漫";
                }
            } catch (e) {
                console.error(`Error reading NFO file: ${nfoOldPath}`, e);
            }
        }

        fileShowName = movieNumber;
        for (const each of manager.config.suffix_sort) {
            if (each === "moword") {
                fileShowName += destroyed + leak + wuma + youma;
            } else if (each === "cnword") {
                fileShowName += cWord;
            }
        }
        fileShowName += cdPart;

    } catch (error) {
        console.error(`An error occurred while processing file: ${filePath}`, error);
    }

    return {
        number: movieNumber,
        letters: getNumberLetters(movieNumber),
        hasSub,
        cWord,
        cdPart,
        destroyed,
        leak,
        wuma,
        youma,
        mosaic,
        filePath: filePath,
        folderPath: folderPath,
        fileName: fileName, // 注意：这里的fileName是已被处理过的
        fileEx: fileEx,
        subList: subList,
        fileShowName: fileShowName,
        fileShowPath: fileShowPath,
        shortNumber: optionalData.shortNumber || "",
        appointNumber: optionalData.appointNumber || "",
        appointUrl: optionalData.appointUrl || "",
        websiteName: optionalData.websiteName || "",
        definition: "",
        codec: "",
    };
}
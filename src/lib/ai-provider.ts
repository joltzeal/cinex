import OpenAI from "openai";
import { logger } from "./logger";
import { getSetting, SettingKey } from "@/services/settings";

export interface AIFolderResult {
  originalName: string;
  categories: string[];
  sourceCategory: string;
  personName: string | null;
}

export async function getBatchClassificationInfo(folderNames: string[]): Promise<AIFolderResult[]> {
  if (folderNames.length === 0) {
    return [];
  }
  try {
    const aiConfig = await getSetting(SettingKey.AiProviderConfig);
    if (!aiConfig) {
      return [];
    }
    const grok = new OpenAI({
      apiKey: aiConfig.apiKey,
      baseURL: aiConfig.baseURL,
    });
    const completion = await grok.chat.completions.create({
      model: 'grok-3-mini',
      messages: [
        {
          role: 'system',
          content: `你是一个高级文件分类专家。你的任务是分析一个包含多个成人媒体文件夹名称的JSON数组，并为每个文件夹提供结构化的分类信息，以便于创建层级目录。

对于数组中的每一个文件夹名称，请执行以下操作：
1.  **全面标签提取**: 识别所有相关的中文标签。这包括内容类型(如：剧情, BDSM)、特征(如：黑丝, 巨乳)，以及最重要的两类：
    *   **来源平台**: 如 "推特", "OnlyFans", "抖音", "自拍" 等。
    *   **核心人名**: 识别出标题中的主要人物名称或ID（例如 "小丽", "性感教师", "Lina"）。这是最重要的信息之一。

2.  **确定目录结构**:
    *   **一级目录 ("sourceCategory")**: 将识别出的“来源平台”或最核心的内容类别作为一级目录。如果没有明确来源，就使用一个概括性的内容类别（如 "剧情", "Cosplay", "街拍"）。
    *   **二级目录 ("personName")**: 如果识别出了“核心人名”，则将其作为二级目录。如果标题中没有人名或无法确定，请将此字段设为 null。

3.  **输出格式**: 返回一个JSON对象，其中包含一个名为 "results" 的键，其值为一个数组。数组中的每个对象都必须包含以下四个字段，请严格遵循JSON格式：
    *   "originalName": 原始文件夹名，保持不变。
    *   "categories": 一个包含所有识别出的中文标签的数组。
    *   "sourceCategory": 字符串，用于一级目录。
    *   "personName": 字符串（如果找到人名）或 null（如果未找到）。

**示例:**
输入: ["「推特」性感美女-小丽的日常黑丝诱惑", "国产剧情-办公室的秘密"]
期望输出:
\`\`\`json
{
  "results": [
    {
      "originalName": "「推特」性感美女-小丽的日常黑丝诱惑",
      "categories": ["推特", "性感美女", "小丽", "日常", "黑丝", "诱惑"],
      "sourceCategory": "推特",
      "personName": "小丽"
    },
    {
      "originalName": "国产剧情-办公室的秘密",
      "categories": ["国产", "剧情", "办公室", "秘密"],
      "sourceCategory": "剧情",
      "personName": null
    }
  ]
}
\`\`\`
请确保返回的数组与输入的数组在顺序和数量上完全对应。`,
        },
        {
          role: 'user',
          content: `请分析以下 JSON 数组中的所有文件夹名：\n${JSON.stringify(folderNames)}`,
        },
      ],
      response_format: { type: 'json_object' },
    });
    const content = completion.choices[0].message.content;
    if (!content) {
      logger.error('Grok API 返回了空内容');
      return [];
    }
    const result = JSON.parse(content);
    return result.results || [];
  } catch (error) {
    logger.error(`Grok API 批量处理错误:${error}`, );
    return [];
  }
}
export async function translatePlotByAI(input: string | string[]): Promise<string | string[] | null> {
  try {
    // 1. 获取 AI 配置
    const aiConfig = await getSetting(SettingKey.AiProviderConfig);
    if (!aiConfig) {
      logger.error('无法获取 AI 提供商配置');
      return null;
    }

    const groq = new OpenAI({
      apiKey: aiConfig.apiKey,
      baseURL: aiConfig.baseURL,
    });
    
    // 2. 定义一个强大、精确的系统 Prompt
    // 这个 Prompt 指示 AI 如何处理两种不同的输入情况（字符串 vs. 字符串数组）
    // 并严格要求输出格式，避免任何无关字符。
    const systemPrompt = `你是一个专业的翻译引擎。请严格遵守以下规则：
1.  将用户提供的内容翻译成自然流畅的简体中文。
2.  如果输入是单个字符串，直接返回翻译后的字符串，不要包含任何前缀、解释或额外字符。
3.  如果输入是一个 JSON 格式的字符串数组 (e.g., ["text1", "text2"])，你必须返回一个同样格式的 JSON 字符串数组，其中包含对应顺序的翻译结果。
4.  你的回答必须是纯粹的翻译内容或 JSON 数组，绝对不能有任何形式的包装或修饰。`;

    // 3. 根据输入类型执行不同逻辑
    if (typeof input === 'string') {
      // --- 情况 A: 输入是单个字符串 ---
      logger.info(`正在翻译单个文本...`);
      const completion = await groq.chat.completions.create({
        model: 'grok-3-mini', // 建议使用支持稳定 JSON 输出的模型
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: input },
        ],
      });
      const content = completion.choices[0].message.content;
      return content || null;

    } else if (Array.isArray(input)) {
      // --- 情况 B: 输入是字符串数组 ---
      if (input.length === 0) {
        return []; // 处理空数组的边缘情况
      }
      
      logger.info(`正在通过单次请求批量翻译 ${input.length} 个文本...`);

      // 将数组转换为 JSON 字符串，作为单次请求的内容
      const requestPayload = JSON.stringify(input);

      const completion = await groq.chat.completions.create({
        model: 'grok-3-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: requestPayload },
        ],
        // 对于支持 JSON 模式的提供商，可以开启此选项以获得更可靠的 JSON 输出
        // response_format: { type: "json_object" }, 
      });

      const rawContent = completion.choices[0].message.content;

      if (!rawContent) {
        throw new Error('Grok API 返回了空内容');
      }

      // 尝试解析 AI 返回的 JSON 字符串
      try {
        const parsedResult = JSON.parse(rawContent);
        if (Array.isArray(parsedResult)) {
          return parsedResult;
        } else {
          // 如果返回的不是数组，说明 AI 未能遵循指令
          throw new Error('AI 返回的结果不是有效的数组格式');
        }
      } catch (parseError) {
        logger.error(`解析 AI 返回的 JSON 失败:${parseError}`, );
        logger.error(`收到的原始数据:${rawContent}`, );
        // 在解析失败时，可以尝试进行一些简单的修复，或者直接抛出错误
        // 例如，有时候 AI 可能返回被 Markdown 代码块包裹的 JSON
        // if (rawContent.includes('```json')) {
        //     const extractedJson = rawContent.split('```json\n')[1].split('\n```');
        //     try {
        //         return JSON.parse(extractedJson);
        //     } catch (e) {
        //          throw new Error('提取并解析修复后的 JSON 失败');
        //     }
        // }
        throw new Error('最终无法将 AI 响应解析为数组');
      }
    } else {
      return null; // 输入既不是字符串也不是数组
    }

  } catch (error) {
    logger.error(`AI 翻译过程中发生错误:${error}`, );
    return null;
  }
}

import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import * as cheerio from 'cheerio';

let genAI = null;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const MODELS = [
  "gemini-3-flash-preview", // User preferred
  "gemini-2.5-flash-lite", // Stable & Working
  "gemini-2.5-flash",      // Stable & Working
  "gemma-3-27b-it"          // Working Open Model
];

async function generateWithRetry(genAI, prompt, retries = 3, modelIndex = 0) {
  const modelName = MODELS[modelIndex % MODELS.length];
  const model = genAI.getGenerativeModel({ model: modelName });
  
  try {
    return await model.generateContent(prompt);
  } catch (error) {
    // 检查是否为 429 错误 (Too Many Requests) 或 404/400 (模型不存在/不支持)
    // 404: Not Found (Model not found)
    // 400: Bad Request (Model not supported or invalid request)
    const isRateLimit = error.status === 429 || (error.message && error.message.includes('429'));
    const isModelError = error.status === 404 || error.status === 400 || (error.message && (error.message.includes('404') || error.message.includes('400') || error.message.includes('Not Found')));

    if (isRateLimit || isModelError) {
      if (isRateLimit) {
         console.warn(`[AI] 配额超限 (${modelName})。`);
      } else {
         console.warn(`[AI] 模型不可用或不支持 (${modelName})，错误: ${error.status || error.message}`);
      }
      
      // 策略1：尝试切换模型
      if (modelIndex < MODELS.length - 1) {
         console.warn(`[AI] 尝试切换到备用模型: ${MODELS[modelIndex + 1]}...`);
         return generateWithRetry(genAI, prompt, retries, modelIndex + 1);
      }

      // 策略2：所有模型都试过了，或者策略是等待
      // 如果是模型错误 (404/400)，重试同一个模型没有意义，但我们这里逻辑是重置索引从头开始试，
      // 也许其他模型能用。
      if (retries > 0) {
        const waitTime = 20000; // 20秒
        console.warn(`[AI] 所有模型均忙或不可用，将在 ${waitTime/1000} 秒后重试... (剩余尝试次数: ${retries})`);
        await sleep(waitTime);
        // 递归重试，重置模型索引，从头开始试
        return generateWithRetry(genAI, prompt, retries - 1, 0);
      }
    }
    throw error;
  }
}

export async function analyzeContent(text, providedUrl = null) {
  if (!genAI) {
    const API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (API_KEY) {
      genAI = new GoogleGenerativeAI(API_KEY);
    } else {
      console.warn('Google API Key not found. Skipping AI analysis.');
      return null;
    }
  }

  // 1. Extract URL
  let url = providedUrl;
  if (!url) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = text.match(urlRegex);
    url = urls ? urls[0] : null;
  }
  let fetchedContent = '';

  // 2. Fetch URL content if exists
  if (url) {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      const $ = cheerio.load(response.data);
      // Remove scripts, styles, nav, footer to get main content
      $('script, style, nav, footer, header, .ads, .sidebar').remove();
      fetchedContent = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 8000); // Limit length
    } catch (error) {
      console.error('Error fetching URL:', error.message);
      // Continue without fetched content
    }
  }

  // 3. Call Gemini with Retry & Model Fallback
  const prompt = `
  请分析以下内容，并以JSON格式提取/生成以下字段（不要包含Markdown格式标记，content字段除外）：
  1. title: 重新提炼一个合适的标题，如果原标题不清晰，请根据内容生成更好的标题。字数限制在50个字以内，不要太长。
  2. summary: 一个简洁的中文摘要。
  3. type: 将内容分类为以下确切值之一："随便", "抖音", "公众号", "文档", "其他"。
  4. tags: 提取3-5个相关的标签（字符串数组）。
  5. content: 重构并详细整理正文内容，使其结构清晰、易读。使用Markdown格式（如使用## 分级标题、- 列表等），保留核心信息，去除广告和无关内容。确保内容详实。
  
  用户输入内容:
  ${text}
  
  提取到的URL内容 (如果有):
  ${fetchedContent}
  
  请只返回JSON对象。
  `;

  try {
    const result = await generateWithRetry(genAI, prompt);
    const response = await result.response;
    let textResult = response.text();
    // Clean up markdown json blocks if any
    textResult = textResult.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const json = JSON.parse(textResult);
    return {
      title: json.title || '无标题',
      url: url,
      summary: json.summary || '',
      type: ['随便', '抖音', '公众号', '文档', '其他'].includes(json.type) ? json.type : '其他',
      tags: Array.isArray(json.tags) ? json.tags : [],
      content: json.content || fetchedContent || text,
      fetchedContent: fetchedContent // Explicitly return fetched content
    };
  } catch (error) {
    // If it's a rate limit error, throw it so the caller can handle it (e.g., wait and retry)
    if (error.status === 429) {
      throw error;
    }
    
    console.error('AI Analysis failed:', error);
    // Return partial result if AI fails but we found a URL
    return {
      title: null, // Don't override title if AI failed
      url: url,
      summary: null,
      type: '其他',
      content: fetchedContent || text,
      fetchedContent: fetchedContent
    };
  }
}

export async function generateDailySummary(contents) {
  if (!genAI) {
    const API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (API_KEY) {
      genAI = new GoogleGenerativeAI(API_KEY);
    } else {
      console.warn('Google API Key not found. Skipping daily summary.');
      return null;
    }
  }

  if (!contents || contents.length === 0) {
    return null;
  }

  // Ensure content exists
  const contentText = contents.map((c, index) => {
    const text = c.summary || (c.content ? c.content.substring(0, 200) : '') || c.title;
    return `${index + 1}. 标题: ${c.title}\n   内容摘要: ${text}...`;
  }).join('\n\n');

  const prompt = `
  请根据以下今天的笔记内容，生成一个精炼的日报总结。
  
  要求：
  1. 总结今天关注的核心主题和关键信息。
  2. 语言简练，条理清晰。
  3. 字数控制在100-300字之间。
  4. 不要使用Markdown格式，直接输出纯文本。
  
  今日笔记列表：
  ${contentText}
  `;

  try {
    const result = await generateWithRetry(genAI, prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error('Daily summary generation failed:', error);
    return null;
  }
}

import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import * as cheerio from 'cheerio';

const API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

export async function analyzeContent(text, providedUrl = null) {
  if (!genAI) {
    console.warn('Google API Key not found. Skipping AI analysis.');
    return null;
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

  // 3. Call Gemini
  const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

  const prompt = `
  请分析以下内容，并以JSON格式提取/生成以下字段（不要包含Markdown格式标记）：
  1. title: 一个合适的标题。
  2. summary: 一个简洁的中文摘要。
  3. type: 将内容分类为以下确切值之一："随便", "抖音", "公众号", "文档", "其他"。
  
  用户输入内容:
  ${text}
  
  提取到的URL内容 (如果有):
  ${fetchedContent}
  
  请只返回JSON对象。
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let textResult = response.text();
    // Clean up markdown json blocks if any
    textResult = textResult.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const json = JSON.parse(textResult);
    return {
      title: json.title || '无标题',
      url: url,
      summary: json.summary || '',
      type: ['随便', '抖音', '公众号', '文档', '其他'].includes(json.type) ? json.type : '其他'
    };
  } catch (error) {
    console.error('AI Analysis failed:', error);
    // Return partial result if AI fails but we found a URL
    return {
      title: '未命名内容',
      url: url,
      summary: 'AI分析失败',
      type: '其他'
    };
  }
}

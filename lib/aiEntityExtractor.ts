// lib/aiEntityExtractor.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface ExtractedEntities {
  day?: string;
  date?: string;
  time?: string;
  location?: string;
  walletAddresses: string[];
  suspectAddresses: string[];
  eventType: string;
  amount?: string;
  currency?: string;
  platform?: string;
  urls?: string[];
  content: string;
}

export class AIEntityExtractor {
  private model;

  constructor() {
    this.model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  async extractEntities(content: string): Promise<ExtractedEntities> {
    const prompt = `
Extract entities from this investigation text. Return ONLY a valid JSON object with these fields:
- day: day of week if mentioned (e.g., "Monday")
- date: specific date if mentioned (e.g., "29th June 2025")
- time: specific time if mentioned (e.g., "3:00 PM")
- location: physical or digital location (e.g., "New York", "Discord", "Telegram")
- walletAddresses: array of all wallet/crypto addresses found (e.g., ["0x123...", "bc1..."])
- suspectAddresses: array of addresses specifically mentioned as suspects
- eventType: categorize the event (e.g., "Scam", "Hack", "Fraud", "Suspicious Trading", "Phishing", "Rug Pull")
- amount: monetary amount if mentioned (e.g., "1000")
- currency: currency type if mentioned (e.g., "USD", "ETH", "BTC")
- platform: platform/service mentioned (e.g., "Uniswap", "Discord", "Twitter")
- urls: array of URLs found
- content: the original text

Text to analyze: "${content}"

Return only the JSON object, no other text:`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();
      
      // Clean the response and parse JSON
      const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const entities = JSON.parse(cleanText);
      
      // Validate and set defaults
      return {
        day: entities.day || undefined,
        date: entities.date || undefined,
        time: entities.time || undefined,
        location: entities.location || undefined,
        walletAddresses: Array.isArray(entities.walletAddresses) ? entities.walletAddresses : [],
        suspectAddresses: Array.isArray(entities.suspectAddresses) ? entities.suspectAddresses : [],
        eventType: entities.eventType || 'Investigation',
        amount: entities.amount || undefined,
        currency: entities.currency || undefined,
        platform: entities.platform || undefined,
        urls: Array.isArray(entities.urls) ? entities.urls : [],
        content: content
      };
    } catch (error) {
      console.error('AI Entity extraction failed:', error);
      
      // Fallback: basic regex extraction
      return this.fallbackExtraction(content);
    }
  }

  private fallbackExtraction(content: string): ExtractedEntities {
    // Basic regex patterns for fallback
    const walletRegex = /0x[a-fA-F0-9]{40}|[13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-z0-9]{39,59}/g;
    const urlRegex = /https?:\/\/[^\s]+/g;
    const amountRegex = /\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/g;
    
    const walletAddresses = content.match(walletRegex) || [];
    const urls = content.match(urlRegex) || [];
    
    return {
      walletAddresses,
      suspectAddresses: walletAddresses, // Assume all found addresses are suspects in fallback
      eventType: content.toLowerCase().includes('scam') ? 'Scam' : 'Investigation',
      urls,
      content
    };
  }
}
type AIProvider = 'gemini' | 'openai' | 'none';

type AIFileResult = {
  text: string;
  provider: AIProvider;
  error?: string;
};

function cleanEnv(value: string | undefined) {
  return (value || '').trim().replace(/^['"]|['"]$/g, '');
}

function getGeminiKey() {
  return cleanEnv(process.env.GEMINI_API_KEY);
}

function getOpenAIKey() {
  return cleanEnv(process.env.OPENAI_API_KEY);
}

function isImageMimeType(mimeType: string) {
  return mimeType.startsWith('image/');
}

async function safeErrorText(response: Response) {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

export async function callGeminiWithFile(
  prompt: string,
  base64: string,
  mimeType: string,
): Promise<AIFileResult> {
  const apiKey = getGeminiKey();
  if (!apiKey) {
    return { text: '', provider: 'none', error: 'GEMINI_API_KEY lipsa' };
  }

  const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'];

  for (const model of models) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 8192,
          },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await safeErrorText(response);
      if (response.status === 429) {
        continue;
      }
      throw new Error(`Gemini ${response.status}: ${errorText.slice(0, 200)}`);
    }

    const payload = await response.json();
    const text = payload?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part?.text || '')
      .join('')
      .trim();

    if (text) {
      return { text, provider: 'gemini' };
    }
  }

  return { text: '', provider: 'none', error: 'Gemini nu a returnat continut' };
}

export async function callOpenAIWithFile(
  prompt: string,
  base64: string,
  mimeType: string,
): Promise<AIFileResult> {
  const apiKey = getOpenAIKey();
  if (!apiKey) {
    return { text: '', provider: 'none', error: 'OPENAI_API_KEY lipsa' };
  }

  if (!isImageMimeType(mimeType)) {
    return {
      text: '',
      provider: 'none',
      error: `OpenAI fallback suporta doar imagini pentru mime type ${mimeType}`,
    };
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
                detail: 'high',
              },
            },
          ],
        },
      ],
      max_tokens: 8192,
    }),
  });

  if (!response.ok) {
    const errorText = await safeErrorText(response);
    throw new Error(`OpenAI ${response.status}: ${errorText.slice(0, 200)}`);
  }

  const payload = await response.json();
  const text = payload?.choices?.[0]?.message?.content?.trim() || '';

  return { text, provider: 'openai' };
}
// AI Provider utility - Gemini primary, Groq fallback
// Ambele sunt gratuite, Groq are limite mai generoase

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

interface AIResponse {
  text: string;
  provider: 'gemini' | 'groq' | 'none';
  error?: string;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Try Gemini first, then Groq as fallback
export async function callAI(
  systemPrompt: string,
  messages: Message[],
  options: {
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<AIResponse> {
  const { temperature = 0.7, maxTokens = 4096 } = options;

  // Try Gemini first
  if (GEMINI_API_KEY) {
    try {
      const result = await callGemini(systemPrompt, messages, temperature, maxTokens);
      if (result.text) return result;
    } catch (e) {
      console.log('Gemini failed, trying Groq...', e);
    }
  }

  // Fallback to Groq
  if (GROQ_API_KEY) {
    try {
      const result = await callGroq(systemPrompt, messages, temperature, maxTokens);
      if (result.text) return result;
    } catch (e) {
      console.log('Groq also failed:', e);
    }
  }

  return {
    text: '',
    provider: 'none',
    error: 'Niciun provider AI disponibil. Verifică cheile API în .env.local'
  };
}

async function callGemini(
  systemPrompt: string,
  messages: Message[],
  temperature: number,
  maxTokens: number
): Promise<AIResponse> {
  // Build conversation for Gemini
  const contents = messages.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }]
  }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('Gemini error:', error);
    throw new Error('Gemini API error');
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  return { text, provider: 'gemini' };
}

async function callGroq(
  systemPrompt: string,
  messages: Message[],
  temperature: number,
  maxTokens: number
): Promise<AIResponse> {
  // Build messages for Groq (OpenAI-compatible format)
  const groqMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }))
  ];

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile', // Cel mai capabil model gratuit
      messages: groqMessages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Groq error:', error);
    throw new Error('Groq API error');
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';

  return { text, provider: 'groq' };
}

// For file/PDF processing with Gemini (Groq doesn't support multimodal)
export async function callGeminiWithFile(
  prompt: string,
  fileBase64: string,
  mimeType: string
): Promise<AIResponse> {
  if (!GEMINI_API_KEY) {
    return {
      text: '',
      provider: 'none',
      error: 'Gemini API key required for file processing'
    };
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: mimeType, data: fileBase64 } },
            { text: prompt }
          ]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4096,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('Gemini file error:', error);
    throw new Error('Gemini file processing error');
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  return { text, provider: 'gemini' };
}

export function hasAnyAIProvider(): boolean {
  return !!(GEMINI_API_KEY || GROQ_API_KEY);
}

export function getAvailableProviders(): string[] {
  const providers: string[] = [];
  if (GEMINI_API_KEY) providers.push('Gemini');
  if (GROQ_API_KEY) providers.push('Groq');
  return providers;
}

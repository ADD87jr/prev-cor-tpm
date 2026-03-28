type AIProvider = 'gemini' | 'groq' | 'openai' | 'none';

export interface AIResponse {
  text: string;
  provider: AIProvider;
  error?: string;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

function cleanEnv(value: string | undefined) {
  return (value || '').trim().replace(/^['"]|['"]$/g, '');
}

function getGeminiKey() {
  return cleanEnv(process.env.GEMINI_API_KEY);
}

function getGroqKey() {
  return cleanEnv(process.env.GROQ_API_KEY);
}

function getOpenAIKey() {
  return cleanEnv(process.env.OPENAI_API_KEY);
}

async function safeErrorText(response: Response) {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

async function callGemini(
  systemPrompt: string,
  messages: Message[],
  temperature: number,
  maxTokens: number,
): Promise<AIResponse> {
  const geminiKey = getGeminiKey();
  if (!geminiKey) {
    return { text: '', provider: 'none', error: 'GEMINI_API_KEY lipsa' };
  }

  const contents = messages.map((msg) => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }],
  }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
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
    },
  );

  if (!response.ok) {
    const errorText = await safeErrorText(response);
    throw new Error(`Gemini API error: ${errorText.slice(0, 250)}`);
  }

  const payload = await response.json();
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return { text, provider: 'gemini' };
}

async function callGroq(
  systemPrompt: string,
  messages: Message[],
  temperature: number,
  maxTokens: number,
): Promise<AIResponse> {
  const groqKey = getGroqKey();
  if (!groqKey) {
    return { text: '', provider: 'none', error: 'GROQ_API_KEY lipsa' };
  }

  const groqMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map((msg) => ({ role: msg.role, content: msg.content })),
  ];

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${groqKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: groqMessages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errorText = await safeErrorText(response);
    throw new Error(`Groq API error: ${errorText.slice(0, 250)}`);
  }

  const payload = await response.json();
  const text = payload?.choices?.[0]?.message?.content || '';
  return { text, provider: 'groq' };
}

export async function callAI(
  systemPrompt: string,
  messages: Message[],
  options: {
    temperature?: number;
    maxTokens?: number;
  } = {},
): Promise<AIResponse> {
  const { temperature = 0.7, maxTokens = 4096 } = options;

  if (getGeminiKey()) {
    try {
      const result = await callGemini(systemPrompt, messages, temperature, maxTokens);
      if (result.text) {
        return result;
      }
    } catch {
      // Falls through to next provider
    }
  }

  if (getGroqKey()) {
    try {
      const result = await callGroq(systemPrompt, messages, temperature, maxTokens);
      if (result.text) {
        return result;
      }
    } catch {
      // Falls through to next provider
    }
  }

  return {
    text: '',
    provider: 'none',
    error: 'Niciun provider AI disponibil. Verifica cheile API din env.',
  };
}

export async function callGeminiWithFile(
  prompt: string,
  fileBase64: string,
  mimeType: string,
): Promise<AIResponse> {
  const geminiKey = getGeminiKey();
  if (!geminiKey) {
    return {
      text: '',
      provider: 'none',
      error: 'GEMINI_API_KEY lipsa',
    };
  }

  const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'];

  for (const model of models) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
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
                    data: fileBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 8192,
          },
        }),
      },
    );

    if (!response.ok) {
      if (response.status === 429) {
        continue;
      }
      const errorText = await safeErrorText(response);
      throw new Error(`Gemini file processing error: ${errorText.slice(0, 250)}`);
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

  return {
    text: '',
    provider: 'none',
    error: 'Gemini nu a returnat continut',
  };
}

export async function callOpenAIWithFile(
  prompt: string,
  fileBase64: string,
  mimeType: string,
): Promise<AIResponse> {
  const openaiKey = getOpenAIKey();
  if (!openaiKey) {
    return {
      text: '',
      provider: 'none',
      error: 'OPENAI_API_KEY lipsa',
    };
  }

  if (!mimeType.startsWith('image/')) {
    return {
      text: '',
      provider: 'none',
      error: `OpenAI fallback suporta doar imagini (${mimeType})`,
    };
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openaiKey}`,
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
                url: `data:${mimeType};base64,${fileBase64}`,
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
    throw new Error(`OpenAI error: ${errorText.slice(0, 250)}`);
  }

  const payload = await response.json();
  const text = payload?.choices?.[0]?.message?.content?.trim() || '';
  return { text, provider: 'openai' };
}

export function hasAnyAIProvider(): boolean {
  return Boolean(getGeminiKey() || getGroqKey() || getOpenAIKey());
}

export function getAvailableProviders(): string[] {
  const providers: string[] = [];
  if (getGeminiKey()) providers.push('Gemini');
  if (getGroqKey()) providers.push('Groq');
  if (getOpenAIKey()) providers.push('OpenAI');
  return providers;
}

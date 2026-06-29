export const callGroqAPI = async (conversation, apiKey) => {
    // Groq requires string content for text models, no images allowed
    const mappedConversation = conversation.map(m => {
        return { role: m.role, content: m.content };
    });

    
    // Try primary model, then fallback
    const models = ['llama-3.3-70b-versatile', 'llama3-8b-8192', 'llama3-70b-8192'];

    let lastError = null;
    for (const model of models) {
        try {
            const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({ model, messages: mappedConversation, stream: true })
            });
            if (res.status === 429) throw new Error("API LIMIT REACHED: You have exceeded the rate limit for your Groq API key.");
            if (res.status === 401) throw new Error("INVALID API KEY: Your Groq API key is invalid or unauthorized.");
            if (res.status === 404) { lastError = new Error(`Model ${model} not found, trying fallback...`); continue; }
            if (res.status === 400) { const d = await res.json().catch(()=>({})); throw new Error(`Groq Version/Format Error: ${d.error?.message || 'Invalid Request'}`); }
            if (!res.ok) { const d = await res.json().catch(()=>({})); throw new Error(d.error?.message || 'Groq Error'); }
            return res;
        } catch (err) {
            lastError = err;
            // Only retry on 404/model not found, throw immediately on other errors
            if (err.message.includes('API LIMIT') || err.message.includes('INVALID') || err.message.includes('Version/Format')) throw err;
        }
    }
    throw lastError || new Error('All Groq models failed');
};

export const callGeminiAPI = async (conversation, apiKey) => {
    const sysPrompt = conversation.find(m => m.role === 'system')?.content || '';
    
    const rawMsgs = conversation.filter(m => m.role !== 'system').map(m => {
        const parts = [{ text: m.content }];
        if (m.image) {
            const base64Data = m.image.replace(/^data:image\/\w+;base64,/, '');
            const mimeType = m.image.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/jpeg';
            parts.push({ inlineData: { mimeType: mimeType, data: base64Data } });
        }
        return { role: m.role === 'user' ? 'user' : 'model', parts: parts };
    });
    
    // Merge consecutive messages of the same role (required by Gemini API)
    const geminiMsgs = [];
    let prevRole = null;
    for (const m of rawMsgs) {
        if (m.role === prevRole && geminiMsgs.length > 0) {
            geminiMsgs[geminiMsgs.length - 1].parts.push(...m.parts);
        } else {
            geminiMsgs.push(m);
            prevRole = m.role;
        }
    }
    
    // Model priority: try highest-quota free models first
    // gemini-1.5-flash-8b: 4000 RPM free (highest quota)
    // gemini-2.0-flash-lite: 30 RPM, good free tier
    // gemini-2.0-flash: 15 RPM free (low, often hits limits)
    // gemini-1.5-flash: reliable fallback
    const models = [
        'gemini-1.5-flash-8b',
        'gemini-2.0-flash-lite',
        'gemini-2.0-flash',
        'gemini-1.5-flash',
    ];
    
    let lastError = null;
    for (const model of models) {
        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                   systemInstruction: { parts: [{ text: sysPrompt }] },
                   contents: geminiMsgs
                })
            });
            if (res.status === 429) {
                // Rate limit on this model — try the next fallback instead of failing immediately
                const d = await res.json().catch(() => ({}));
                const reason = d.error?.message || `${model} quota exceeded`;
                lastError = new Error(`RETRY: ${reason}`);
                continue; // try next model
            }
            if (res.status === 400) {
                const d = await res.json().catch(() => ({}));
                throw new Error(d.error?.message || 'Invalid request — check your Gemini API key.');
            }
            if (res.status === 403) {
                const d = await res.json().catch(() => ({}));
                throw new Error(`API KEY RESTRICTED: ${d.error?.message || "Enable the Generative Language API in Google Cloud Console."}`);
            }
            if (res.status === 404) { lastError = new Error(`Model ${model} not available, trying fallback...`); continue; }
            if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error?.message || `Gemini Error (${res.status})`); }
            return res;
        } catch (err) {
            lastError = err;
            // Only abort immediately on auth/key errors, retry on quota/model errors
            if (err.message.includes('API KEY RESTRICTED') || err.message.includes('Invalid request')) throw err;
            if (err.message.startsWith('RETRY:')) continue;
        }
    }
    // All models exhausted — give a helpful message
    throw new Error('API LIMIT REACHED: All Gemini models are rate-limited. Try Groq (free, fast) — get a key at console.groq.com/keys');
};

export const callOpenAIAPI = async (conversation, apiKey, customEndpoint, provider) => {
    let hasImage = false;
    const mappedConversation = conversation.map(m => {
       if (m.image) {
           hasImage = true;
           return {
               role: m.role,
               content: [
                   { type: 'text', text: m.content },
                   { type: 'image_url', image_url: { url: m.image } }
               ]
           };
       }
       return { role: m.role, content: m.content };
    });
    
    let url = 'https://api.openai.com/v1/chat/completions';
    let targetModel = hasImage ? 'gpt-4o' : 'gpt-4o-mini';
    
    if (provider === 'custom') {
        url = customEndpoint.endsWith('/') ? `${customEndpoint}chat/completions` : `${customEndpoint}/chat/completions`;
        targetModel = 'gpt-3.5-turbo';
    }

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model: targetModel, messages: mappedConversation, stream: true })
    });
    if (!res.ok) { const d = await res.json().catch(()=>({})); throw new Error(d.error?.message || 'API Error'); }
    return res;
};

export const callAnthropicAPI = async (conversation, apiKey) => {
    const sysPrompt = conversation.find(m => m.role === 'system')?.content || '';
    const filtered = conversation.filter(m => m.role !== 'system');
    
    const mappedConversation = filtered.map(m => {
       if (m.image) {
           const base64Data = m.image.replace(/^data:image\/\w+;base64,/, '');
           const mimeType = m.image.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/jpeg';
           return {
               role: m.role === 'assistant' ? 'assistant' : 'user',
               content: [
                   { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64Data } },
                   { type: 'text', text: m.content }
               ]
           };
       }
       return { role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content };
    });

    const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 
           'Content-Type': 'application/json', 
           'x-api-key': apiKey, 
           'anthropic-version': '2023-06-01',
           'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({ 
           model: 'claude-3-5-sonnet-20240620', 
           max_tokens: 4096,
           system: sysPrompt,
           messages: mappedConversation, 
           stream: true 
        })
    });
    if (!res.ok) { const d = await res.json().catch(()=>({})); throw new Error(d.error?.message || 'Anthropic API Error'); }
    return res;
};

export const callOllamaAPI = async (conversation, endpoint, model) => {
    const ep = endpoint || 'http://localhost:11434';
    const isLocal = ep.includes('localhost') || ep.includes('127.0.0.1');
    const baseUrl = (isLocal && import.meta.env.DEV) ? '/api/ollama' : ep;
    const url = `${baseUrl}/v1/chat/completions`;
    const targetModel = model || 'llama3';

    const mappedConversation = conversation.map(m => {
       if (m.image) {
           return {
               role: m.role,
               content: [
                   { type: 'text', text: m.content },
                   { type: 'image_url', image_url: { url: m.image } }
               ]
           };
       }
       return { role: m.role, content: m.content };
    });

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: targetModel, messages: mappedConversation, stream: true })
    });
    if (!res.ok) { 
      const d = await res.json().catch(()=>({})); 
      throw new Error(d.error?.message || `Ollama Error (${res.status}): Make sure Ollama is running and the model "${targetModel}" is pulled.`); 
    }
    return res;
};

export const readStream = async (response, provider, onPartialResponse) => {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;
        
        try {
          const parsed = JSON.parse(data);
          let text = '';
          if (provider === 'gemini') {
            text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          } else if (provider === 'anthropic') {
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
               text = parsed.delta.text;
            }
          } else {
            text = parsed?.choices?.[0]?.delta?.content || '';
          }
          fullText += text;
          if (onPartialResponse) onPartialResponse(fullText);
        } catch (e) { /* skip unparseable chunks */ }
      }
    }
    return fullText;
};

// OpenRouter — 100+ AI models (many FREE) via a single API key
// Models ending in :free cost $0. Get key at openrouter.ai
export const callOpenRouterAPI = async (conversation, apiKey, model) => {
    const mappedConversation = conversation.map(m => {
        if (m.image) {
            return {
                role: m.role,
                content: [
                    { type: 'text', text: m.content },
                    { type: 'image_url', image_url: { url: m.image } }
                ]
            };
        }
        return { role: m.role, content: m.content };
    });

    const targetModel = model || 'meta-llama/llama-3.2-3b-instruct:free';

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://apex-browser.app',
            'X-Title': 'Apex Browser'
        },
        body: JSON.stringify({ model: targetModel, messages: mappedConversation, stream: true })
    });
    if (res.status === 401) throw new Error('INVALID API KEY: Your OpenRouter key is invalid. Get one free at openrouter.ai');
    if (res.status === 429) throw new Error('RATE LIMIT: You have exceeded your OpenRouter quota. Try a different free model.');
    if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error?.message || `OpenRouter Error (${res.status})`); }
    return res;
};


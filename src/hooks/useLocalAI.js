import { useState } from 'react';
import useBrowserStore from '../store/useBrowserStore';

export default function useLocalAI() {
  const { ollamaEndpoint, ollamaModel, setLocalAIReady, setAiProvider } = useBrowserStore();
  
  const endpoint = ollamaEndpoint || 'http://localhost:11434';
  const model = ollamaModel || 'llama3';

  const [status, setStatus] = useState('idle'); // idle, checking, install, downloading, connected, error
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const checkOllama = async () => {
    try {
      setStatus('checking');
      const res = await fetch(endpoint, { method: 'GET' });
      if (res.ok) {
        // Ollama is running. Now check if model exists
        const tagsRes = await fetch(`${endpoint}/api/tags`);
        const tagsData = await tagsRes.json();
        const hasModel = tagsData.models?.some(m => m.name === model || m.name === `${model}:latest`);
        
        if (hasModel) {
          setStatus('connected');
          setLocalAIReady(true);
          return true;
        } else {
          setStatus('downloading');
          return await pullModel();
        }
      }
    } catch (err) {
      console.warn('Ollama not running:', err);
      setStatus('install');
      return false;
    }
  };

  const getOSInstallLink = () => {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('win')) return 'https://ollama.com/download/OllamaSetup.exe';
    if (ua.includes('mac')) return 'https://ollama.com/download/Ollama-darwin.zip';
    if (ua.includes('linux')) return 'https://ollama.com/download/linux';
    return 'https://ollama.com/download';
  };

  const openInstallPage = () => {
    window.open(getOSInstallLink(), '_blank');
    setErrorMsg('Please install Ollama, start it, and click Retry.');
  };

  const pullModel = async () => {
    try {
      setStatus('downloading');
      const res = await fetch(`${endpoint}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: model })
      });
      
      if (!res.ok) throw new Error('Failed to start model pull');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunks = decoder.decode(value).split('\n').filter(Boolean);
        for (const chunk of chunks) {
          try {
            const data = JSON.parse(chunk);
            if (data.total && data.completed) {
              setProgress(Math.round((data.completed / data.total) * 100));
            }
          } catch(e) {}
        }
      }
      
      setStatus('connected');
      setLocalAIReady(true);
      setAiProvider('ollama'); // Auto-switch context
      return true;
    } catch (err) {
      console.error('Model pull failed:', err);
      setStatus('error');
      setErrorMsg('Failed to download model. You may need to run: ollama pull ' + model);
      return false;
    }
  };

  const runLocalAI = async (prompt) => {
    try {
      const res = await fetch(`${endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          prompt: prompt,
          stream: false
        })
      });
      
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      return data.response;
    } catch (err) {
      console.error('runLocalAI Error:', err);
      return 'Error: Could not connect to local AI.';
    }
  };

  return { status, progress, errorMsg, checkOllama, openInstallPage, pullModel, runLocalAI, setStatus };
}

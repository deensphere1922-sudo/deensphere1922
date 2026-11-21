// // // // // export default async function handler(req, res) {
// // // // //   if (req.method !== 'POST') {
// // // // //     return res.status(405).json({ error: 'Method not allowed' });
// // // // //   }

// // // // //   const { messages, systemPrompt, webContext } = req.body || {};
// // // // //   if (!Array.isArray(messages)) {
// // // // //     return res.status(400).json({ error: 'Missing messages' });
// // // // //   }

// // // // //   const GROQ_KEY = process.env.GROQ_API_KEY;
// // // // //   if (!GROQ_KEY) return res.status(500).json({ error: 'GROQ_API_KEY missing' });

// // // // //   try {
// // // // //     const groqResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
// // // // //       method: 'POST',
// // // // //       headers: {
// // // // //         'Content-Type': 'application/json',
// // // // //         'Authorization': 'Bearer ' + GROQ_KEY
// // // // //       },
// // // // //       body: JSON.stringify({
// // // // //         model: 'openai/gpt-oss-120b', 
// // // // //         temperature: 0.1,
// // // // //         max_tokens: 8192,
// // // // //         messages: [
// // // // //           { role: 'system', content: systemPrompt || '' },
// // // // //           // This line gives the AI the live web search results
// // // // //           { role: 'system', content: 'LIVE WEB SEARCH RESULTS (Use these links to answer):\n' + (webContext || 'No web results found. You must answer from your own knowledge.') },
// // // // //           ...messages
// // // // //         ]
// // // // //       })
// // // // //     });
    
// // // // //     const data = await groqResp.json();
    
// // // // //     if (data.error) {
// // // // //       return res.status(400).json({ error: data.error.message });
// // // // //     }

// // // // //     return res.status(200).json(data);
// // // // //   } catch (e) {
// // // // //     return res.status(500).json({ error: e.message });
// // // // //   }
// // // // // }

// // // // export default async function handler(req, res) {
// // // //   if (req.method !== 'POST') {
// // // //     return res.status(405).json({ error: 'Method not allowed' });
// // // //   }

// // // //   const { messages, systemPrompt, webContext } = req.body || {};
// // // //   if (!Array.isArray(messages)) {
// // // //     return res.status(400).json({ error: 'Missing messages' });
// // // //   }

// // // //   const GROQ_KEY = process.env.GROQ_API_KEY;
// // // //   if (!GROQ_KEY) return res.status(500).json({ error: 'GROQ_API_KEY missing' });

// // // //   try {
// // // //     const groqResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
// // // //       method: 'POST',
// // // //       headers: {
// // // //         'Content-Type': 'application/json',
// // // //         'Authorization': 'Bearer ' + GROQ_KEY
// // // //       },
// // // //       body: JSON.stringify({
// // // //         model: 'openai/gpt-oss-120b', 
// // // //         temperature: 0.1,
// // // //         max_tokens: 8192,
// // // //         messages: [
// // // //           { role: 'system', content: systemPrompt || '' },
// // // //           // This feeds the live links to the AI
// // // //           { role: 'system', content: 'LIVE WEB SEARCH RESULTS:\n' + (webContext || 'No web results found.') },
// // // //           ...messages
// // // //         ]
// // // //       })
// // // //     });
    
// // // //     const data = await groqResp.json();
    
// // // //     if (data.error) {
// // // //       return res.status(400).json({ error: data.error.message });
// // // //     }

// // // //     return res.status(200).json(data);
// // // //   } catch (e) {
// // // //     return res.status(500).json({ error: e.message });
// // // //   }
// // // // }

// // // // export default async function handler(req, res) {
// // // //   if (req.method !== 'POST') {
// // // //     return res.status(405).json({ error: 'Method not allowed' });
// // // //   }

// // // //   const { messages, systemPrompt, webContext } = req.body || {};
// // // //   if (!Array.isArray(messages)) {
// // // //     return res.status(400).json({ error: 'Missing messages' });
// // // //   }

// // // //   const GROQ_KEY = process.env.GROQ_API_KEY;
// // // //   if (!GROQ_KEY) return res.status(500).json({ error: 'GROQ_API_KEY missing' });

// // // //   try {
// // // //     const groqResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
// // // //       method: 'POST',
// // // //       headers: {
// // // //         'Content-Type': 'application/json',
// // // //         'Authorization': 'Bearer ' + GROQ_KEY
// // // //       },
// // // //       body: JSON.stringify({
// // // //         model: 'openai/gpt-oss-120b', 
// // // //         temperature: 0.1,
// // // //         max_tokens: 8192,
// // // //         messages: [
// // // //           { role: 'system', content: systemPrompt || '' },
// // // //           // This line gives the AI the live web search results
// // // //           { role: 'system', content: 'LIVE WEB SEARCH RESULTS (Use these links to answer):\n' + (webContext || 'No web results found. You must answer from your own knowledge.') },
// // // //           ...messages
// // // //         ]
// // // //       })
// // // //     });
    
// // // //     const data = await groqResp.json();
    
// // // //     if (data.error) {
// // // //       return res.status(400).json({ error: data.error.message });
// // // //     }

// // // //     return res.status(200).json(data);
// // // //   } catch (e) {
// // // //     return res.status(500).json({ error: e.message });
// // // //   }
// // // // }

// // // export default async function handler(req, res) {
// // //   if (req.method !== 'POST') {
// // //     return res.status(405).json({ error: 'Method not allowed' });
// // //   }

// // //   const { action, audio, mimeType, messages, systemPrompt, webContext } = req.body || {};
// // //   const GROQ_KEY = process.env.GROQ_API_KEY;

// // //   if (action === 'transcribe') {
// // //     if (!GROQ_KEY) return res.status(500).json({ error: 'GROQ_API_KEY missing' });
// // //     const supportedAudioTypes = {
// // //       'audio/webm': 'webm',
// // //       'audio/mp4': 'mp4',
// // //       'audio/ogg': 'ogg',
// // //       'audio/wav': 'wav',
// // //       'audio/mpeg': 'mp3',
// // //       'audio/mp3': 'mp3',
// // //       'audio/x-m4a': 'm4a'
// // //     };
// // //     const audioType = typeof mimeType === 'string' ? mimeType.split(';')[0].toLowerCase() : '';
// // //     if (typeof audio !== 'string' || !audio || audio.length > 3000000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(audio)) {
// // //       return res.status(400).json({ error: 'Invalid or oversized audio recording.' });
// // //     }
// // //     if (!supportedAudioTypes[audioType]) {
// // //       return res.status(400).json({ error: 'Unsupported audio format.' });
// // //     }

// // //     try {
// // //       const formData = new FormData();
// // //       formData.append(
// // //         'file',
// // //         new Blob([Buffer.from(audio, 'base64')], { type: audioType }),
// // //         `voice-message.${supportedAudioTypes[audioType]}`
// // //       );
// // //       formData.append('model', 'whisper-large-v3-turbo');
// // //       const transcriptionResp = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
// // //         method: 'POST',
// // //         headers: { 'Authorization': 'Bearer ' + GROQ_KEY },
// // //         body: formData
// // //       });
// // //       const transcription = await transcriptionResp.json();
// // //       if (!transcriptionResp.ok || transcription.error) {
// // //         return res.status(transcriptionResp.status === 429 ? 429 : 502).json({
// // //           error: transcription.error?.message || 'Speech transcription failed.'
// // //         });
// // //       }
// // //       return res.status(200).json({ text: transcription.text || '' });
// // //     } catch (e) {
// // //       return res.status(500).json({ error: e.message || 'Speech transcription failed.' });
// // //     }
// // //   }

// // //   if (!Array.isArray(messages)) {
// // //     return res.status(400).json({ error: 'Missing messages' });
// // //   }
// // //   if (!GROQ_KEY) return res.status(500).json({ error: 'GROQ_API_KEY missing' });

// // //   try {
// // //     const containsImage = messages.some(message =>
// // //       Array.isArray(message.content) &&
// // //       message.content.some(part => part && part.type === 'image_url')
// // //     );
// // //     const groqResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
// // //       method: 'POST',
// // //       headers: {
// // //         'Content-Type': 'application/json',
// // //         'Authorization': 'Bearer ' + GROQ_KEY
// // //       },
// // //       body: JSON.stringify({
// // //         model: containsImage ? 'qwen/qwen3.8-27b' : 'openai/gpt-oss-120b',
// // //         temperature: 0.1,
// // //         max_tokens: 8192,
// // //         messages: [
// // //           { role: 'system', content: systemPrompt || '' },
// // //           // This feeds the live links to the AI
// // //           { role: 'system', content: 'LIVE WEB SEARCH RESULTS:\n' + (webContext || 'No web results found.') },
// // //           ...messages
// // //         ]
// // //       })
// // //     });
    
// // //     const data = await groqResp.json();
    
// // //     if (data.error) {
// // //       return res.status(400).json({ error: data.error.message });
// // //     }

// // //     return res.status(200).json(data);
// // //   } catch (e) {
// // //     return res.status(500).json({ error: e.message });
// // //   }
// // // }


// // // export default async function handler(req, res) {
// // //   if (req.method !== 'POST') {
// // //     return res.status(405).json({ error: 'Method not allowed' });
// // //   }

// // //   const { messages, systemPrompt, webContext } = req.body || {};
// // //   if (!Array.isArray(messages)) {
// // //     return res.status(400).json({ error: 'Missing messages' });
// // //   }

// // //   const GROQ_KEY = process.env.GROQ_API_KEY;
// // //   if (!GROQ_KEY) return res.status(500).json({ error: 'GROQ_API_KEY missing' });

// // //   try {
// // //     const groqResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
// // //       method: 'POST',
// // //       headers: {
// // //         'Content-Type': 'application/json',
// // //         'Authorization': 'Bearer ' + GROQ_KEY
// // //       },
// // //       body: JSON.stringify({
// // //         model: 'openai/gpt-oss-120b', 
// // //         temperature: 0.1,
// // //         max_tokens: 8192,
// // //         messages: [
// // //           { role: 'system', content: systemPrompt || '' },
// // //           // This line gives the AI the live web search results
// // //           { role: 'system', content: 'LIVE WEB SEARCH RESULTS (Use these links to answer):\n' + (webContext || 'No web results found. You must answer from your own knowledge.') },
// // //           ...messages
// // //         ]
// // //       })
// // //     });
    
// // //     const data = await groqResp.json();
    
// // //     if (data.error) {
// // //       return res.status(400).json({ error: data.error.message });
// // //     }

// // //     return res.status(200).json(data);
// // //   } catch (e) {
// // //     return res.status(500).json({ error: e.message });
// // //   }
// // // }

// // export default async function handler(req, res) {
// //   if (req.method !== 'POST') {
// //     return res.status(405).json({ error: 'Method not allowed' });
// //   }

// //   const { action, audio, mimeType, messages, systemPrompt, webContext } = req.body || {};
// //   const GROQ_KEY = process.env.GROQ_API_KEY;

// //   if (action === 'transcribe') {
// //     if (!GROQ_KEY) return res.status(500).json({ error: 'GROQ_API_KEY missing' });
// //     const supportedAudioTypes = {
// //       'audio/webm': 'webm',
// //       'audio/mp4': 'mp4',
// //       'audio/ogg': 'ogg',
// //       'audio/wav': 'wav',
// //       'audio/mpeg': 'mp3',
// //       'audio/mp3': 'mp3',
// //       'audio/x-m4a': 'm4a'
// //     };
// //     const audioType = typeof mimeType === 'string' ? mimeType.split(';')[0].toLowerCase() : '';
// //     if (typeof audio !== 'string' || !audio || audio.length > 3000000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(audio)) {
// //       return res.status(400).json({ error: 'Invalid or oversized audio recording.' });
// //     }
// //     if (!supportedAudioTypes[audioType]) {
// //       return res.status(400).json({ error: 'Unsupported audio format.' });
// //     }

// //     try {
// //       const formData = new FormData();
// //       formData.append(
// //         'file',
// //         new Blob([Buffer.from(audio, 'base64')], { type: audioType }),
// //         `voice-message.${supportedAudioTypes[audioType]}`
// //       );
// //       formData.append('model', 'whisper-large-v3-turbo');
// //       const transcriptionResp = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
// //         method: 'POST',
// //         headers: { 'Authorization': 'Bearer ' + GROQ_KEY },
// //         body: formData
// //       });
// //       const transcription = await transcriptionResp.json();
// //       if (!transcriptionResp.ok || transcription.error) {
// //         return res.status(transcriptionResp.status === 429 ? 429 : 502).json({
// //           error: transcription.error?.message || 'Speech transcription failed.'
// //         });
// //       }
// //       return res.status(200).json({ text: transcription.text || '' });
// //     } catch (e) {
// //       return res.status(500).json({ error: e.message || 'Speech transcription failed.' });
// //     }
// //   }

// //   if (!Array.isArray(messages)) {
// //     return res.status(400).json({ error: 'Missing messages' });
// //   }
// //   if (!GROQ_KEY) return res.status(500).json({ error: 'GROQ_API_KEY missing' });

// //   try {
// //     const containsImage = messages.some(message =>
// //       Array.isArray(message.content) &&
// //       message.content.some(part => part && part.type === 'image_url')
// //     );
// //     const groqResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
// //       method: 'POST',
// //       headers: {
// //         'Content-Type': 'application/json',
// //         'Authorization': 'Bearer ' + GROQ_KEY
// //       },
// //       body: JSON.stringify({
// //         model: containsImage ? 'qwen/qwen3.8-27b' : 'openai/gpt-oss-120b',
// //         temperature: 0.1,
// //         max_tokens: 8192,
// //         messages: [
// //           { role: 'system', content: systemPrompt || '' },
// //           // This feeds the live links to the AI
// //           { role: 'system', content: 'LIVE WEB SEARCH RESULTS:\n' + (webContext || 'No web results found.') },
// //           ...messages
// //         ]
// //       })
// //     });
    
// //     const data = await groqResp.json();
    
// //     if (data.error) {
// //       return res.status(400).json({ error: data.error.message });
// //     }

// //     return res.status(200).json(data);
// //   } catch (e) {
// //     return res.status(500).json({ error: e.message });
// //   }
// // }

// // export default async function handler(req, res) {
// //   if (req.method !== 'POST') {
// //     return res.status(405).json({ error: 'Method not allowed' });
// //   }

// //   const { messages, systemPrompt, webContext } = req.body || {};
// //   if (!Array.isArray(messages)) {
// //     return res.status(400).json({ error: 'Missing messages' });
// //   }

// //   const GROQ_KEY = process.env.GROQ_API_KEY;
// //   if (!GROQ_KEY) return res.status(500).json({ error: 'GROQ_API_KEY missing' });

// //   try {
// //     const groqResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
// //       method: 'POST',
// //       headers: {
// //         'Content-Type': 'application/json',
// //         'Authorization': 'Bearer ' + GROQ_KEY
// //       },
// //       body: JSON.stringify({
// //         model: 'openai/gpt-oss-120b', 
// //         temperature: 0.1,
// //         max_tokens: 8192,
// //         messages: [
// //           { role: 'system', content: systemPrompt || '' },
// //           // This line gives the AI the live web search results
// //           { role: 'system', content: 'LIVE WEB SEARCH RESULTS (Use these links to answer):\n' + (webContext || 'No web results found. You must answer from your own knowledge.') },
// //           ...messages
// //         ]
// //       })
// //     });
    
// //     const data = await groqResp.json();
    
// //     if (data.error) {
// //       return res.status(400).json({ error: data.error.message });
// //     }

// //     return res.status(200).json(data);
// //   } catch (e) {
// //     return res.status(500).json({ error: e.message });
// //   }
// // }

// export default async function handler(req, res) {
//   if (req.method !== 'POST') {
//     return res.status(405).json({ error: 'Method not allowed' });
//   }

//   const { action, audio, mimeType, messages, systemPrompt, webContext } = req.body || {};
//   const GROQ_KEY = process.env.GROQ_API_KEY;

//   if (action === 'transcribe') {
//     if (!GROQ_KEY) return res.status(500).json({ error: 'GROQ_API_KEY missing' });
//     const supportedAudioTypes = {
//       'audio/webm': 'webm',
//       'audio/mp4': 'mp4',
//       'audio/ogg': 'ogg',
//       'audio/wav': 'wav',
//       'audio/mpeg': 'mp3',
//       'audio/mp3': 'mp3',
//       'audio/x-m4a': 'm4a'
//     };
//     const audioType = typeof mimeType === 'string' ? mimeType.split(';')[0].toLowerCase() : '';
//     if (typeof audio !== 'string' || !audio || audio.length > 3000000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(audio)) {
//       return res.status(400).json({ error: 'Invalid or oversized audio recording.' });
//     }
//     if (!supportedAudioTypes[audioType]) {
//       return res.status(400).json({ error: 'Unsupported audio format.' });
//     }

//     try {
//       const formData = new FormData();
//       formData.append(
//         'file',
//         new Blob([Buffer.from(audio, 'base64')], { type: audioType }),
//         `voice-message.${supportedAudioTypes[audioType]}`
//       );
//       formData.append('model', 'whisper-large-v3-turbo');
//       const transcriptionResp = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
//         method: 'POST',
//         headers: { 'Authorization': 'Bearer ' + GROQ_KEY },
//         body: formData
//       });
//       const transcription = await transcriptionResp.json();
//       if (!transcriptionResp.ok || transcription.error) {
//         return res.status(transcriptionResp.status === 429 ? 429 : 502).json({
//           error: transcription.error?.message || 'Speech transcription failed.'
//         });
//       }
//       return res.status(200).json({ text: transcription.text || '' });
//     } catch (e) {
//       return res.status(500).json({ error: e.message || 'Speech transcription failed.' });
//     }
//   }

//   if (!Array.isArray(messages)) {
//     return res.status(400).json({ error: 'Missing messages' });
//   }
//   if (!GROQ_KEY) return res.status(500).json({ error: 'GROQ_API_KEY missing' });

//   try {
//     const containsImage = messages.some(message =>
//       Array.isArray(message.content) &&
//       message.content.some(part => part && part.type === 'image_url')
//     );
//     const groqResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'Authorization': 'Bearer ' + GROQ_KEY
//       },
//       body: JSON.stringify({
//         model: containsImage ? 'qwen/qwen3.8-27b' : 'openai/gpt-oss-120b',
//         temperature: 0.1,
//         max_tokens: 8192,
//         messages: [
//           { role: 'system', content: systemPrompt || '' },
//           // This feeds the live links to the AI
//           { role: 'system', content: 'LIVE WEB SEARCH RESULTS:\n' + (webContext || 'No web results found.') },
//           ...messages
//         ]
//       })
//     });
    
//     const data = await groqResp.json();

//     if (!groqResp.ok || data.error) {
//       const message = typeof data.error === 'string'
//         ? data.error
//         : data.error?.message || 'The AI service could not complete this request.';
//       const retryAfter = groqResp.headers.get('retry-after');
//       if (retryAfter) res.setHeader('Retry-After', retryAfter);
//       return res.status(groqResp.status === 429 ? 429 : groqResp.ok ? 400 : 502).json({
//         error: message,
//         retryAfter: retryAfter || null
//       });
//     }

//     return res.status(200).json(data);
//   } catch (e) {
//     return res.status(500).json({ error: e.message });
//   }
// }


// export default async function handler(req, res) {
//   if (req.method !== 'POST') {
//     return res.status(405).json({ error: 'Method not allowed' });
//   }

//   const { messages, systemPrompt, webContext } = req.body || {};
//   if (!Array.isArray(messages)) {
//     return res.status(400).json({ error: 'Missing messages' });
//   }

//   const GROQ_KEY = process.env.GROQ_API_KEY;
//   if (!GROQ_KEY) return res.status(500).json({ error: 'GROQ_API_KEY missing' });

//   try {
//     const groqResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'Authorization': 'Bearer ' + GROQ_KEY
//       },
//       body: JSON.stringify({
//         model: 'openai/gpt-oss-120b', 
//         temperature: 0.1,
//         max_tokens: 8192,
//         messages: [
//           { role: 'system', content: systemPrompt || '' },
//           // This line gives the AI the live web search results
//           { role: 'system', content: 'LIVE WEB SEARCH RESULTS (Use these links to answer):\n' + (webContext || 'No web results found. You must answer from your own knowledge.') },
//           ...messages
//         ]
//       })
//     });
    
//     const data = await groqResp.json();
    
//     if (data.error) {
//       return res.status(400).json({ error: data.error.message });
//     }

//     return res.status(200).json(data);
//   } catch (e) {
//     return res.status(500).json({ error: e.message });
//   }
// }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, audio, mimeType, messages, systemPrompt, webContext } = req.body || {};
  const GROQ_KEY = process.env.GROQ_API_KEY;

  if (action === 'transcribe') {
    if (!GROQ_KEY) return res.status(500).json({ error: 'GROQ_API_KEY missing' });
    const supportedAudioTypes = {
      'audio/webm': 'webm',
      'audio/mp4': 'mp4',
      'audio/ogg': 'ogg',
      'audio/wav': 'wav',
      'audio/mpeg': 'mp3',
      'audio/mp3': 'mp3',
      'audio/x-m4a': 'm4a'
    };
    const audioType = typeof mimeType === 'string' ? mimeType.split(';')[0].toLowerCase() : '';
    if (typeof audio !== 'string' || !audio || audio.length > 3000000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(audio)) {
      return res.status(400).json({ error: 'Invalid or oversized audio recording.' });
    }
    if (!supportedAudioTypes[audioType]) {
      return res.status(400).json({ error: 'Unsupported audio format.' });
    }

    try {
      const formData = new FormData();
      formData.append(
        'file',
        new Blob([Buffer.from(audio, 'base64')], { type: audioType }),
        `voice-message.${supportedAudioTypes[audioType]}`
      );
      formData.append('model', 'whisper-large-v3-turbo');
      const transcriptionResp = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + GROQ_KEY },
        body: formData
      });
      const transcription = await transcriptionResp.json();
      if (!transcriptionResp.ok || transcription.error) {
        return res.status(transcriptionResp.status === 429 ? 429 : 502).json({
          error: transcription.error?.message || 'Speech transcription failed.'
        });
      }
      return res.status(200).json({ text: transcription.text || '' });
    } catch (e) {
      return res.status(500).json({ error: e.message || 'Speech transcription failed.' });
    }
  }

  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: 'Missing messages' });
  }
  if (!GROQ_KEY) return res.status(500).json({ error: 'GROQ_API_KEY missing' });

  try {
    const containsImage = messages.some(message =>
      Array.isArray(message.content) &&
      message.content.some(part => part && part.type === 'image_url')
    );
    const groqResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + GROQ_KEY
      },
      body: JSON.stringify({
        model: containsImage ? 'qwen/qwen3.8-27b' : 'openai/gpt-oss-120b',
        temperature: 0.1,
        max_tokens: 8192,
        messages: [
          { role: 'system', content: systemPrompt || '' },
          // This feeds the live links to the AI
          { role: 'system', content: 'LIVE WEB SEARCH RESULTS:\n' + (webContext || 'No web results found.') },
          ...messages
        ]
      })
    });
    
    const data = await groqResp.json();

    if (!groqResp.ok || data.error) {
      const message = typeof data.error === 'string'
        ? data.error
        : data.error?.message || 'The AI service could not complete this request.';
      const retryAfter = groqResp.headers.get('retry-after');
      if (retryAfter) res.setHeader('Retry-After', retryAfter);
      return res.status(groqResp.status === 429 ? 429 : groqResp.ok ? 400 : 502).json({
        error: message,
        retryAfter: retryAfter || null
      });
    }

    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

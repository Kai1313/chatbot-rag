'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Building2, Search, FileText, RefreshCw, Sparkles, FolderArchive, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  { label: 'Syarat PBG Rumah Tinggal', icon: Building2, text: 'Apa saja dokumen persyaratan pengurusan PBG Rumah Tinggal Sederhana?' },
  { label: 'Cek Status No. 108564', icon: Search, text: 'Cek status permohonan PBG dengan nomor berkas 108564' },
  { label: 'Buka Dokumen No. 6680', icon: FolderArchive, text: 'Tampilkan berkas dan dokumen untuk nomor permohonan 6680' },
  { label: 'PBG Usaha Mikro', icon: FileText, text: 'Bagaimana prosedur dan syarat PBG Non Rumah Tinggal Usaha Mikro?' },
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Selamat datang di **PBG Assist**! 👋\n\nSaya adalah asisten AI resmi untuk Layanan Persetujuan Bangunan Gedung (PBG).\n\nAda yang bisa saya bantu hari ini?\n* **Tanyakan Persyaratan:** Dokumen PBG Rumah Tinggal, Usaha Mikro, Gedung, dll.\n* **Cek Status Permohonan:** Masukkan nomor berkas registrasi Anda (contoh: *108564* atau *6680*).\n* **Buka Brangkas Dokumen:** Lihat dan unduh lampiran/berkas (contoh: *Tampilkan dokumen berkas 6680*).\n* 🎙️ **Ketik atau Bicara:** Anda bisa berbicara langsung menggunakan tombol mikrofon!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [lastSpokenId, setLastSpokenId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const voiceInitializedRef = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Clean Markdown syntax before sending to Text-to-Speech synthesizer
  const cleanForSpeech = (text: string): string => {
    return text
      .replace(/#{1,6}\s*/g, '')
      .replace(/[*_]{1,3}/g, '')
      .replace(/^\s*[-+•]\s+/gm, '')
      .replace(/^\s*\d+[.)\s]+/gm, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/`+/g, '')
      .replace(/^[-*_]{3,}$/gm, '')
      .replace(/^>\s*/gm, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/  +/g, ' ')
      .trim();
  };

  // Prime speech engine for mobile iOS/Android browsers on user interaction
  const initVoice = useCallback(() => {
    if (!voiceInitializedRef.current && typeof window !== 'undefined' && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(' ');
      utterance.volume = 0.01;
      utterance.rate = 10;
      window.speechSynthesis.speak(utterance);
      window.speechSynthesis.getVoices();
      voiceInitializedRef.current = true;
    }
  }, []);

  // Find the best Indonesian speech voice
  const getBestVoice = (): SpeechSynthesisVoice | null => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    return (
      voices.find(v => v.lang === 'id-ID') ||
      voices.find(v => v.lang.startsWith('id')) ||
      voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('samantha')) ||
      voices.find(v => v.lang.startsWith('en')) ||
      null
    );
  };

  // Speech Recognition (STT / Voice Input) Setup
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'id-ID';

        recognition.onresult = (event: any) => {
          let transcript = '';
          for (let i = 0; i < event.results.length; ++i) {
            transcript += event.results[i][0].transcript;
          }
          if (transcript) {
            setInput(transcript);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition error:', event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleListening = () => {
    initVoice();
    if (!recognitionRef.current) {
      alert('Browser Anda belum mendukung fitur pengenalan suara (Speech Recognition).');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Error starting recognition:', err);
      }
    }
  };

  // Text-to-Speech (TTS / Voice Output) Player
  useEffect(() => {
    if (!loading && voiceEnabled && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === 'assistant' && lastMsg.content && lastMsg.id !== lastSpokenId && lastMsg.id !== 'welcome') {
        setLastSpokenId(lastMsg.id);

        if (typeof window === 'undefined' || !window.speechSynthesis) return;

        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
        }

        const speak = () => {
          const cleaned = cleanForSpeech(lastMsg.content);
          if (!cleaned) return;

          const utterance = new SpeechSynthesisUtterance(cleaned);
          utterance.lang = 'id-ID';
          utterance.rate = 0.95;
          utterance.pitch = 1.05;
          utterance.volume = 1;

          const bestVoice = getBestVoice();
          if (bestVoice) utterance.voice = bestVoice;

          window.speechSynthesis.speak(utterance);
        };

        if (window.speechSynthesis.getVoices().length > 0) {
          speak();
        } else {
          window.speechSynthesis.onvoiceschanged = () => {
            speak();
            window.speechSynthesis.onvoiceschanged = null;
          };
        }
      }
    }
  }, [loading, messages, voiceEnabled, lastSpokenId]);

  // Cancel speech immediately if user mutes voice
  useEffect(() => {
    if (!voiceEnabled && typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, [voiceEnabled]);

  const handleSend = async (textToSend?: string) => {
    initVoice();
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      // Derive API host from browser window URL on port 8080
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      const apiUrl = `http://${currentHost}:8080`;

      console.log(`Sending chat request to: ${apiUrl}/api/chat`);

      const res = await fetch(`${apiUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          history: messages.map(m => ({ role: m.role, content: m.content }))
        })
      });

      if (!res.ok) {
        throw new Error(`Gagal terhubung ke server (${res.status})`);
      }

      const data = await res.json();
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply || 'Mohon maaf, tidak ada tanggapan dari sistem.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '⚠️ Mohon maaf, terjadi kendala saat menghubungkan ke server PBG Assist. Pastikan koneksi backend aktif.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const renderFormattedText = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      let processed = line;

      // Handle Markdown Links [Text](url)
      const linkRegex = /\[(.*?)\]\((.*?)\)/g;
      const parts = [];
      let lastIndex = 0;
      let match;

      while ((match = linkRegex.exec(processed)) !== null) {
        if (match.index > lastIndex) {
          parts.push(processed.substring(lastIndex, match.index));
        }
        const linkText = match[1];
        const linkHref = match[2];
        parts.push(
          <a
            key={`link-${idx}-${match.index}`}
            href={linkHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-400 hover:text-sky-300 underline font-medium hover:underline inline-flex items-center gap-1"
          >
            <span>{linkText}</span>
            <span className="text-[10px] opacity-75">↗</span>
          </a>
        );
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < processed.length) {
        parts.push(processed.substring(lastIndex));
      }

      // Handle Bold & Italic
      const renderedParts = parts.map((part, pIdx) => {
        if (typeof part !== 'string') return part;

        const subParts = part.split(/(\*\*.*?\*\*|\*.*?\*)/g);
        return subParts.map((sub, sIdx) => {
          if (sub.startsWith('**') && sub.endsWith('**')) {
            return <strong key={`b-${pIdx}-${sIdx}`} className="font-semibold text-sky-200">{sub.slice(2, -2)}</strong>;
          }
          if (sub.startsWith('*') && sub.endsWith('*')) {
            return <em key={`i-${pIdx}-${sIdx}`} className="text-slate-300">{sub.slice(1, -1)}</em>;
          }
          return sub;
        });
      });

      if (line.startsWith('### ')) {
        return <h3 key={idx} className="text-base font-bold text-sky-300 mt-3 mb-1">{renderedParts}</h3>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={idx} className="text-lg font-bold text-sky-400 mt-4 mb-2">{renderedParts}</h2>;
      }
      if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
        return (
          <div key={idx} className="flex items-start gap-2 my-1 pl-2 text-slate-200">
            <span className="text-sky-400 mt-1">•</span>
            <span>{renderedParts}</span>
          </div>
        );
      }
      if (line.trim() === '') {
        return <div key={idx} className="h-2" />;
      }

      return <p key={idx} className="my-0.5 text-slate-200 leading-relaxed">{renderedParts}</p>;
    });
  };

  return (
    <div className="flex flex-col h-full max-w-md mx-auto w-full bg-slate-900 shadow-2xl relative border-x border-slate-800">
      
      {/* Top Mobile Header */}
      <header className="px-4 py-3 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-slate-100 text-sm leading-tight flex items-center gap-1.5">
              PBG Assist
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">Asisten Suara & Izin Bangunan</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Voice Mute/Unmute Toggle */}
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`p-2 rounded-lg transition-colors ${
              voiceEnabled
                ? 'bg-sky-500/20 text-sky-400 hover:bg-sky-500/30'
                : 'bg-slate-800/80 text-slate-500 hover:text-slate-300'
            }`}
            title={voiceEnabled ? 'Suara Aktif (Klik untuk Mute)' : 'Suara Mati (Klik untuk Bunyikan)'}
          >
            {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Reset Conversation */}
          <button
            onClick={() => {
              if (typeof window !== 'undefined' && window.speechSynthesis) {
                window.speechSynthesis.cancel();
              }
              setMessages([messages[0]]);
            }}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title="Reset Percakapan"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Chat Messages Container */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} space-y-1`}
          >
            <div
              className={`max-w-[88%] rounded-2xl px-4 py-3 text-xs sm:text-sm shadow-md ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-sky-600 to-cyan-600 text-white rounded-br-none'
                  : 'bg-slate-800/90 border border-slate-700/60 text-slate-100 rounded-bl-none'
              }`}
            >
              {msg.role === 'assistant' ? renderFormattedText(msg.content) : msg.content}
            </div>
            <span className="text-[10px] text-slate-500 px-1 font-medium">{msg.timestamp}</span>
          </div>
        ))}

        {loading && (
          <div className="flex flex-col items-start space-y-1">
            <div className="bg-slate-800/90 border border-slate-700/60 rounded-2xl rounded-bl-none px-4 py-3 text-xs text-slate-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-400 animate-spin" />
              <span>PBG Assist sedang berpikir...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Quick Suggestion Pills */}
      {messages.length <= 2 && (
        <div className="px-3 py-2 overflow-x-auto flex items-center gap-2 border-t border-slate-800/60 bg-slate-950/60 no-scrollbar">
          {QUICK_PROMPTS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                onClick={() => handleSend(item.text)}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 text-[11px] text-slate-300 transition-all hover:border-sky-500/50 active:scale-95"
              >
                <Icon className="w-3.5 h-3.5 text-sky-400" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Sticky Bottom Input Bar with Microphone STT */}
      <footer className="p-3 bg-slate-900 border-t border-slate-800 sticky bottom-0 z-20">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          {/* Microphone Voice Input Button */}
          <button
            type="button"
            onClick={toggleListening}
            className={`p-2.5 rounded-xl border transition-all active:scale-95 flex items-center justify-center ${
              isListening
                ? 'bg-rose-600 border-rose-500 text-white animate-pulse shadow-lg shadow-rose-600/40'
                : 'bg-slate-800/90 border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-sky-400'
            }`}
            title={isListening ? 'Mendengarkan suara Anda... (Klik untuk berhenti)' : 'Klik untuk bicara (Voice Input)'}
          >
            {isListening ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4" />}
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isListening ? 'Sedang mendengarkan suara Anda...' : 'Ketik atau gunakan mikrofon...'}
            className={`flex-1 bg-slate-950 border rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 transition-all ${
              isListening
                ? 'border-rose-500/80 focus:ring-rose-500 text-rose-200'
                : 'border-slate-700/80 focus:border-sky-500 focus:ring-sky-500'
            }`}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shadow-md shadow-sky-600/30"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </footer>

    </div>
  );
}

'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Building2, Search, FileText, RefreshCw, Sparkles, CheckCircle2, AlertCircle, Info } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  { label: 'Syarat PBG Rumah Tinggal', icon: Building2, text: 'Apa saja dokumen persyaratan pengurusan PBG Rumah Tinggal Sederhana?' },
  { label: 'Cek Status No. 6680', icon: Search, text: 'Cek status permohonan PBG dengan nomor berkas 6680' },
  { label: 'PBG Usaha Mikro', icon: FileText, text: 'Bagaimana prosedur dan syarat PBG Non Rumah Tinggal Usaha Mikro?' },
  { label: 'PBG Menara Telecom', icon: Sparkles, text: 'Persyaratan PBG Menara Telekomunikasi apa saja?' },
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Selamat datang di **PBG Assist**! 👋\n\nSaya adalah asisten AI resmi untuk Layanan Persetujuan Bangunan Gedung (PBG).\n\nAda yang bisa saya bantu hari ini?\n* **Tanyakan Persyaratan:** Dokumen PBG Rumah Tinggal, Usaha Mikro, Gedung, dll.\n* **Cek Status Permohonan:** Masukkan nomor berkas registrasi Anda (contoh: *6680*).`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
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
      // Always derive API host from browser window URL on port 8080 (e.g. 192.168.1.13:8080 or localhost:8080)
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

      const parts = processed.split(/(\*\*.*?\*\*|\*.*?\*)/g);
      const renderedParts = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={pIdx} className="font-semibold text-sky-200">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('*') && part.endsWith('*')) {
          return <em key={pIdx} className="text-slate-300">{part.slice(1, -1)}</em>;
        }
        return part;
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
            <p className="text-[11px] text-slate-400 font-medium">Asisten Layanan Izin Bangunan</p>
          </div>
        </div>

        <button
          onClick={() => setMessages([messages[0]])}
          className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          title="Reset Percakapan"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
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

      {/* Sticky Bottom Input Bar */}
      <footer className="p-3 bg-slate-900 border-t border-slate-800 sticky bottom-0 z-20">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tanyakan syarat atau masukkan no. berkas..."
            className="flex-1 bg-slate-950 border border-slate-700/80 focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all"
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

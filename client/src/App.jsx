import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Send, Sparkles, MapPin, Leaf, GraduationCap, Landmark, Plus,
  MessageCircle, LoaderCircle, Menu, X, Copy, Check, Globe2
} from "lucide-react";
import "./App.css";

const copy = {
  en: {
    newChat: "New conversation", explore: "EXPLORE MALAWI",
    agriculture: "Agriculture", education: "Education", geography: "Geography", economy: "Economy",
    status: "Malawi-focused assistant", powered: "Powered by an open-weight AI model.",
    language: "Language", country: "Malawi", welcomeTag: "YOUR MALAWI AI ASSISTANT",
    greeting: "Moni, Malawi.", welcomeTitle: "What would you like to know?",
    intro: "Explore Malawi, learn about our communities, discover opportunities and get answers with a local context.",
    questions: [
      "What are the main agricultural activities in Malawi?",
      "Explain the education system in Malawi.",
      "Tell me about the three regions of Malawi.",
      "What are some important sectors of Malawi's economy?"
    ],
    ask: "Ask NyasaExploler anything about Malawi...",
    disclaimer: "NyasaExploler can make mistakes. Verify important information with trusted sources.",
    thinking: "NyasaExploler is thinking...", you: "You", copy: "Copy", copied: "Copied",
    error: "Sorry, I couldn't complete that request."
  },
  ny: {
    newChat: "Kukambirana kwatsopano", explore: "DZIWANI ZA MALAŴI",
    agriculture: "Zaulimi", education: "Maphunziro", geography: "Madera", economy: "Chuma",
    status: "Wothandizira wokhudza Malaŵi", powered: "Akugwiritsa ntchito mtundu wa AI wotseguka.",
    language: "Chiyankhulo", country: "Malaŵi", welcomeTag: "WOTHANDIZIRA WANU WA AI WA MALAŴI",
    greeting: "Moni, Malaŵi.", welcomeTitle: "Mukufuna kudziwa chiyani?",
    intro: "Dziwani zambiri za Malaŵi, madera athu, mwayi womwe ulipo, komanso mayankho ogwirizana ndi moyo wathu.",
    questions: [
      "Kodi ntchito zazikulu zaulimi ku Malaŵi ndi ziti?",
      "Fotokozani mmene maphunziro amachitikira ku Malaŵi.",
      "Tiuzeni za zigawo zitatu za Malaŵi.",
      "Kodi ndi magawo ati ofunika pa chuma cha Malaŵi?"
    ],
    ask: "Funsani NyasaExploler chilichonse chokhudza Malaŵi...",
    disclaimer: "NyasaExploler akhoza kulakwitsa. Tsimikizirani mfundo zofunika ku magwero odalirika.",
    thinking: "NyasaExploler akuganiza...", you: "Inu", copy: "Koperani", copied: "Zakoperedwa",
    error: "Pepani, sindinathe kumaliza pempholi."
  }
};

const suggestionIcons = [Leaf, GraduationCap, MapPin, Landmark];

export default function App() {
  const [language, setLanguage] = useState(() => localStorage.getItem("mthandizi-language") || "en");
  // Restore the active conversation after refresh/reopening the browser.
  const [messages, setMessages] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("mthandizi-messages") || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });
  const [memorySummary, setMemorySummary] = useState(
    () => localStorage.getItem("mthandizi-memory-summary") || ""
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const t = copy[language];

  useEffect(() => {
    localStorage.setItem("mthandizi-language", language);
  }, [language]);

  // Persist conversation and compressed memory locally on this browser.
  useEffect(() => {
    try {
      localStorage.setItem("mthandizi-messages", JSON.stringify(messages));
    } catch (error) {
      console.warn("Could not save conversation locally:", error);
    }
  }, [messages]);

  useEffect(() => {
    try {
      if (memorySummary) {
        localStorage.setItem("mthandizi-memory-summary", memorySummary);
      } else {
        localStorage.removeItem("mthandizi-memory-summary");
      }
    } catch (error) {
      console.warn("Could not save conversation memory:", error);
    }
  }, [memorySummary]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  const suggestions = [
    { icon: suggestionIcons[0], title: t.agriculture, question: t.questions[0] },
    { icon: suggestionIcons[1], title: t.education, question: t.questions[1] },
    { icon: suggestionIcons[2], title: t.geography, question: t.questions[2] },
    { icon: suggestionIcons[3], title: t.economy, question: t.questions[3] }
  ];

  async function sendMessage(text) {
    const content = text.trim();
    if (!content || loading) return;

    const updated = [...messages, { role: "user", content }];
    setMessages(updated);
    setInput("");
    setLoading(true);
    setSidebarOpen(false);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated, language, memorySummary })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The request failed.");
      if (typeof data.memorySummary === "string") {
        setMemorySummary(data.memorySummary);
      }
      setMessages([...updated, {
        role: "assistant",
        content: data.reply || "I couldn't generate a response."
      }]);
    } catch (error) {
      setMessages([...updated, {
        role: "assistant",
        content: `${t.error} ${error.message}`
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    sendMessage(input);
  }

  function newChat() {
    if (loading) return;
    setMessages([]);
    setMemorySummary("");
    setInput("");
    setSidebarOpen(false);
  }

  async function copyMessage(content, index) {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      window.setTimeout(() => setCopiedIndex(null), 1500);
    } catch {
      setCopiedIndex(null);
    }
  }

  return (
    <div className="app-shell">
      {sidebarOpen && <button className="mobile-overlay" aria-label="Close menu" onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><Sparkles size={21} /></div>
          <div className="brand-copy"><h2>NyasaExploler</h2><span>AI for Malawi</span></div>
          <button className="close-sidebar" onClick={() => setSidebarOpen(false)} aria-label="Close menu"><X size={19} /></button>
        </div>

        <button className="new-chat" onClick={newChat} disabled={loading}>
          <Plus size={18} /> {t.newChat}
        </button>

        <div className="sidebar-section">
          <span className="section-label">{t.explore}</span>
          {suggestions.map((item) => {
            const Icon = item.icon;
            return (
              <button className="sidebar-link" key={item.title} onClick={() => sendMessage(item.question)} disabled={loading}>
                <Icon size={18} /> <span>{item.title}</span>
              </button>
            );
          })}
        </div>

        <div className="sidebar-footer">
          <div className="local-status"><span className="status-dot" /> {t.status}</div>
          <p>{t.powered}</p>
          <p className="memory-note">Conversation saved on this device.</p>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button className="menu-button" onClick={() => setSidebarOpen(true)} aria-label="Open menu"><Menu size={21} /></button>
            <div className="mobile-brand"><Sparkles size={19} /> NyasaExploler</div>
            <div className="page-context"><span className="context-dot" /> {t.country} · AI assistant</div>
          </div>
          <div className="topbar-right">
            <Globe2 size={16} />
            <span className="language-caption">{t.language}</span>
            <div className="language-switch" role="group" aria-label="Choose language">
              <button type="button" className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")} aria-pressed={language === "en"}>English</button>
              <button type="button" className={language === "ny" ? "active" : ""} onClick={() => setLanguage("ny")} aria-pressed={language === "ny"}>Chichewa</button>
            </div>
          </div>
        </header>

        <section className={`chat-area ${messages.length ? "has-messages" : ""}`}>
          {messages.length === 0 ? (
            <div className="welcome-screen">
              <div className="welcome-icon"><Sparkles size={27} /></div>
              <span className="welcome-label">{t.welcomeTag}</span>
              <h1>{t.greeting}<br /><span>{t.welcomeTitle}</span></h1>
              <p className="welcome-description">{t.intro}</p>
              <div className="suggestion-grid">
                {suggestions.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button className="suggestion-card" key={item.title} onClick={() => sendMessage(item.question)} disabled={loading}>
                      <div className="suggestion-icon"><Icon size={19} /></div>
                      <div><h3>{item.title}</h3><p>{item.question}</p></div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="messages-container">
              {messages.map((message, index) => (
                <div key={index} className={`message-row ${message.role}`}>
                  {message.role === "assistant" && <div className="message-avatar"><Sparkles size={17} /></div>}
                  <div className="message-content">
                    <span className="message-author">{message.role === "user" ? t.you : "NyasaExploler"}</span>
                    <div className={`message-text ${message.role === "user" ? "user-bubble" : "assistant-prose"}`}>
                      {message.role === "assistant" ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                      ) : message.content}
                    </div>
                    {message.role === "assistant" && (
                      <button className="copy-button" onClick={() => copyMessage(message.content, index)}>
                        {copiedIndex === index ? <Check size={14} /> : <Copy size={14} />}
                        {copiedIndex === index ? t.copied : t.copy}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="message-row assistant">
                  <div className="message-avatar"><Sparkles size={17} /></div>
                  <div className="loading-message"><LoaderCircle size={17} className="spin" /> {t.thinking}</div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </section>

        <footer className="input-section">
          <form className="chat-form" onSubmit={handleSubmit}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={t.ask}
              rows={1}
              disabled={loading}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSubmit(event);
                }
              }}
            />
            <button type="submit" className="send-button" disabled={!input.trim() || loading} aria-label="Send message">
              {loading ? <LoaderCircle size={19} className="spin" /> : <Send size={19} />}
            </button>
          </form>
          <p className="disclaimer"><MessageCircle size={13} /> {t.disclaimer}</p>
        </footer>
      </main>
    </div>
  );
}

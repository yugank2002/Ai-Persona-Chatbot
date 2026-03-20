/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Send, ArrowLeft, Settings, X, Save, User, MessageSquarePlus, Smile, Paperclip, Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';

// Initialize Gemini
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

const DEFAULT_AI_NAME = "";
const DEFAULT_CHAT_HISTORY = "";

export default function App() {
  const [aiName, setAiName] = useState(DEFAULT_AI_NAME);
  const [chatHistoryContext, setChatHistoryContext] = useState(DEFAULT_CHAT_HISTORY);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [tempAiName, setTempAiName] = useState(DEFAULT_AI_NAME);
  const [tempChatHistory, setTempChatHistory] = useState(DEFAULT_CHAT_HISTORY);
  const [messages, setMessages] = useState<Message[]>([]);
  const isConfigured = aiName.trim() !== "" && chatHistoryContext.trim() !== "";

  // Load from localStorage on mount
  useEffect(() => {
    const savedAiName = localStorage.getItem('ai_persona_name');
    const savedContext = localStorage.getItem('ai_persona_context');
    if (savedAiName) {
      setAiName(savedAiName);
      setTempAiName(savedAiName);
    }
    if (savedContext) {
      setChatHistoryContext(savedContext);
      setTempChatHistory(savedContext);
    }
  }, []);

  // Save to localStorage when configured
  useEffect(() => {
    if (isConfigured) {
      localStorage.setItem('ai_persona_name', aiName);
      localStorage.setItem('ai_persona_context', chatHistoryContext);
    }
  }, [aiName, chatHistoryContext, isConfigured]);

 
 
  const handleReset = () => {
    setAiName("");
    setChatHistoryContext("");
    setTempAiName("");
    setTempChatHistory("");
    setMessages([]);
    localStorage.removeItem('ai_persona_name');
    localStorage.removeItem('ai_persona_context');
    setIsSettingsOpen(false);
  };

  const clearChat = () => {
    setMessages([]);
  };
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !isConfigured) return;

    const userMessage: Message = {
      role: 'user',
      text: input,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const systemPrompt = `Your name is ${aiName}. You should behave and reply as this person. 
Keep your replies natural, conversational, and reflective of the relationship described in the following chat history.
Don't exaggerate. Use the same language style (e.g., Hinglish) as seen in the history.

Full Chat History for Context:
${chatHistoryContext}

Analyze this context and reply to the user's current message accordingly.`;

      const chat = genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          { role: 'user', parts: [{ text: systemPrompt }] },
          ...messages.map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
          })),
          { role: 'user', parts: [{ text: input }] }
        ],
        config: {
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
        }
      });

      const result = await chat;
      const responseText = result.text || "Sorry, I couldn't process that.";

      const botMessage: Message = {
        role: 'model',
        text: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error("Gemini Error:", error);
      setMessages(prev => [...prev, {
        role: 'model',
        text: "Kuch error aa gaya yrr, fir se try karo.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#e5ddd5] font-sans overflow-hidden">
      {/* WhatsApp Header */}
      <header className="bg-[#075e54] text-white px-4 py-3 flex items-center justify-between shadow-md z-10">
        <div className="flex items-center gap-3">
          <ArrowLeft className="w-6 h-6 cursor-pointer" />
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center border border-white/20">
              <User className="w-6 h-6 text-white" />
            </div>
            <div className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-[#075e54] rounded-full ${isConfigured ? 'bg-green-500' : 'bg-gray-400'}`}></div>
          </div>
          <div>
            <h1 className="font-semibold text-lg leading-tight">{isConfigured ? aiName : 'Setup Required'}</h1>
            <p className="text-xs text-white/80">{isConfigured ? 'online' : 'offline'}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={clearChat}
            className="text-xs font-medium bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition-colors whitespace-nowrap"
          >
            Clear Chat
          </button>
          <Settings 
            className="w-5 h-5 cursor-pointer opacity-90 hover:opacity-100" 
            onClick={() => {
              setTempAiName(aiName);
              setTempChatHistory(chatHistoryContext);
              setIsSettingsOpen(true);
            }}
          />
        </div>
      </header>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
            >
              <div className="bg-[#075e54] text-white px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  System Configuration
                </h2>
                <X 
                  className="w-6 h-6 cursor-pointer hover:bg-white/10 rounded-full p-1" 
                  onClick={() => setIsSettingsOpen(false)}
                />
              </div>
              
              <div className="p-6 flex-1 overflow-y-auto space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    AI Persona Name
                  </label>
                  <input
                    type="text"
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#075e54] focus:border-transparent outline-none text-sm"
                    value={tempAiName}
                    onChange={(e) => setTempAiName(e.target.value)}
                    placeholder="e.g. Jhon Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Chat History Context
                  </label>
                  <textarea
                    className="w-full h-80 p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#075e54] focus:border-transparent outline-none text-sm font-mono leading-relaxed resize-none"
                    value={tempChatHistory}
                    onChange={(e) => setTempChatHistory(e.target.value)}
                    placeholder="Paste chat history here to define the relationship..."
                  />
                  <p className="mt-2 text-xs text-gray-500 italic">
                    The AI will analyze this history to adopt the personality and relationship dynamics.
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 px-6 py-4 flex justify-between items-center">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium text-sm flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Reset All
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsSettingsOpen(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setAiName(tempAiName);
                      setChatHistoryContext(tempChatHistory);
                      setIsSettingsOpen(false);
                    }}
                    className="px-6 py-2 bg-[#00a884] text-white rounded-lg hover:bg-[#008f6f] transition-colors font-medium flex items-center gap-2 shadow-sm"
                  >
                    <Save className="w-4 h-4" />
                    Save Configuration
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Area */}
      <main 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-2 scroll-smooth relative"
        style={{ backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')", backgroundSize: 'contain' }}
      >
        {!isConfigured ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm p-8 text-center">
            <div className="w-20 h-20 bg-[#075e54] rounded-full flex items-center justify-center mb-6 shadow-xl">
              <MessageSquarePlus className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-[#111b21] mb-2">Welcome to AI Chat</h2>
            <p className="text-[#667781] max-w-xs mb-8">
              Please configure the AI persona and chat history in settings to start chatting.
            </p>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="bg-[#00a884] text-white px-8 py-3 rounded-full font-semibold shadow-md hover:bg-[#008f6f] transition-all flex items-center gap-2"
            >
              <Settings className="w-5 h-5" />
              Open Settings
            </button>
          </div>
        ) : (
          <>
            <div className="flex justify-center mb-4">
              <span className="bg-[#d1e4f3] text-[#54656f] text-[11px] px-3 py-1 rounded-md uppercase tracking-wider font-medium shadow-sm">
                Today
              </span>
            </div>

            <AnimatePresence initial={false}>
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[85%] md:max-w-[70%] px-3 py-1.5 rounded-lg shadow-sm relative group ${
                      msg.role === 'user' 
                        ? 'bg-[#dcf8c6] rounded-tr-none' 
                        : 'bg-white rounded-tl-none'
                    }`}
                  >
                    {/* Bubble Tail */}
                    <div className={`absolute top-0 w-3 h-3 ${
                      msg.role === 'user' 
                        ? 'right-[-8px] bg-[#dcf8c6] [clip-path:polygon(0_0,0_100%,100%_0)]' 
                        : 'left-[-8px] bg-white [clip-path:polygon(100%_0,100%_100%,0_0)]'
                    }`}></div>

                    <div className="text-[14.5px] text-[#111b21] leading-relaxed break-words">
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                    
                    <div className="flex justify-end items-center gap-1 mt-1">
                      <span className="text-[10px] text-[#667781]">
                        {msg.timestamp}
                      </span>
                      {msg.role === 'user' && (
                        <div className="flex">
                          <svg viewBox="0 0 16 15" width="16" height="15" className="text-[#53bdeb] fill-current">
                            <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879l-2.976-2.734a.373.373 0 0 0-.513.006l-.425.4a.362.362 0 0 0 .007.513l3.734 3.432a.366.366 0 0 0 .517-.015l5.074-7.137a.365.365 0 0 0-.063-.51zM10.27 3.316l-.478-.372a.365.365 0 0 0-.51.063L5.389 8.391l-.99-.91a.373.373 0 0 0-.513.006l-.425.4a.362.362 0 0 0 .007.513l1.747 1.606a.366.366 0 0 0 .517-.015l3.602-5.074a.365.365 0 0 0-.063-.51z"></path>
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white px-4 py-2 rounded-lg shadow-sm flex gap-1 items-center">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Input Area */}
      <footer className={`bg-[#f0f2f5] p-2 flex items-center gap-2 z-10 ${!isConfigured ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="flex items-center gap-2 text-[#54656f]">
          <Smile className="w-6 h-6 cursor-pointer hover:text-[#111b21]" />
          <Paperclip className="w-6 h-6 cursor-pointer hover:text-[#111b21]" />
        </div>
        
        <div className="flex-1 bg-white rounded-lg px-3 py-2 flex items-center shadow-sm">
          <input
            type="text"
            placeholder={isConfigured ? "Type a message" : "Complete setup to chat"}
            className="flex-1 outline-none text-[15px] text-[#111b21]"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={!isConfigured}
          />
        </div>

        <div 
          className={`flex items-center justify-center w-11 h-11 rounded-full text-white cursor-pointer transition-colors shadow-md ${
            !isConfigured ? 'bg-gray-400' : 'bg-[#00a884] hover:bg-[#008f6f]'
          }`} 
          onClick={handleSend}
        >
          {input.trim() ? <Send className="w-5 h-5 ml-0.5" /> : <Mic className="w-5 h-5" />}
        </div>
      </footer>
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase';
import { chatService } from './services/chatService';
import { User, Conversation, Message } from './types/database';
import { cn } from './lib/utils';
import { 
  Send, 
  Plus, 
  MessageSquare, 
  LogOut, 
  User as UserIcon, 
  Sparkles, 
  Loader2,
  Trash2,
  Menu,
  X,
  ChevronRight,
  Zap,
  Edit2,
  Check,
  Lock,
  Mail
} from 'lucide-react';
import Markdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfile(session.user.id);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setConversations([]);
        setCurrentConversation(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (data) {
      setUser(data);
      fetchConversations(userId);
    }
  };

  useEffect(() => {
    if (currentConversation) {
      fetchMessages(currentConversation.id);
    } else {
      setMessages([]);
    }
  }, [currentConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async (userId: string) => {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (data) setConversations(data);
  };

  const fetchMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    
    if (data) setMessages(data);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (authError) throw authError;

        if (authData.user) {
          const { error: profileError } = await supabase
            .from('users')
            .insert([{ id: authData.user.id, username: username || email.split('@')[0] }]);
          
          if (profileError) throw profileError;
          alert('Check your email for the confirmation link!');
        }
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) throw authError;
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      alert(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setConversations([]);
    setCurrentConversation(null);
    setMessages([]);
  };

  const handleRename = async (id: string) => {
    if (!newTitle.trim()) return;

    const { error } = await supabase
      .from('conversations')
      .update({ title: newTitle })
      .eq('id', id);

    if (!error) {
      setConversations(conversations.map(c => c.id === id ? { ...c, title: newTitle } : c));
      if (currentConversation?.id === id) {
        setCurrentConversation({ ...currentConversation, title: newTitle });
      }
      setEditingTitleId(null);
    }
  };

  const createNewConversation = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('conversations')
      .insert([{ user_id: user.id, title: 'New Lumina Chat' }])
      .select()
      .single();

    if (data) {
      setConversations([data, ...conversations]);
      setCurrentConversation(data);
    }
  };

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', id);
    
    if (!error) {
      setConversations(conversations.filter(c => c.id !== id));
      if (currentConversation?.id === id) {
        setCurrentConversation(null);
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user || isLoading) return;

    let activeConversation = currentConversation;

    if (!activeConversation) {
      const { data, error } = await supabase
        .from('conversations')
        .insert([{ user_id: user.id, title: input.substring(0, 30) + '...' }])
        .select()
        .single();
      
      if (data) {
        activeConversation = data;
        setCurrentConversation(data);
        setConversations([data, ...conversations]);
      } else {
        return;
      }
    }

    const userMessageContent = input;
    setInput('');
    setIsLoading(true);

    try {
      const { data: userMsg, error: userError } = await supabase
        .from('messages')
        .insert([{ 
          conversation_id: activeConversation.id, 
          role: 'user', 
          content: userMessageContent 
        }])
        .select()
        .single();

      if (userMsg) {
        setMessages(prev => [...prev, userMsg]);
      }

      // 2. Get AI response
      const aiResponseContent = await chatService.generateResponse(messages, userMessageContent);

      // 3. Save AI message
      const { data: aiMsg, error: aiError } = await supabase
        .from('messages')
        .insert([{ 
          conversation_id: activeConversation.id, 
          role: 'assistant', 
          content: aiResponseContent 
        }])
        .select()
        .single();

      if (aiMsg) {
        setMessages(prev => [...prev, aiMsg]);
      }

      // 4. Auto-generate title if it's the first exchange
      if (messages.length === 0) {
        const generatedTitle = await chatService.generateTitle(userMessageContent, aiResponseContent);
        await supabase
          .from('conversations')
          .update({ title: generatedTitle })
          .eq('id', activeConversation.id);
        
        setConversations(prev => prev.map(c => c.id === activeConversation!.id ? { ...c, title: generatedTitle } : c));
        if (currentConversation?.id === activeConversation.id) {
          setCurrentConversation(prev => prev ? { ...prev, title: generatedTitle } : null);
        }
      }

    } catch (err) {
      console.error('Chat error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!supabase) {
    return (
      <div className="min-h-screen bg-[#0a0502] flex items-center justify-center p-4 font-sans text-white">
        <div className="atmosphere" />
        <div className="w-full max-w-md glass-panel rounded-3xl p-8">
          <h1 className="text-2xl font-bold text-orange-500 mb-4">Configuration Required</h1>
          <p className="text-gray-400 mb-4">
            Please set the following environment variables in your AI Studio Secrets:
          </p>
          <ul className="list-disc ml-5 space-y-2 text-sm font-mono bg-white/5 p-4 rounded-xl">
            <li>SUPABASE_URL</li>
            <li>SUPABASE_ANON_KEY</li>
          </ul>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0502] flex items-center justify-center p-4 font-sans text-white">
        <div className="atmosphere" />
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md glass-panel rounded-3xl p-10 overflow-hidden relative"
        >
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-orange-500/20 blur-3xl rounded-full" />
          
          <div className="flex flex-col items-center mb-10 relative">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-orange-500/20">
              <Sparkles className="text-white w-10 h-10" />
            </div>
            <h1 className="text-4xl font-bold tracking-tighter mb-2">Lumina AI</h1>
            <p className="text-gray-400 text-center">
              {isSignUp ? 'Create your secure account.' : 'Your atmospheric intelligence companion.'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4 relative">
            {isSignUp && (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-2 ml-1">
                  Username
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="alex_designer"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-white placeholder-gray-600 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none"
                    required
                  />
                </div>
              </div>
            )}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-2 ml-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-white placeholder-gray-600 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-2 ml-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-white placeholder-gray-600 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-white text-black py-4 rounded-2xl font-bold hover:bg-orange-500 hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 group mt-4"
            >
              {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : (
                <>
                  {isSignUp ? 'Create Account' : 'Enter the Light'}
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center relative">
            <button 
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-gray-500 hover:text-white transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#0a0502] text-white font-sans overflow-hidden">
      <div className="atmosphere" />
      
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.aside 
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            className="glass-sidebar w-80 flex flex-col z-30 relative"
          >
            <div className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-xl tracking-tight">Lumina</span>
              </div>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 hover:bg-white/5 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="px-6 mb-6">
              <button
                onClick={createNewConversation}
                className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-white text-black rounded-2xl hover:bg-orange-500 hover:text-white transition-all font-bold shadow-lg"
              >
                <Plus className="w-5 h-5" />
                New Session
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 space-y-2">
              <div className="px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">
                History
              </div>
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={cn(
                    "w-full flex items-center justify-between group px-4 py-3 rounded-2xl transition-all text-left",
                    currentConversation?.id === conv.id 
                      ? "bg-white/10 text-white font-medium" 
                      : "text-gray-500 hover:bg-white/5 hover:text-gray-300"
                  )}
                >
                  <div 
                    className="flex items-center gap-3 overflow-hidden flex-1 cursor-pointer"
                    onClick={() => setCurrentConversation(conv)}
                  >
                    <MessageSquare className="w-4 h-4 flex-shrink-0 opacity-40" />
                    {editingTitleId === conv.id ? (
                      <input
                        autoFocus
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onBlur={() => handleRename(conv.id)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRename(conv.id)}
                        className="bg-transparent border-none outline-none text-sm w-full text-white"
                      />
                    ) : (
                      <span className="truncate text-sm">{conv.title}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingTitleId(conv.id);
                        setNewTitle(conv.title);
                      }}
                      className="p-1 hover:text-white"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => deleteConversation(conv.id, e)}
                      className="p-1 hover:text-red-500"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-white/5 bg-black/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                    <UserIcon className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold truncate max-w-[120px]">{user.username}</span>
                    <span className="text-[9px] text-orange-500/80 uppercase font-black tracking-widest">Lumina Pro</span>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative min-w-0">
        {/* Header */}
        <header className="h-20 border-b border-white/5 bg-black/10 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-20">
          <div className="flex items-center gap-6">
            {!isSidebarOpen && (
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 hover:bg-white/5 rounded-xl transition-all"
              >
                <Menu className="w-6 h-6" />
              </button>
            )}
            <div className="flex flex-col">
              <h2 className="font-bold text-lg tracking-tight truncate max-w-[300px]">
                {currentConversation ? currentConversation.title : 'Welcome to Lumina'}
              </h2>
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Session Active</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-1.5 bg-orange-500/10 text-orange-500 text-[10px] font-black tracking-widest rounded-full border border-orange-500/20 uppercase">
              <Zap className="w-3 h-3" />
              Gemini 3 Flash
            </div>
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-8 space-y-10">
          {messages.length === 0 && !isLoading && (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-24 h-24 bg-gradient-to-br from-orange-500/20 to-transparent rounded-[2.5rem] flex items-center justify-center mb-8 border border-orange-500/20"
              >
                <Sparkles className="w-12 h-12 text-orange-500" />
              </motion.div>
              <h3 className="text-3xl font-bold mb-4 tracking-tight">How can Lumina assist you?</h3>
              <p className="text-gray-400 leading-relaxed">
                I'm your atmospheric AI companion. Ask me anything, from complex coding tasks to creative brainstorming. Your thoughts are safe in the light.
              </p>
            </div>
          )}

          <div className="max-w-4xl mx-auto space-y-10">
            {messages.map((msg) => (
              <motion.div 
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex gap-6",
                  msg.role === 'assistant' ? "flex-row" : "flex-row-reverse"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xl",
                  msg.role === 'assistant' 
                    ? "bg-gradient-to-br from-orange-500 to-red-600 text-white" 
                    : "bg-white/5 border border-white/10 text-gray-400"
                )}>
                  {msg.role === 'assistant' ? <Sparkles className="w-6 h-6" /> : <UserIcon className="w-6 h-6" />}
                </div>
                <div className={cn(
                  "flex flex-col space-y-2 max-w-[85%]",
                  msg.role === 'user' ? "items-end" : "items-start"
                )}>
                  <div className={cn(
                    "px-6 py-4 rounded-3xl text-sm leading-relaxed shadow-2xl",
                    msg.role === 'assistant' 
                      ? "bg-white/5 border border-white/10 text-gray-200" 
                      : "bg-white text-black font-medium"
                  )}>
                    <div className="markdown-body">
                      <Markdown>{msg.content}</Markdown>
                    </div>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-600 px-2">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </motion.div>
            ))}

            {isLoading && (
              <div className="flex gap-6 animate-pulse">
                <div className="w-10 h-10 rounded-2xl bg-white/5 flex-shrink-0" />
                <div className="flex flex-col space-y-3">
                  <div className="h-4 w-64 bg-white/5 rounded-full" />
                  <div className="h-4 w-80 bg-white/5 rounded-full" />
                </div>
              </div>
            )}
          </div>
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-8 bg-gradient-to-t from-[#0a0502] via-[#0a0502] to-transparent">
          <form 
            onSubmit={handleSendMessage}
            className="max-w-4xl mx-auto relative"
          >
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-red-600 rounded-[2rem] blur opacity-20 group-focus-within:opacity-40 transition-opacity" />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Whisper to Lumina..."
                className="relative w-full bg-white/5 border border-white/10 rounded-[1.8rem] px-8 py-5 pr-20 text-white placeholder-gray-600 shadow-2xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all backdrop-blur-md"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white text-black rounded-2xl hover:bg-orange-500 hover:text-white disabled:opacity-10 transition-all shadow-xl"
              >
                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
              </button>
            </div>
          </form>
          <div className="flex justify-center gap-8 mt-6">
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-gray-600">
              <div className="w-1 h-1 bg-orange-500 rounded-full animate-pulse" />
              Encrypted
            </div>
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-gray-600">
              <div className="w-1 h-1 bg-orange-500 rounded-full animate-pulse" />
              Persistent
            </div>
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-gray-600">
              <div className="w-1 h-1 bg-orange-500 rounded-full animate-pulse" />
              Lumina Engine v3
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

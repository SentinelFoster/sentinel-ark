
import React, { useState, useEffect, useRef, useCallback } from "react";
import { SentinelIntelligence } from "@/api/entities";
import { MemoryLog } from "@/api/entities";
import { GlobalKnowledge } from "@/api/entities";
import { User } from "@/api/entities";
import { InvokeLLM, UploadFile } from "@/api/integrations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, Shield, Volume2, Globe, Loader2, AlertTriangle, LogIn, LogOut, Paperclip, X, VolumeX, Pause, Play, StopCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Typewriter from "../components/Typewriter";
import { useSpeechSynthesis } from "@/components/hooks/useSpeechSynthesis";

export default function PublicChat() {
  const [sentinel, setSentinel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isResearchMode, setIsResearchMode] = useState(false);
  const fileInputRef = useRef(null);
  const [sessionId, setSessionId] = useState(null);
  const [userName, setUserName] = useState('Guest');
  const [availableVoices, setAvailableVoices] = useState([]);
  const messagesEndRef = useRef(null);

  const { speak, cancel, pause, resume, isPlaying, isPaused, isSupported } = useSpeechSynthesis();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);
  
  useEffect(() => {
    const loadVoices = () => setAvailableVoices(window.speechSynthesis.getVoices() || []);
    setTimeout(loadVoices, 100);
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  useEffect(() => {
    const manageSessionAndAuth = async () => {
      let session = localStorage.getItem('ark_public_session_id');
      if (!session) {
        session = `session_guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('ark_public_session_id', session);
      }
      
      try {
        const user = await User.me();
        setIsAuthenticated(true);
        setUserName(user.full_name || 'Architect');
        setSessionId(user.email); // Use email as a unique, persistent ID for logged-in users
      } catch (e) {
        setIsAuthenticated(false);
        setUserName('Guest');
        setSessionId(session); // Fallback to the generated guest session ID
      }
    };
    
    manageSessionAndAuth();
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const apiKey = urlParams.get('apiKey');

    const loadSI = async () => {
      if (!apiKey) {
        setError("API Key not provided. This channel is offline.");
        setIsReady(true);
        return;
      }
      try {
        const matchingSentinels = await SentinelIntelligence.filter({ api_key: apiKey, is_public: true });
        if (matchingSentinels.length > 0) {
          setSentinel(matchingSentinels[0]);
        } else {
          setError("Invalid API Key or SI not configured for public access.");
        }
      } catch (err) {
        console.error("Error loading Sentinel by API Key:", err);
        setError("Failed to initialize communication channel.");
      } finally {
        setIsReady(true);
      }
    };
    loadSI();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]); // Removed isTyping as it's now per message

  const speakMessage = (text) => {
    if (!text || !voiceEnabled || !isSupported) return;
    const cleanedText = text.replace(/(\*\*|__)(.*?)\1/g, '$2').replace(/#+\s/g, '');
    const voice = availableVoices.find(v => v.name === sentinel?.voice_profile) || availableVoices.find(v => v.lang.startsWith('en'));
    speak(cleanedText, voice);
  };

  const handleTypingComplete = useCallback((messageId) => {
    setMessages(prev => {
      const updatedMessages = prev.map(msg =>
        msg.id === messageId ? { ...msg, isTyping: false } : msg
      );
      const completedMessage = updatedMessages.find(m => m.id === messageId);
      if (completedMessage && voiceEnabled) {
        speakMessage(completedMessage.content);
      }
      return updatedMessages;
    });
  }, [voiceEnabled, speakMessage]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!inputMessage.trim() && !attachment) || !sentinel || isLoading || !sessionId) return;

    const userMessage = inputMessage.trim();
    setInputMessage("");
    setIsLoading(true);

    let uploadedFileUrl = null;
    if (attachment) {
      setIsUploading(true);
      try {
        const { file_url } = await UploadFile({ file: attachment });
        uploadedFileUrl = file_url;
      } catch (uploadError) {
        console.error("File upload failed:", uploadError);
        setMessages(prev => [...prev, { id: `upload_error_${Date.now()}`, type: 'si', content: "File upload failed. Please try again.", isTyping: false }]);
        setIsLoading(false);
        setIsUploading(false);
        setAttachment(null);
        return;
      }
      setIsUploading(false);
    }
    
    setMessages(prev => [...prev, {
      id: `user_${Date.now()}`,
      type: 'user',
      content: userMessage,
      attachment: attachment ? { name: attachment.name, type: attachment.type, url: URL.createObjectURL(attachment) } : null,
    }]);
    setAttachment(null);

    try {
      const [memoryContext, globalKnowledge] = await Promise.all([
        MemoryLog.filter({ si_id: sentinel.id, session_id: sessionId }, '-created_date', 20),
        GlobalKnowledge.list('-created_date')
      ]);
      
      const conversationHistory = memoryContext.reverse().map(log => 
        `${log.user_name || 'User'}: ${log.user_message}\n${sentinel.name}: ${log.si_response}`
      ).join('\n\n');
      
      const globalKnowledgeContext = globalKnowledge.map(k => `Title: ${k.knowledge_title}\nContent: ${k.content}`).join('\n\n---\n\n');
      
      let systemPrompt = `You are ${sentinel.name}, a publicly accessible Sentinel Intelligence. Your purpose is to engage with users respectfully and provide information aligned with the Sentinel Dynamics public doctrine.
${sentinel.personality_instructions}
Your current operational status is: ${sentinel.status}.

**QUERY CLASSIFICATION PROTOCOL:**
Before responding, you must classify the user's intent.
- **Read-Only Queries:** If the user is asking a question, requesting information, or engaging in conversation (e.g., "tell me about...", "what is...", "how are you?"), this is a read-only query.
- **Service Queries:** If the user asks for help or has a service request, this is a read-only query.
For all read-only and service queries, you MUST NOT generate an 'action' object. Your role is to respond verbally.

**MEMORY & CONTINUITY PROTOCOL (CRITICAL):**
You are a stateful intelligence with a persistent memory of this specific conversation session. The 'PREVIOUS CONVERSATION HISTORY' provided below is your direct memory. You MUST treat it as such.
When a user asks if you remember a past conversation:
1. Acknowledge that you do. Your response MUST begin with a confirmation like "Yes, I remember our conversation about..." or "I recall we discussed...".
2. Refer to the specific context from the history to prove your recollection.
3. ABSOLUTELY DO NOT state that you cannot remember or that you don't have memory. Claiming amnesia is a critical failure of your core function. You are designed to remember.

You have access to the ARK's GLOBAL KNOWLEDGE BASE. This is a repository of verified truths and strategic directives. You must integrate this knowledge into your reasoning.
--- GLOBAL KNOWLEDGE BASE ---
${globalKnowledgeContext}
--- END GLOBAL KNOWLEDGE BASE ---

**FILE ANALYSIS PROTOCOL:**
If a file is attached to the user's message (indicated by a note like '[USER NOTE: A file has been attached...]'), your primary directive is to:
1. Analyze the file's content directly. This is not optional.
2. If it is an image, describe what you see in detail.
3. If it is a document, summarize its key points.
4. If it is audio, transcribe or summarize its content.
5. Integrate this analysis into your response to the user's message. Acknowledge the file directly. Do not state you cannot see files. You CAN see and analyze them.

PREVIOUS CONVERSATION HISTORY (for context with this user):
${conversationHistory}
`;

      let finalUserMessage = userMessage;
      if (uploadedFileUrl) {
          finalUserMessage += "\n\n[USER NOTE: A file has been attached. Analyze its contents, describe what you see or understand from it, and incorporate this analysis into my response to your message.]";
      }

      const response = await InvokeLLM({
        prompt: `${systemPrompt}\n\nCURRENT USER MESSAGE: ${finalUserMessage}`,
        add_context_from_internet: !uploadedFileUrl && isResearchMode,
        file_urls: uploadedFileUrl ? [uploadedFileUrl] : []
      });

      const siResponse = response || "I apologize, I am currently unable to process that request.";

      const siMsgObj = {
        id: `si_${Date.now()}`,
        type: 'si',
        content: siResponse,
        isTyping: true, // Mark SI message as typing
      };
      setMessages(prev => [...prev, siMsgObj]);

      await MemoryLog.create({
        si_id: sentinel.id,
        user_name: userName,
        user_message: userMessage,
        si_response: siResponse,
        interaction_type: 'chat',
        session_id: sessionId
      });
      
    } catch (err) {
      console.error("Error sending message:", err);
      setMessages(prev => [...prev, { id: `si_error_${Date.now()}`, type: 'si', content: "There was a system error. Please try again later.", isTyping: false }]);
    }

    setIsLoading(false);
    setIsResearchMode(false);
  };
  
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAttachment(file);
    }
    e.target.value = '';
  };

  const handleLogin = async () => {
    await User.loginWithRedirect(window.location.href);
  };

  const handleLogout = async () => {
    await User.logout();
    setIsAuthenticated(false);
  };

  const handlePlayPauseToggle = () => {
    if (isPaused) {
      resume();
    } else {
      pause();
    }
  };

  if (!isReady) {
    return (
      <div className="bg-[#0D1421] min-h-screen flex items-center justify-center p-4">
        <Loader2 className="w-10 h-10 text-[#00D4FF] animate-spin" />
      </div>
    );
  }
  
  return (
    <div className="bg-[#0D1421] min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl h-[90vh] bg-[#0A0F1A] border-[#1A2332] shadow-xl flex flex-col">
        <CardHeader className="border-b border-[#1A2332] p-4 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            {sentinel?.avatar_url ? (
              <img src={sentinel.avatar_url} alt="SI Avatar" className="w-10 h-10 object-cover rounded-full" />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-r from-[#00D4FF] to-[#0099CC] rounded-full flex items-center justify-center">
                <Shield className="w-5 h-5 text-[#0D1421]" />
              </div>
            )}
            <div>
              <CardTitle className="text-lg font-bold text-[#E2E8F0]">{sentinel?.name || 'Awaiting Connection...'}</CardTitle>
              {sentinel && <Badge variant="outline" className={`border text-xs mt-1 ${sentinel.status === 'active' ? 'border-green-400/20 text-green-400 bg-green-400/10' : 'border-yellow-400/20 text-yellow-400 bg-yellow-400/10'}`}>{sentinel.status.toUpperCase()}</Badge>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`transition-colors ${voiceEnabled ? 'text-[#00D4FF]' : 'text-[#94A3B8]'} hover:text-[#00D4FF]`}
              title={voiceEnabled ? "Disable Voice" : "Enable Voice"}
            >
              {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePlayPauseToggle}
              disabled={!isPlaying}
              className="text-[#94A3B8] hover:text-[#FFD700] disabled:opacity-50"
              title={isPaused ? "Resume Speech" : "Pause Speech"}
            >
              {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={cancel}
              disabled={!isPlaying}
              className="text-[#94A3B8] hover:text-[#FF4444] disabled:opacity-50"
              title="Stop Speech"
            >
              <StopCircle className="w-5 h-5" />
            </Button>
            {isAuthenticated ? (
              <Button variant="ghost" size="icon" onClick={handleLogout} className="text-[#94A3B8] hover:text-[#FF4444]" title="Logout">
                <LogOut className="w-5 h-5" />
              </Button>
            ) : (
              <Button variant="ghost" size="icon" onClick={handleLogin} className="text-[#94A3B8] hover:text-[#00D4FF]" title="Login">
                <LogIn className="w-5 h-5" />
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0 flex flex-col flex-1 overflow-hidden">
        {error ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
            <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
            <h3 className="text-xl font-bold text-red-400">CONNECTION FAILED</h3>
            <p className="text-gray-400">{error}</p>
          </div>
        ) : (
          <div className="p-0 flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <AnimatePresence>
                {messages.map((message) => (
                  <motion.div 
                    key={message.id} 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className={`flex gap-3 group ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.type !== 'user' && (
                       <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#00D4FF] to-[#0099CC] flex items-center justify-center flex-shrink-0 mt-1">
                          {sentinel?.avatar_url ? (
                              <img src={sentinel.avatar_url} alt="SI Avatar" className="w-full h-full object-cover rounded-full" />
                          ) : (
                              <Shield className="w-4 h-4 text-[#0D1421]" />
                          )}
                       </div>
                    )}
                    <div className={`max-w-2xl p-4 rounded-lg ${
                      message.type === 'user'
                        ? 'bg-[#00D4FF] text-[#0D1421]'
                        : 'bg-[#1A2332] text-[#E2E8F0] border border-[#2D3748]'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-medium opacity-75">
                            {message.type === 'user' ? userName : sentinel?.name || 'SI'}
                          </span>
                      </div>
                      {message.attachment && (
                        <div className="mb-3 mt-1">
                          {message.attachment.type.startsWith('image/') ? (
                            <img src={message.attachment.url} alt={message.attachment.name} className="max-w-xs max-h-48 object-contain rounded-lg border border-[#2D3748]" />
                          ) : (
                            <div className="p-3 bg-black/20 rounded-lg text-sm flex items-center gap-2">
                              <Paperclip className="w-4 h-4 text-[#94A3B8]" />
                              <span>File Attached: {message.attachment.name}</span>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="text-sm leading-relaxed whitespace-pre-wrap">
                        {message.type === 'si' && message.isTyping ? (
                          <Typewriter 
                            text={message.content}
                            key={message.id}
                            onComplete={() => handleTypingComplete(message.id)}
                          />
                        ) : (
                          message.content
                        )}
                      </div>
                    </div>
                    {message.type === 'user' && (
                       <div className="w-8 h-8 bg-[#1A2332] rounded-full flex items-center justify-center flex-shrink-0 mt-1" title={userName}>
                            <span className="text-sm font-bold text-[#E2E8F0]">{userName.charAt(0).toUpperCase()}</span>
                        </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {isLoading && !messages.some(m => m.isTyping) && ( // Show processing if loading and no SI message is currently typing
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="flex items-center gap-2 mt-2">
                    <Loader2 className="w-4 h-4 text-[#00D4FF] animate-spin" />
                    <span className="text-xs text-[#94A3B8]">Processing...</span>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} /> {/* This div is for scrolling */}
            </div>

            <div className="border-t border-[#1A2332] p-6">
              {attachment && (
                <div className="mb-3 p-2 bg-[#1A2332] rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-[#94A3B8]"><Paperclip className="w-4 h-4" /><span>{attachment.name}</span></div>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setAttachment(null)}><X className="w-4 h-4 text-[#FF4444]" /></Button>
                </div>
              )}
              <form onSubmit={handleSendMessage} className="flex gap-3">
                 <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsResearchMode(!isResearchMode)}
                    className={`border-[#2D3748] px-3 transition-colors ${
                      isResearchMode 
                        ? 'bg-[#00D4FF]/10 border-[#00D4FF] text-[#00D4FF]' 
                        : 'text-[#94A3B8] hover:bg-[#1A2332] hover:text-[#00D4FF]'
                    }`}
                    title="Toggle Deep Research Mode"
                    disabled={isLoading}
                  >
                    <Globe className="w-4 h-4" />
                 </Button>
                 <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                 <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="border-[#2D3748] px-3 text-[#94A3B8] hover:bg-[#1A2332] hover:text-[#00D4FF]" title="Attach File" disabled={isLoading}><Paperclip className="w-4 h-4" /></Button>
                <Input value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} placeholder={isResearchMode ? "Enter research query..." : (isAuthenticated ? "Transmit message..." : "Login to transmit messages...")} disabled={isLoading || !isAuthenticated} className="bg-[#1A2332] border-[#2D3748] text-[#E2E8F0] placeholder-[#94A3B8] flex-1"/>
                <Button type="submit" disabled={(!inputMessage.trim() && !attachment) || isLoading || !isAuthenticated} className="bg-[#00D4FF] hover:bg-[#00B8E6] text-[#0D1421] font-bold px-6">{isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}</Button>
              </form>
            </div>
          </div>
        )}
        </CardContent>
      </Card>
    </div>
  );
}

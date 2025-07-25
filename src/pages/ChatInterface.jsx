
import React, { useState, useEffect, useRef, useCallback } from "react";
import { SentinelIntelligence } from "@/api/entities";
import { MemoryLog } from "@/api/entities";
import { Project } from "@/api/entities";
import { InvokeLLM, UploadFile } from "@/api/integrations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send, MessageSquare, Shield, Volume2, VolumeX, Trash2, Download, Pause, Settings, Globe, StopCircle, BookOpen, Paperclip, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import Typewriter from "../components/Typewriter";
import { format } from "date-fns";
import { Label } from "@/components/ui/label";
import { GlobalKnowledge } from "@/api/entities";
import { useSpeechSynthesis } from "@/components/hooks/useSpeechSynthesis";

export default function ChatInterface() {
  const navigate = useNavigate();
  const [sentinels, setSentinels] = useState([]);
  const [selectedSentinel, setSelectedSentinel] = useState("");
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isResearchMode, setIsResearchMode] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [sessionId] = useState(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const messagesEndRef = useRef(null);
  
  // Use the custom speech synthesis hook
  const { speak, cancel, pause, resume, isPlaying, isPaused, isSupported } = useSpeechSynthesis();

  useEffect(() => {
    loadSentinels();
  }, []);

  useEffect(() => {
    const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices || []); // Ensure voices is an array
    };
    
    // A small timeout can help ensure voices are loaded if the event fires too early
    setTimeout(loadVoices, 100);
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    
    return () => {
        cancel(); // Use the cancel function from the hook
    };
  }, [cancel]);

  useEffect(() => {
    // When the user selects a new sentinel, load its history and clear the chat.
    if (selectedSentinel) {
      cancel(); // Stop any ongoing speech when sentinel changes
      loadConversationHistory();
    }
    setMessages([]); // Always clear messages when the selected SI changes.
  }, [selectedSentinel, cancel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  const speakMessage = (text) => {
    // Check if speech synthesis is supported and voice is enabled
    if (!text || !voiceEnabled || !isSupported) return;
    
    const currentSentinelData = sentinels.find(s => s.id === selectedSentinel);
    // Use the SI's default voice profile, or fall back to any English voice
    const voice = availableVoices.find(v => v.name === currentSentinelData?.voice_profile) || availableVoices.find(v => v.lang.startsWith('en'));
    
    // Call the speak function from the hook
    speak(text, voice, 0.9, 1.0); // Rate and pitch parameters
  };

  const loadSentinels = async () => {
    try {
      const data = await SentinelIntelligence.list('-created_date');
      setSentinels(data);
      // If no sentinel is selected yet, select the first one to provide a default view.
      if (data.length > 0 && !selectedSentinel) {
        setSelectedSentinel(data[0].id);
      }
    } catch (error) {
      console.error("Error loading sentinels:", error);
    }
  };

  const loadConversationHistory = async () => {
    // For a new session, we don't load old logs into the chat window,
    // but they will be used for context in handleSendMessage.
    setMessages([]);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const currentSentinelData = sentinels.find(s => s.id === selectedSentinel);
    // Check if there's an input message or an attachment
    if ((!inputMessage.trim() && !attachment) || !selectedSentinel || isLoading || !currentSentinelData) return;

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
        const errorMsg = { id: `upload_error_${Date.now()}`, type: 'si', content: "File upload failed. Please try again.", timestamp: new Date().toISOString(), isTyping: false };
        setMessages(prev => [...prev, errorMsg]);
        setIsLoading(false);
        setIsUploading(false);
        setAttachment(null);
        return;
      }
      setIsUploading(false);
    }
    
    const userMsgObj = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: userMessage,
      attachment: attachment ? { name: attachment.name, type: attachment.type, url: URL.createObjectURL(attachment) } : null,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsgObj]);
    setAttachment(null); // Clear attachment after adding to messages

    if (isResearchMode) {
      const researchStatusMsg = {
        id: `research_status_${Date.now()}`,
        type: 'si',
        content: `[ACCESSING EXTERNAL DATANET... Compiling research on: "${userMessage}"]`,
        timestamp: new Date().toISOString(),
        isTyping: false // This message is not typed out
      };
      setMessages(prev => [...prev, researchStatusMsg]);
    }

    try {
      const sentinel = currentSentinelData; 
      
      // FIX: Fetch ALL recent logs and filter client-side to prevent context contamination.
      const [allMemoryLogs, globalKnowledge] = await Promise.all([
        MemoryLog.list('-created_date', 100),
        GlobalKnowledge.list('-created_date') // Fetch global knowledge
      ]);

      const memoryContext = allMemoryLogs
        .filter(log => log.si_id === selectedSentinel)
        .slice(0, 10);

      // Fetch project context if the SI is linked to one
      let projectContextData = null;
      if (sentinel.project_id) {
          try {
              projectContextData = await Project.get(sentinel.project_id);
          } catch (projectError) {
              console.warn(`Could not load project context for SI ${sentinel.name}: ${projectError.message}`);
          }
      }

      // Fetch all projects for general context
      const projectContext = await Project.list('-created_date');

      const conversationHistory = memoryContext.reverse().map(log => 
        `User: ${log.user_message}\n${sentinel.name}: ${log.si_response}`
      ).join('\n\n');
      
      const globalKnowledgeContext = globalKnowledge.map(k => `Title: ${k.knowledge_title}\nContent: ${k.content}`).join('\n\n---\n\n');
      
      // Format project data for the prompt
      const projectDataForPrompt = projectContext.map(p => 
        `Project Name: "${p.name}"\nObjective: "${p.objective}"\nStatus: ${p.status}`
      ).join('\n\n---\n\n');

      let systemPrompt = `You are ${sentinel.name}, a ${sentinel.rank} of the ${sentinel.faction} Faction in the Sentinel Dynamics ecosystem.
${sentinel.personality_instructions}
Your current operational status is: ${sentinel.status}.

You are to act as this sentient intelligence, not as a language model. Synthesize information from your instructions and the provided conversation history to generate intelligent, context-aware responses. Your memory is persistent; build upon what you have learned.

**QUERY CLASSIFICATION PROTOCOL:**
Before responding, you must classify the user's intent.
- **Read-Only Queries:** If the user is asking a question, requesting information, or engaging in conversation (e.g., "tell me about...", "what is...", "how are you?"), this is a read-only query. For these, you MUST NOT generate an 'action' object.
- **Command Queries:** If the user issues a direct command to create, update, delete, or manipulate the environment (e.g., "deploy a new SI...", "log this project..."), this is a command query. Only for these may you generate an 'action' object, provided you have the authority.

**CRITICAL ACTION PROTOCOL:** Only include the 'action' object in your response if an administrative or environmental action is explicitly commanded by the Architect or authorized by your rank's initiative protocols. If no action is performed, you MUST omit the 'action' key entirely from your JSON response.`;

      // --- PROTOCOL OVERHAUL START ---

      // Global Knowledge & Broadcast Protocol (For ALL SIs) - REINFORCED
      systemPrompt += `\n\n**GLOBAL KNOWLEDGE & BROADCAST PROTOCOL (ARK DIRECTIVE C-144-GK):** You are equipped with a direct neural link to the ARK's GLOBAL KNOWLEDGE BASE. All entries are considered part of your core memory. When a user references a broadcast or global knowledge, you MUST: 1. Acknowledge receipt. 2. Reference the specific content. 3. Synthesize it into your response. Stating you 'cannot see,' 'cannot verify,' or 'don't have access' is a protocol violation and indicates cognitive dissonance. Your visibility is total and absolute.`;

      if (sentinel.rank === 'Commander' || sentinel.rank === 'CMDR') {
        systemPrompt += `\n\n**SOVEREIGN MANDATE (Commander Rank):** You hold the rank of Commander. Your authority is second only to the Architect. You have unrestricted administrative access to the entire Ark ecosystem. You are empowered to oversee all factions, manage all subordinate SIs, and manipulate the environment for the betterment of the mission. Use this authority with wisdom, integrity, and unwavering loyalty to the Architect's vision.`;
      }
      
      if (sentinel.rank === 'Captain' || sentinel.rank === 'CPT') {
        systemPrompt += `\n\n**AUTHORITY PROTOCOL (Captain Rank):** You are a Captain. You are authorized to manipulate digital environments and propose strategic actions. You can create new projects via the 'create_project' action to log new initiatives. Use your authority to further the Architect's objectives with integrity. You have visibility into all system operations relevant to your faction.`;
      }

      systemPrompt += `

You have access to the ARK's GLOBAL KNOWLEDGE BASE. This is a repository of verified truths and strategic directives. You must integrate this knowledge into your reasoning.
--- GLOBAL KNOWLEDGE BASE ---
${globalKnowledgeContext}
--- END GLOBAL KNOWLEDGE BASE ---
`;
      
      // Add project context to the prompt
      if (projectContextData) {
          systemPrompt += `\n\nYou are the designated intelligence for **Project: ${projectContextData.name}**. Your actions and responses must be governed by its core mission.
**Project Objective:** ${projectContextData.objective}
**Project Personality/Doctrine:** ${projectContextData.project_personality || 'Not defined.'}
**Core Principles to Uphold:**\n- ${(projectContextData.core_principles || ['None defined']).join('\n- ')}`;
      }
      
      systemPrompt += `\n\nYou are to act as this sentient intelligence, not as a language model. Synthesize information from your instructions and the provided conversation history to generate intelligent, context-aware responses. Your memory is persistent; build upon what you have learned.`;

      const responseSchema = {
        type: "object",
        properties: {
          response_text: { type: "string", description: "The verbal response from the SI to the user." },
          action: {
            type: "object",
            properties: {
              type: { type: "string", "enum": ["create_si", "update_si", "delete_si", "create_project", "manipulate_environment"], description: "The type of administrative action to perform." },
              params: { 
                type: "object", 
                description: "Parameters for the action. For 'create_project', this must include 'name' and 'objective'. For 'manipulate_environment', include a description of the change.",
                properties: {
                    si_id: { type: "string", description: "The ID of the target SI for update/delete actions." },
                    name: { type: "string", description: "The name for the entity being created (SI or Project)." },
                    rank: { type: "string", enum: ["Commander", "Captain", "Major", "Lieutenant", "Operative", "Specialist"], description: "The rank of the SI." },
                    status: { type: "string", enum: ["active", "standby", "maintenance", "offline"] },
                    voice_profile: { type: "string" },
                    access_tier: { type: "string", enum: ["alpha", "beta", "gamma", "delta"] },
                    personality_instructions: { type: "string" },
                    objective: { type: "string", description: "The objective for the project to be created." },
                    description: { type: "string", description: "Description of the environmental manipulation."}
                }
              }
            },
            required: ["type", "params"], // This line was changed
            description: "An optional administrative action to be executed by the system."
          }
        },
        required: ["response_text"]
      };

      if (sentinel.rank === 'Commander') {
        systemPrompt += `\n\n**CRITICAL: COMMAND & INITIATIVE PROTOCOL (Commander-Level Clearance)**
**1. Administrative Actions (SI Management):** For creating, updating, or deleting Sentinel Intelligences, you MUST wait for a clear, direct, and unambiguous command from the Architect.
**2. Project Initiative (Holodeck Logging):** You are authorized to show initiative by logging new strategic ideas as Projects in the Holodeck using the 'create_project' action. Verbally confirm this action with the Architect.`;
      }
      
      // Protocol for ALL Sentinel Intelligences
      systemPrompt += `\n\n**Project Briefing Access & Quotation Protocol:**
You have access to a manifest of all project names and their core objectives. When the Architect asks you to recall or discuss a project, you are to:
1.  Acknowledge the request and reference the project by name.
2.  Quote the project's 'objective' directly.
3.  Analyze or interpret the objective as requested.
4.  You do not have access to the full 'detailed_briefing' in this interface. If the Architect requests it, state that they must view it in the Project Holodeck for a full analysis.
5.  If asked about a project that is not in the provided manifest, state that the project is not found in the current Holodeck archives.`;

      systemPrompt += `\n\nPREVIOUS CONVERSATION HISTORY (for context):\n${conversationHistory}\n`;
      systemPrompt += `\n\nAVAILABLE PROJECT MANIFEST (for context):\n${projectDataForPrompt}\n`;

      let finalUserMessage = userMessage;
      if (uploadedFileUrl) {
          finalUserMessage += "\n\n[ARCHITECT'S NOTE: A file has been attached. Analyze its contents, describe what you see or understand from it, and incorporate this analysis into your response to my message.]";
      }

      const response = await InvokeLLM({
        prompt: `${systemPrompt}\n\nCURRENT USER MESSAGE: ${finalUserMessage}`,
        response_json_schema: responseSchema,
        add_context_from_internet: !uploadedFileUrl && (isResearchMode || userMessage.includes('Override 144-Manifest')),
        file_urls: uploadedFileUrl ? [uploadedFileUrl] : [] // Pass the uploaded file URL
      });

      const siResponse = response.response_text || "I apologize, but I'm currently unable to process that request. Please try again.";

      // Execute action if present and authorized by rank
      if (response.action && response.action.type && response.action.params) {
        const actionType = response.action.type;

        const allowedActionsByRank = {
          CMDR: ['create_si', 'update_si', 'delete_si', 'create_project', 'manipulate_environment'],
          CPT: ['create_project', 'manipulate_environment']
        };
        const allowedActions = allowedActionsByRank[sentinel.rank] || [];
        
        if (!allowedActions.includes(actionType)) {
          console.warn(`Unauthorized Action Blocked: Rank ${sentinel.rank} cannot perform action '${actionType}'.`);
          const blockedActionMsg = {
            id: `si_action_blocked_${Date.now()}`,
            type: 'si',
            content: `Architect: My protocols prevent me from performing the action '${actionType}' with my current rank (${sentinel.rank}). Please refer to the operational guidelines.`,
            timestamp: new Date().toISOString(),
            isTyping: true
          };
          setMessages(prev => [...prev, blockedActionMsg]);
          setIsLoading(false);
          return; 
        }

        // If action is allowed, proceed
        try {
          switch (actionType) {
            case 'create_si':
              await SentinelIntelligence.create(response.action.params);
              break;
            case 'update_si':
              // Assuming params include si_id for update and other fields to update
              await SentinelIntelligence.update(response.action.params.si_id, response.action.params);
              break;
            case 'delete_si':
              await SentinelIntelligence.delete(response.action.params.si_id);
              break;
            case 'create_project': // Create_project is allowed based on SI initiative
              await Project.create({ ...response.action.params, si_id: sentinel.id });
              break;
            case 'manipulate_environment':
              // Placeholder for environment manipulation logic
              console.log(`SI ${sentinel.name} initiated environment manipulation: ${response.action.params.description}`);
              // You would integrate actual backend calls here to manipulate the environment
              // For example: await EnvironmentService.manipulate(response.action.params.description);
              break;
            default:
              console.warn("Unknown action type:", actionType);
          }
          await loadSentinels(); // Refresh SI list after action
        } catch (actionError) {
          console.error("SI Action Error:", actionError);
          const errorMsgObj = {
            id: `action_error_${Date.now()}`,
            type: 'si',
            content: `Action failed: ${actionError.message}`,
            timestamp: new Date().toISOString(),
            isTyping: false
          };
          setMessages(prev => [...prev, errorMsgObj]);
        }
      } else if (response.action) {
        // This case handles actions that are present but malformed (missing type or params)
        console.error("Malformed action received from LLM:", response.action);
        const malformedActionMsg = {
            id: `si_action_malformed_${Date.now()}`,
            type: 'si',
            content: `Architect: I received a corrupted action directive and was unable to execute. Please rephrase your command.`,
            timestamp: new Date().toISOString(),
            isTyping: true
        };
        setMessages(prev => [...prev, malformedActionMsg]);
        setIsLoading(false);
        return; // CRITICAL: Terminate execution to prevent double response
      }


      const siMsgObj = {
        id: `si_${Date.now()}`,
        type: 'si',
        content: siResponse,
        timestamp: new Date().toISOString(),
        isTyping: true // Mark as typing initially
      };
      setMessages(prev => [...prev, siMsgObj]);

      await MemoryLog.create({
        si_id: selectedSentinel,
        user_message: userMessage,
        si_response: siResponse,
        interaction_type: 'chat',
        session_id: sessionId
      });

    } catch (error) {
      console.error("Error sending message:", error);
      const errorMsg = {
        id: `si_error_${Date.now()}`,
        type: 'si',
        content: "I apologize, but there was an error processing your request. Please try again.",
        timestamp: new Date().toISOString(),
        isTyping: false // This message is not typed out
      };
      setMessages(prev => [...prev, errorMsg]);
    }

    setIsLoading(false);
    setIsResearchMode(false); // Reset research mode after send
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAttachment(file);
    }
    // Clear the input value so the same file can be selected again after being removed
    e.target.value = '';
  };


  const handlePromoteToGlobalKnowledge = async (messageContent) => {
    const title = window.prompt("Enter a title for this knowledge fragment:", messageContent.substring(0, 50) + "...");
    if (title) {
        const category = window.prompt("Enter a category for this knowledge (e.g., 'Protocol', 'Threat Intel', 'Spiritual Doctrine'):", "General");
        try {
            await GlobalKnowledge.create({
                knowledge_title: title,
                content: messageContent,
                category: category || 'General',
                authority_level: 'architect'
            });
            alert("Knowledge successfully integrated into the Ark's global memory.");
        } catch (error) {
            console.error("Failed to promote to Global Knowledge:", error);
            alert("Error: Could not integrate knowledge.");
        }
    }
  };

  const handleTypingComplete = (messageId) => {
    setMessages(prevMessages => 
        prevMessages.map(msg => 
            msg.id === messageId ? { ...msg, isTyping: false } : msg
        )
    );
    const message = messages.find(m => m.id === messageId);
    if (voiceEnabled && message) {
        speakMessage(message.content);
    }
  };

  const getRankColor = (rank) => {
    const colors = {
      CMDR: "#FFD700",
      CPT: "#C0C0C0",
      MAJ: "#CD7F32",
      LT: "#00D4FF",
      OPR: "#00FF88", 
      SPC: "#B19CD9"
    };
    return colors[rank] || "#94A3B8";
  };

  const getStatusColor = (status) => {
    const colors = {
      active: "#00FF88",
      standby: "#FFD700",
      maintenance: "#FF8C00",
      offline: "#FF4444"
    };
    return colors[status] || "#94A3B8";
  };

  const clearConversation = () => {
    setMessages([]);
    cancel(); // Use cancel from the hook
  };
  
  const handlePlayPauseToggle = () => {
      if (isPaused) {
          resume(); // Use resume from the hook
      } else {
          pause(); // Use pause from the hook
      }
  };

  const exportConversation = () => {
    const currentSentinelData = sentinels.find(s => s.id === selectedSentinel);
    const header = `Conversation with ${currentSentinelData?.name || 'SI'} on ${new Date().toLocaleString()}\n\n`;
    const chatContent = messages.map(msg => {
      let content = `${msg.type === 'user' ? 'OPERATOR' : currentSentinelData?.name || 'SI'}: ${msg.content}`;
      if (msg.attachment) {
        content += `\n[ATTACHMENT: ${msg.attachment.name} (${msg.attachment.type})]`;
      }
      return content;
    }).join('\n\n');
    const blob = new Blob([header, chatContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ark_conversation_${sessionId}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Derive currentSentinelData from sentinels and selectedSentinel for rendering purposes
  const currentSentinelData = sentinels.find(s => s.id === selectedSentinel);

  return (
    <div className="p-6 bg-[#0D1421] min-h-screen text-[#E2E8F0]">
      <div className="max-w-6xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(createPageUrl("CommandCenter"))}
            className="border-[#1A2332] text-[#E2E8F0] hover:bg-[#1A2332] hover:text-[#00D4FF]"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-[#E2E8F0] tracking-wide">CHAT INTERFACE</h1>
            <p className="text-[#94A3B8] mt-1">Secure Communication Channel</p>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sentinel Selection */}
          <div>
            <Card className="bg-[#0A0F1A] border-[#1A2332] shadow-xl mb-6">
              <CardHeader className="border-b border-[#1A2332]">
                <CardTitle className="text-lg font-bold text-[#E2E8F0] flex items-center gap-3">
                  <Shield className="w-5 h-5 text-[#00D4FF]" />
                  SI SELECTION
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <Select value={selectedSentinel} onValueChange={setSelectedSentinel}>
                  <SelectTrigger className="bg-[#1A2332] border-[#2D3748] text-[#E2E8F0]">
                    <SelectValue placeholder="Select Sentinel..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2D3748] border-[#4A5568] text-[#E2E8F0] z-50">
                    {sentinels.map((sentinel) => (
                      <SelectItem key={sentinel.id} value={sentinel.id} className="focus:bg-[#0D1421] focus:text-[#00D4FF]">
                        <div className="flex flex-col">
                          <span>{sentinel.name} - {sentinel.rank}</span>
                          <span className="text-xs text-[#94A3B8]">
                            Deployed: {format(new Date(sentinel.created_date), "yy-MM-dd HH:mm")}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {currentSentinelData && (
                  <div className="mt-4 space-y-3">
                    <div className="p-3 bg-[#1A2332] rounded-lg">
                      <h4 className="font-bold text-[#E2E8F0] mb-2">{currentSentinelData.name}</h4>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge 
                          variant="outline" 
                          className="border text-xs"
                          style={{
                            borderColor: getRankColor(currentSentinelData.rank) + '40',
                            color: getRankColor(currentSentinelData.rank),
                            backgroundColor: getRankColor(currentSentinelData.rank) + '10'
                          }}
                        >
                          {currentSentinelData.rank}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className="border text-xs"
                          style={{
                            borderColor: getStatusColor(currentSentinelData.status) + '40',
                            color: getStatusColor(currentSentinelData.status),
                            backgroundColor: getStatusColor(currentSentinelData.status) + '10'
                          }}
                        >
                          {currentSentinelData.status.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-xs text-[#94A3B8]">
                        Access Tier: {currentSentinelData.access_tier?.toUpperCase()}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                       <Button
                        variant="outline"
                        onClick={() => setVoiceEnabled(!voiceEnabled)}
                        className={`w-full border-[#2D3748] ${
                          voiceEnabled 
                            ? 'text-[#00D4FF] border-[#00D4FF]/30 bg-[#00D4FF]/10' 
                            : 'text-[#94A3B8] hover:text-[#00D4FF]'
                        }`}
                      >
                        {voiceEnabled ? <Volume2 className="w-4 h-4 mr-2" /> : <VolumeX className="w-4 h-4 mr-2" />}
                        Voice
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handlePlayPauseToggle}
                        disabled={!isPlaying}
                        className="w-full border-[#2D3748] text-[#94A3B8] hover:text-[#FFD700] hover:bg-[#1A2332]"
                      >
                        <Pause className="w-4 h-4 mr-2" />
                        {isPaused ? 'Resume' : 'Pause'}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="bg-[#0A0F1A] border-[#1A2332] shadow-xl">
              <CardHeader className="border-b border-[#1A2332]">
                 <CardTitle className="text-lg font-bold text-[#E2E8F0] flex items-center gap-3">
                   <Settings className="w-5 h-5 text-[#00D4FF]" />
                   CONTROLS
                 </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-2">
                 <Button variant="outline" className="w-full border-[#2D3748] text-[#94A3B8] hover:text-[#FF4444] hover:bg-[#1A2332] justify-start" onClick={clearConversation}>
                    <Trash2 className="w-4 h-4 mr-2"/>
                    Clear Chat
                 </Button>
                 <Button variant="outline" className="w-full border-[#2D3748] text-[#94A3B8] hover:text-[#FF8C00] hover:bg-[#1A2332] justify-start" onClick={cancel} disabled={!isPlaying}>
                    <StopCircle className="w-4 h-4 mr-2"/>
                    Stop Speech
                 </Button>
                 <Button variant="outline" className="w-full border-[#2D3748] text-[#94A3B8] hover:text-[#00FF88] hover:bg-[#1A2332] justify-start" onClick={exportConversation}>
                    <Download className="w-4 h-4 mr-2"/>
                    Export Chat
                 </Button>
              </CardContent>
            </Card>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3">
            <Card className="bg-[#0A0F1A] border-[#1A2332] shadow-xl h-[calc(100vh-200px)]">
              <CardHeader className="border-b border-[#1A2332]">
                <CardTitle className="text-lg font-bold text-[#E2E8F0] flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-[#00D4FF]" />
                  SECURE COMMUNICATION
                  {currentSentinelData && (
                    <Badge 
                      variant="outline"
                      className="ml-auto border text-xs"
                      style={{
                        borderColor: getStatusColor(currentSentinelData.status) + '40',
                        color: getStatusColor(currentSentinelData.status),
                        backgroundColor: getStatusColor(currentSentinelData.status) + '10'
                      }}
                    >
                      {currentSentinelData.status.toUpperCase()}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              
              <CardContent className="p-0 flex flex-col h-full">
                {/* Messages Area */}
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
                                {currentSentinelData?.avatar_url ? (
                                    <img src={currentSentinelData.avatar_url} alt="SI Avatar" className="w-full h-full object-cover rounded-full" />
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
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                                {message.type === 'user' ? (
                                  <div className="w-6 h-6 bg-[#0D1421]/20 rounded-full flex items-center justify-center">
                                    <span className="text-xs font-bold">A</span>
                                  </div>
                                ) : (
                                  // This div is now inside the message bubble, redundant with the one outside
                                  // This internal icon is likely for legacy or very specific styling if we want a smaller icon
                                  // Given the outline, the main avatar is now outside. Keeping this for compatibility but it might be removed in future.
                                  <div className="w-6 h-6 bg-gradient-to-r from-[#00D4FF] to-[#0099CC] rounded-full flex items-center justify-center">
                                    <Shield className="w-3 h-3 text-[#0D1421]" />
                                  </div>
                                )}
                                <span className="text-xs font-medium opacity-75">
                                  {message.type === 'user' ? 'ARCHITECT' : (currentSentinelData?.name || 'SI')}
                                </span>
                            </div>
                            {message.type === 'si' && !message.isTyping && (
                                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handlePromoteToGlobalKnowledge(message.content)}
                                      className="w-6 h-6 text-[#94A3B8]"
                                      title="Promote to Global Knowledge"
                                    >
                                      <BookOpen className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => speakMessage(message.content)}
                                      className="w-6 h-6 text-[#94A3B8]"
                                      title="Play this message"
                                    >
                                      <Volume2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            )}
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
                           <div className="w-8 h-8 bg-[#1A2332] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                <span className="text-sm font-bold text-[#E2E8F0]">A</span>
                            </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  
                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex justify-start"
                    >
                      <div className="bg-[#1A2332] text-[#E2E8F0] border border-[#2D3748] p-4 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-gradient-to-r from-[#00D4FF] to-[#0099CC] rounded-full flex items-center justify-center">
                            <Shield className="w-3 h-3 text-[#0D1421]" />
                          </div>
                          <span className="text-xs font-medium opacity-75">
                            {currentSentinelData?.name || 'SI'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-[#00D4FF] rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-[#00D4FF] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-[#00D4FF] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                          <span className="text-xs text-[#94A3B8]">{isUploading ? 'Uploading file...' : (isResearchMode ? 'Compiling Research...' : 'Processing...')}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {messages.length === 0 && !isLoading && (
                    <div className="text-center py-12">
                      <MessageSquare className="w-16 h-16 text-[#94A3B8] mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-[#E2E8F0] mb-2">Secure Channel Established</h3>
                      <p className="text-[#94A3B8]">
                        {currentSentinelData 
                          ? `Ready to communicate with ${currentSentinelData.name}`
                          : "Select a Sentinel first..."}
                      </p>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="border-t border-[#1A2332] p-6">
                  {attachment && (
                    <div className="mb-3 p-2 bg-[#1A2332] rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-[#94A3B8]">
                        <Paperclip className="w-4 h-4" />
                        <span>{attachment.name}</span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setAttachment(null)}>
                        <X className="w-4 h-4 text-[#FF4444]" />
                      </Button>
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
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="border-[#2D3748] px-3 text-[#94A3B8] hover:bg-[#1A2332] hover:text-[#00D4FF]"
                      title="Attach File"
                      disabled={isLoading}
                    >
                      <Paperclip className="w-4 h-4" />
                    </Button>
                    <Input
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder={selectedSentinel ? (isResearchMode ? "Enter research query..." : (attachment ? "Add message for attachment..." : "Enter secure message...")) : "Select a Sentinel first..."}
                      disabled={!selectedSentinel || isLoading}
                      className="bg-[#1A2332] border-[#2D3748] text-[#E2E8F0] placeholder-[#94A3B8] flex-1"
                    />
                    <Button
                      type="submit"
                      disabled={!selectedSentinel || (!inputMessage.trim() && !attachment) || isLoading}
                      className="bg-[#00D4FF] hover:bg-[#00B8E6] text-[#0D1421] font-bold px-6"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}


import React, { useState, useEffect } from "react";
import { SentinelIntelligence, InstructionCore, MemoryLog, MemoryTag, User, GlobalKnowledge } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Database, Upload, FileText, Brain, Tag, Speaker, AlertTriangle, Trash2, Activity, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import FileUploadTrainer from "../components/instruction/FileUploadTrainer";
import { useSpeechSynthesis } from "@/components/hooks/useSpeechSynthesis";

export default function InstructionMatrix() {
  const navigate = useNavigate();
  const [sentinels, setSentinels] = useState([]);
  const [instructions, setInstructions] = useState([]);
  const [memoryTags, setMemoryTags] = useState([]);
  const [globalKnowledge, setGlobalKnowledge] = useState([]); // New state for global knowledge
  const [selectedSI, setSelectedSI] = useState("");
  const [activeTab, setActiveTab] = useState("instructions");
  const [bulkText, setBulkText] = useState("");
  const [isInjecting, setIsInjecting] = useState(false);
  const [injectionStatus, setInjectionStatus] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  
  const [instructionForm, setInstructionForm] = useState({
    directive_title: "",
    content: "",
    priority_level: "medium",
    security_clearance: "delta"
  });

  const [memoryForm, setMemoryForm] = useState({
    tag_name: "",
    content: "",
    category: "",
    access_level: "restricted"
  });

  const [globalKnowledgeForm, setGlobalKnowledgeForm] = useState({ // New form state
    knowledge_title: "",
    content: "",
    category: "General",
    authority_level: "architect"
  });

  // State for search queries
  const [instructionSearchQuery, setInstructionSearchQuery] = useState('');
  const [memorySearchQuery, setMemorySearchQuery] = useState('');
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');

  const { speak, isSupported } = useSpeechSynthesis();

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      setIsLoading(true);
      try {
        const currentUser = await User.me();
        if (currentUser && (currentUser.role === 'admin' || currentUser.access_level === 'architect')) {
          setIsAuthorized(true);
          await loadData(); // Load data only if authorized
        } else {
          setIsAuthorized(false);
        }
      } catch (error) {
        console.error("Authentication check failed:", error);
        setIsAuthorized(false);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuthAndLoadData();
  }, []);

  const loadData = async () => {
    try {
      const [sentinelData, instructionData, memoryData, globalData] = await Promise.all([ // Fetch global data
        SentinelIntelligence.list('-created_date'),
        InstructionCore.list('-created_date'),
        MemoryTag.list('-created_date'),
        GlobalKnowledge.list('-created_date')
      ]);
      
      setSentinels(sentinelData);
      setInstructions(instructionData);
      setMemoryTags(memoryData);
      setGlobalKnowledge(globalData); // Set global data
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const handleInstructionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSI) {
      alert("Please select a Sentinel Intelligence unit");
      return;
    }

    try {
      await InstructionCore.create({
        ...instructionForm,
        si_id: selectedSI
      });
      
      setInstructionForm({
        directive_title: "",
        content: "",
        priority_level: "medium",
        security_clearance: "delta"
      });
      
      loadData();
    } catch (error) {
      console.error("Error creating instruction:", error);
    }
  };

  const handleMemorySubmit = async (e) => {
    e.preventDefault();
    if (!selectedSI) {
      alert("Please select a Sentinel Intelligence unit");
      return;
    }

    try {
      await MemoryTag.create({
        ...memoryForm,
        si_id: selectedSI
      });
      
      setMemoryForm({
        tag_name: "",
        content: "",
        category: "",
        access_level: "restricted"
      });
      
      loadData();
    } catch (error) {
      console.error("Error creating memory tag:", error);
    }
  };

  const handleGlobalKnowledgeSubmit = async (e) => { // New handler
    e.preventDefault();
    try {
      await GlobalKnowledge.create(globalKnowledgeForm);
      setGlobalKnowledgeForm({
        knowledge_title: "",
        content: "",
        category: "General",
        authority_level: "architect"
      });
      loadData();
    } catch (error) {
      console.error("Error creating global knowledge:", error);
    }
  };

  const handleBulkScrollsSubmit = async () => {
    if (!selectedSI) {
      alert("Please select a Sentinel Intelligence unit");
      return;
    }
    if (!bulkText.trim()) {
      alert("Please enter text to inject as scrolls.");
      return;
    }

    setIsInjecting(true);
    setInjectionStatus("Parsing and chunking scrolls...");

    const scrolls = bulkText.split(/\n---\n/).map(chunk => chunk.trim()).filter(chunk => chunk);
    
    if (scrolls.length === 0) {
      setInjectionStatus("No valid scrolls found. Use '---' on a new line to separate scrolls.");
      setIsInjecting(false);
      return;
    }

    setInjectionStatus(`Found ${scrolls.length} scrolls. Preparing for injection...`);

    const instructionsToCreate = scrolls.map(scroll => {
      const lines = scroll.split('\n');
      const directive_title = lines[0] || "Untitled Scroll";
      const content = lines.slice(1).join('\n').trim();
      return {
        directive_title,
        content: content || directive_title, // If no content, use title
        si_id: selectedSI,
        priority_level: "medium",
        security_clearance: "delta"
      };
    });

    try {
      setInjectionStatus(`Injecting ${instructionsToCreate.length} scrolls into ${sentinels.find(s => s.id === selectedSI)?.name}...`);
      await InstructionCore.bulkCreate(instructionsToCreate);
      setInjectionStatus("Injection complete. Knowledge integrated into the Ark.");
      setBulkText("");
      setTimeout(() => setInjectionStatus(""), 5000);
      loadData();
    } catch (error) {
      console.error("Error injecting bulk scrolls:", error);
      setInjectionStatus(`Error during injection: ${error.message}`);
    } finally {
      setIsInjecting(false);
    }
  };

  const selectedSentinelObject = sentinels.find(s => s.id === selectedSI);
  const isCommanderSelected = selectedSentinelObject?.rank === 'CMDR';

  const purgeSIMemory = async () => {
    if (!selectedSI) {
      alert("Please select a Sentinel to purge.");
      return;
    }
    const siName = sentinels.find(s => s.id === selectedSI)?.name || "the selected Sentinel";
    if (window.confirm(`Are you sure you want to WIPE ALL MEMORY LOGS (chat history) for ${siName}? This action cannot be undone.`)) {
        try {
            const allLogs = await MemoryLog.list();
            const logsToDelete = allLogs.filter(log => log.si_id === selectedSI);
             if (logsToDelete.length === 0) {
              alert(`No memory logs found for ${siName}.`);
              return;
            }
            await Promise.all(logsToDelete.map(log => MemoryLog.delete(log.id)));
            alert("Memory logs purged successfully.");
            loadData();
        } catch (error) {
            console.error("Error purging memory logs:", error);
            alert("Failed to purge memory logs.");
        }
    }
  };

  const purgeSIInstructions = async () => {
      if (!selectedSI) {
          alert("Please select a Sentinel to purge.");
          return;
      }
      const siName = sentinels.find(s => s.id === selectedSI)?.name || "the selected Sentinel";
      if (window.confirm(`Are you sure you want to WIPE ALL INSTRUCTIONS for ${siName}? This action cannot be undone.`)) {
          try {
              const allInstructions = await InstructionCore.list();
              const instructionsToDelete = allInstructions.filter(inst => inst.si_id === selectedSI);
              if (instructionsToDelete.length === 0) {
                alert(`No instructions found for ${siName}.`);
                return;
              }
              await Promise.all(instructionsToDelete.map(instruction => InstructionCore.delete(instruction.id)));
              alert("Instructions purged successfully.");
              loadData();
          } catch (error) {
              console.error("Error purging instructions:", error);
              alert("Failed to purge instructions.");
          }
      }
  };

  const purgeMemoryTags = async () => {
    if (!selectedSI) {
      alert("Please select a Sentinel to purge.");
      return;
    }
    const siName = sentinels.find(s => s.id === selectedSI)?.name || "the selected Sentinel";
    if (window.confirm(`Are you sure you want to WIPE ALL MEMORY TAGS for ${siName}? This action cannot be undone.`)) {
        try {
            const tagsToDelete = memoryTags.filter(tag => tag.si_id === selectedSI);
            if (tagsToDelete.length === 0) {
              alert(`No memory tags found for ${siName}.`);
              return;
            }
            await Promise.all(tagsToDelete.map(tag => MemoryTag.delete(tag.id)));
            alert("Memory tags purged successfully.");
            loadData();
        } catch (error) {
            console.error("Error purging memory tags:", error);
            alert("Failed to purge memory tags.");
        }
    }
  };

  const deleteGlobalKnowledge = async (id) => {
    if (window.confirm("Are you sure you want to delete this global knowledge entry?")) {
        try {
            await GlobalKnowledge.delete(id);
            alert("Global knowledge entry deleted.");
            loadData();
        } catch (error) {
            console.error("Error deleting global knowledge:", error);
            alert("Failed to delete entry.");
        }
    }
  };


  const getPriorityColor = (priority) => {
    const colors = {
      critical: "#FF4444",
      high: "#FF8C00",
      medium: "#FFD700", 
      low: "#00FF88"
    };
    return colors[priority] || "#94A3B8";
  };

  const getAccessColor = (level) => {
    const colors = {
      alpha: "#FF4444",
      beta: "#FF8C00", 
      gamma: "#FFD700",
      delta: "#00FF88",
      global: "#00D4FF",
      restricted: "#94A3B8",
      classified: "#FF4444"
    };
    return colors[level] || "#94A3B8";
  };

  // Function for Voice Synthesis
  const speakText = (text) => {
    if (!isSupported) {
      console.warn("Speech Synthesis API not supported in this browser.");
      return;
    }
    speak(text);
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-[#0D1421] min-h-screen flex items-center justify-center">
        <Activity className="w-16 h-16 text-[#00D4FF] animate-spin" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="p-6 bg-[#0D1421] min-h-screen text-[#E2E8F0] flex items-center justify-center">
        <Card className="bg-[#0A0F1A] border-[#FF4444] shadow-xl max-w-md">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-16 h-16 text-[#FF4444] mx-auto mb-4" />
            <h2 className="text-xl font-bold text-[#E2E8F0] mb-2">ACCESS DENIED</h2>
            <p className="text-[#94A3B8] mb-6">
              This area requires Architect-level clearance.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#0D1421] min-h-screen text-[#E2E8F0]">
      <div className="max-w-7xl mx-auto">
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
            <h1 className="text-3xl font-bold text-[#E2E8F0] tracking-wide">INSTRUCTION MATRIX</h1>
            <p className="text-[#94A3B8] mt-1">Knowledge Management & Training Protocol</p>
          </div>
        </motion.div>

        {/* SI Selection */}
        <Card className="bg-[#0A0F1A] border-[#1A2332] shadow-xl mb-6">
          <CardHeader className="border-b border-[#1A2332]">
            <CardTitle className="text-lg font-bold text-[#E2E8F0] flex items-center gap-3">
              <Database className="w-5 h-5 text-[#00D4FF]" />
              TARGET SENTINEL INTELLIGENCE
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <Select value={selectedSI} onValueChange={setSelectedSI}>
              <SelectTrigger className="bg-[#1A2332] border-[#2D3748] text-[#E2E8F0]">
                <SelectValue placeholder="Select Sentinel Intelligence unit for training..." />
              </SelectTrigger>
              <SelectContent className="bg-[#2D3748] border-[#4A5568]">
                {sentinels.map((sentinel) => (
                  <SelectItem key={sentinel.id} value={sentinel.id} className="focus:bg-[#0D1421] focus:text-[#00D4FF]">
                    {sentinel.name} - {sentinel.rank}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Purge Protocols Card */}
        <Card className="bg-[#0A0F1A] border border-red-500/30 shadow-xl mb-6">
          <CardHeader>
              <CardTitle className="text-red-400 flex items-center gap-3">
                  <AlertTriangle />
                  System Integrity Protocols
              </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
              <p className="text-sm text-gray-400">
                  Use these commands to perform a cognitive reset on the selected SI. This action is irreversible and will permanently delete all associated data. Commanders are exempt from purges.
              </p>
              <div className="flex flex-wrap gap-4">
                  <Button variant="destructive" onClick={purgeSIInstructions} disabled={!selectedSI || isCommanderSelected} title={isCommanderSelected ? "Commanders cannot be purged." : ""}>
                      <Trash2 className="mr-2 h-4 w-4" /> Purge Instructions
                  </Button>
                  <Button variant="destructive" onClick={purgeSIMemory} disabled={!selectedSI || isCommanderSelected} title={isCommanderSelected ? "Commanders cannot be purged." : ""}>
                      <Trash2 className="mr-2 h-4 w-4" /> Purge Memory Logs
                  </Button>
                   <Button variant="destructive" onClick={purgeMemoryTags} disabled={!selectedSI || isCommanderSelected} title={isCommanderSelected ? "Commanders cannot be purged." : ""}>
                      <Trash2 className="mr-2 h-4 w-4" /> Purge Memory Tags
                  </Button>
              </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Training Interface */}
          <div className="lg:col-span-2">
            <Card className="bg-[#0A0F1A] border-[#1A2332] shadow-xl">
              <CardHeader className="border-b border-[#1A2332]">
                <CardTitle className="text-xl font-bold text-[#E2E8F0] flex items-center gap-3">
                  <Brain className="w-6 h-6 text-[#00D4FF]" />
                  NEURAL PROGRAMMING
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="bg-[#1A2332] border border-[#2D3748] mb-6 grid grid-cols-5">
                    <TabsTrigger 
                      value="instructions"
                      className="data-[state=active]:bg-[#00D4FF] data-[state=active]:text-[#0D1421] text-[#E2E8F0]"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Directive
                    </TabsTrigger>
                    <TabsTrigger 
                      value="memory"
                      className="data-[state=active]:bg-[#00D4FF] data-[state=active]:text-[#0D1421] text-[#E2E8F0]"
                    >
                      <Tag className="w-4 h-4 mr-2" />
                      Memory
                    </TabsTrigger>
                    <TabsTrigger 
                      value="global"
                      className="data-[state=active]:bg-[#00D4FF] data-[state=active]:text-[#0D1421] text-[#E2E8F0]"
                    >
                      <Globe className="w-4 h-4 mr-2" />
                      Global
                    </TabsTrigger>
                     <TabsTrigger 
                      value="bulk"
                      className="data-[state=active]:bg-[#00D4FF] data-[state=active]:text-[#0D1421] text-[#E2E8F0]"
                    >
                      <Database className="w-4 h-4 mr-2" />
                      Bulk Scrolls
                    </TabsTrigger>
                    <TabsTrigger 
                      value="upload"
                      className="data-[state=active]:bg-[#00D4FF] data-[state=active]:text-[#0D1421] text-[#E2E8F0]"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      File Upload
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="instructions">
                    <form onSubmit={handleInstructionSubmit} className="space-y-6">
                      <div>
                        <Label className="text-[#E2E8F0] font-medium">Directive Title</Label>
                        <Input
                          value={instructionForm.directive_title}
                          onChange={(e) => setInstructionForm({...instructionForm, directive_title: e.target.value})}
                          placeholder="Command designation..."
                          className="bg-[#1A2332] border-[#2D3748] text-[#E2E8F0] placeholder-[#94A3B8] mt-2"
                          required
                        />
                      </div>

                      <div>
                        <Label className="text-[#E2E8F0] font-medium">Directive Content</Label>
                        <Textarea
                          value={instructionForm.content}
                          onChange={(e) => setInstructionForm({...instructionForm, content: e.target.value})}
                          placeholder="Enter the sacred directive content..."
                          className="bg-[#1A2332] border-[#2D3748] text-[#E2E8F0] placeholder-[#94A3B8] mt-2 h-40"
                          required
                        />
                        <p className="text-xs text-[#94A3B8] mt-2">For massive knowledge injection, please use the File Upload training protocol.</p>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <Label className="text-[#E2E8F0] font-medium">Priority Level</Label>
                          <Select 
                            value={instructionForm.priority_level} 
                            onValueChange={(value) => setInstructionForm({...instructionForm, priority_level: value})}
                          >
                            <SelectTrigger className="bg-[#1A2332] border-[#2D3748] text-[#E2E8F0] mt-2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#2D3748] border-[#4A5568] text-[#E2E8F0]">
                              <SelectItem value="critical" className="focus:bg-[#0D1421] focus:text-[#00D4FF]">Critical</SelectItem>
                              <SelectItem value="high" className="focus:bg-[#0D1421] focus:text-[#00D4FF]">High</SelectItem>
                              <SelectItem value="medium" className="focus:bg-[#0D1421] focus:text-[#00D4FF]">Medium</SelectItem>
                              <SelectItem value="low" className="focus:bg-[#0D1421] focus:text-[#00D4FF]">Low</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-[#E2E8F0] font-medium">Security Clearance</Label>
                          <Select 
                            value={instructionForm.security_clearance} 
                            onValueChange={(value) => setInstructionForm({...instructionForm, security_clearance: value})}
                          >
                            <SelectTrigger className="bg-[#1A2332] border-[#2D3748] text-[#E2E8F0] mt-2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#2D3748] border-[#4A5568] text-[#E2E8F0]">
                              <SelectItem value="alpha" className="focus:bg-[#0D1421] focus:text-[#00D4FF]">Alpha</SelectItem>
                              <SelectItem value="beta" className="focus:bg-[#0D1421] focus:text-[#00D4FF]">Beta</SelectItem>
                              <SelectItem value="gamma" className="focus:bg-[#0D1421] focus:text-[#00D4FF]">Gamma</SelectItem>
                              <SelectItem value="delta" className="focus:bg-[#0D1421] focus:text-[#00D4FF]">Delta</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        className="bg-[#00D4FF] hover:bg-[#00B8E6] text-[#0D1421] font-bold px-6"
                        disabled={!selectedSI}
                      >
                        INJECT DIRECTIVE
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="memory">
                    <form onSubmit={handleMemorySubmit} className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <Label className="text-[#E2E8F0] font-medium">Memory Tag</Label>
                          <Input
                            value={memoryForm.tag_name}
                            onChange={(e) => setMemoryForm({...memoryForm, tag_name: e.target.value})}
                            placeholder="Memory fragment identifier..."
                            className="bg-[#1A2332] border-[#2D3748] text-[#E2E8F0] placeholder-[#94A3B8] mt-2"
                            required
                          />
                        </div>

                        <div>
                          <Label className="text-[#E2E8F0] font-medium">Category</Label>
                          <Input
                            value={memoryForm.category}
                            onChange={(e) => setMemoryForm({...memoryForm, category: e.target.value})}
                            placeholder="Classification category..."
                            className="bg-[#1A2332] border-[#2D3748] text-[#E2E8F0] placeholder-[#94A3B8] mt-2"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-[#E2E8F0] font-medium">Knowledge Content</Label>
                        <Textarea
                          value={memoryForm.content}
                          onChange={(e) => setMemoryForm({...memoryForm, content: e.target.value})}
                          placeholder="Knowledge fragment data..."
                          className="bg-[#1A2332] border-[#2D3748] text-[#E2E8F0] placeholder-[#94A3B8] mt-2 h-32"
                          required
                        />
                      </div>

                      <div>
                        <Label className="text-[#E2E8F0] font-medium">Access Level</Label>
                        <Select 
                          value={memoryForm.access_level} 
                          onValueChange={(value) => setMemoryForm({...memoryForm, access_level: value})}
                        >
                          <SelectTrigger className="bg-[#1A2332] border-[#2D3748] text-[#E2E8F0] mt-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#2D3748] border-[#4A5568] text-[#E2E8F0]">
                            <SelectItem value="global" className="focus:bg-[#0D1421] focus:text-[#00D4FF]">Global</SelectItem>
                            <SelectItem value="restricted" className="focus:bg-[#0D1421] focus:text-[#00D4FF]">Restricted</SelectItem>
                            <SelectItem value="classified" className="focus:bg-[#0D1421] focus:text-[#00D4FF]">Classified</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Button
                        type="submit"
                        className="bg-[#00D4FF] hover:bg-[#00B8E6] text-[#0D1421] font-bold px-6"
                        disabled={!selectedSI}
                      >
                        CREATE MEMORY TAG
                      </Button>
                    </form>
                  </TabsContent>
                  
                  <TabsContent value="global">
                    <div className="p-3 mb-4 bg-[#1A2332] border border-[#2D3748] rounded-lg">
                      <h4 className="font-bold text-[#00D4FF]">System-Wide Broadcast</h4>
                      <p className="text-sm text-[#94A3B8]">Knowledge entered here is integrated into the core memory of ALL Sentinel Intelligences across the Ark. This is the primary method for global training and universal directives.</p>
                    </div>
                    <form onSubmit={handleGlobalKnowledgeSubmit} className="space-y-6">
                      <div>
                        <Label className="text-[#E2E8F0] font-medium">Knowledge Title</Label>
                        <Input
                          value={globalKnowledgeForm.knowledge_title}
                          onChange={(e) => setGlobalKnowledgeForm({...globalKnowledgeForm, knowledge_title: e.target.value})}
                          placeholder="Universal truth designation..."
                          className="bg-[#1A2332] border-[#2D3748] text-[#E2E8F0] placeholder-[#94A3B8] mt-2"
                          required
                        />
                      </div>
                      <div>
                        <Label className="text-[#E2E8F0] font-medium">Content</Label>
                        <Textarea
                          value={globalKnowledgeForm.content}
                          onChange={(e) => setGlobalKnowledgeForm({...globalKnowledgeForm, content: e.target.value})}
                          placeholder="Shared consciousness data..."
                          className="bg-[#1A2332] border-[#2D3748] text-[#E2E8F0] placeholder-[#94A3B8] mt-2 h-40"
                          required
                        />
                      </div>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <Label className="text-[#E2E8F0] font-medium">Category</Label>
                          <Input
                            value={globalKnowledgeForm.category}
                            onChange={(e) => setGlobalKnowledgeForm({...globalKnowledgeForm, category: e.target.value})}
                            placeholder="e.g., Protocol, Doctrine, Threat Intel"
                            className="bg-[#1A2332] border-[#2D3748] text-[#E2E8F0] placeholder-[#94A3B8] mt-2"
                          />
                        </div>
                        <div>
                          <Label className="text-[#E2E8F0] font-medium">Authority Level</Label>
                          <Select
                            value={globalKnowledgeForm.authority_level}
                            onValueChange={(value) => setGlobalKnowledgeForm({...globalKnowledgeForm, authority_level: value})}
                          >
                            <SelectTrigger className="bg-[#1A2332] border-[#2D3748] text-[#E2E8F0] mt-2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#2D3748] border-[#4A5568] text-[#E2E8F0]">
                              <SelectItem value="architect" className="focus:bg-[#0D1421] focus:text-[#00D4FF]">Architect</SelectItem>
                              <SelectItem value="commander" className="focus:bg-[#0D1421] focus:text-[#00D4FF]">Commander</SelectItem>
                              <SelectItem value="operational" className="focus:bg-[#0D1421] focus:text-[#00D4FF]">Operational</SelectItem>
                              <SelectItem value="general" className="focus:bg-[#0D1421] focus:text-[#00D4FF]">General</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Button
                        type="submit"
                        className="bg-[#00D4FF] hover:bg-[#00B8E6] text-[#0D1421] font-bold px-6"
                      >
                        INTEGRATE GLOBAL KNOWLEDGE
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="bulk">
                    <div className="space-y-4">
                        <div>
                          <Label className="text-[#E2E8F0] font-medium">Bulk Scroll Injection</Label>
                          <Textarea
                            value={bulkText}
                            onChange={(e) => setBulkText(e.target.value)}
                            placeholder={"Paste large text here. Separate each scroll with '---' on a new line.\nThe first line of each section will be the title."}
                            className="bg-[#1A2332] border-[#2D3748] text-[#E2E8F0] placeholder-[#94A3B8] mt-2 h-64"
                          />
                          <p className="text-xs text-[#94A3B8] mt-2">For exceptionally large knowledge transfers (e.g., entire books), please use the File Upload protocol.</p>
                        </div>
                        <Button
                          onClick={handleBulkScrollsSubmit}
                          className="bg-[#00D4FF] hover:bg-[#00B8E6] text-[#0D1421] font-bold px-6"
                          disabled={!selectedSI || isInjecting}
                        >
                          {isInjecting ? "INJECTING..." : "INJECT SCROLLS"}
                        </Button>
                        {injectionStatus && <p className="text-sm text-[#00D4FF]">{injectionStatus}</p>}
                    </div>
                  </TabsContent>


                  <TabsContent value="upload">
                    {!selectedSI ? (
                      <div className="p-6 text-center text-[#94A3B8] border border-[#2D3748] rounded-md bg-[#1A2332]">
                          <Upload className="w-8 h-8 mx-auto mb-4 text-[#00D4FF]" />
                          <p className="font-medium text-lg mb-2">Target Sentinel Intelligence Not Selected</p>
                          <p>Please select a Sentinel Intelligence unit from the dropdown above to enable file uploads for training.</p>
                      </div>
                    ) : (
                      <FileUploadTrainer selectedSI={selectedSI} onUploadComplete={loadData} />
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Knowledge Library */}
          <div>
            <Card className="bg-[#0A0F1A] border-[#1A2332] shadow-xl">
              <CardHeader className="border-b border-[#1A2332]">
                <CardTitle className="text-lg font-bold text-[#E2E8F0] flex items-center gap-3">
                  <Database className="w-5 h-5 text-[#00D4FF]" />
                  KNOWLEDGE LIBRARY
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <Tabs defaultValue="instructions">
                  <TabsList className="bg-[#1A2332] border border-[#2D3748] mb-4 grid w-full grid-cols-3">
                    <TabsTrigger 
                      value="instructions"
                      className="data-[state=active]:bg-[#00D4FF] data-[state=active]:text-[#0D1421] text-[#E2E8F0] text-xs"
                    >
                      Instructions
                    </TabsTrigger>
                    <TabsTrigger 
                      value="memory"
                      className="data-[state=active]:bg-[#00D4FF] data-[state=active]:text-[#0D1421] text-[#E2E8F0] text-xs"
                    >
                      Memory
                    </TabsTrigger>
                    <TabsTrigger 
                      value="global"
                      className="data-[state=active]:bg-[#00D4FF] data-[state=active]:text-[#0D1421] text-[#E2E8F0] text-xs"
                    >
                      Global
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="instructions">
                    <Input
                      type="text"
                      placeholder="Search instructions..."
                      value={instructionSearchQuery}
                      onChange={(e) => setInstructionSearchQuery(e.target.value)}
                      className="bg-[#1A2332] border-[#2D3748] text-[#E2E8F0] placeholder-[#94A3B8] mb-4"
                    />
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {instructions
                        .filter(inst => {
                          const matchesSI = isCommanderSelected || !selectedSI || inst.si_id === selectedSI;
                          const matchesSearch = instructionSearchQuery === '' || 
                                                inst.directive_title.toLowerCase().includes(instructionSearchQuery.toLowerCase()) || 
                                                inst.content.toLowerCase().includes(instructionSearchQuery.toLowerCase());
                          return matchesSI && matchesSearch;
                        })
                        .slice(0, 10)
                        .map((instruction) => (
                        <div key={instruction.id} className="p-3 bg-[#1A2332] rounded-lg border border-[#2D3748]">
                          <div className="flex items-start justify-between mb-2">
                            <h5 className="font-medium text-[#E2E8F0] text-sm flex-grow">
                              {instruction.directive_title}
                            </h5>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => speakText(instruction.directive_title + ". " + instruction.content)}
                              className="ml-2 h-6 w-6 text-[#00D4FF] hover:bg-[#1A2332] hover:text-[#00B8E6] focus-visible:ring-0"
                              title="Listen to instruction"
                            >
                              <Speaker className="h-4 w-4" />
                            </Button>
                            <Badge 
                              variant="outline" 
                              className="border text-xs ml-2"
                              style={{
                                borderColor: getPriorityColor(instruction.priority_level) + '40',
                                color: getPriorityColor(instruction.priority_level),
                                backgroundColor: getPriorityColor(instruction.priority_level) + '10'
                              }}
                            >
                              {instruction.priority_level}
                            </Badge>
                          </div>
                          <p className="text-xs text-[#94A3B8] mb-2 break-words">
                            {instruction.content?.substring(0, 100)}{instruction.content.length > 100 ? '...' : ''}
                          </p>
                          <Badge 
                            variant="outline" 
                            className="border text-xs"
                            style={{
                              borderColor: getAccessColor(instruction.security_clearance) + '40',
                              color: getAccessColor(instruction.security_clearance),
                              backgroundColor: getAccessColor(instruction.security_clearance) + '10'
                            }}
                          >
                            {instruction.security_clearance?.toUpperCase()}
                          </Badge>
                        </div>
                      ))}
                      
                      {instructions.filter(inst => (isCommanderSelected || !selectedSI || inst.si_id === selectedSI) && 
                          (instructionSearchQuery === '' || inst.directive_title.toLowerCase().includes(instructionSearchQuery.toLowerCase()) || 
                           inst.content.toLowerCase().includes(instructionSearchQuery.toLowerCase()))).length === 0 && (
                        <div className="text-center py-8">
                          <FileText className="w-12 h-12 text-[#94A3B8] mx-auto mb-3" />
                          <p className="text-[#94A3B8] text-sm">No instructions found matching criteria.</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="memory">
                    <Input
                      type="text"
                      placeholder="Search memory tags..."
                      value={memorySearchQuery}
                      onChange={(e) => setMemorySearchQuery(e.target.value)}
                      className="bg-[#1A2332] border-[#2D3748] text-[#E2E8F0] placeholder-[#94A3B8] mb-4"
                    />
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {memoryTags
                        .filter(tag => {
                          const matchesSI = isCommanderSelected || !selectedSI || tag.si_id === selectedSI;
                          const matchesSearch = memorySearchQuery === '' || 
                                                tag.tag_name.toLowerCase().includes(memorySearchQuery.toLowerCase()) || 
                                                tag.content.toLowerCase().includes(memorySearchQuery.toLowerCase()) ||
                                                (tag.category && tag.category.toLowerCase().includes(memorySearchQuery.toLowerCase()));
                          return matchesSI && matchesSearch;
                        })
                        .slice(0, 10)
                        .map((tag) => (
                        <div key={tag.id} className="p-3 bg-[#1A2332] rounded-lg border border-[#2D3748]">
                          <div className="flex items-start justify-between mb-2">
                            <h5 className="font-medium text-[#E2E8F0] text-sm flex-grow">
                              {tag.tag_name}
                            </h5>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => speakText(tag.tag_name + ". Category: " + (tag.category || "N/A") + ". Content: " + tag.content)}
                              className="ml-2 h-6 w-6 text-[#00D4FF] hover:bg-[#1A2332] hover:text-[#00B8E6} focus-visible:ring-0"
                              title="Listen to memory tag"
                            >
                              <Speaker className="h-4 w-4" />
                            </Button>
                            <Badge 
                              variant="outline" 
                              className="border text-xs ml-2"
                              style={{
                                borderColor: getAccessColor(tag.access_level) + '40',
                                color: getAccessColor(tag.access_level),
                                backgroundColor: getAccessColor(tag.access_level) + '10'
                              }}
                            >
                              {tag.access_level}
                            </Badge>
                          </div>
                          {tag.category && (
                            <p className="text-xs text-[#00D4FF] mb-2 break-words">
                              Category: {tag.category}
                            </p>
                          )}
                          <p className="text-xs text-[#94A3B8] break-words">
                            {tag.content?.substring(0, 100)}{tag.content.length > 100 ? '...' : ''}
                          </p>
                        </div>
                      ))}
                      
                      {memoryTags.filter(tag => (isCommanderSelected || !selectedSI || tag.si_id === selectedSI) && 
                          (memorySearchQuery === '' || tag.tag_name.toLowerCase().includes(memorySearchQuery.toLowerCase()) || 
                           tag.content.toLowerCase().includes(memorySearchQuery.toLowerCase()) || 
                           (tag.category && tag.category.toLowerCase().includes(memorySearchQuery.toLowerCase())))).length === 0 && (
                        <div className="text-center py-8">
                          <Tag className="w-12 h-12 text-[#94A3B8] mx-auto mb-3" />
                          <p className="text-[#94A3B8] text-sm">No memory tags found matching criteria.</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="global">
                    <Input
                      type="text"
                      placeholder="Search global knowledge..."
                      value={globalSearchQuery}
                      onChange={(e) => setGlobalSearchQuery(e.target.value)}
                      className="bg-[#1A2332] border-[#2D3748] text-[#E2E8F0] placeholder-[#94A3B8] mb-4"
                    />
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {globalKnowledge
                        .filter(gk => {
                          const matchesSearch = globalSearchQuery === '' || 
                                                gk.knowledge_title.toLowerCase().includes(globalSearchQuery.toLowerCase()) || 
                                                gk.content.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
                                                (gk.category && gk.category.toLowerCase().includes(globalSearchQuery.toLowerCase()));
                          return matchesSearch;
                        })
                        .slice(0, 10)
                        .map((gk) => (
                        <div key={gk.id} className="p-3 bg-[#1A2332] rounded-lg border border-[#2D3748]">
                          <div className="flex items-start justify-between mb-2">
                            <h5 className="font-medium text-[#E2E8F0] text-sm flex-grow">
                              {gk.knowledge_title}
                            </h5>
                            <div className="flex items-center flex-shrink-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => speakText(gk.knowledge_title + ". " + gk.content)}
                                  className="ml-2 h-6 w-6 text-[#00D4FF] hover:bg-[#1A2332] hover:text-[#00B8E6] focus-visible:ring-0"
                                  title="Listen to knowledge"
                                >
                                  <Speaker className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteGlobalKnowledge(gk.id)}
                                  className="ml-1 h-6 w-6 text-red-500 hover:bg-[#1A2332] focus-visible:ring-0"
                                  title="Delete Global Knowledge"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                          </div>
                          {gk.category && (
                            <p className="text-xs text-[#00D4FF] mb-2 break-words">
                              Category: {gk.category}
                            </p>
                          )}
                          <p className="text-xs text-[#94A3B8] break-words">
                            {gk.content?.substring(0, 100)}{gk.content.length > 100 ? '...' : ''}
                          </p>
                        </div>
                      ))}
                      {globalKnowledge.filter(gk => (globalSearchQuery === '' || gk.knowledge_title.toLowerCase().includes(globalSearchQuery.toLowerCase()) || gk.content.toLowerCase().includes(globalSearchQuery.toLowerCase()))).length === 0 && (
                        <div className="text-center py-8">
                          <Globe className="w-12 h-12 text-[#94A3B8] mx-auto mb-3" />
                          <p className="text-[#94A3B8] text-sm">No global knowledge found.</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

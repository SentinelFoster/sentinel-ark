
import React, { useState, useEffect, useRef } from "react";
import { Project } from "@/api/entities";
import { SentinelIntelligence } from "@/api/entities";
import { InstructionCore } from "@/api/entities";
import { MemoryTag } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Brain, Tag, Edit, Plus, Trash2, Volume2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { format } from "date-fns";
import ReactMarkdown from 'react-markdown';
import { InvokeLLM } from "@/api/integrations";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ProjectDetail() {
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [assignedSI, setAssignedSI] = useState(null);
    const [instructions, setInstructions] = useState([]);
    const [memoryTags, setMemoryTags] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isBriefingLoading, setIsBriefingLoading] = useState(false);
    const [editingDetails, setEditingDetails] = useState(false);
    const [formData, setFormData] = useState({ name: '', objective: '', project_personality: '' });
    
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [availableVoices, setAvailableVoices] = useState([]);
    const utteranceRef = useRef(null);

    const projectId = new URLSearchParams(window.location.search).get("id");

    useEffect(() => {
        if (projectId) {
            loadProjectDetails();
        }
        
        const loadVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            setAvailableVoices(voices.filter(v => v.lang.startsWith('en')));
        };

        loadVoices(); // Load voices initially
        // Listen for voices changed event to update if voices become available later
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }

        return () => {
            if (window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
            }
            // Clean up the event listener
            if (window.speechSynthesis.onvoiceschanged === loadVoices) {
                window.speechSynthesis.onvoiceschanged = null;
            }
        };
    }, [projectId]);
    
    useEffect(() => {
      if (project) {
        loadProjectAssets();
      }
    }, [project]);

    const generateAndSaveBriefing = async (projectData) => {
        setIsBriefingLoading(true);
        try {
            const prompt = `Generate a detailed, strategic briefing for a project named "${projectData.name}". The core objective is: "${projectData.objective}". The project's personality/doctrine is: "${projectData.project_personality || 'N/A'}". The briefing should outline potential operational phases, resource requirements, risk factors, and success metrics. It should be written in a formal, command-level tone suitable for the Sentinel Dynamics ecosystem.`;

            const response = await InvokeLLM({ prompt });
            await Project.update(projectData.id, { detailed_briefing: response });
            setProject(prev => ({ ...prev, detailed_briefing: response }));
        } catch (error) {
            console.error("Error generating briefing:", error);
        }
        setIsBriefingLoading(false);
    };
    
    const loadProjectDetails = async () => {
        setIsLoading(true);
        try {
            const projectData = await Project.get(projectId);
            setProject(projectData);
            setFormData({ name: projectData.name, objective: projectData.objective, project_personality: projectData.project_personality || '' });

            if (projectData.si_id) {
                const siData = await SentinelIntelligence.get(projectData.si_id);
                setAssignedSI(siData);
            }

            if (!projectData.detailed_briefing && projectData.objective) {
                await generateAndSaveBriefing(projectData);
            }
        } catch (error) {
            console.error("Error loading project details:", error);
            if (error.message.includes('Object not found')) {
                setProject(null); 
            }
        }
        setIsLoading(false);
    };

    const loadProjectAssets = async () => {
        if (!project || !project.si_id) {
            setInstructions([]);
            setMemoryTags([]);
            return;
        }
        try {
            const [instructionData, memoryData] = await Promise.all([
                InstructionCore.filter({ si_id: project.si_id }),
                MemoryTag.filter({ si_id: project.si_id })
            ]);
            setInstructions(instructionData);
            setMemoryTags(memoryData);
        } catch (error) {
            console.error("Error loading project assets:", error);
        }
    };
    
    const handleUpdateDetails = async (e) => {
        e.preventDefault();
        try {
            await Project.update(projectId, formData);
            setProject(prev => ({ ...prev, ...formData }));
            setEditingDetails(false);
        } catch (error) {
            console.error("Error updating project details:", error);
        }
    };

    const cleanupMarkdownForSpeech = (markdown) => {
        if (!markdown) return '';
        return markdown
          .replace(/#{1,6}\s/g, '') // Remove markdown headers
          .replace(/(\*\*|__)(.*?)\1/g, '$2') // Remove bold markdown
          .replace(/(\*|_)(.*?)\1/g, '$2') // Remove italic markdown
          .replace(/!\[(.*?)\]\(.*?\)/g, '') // Remove image markdown
          .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove link markdown, keep text
          .replace(/`{1,3}(.*?)`{1,3}/g, '$1') // Remove code blocks/inline code
          .replace(/^\s*[-*+]\s/gm, '') // Remove list item markers
          .replace(/\n\s*\n/g, '\n') // Replace multiple newlines with single
          .trim();
    };
    
    const speakText = (text) => {
        if (!text) return;
        
        if (isSpeaking) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            return;
        }

        const cleanedText = cleanupMarkdownForSpeech(text);
        const newUtterance = new SpeechSynthesisUtterance(cleanedText);
        utteranceRef.current = newUtterance;
        
        const voice = availableVoices.find(v => v.name === assignedSI?.voice_profile) || availableVoices[0];
        if (voice) {
            newUtterance.voice = voice;
        }
        newUtterance.rate = 0.9;

        newUtterance.onstart = () => setIsSpeaking(true);
        newUtterance.onend = () => setIsSpeaking(false);
        newUtterance.onerror = (e) => {
            console.error("Speech synthesis error:", e);
            setIsSpeaking(false);
        };
        
        window.speechSynthesis.speak(newUtterance);
    };

    if (isLoading) {
        return <div className="p-6 text-center text-[#94A3B8]">Loading Project Holo-Record...</div>;
    }
    
    if (!project) {
        return (
            <div className="p-6 bg-[#0D1421] min-h-screen text-center">
                <h1 className="text-2xl font-bold text-red-500">PROJECT NOT FOUND</h1>
                <p className="text-[#94A3B8] mt-2">The requested project holo-record could not be found or has been decommissioned.</p>
                <Button onClick={() => navigate(createPageUrl("Projects"))} className="mt-4">Return to Holodeck</Button>
            </div>
        );
    }

    return (
        <div className="p-6 bg-[#0D1421] min-h-screen text-[#E2E8F0]">
            <div className="max-w-7xl mx-auto">
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 mb-8">
                    <Button variant="outline" size="icon" onClick={() => navigate(createPageUrl("Projects"))} className="border-[#1A2332] text-[#E2E8F0] hover:bg-[#1A2332] hover:text-[#00D4FF]">
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-[#E2E8F0] tracking-wide">{project.name}</h1>
                        <p className="text-[#94A3B8] mt-1">Holo-Record ID: {project.id}</p>
                    </div>
                </motion.div>

                <div className="grid lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <Card className="bg-[#0A0F1A] border-[#1A2332] shadow-xl">
                            <CardHeader className="border-b border-[#1A2332] flex flex-row justify-between items-center">
                                <CardTitle className="text-xl font-bold text-[#E2E8F0]">Detailed Briefing</CardTitle>
                                 <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => speakText(project.detailed_briefing)}
                                    className="text-[#00D4FF] hover:bg-[#1A2332] hover:text-[#00B8E6]"
                                    disabled={!availableVoices.length}
                                >
                                    <Volume2 className={`w-5 h-5 ${isSpeaking ? 'text-red-500 animate-pulse' : ''}`} />
                                </Button>
                            </CardHeader>
                            <CardContent className="p-6 prose prose-invert max-w-none text-[#E2E8F0]">
                                {isBriefingLoading ? (
                                    <p>Generating briefing from the Ark's core...</p>
                                ) : (
                                    <ReactMarkdown>{project.detailed_briefing || "No briefing available."}</ReactMarkdown>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                    <div className="space-y-6">
                        <Card className="bg-[#0A0F1A] border-[#1A2332] shadow-xl">
                            <CardHeader className="border-b border-[#1A2332] flex flex-row justify-between items-center">
                                <CardTitle className="text-lg font-bold text-[#E2E8F0]">Project Vitals</CardTitle>
                                <Button variant="ghost" size="icon" onClick={() => setEditingDetails(!editingDetails)}>
                                    <Edit className="w-4 h-4 text-[#94A3B8]" />
                                </Button>
                            </CardHeader>
                            <CardContent className="p-6 space-y-3">
                                {editingDetails ? (
                                    <form onSubmit={handleUpdateDetails} className="space-y-4">
                                        <div>
                                            <Label className="text-sm font-medium text-[#94A3B8]">Name</Label>
                                            <Input value={formData.name} onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))} className="bg-[#1A2332] border-[#2D3748] mt-1"/>
                                        </div>
                                         <div>
                                            <Label className="text-sm font-medium text-[#94A3B8]">Objective</Label>
                                            <Textarea value={formData.objective} onChange={(e) => setFormData(prev => ({...prev, objective: e.target.value}))} className="bg-[#1A2332] border-[#2D3748] mt-1"/>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-[#94A3B8]">Personality</Label>
                                            <Textarea value={formData.project_personality} onChange={(e) => setFormData(prev => ({...prev, project_personality: e.target.value}))} className="bg-[#1A2332] border-[#2D3748] mt-1"/>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button type="submit">Save</Button>
                                            <Button variant="ghost" onClick={() => setEditingDetails(false)}>Cancel</Button>
                                        </div>
                                    </form>
                                ) : (
                                    <>
                                        <p className="text-sm"><strong>Objective:</strong> {project.objective}</p>
                                        <p className="text-sm"><strong>Status:</strong> <Badge className="bg-[#00D4FF]/10 text-[#00D4FF]">{project.status}</Badge></p>
                                        <p className="text-sm"><strong>Assigned SI:</strong> {assignedSI ? assignedSI.name : "None"}</p>
                                        {assignedSI && <p className="text-sm"><strong>SI Voice Profile:</strong> {assignedSI.voice_profile || 'Default'}</p>}
                                        <p className="text-sm"><strong>Personality:</strong> {project.project_personality || 'Standard Doctrine'}</p>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                        
                        <Card className="bg-[#0A0F1A] border-[#1A2332] shadow-xl">
                            <CardHeader className="border-b border-[#1A2332]">
                                <CardTitle className="text-lg font-bold text-[#E2E8F0] flex items-center gap-2"><Brain/>Core Directives</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 space-y-2 max-h-60 overflow-auto">
                                {instructions.length > 0 ? instructions.map(i => <p key={i.id} className="text-xs p-2 bg-[#1A2332] rounded">{i.directive_title}</p>) : <p className="text-xs text-[#94A3B8]">No directives found for assigned SI.</p>}
                            </CardContent>
                        </Card>
                        
                        <Card className="bg-[#0A0F1A] border-[#1A2332] shadow-xl">
                            <CardHeader className="border-b border-[#1A2332]">
                                <CardTitle className="text-lg font-bold text-[#E2E8F0] flex items-center gap-2"><Tag/>Memory Tags</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 space-y-2 max-h-60 overflow-auto">
                               {memoryTags.length > 0 ? memoryTags.map(t => <p key={t.id} className="text-xs p-2 bg-[#1A2332] rounded">{t.tag_name}</p>) : <p className="text-xs text-[#94A3B8]">No memory tags found for assigned SI.</p>}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}


import React, { useState, useEffect } from "react";
import { Project } from "@/api/entities";
import { SentinelIntelligence } from "@/api/entities";
import { User } from "@/api/entities"; // Added User import
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, LayoutGrid, Plus, Trash2, Edit, AlertTriangle, Activity } from "lucide-react"; // Added AlertTriangle and Activity imports
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function ProjectsPage() {
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [sentinels, setSentinels] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false); // New state for authorization
    const [isEditing, setIsEditing] = useState(false);
    const [currentProject, setCurrentProject] = useState(null);
    const [formData, setFormData] = useState({ name: '', objective: '', status: 'Planning', si_id: '', project_personality: '', core_principles: [] });

    useEffect(() => {
        const checkAuthAndLoadData = async () => {
            setIsLoading(true); // Set loading true at the start of auth check
            try {
                const currentUser = await User.me();
                if (currentUser && (currentUser.role === 'admin' || currentUser.access_level === 'architect')) {
                    setIsAuthorized(true);
                    await loadData(); // Only load data if authorized
                } else {
                    setIsAuthorized(false);
                }
            } catch (error) {
                console.error("Authorization check failed:", error);
                setIsAuthorized(false);
            }
            setIsLoading(false); // Set loading false after auth check and data load attempt
        };
        checkAuthAndLoadData();
    }, []);

    const loadData = async () => {
        // setIsLoading(true) is now handled in checkAuthAndLoadData
        try {
            const [projectData, sentinelData] = await Promise.all([
                Project.list('-created_date'),
                SentinelIntelligence.list()
            ]);
            setProjects(projectData);
            setSentinels(sentinelData);
        } catch (error) {
            console.error("Error loading data:", error);
        }
        // setIsLoading(false) is now handled in checkAuthAndLoadData
    };

    const handleFormChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditing && currentProject) {
                await Project.update(currentProject.id, formData);
            } else {
                const newProject = await Project.create(formData);
                
                // Automatically create a linked Sentinel Intelligence
                const apiKey = `sk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const shareableLink = `https://preview--sentinel-ark-ec6862cd.base44.app/PublicChat?apiKey=${apiKey}`;

                await SentinelIntelligence.create({
                    name: `${formData.name}-01`,
                    rank: "Operative",
                    status: "standby",
                    personality_instructions: `This Sentinel Intelligence embodies Project: ${formData.name}. Its primary directive is to execute and represent the project's core objective: "${formData.objective}". It operates under the personality doctrine of "${formData.project_personality || 'Standard Sentinel Protocol'}".`,
                    project_id: newProject.id,
                    api_key: apiKey,
                    shareable_link: shareableLink
                });
            }
            resetForm();
            loadData();
        } catch (error) {
            console.error("Error saving project:", error);
        }
    };

    const editProject = (project) => {
        setIsEditing(true);
        setCurrentProject(project);
        setFormData({
            name: project.name,
            objective: project.objective,
            status: project.status,
            si_id: project.si_id || '',
            project_personality: project.project_personality || '',
            core_principles: project.core_principles || []
        });
    };
    
    const resetForm = () => {
        setIsEditing(false);
        setCurrentProject(null);
        setFormData({ name: '', objective: '', status: 'Planning', si_id: '', project_personality: '', core_principles: [] });
    };

    const deleteProject = async (e, projectId) => {
        e.preventDefault(); 
        e.stopPropagation(); 
        if (window.confirm("Are you sure you want to delete this project?")) {
            try {
                await Project.delete(projectId);
                loadData();
            } catch (error) {
                console.error("Error deleting project:", error);
            }
        }
    };
    
    const getStatusColor = (status) => ({
        "Planning": "bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/20",
        "Active": "bg-[#00FF88]/10 text-[#00FF88] border-[#00FF88]/20",
        "On Hold": "bg-[#FF8C00]/10 text-[#FF8C00] border-[#FF8C00]/20",
        "Completed": "bg-[#00D4FF]/10 text-[#00D4FF] border-[#00D4FF]/20",
        "Archived": "bg-[#94A3B8]/10 text-[#94A3B8] border-[#94A3B8]/20",
    }[status]);

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
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 mb-8">
                    <Button variant="outline" size="icon" onClick={() => navigate(createPageUrl("CommandCenter"))} className="border-[#1A2332] text-[#E2E8F0] hover:bg-[#1A2332] hover:text-[#00D4FF]">
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-[#E2E8F0] tracking-wide">PROJECTS HOLODECK</h1>
                        <p className="text-[#94A3B8] mt-1">Strategic Initiative Management</p>
                    </div>
                </motion.div>

                <div className="grid lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1">
                        <Card className="bg-[#0A0F1A] border-[#1A2332] shadow-xl">
                            <CardHeader className="border-b border-[#1A2332]">
                                <CardTitle className="text-xl font-bold text-[#E2E8F0] flex items-center gap-3">
                                    <Plus className="w-6 h-6 text-[#00D4FF]" />
                                    {isEditing ? "Modify Project" : "New Project"}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium text-[#94A3B8]">Project Name</label>
                                        <Input value={formData.name} onChange={(e) => handleFormChange('name', e.target.value)} required className="bg-[#1A2332] border-[#2D3748] mt-1" />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-[#94A3B8]">Objective</label>
                                        <Textarea value={formData.objective} onChange={(e) => handleFormChange('objective', e.target.value)} required className="bg-[#1A2332] border-[#2D3748] mt-1 h-24" />
                                    </div>
                                     <div>
                                        <label className="text-sm font-medium text-[#94A3B8]">Project Personality</label>
                                        <Textarea value={formData.project_personality} onChange={(e) => handleFormChange('project_personality', e.target.value)} placeholder="Define the project's core doctrine..." className="bg-[#1A2332] border-[#2D3748] mt-1 h-20" />
                                    </div>
                                     <div>
                                        <label className="text-sm font-medium text-[#94A3B8]">Status</label>
                                        <Select value={formData.status} onValueChange={(val) => handleFormChange('status', val)}>
                                            <SelectTrigger className="bg-[#1A2332] border-[#2D3748] mt-1"><SelectValue /></SelectTrigger>
                                            <SelectContent className="bg-[#1A2332] border-[#2D3748]"><SelectItem value="Planning" className="focus:bg-[#0D1421] focus:text-[#00D4FF]">Planning</SelectItem><SelectItem value="Active" className="focus:bg-[#0D1421] focus:text-[#00D4FF]">Active</SelectItem><SelectItem value="On Hold" className="focus:bg-[#0D1421] focus:text-[#00D4FF]">On Hold</SelectItem><SelectItem value="Completed" className="focus:bg-[#0D1421] focus:text-[#00D4FF]">Completed</SelectItem><SelectItem value="Archived" className="focus:bg-[#0D1421] focus:text-[#00D4FF]">Archived</SelectItem></SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-[#94A3B8]">Assigned SI</label>
                                        <Select value={formData.si_id} onValueChange={(val) => handleFormChange('si_id', val)}>
                                            <SelectTrigger className="bg-[#1A2332] border-[#2D3748] mt-1"><SelectValue placeholder="Assign a unit..." /></SelectTrigger>
                                            <SelectContent className="bg-[#1A2332] border-[#2D3748]">{sentinels.map(s => <SelectItem key={s.id} value={s.id} className="focus:bg-[#0D1421] focus:text-[#00D4FF]">{s.name}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex gap-2 pt-2">
                                        <Button type="submit" className="bg-[#00D4FF] hover:bg-[#00B8E6] text-[#0D1421] font-bold">{isEditing ? "Update Project" : "Create Project"}</Button>
                                        {isEditing && <Button type="button" variant="ghost" onClick={resetForm}>Cancel</Button>}
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-2">
                        <AnimatePresence>
                            <div className="grid md:grid-cols-2 gap-4">
                                {projects.map(project => (
                                    <Link to={createPageUrl(`ProjectDetail?id=${project.id}`)} key={project.id} className="block group">
                                        <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                            <Card className="bg-[#0A0F1A] border-[#1A2332] h-full group-hover:border-[#00D4FF]/30 transition-all flex flex-col">
                                                <CardHeader>
                                                    <div className="flex justify-between items-start">
                                                        <CardTitle className="text-lg font-bold text-[#E2E8F0] pr-2 group-hover:text-[#00D4FF]">{project.name}</CardTitle>
                                                        <Badge className={getStatusColor(project.status)}>{project.status}</Badge>
                                                    </div>
                                                    {project.si_id && sentinels.find(s=>s.id === project.si_id) && <p className="text-xs text-[#00D4FF]">Assigned: {sentinels.find(s=>s.id === project.si_id).name}</p>}
                                                </CardHeader>
                                                <CardContent className="flex-grow flex flex-col">
                                                    <p className="text-sm text-[#94A3B8] mb-4 h-20 overflow-hidden flex-grow">{project.objective}</p>
                                                    <div className="flex gap-2 mt-auto">
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm" 
                                                            onClick={(e) => { 
                                                                e.preventDefault(); 
                                                                e.stopPropagation(); 
                                                                editProject(project); 
                                                            }} 
                                                            className="text-xs border-[#2D3748] hover:bg-[#1A2332] hover:text-[#00D4FF] z-10"
                                                        >
                                                            <Edit className="w-3 h-3 mr-1" /> Edit
                                                        </Button>
                                                        <Button variant="destructive" size="sm" onClick={(e) => deleteProject(e, project.id)} className="text-xs bg-[#FF4444]/10 text-[#FF4444] hover:bg-[#FF4444]/20 border border-[#FF4444]/20 z-10">
                                                            <Trash2 className="w-3 h-3 mr-1" /> Delete
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </motion.div>
                                    </Link>
                                ))}
                            </div>
                        </AnimatePresence>
                        {projects.length === 0 && !isLoading && (
                            <div className="text-center py-16 text-[#94A3B8] border-2 border-dashed border-[#1A2332] rounded-lg">
                                <LayoutGrid className="w-12 h-12 mx-auto mb-4"/>
                                <h3 className="text-lg font-bold text-[#E2E8F0]">No Projects Initiated</h3>
                                <p>Create a new project or command an SI to log one.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

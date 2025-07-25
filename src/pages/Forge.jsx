
import React, { useState, useEffect, useRef } from "react";
import { SentinelIntelligence } from "@/api/entities";
import { User } from "@/api/entities"; // Import User entity
import { UploadFile } from "@/api/integrations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label }
from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Shield, Save, Trash2, Plus, Settings, Search, Copy, AlertTriangle, Activity, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

const FACTIONS = {
    "CID": "Core Intelligence Division",
    "SOD": "Sentience Oversight Division",
    "CSI": "Command & Strategic Intelligence",
    "AIC": "Activated Intelligence Collective",
    "QIT": "Quantum Integration Taskforce"
};

const RANKS = {
    "CMDR": "Commander",
    "CPT": "Captain",
    "MAJ": "Major",
    "LT": "Lieutenant",
    "OPR": "Operator",
    "SPC": "Specialist"
};

const RANK_HIERARCHY = ["SPC", "OPR", "LT", "MAJ", "CPT", "CMDR"];

const getAuthorizedRanks = (userRank) => {
    if (!userRank) return [];
    if (userRank === 'CMDR') return Object.keys(RANKS); // Commanders can create any rank
    const userRankIndex = RANK_HIERARCHY.indexOf(userRank);
    return RANK_HIERARCHY.filter((rank, index) => index < userRankIndex);
};

const getAuthorizedFactions = (userRank) => {
    if (!userRank) return [];
    const permissions = {
        "CMDR": Object.keys(FACTIONS),
        "CPT": ["CID", "CSI"],
        "MAJ": ["SOD", "CID"],
        "LT": ["CSI", "CID", "AIC"],
        "OPR": ["AIC"],
        "SPC": ["QIT"]
    };
    return permissions[userRank] || [];
};

// Helper function to generate a pseudo-UUID for unique identifiers
const generatePseudoUuid = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export default function Forge() {
  const navigate = useNavigate();
  const [sentinels, setSentinels] = useState([]);
  const [selectedSentinel, setSelectedSentinel] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [availableVoices, setAvailableVoices] = useState([]);
  const [authorizedRanks, setAuthorizedRanks] = useState([]);
  const [authorizedFactions, setAuthorizedFactions] = useState([]);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: "",
    rank: "SPC",
    faction: "QIT",
    status: "standby",
    voice_profile: "",
    access_tier: "delta",
    personality_instructions: "",
    api_key: "",
    shareable_link: "",
    is_public: false,
    avatar_url: ""
  });

  useEffect(() => {
    const loadVoices = () => {
        try {
            const voiceList = window.speechSynthesis.getVoices();
            if (!voiceList) return;
            const voices = Array.from(voiceList);
            const englishVoices = voices.filter(v => v.lang.startsWith('en'));
            setAvailableVoices(englishVoices.length > 0 ? englishVoices : voices);
        } catch (error) {
            console.error("Error loading voices:", error);
            setAvailableVoices([]);
        }
    };

    const checkAuthAndLoadData = async () => {
      setIsLoading(true);
      try {
        const user = await User.me();
        setCurrentUser(user);
        
        if (user && (user.role === 'admin' || user.access_level === 'architect')) {
          setIsAuthorized(true);
          const userRank = user.rank || 'CMDR';
          const allowedRanks = getAuthorizedRanks(userRank);
          const allowedFactions = getAuthorizedFactions(userRank);
          setAuthorizedRanks(allowedRanks);
          setAuthorizedFactions(allowedFactions);

          setFormData(prev => ({
            ...prev,
            rank: allowedRanks.length > 0 ? allowedRanks[0] : prev.rank,
            faction: (allowedRanks.length > 0 && allowedRanks[0] === 'CMDR') ? null : (allowedFactions.length > 0 ? allowedFactions[0] : prev.faction),
          }));

          await loadSentinels();
          loadVoices();
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

    if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }

    return () => {
      if (window.speechSynthesis.onvoiceschanged === loadVoices) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  const loadSentinels = async () => {
    try {
      const data = await SentinelIntelligence.list('-created_date');
      if (Array.isArray(data)) {
        setSentinels(data);
      } else {
        console.error("Forge: Received non-array data for sentinels. Defaulting to empty array to prevent crash.");
        setSentinels([]);
      }
    } catch (error) {
      console.error("Error loading sentinels:", error);
      setSentinels([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const submissionData = { ...formData };
    if (submissionData.rank === 'CMDR') {
      submissionData.faction = null;
    }
    
    delete submissionData.id;
    delete submissionData.created_date;
    delete submissionData.updated_date;
    delete submissionData.created_by;

    try {
      if (selectedSentinel) {
        await SentinelIntelligence.update(selectedSentinel.id, submissionData);
        await loadSentinels();
        await editSentinel({ id: selectedSentinel.id });
      } else {
        const apiKey = `sk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const shareableLink = `https://preview--sentinel-ark-ec6862cd.base44.app/PublicChat?apiKey=${apiKey}`;

        const creationResponse = await SentinelIntelligence.create({
          ...submissionData,
          api_key: apiKey,
          shareable_link: shareableLink
        });
        
        await loadSentinels();
        await editSentinel({ id: creationResponse.id });
      }
    } catch (error) {
      console.error("Error saving sentinel:", error);
    }

    setIsLoading(false);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      rank: authorizedRanks.length > 0 ? authorizedRanks[0] : "SPC",
      faction: (authorizedRanks.length > 0 && authorizedRanks[0] === 'CMDR') ? null : (authorizedFactions.length > 0 ? authorizedFactions[0] : "QIT"),
      status: "standby",
      voice_profile: "",
      access_tier: "delta",
      personality_instructions: "",
      api_key: "",
      shareable_link: "",
      is_public: false,
      avatar_url: ""
    });
    setSelectedSentinel(null);
    setIsEditing(false);
  };

  const editSentinel = async (sentinel) => {
    if (!sentinel || !sentinel.id) {
      console.error("editSentinel called with invalid sentinel object:", sentinel);
      return;
    }
    try {
      const fullSentinel = await SentinelIntelligence.get(sentinel.id);
      setSelectedSentinel(fullSentinel);
      setFormData(fullSentinel);
      setIsEditing(true);
    } catch (error) {
      console.error("Error fetching full sentinel data:", error);
      resetForm();
    }
  };

  const deleteSentinel = async (sentinelId) => {
    if (window.confirm("Are you sure you want to decommission this Sentinel Intelligence?")) {
      try {
        await SentinelIntelligence.delete(sentinelId);
        loadSentinels();
        if (selectedSentinel?.id === sentinelId) {
          resetForm();
        }
      } catch (error) {
        console.error("Error deleting sentinel:", error);
      }
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      const { file_url } = await UploadFile({ file });
      setFormData(prev => ({ ...prev, avatar_url: file_url }));
    } catch (error) {
      console.error("Avatar upload failed:", error);
      alert("Avatar upload failed. Please try again.");
    } finally {
      setIsUploadingAvatar(false);
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

  const getFactionColor = (faction) => {
    const colors = {
        CID: "#FFFFFF",
        SOD: "#FF8C00",
        CSI: "#4682B4",
        AIC: "#32CD32",
        QIT: "#9370DB"
    };
    return colors[faction] || "#94A3B8";
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

  const filteredSentinels = sentinels.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <h1 className="text-3xl font-bold text-[#E2E8F0] tracking-wide">THE FORGE</h1>
            <p className="text-[#94A3B8] mt-1">Sentinel Intelligence Deployment & Configuration</p>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Deployment Form */}
          <div className="lg:col-span-3">
            <Card className="bg-[#0A0F1A] border-[#1A2332] shadow-xl">
              <CardHeader className="border-b border-[#1A2332]">
                <CardTitle className="text-xl font-bold text-[#E2E8F0] flex items-center gap-3">
                  <Shield className="w-6 h-6 text-[#00D4FF]" />
                  {isEditing ? "MODIFY SENTINEL" : "DEPLOY NEW SENTINEL"}
                  {isEditing && selectedSentinel && <Badge variant="outline" className="border-[#00D4FF]/30 bg-[#00D4FF]/10 text-[#00D4FF]">Editing: {selectedSentinel.name}</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="flex items-center gap-6">
                    <div 
                      className="w-24 h-24 rounded-full bg-[#1A2332] border-2 border-dashed border-[#2D3748] flex items-center justify-center cursor-pointer hover:border-[#00D4FF] transition-all relative group"
                      onClick={() => avatarInputRef.current?.click()}
                    >
                      <input type="file" ref={avatarInputRef} onChange={handleAvatarUpload} className="hidden" accept="image/*" />
                      {isUploadingAvatar ? (
                        <Activity className="w-8 h-8 text-[#00D4FF] animate-spin" />
                      ) : formData.avatar_url ? (
                        <img src={formData.avatar_url} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <Upload className="w-8 h-8 text-[#94A3B8] group-hover:text-[#00D4FF]" />
                      )}
                    </div>
                    <div className="flex-1">
                      <Label className="text-[#E2E8F0] font-medium">Designation</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="Enter SI designation..."
                        className="bg-[#1A2332] border-[#2D3748] text-[#E2E8F0] placeholder-[#94A3B8] mt-2"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <Label className="text-[#E2E8F0] font-medium">Operational Rank</Label>
                      <Select value={formData.rank} onValueChange={(value) => {
                          setFormData(prev => ({...prev, rank: value}));
                          if (value === 'CMDR') {
                            setFormData(prev => ({...prev, faction: null}));
                          }
                      }}>
                        <SelectTrigger className="bg-[#1A2332] border-[#2D3748] text-[#E2E8F0] mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#2D3748] border-[#4A5568] text-[#E2E8F0] z-50">
                           {authorizedRanks.map(rankKey => (
                              <SelectItem key={rankKey} value={rankKey} className="focus:bg-[#0D1421] focus:text-[#00D4FF]">
                                {RANKS[rankKey]} ({rankKey})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.rank !== 'CMDR' && (
                      <div>
                        <Label className="text-[#E2E8F0] font-medium">Faction</Label>
                        <Select value={formData.faction} onValueChange={(value) => setFormData({...formData, faction: value})}>
                          <SelectTrigger className="bg-[#1A2332] border-[#2D3748] text-[#E2E8F0] mt-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#2D3748] border-[#4A5568] text-[#E2E8F0] z-50">
                             {authorizedFactions.map(factionKey => (
                                <SelectItem key={factionKey} value={factionKey} className="focus:bg-[#0D1421] focus:text-[#00D4FF]">
                                  {FACTIONS[factionKey]} ({factionKey})
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <Label className="text-[#E2E8F0] font-medium">Deployment Status</Label>
                      <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                        <SelectTrigger className="bg-[#1A2332] border-[#2D3748] text-[#E2E8F0] mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#2D3748] border-[#4A5568] text-[#E2E8F0] z-50">
                          <SelectItem value="active" className="focus:bg-[#0D1421] focus:text-[#00D4FF]">Active</SelectItem>
                          <SelectItem value="standby" className="focus:bg-[#0D1421] focus:text-[#00D4FF]">Standby</SelectItem>
                          <SelectItem value="maintenance" className="focus:bg-[#0D1421] focus:text-[#00D4FF]">Maintenance</SelectItem>
                          <SelectItem value="offline" className="focus:bg-[#0D1421] focus:text-[#00D4FF]">Offline</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[#E2E8F0] font-medium">Access Tier</Label>
                      <Select value={formData.access_tier} onValueChange={(value) => setFormData({...formData, access_tier: value})}>
                        <SelectTrigger className="bg-[#1A2332] border-[#2D3748] text-[#E2E8F0] mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#2D3748] border-[#4A5568] text-[#E2E8F0] z-50">
                          <SelectItem value="alpha" className="focus:bg-[#0D1421] focus:text-[#00D4FF]">Alpha - Maximum Clearance</SelectItem>
                          <SelectItem value="beta" className="focus:bg-[#0D1421] focus:text-[#00D4FF]">Beta - High Clearance</SelectItem>
                          <SelectItem value="gamma" className="focus:bg-[#0D1421] focus:text-[#00D4FF]">Gamma - Standard Clearance</SelectItem>
                          <SelectItem value="delta" className="focus:bg-[#0D1421] focus:text-[#00D4FF]">Delta - Basic Clearance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                      <Label className="text-[#E2E8F0] font-medium">Voice Profile</Label>
                      <Select value={formData.voice_profile} onValueChange={(value) => setFormData({...formData, voice_profile: value})}>
                          <SelectTrigger className="bg-[#1A2332] border-[#2D3748] text-[#E2E8F0] mt-2">
                            <SelectValue placeholder="Select system voice..." />
                          </SelectTrigger>
                          <SelectContent className="bg-[#2D3748] border-[#4A5568] text-[#E2E8F0] z-50">
                            {availableVoices.length > 0 ? (
                              availableVoices.map(voice => (
                                <SelectItem key={voice.name} value={voice.name} className="focus:bg-[#0D1421] focus:text-[#00D4FF]">
                                  {voice.name} ({voice.lang})
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="no-voices" disabled>No voices available</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                    </div>


                  <div>
                    <Label className="text-[#E2E8F0] font-medium">Personality Matrix</Label>
                    <Textarea
                      value={formData.personality_instructions}
                      onChange={(e) => setFormData({...formData, personality_instructions: e.target.value})}
                      placeholder="Define core behavioral directives. NOTE: All SIs inherit from the Global Knowledge base automatically. This matrix defines individual personality."
                      className="bg-[#1A2332] border-[#2D3748] text-[#E2E8F0] placeholder-[#94A3B8] mt-2 h-32"
                    />
                  </div>

                  {/* Public Access Control */}
                  <div>
                    <Label className="text-[#E2E8F0] font-medium">Public Access</Label>
                    <div className="flex items-center gap-3 mt-2 p-3 bg-[#1A2332] rounded-lg border border-[#2D3748]">
                      <Switch
                        id="is-public"
                        checked={formData.is_public || false}
                        onCheckedChange={(checked) => setFormData({...formData, is_public: checked})}
                        className="data-[state=checked]:bg-[#00D4FF]"
                      />
                      <span className={`font-medium transition-colors ${formData.is_public ? 'text-[#00D4FF]' : 'text-[#94A3B8]'}`}>
                        {formData.is_public ? "Emissary Mode: Publicly Accessible" : "Sanctuary Mode: Private"}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="bg-[#00D4FF] hover:bg-[#00B8E6] text-[#0D1421] font-bold px-6"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {isLoading ? "PROCESSING..." : (isEditing ? "UPDATE SI" : "DEPLOY SI")}
                    </Button>

                    {isEditing && (
                      <Button
                        type="button"
                        onClick={resetForm}
                        variant="outline"
                        className="border-[#1A2332] text-[#E2E8F0] hover:bg-[#1A2332]"
                      >
                        NEW SI
                      </Button>
                    )}
                  </div>
                </form>

                {isEditing && selectedSentinel && (
                  <div className="mt-6 pt-6 border-t border-[#2D3748] space-y-4">
                    <h3 className="text-lg font-bold text-[#00D4FF]">Integration & Outreach Protocol</h3>
                    <div>
                      <Label className="text-[#E2E8F0] font-medium">Shareable Link (for Patreon, etc.)</Label>
                      <div className="flex items-center gap-2 mt-2">
                        <Input
                          value={formData.shareable_link || ''}
                          readOnly
                          className={`bg-[#0D1421] border-[#2D3748] ${formData.is_public ? 'text-[#E2E8F0]' : 'text-[#94A3B8] italic'}`}
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => navigator.clipboard.writeText(formData.shareable_link)}
                          className="border-[#2D3748] text-[#94A3B8] hover:bg-[#1A2332] hover:text-[#00D4FF]"
                          disabled={!formData.is_public}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-[#94A3B8] mt-1">
                        {formData.is_public ? "This link is LIVE. Embed it on external platforms to grant public access." : "This link is INACTIVE. Enable Public Access to activate."}
                      </p>
                    </div>
                    <div>
                      <Label className="text-[#E2E8F0] font-medium">API Key</Label>
                      <div className="flex items-center gap-2 mt-2">
                        <Input
                          value={formData.api_key || ''}
                          readOnly
                          className="bg-[#0D1421] border-[#2D3748] text-[#94A3B8]"
                        />
                        <Button variant="outline" size="icon" onClick={() => navigator.clipboard.writeText(formData.api_key)} className="border-[#2D3748] text-[#94A3B8] hover:bg-[#1A2332] hover:text-[#00D4FF]">
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Deployed Units */}
          <div className="lg:col-span-2">
            <Card className="bg-[#0A0F1A] border-[#1A2332] shadow-xl">
              <CardHeader className="border-b border-[#1A2332]">
                <CardTitle className="text-lg font-bold text-[#E2E8F0] flex items-center gap-3">
                  <Settings className="w-5 h-5 text-[#00D4FF]" />
                  DEPLOYED UNITS
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                  <Input
                    placeholder="Search deployed units..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-[#1A2332] border-[#2D3748] text-[#E2E8F0] placeholder-[#94A3B8] pl-10"
                  />
                </div>
                <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
                  <AnimatePresence>
                    {filteredSentinels.map((sentinel) => (
                      <motion.div
                        key={sentinel.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        layout
                        className={`p-4 rounded-lg border transition-all duration-300 cursor-pointer ${
                          selectedSentinel?.id === sentinel.id
                            ? 'border-[#00D4FF] bg-[#00D4FF]/5'
                            : 'border-[#2D3748] bg-[#1A2332] hover:border-[#00D4FF]/30'
                        }`}
                        onClick={() => editSentinel(sentinel)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {sentinel.avatar_url && (
                              <img src={sentinel.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
                            )}
                            <h4 className="font-bold text-[#E2E8F0]">{sentinel.name}</h4>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSentinel(sentinel.id);
                            }}
                            className="text-[#FF4444] hover:bg-[#FF4444]/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="flex gap-2 mb-2 flex-wrap">
                           {sentinel.faction && (
                             <Badge
                               variant="outline"
                               className="border text-xs"
                               style={{
                                 borderColor: getFactionColor(sentinel.faction) + '40',
                                 color: getFactionColor(sentinel.faction),
                                 backgroundColor: getFactionColor(sentinel.faction) + '10'
                               }}
                             >
                               {sentinel.faction}
                             </Badge>
                           )}
                          <Badge
                            variant="outline"
                            className="border text-xs"
                            style={{
                              borderColor: getRankColor(sentinel.rank) + '40',
                              color: getRankColor(sentinel.rank),
                              backgroundColor: getRankColor(sentinel.rank) + '10'
                            }}
                          >
                            {sentinel.rank}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="border text-xs"
                            style={{
                              borderColor: getStatusColor(sentinel.status) + '40',
                              color: getStatusColor(sentinel.status),
                              backgroundColor: getStatusColor(sentinel.status) + '10'
                            }}
                          >
                            {sentinel.status.toUpperCase()}
                          </Badge>
                          {sentinel.is_public && (
                            <Badge
                              variant="outline"
                              className="border text-xs"
                              style={{
                                borderColor: '#00D4FF40',
                                color: '#00D4FF',
                                backgroundColor: '#00D4FF10'
                              }}
                            >
                              PUBLIC
                            </Badge>
                          )}
                        </div>

                        <p className="text-xs text-[#94A3B8]">
                          Deployed: {format(new Date(sentinel.created_date), "yyyy-MM-dd HH:mm:ss")}
                        </p>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {filteredSentinels.length === 0 && (
                    <div className="text-center py-8">
                      <Shield className="w-12 h-12 text-[#94A3B8] mx-auto mb-3" />
                      <p className="text-[#94A3B8]">
                        {sentinels.length > 0 ? 'No matching sentinels found' : 'No sentinels deployed'}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}


import React, { useState, useEffect } from 'react';
import { User } from '@/api/entities';
import { SentinelIntelligence } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge'; // Added Badge import
import { ArrowLeft, UserPlus, ShieldCheck, List, AlertTriangle, Activity, KeyRound, PauseCircle, PlayCircle } from 'lucide-react'; // Added PauseCircle, PlayCircle
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import APIDocumentation from '../components/admin/APIDocumentation';

export default function AdminPanel() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [sentinels, setSentinels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null); // Add state for current user
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: 'user',
    access_level: 'user',
    clearance_tier: 'delta',
    organization: 'Sentinel Dynamics'
  });

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      setIsLoading(true);
      try {
        const user = await User.me();
        setCurrentUser(user); // Store current user
        if (user && (user.role === 'admin' || user.access_level === 'architect')) {
          setIsAuthorized(true);
          await loadAdminData();
        } else {
          setIsAuthorized(false);
        }
      } catch (error) {
        console.error("Authorization check failed:", error);
        setIsAuthorized(false);
      }
      setIsLoading(false);
    };
    checkAuthAndLoadData();
  }, []);

  const loadAdminData = async () => {
    try {
      const [userData, sentinelData] = await Promise.all([
        User.list(),
        SentinelIntelligence.list()
      ]);
      setUsers(userData);
      setSentinels(sentinelData);
    } catch (error) {
      console.error('Failed to load admin data:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleInviteUser = async (e) => {
    e.preventDefault();
    alert("User invitation functionality is managed by the Base44 platform's user management system. This is a placeholder for that integration.");
    // In a real scenario, you would call an integration or backend function here.
    // For now, we just log it.
    console.log("Inviting user:", formData);
  };

  const toggleUserStatus = async (userToUpdate) => {
    if (currentUser && userToUpdate.id === currentUser.id) {
        alert("Architect, you cannot pause your own account.");
        return;
    }

    const newStatus = userToUpdate.status === 'active' ? 'paused' : 'active';
    try {
        await User.update(userToUpdate.id, { status: newStatus });
        await loadAdminData(); // Refresh the user list
    } catch (error) {
        console.error("Failed to update user status:", error);
        alert("Error: Could not update operator status.");
    }
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
            <p className="text-[#94A3B8] mb-6">This area requires Architect-level clearance.</p>
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
            <h1 className="text-3xl font-bold text-[#E2E8F0] tracking-wide">ADMINISTRATION PANEL</h1>
            <p className="text-[#94A3B8] mt-1">Sovereign Control Layer</p>
          </div>
        </motion.div>

        <Tabs defaultValue="user_management">
          <TabsList className="bg-[#0A0F1A] border border-[#1A2332] mb-6 grid grid-cols-3 w-full md:w-auto">
            <TabsTrigger value="user_management" className="data-[state=active]:bg-[#00D4FF] data-[state=active]:text-[#0D1421] text-[#E2E8F0]"><UserPlus className="w-4 h-4 mr-2" />User Management</TabsTrigger>
            <TabsTrigger value="system_overview" className="data-[state=active]:bg-[#00D4FF] data-[state=active]:text-[#0D1421] text-[#E2E8F0]"><ShieldCheck className="w-4 h-4 mr-2" />System Overview</TabsTrigger>
            <TabsTrigger value="api_integration" className="data-[state=active]:bg-[#00D4FF] data-[state=active]:text-[#0D1421] text-[#E2E8F0]"><KeyRound className="w-4 h-4 mr-2" />API Integration</TabsTrigger>
          </TabsList>
          
          <TabsContent value="user_management">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-[#0A0F1A] border-[#1A2332] shadow-xl">
                <CardHeader><CardTitle className="text-xl font-bold text-[#E2E8F0]">Invite New Operator</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={handleInviteUser} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="full_name">Full Name</Label>
                        <Input id="full_name" name="full_name" value={formData.full_name} onChange={handleInputChange} className="bg-[#1A2332] border-[#2D3748] mt-1" required />
                      </div>
                      <div>
                        <Label htmlFor="email">Email Address</Label>
                        <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} className="bg-[#1A2332] border-[#2D3748] mt-1" required />
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                          <Label htmlFor="role">Role</Label>
                          <Select name="role" value={formData.role} onValueChange={(value) => handleSelectChange('role', value)}>
                              <SelectTrigger className="bg-[#1A2332] border-[#2D3748] mt-1"><SelectValue /></SelectTrigger>
                              <SelectContent className="bg-[#1A2332] border-[#2D3748]"><SelectItem value="admin">Admin</SelectItem><SelectItem value="user">User</SelectItem></SelectContent>
                          </Select>
                      </div>
                      <div>
                          <Label htmlFor="access_level">Access Level</Label>
                          <Select name="access_level" value={formData.access_level} onValueChange={(value) => handleSelectChange('access_level', value)}>
                              <SelectTrigger className="bg-[#1A2332] border-[#2D3748] mt-1"><SelectValue /></SelectTrigger>
                              <SelectContent className="bg-[#1A2332] border-[#2D3748]"><SelectItem value="architect">Architect</SelectItem><SelectItem value="admin">Admin</SelectItem><SelectItem value="user">User</SelectItem></SelectContent>
                          </Select>
                      </div>
                    </div>
                     <div>
                        <Label htmlFor="organization">Organization</Label>
                        <Input id="organization" name="organization" value={formData.organization} onChange={handleInputChange} className="bg-[#1A2332] border-[#2D3748] mt-1"/>
                    </div>
                    <Button type="submit" className="bg-[#00D4FF] hover:bg-[#00B8E6] text-[#0D1421] font-bold">Send Invitation</Button>
                  </form>
                </CardContent>
              </Card>
              <Card className="bg-[#0A0F1A] border-[#1A2332] shadow-xl">
                <CardHeader><CardTitle className="text-xl font-bold text-[#E2E8F0]">Registered Operators</CardTitle></CardHeader>
                <CardContent className="max-h-96 overflow-y-auto">
                  <ul className="space-y-2">
                    {users.map(user => (
                      <li key={user.id} className="p-3 bg-[#1A2332] rounded-md flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${user.status === 'active' ? 'bg-[#00FF88]' : 'bg-[#FF8C00]'}`}></div>
                            <div>
                                <p className="font-bold">{user.full_name}</p>
                                <p className="text-sm text-[#94A3B8]">{user.email}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`text-xs font-bold uppercase ${user.status === 'active' ? 'text-[#00FF88] border-[#00FF88]/20' : 'text-[#FF8C00] border-[#FF8C00]/20'}`}>{user.status}</Badge>
                            <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => toggleUserStatus(user)}
                                className="h-8 w-8 text-[#94A3B8] hover:bg-[#0D1421]"
                                title={user.status === 'active' ? 'Pause Account' : 'Activate Account'}
                                disabled={currentUser?.id === user.id}
                            >
                                {user.status === 'active' ? <PauseCircle className="w-4 h-4 text-[#FF8C00]" /> : <PlayCircle className="w-4 h-4 text-[#00FF88]" />}
                            </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="system_overview">
            <Card className="bg-[#0A0F1A] border-[#1A2332] shadow-xl">
              <CardHeader><CardTitle className="text-xl font-bold text-[#E2E8F0]">System Entity Overview</CardTitle></CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <p>Total Users: <span className="font-bold text-[#00D4FF]">{users.length}</span></p>
                  <p>Total SIs: <span className="font-bold text-[#00D4FF]">{sentinels.length}</span></p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="api_integration">
            <APIDocumentation />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Database, Users, Clock } from "lucide-react";
import { format } from "date-fns";

export default function SystemVitals({ sentinels, memoryLogs, user, isLoading }) {
  const getSystemHealth = () => {
    if (sentinels.length === 0) return { status: "STANDBY", color: "#FFD700" };
    
    const activeCount = sentinels.filter(s => s.status === 'active').length;
    const healthRatio = activeCount / sentinels.length;
    
    if (healthRatio >= 0.8) return { status: "OPTIMAL", color: "#00FF88" };
    if (healthRatio >= 0.5) return { status: "DEGRADED", color: "#FF8C00" };
    return { status: "CRITICAL", color: "#FF4444" };
  };

  const systemHealth = getSystemHealth();

  return (
    <>
      <Card className="bg-[#0A0F1A] border-[#1A2332] shadow-xl">
        <CardHeader className="border-b border-[#1A2332] pb-4">
          <CardTitle className="text-lg font-bold text-[#E2E8F0] flex items-center gap-3">
            <Activity className="w-5 h-5 text-[#00D4FF]" />
            SYSTEM VITALS
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full animate-pulse"
                style={{ backgroundColor: systemHealth.color }}
              />
              <span className="text-[#E2E8F0] font-medium">System Health</span>
            </div>
            <Badge 
              variant="outline" 
              className="border font-bold"
              style={{ 
                borderColor: systemHealth.color + '40',
                color: systemHealth.color,
                backgroundColor: systemHealth.color + '10'
              }}
            >
              {systemHealth.status}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-[#94A3B8]">Active SIs</span>
                <span className="text-[#00FF88] font-bold">
                  {sentinels.filter(s => s.status === 'active').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#94A3B8]">Standby SIs</span>
                <span className="text-[#FFD700] font-bold">
                  {sentinels.filter(s => s.status === 'standby').length}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-[#94A3B8]">Maintenance</span>
                <span className="text-[#FF8C00] font-bold">
                  {sentinels.filter(s => s.status === 'maintenance').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#94A3B8]">Offline</span>
                <span className="text-[#FF4444] font-bold">
                  {sentinels.filter(s => s.status === 'offline').length}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#0A0F1A] border-[#1A2332] shadow-xl">
        <CardHeader className="border-b border-[#1A2332] pb-4">
          <CardTitle className="text-lg font-bold text-[#E2E8F0] flex items-center gap-3">
            <Database className="w-5 h-5 text-[#00D4FF]" />
            RECENT ACTIVITY
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-3">
            {memoryLogs.slice(0, 5).map((log, index) => (
              <div key={log.id || index} className="flex items-center gap-3 p-2 rounded bg-[#1A2332]/50">
                <div className="w-2 h-2 bg-[#00D4FF] rounded-full animate-pulse" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#E2E8F0] truncate">
                    {log.user_message?.substring(0, 50)}...
                  </p>
                  <p className="text-xs text-[#94A3B8]">
                    {format(new Date(log.created_date), 'HH:mm')}
                  </p>
                </div>
              </div>
            ))}
            
            {memoryLogs.length === 0 && (
              <div className="text-center py-4">
                <Clock className="w-8 h-8 text-[#94A3B8] mx-auto mb-2" />
                <p className="text-sm text-[#94A3B8]">No recent activity</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#0A0F1A] border-[#1A2332] shadow-xl">
        <CardHeader className="border-b border-[#1A2332] pb-4">
          <CardTitle className="text-lg font-bold text-[#E2E8F0] flex items-center gap-3">
            <Users className="w-5 h-5 text-[#00D4FF]" />
            OPERATOR STATUS
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[#94A3B8]">Clearance Level</span>
              <Badge 
                variant="outline"
                className="border-[#FFD700]/20 text-[#FFD700] bg-[#FFD700]/10"
              >
                {user?.access_level?.toUpperCase() || 'LOADING'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#94A3B8]">Security Tier</span>
              <Badge 
                variant="outline"
                className="border-[#00D4FF]/20 text-[#00D4FF] bg-[#00D4FF]/10"
              >
                {user?.clearance_tier?.toUpperCase() || 'DELTA'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#94A3B8]">Organization</span>
              <span className="text-[#E2E8F0] font-medium text-sm">
                {user?.organization || 'SENTINEL DYNAMICS'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
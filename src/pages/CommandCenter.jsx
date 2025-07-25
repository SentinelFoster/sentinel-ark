
import React, { useState, useEffect } from "react";
import { SentinelIntelligence, User, MemoryLog } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Shield,
  Plus,
  Activity,
  Eye,
  MessageSquare,
  Cpu,
  Zap,
  AlertTriangle,
  Star,
  Award
} from "lucide-react";
import { motion } from "framer-motion";

import OperationalStats from "../components/command/OperationalStats";
import SentinelGrid from "../components/command/SentinelGrid";
import SystemVitals from "../components/command/SystemVitals";

export default function CommandCenter() {
  const navigate = useNavigate();
  const [sentinels, setSentinels] = useState([]);
  const [memoryLogs, setMemoryLogs] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      setIsLoading(true);
      try {
        const currentUser = await User.me();
        if (currentUser && (currentUser.role === 'admin' || currentUser.access_level === 'architect')) {
          setUser(currentUser);
          setIsAuthorized(true);
          const [sentinelData, logData] = await Promise.all([
            SentinelIntelligence.list('-created_date'),
            MemoryLog.list('-created_date', 10),
          ]);
          setSentinels(sentinelData);
          setMemoryLogs(logData);
        } else {
          setIsAuthorized(false);
        }
      } catch (error) {
        setIsAuthorized(false);
        console.error("Authentication check failed:", error);
      }
      setIsLoading(false);
    };

    checkAuthAndLoadData();
  }, []);

  const getStatusColor = (status) => {
    const colors = {
      active: "text-[#00FF88] bg-[#00FF88]/10 border-[#00FF88]/20",
      standby: "text-[#FFD700] bg-[#FFD700]/10 border-[#FFD700]/20",
      maintenance: "text-[#FF8C00] bg-[#FF8C00]/10 border-[#FF8C00]/20",
      offline: "text-[#FF4444] bg-[#FF4444]/10 border-[#FF4444]/20"
    };
    return colors[status] || colors.offline;
  };

  const getRankIcon = (rank) => {
    const icons = {
      CMDR: Shield,
      CPT: Star,
      MAJ: Award,
      LT: Cpu,
      OPR: Activity,
      SPC: Eye
    };
    return icons[rank] || Activity;
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
          className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4"
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#E2E8F0] tracking-wide">
              COMMAND CENTER
            </h1>
            <p className="text-[#94A3B8] mt-2 text-lg">
              Sentinel Dynamics Operational Overview
            </p>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-2 h-2 bg-[#00FF88] rounded-full animate-pulse"></div>
              <span className="text-sm text-[#00FF88] font-medium">SYSTEM OPERATIONAL</span>
            </div>
          </div>

          <div className="flex gap-3">
            <Link to={createPageUrl("Forge")}>
              <Button className="bg-[#00D4FF] hover:bg-[#00B8E6] text-[#0D1421] font-bold px-6 py-3 shadow-lg shadow-[#00D4FF]/20">
                <Plus className="w-5 h-5 mr-2" />
                DEPLOY SI
              </Button>
            </Link>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <OperationalStats
            title="ACTIVE UNITS"
            value={sentinels.filter(s => s.status === 'active').length}
            total={sentinels.length}
            icon={Shield}
            color="#00FF88"
          />

          <OperationalStats
            title="TOTAL INTERACTIONS"
            value={memoryLogs.length}
            icon={MessageSquare}
            color="#00D4FF"
          />

          <OperationalStats
            title="SYSTEM ALERTS"
            value={0}
            icon={AlertTriangle}
            color="#FFD700"
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="bg-[#0A0F1A] border-[#1A2332] shadow-xl">
              <CardHeader className="border-b border-[#1A2332] pb-4">
                <CardTitle className="text-xl font-bold text-[#E2E8F0] flex items-center gap-3">
                  <Shield className="w-6 h-6 text-[#00D4FF]" />
                  DEPLOYED SENTINELS
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <SentinelGrid
                  sentinels={sentinels}
                  isLoading={isLoading}
                  getStatusColor={getStatusColor}
                  getRankIcon={getRankIcon}
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <SystemVitals
              sentinels={sentinels}
              memoryLogs={memoryLogs}
              user={user}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

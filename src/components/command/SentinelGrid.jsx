
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { MessageSquare, Settings, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

export default function SentinelGrid({ sentinels, isLoading, getStatusColor, getRankIcon }) {

  const getFactionColor = (faction) => {
    const colors = {
        CID: "#FFFFFF", // White
        SOD: "#FF8C00", // Dark Orange
        CSI: "#4682B4", // Steel Blue
        AIC: "#32CD32", // Lime Green
        QIT: "#9370DB"  // Medium Purple
    };
    return colors[faction] || "#94A3B8";
  };

  if (isLoading) {
    return (
      <div className="grid md:grid-cols-2 gap-4">
        {Array(4).fill(0).map((_, i) => (
          <div key={i} className="p-4 bg-[#1A2332] rounded-lg border border-[#2D3748]">
            <div className="flex items-center gap-3 mb-3">
              <Skeleton className="w-10 h-10 rounded-lg bg-[#2D3748]" />
              <div>
                <Skeleton className="h-4 w-24 mb-2 bg-[#2D3748]" />
                <Skeleton className="h-3 w-16 bg-[#2D3748]" />
              </div>
            </div>
            <div className="flex gap-2 mb-3">
              <Skeleton className="h-6 w-16 rounded-full bg-[#2D3748]" />
              <Skeleton className="h-6 w-20 rounded-full bg-[#2D3748]" />
            </div>
            <Skeleton className="h-8 w-full rounded bg-[#2D3748]" />
          </div>
        ))}
      </div>
    );
  }

  if (sentinels.length === 0) {
    return (
      <div className="text-center py-12">
        <Eye className="w-16 h-16 text-[#94A3B8] mx-auto mb-4" />
        <h3 className="text-xl font-bold text-[#E2E8F0] mb-2">No Sentinels Deployed</h3>
        <p className="text-[#94A3B8] mb-6">Deploy your first Sentinel Intelligence to begin operations</p>
        <Link to={createPageUrl("Forge")}>
          <Button className="bg-[#00D4FF] hover:bg-[#00B8E6] text-[#0D1421] font-bold">
            Deploy First SI
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <AnimatePresence>
        {sentinels.map((sentinel) => {
          const RankIcon = getRankIcon(sentinel.rank);
          
          return (
            <motion.div
              key={sentinel.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              whileHover={{ scale: 1.02 }}
              className="p-4 bg-[#1A2332] rounded-lg border border-[#2D3748] hover:border-[#00D4FF]/30 transition-all duration-300 group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-r from-[#00D4FF] to-[#0099CC] rounded-lg flex items-center justify-center shadow-lg flex-shrink-0">
                  {sentinel.avatar_url ? (
                    <img src={sentinel.avatar_url} alt={sentinel.name} className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <RankIcon className="w-5 h-5 text-[#0D1421]" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-[#E2E8F0] group-hover:text-[#00D4FF] transition-colors">
                    {sentinel.name}
                  </h4>
                  <p className="text-sm text-[#94A3B8]">{sentinel.rank}</p>
                </div>
              </div>
              
              <div className="flex gap-2 mb-4 flex-wrap">
                <Badge 
                  variant="outline" 
                  className={`border text-xs ${getStatusColor(sentinel.status)}`}
                >
                  {sentinel.status.toUpperCase()}
                </Badge>
                {sentinel.rank === 'CMDR' ? (
                   <Badge 
                    variant="outline"
                    className="border text-xs"
                    style={{
                      borderColor: '#FFD700' + '40',
                      color: '#FFD700',
                      backgroundColor: '#FFD700' + '10'
                    }}
                  >
                    ARK COMMAND
                  </Badge>
                ) : (
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
                  className="border-[#FFD700]/20 text-[#FFD700] bg-[#FFD700]/10"
                >
                  {sentinel.access_tier?.toUpperCase() || 'DELTA'}
                </Badge>
              </div>
              
              <div className="flex gap-2">
                <Link 
                  to={createPageUrl("ChatInterface")} 
                  className="flex-1"
                >
                  <Button 
                    size="sm" 
                    className="w-full bg-[#0A0F1A] hover:bg-[#00D4FF] hover:text-[#0D1421] border border-[#00D4FF]/30 text-[#00D4FF] transition-all duration-300"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    ENGAGE
                  </Button>
                </Link>
                <Link to={createPageUrl("Forge")}>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="border-[#2D3748] text-[#94A3B8] hover:border-[#00D4FF]/30 hover:text-[#00D4FF]"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

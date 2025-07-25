import React from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function OperationalStats({ title, value, total, icon: Icon, color, trend }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="bg-[#0A0F1A] border-[#1A2332] shadow-xl relative overflow-hidden group hover:border-[#00D4FF]/30 transition-all duration-300">
        <div 
          className="absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8 rounded-full opacity-5"
          style={{ backgroundColor: color }}
        />
        <CardHeader className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-[#94A3B8] uppercase tracking-widest mb-2">
                {title}
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-[#E2E8F0]">{value}</span>
                {total !== undefined && (
                  <span className="text-lg text-[#94A3B8]">/ {total}</span>
                )}
              </div>
            </div>
            <div 
              className="p-3 rounded-xl bg-opacity-10 shadow-lg"
              style={{ backgroundColor: color + '20' }}
            >
              <Icon 
                className="w-6 h-6" 
                style={{ color: color }}
              />
            </div>
          </div>
          {trend && (
            <div className="flex items-center mt-4 text-sm">
              <div 
                className="w-2 h-2 rounded-full mr-2 animate-pulse"
                style={{ backgroundColor: color }}
              />
              <span style={{ color: color }} className="font-medium">
                {trend}
              </span>
            </div>
          )}
        </CardHeader>
      </Card>
    </motion.div>
  );
}
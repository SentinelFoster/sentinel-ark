import React, { useState } from 'react';
import { UploadFile, ExtractDataFromUploadedFile } from "@/api/integrations";
import { InstructionCore } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Loader2, CheckCircle, AlertTriangle } from "lucide-react";

export default function FileUploadTrainer({ selectedSI, onUploadComplete }) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setStatus({ type: '', message: '' });
  };

  const handleUploadAndProcess = async () => {
    if (!file || !selectedSI) {
      setStatus({ type: 'error', message: 'Please select a file and a target SI unit.' });
      return;
    }

    setIsUploading(true);
    setStatus({ type: 'info', message: 'Uploading file...' });

    try {
      const { file_url } = await UploadFile({ file });
      setStatus({ type: 'info', message: 'File uploaded. Extracting directives...' });
      setIsUploading(false);
      setIsProcessing(true);

      const instructionSchema = {
        type: "object",
        properties: {
          instructions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                directive_title: { type: "string" },
                content: { type: "string" }
              },
              required: ["directive_title", "content"]
            }
          }
        }
      };

      const extractionResult = await ExtractDataFromUploadedFile({
        file_url,
        json_schema: instructionSchema
      });

      if (extractionResult.status === "success" && extractionResult.output.instructions) {
        const instructionsToCreate = extractionResult.output.instructions.map(inst => ({
          ...inst,
          si_id: selectedSI,
          priority_level: "medium",
          security_clearance: "delta"
        }));

        if (instructionsToCreate.length > 0) {
          await InstructionCore.bulkCreate(instructionsToCreate);
          setStatus({ type: 'success', message: `${instructionsToCreate.length} directives successfully injected.` });
        } else {
          setStatus({ type: 'warning', message: 'No valid instructions found in the file.' });
        }
      } else {
        throw new Error(extractionResult.details || "Failed to extract data from file.");
      }

      onUploadComplete();
    } catch (error) {
      console.error("File processing error:", error);
      setStatus({ type: 'error', message: `Processing failed: ${error.message}` });
    } finally {
      setIsUploading(false);
      setIsProcessing(false);
      setFile(null);
    }
  };

  return (
    <div className="text-center py-8 border-2 border-dashed border-[#2D3748] rounded-lg">
      <FileText className="w-16 h-16 text-[#94A3B8] mx-auto mb-4" />
      <h3 className="text-xl font-bold text-[#E2E8F0] mb-2">File-Based Training Protocol</h3>
      <p className="text-[#94A3B8] mb-6 max-w-md mx-auto">Upload .txt, .md, or .json files to generate instruction cores. For very large files, processing may take several minutes. Ensure the file is structured for optimal extraction.</p>
      
      <div className="flex justify-center items-center gap-4">
        <Button asChild variant="outline" className="border-[#2D3748] text-[#E2E8F0] hover:bg-[#1A2332]">
          <label htmlFor="file-upload">
            <Upload className="w-4 h-4 mr-2" />
            Select File
            <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept=".txt,.md,.json,.pdf" />
          </label>
        </Button>
        <Button
          onClick={handleUploadAndProcess}
          disabled={!file || !selectedSI || isUploading || isProcessing}
          className="bg-[#00D4FF] hover:bg-[#00B8E6] text-[#0D1421] font-bold"
        >
          {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          {isUploading ? 'UPLOADING...' : isProcessing ? 'PROCESSING...' : 'INJECT KNOWLEDGE'}
        </Button>
      </div>
      
      {file && <p className="text-sm text-[#94A3B8] mt-4">Selected: {file.name}</p>}
      
      {status.message && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {status.type === 'success' && <CheckCircle className="w-5 h-5 text-[#00FF88]" />}
          {status.type === 'error' && <AlertTriangle className="w-5 h-5 text-[#FF4444]" />}
          <p className={`text-sm ${
            status.type === 'success' ? 'text-[#00FF88]' : 
            status.type === 'error' ? 'text-[#FF4444]' : 'text-[#94A3B8]'
          }`}>
            {status.message}
          </p>
        </div>
      )}
    </div>
  );
}
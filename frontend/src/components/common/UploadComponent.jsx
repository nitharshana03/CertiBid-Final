// CertiBid AI - File Upload Component
import React, { useState } from 'react';
import { UploadCloud, File, CheckCircle2, X } from 'lucide-react';

export function UploadComponent({ onUploadSuccess, label = "Upload Verification Document", accept = ".pdf,.jpg,.png" }) {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFile = (f) => {
    setFile(f);
    setUploading(true);
    setTimeout(() => {
      setUploading(false);
      if (onUploadSuccess) onUploadSuccess({ name: f.name, size: f.size, url: URL.createObjectURL(f) });
    }, 800);
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold text-[#A7C9CE]">{label}</label>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer ${
          dragOver ? 'border-[#14D9D5] bg-[#14D9D5]/10' : 'border-[#1B5968] bg-[#0B3442]/60 hover:bg-[#0B3442]'
        }`}
        onClick={() => document.getElementById('upload-input')?.click()}
      >
        <input
          id="upload-input"
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        {file ? (
          <div className="flex items-center gap-3 text-xs text-white">
            <File className="w-5 h-5 text-[#14D9D5]" />
            <div>
              <p className="font-bold">{file.name}</p>
              <p className="text-[10px] text-[#A7C9CE]">{(file.size / 1024).toFixed(1)} KB • {uploading ? 'Processing forensic checks...' : 'Uploaded successfully'}</p>
            </div>
            {uploading ? (
              <div className="w-4 h-4 border-2 border-[#14D9D5] border-t-transparent rounded-full animate-spin" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-[#20C997]" />
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center text-center">
            <UploadCloud className="w-8 h-8 text-[#14D9D5] mb-2" />
            <p className="text-xs font-bold text-white">Drag & drop your files or <span className="text-[#14D9D5]">Browse</span></p>
            <p className="text-[10px] text-[#A7C9CE] mt-1">Supports PDF, PNG, JPG up to 25MB</p>
          </div>
        )}
      </div>
    </div>
  );
}

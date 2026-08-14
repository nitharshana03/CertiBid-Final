// CertiBid AI - Bidder Specific Company Certificates View
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { apiService } from '../../services/api';
import { UploadComponent } from '../../components/common/UploadComponent';
import {
  FileCheck2,
  Building2,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  FileText,
  Upload,
  Info,
  Trash2,
  Loader2,
  Search
} from 'lucide-react';

export function BidderCertificates() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [vendor, setVendor] = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const companyName = vendor?.companyName || user?.organization || user?.companyName || user?.name || 'Bidder Entity';
  const companyId = vendor?.id || user?.bidderId || user?.vendorId || 'Pending ID';
  const taxId = vendor?.taxId || user?.taxId || 'N/A';

  const loadBidderData = async () => {
    setLoading(true);
    try {
      // 1. Fetch authenticated bidder profile
      const profRes = await apiService.getAuthenticatedBidderProfile();
      if (profRes?.data) {
        setVendor(profRes.data);
      }

      // 2. Fetch authenticated bidder documents (backend strictly enforces ownership)
      const docRes = await apiService.getDocuments();
      if (docRes?.data && Array.isArray(docRes.data)) {
        setCertificates(docRes.data);
      } else {
        setCertificates([]);
      }
    } catch (err) {
      console.error("Error loading bidder documents:", err);
      showToast("Unable to load bidder certificates", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBidderData();
  }, [user?.email, user?.bidderId]);

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const file = files[0];
      const fileName = file.name || 'Uploaded Company Certificate';
      const docType = fileName.toLowerCase().includes('tax') ? 'Tax Certificate'
        : fileName.toLowerCase().includes('iso') ? 'Security Audit'
        : fileName.toLowerCase().includes('env') ? 'Environmental'
        : 'Compliance Certificate';

      const uploadRes = await apiService.uploadDocument({
        title: fileName.replace(/\.[^/.]+$/, ""),
        fileName: fileName,
        documentType: docType,
        vendorId: companyId
      });

      if (uploadRes?.data) {
        setCertificates(prev => [uploadRes.data, ...prev]);
        showToast('New Company Certificate submitted for official verification', 'success');
      }
    } catch (err) {
      console.error("Upload error:", err);
      showToast(err.message || 'Failed to upload certificate', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (id, title) => {
    if (!window.confirm(`Are you sure you want to remove "${title}"?`)) return;
    try {
      await apiService.deleteDocument(id);
      setCertificates(prev => prev.filter(c => c.id !== id));
      showToast('Certificate removed successfully', 'success');
    } catch (err) {
      console.error("Delete error:", err);
      showToast(err.message || 'Failed to delete certificate', 'error');
    }
  };

  const filteredCertificates = certificates.filter(cert => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (cert.title || cert.name || '').toLowerCase().includes(q) ||
      (cert.id || '').toLowerCase().includes(q) ||
      (cert.documentType || '').toLowerCase().includes(q) ||
      (cert.status || '').toLowerCase().includes(q)
    );
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved':
      case 'Verified':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Verified
          </span>
        );
      case 'Under Review':
      case 'Pending Verification':
      case 'Pending':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" /> Pending Verification
          </span>
        );
      case 'Expiring Soon':
      case 'Needs Resubmission':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
            <AlertTriangle className="w-3.5 h-3.5" /> Needs Resubmission
          </span>
        );
      case 'Expired':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <XCircle className="w-3.5 h-3.5" /> Expired
          </span>
        );
      case 'Rejected':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 bg-rose-600/10 text-rose-600 dark:text-rose-400 border border-rose-600/20">
            <XCircle className="w-3.5 h-3.5" /> Rejected
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 bg-slate-500/10 text-slate-400 border border-slate-500/20">
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs font-semibold text-[#A7C9CE] animate-pulse flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-[#06B6B4] animate-spin" />
        <span>Loading Authenticated Bidder Certificates...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-[#F0FDFA]">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-[#0B3442] border border-[#1B5968] shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-white">
        <div>
          <div className="flex items-center gap-2 text-[#14D9D5] text-xs font-bold uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4 text-[#06B6B4]" /> Corporate Certificate Verification Hub
          </div>
          <h2 className="text-2xl font-extrabold text-white">{companyName}</h2>
          <p className="text-xs text-[#A7C9CE] mt-1">
            Bidder ID: <strong className="text-white font-mono">{companyId}</strong> • Tax ID: <strong className="text-white font-mono">{taxId}</strong>
          </p>
        </div>
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#06B6B4]/10 border border-[#06B6B4]/30 text-[#14D9D5] text-xs font-bold">
          <ShieldCheck className="w-4 h-4 text-[#14D9D5]" />
          <span>Authenticated Bidder Workspace</span>
        </div>
      </div>

      {/* Verification Read-Only Info Notice */}
      <div className="p-4 rounded-2xl bg-[#0B3442] border border-[#1B5968] flex items-start gap-3 text-xs text-[#A7C9CE]">
        <Info className="w-5 h-5 text-[#14D9D5] shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-white">Security & Document Access Protection</p>
          <p className="mt-0.5 text-[#A7C9CE]">
            This page displays <strong>only</strong> official qualification certificates uploaded by and belonging to <strong>{companyName}</strong>. All document records are isolated on the server using encrypted role authorization.
          </p>
        </div>
      </div>

      {/* Certificate Upload Section */}
      <div className="p-6 rounded-2xl bg-[#103D4A] border border-[#1B5968] space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Upload className="w-4 h-4 text-[#14D9D5]" /> Upload New Company Certificate
        </h3>
        <p className="text-xs text-[#A7C9CE]">
          Upload PDF or image certificates to submit them for official procurement verification.
        </p>
        <div className="pt-2">
          {uploading ? (
            <div className="p-8 border border-dashed border-[#06B6B4] rounded-2xl bg-[#0B3442] text-center text-xs text-[#14D9D5] font-bold flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> Uploading and submitting certificate...
            </div>
          ) : (
            <UploadComponent onFileUpload={handleFileUpload} label="Click or Drag & Drop PDF / Image Certificate for Verification" />
          )}
        </div>
      </div>

      {/* Certificates List Table */}
      <div className="p-6 rounded-2xl bg-[#103D4A] border border-[#1B5968] space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-[#06B6B4]" /> Registered Company Certificates ({certificates.length})
          </h3>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#A7C9CE] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search certificates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0B3442] border border-[#1B5968] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-[#A7C9CE]/60 focus:outline-none focus:border-[#06B6B4]"
            />
          </div>
        </div>

        {filteredCertificates.length === 0 ? (
          <div className="py-12 px-4 text-center rounded-xl bg-[#0B3442] border border-[#1B5968] space-y-2">
            <FileText className="w-10 h-10 text-[#A7C9CE]/40 mx-auto" />
            <h4 className="text-sm font-bold text-white">No Certificates Found</h4>
            <p className="text-xs text-[#A7C9CE] max-w-md mx-auto">
              {searchQuery ? `No certificates matched "${searchQuery}".` : `There are currently no company certificates uploaded for ${companyName}. Use the upload section above to submit your documents.`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#1B5968] uppercase font-semibold text-[10px] tracking-wider text-[#A7C9CE] bg-[#0B3442]">
                  <th className="py-3.5 px-4">Certificate Title</th>
                  <th className="py-3.5 px-4">Doc Reference</th>
                  <th className="py-3.5 px-4">Document Type</th>
                  <th className="py-3.5 px-4">Uploaded Date</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1B5968]">
                {filteredCertificates.map(cert => (
                  <tr key={cert.id} className="hover:bg-[#145364]/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-white flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#06B6B4] shrink-0" />
                        {cert.title || cert.name}
                      </p>
                      {cert.resubmissionReason && (
                        <p className="text-[11px] text-rose-300 mt-0.5">Note: {cert.resubmissionReason}</p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-[#14D9D5]">
                      {cert.id}
                    </td>
                    <td className="py-3.5 px-4 text-[#A7C9CE] font-medium">
                      {cert.documentType || 'Compliance'}
                    </td>
                    <td className="py-3.5 px-4 text-[#A7C9CE]">
                      {cert.uploadedAt || cert.issueDate || 'Recent'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {getStatusBadge(cert.status)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleDeleteDocument(cert.id, cert.title || cert.name)}
                        className="p-1.5 rounded-lg text-rose-400 hover:text-rose-200 hover:bg-rose-500/20 transition-colors cursor-pointer"
                        title="Delete Document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


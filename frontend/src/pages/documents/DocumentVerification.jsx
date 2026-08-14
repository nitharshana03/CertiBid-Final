// CertiBid AI - Admin Document Audit & Bidder Inspection Module
import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { FilePreviewModal } from '../../components/common/FilePreviewModal';
import { formatINRLakhsCrores } from '../../utils/formatters';
import { BidderCertificates } from './BidderCertificates';
import {
  FileCheck2,
  Search,
  Eye,
  CheckCircle2,
  XCircle,
  Filter,
  Building2,
  FileText,
  Mail,
  ShieldCheck
} from 'lucide-react';

export function DocumentVerification() {
  const { user } = useAuth();
  const rawRole = String(user?.role || '').toUpperCase();
  const isBidder = rawRole === 'BIDDER' || rawRole === 'VENDOR';

  if (isBidder) {
    return <BidderCertificates />;
  }

  const [bids, setBids] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [documents, setDocuments] = useState([]);

  // Search & Filter States
  const [globalBidSearch, setGlobalBidSearch] = useState('');
  const [bidderSearch, setBidderSearch] = useState('');
  const [selectedBidderId, setSelectedBidderId] = useState('ALL');
  const [selectedTenderId, setSelectedTenderId] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, COMPLETE, MISSING, PENDING, VERIFIED, REJECTED
  const [docStatusFilter, setDocStatusFilter] = useState('ALL'); // ALL, Complete, Missing, Under Review
  const [eligibilityFilter, setEligibilityFilter] = useState('ALL'); // ALL, Eligible, Ineligible, Under Review
  
  // Selected Bid Modal Details
  const [activeBidDetail, setActiveBidDetail] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);

  const { showToast } = useToast();

  useEffect(() => {
    Promise.all([
      apiService.getBids(),
      apiService.getVendors(),
      apiService.getDocuments()
    ]).then(([bRes, vRes, dRes]) => {
      setBids(bRes.data || []);
      setVendors(vRes.data || []);
      setDocuments(dRes.data || []);
    });
  }, []);

  // Filter Bids Logic
  const filteredBids = bids.filter(bid => {
    const searchLower = globalBidSearch.toLowerCase().trim();
    const bidderSearchLower = bidderSearch.toLowerCase().trim();

    // Search 1: General Bid Search (Bid ID, Tender ID, Tender Name, Bidder Name)
    const matchesGlobalSearch =
      !searchLower ||
      (bid.id || '').toLowerCase().includes(searchLower) ||
      (bid.tenderId || '').toLowerCase().includes(searchLower) ||
      (bid.tenderTitle || '').toLowerCase().includes(searchLower) ||
      (bid.bidderName || bid.vendorName || '').toLowerCase().includes(searchLower);

    // Search 2: Bidder Specific Search (Name, Email, Org ID)
    const matchesBidderSearch =
      !bidderSearchLower ||
      (bid.bidderName || bid.vendorName || '').toLowerCase().includes(bidderSearchLower) ||
      (bid.vendorEmail || '').toLowerCase().includes(bidderSearchLower) ||
      (bid.vendorId || '').toLowerCase().includes(bidderSearchLower);

    // Dropdown/Selection Filters
    const matchesSelectedBidder =
      selectedBidderId === 'ALL' || bid.vendorId === selectedBidderId;

    const matchesSelectedTender =
      selectedTenderId === 'ALL' || bid.tenderId === selectedTenderId;

    const matchesDocStatus =
      docStatusFilter === 'ALL' || (bid.documentStatus || 'Complete') === docStatusFilter;

    const matchesEligibility =
      eligibilityFilter === 'ALL' || (bid.eligibilityStatus || 'Eligible') === eligibilityFilter;

    // Quick Filter Status Tabs
    let matchesStatusTab = true;
    if (statusFilter === 'COMPLETE') matchesStatusTab = (bid.documentStatus === 'Complete');
    else if (statusFilter === 'MISSING') matchesStatusTab = (bid.documentStatus === 'Missing');
    else if (statusFilter === 'PENDING') matchesStatusTab = (bid.verificationStatus === 'Pending Verification' || bid.status === 'Pending Verification');
    else if (statusFilter === 'VERIFIED') matchesStatusTab = (bid.verificationStatus === 'Verified' || bid.status === 'Verified');
    else if (statusFilter === 'REJECTED') matchesStatusTab = (bid.verificationStatus === 'Rejected' || bid.status === 'Rejected');

    return (
      matchesGlobalSearch &&
      matchesBidderSearch &&
      matchesSelectedBidder &&
      matchesSelectedTender &&
      matchesDocStatus &&
      matchesEligibility &&
      matchesStatusTab
    );
  });

  // Selected Bidder Info Card (if specific bidder selected/searched)
  const matchedVendor = vendors.find(
    v => v.id === selectedBidderId || (bidderSearch && (v.companyName.toLowerCase().includes(bidderSearch.toLowerCase()) || v.id.toLowerCase().includes(bidderSearch.toLowerCase()) || v.email.toLowerCase().includes(bidderSearch.toLowerCase())))
  );

  return (
    <div className="space-y-6 text-[#F0FDFA]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 rounded-2xl border shadow-sm bg-[#0B3442] border-[#1B5968] text-white">
        <div>
          <h2 className="text-xl font-extrabold flex items-center gap-2 text-white">
            <FileCheck2 className="w-6 h-6 text-[#14D9D5]" /> Admin Document Audit & Bidder Inspector
          </h2>
          <p className="text-xs mt-1 text-[#A7C9CE]">
            Complete audit matrix linking Tender → Bid → Bidder credentials, verification & compliance statuses.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border bg-[#06B6B4]/10 border-[#06B6B4]/30 text-[#14D9D5]">
          <ShieldCheck className="w-4 h-4 text-[#14D9D5]" /> Total Submitted Bids: {bids.length}
        </div>
      </div>

      {/* Dual Search & Filter Control Bar */}
      <div className="p-6 rounded-2xl border shadow-sm space-y-4 bg-[#0B3442] border-[#1B5968]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* SEARCH 1: Search Bids */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 text-[#A7C9CE]">
              <Search className="w-3.5 h-3.5 text-[#14D9D5]" /> Search Bids & Tenders
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search by Bid ID, Tender ID, Tender Title, or Bidder Name..."
                value={globalBidSearch}
                onChange={(e) => setGlobalBidSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs font-medium focus:outline-none focus:border-[#06B6B4] transition-all bg-[#071F2A] border-[#1B5968] text-white"
              />
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#A7C9CE]" />
            </div>
          </div>

          {/* SEARCH 2: Search Bidders */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 text-[#A7C9CE]">
              <Building2 className="w-3.5 h-3.5 text-[#14D9D5]" /> Search Specific Bidder
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search Bidder Company Name, Email, or Organization ID (e.g., VND-10028)..."
                value={bidderSearch}
                onChange={(e) => setBidderSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs font-medium focus:outline-none focus:border-[#06B6B4] transition-all bg-[#071F2A] border-[#1B5968] text-white"
              />
              <Building2 className="w-4 h-4 absolute left-3.5 top-3 text-[#A7C9CE]" />
            </div>
          </div>
        </div>

        {/* Dropdown Filters Row */}
        <div className="pt-3 border-t grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 border-[#1B5968]">
          {/* Filter by Tender Dropdown */}
          <div>
            <label className="text-[10px] font-semibold mb-1 block text-[#A7C9CE]">Tender Filter</label>
            <select
              value={selectedTenderId}
              onChange={(e) => setSelectedTenderId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer focus:outline-none focus:border-[#06B6B4] bg-[#071F2A] border-[#1B5968] text-white"
            >
              <option value="ALL">All Tenders</option>
              <option value="TND-2026-8901">TND-2026-8901 (Smart City Traffic)</option>
              <option value="TND-2026-8902">TND-2026-8902 (Highway Expansion)</option>
              <option value="TND-2026-8903">TND-2026-8903 (Solar Infrastructure)</option>
            </select>
          </div>

          {/* Filter by Bidder Dropdown */}
          <div>
            <label className="text-[10px] font-semibold mb-1 block text-[#A7C9CE]">Bidder Filter</label>
            <select
              value={selectedBidderId}
              onChange={(e) => setSelectedBidderId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer focus:outline-none focus:border-[#06B6B4] bg-[#071F2A] border-[#1B5968] text-white"
            >
              <option value="ALL">All Bidders</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>{v.companyName} ({v.id})</option>
              ))}
            </select>
          </div>

          {/* Filter Document Status */}
          <div>
            <label className="text-[10px] font-semibold mb-1 block text-[#A7C9CE]">Document Status</label>
            <select
              value={docStatusFilter}
              onChange={(e) => setDocStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer focus:outline-none focus:border-[#06B6B4] bg-[#071F2A] border-[#1B5968] text-white"
            >
              <option value="ALL">All Document Statuses</option>
              <option value="Complete">Complete</option>
              <option value="Missing">Missing</option>
              <option value="Under Review">Under Review</option>
            </select>
          </div>

          {/* Filter Eligibility */}
          <div>
            <label className="text-[10px] font-semibold mb-1 block text-[#A7C9CE]">Eligibility Status</label>
            <select
              value={eligibilityFilter}
              onChange={(e) => setEligibilityFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer focus:outline-none focus:border-[#06B6B4] bg-[#071F2A] border-[#1B5968] text-white"
            >
              <option value="ALL">All Eligibility Statuses</option>
              <option value="Eligible">Eligible</option>
              <option value="Ineligible">Ineligible</option>
              <option value="Under Review">Under Review</option>
            </select>
          </div>
        </div>

        {/* Quick Status Pill Tabs */}
        <div className="pt-3 border-t flex flex-wrap items-center gap-2 border-[#1B5968]">
          <span className="text-[11px] font-bold mr-2 flex items-center gap-1 text-[#A7C9CE]">
            <Filter className="w-3.5 h-3.5" /> Quick Filter:
          </span>
          {[
            { id: 'ALL', label: 'All Bids' },
            { id: 'COMPLETE', label: 'Documents Complete' },
            { id: 'MISSING', label: 'Documents Missing' },
            { id: 'PENDING', label: 'Pending Verification' },
            { id: 'VERIFIED', label: 'Verified' },
            { id: 'REJECTED', label: 'Rejected' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-[#06B6B4] text-white shadow-xs'
                  : 'bg-[#071F2A] text-[#A7C9CE] hover:bg-[#145364]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Selected / Matched Bidder Spotlight Card */}
      {matchedVendor && (
        <div className="p-5 rounded-2xl border space-y-3 bg-[#0B3442] border-[#1B5968]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <span className="px-2 py-0.5 rounded bg-[#06B6B4]/20 text-[#14D9D5] text-[10px] font-extrabold uppercase tracking-wider">Selected Bidder Profile</span>
              <h3 className="text-base font-extrabold mt-1 flex items-center gap-2 text-white">
                <Building2 className="w-5 h-5 text-[#14D9D5]" /> {matchedVendor.companyName}
              </h3>
              <p className="text-xs mt-0.5 text-[#A7C9CE]">
                Org ID: <span className="font-bold text-white">{matchedVendor.id}</span> • Tax ID: <span className="font-bold text-white">{matchedVendor.taxId}</span> • Category: {matchedVendor.category}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs flex items-center gap-1 sm:justify-end text-[#A7C9CE]">
                <Mail className="w-3.5 h-3.5 text-[#14D9D5]" /> {matchedVendor.email}
              </p>
              <p className="text-xs font-bold mt-0.5 text-[#F0FDFA]">Contact: {matchedVendor.contactPerson} ({matchedVendor.phone})</p>
            </div>
          </div>
          
          <div className="pt-2 border-t flex items-center justify-between text-xs font-semibold border-[#1B5968] text-[#A7C9CE]">
            <span>Eligibility Score: <strong className="text-[#14D9D5]">{matchedVendor.eligibilityScore}%</strong></span>
            <span>Annual Turnover: <strong className="text-white">{formatINRLakhsCrores(matchedVendor.annualTurnover)}</strong></span>
            <span>Completed Projects: <strong className="text-white">{matchedVendor.completedProjectsCount}</strong></span>
          </div>
        </div>
      )}

      {/* Main Audit Bids Table */}
      <div className="rounded-2xl border shadow-sm overflow-hidden bg-[#103D4A] border-[#1B5968]">
        <div className="p-4 border-b flex justify-between items-center border-[#1B5968] bg-[#0B3442]">
          <h3 className="font-extrabold text-sm flex items-center gap-2 text-white">
            <FileText className="w-4 h-4 text-[#14D9D5]" /> Submitted Bids & Document Audit Register ({filteredBids.length})
          </h3>
          <span className="text-xs font-medium text-[#A7C9CE]">Relationship Matrix: Tender → Bid → Bidder</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b uppercase font-semibold text-[10px] tracking-wider bg-[#0B3442] border-[#1B5968] text-[#A7C9CE]">
                <th className="py-3.5 px-4">Bid ID</th>
                <th className="py-3.5 px-4">Tender Info</th>
                <th className="py-3.5 px-4">Bidder Details</th>
                <th className="py-3.5 px-4">Proposed Amount</th>
                <th className="py-3.5 px-4">Submitted</th>
                <th className="py-3.5 px-4 text-center">Docs Status</th>
                <th className="py-3.5 px-4 text-center">Eligibility</th>
                <th className="py-3.5 px-4 text-center">Verification</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1B5968]">
              {filteredBids.map(bid => {
                const docStatus = bid.documentStatus || 'Complete';
                const elStatus = bid.eligibilityStatus || 'Eligible';
                const verStatus = bid.verificationStatus || bid.status || 'Verified';

                return (
                  <tr key={bid.id} className="transition-colors hover:bg-[#145364]/50">
                    {/* Bid ID */}
                    <td className="py-3.5 px-4 font-extrabold text-[#14D9D5]">
                      {bid.id}
                    </td>

                    {/* Tender Info */}
                    <td className="py-3.5 px-4">
                      <p className="font-bold leading-snug text-white">{bid.tenderTitle || 'Smart City Infrastructure'}</p>
                      <p className="text-[10px] text-[#A7C9CE] font-mono mt-0.5">{bid.tenderId}</p>
                    </td>

                    {/* Bidder Details */}
                    <td className="py-3.5 px-4">
                      <p className="font-extrabold text-white">{bid.bidderName || bid.vendorName}</p>
                      <p className="text-[10px] text-[#A7C9CE] flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3 text-[#A7C9CE]" /> {bid.vendorEmail || 'info@abcinfra.com'}
                      </p>
                      <p className="text-[10px] text-[#A7C9CE] font-mono">Org: {bid.vendorId || 'VND-10028'}</p>
                    </td>

                    {/* Proposed Amount */}
                    <td className="py-3.5 px-4 font-black text-sm text-white">
                      {formatINRLakhsCrores(bid.proposedAmount)}
                    </td>

                    {/* Submitted Date */}
                    <td className="py-3.5 px-4 font-medium text-[#A7C9CE]">
                      {bid.submissionDate || bid.submittedAt || '10/08/2026'}
                    </td>

                    {/* Document Status */}
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold inline-flex items-center gap-1 border ${
                        docStatus === 'Complete'
                          ? 'bg-[#20C997]/10 text-[#20C997] border-[#20C997]/30'
                          : docStatus === 'Missing'
                          ? 'bg-[#FF6B7A]/10 text-[#FF6B7A] border-[#FF6B7A]/30'
                          : 'bg-[#F4C95D]/10 text-[#F4C95D] border-[#F4C95D]/30'
                      }`}>
                        {docStatus === 'Complete' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {docStatus}
                      </span>
                    </td>

                    {/* Eligibility Status */}
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold inline-flex items-center gap-1 border ${
                        elStatus === 'Eligible'
                          ? 'bg-[#06B6B4]/10 text-[#14D9D5] border-[#06B6B4]/30'
                          : elStatus === 'Ineligible'
                          ? 'bg-[#FF6B7A]/10 text-[#FF6B7A] border-[#FF6B7A]/30'
                          : 'bg-[#F4C95D]/10 text-[#F4C95D] border-[#F4C95D]/30'
                      }`}>
                        {elStatus}
                      </span>
                    </td>

                    {/* Verification Status */}
                    <td className="py-3.5 px-4 text-center">
                      <StatusBadge status={verStatus} />
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setActiveBidDetail(bid)}
                        className="px-3 py-1.5 rounded-xl bg-[#06B6B4] hover:bg-[#14D9D5] text-white font-bold transition-all text-xs inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> Inspect Details
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredBids.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#A7C9CE] font-medium">
                    No matching bids or bidders found for the specified search/filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bid Inspection Modal */}
      {activeBidDetail && (
        <div className="fixed inset-0 z-50 bg-[#071F2A]/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="rounded-2xl max-w-2xl w-full border shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 bg-[#0B3442] border-[#1B5968] text-white">
            <div className="flex justify-between items-start border-b pb-4 border-[#1B5968]">
              <div>
                <span className="px-2 py-0.5 rounded bg-[#06B6B4]/20 text-[#14D9D5] border border-[#06B6B4]/30 text-[10px] font-extrabold uppercase tracking-wider">Detailed Audit Record</span>
                <h3 className="text-lg font-extrabold mt-1 text-white">
                  Bid #{activeBidDetail.id} — {activeBidDetail.tenderTitle}
                </h3>
                <p className="text-xs text-[#A7C9CE]">Tender ID: {activeBidDetail.tenderId}</p>
              </div>
              <button
                onClick={() => setActiveBidDetail(null)}
                className="p-1 rounded-lg text-[#A7C9CE] hover:text-white hover:bg-[#103D4A] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl border space-y-1 bg-[#103D4A] border-[#1B5968]">
                <span className="text-[10px] font-bold text-[#A7C9CE] uppercase">Bidder Company</span>
                <p className="font-extrabold text-sm text-white">{activeBidDetail.bidderName || activeBidDetail.vendorName}</p>
                <p className="font-medium text-[#A7C9CE]">Email: {activeBidDetail.vendorEmail || 'info@abcinfra.com'}</p>
                <p className="text-[#A7C9CE] font-mono">Org ID: {activeBidDetail.vendorId || 'VND-10028'}</p>
              </div>

              <div className="p-3 rounded-xl border space-y-1 bg-[#103D4A] border-[#1B5968]">
                <span className="text-[10px] font-bold text-[#A7C9CE] uppercase">Proposed Financial Bid</span>
                <p className="font-extrabold text-sm text-white">{formatINRLakhsCrores(activeBidDetail.proposedAmount)}</p>
                <p className="font-medium text-[#A7C9CE]">Submission Date: {activeBidDetail.submissionDate || activeBidDetail.submittedAt || '10/08/2026'}</p>
                <p className="font-medium text-[#A7C9CE]">Duration: {activeBidDetail.estimatedCompletionTime || '12 Months'}</p>
              </div>
            </div>

            {/* Document Check Verification Summary */}
            <div className="p-4 rounded-xl border space-y-3 bg-[#103D4A] border-[#1B5968]">
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-white">Required Document Compliance Checklist</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center p-2 rounded-lg border bg-[#0B3442] border-[#1B5968] text-white">
                  <span className="font-bold">1. Tax Compliance & Clearance Certificate</span>
                  <span className="text-[#20C997] font-extrabold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Verified & Approved</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg border bg-[#0B3442] border-[#1B5968] text-white">
                  <span className="font-bold">2. ISO 9001 / ISO 27001 Quality Certificate</span>
                  <span className="text-[#20C997] font-extrabold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Verified & Approved</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg border bg-[#0B3442] border-[#1B5968] text-white">
                  <span className="font-bold">3. Bank Solvency & Audited Balance Sheet FY25</span>
                  <span className="text-[#20C997] font-extrabold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Verified & Approved</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                onClick={() => {
                  showToast('Bid document verification confirmed by Admin', 'success');
                  setActiveBidDetail(null);
                }}
                className="px-4 py-2 bg-[#06B6B4] hover:bg-[#14D9D5] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Approve Audit Record
              </button>
              <button
                onClick={() => setActiveBidDetail(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold transition-all bg-[#071F2A] hover:bg-[#145364] text-[#A7C9CE] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      <FilePreviewModal isOpen={!!selectedDoc} onClose={() => setSelectedDoc(null)} document={selectedDoc} />
    </div>
  );
}


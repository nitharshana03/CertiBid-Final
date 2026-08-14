// CertiBid AI - AI Procurement Risk Analyzer Dashboard & Escalated Bid Review Workflow
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  XCircle,
  UserCheck,
  Clock,
  AlertTriangle,
  Gavel,
  FileText,
  ArrowLeft,
  Lock,
  ChevronRight
} from 'lucide-react';

export function AIRiskDashboard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();

  const bidIdParam = searchParams.get('bid') || 'BID-9013';

  const [riskData, setRiskData] = useState(null);
  const [escalation, setEscalation] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [showAdminDecisionModal, setShowAdminDecisionModal] = useState(false);
  const [adminSelectedDecision, setAdminSelectedDecision] = useState(null); // 'ACCEPT' or 'REJECT'
  const [showOfficerFinalModal, setShowOfficerFinalModal] = useState(false);
  const [officerSelectedDecision, setOfficerSelectedDecision] = useState(null); // 'ACCEPT' or 'REJECT'

  // Comment inputs
  const [escalateComment, setEscalateComment] = useState('');
  const [adminComment, setAdminComment] = useState('');
  const [officerComment, setOfficerComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const rawRole = String(user?.role || '').toUpperCase().trim();
  const isAdmin = rawRole === 'ADMIN';
  const isOfficer = rawRole === 'OFFICER';

  useEffect(() => {
    loadData();
  }, [bidIdParam]);

  const loadData = async () => {
    setLoading(true);
    try {
      const riskRes = await apiService.getRiskAnalysis(bidIdParam);
      setRiskData(riskRes.data);

      const escRes = await apiService.getEscalationByBid(bidIdParam);
      setEscalation(escRes.data || null);
    } catch (err) {
      console.error('Failed to load risk analysis or escalation data:', err);
    } finally {
      setLoading(false);
    }
  };

  // 1. OFFICER ESCALATES BID TO ADMIN
  const handleConfirmEscalate = async () => {
    setSubmitting(true);
    try {
      const res = await apiService.escalateBid({
        bidId: bidIdParam,
        tenderId: riskData?.tenderId,
        vendorId: riskData?.vendorId,
        comment: escalateComment
      });
      setEscalation(res.data);
      setShowEscalateModal(false);
      showToast(`Bid ${bidIdParam} successfully escalated to Admin for review.`, 'success');
    } catch (err) {
      showToast(err.message || 'Failed to escalate bid', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // 2. ADMIN SUBMITS REVIEW DECISION (ACCEPT or REJECT)
  const handleOpenAdminModal = (decision) => {
    setAdminSelectedDecision(decision);
    setShowAdminDecisionModal(true);
  };

  const handleConfirmAdminDecision = async () => {
    if (!escalation) return;
    setSubmitting(true);
    try {
      const res = await apiService.submitAdminDecision(escalation.id, {
        decision: adminSelectedDecision,
        comment: adminComment
      });
      setEscalation(res.data);
      setShowAdminDecisionModal(false);
      showToast(
        `Admin decision recorded as ${adminSelectedDecision}. Bid returned to Procurement Officer for final decision.`,
        'success'
      );
    } catch (err) {
      showToast(err.message || 'Failed to record Admin decision', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // 3. OFFICER SUBMITS FINAL PROCUREMENT DECISION (ACCEPT or REJECT)
  const handleOpenOfficerModal = (decision) => {
    setOfficerSelectedDecision(decision);
    setShowOfficerFinalModal(true);
  };

  const handleConfirmOfficerFinalDecision = async () => {
    if (!escalation) return;
    setSubmitting(true);
    try {
      const res = await apiService.submitFinalDecision(escalation.id, {
        decision: officerSelectedDecision,
        comment: officerComment
      });
      setEscalation(res.data);
      setShowOfficerFinalModal(false);
      showToast(
        `Final procurement decision recorded as ${officerSelectedDecision}. Bid status updated in database.`,
        'success'
      );
    } catch (err) {
      showToast(err.message || 'Failed to record final procurement decision', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !riskData) {
    return (
      <div className="p-12 text-center text-xs text-[#A7C9CE] flex flex-col items-center justify-center gap-3">
        <Sparkles className="w-8 h-8 text-[#06B6B4] animate-pulse" />
        <span>Running AI Neural Risk Analysis Engine...</span>
      </div>
    );
  }

  const { overallRiskScore, riskIndicators, explainableAI, vendorName, tenderTitle, confidenceScore, proposedAmount } = riskData;

  const currentStatus = escalation?.status || 'NORMAL';

  return (
    <div className="space-y-6 text-[#F0FDFA]">
      {/* Back to Dashboard Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-xs font-bold text-[#A7C9CE] hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        {escalation && (
          <button
            onClick={() => navigate('/dashboard/escalated-bids')}
            className="px-3 py-1.5 rounded-xl bg-[#103D4A] hover:bg-[#103D4A]/80 border border-[#1B5968] text-xs font-bold text-[#14D9D5] flex items-center gap-1.5 cursor-pointer"
          >
            <Gavel className="w-4 h-4" /> View Escalated Bids Queue
          </button>
        )}
      </div>

      {/* Header Banner */}
      <div className="p-6 rounded-2xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl bg-[#0B3442] border-[#1B5968] text-white">
        <div>
          <div className="flex items-center gap-2 text-[#FF6B7A] text-xs font-bold uppercase tracking-wider mb-1">
            <ShieldAlert className="w-4 h-4 text-[#FF6B7A]" /> CertiBid Explainable AI Forensics & Risk Evaluation
          </div>
          <h2 className="text-2xl font-extrabold text-white">{vendorName}</h2>
          <p className="text-xs mt-1 text-[#A7C9CE]">
            Proposal Bid ID: <span className="text-[#14D9D5] font-bold">{bidIdParam}</span> • Tender: {tenderTitle}
            {proposedAmount && ` • Quoted: ₹${proposedAmount.toLocaleString()}`}
          </p>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#A7C9CE]">AI Neural Confidence</span>
            <p className="text-lg font-black text-[#20C997]">{confidenceScore}%</p>
          </div>
          <div className={`p-4 rounded-2xl border text-center ${
            overallRiskScore > 75 ? 'bg-[#FF6B7A]/10 border-[#FF6B7A]/30 text-[#FF6B7A]' : 'bg-[#20C997]/10 border-[#20C997]/30 text-[#20C997]'
          }`}>
            <span className="text-[10px] uppercase font-bold tracking-wider">Overall Risk Score</span>
            <p className="text-3xl font-black">{overallRiskScore} / 100</p>
          </div>
        </div>
      </div>

      {/* Workflow Status Banner if Escalated */}
      {escalation && (
        <div className="p-4 rounded-2xl bg-[#103D4A] border border-[#1B5968] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#0B3442] border border-[#1B5968]">
              <Gavel className="w-5 h-5 text-[#14D9D5]" />
            </div>
            <div>
              <p className="font-extrabold text-white text-sm">Escalation Governance Tracker</p>
              <p className="text-[11px] text-[#A7C9CE]">
                Escalated by <span className="text-white font-bold">{escalation.escalatedByOfficerName || 'Officer'}</span> on {new Date(escalation.escalatedAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[#A7C9CE] font-bold text-[11px]">Workflow Phase:</span>
            {currentStatus === 'ESCALATED_TO_ADMIN' && (
              <span className="px-3 py-1 rounded-full bg-[#F4C95D]/20 text-[#F4C95D] border border-[#F4C95D]/40 font-extrabold text-xs inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Pending Admin Review
              </span>
            )}
            {currentStatus === 'ADMIN_ACCEPTED_PENDING_OFFICER' && (
              <span className="px-3 py-1 rounded-full bg-[#06B6B4]/20 text-[#14D9D5] border border-[#06B6B4]/40 font-extrabold text-xs inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#20C997]" /> Admin Accepted • Pending Officer Final Decision
              </span>
            )}
            {currentStatus === 'ADMIN_REJECTED_PENDING_OFFICER' && (
              <span className="px-3 py-1 rounded-full bg-[#FF6B7A]/20 text-[#FF6B7A] border border-[#FF6B7A]/40 font-extrabold text-xs inline-flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5" /> Admin Rejected • Pending Officer Final Decision
              </span>
            )}
            {currentStatus === 'FINAL_ACCEPTED' && (
              <span className="px-3 py-1 rounded-full bg-[#20C997]/20 text-[#20C997] border border-[#20C997]/40 font-black text-xs inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Final Status: ACCEPTED
              </span>
            )}
            {currentStatus === 'FINAL_REJECTED' && (
              <span className="px-3 py-1 rounded-full bg-[#FF6B7A]/20 text-[#FF6B7A] border border-[#FF6B7A]/40 font-black text-xs inline-flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5" /> Final Status: REJECTED
              </span>
            )}
          </div>
        </div>
      )}

      {/* 5 Risk Indicators Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {Object.entries(riskIndicators).map(([key, item]) => (
          <div key={key} className="p-4 rounded-2xl border space-y-2 bg-[#103D4A] border-[#1B5968]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold capitalize text-[#A7C9CE]">{key.replace(/([A-Z])/g, ' $1')}</span>
              <span className={`text-xs font-black px-2 py-0.5 rounded ${item.score > 70 ? 'bg-[#FF6B7A]/10 text-[#FF6B7A] border border-[#FF6B7A]/20' : 'bg-[#20C997]/10 text-[#20C997] border border-[#20C997]/20'}`}>
                {item.score}/100
              </span>
            </div>
            <p className="text-xs font-extrabold text-white">{item.status}</p>
            <p className="text-[10px] leading-snug text-[#A7C9CE]">{item.details}</p>
          </div>
        ))}
      </div>

      {/* Explainable AI Deep Dive */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Key Factor Triggers */}
        <div className="p-6 rounded-2xl border space-y-4 bg-[#103D4A] border-[#1B5968]">
          <h3 className="text-sm font-bold flex items-center gap-2 text-white">
            <Sparkles className="w-4 h-4 text-[#14D9D5]" /> Explainable AI (XAI) Key Decision Factors
          </h3>
          <div className="space-y-2.5">
            {explainableAI.keyFactors.map((factor, idx) => (
              <div key={idx} className="p-3.5 rounded-xl border text-xs flex items-start gap-3 bg-[#0B3442] border-[#1B5968] text-[#F0FDFA]">
                <span className="w-5 h-5 rounded-full bg-[#06B6B4] text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                  {idx + 1}
                </span>
                <p className="leading-relaxed font-medium">{factor}</p>
              </div>
            ))}
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="p-6 rounded-2xl border space-y-4 bg-[#103D4A] border-[#1B5968] text-white">
          <h3 className="text-sm font-bold flex items-center gap-2 text-[#22C7D6]">
            <ShieldCheck className="w-4 h-4 text-[#22C7D6]" /> AI System Recommendations
          </h3>
          <div className="space-y-2 text-xs">
            {explainableAI.recommendations.map((rec, idx) => (
              <div key={idx} className="p-3 rounded-xl border flex items-center gap-2 bg-[#0B3442] border-[#1B5968] text-[#F0FDFA]">
                <CheckCircle2 className="w-4 h-4 text-[#20C997] shrink-0" />
                <span>{rec}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* WORKFLOW DECISION CONTROL PANELS                                          */}
      {/* ========================================================================= */}

      {/* CASE 1: UN-ESCALATED BID -> OFFICER CAN ESCALATE */}
      {!escalation && isOfficer && (
        <div className="p-6 rounded-2xl bg-[#0B3442] border border-[#1B5968] flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#06B6B4]" /> Procurement Officer Action Desk
            </h4>
            <p className="text-xs text-[#A7C9CE] mt-0.5">
              If this bid requires senior governance review or exhibits elevated risk, escalate it to the System Administrator.
            </p>
          </div>
          <button
            onClick={() => setShowEscalateModal(true)}
            className="px-6 py-3 rounded-xl bg-[#06B6B4] hover:bg-[#14D9D5] text-white font-extrabold text-xs shadow-lg flex items-center gap-2 transition-all cursor-pointer shrink-0"
          >
            <UserCheck className="w-4 h-4" />
            <span>Escalate Bid to Admin</span>
          </button>
        </div>
      )}

      {/* CASE 2: STEP 2 - ADMIN REVIEW (PERFORMED BY ADMIN) */}
      {escalation && currentStatus === 'ESCALATED_TO_ADMIN' && (
        <div className="p-6 rounded-2xl bg-[#0B3442] border-2 border-[#F4C95D]/40 space-y-4 shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[#F4C95D] text-xs font-bold uppercase tracking-wider mb-1">
                <Gavel className="w-4 h-4" /> Escalated Bid - Step 2: Admin Governance Review
              </div>
              <h4 className="text-lg font-extrabold text-white">Admin Review & Governance Recommendation</h4>
              <p className="text-xs text-[#A7C9CE] mt-1">
                Escalated by <span className="text-white font-bold">{escalation.escalatedByOfficerName}</span>: "{escalation.officerComment || 'Governance review requested.'}"
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-[#F4C95D]/20 text-[#F4C95D] border border-[#F4C95D]/40 font-extrabold text-xs shrink-0">
              Awaiting Admin Action
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#103D4A] border border-[#1B5968] text-[11px] text-[#A7C9CE]">
            <p className="font-semibold text-white mb-0.5">Important Governance Note:</p>
            <p>
              As System Administrator, your decision (ACCEPT or REJECT) provides an administrative risk review. The Procurement Officer will receive your decision and make the final, binding procurement award decision.
            </p>
          </div>

          {isAdmin ? (
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3">
              <button
                onClick={() => handleOpenAdminModal('REJECT')}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#FF6B7A] hover:bg-[#FF6B7A]/80 text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                <span>ADMIN REJECT (Governance Risk Flag)</span>
              </button>
              <button
                onClick={() => handleOpenAdminModal('ACCEPT')}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#20C997] hover:bg-[#20C997]/80 text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>ADMIN ACCEPT (Governance Clearance)</span>
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-[#103D4A] text-center text-xs text-[#A7C9CE] italic">
              Currently awaiting System Administrator review. Once Admin submits a decision, the Procurement Officer will issue the final decision.
            </div>
          )}
        </div>
      )}

      {/* CASE 3: STEP 3 - OFFICER FINAL DECISION (PERFORMED BY OFFICER) */}
      {escalation && (currentStatus === 'ADMIN_ACCEPTED_PENDING_OFFICER' || currentStatus === 'ADMIN_REJECTED_PENDING_OFFICER') && (
        <div className="space-y-4">
          {/* Admin Decision Outcome Box */}
          <div className="p-5 rounded-2xl bg-[#103D4A] border border-[#1B5968] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <CheckCircle2 className="w-4 h-4 text-[#14D9D5]" /> Step 2 Outcome: Admin Governance Review Decision
              </div>
              <span className={`px-3 py-1 rounded-full font-black text-xs uppercase ${
                escalation.adminDecision === 'ACCEPTED'
                  ? 'bg-[#20C997]/20 text-[#20C997] border border-[#20C997]/40'
                  : 'bg-[#FF6B7A]/20 text-[#FF6B7A] border border-[#FF6B7A]/40'
              }`}>
                Admin Recommendation: {escalation.adminDecision}
              </span>
            </div>
            <p className="text-xs text-[#A7C9CE]">
              Reviewed by Admin <span className="text-white font-bold">{escalation.adminName || 'System Administrator'}</span> on {new Date(escalation.adminDecisionAt).toLocaleString()}
            </p>
            {escalation.adminComment && (
              <div className="p-3 rounded-xl bg-[#0B3442] border border-[#1B5968] text-xs text-[#F0FDFA] mt-2 italic">
                "{escalation.adminComment}"
              </div>
            )}
          </div>

          {/* Officer Final Decision Control Card */}
          <div className="p-6 rounded-2xl bg-[#0B3442] border-2 border-[#06B6B4] space-y-4 shadow-xl">
            <div>
              <div className="flex items-center gap-2 text-[#14D9D5] text-xs font-bold uppercase tracking-wider mb-1">
                <Gavel className="w-4 h-4" /> Escalated Bid - Step 3: Officer Final Procurement Decision
              </div>
              <h4 className="text-lg font-extrabold text-white">Final Contract Award Authority Desk</h4>
              <p className="text-xs text-[#A7C9CE] mt-1">
                Review the Admin's governance recommendation above and issue the binding final procurement decision for this proposal.
              </p>
            </div>

            {isOfficer ? (
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3">
                <button
                  onClick={() => handleOpenOfficerModal('REJECT')}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#FF6B7A] hover:bg-[#FF6B7A]/80 text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  <span>FINAL REJECT (Contract Rejection)</span>
                </button>
                <button
                  onClick={() => handleOpenOfficerModal('ACCEPT')}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#20C997] hover:bg-[#20C997]/80 text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>FINAL ACCEPT (Contract Award Approval)</span>
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#103D4A] text-center text-xs text-[#A7C9CE] italic">
                Admin review complete. Currently awaiting Procurement Officer final decision.
              </div>
            )}
          </div>
        </div>
      )}

      {/* CASE 4: FINALIZED AUDIT TRAIL */}
      {escalation && (currentStatus === 'FINAL_ACCEPTED' || currentStatus === 'FINAL_REJECTED') && (
        <div className="p-6 rounded-2xl bg-[#0B3442] border border-[#1B5968] space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#1B5968] pb-3">
            <div>
              <h4 className="text-base font-extrabold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#20C997]" /> Completed Escalation Audit Trail & Final Decision
              </h4>
              <p className="text-xs text-[#A7C9CE] mt-0.5">
                This escalated bid review has been finalized and recorded in the immutable database audit ledger.
              </p>
            </div>
            <span className={`px-4 py-1.5 rounded-full font-black text-xs uppercase ${
              escalation.finalDecision === 'ACCEPTED'
                ? 'bg-[#20C997]/20 text-[#20C997] border border-[#20C997]/40'
                : 'bg-[#FF6B7A]/20 text-[#FF6B7A] border border-[#FF6B7A]/40'
            }`}>
              FINAL STATUS: {escalation.finalDecision}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Step 1 Officer Escalation */}
            <div className="p-4 rounded-xl bg-[#103D4A] border border-[#1B5968] space-y-2">
              <span className="text-[10px] uppercase font-bold text-[#A7C9CE]">Step 1 • Officer Escalation</span>
              <p className="font-extrabold text-white">{escalation.escalatedByOfficerName}</p>
              <p className="text-[10px] text-[#A7C9CE]">{new Date(escalation.escalatedAt).toLocaleString()}</p>
              <p className="text-[11px] text-[#F0FDFA] italic">"{escalation.officerComment || 'Escalated for governance review.'}"</p>
            </div>

            {/* Step 2 Admin Review */}
            <div className="p-4 rounded-xl bg-[#103D4A] border border-[#1B5968] space-y-2">
              <span className="text-[10px] uppercase font-bold text-[#A7C9CE]">Step 2 • Admin Review Recommendation</span>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white">{escalation.adminName}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                  escalation.adminDecision === 'ACCEPTED' ? 'bg-[#20C997]/20 text-[#20C997]' : 'bg-[#FF6B7A]/20 text-[#FF6B7A]'
                }`}>
                  {escalation.adminDecision}
                </span>
              </div>
              <p className="text-[10px] text-[#A7C9CE]">{new Date(escalation.adminDecisionAt).toLocaleString()}</p>
              <p className="text-[11px] text-[#F0FDFA] italic">"{escalation.adminComment || 'Governance review completed.'}"</p>
            </div>

            {/* Step 3 Officer Final Decision */}
            <div className="p-4 rounded-xl bg-[#103D4A] border border-[#1B5968] space-y-2">
              <span className="text-[10px] uppercase font-bold text-[#A7C9CE]">Step 3 • Officer Final Decision</span>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white">{escalation.finalDecisionByOfficerName || escalation.escalatedByOfficerName}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                  escalation.finalDecision === 'ACCEPTED' ? 'bg-[#20C997]/20 text-[#20C997]' : 'bg-[#FF6B7A]/20 text-[#FF6B7A]'
                }`}>
                  FINAL {escalation.finalDecision}
                </span>
              </div>
              <p className="text-[10px] text-[#A7C9CE]">{new Date(escalation.finalDecisionAt).toLocaleString()}</p>
              <p className="text-[11px] text-[#F0FDFA] italic">"{escalation.finalComment || 'Final procurement decision recorded.'}"</p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS                                                                    */}
      {/* ========================================================================= */}

      {/* 1. ESCALATION MODAL */}
      {showEscalateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0B3442] border border-[#1B5968] rounded-2xl max-w-lg w-full p-6 text-white space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-[#FF6B7A]">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="text-lg font-extrabold">Escalate Bid to System Administrator</h3>
            </div>
            <p className="text-xs text-[#A7C9CE]">
              You are escalating proposal <span className="font-bold text-white">{bidIdParam}</span> from bidder <span className="font-bold text-white">{vendorName}</span> to the System Administrator for governance risk evaluation.
            </p>
            <div>
              <label className="block text-xs font-bold text-[#A7C9CE] mb-1">
                Escalation Rationale / Officer Remarks
              </label>
              <textarea
                value={escalateComment}
                onChange={(e) => setEscalateComment(e.target.value)}
                placeholder="Specify the risk concerns or reasons for requesting Admin governance review..."
                rows={3}
                className="w-full bg-[#103D4A] border border-[#1B5968] rounded-xl p-3 text-xs text-white placeholder-[#A7C9CE]/50 focus:outline-hidden focus:border-[#06B6B4]"
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowEscalateModal(false)}
                className="px-4 py-2 rounded-xl bg-[#103D4A] hover:bg-[#103D4A]/80 text-xs font-bold text-[#A7C9CE] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmEscalate}
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-[#06B6B4] hover:bg-[#14D9D5] text-xs font-bold text-white shadow-md cursor-pointer"
              >
                {submitting ? 'Escalating...' : 'Confirm Escalation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. ADMIN REVIEW DECISION MODAL */}
      {showAdminDecisionModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0B3442] border border-[#1B5968] rounded-2xl max-w-lg w-full p-6 text-white space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              {adminSelectedDecision === 'ACCEPT' ? (
                <CheckCircle2 className="w-6 h-6 text-[#20C997]" />
              ) : (
                <XCircle className="w-6 h-6 text-[#FF6B7A]" />
              )}
              <h3 className="text-lg font-extrabold">
                Confirm Admin Governance Review: {adminSelectedDecision}
              </h3>
            </div>
            <div className="p-3 rounded-xl bg-[#103D4A] border border-[#1B5968] text-xs text-[#A7C9CE] space-y-1">
              <p><span className="font-bold text-white">Bid ID:</span> {bidIdParam}</p>
              <p><span className="font-bold text-white">Bidder:</span> {vendorName}</p>
              <p><span className="font-bold text-white">Selected Admin Recommendation:</span> <span className={`font-extrabold uppercase ${adminSelectedDecision === 'ACCEPT' ? 'text-[#20C997]' : 'text-[#FF6B7A]'}`}>{adminSelectedDecision}ED</span></p>
              <p className="text-[10px] text-[#14D9D5] pt-1 italic">
                Note: This Admin decision will be sent back to the Procurement Officer, who will make the final, binding procurement decision.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#A7C9CE] mb-1">
                Admin Review Rationale / Forensics Notes
              </label>
              <textarea
                value={adminComment}
                onChange={(e) => setAdminComment(e.target.value)}
                placeholder="Provide governance rationale or details regarding your review decision..."
                rows={3}
                className="w-full bg-[#103D4A] border border-[#1B5968] rounded-xl p-3 text-xs text-white placeholder-[#A7C9CE]/50 focus:outline-hidden focus:border-[#06B6B4]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowAdminDecisionModal(false)}
                className="px-4 py-2 rounded-xl bg-[#103D4A] hover:bg-[#103D4A]/80 text-xs font-bold text-[#A7C9CE] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAdminDecision}
                disabled={submitting}
                className={`px-5 py-2.5 rounded-xl font-extrabold text-xs text-white shadow-md cursor-pointer ${
                  adminSelectedDecision === 'ACCEPT' ? 'bg-[#20C997] hover:bg-[#20C997]/80' : 'bg-[#FF6B7A] hover:bg-[#FF6B7A]/80'
                }`}
              >
                {submitting ? 'Submitting...' : `Submit Admin ${adminSelectedDecision}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. OFFICER FINAL DECISION MODAL */}
      {showOfficerFinalModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0B3442] border border-[#1B5968] rounded-2xl max-w-lg w-full p-6 text-white space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              {officerSelectedDecision === 'ACCEPT' ? (
                <CheckCircle2 className="w-6 h-6 text-[#20C997]" />
              ) : (
                <XCircle className="w-6 h-6 text-[#FF6B7A]" />
              )}
              <h3 className="text-lg font-extrabold">
                Confirm Final Procurement Decision: {officerSelectedDecision}
              </h3>
            </div>

            <div className="p-3 rounded-xl bg-[#103D4A] border border-[#1B5968] text-xs text-[#A7C9CE] space-y-1">
              <p><span className="font-bold text-white">Bid ID:</span> {bidIdParam}</p>
              <p><span className="font-bold text-white">Bidder:</span> {vendorName}</p>
              <p><span className="font-bold text-white">Admin Recommendation:</span> <span className="font-extrabold text-[#14D9D5]">{escalation?.adminDecision}</span></p>
              <p><span className="font-bold text-white">Your Final Decision:</span> <span className={`font-extrabold uppercase ${officerSelectedDecision === 'ACCEPT' ? 'text-[#20C997]' : 'text-[#FF6B7A]'}`}>{officerSelectedDecision}ED</span></p>
              <p className="text-[10px] text-[#20C997] pt-1 italic font-semibold">
                This is the binding final procurement decision and will be persisted in the system database.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#A7C9CE] mb-1">
                Final Procurement Award Rationale
              </label>
              <textarea
                value={officerComment}
                onChange={(e) => setOfficerComment(e.target.value)}
                placeholder="State final procurement award or rejection rationale..."
                rows={3}
                className="w-full bg-[#103D4A] border border-[#1B5968] rounded-xl p-3 text-xs text-white placeholder-[#A7C9CE]/50 focus:outline-hidden focus:border-[#06B6B4]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowOfficerFinalModal(false)}
                className="px-4 py-2 rounded-xl bg-[#103D4A] hover:bg-[#103D4A]/80 text-xs font-bold text-[#A7C9CE] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmOfficerFinalDecision}
                disabled={submitting}
                className={`px-5 py-2.5 rounded-xl font-extrabold text-xs text-white shadow-md cursor-pointer ${
                  officerSelectedDecision === 'ACCEPT' ? 'bg-[#20C997] hover:bg-[#20C997]/80' : 'bg-[#FF6B7A] hover:bg-[#FF6B7A]/80'
                }`}
              >
                {submitting ? 'Submitting...' : `Submit Final ${officerSelectedDecision}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

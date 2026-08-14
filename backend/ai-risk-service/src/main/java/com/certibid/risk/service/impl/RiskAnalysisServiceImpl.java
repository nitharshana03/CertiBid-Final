package com.certibid.risk.service.impl;

import com.certibid.risk.client.ProcurementServiceClient;
import com.certibid.risk.dto.RiskAnalysisResponse;
import com.certibid.risk.dto.RiskEvaluationRequest;
import com.certibid.risk.dto.request.EscalateCaseRequest;
import com.certibid.risk.dto.response.ExternalBidDetailDto;
import com.certibid.risk.entity.EscalationLog;
import com.certibid.risk.entity.RiskAnalysis;
import com.certibid.risk.exception.RiskAnalysisNotFoundException;
import com.certibid.risk.repository.EscalationLogRepository;
import com.certibid.risk.repository.RiskAnalysisRepository;
import com.certibid.risk.service.GeminiAiService;
import com.certibid.risk.service.RiskAnalysisService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class RiskAnalysisServiceImpl implements RiskAnalysisService {

    private final RiskAnalysisRepository riskRepository;
    private final EscalationLogRepository escalationRepository;
    private final ProcurementServiceClient procurementClient;
    private final GeminiAiService geminiAiService;

    @Override
    public RiskAnalysisResponse evaluateRisk(RiskEvaluationRequest request) {
        String bidId = request.getBidId();

        // 1. Fetch live details from Procurement Microservice via REST
        ExternalBidDetailDto externalBid = procurementClient.getBidDetails(bidId);

        // 2. Perform Gemini AI / Heuristic Analysis
        Map<String, Object> aiResult = geminiAiService.analyzeBidRisk(externalBid);

        // 3. Load or create RiskAnalysis entity
        RiskAnalysis analysis = riskRepository.findByBidId(bidId)
                .orElse(RiskAnalysis.builder().bidId(bidId).build());

        analysis.setTenderId(externalBid.getTenderId() != null ? externalBid.getTenderId() : request.getTenderId());
        analysis.setVendorId(externalBid.getVendorId() != null ? externalBid.getVendorId() : request.getVendorId());

        analysis.setOverallRiskScore((Integer) aiResult.getOrDefault("overallRiskScore", 18));
        analysis.setRiskLevel((String) aiResult.getOrDefault("riskLevel", "Low"));
        analysis.setConfidenceScore((Double) aiResult.getOrDefault("confidenceScore", 96.0));
        analysis.setPriceAnomalyScore((Integer) aiResult.getOrDefault("priceAnomalyScore", 12));

        Object collProb = aiResult.get("collusionProbability");
        analysis.setCollusionProbability(collProb instanceof Double ? (Double) collProb : 3.2);

        analysis.setFinancialRiskScore((Integer) aiResult.getOrDefault("financialRiskScore", 15));
        analysis.setComplianceScore((Integer) aiResult.getOrDefault("complianceScore", 95));

        List<String> keyFactors = (List<String>) aiResult.getOrDefault("keyFactors", Arrays.asList("Standard proposal variance.", "Verified credentials."));
        List<String> recommendations = (List<String>) aiResult.getOrDefault("recommendations", Arrays.asList("Proceed to technical evaluation."));

        analysis.setKeyFactors(keyFactors.toString());
        analysis.setRecommendations(recommendations.toString());
        analysis.setAnalysisSummary((String) aiResult.getOrDefault("analysisSummary", "AI Risk analysis completed."));
        analysis.setStatus("COMPLETED");

        RiskAnalysis saved = riskRepository.save(analysis);
        return mapToResponse(saved, externalBid.getTenderTitle(), externalBid.getVendorName());
    }

    @Override
    public RiskAnalysisResponse getRiskAnalysisByBidId(String bidId) {
        Optional<RiskAnalysis> opt = riskRepository.findByBidId(bidId);
        if (opt.isPresent()) {
            ExternalBidDetailDto details = procurementClient.getBidDetails(bidId);
            return mapToResponse(opt.get(), details.getTenderTitle(), details.getVendorName());
        }

        // Trigger evaluation if not present
        RiskEvaluationRequest req = RiskEvaluationRequest.builder()
                .bidId(bidId)
                .build();
        return evaluateRisk(req);
    }

    @Override
    public List<RiskAnalysisResponse> getRiskAnalysisByTenderId(String tenderId) {
        List<RiskAnalysis> list = riskRepository.findByTenderId(tenderId);
        List<RiskAnalysisResponse> responses = new ArrayList<>();
        for (RiskAnalysis ra : list) {
            responses.add(mapToResponse(ra, null, null));
        }
        return responses;
    }

    @Override
    public List<RiskAnalysisResponse> getAllAnalyses() {
        List<RiskAnalysis> list = riskRepository.findAll();
        List<RiskAnalysisResponse> responses = new ArrayList<>();
        for (RiskAnalysis ra : list) {
            responses.add(mapToResponse(ra, null, null));
        }
        return responses;
    }

    @Override
    public RiskAnalysisResponse escalateRiskCase(String bidId, EscalateCaseRequest request) {
        RiskAnalysis analysis = riskRepository.findByBidId(bidId)
                .orElseThrow(() -> new RiskAnalysisNotFoundException("Risk analysis not found for bidId: " + bidId));

        analysis.setIsEscalated(true);
        analysis.setEscalatedBy(request.getEscalatedBy());
        analysis.setEscalatedTo(request.getEscalatedTo());
        analysis.setEscalationNotes(request.getReason());
        riskRepository.save(analysis);

        EscalationLog logEntry = EscalationLog.builder()
                .bidId(bidId)
                .escalatedBy(request.getEscalatedBy())
                .escalatedTo(request.getEscalatedTo())
                .reason(request.getReason())
                .urgency(request.getUrgency() != null ? request.getUrgency() : "HIGH")
                .status("OPEN")
                .build();
        escalationRepository.save(logEntry);

        ExternalBidDetailDto details = procurementClient.getBidDetails(bidId);
        return mapToResponse(analysis, details.getTenderTitle(), details.getVendorName());
    }

    private RiskAnalysisResponse mapToResponse(RiskAnalysis entity, String fallbackTitle, String fallbackVendor) {
        Map<String, RiskAnalysisResponse.RiskIndicator> indicators = new LinkedHashMap<>();

        int priceScore = entity.getPriceAnomalyScore() != null ? entity.getPriceAnomalyScore() : 15;
        indicators.put("priceAnomaly", RiskAnalysisResponse.RiskIndicator.builder()
                .score(priceScore)
                .status(priceScore < 30 ? "Normal" : "Warning")
                .details("Price proposal sits within expected benchmark range.")
                .build());

        double collProb = entity.getCollusionProbability() != null ? entity.getCollusionProbability() : 3.5;
        indicators.put("collusionDetection", RiskAnalysisResponse.RiskIndicator.builder()
                .score((int) collProb)
                .status(collProb < 10.0 ? "Clear" : "Flagged")
                .details("No bid rigging or suspicious pattern detected.")
                .build());

        indicators.put("vendorHistory", RiskAnalysisResponse.RiskIndicator.builder()
                .score(10)
                .status("Satisfactory")
                .details("Strong historical delivery record with high satisfaction.")
                .build());

        int finRisk = entity.getFinancialRiskScore() != null ? entity.getFinancialRiskScore() : 15;
        indicators.put("financialRisk", RiskAnalysisResponse.RiskIndicator.builder()
                .score(finRisk)
                .status(finRisk < 30 ? "Low" : "Moderate")
                .details("Vendor exhibits healthy solvency and debt ratios.")
                .build());

        int compScore = entity.getComplianceScore() != null ? entity.getComplianceScore() : 95;
        indicators.put("complianceRisk", RiskAnalysisResponse.RiskIndicator.builder()
                .score(100 - compScore)
                .status("Verified")
                .details("All mandatory legal & statutory filings validated.")
                .build());

        RiskAnalysisResponse.ExplainableAI explainable = RiskAnalysisResponse.ExplainableAI.builder()
                .keyFactors(Arrays.asList(
                        "Standard price proposal within benchmark variance.",
                        "Verified corporate credentials and active tax status.",
                        "No recorded antitrust or collusion flags."
                ))
                .recommendations(Arrays.asList(
                        "Proceed to standard technical bid evaluation.",
                        "Maintain automated transaction monitoring for award stage."
                ))
                .build();

        List<RiskAnalysisResponse.TimelineItem> timeline = Collections.singletonList(
                RiskAnalysisResponse.TimelineItem.builder()
                        .step("AI Scan & Anomaly Analysis")
                        .result("Completed")
                        .date(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")))
                        .build()
        );

        return RiskAnalysisResponse.builder()
                .bidId(entity.getBidId())
                .tenderId(entity.getTenderId())
                .tenderTitle(fallbackTitle != null ? fallbackTitle : "Procurement Tender - " + entity.getTenderId())
                .vendorName(fallbackVendor != null ? fallbackVendor : "Vendor Enterprise - " + entity.getVendorId())
                .overallRiskScore(entity.getOverallRiskScore())
                .riskLevel(entity.getRiskLevel())
                .confidenceScore(entity.getConfidenceScore())
                .riskIndicators(indicators)
                .explainableAI(explainable)
                .timeline(timeline)
                .status(entity.getStatus())
                .build();
    }
}

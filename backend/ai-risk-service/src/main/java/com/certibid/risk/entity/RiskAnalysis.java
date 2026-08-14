package com.certibid.risk.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "risk_analyses")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RiskAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String bidId;

    private String tenderId;
    private String vendorId;

    private Integer overallRiskScore;
    private String riskLevel; // Low, Medium, High, Critical
    private Double confidenceScore;

    private Integer priceAnomalyScore;
    private Double collusionProbability;
    private Integer financialRiskScore;
    private Integer complianceScore;

    @Column(columnDefinition = "TEXT")
    private String keyFactors;

    @Column(columnDefinition = "TEXT")
    private String recommendations;

    @Column(columnDefinition = "TEXT")
    private String flaggedItems;

    @Column(columnDefinition = "TEXT")
    private String analysisSummary;

    private String status; // PENDING, IN_PROGRESS, COMPLETED, FAILED

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) status = "COMPLETED";
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

package com.certibid.procurement.repository;

import com.certibid.procurement.entity.Vendor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VendorRepository extends JpaRepository<Vendor, String> {

    List<Vendor> findByVerificationStatus(String status);

    List<Vendor> findByRiskLevel(String riskLevel);
}

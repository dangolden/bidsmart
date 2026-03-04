import { useState } from 'react';
import { Star, CheckCircle, ChevronDown, ChevronUp, Shield, Building2 } from 'lucide-react';
import { deduplicateBids, getContractorDisplayName, type BidEntry } from '../../lib/utils/bidDeduplication';
import { getHighestValue, isHighlighted, LABEL_COL_WIDTH, BID_COL_MIN_WIDTH } from '../../lib/utils/comparisonHelpers';

interface ContractorsTabProps {
  bids: BidEntry[];
}

/**
 * Returns true if at least one value in the array is non-null, non-empty, and not false.
 * Used to hide entire rows when ALL contractors have no data for a field.
 */
function shouldShowRow(values: unknown[]): boolean {
  return values.some(v => v != null && v !== '' && v !== false);
}

export function ContractorsTab({ bids }: ContractorsTabProps) {
  const [showMore, setShowMore] = useState(true);

  const deduplicatedBids = deduplicateBids(bids);

  const contractorData = deduplicatedBids.map((b, idx) => {
    const c = b.contractor;
    return {
      bidId: b.bid.id,
      contractor: getContractorDisplayName(b.bid.contractor_name, idx, b.contractor),
      // Ratings
      googleRating: c?.google_rating,
      googleReviewCount: c?.google_review_count,
      yelpRating: c?.yelp_rating,
      yelpReviewCount: c?.yelp_review_count,
      bbbRating: c?.bbb_rating,
      bbbAccredited: c?.bbb_accredited,
      bbbComplaints: c?.bbb_complaints_3yr,
      // Licensing
      license: c?.license,
      licenseState: c?.license_state,
      licenseStatus: c?.license_status,
      licenseExpiration: c?.license_expiration_date,
      insuranceVerified: c?.insurance_verified,
      bonded: c?.bonded,
      // Company details
      yearsInBusiness: c?.years_in_business,
      yearEstablished: c?.year_established,
      certifications: c?.certifications || [],
      totalInstalls: c?.total_installs,
      employeeCount: c?.employee_count,
      serviceArea: c?.service_area,
      contactName: c?.contact_name,
      phone: c?.phone,
      email: c?.email,
      website: c?.website,
      address: c?.address,
      mergedBidCount: (b as ReturnType<typeof deduplicateBids>[0]).mergedBidCount,
    };
  });

  const bestRating = getHighestValue(contractorData.map((c) => c.googleRating));
  const bestYears = getHighestValue(contractorData.map((c) => c.yearsInBusiness));

  const bidCount = deduplicatedBids.length;
  const tableMinWidth = `calc(${LABEL_COL_WIDTH} + (${bidCount} * ${BID_COL_MIN_WIDTH}))`;
  const labelCellStyle = { width: LABEL_COL_WIDTH, minWidth: LABEL_COL_WIDTH, maxWidth: LABEL_COL_WIDTH };
  const bidCellStyle = { minWidth: BID_COL_MIN_WIDTH };

  // Precompute which rows have data (for smart row hiding)
  const hasGoogle = shouldShowRow(contractorData.map(c => c.googleRating));
  const hasYelp = shouldShowRow(contractorData.map(c => c.yelpRating));
  const hasBbbRating = shouldShowRow(contractorData.map(c => c.bbbRating));
  const hasBbbComplaints = shouldShowRow(contractorData.map(c => c.bbbComplaints));
  const hasLicense = shouldShowRow(contractorData.map(c => c.license));
  const hasLicenseState = shouldShowRow(contractorData.map(c => c.licenseState));
  const hasLicenseStatus = shouldShowRow(contractorData.map(c => c.licenseStatus));
  const hasInsurance = shouldShowRow(contractorData.map(c => c.insuranceVerified));
  const hasBonded = shouldShowRow(contractorData.map(c => c.bonded));
  const hasYears = shouldShowRow(contractorData.map(c => c.yearsInBusiness));
  const hasYearEstablished = shouldShowRow(contractorData.map(c => c.yearEstablished));
  const hasCertifications = shouldShowRow(contractorData.map(c => c.certifications.length > 0 ? true : null));
  const hasTotalInstalls = shouldShowRow(contractorData.map(c => c.totalInstalls));
  const hasEmployeeCount = shouldShowRow(contractorData.map(c => c.employeeCount));
  const hasServiceArea = shouldShowRow(contractorData.map(c => c.serviceArea));
  const hasContactName = shouldShowRow(contractorData.map(c => c.contactName));
  const hasPhone = shouldShowRow(contractorData.map(c => c.phone));
  const hasEmail = shouldShowRow(contractorData.map(c => c.email));
  const hasWebsite = shouldShowRow(contractorData.map(c => c.website));
  const hasAddress = shouldShowRow(contractorData.map(c => c.address));

  // Check if each section has any visible rows
  const hasAnyRatings = hasGoogle || hasYelp || hasBbbRating || hasBbbComplaints;
  const hasAnyLicensing = hasLicense || hasLicenseState || hasLicenseStatus || hasInsurance || hasBonded;

  // Track alternating row index per section for zebra striping
  let ratingsRowIdx = 0;
  let licensingRowIdx = 0;
  let detailsRowIdx = 0;

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b-2 border-gray-200 flex items-center gap-3 bg-gradient-to-r from-switch-green-600 to-switch-green-700">
        <h2 className="font-semibold text-white">Contractor Comparison</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full" style={{ minWidth: tableMinWidth, tableLayout: 'fixed' }}>
          <thead>
            <tr className="bg-gray-900">
              <th style={labelCellStyle} className="px-5 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider border-r border-gray-700">
                Information
              </th>
              {contractorData.map((c, idx) => (
                <th key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-left text-sm font-semibold text-white ${idx < contractorData.length - 1 ? 'border-r border-gray-700' : ''}`}>
                  {c.contractor}
                  {c.mergedBidCount && c.mergedBidCount > 1 && (
                    <span className="block text-xs font-normal text-gray-400 mt-0.5">
                      {c.mergedBidCount} bids merged
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* ═══════════ SECTION 1: Ratings & Reviews ═══════════ */}
            {hasAnyRatings && (
              <>
                <tr className="bg-gray-800">
                  <td colSpan={bidCount + 1} className="px-5 py-2 text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5" /> Ratings & Reviews
                    </span>
                  </td>
                </tr>

                {/* Google Reviews (merged rating + count) */}
                {hasGoogle && (
                  <tr className={`border-b border-gray-200 ${ratingsRowIdx++ % 2 === 1 ? 'bg-blue-50/30' : ''}`}>
                    <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">Google Reviews</td>
                    {contractorData.map((c, idx) => (
                      <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm font-semibold ${isHighlighted(c.googleRating, bestRating) ? 'text-switch-green-700 bg-gradient-to-r from-switch-green-50 to-switch-green-100' : 'text-gray-900'} ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                        {c.googleRating ? (
                          <span className="flex items-center gap-2">
                            <span className="flex items-center gap-1">
                              {c.googleRating}
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            </span>
                            {c.googleReviewCount != null && (
                              <span className="text-gray-500 font-normal text-xs">({c.googleReviewCount.toLocaleString()} reviews)</span>
                            )}
                            {isHighlighted(c.googleRating, bestRating) && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-switch-green-600 text-white text-xs font-medium rounded-full">
                                TOP
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    ))}
                  </tr>
                )}

                {/* Yelp Reviews */}
                {hasYelp && (
                  <tr className={`border-b border-gray-200 ${ratingsRowIdx++ % 2 === 1 ? 'bg-blue-50/30' : ''}`}>
                    <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">Yelp Reviews</td>
                    {contractorData.map((c, idx) => (
                      <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-900 ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                        {c.yelpRating ? (
                          <span className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-red-500 fill-red-500" />
                            <span className="font-semibold">{c.yelpRating.toFixed(1)}</span>
                            {c.yelpReviewCount != null && (
                              <span className="text-gray-500 text-xs">({c.yelpReviewCount.toLocaleString()} reviews)</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    ))}
                  </tr>
                )}

                {/* BBB Rating */}
                {hasBbbRating && (
                  <tr className={`border-b border-gray-200 ${ratingsRowIdx++ % 2 === 1 ? 'bg-blue-50/30' : ''}`}>
                    <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">BBB Rating</td>
                    {contractorData.map((c, idx) => (
                      <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-900 ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                        {c.bbbRating ? (
                          <span className="flex items-center gap-2">
                            <span className="font-semibold">{c.bbbRating}</span>
                            {c.bbbAccredited && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                                <CheckCircle className="w-3 h-3" /> Accredited
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    ))}
                  </tr>
                )}

                {/* BBB Complaints */}
                {hasBbbComplaints && (
                  <tr className={`border-b border-gray-200 ${ratingsRowIdx++ % 2 === 1 ? 'bg-blue-50/30' : ''}`}>
                    <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">BBB Complaints (3yr)</td>
                    {contractorData.map((c, idx) => (
                      <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                        {c.bbbComplaints != null ? (
                          <span className={c.bbbComplaints > 0 ? 'text-amber-600 font-medium' : 'text-green-600'}>
                            {c.bbbComplaints === 0 ? 'None' : `${c.bbbComplaints} complaint${c.bbbComplaints !== 1 ? 's' : ''}`}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    ))}
                  </tr>
                )}
              </>
            )}

            {/* ═══════════ SECTION 2: Licensing & Insurance ═══════════ */}
            {hasAnyLicensing && (
              <>
                <tr className="bg-gray-800">
                  <td colSpan={bidCount + 1} className="px-5 py-2 text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" /> Licensing & Insurance
                    </span>
                  </td>
                </tr>

                {/* License Number */}
                {hasLicense && (
                  <tr className={`border-b border-gray-200 ${licensingRowIdx++ % 2 === 1 ? 'bg-amber-50/30' : ''}`}>
                    <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">License Number</td>
                    {contractorData.map((c, idx) => (
                      <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm font-semibold text-gray-900 ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                        {c.license || <span className="text-gray-400">Not provided</span>}
                      </td>
                    ))}
                  </tr>
                )}

                {/* License State */}
                {hasLicenseState && (
                  <tr className={`border-b border-gray-200 ${licensingRowIdx++ % 2 === 1 ? 'bg-amber-50/30' : ''}`}>
                    <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">License State</td>
                    {contractorData.map((c, idx) => (
                      <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                        {c.licenseState || <span className="text-gray-400">-</span>}
                      </td>
                    ))}
                  </tr>
                )}

                {/* License Status (NEW) */}
                {hasLicenseStatus && (
                  <tr className={`border-b border-gray-200 ${licensingRowIdx++ % 2 === 1 ? 'bg-amber-50/30' : ''}`}>
                    <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">License Status</td>
                    {contractorData.map((c, idx) => (
                      <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                        {c.licenseStatus === 'Active' ? (
                          <span className="inline-flex items-center gap-1 text-green-700 font-medium">
                            <CheckCircle className="w-4 h-4" /> Active
                            {c.licenseExpiration && (
                              <span className="text-gray-500 font-normal text-xs ml-1">
                                — Expires {new Date(c.licenseExpiration).toLocaleDateString('en-US', { month: '2-digit', year: 'numeric' })}
                              </span>
                            )}
                          </span>
                        ) : c.licenseStatus === 'Inactive' ? (
                          <span className="text-amber-600 font-medium">Inactive</span>
                        ) : c.licenseStatus === 'Expired' ? (
                          <span className="text-red-600 font-medium">
                            Expired
                            {c.licenseExpiration && (
                              <span className="text-red-400 font-normal text-xs ml-1">
                                — Was {new Date(c.licenseExpiration).toLocaleDateString('en-US', { month: '2-digit', year: 'numeric' })}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    ))}
                  </tr>
                )}

                {/* Insurance Verified */}
                {hasInsurance && (
                  <tr className={`border-b border-gray-200 ${licensingRowIdx++ % 2 === 1 ? 'bg-amber-50/30' : ''}`}>
                    <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">Insurance Verified</td>
                    {contractorData.map((c, idx) => (
                      <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                        {c.insuranceVerified ? (
                          <span className="inline-flex items-center gap-1 text-switch-green-700">
                            <CheckCircle className="w-4 h-4" /> Verified
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    ))}
                  </tr>
                )}

                {/* Bonded */}
                {hasBonded && (
                  <tr className={`border-b border-gray-200 ${licensingRowIdx++ % 2 === 1 ? 'bg-amber-50/30' : ''}`}>
                    <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">Bonded</td>
                    {contractorData.map((c, idx) => (
                      <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                        {c.bonded ? (
                          <span className="inline-flex items-center gap-1 text-switch-green-700">
                            <CheckCircle className="w-4 h-4" /> Yes
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    ))}
                  </tr>
                )}
              </>
            )}

            {/* ═══════════ SECTION 3: Company Details (behind Show More) ═══════════ */}
            {showMore && (
              <>
                <tr className="bg-gray-800">
                  <td colSpan={bidCount + 1} className="px-5 py-2 text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" /> Company Details
                    </span>
                  </td>
                </tr>

                {/* Years in Business */}
                {hasYears && (
                  <tr className={`border-b border-gray-200 ${detailsRowIdx++ % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                    <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">Years in Business</td>
                    {contractorData.map((c, idx) => (
                      <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm font-semibold ${isHighlighted(c.yearsInBusiness, bestYears) ? 'text-switch-green-700 bg-gradient-to-r from-switch-green-50 to-switch-green-100' : 'text-gray-900'} ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                        <span className="flex items-center gap-2">
                          {c.yearsInBusiness ? `${c.yearsInBusiness} years` : '-'}
                          {isHighlighted(c.yearsInBusiness, bestYears) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-switch-green-600 text-white text-xs font-medium rounded-full">
                              <Star className="w-3 h-3" /> MOST
                            </span>
                          )}
                        </span>
                      </td>
                    ))}
                  </tr>
                )}

                {/* Year Established */}
                {hasYearEstablished && (
                  <tr className={`border-b border-gray-200 ${detailsRowIdx++ % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                    <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">Year Established</td>
                    {contractorData.map((c, idx) => (
                      <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                        {c.yearEstablished || '-'}
                      </td>
                    ))}
                  </tr>
                )}

                {/* Certifications */}
                {hasCertifications && (
                  <tr className={`border-b border-gray-200 ${detailsRowIdx++ % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                    <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">Certifications</td>
                    {contractorData.map((c, idx) => (
                      <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-900 ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                        {c.certifications.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {c.certifications.slice(0, 3).map((cert, i) => (
                              <span key={i} className="inline-flex px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                                {cert}
                              </span>
                            ))}
                            {c.certifications.length > 3 && (
                              <span className="inline-flex px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">
                                +{c.certifications.length - 3}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    ))}
                  </tr>
                )}

                {/* Total Installs */}
                {hasTotalInstalls && (
                  <tr className={`border-b border-gray-200 ${detailsRowIdx++ % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                    <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">Total Installs</td>
                    {contractorData.map((c, idx) => (
                      <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                        {c.totalInstalls ? c.totalInstalls.toLocaleString() : '-'}
                      </td>
                    ))}
                  </tr>
                )}

                {/* Employee Count (NEW) */}
                {hasEmployeeCount && (
                  <tr className={`border-b border-gray-200 ${detailsRowIdx++ % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                    <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">Employee Count</td>
                    {contractorData.map((c, idx) => (
                      <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                        {c.employeeCount ?? '-'}
                      </td>
                    ))}
                  </tr>
                )}

                {/* Service Area (NEW) */}
                {hasServiceArea && (
                  <tr className={`border-b border-gray-200 ${detailsRowIdx++ % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                    <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">Service Area</td>
                    {contractorData.map((c, idx) => (
                      <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                        {c.serviceArea || '-'}
                      </td>
                    ))}
                  </tr>
                )}

                {/* Contact Name */}
                {hasContactName && (
                  <tr className={`border-b border-gray-200 ${detailsRowIdx++ % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                    <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">Contact Name</td>
                    {contractorData.map((c, idx) => (
                      <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                        {c.contactName || '-'}
                      </td>
                    ))}
                  </tr>
                )}

                {/* Phone */}
                {hasPhone && (
                  <tr className={`border-b border-gray-200 ${detailsRowIdx++ % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                    <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">Phone</td>
                    {contractorData.map((c, idx) => (
                      <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                        {c.phone || '-'}
                      </td>
                    ))}
                  </tr>
                )}

                {/* Email */}
                {hasEmail && (
                  <tr className={`border-b border-gray-200 ${detailsRowIdx++ % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                    <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">Email</td>
                    {contractorData.map((c, idx) => (
                      <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                        {c.email ? (
                          <a href={`mailto:${c.email}`} className="text-switch-green-600 hover:underline truncate block">
                            {c.email}
                          </a>
                        ) : '-'}
                      </td>
                    ))}
                  </tr>
                )}

                {/* Website */}
                {hasWebsite && (
                  <tr className={`border-b border-gray-200 ${detailsRowIdx++ % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                    <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">Website</td>
                    {contractorData.map((c, idx) => (
                      <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                        {c.website ? (
                          <a href={c.website} target="_blank" rel="noopener noreferrer" className="text-switch-green-600 hover:underline truncate block">
                            {c.website.replace(/^https?:\/\//, '')}
                          </a>
                        ) : '-'}
                      </td>
                    ))}
                  </tr>
                )}

                {/* Address */}
                {hasAddress && (
                  <tr className={`border-b border-gray-200 ${detailsRowIdx++ % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                    <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">Address</td>
                    {contractorData.map((c, idx) => (
                      <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                        {c.address || '-'}
                      </td>
                    ))}
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-3 bg-gray-50 border-t border-gray-200">
        <button
          onClick={() => setShowMore(!showMore)}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          {showMore ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Show Company Details
            </>
          )}
        </button>
      </div>
    </div>
  );
}

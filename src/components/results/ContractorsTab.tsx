import { useState } from 'react';
import { Star, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { deduplicateBids, getContractorDisplayName, type BidEntry } from '../../lib/utils/bidDeduplication';
import { getHighestValue, isHighlighted, LABEL_COL_WIDTH, BID_COL_MIN_WIDTH } from '../../lib/utils/comparisonHelpers';

interface ContractorsTabProps {
  bids: BidEntry[];
}

export function ContractorsTab({ bids }: ContractorsTabProps) {
  const [showMore, setShowMore] = useState(false);

  const deduplicatedBids = deduplicateBids(bids);

  const contractorData = deduplicatedBids.map((b, idx) => {
    const c = b.contractor;
    return {
      bidId: b.bid.id,
      contractor: getContractorDisplayName(b.bid.contractor_name, idx),
      yearsInBusiness: c?.years_in_business,
      yearEstablished: c?.year_established,
      googleRating: c?.google_rating,
      reviewCount: c?.google_review_count,
      certifications: c?.certifications || [],
      license: c?.license,
      licenseState: c?.license_state,
      insuranceVerified: c?.insurance_verified,
      phone: c?.phone,
      email: c?.email,
      website: c?.website,
      totalInstalls: c?.total_installs,
      yelpRating: c?.yelp_rating,
      yelpReviewCount: c?.yelp_review_count,
      bbbRating: c?.bbb_rating,
      bbbAccredited: c?.bbb_accredited,
      bbbComplaints: c?.bbb_complaints_3yr,
      bonded: c?.bonded,
      contactName: c?.contact_name,
      address: c?.address,
      mergedBidCount: (b as ReturnType<typeof deduplicateBids>[0]).mergedBidCount,
    };
  });

  const bestYears = getHighestValue(contractorData.map((c) => c.yearsInBusiness));
  const bestRating = getHighestValue(contractorData.map((c) => c.googleRating));

  const bidCount = deduplicatedBids.length;
  const tableMinWidth = `calc(${LABEL_COL_WIDTH} + (${bidCount} * ${BID_COL_MIN_WIDTH}))`;
  const labelCellStyle = { width: LABEL_COL_WIDTH, minWidth: LABEL_COL_WIDTH, maxWidth: LABEL_COL_WIDTH };
  const bidCellStyle = { minWidth: BID_COL_MIN_WIDTH };

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
            <tr className="border-b border-gray-200">
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
            <tr className="border-b border-gray-200 bg-gray-50/50">
              <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">Google Rating</td>
              {contractorData.map((c, idx) => (
                <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm font-semibold ${isHighlighted(c.googleRating, bestRating) ? 'text-switch-green-700 bg-gradient-to-r from-switch-green-50 to-switch-green-100' : 'text-gray-900'} ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                  <span className="flex items-center gap-2">
                    {c.googleRating ? (
                      <span className="flex items-center gap-1">
                        {c.googleRating}
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      </span>
                    ) : '-'}
                    {isHighlighted(c.googleRating, bestRating) && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-switch-green-600 text-white text-xs font-medium rounded-full">
                        TOP
                      </span>
                    )}
                  </span>
                </td>
              ))}
            </tr>
            <tr className="border-b border-gray-200">
              <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">Review Count</td>
              {contractorData.map((c, idx) => (
                <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm font-semibold text-gray-900 ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                  {c.reviewCount ? `${c.reviewCount} reviews` : '-'}
                </td>
              ))}
            </tr>
            <tr className="border-b border-gray-200">
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
            <tr className={showMore ? 'border-b border-gray-200' : ''}>
              <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-200">License Number</td>
              {contractorData.map((c, idx) => (
                <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm font-semibold text-gray-900 ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                  {c.license || <span className="text-gray-400">Not provided</span>}
                </td>
              ))}
            </tr>

            {showMore && (
              <>
                <tr className="border-b border-gray-200">
                  <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">Phone</td>
                  {contractorData.map((c, idx) => (
                    <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                      {c.phone || '-'}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-200 bg-gray-50/50">
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
                <tr className="border-b border-gray-200">
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
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">License State</td>
                  {contractorData.map((c, idx) => (
                    <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                      {c.licenseState || '-'}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-200">
                  <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">Insurance Verified</td>
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
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">Year Established</td>
                  {contractorData.map((c, idx) => (
                    <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                      {c.yearEstablished || '-'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">Total Installs</td>
                  {contractorData.map((c, idx) => (
                    <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                      {c.totalInstalls ? c.totalInstalls.toLocaleString() : '-'}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">Yelp Rating</td>
                  {contractorData.map((c, idx) => (
                    <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                      {c.yelpRating ? (
                        <span className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                          <span className="font-semibold">{c.yelpRating.toFixed(1)}</span>
                          {c.yelpReviewCount && <span className="text-gray-400">({c.yelpReviewCount.toLocaleString()} reviews)</span>}
                        </span>
                      ) : '-'}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-200">
                  <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">BBB Rating</td>
                  {contractorData.map((c, idx) => (
                    <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                      {c.bbbRating ? (
                        <span className="flex items-center gap-2">
                          <span className="font-semibold">{c.bbbRating}</span>
                          {c.bbbAccredited && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                              <CheckCircle className="w-3 h-3" /> Accredited
                            </span>
                          )}
                        </span>
                      ) : '-'}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">BBB Complaints (3yr)</td>
                  {contractorData.map((c, idx) => (
                    <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                      {c.bbbComplaints != null ? (
                        <span className={c.bbbComplaints > 0 ? 'text-amber-600 font-medium' : 'text-green-600'}>
                          {c.bbbComplaints === 0 ? 'None' : `${c.bbbComplaints} complaint${c.bbbComplaints !== 1 ? 's' : ''}`}
                        </span>
                      ) : '-'}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gray-200">
                  <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">Bonded</td>
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
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">Contact Name</td>
                  {contractorData.map((c, idx) => (
                    <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                      {c.contactName || '-'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td style={labelCellStyle} className="px-5 py-4 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">Address</td>
                  {contractorData.map((c, idx) => (
                    <td key={c.bidId} style={bidCellStyle} className={`px-5 py-4 text-sm text-gray-600 ${idx < contractorData.length - 1 ? 'border-r border-gray-100' : ''}`}>
                      {c.address || '-'}
                    </td>
                  ))}
                </tr>
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
              Show More Details
            </>
          )}
        </button>
      </div>
    </div>
  );
}

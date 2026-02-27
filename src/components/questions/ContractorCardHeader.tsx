import { Star, Shield, Phone, Mail, Globe, Award } from 'lucide-react';
import { getContractorDisplayName } from '../../lib/utils/bidDeduplication';
import type { Bid, BidContractor } from '../../lib/types';

interface ContractorCardHeaderProps {
  bid: Bid;
  contractor?: BidContractor | null;
  index: number;
  /** Summary line below the name (e.g. "12 questions · 3 answered") */
  subtitle?: React.ReactNode;
  /** Action button on the right (e.g. "Craft Email") */
  action?: React.ReactNode;
}

export function ContractorCardHeader({ bid, contractor, index, subtitle, action }: ContractorCardHeaderProps) {
  const name = getContractorDisplayName(bid.contractor_name, index);
  const c = contractor;

  // Build info chips from available data
  const chips: { icon: React.ReactNode; text: string }[] = [];

  if (c?.license) {
    chips.push({
      icon: <Shield className="w-3 h-3" />,
      text: `Lic ${c.license}${c.license_state ? ` (${c.license_state})` : ''}`,
    });
  }
  if (c?.google_rating) {
    chips.push({
      icon: <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />,
      text: `${c.google_rating}${c.google_review_count ? ` (${c.google_review_count} reviews)` : ''}`,
    });
  }
  if (c?.years_in_business) {
    chips.push({
      icon: <Award className="w-3 h-3" />,
      text: `${c.years_in_business} yrs`,
    });
  }

  const contactItems: { icon: React.ReactNode; text: string; href?: string }[] = [];
  if (c?.phone) {
    contactItems.push({ icon: <Phone className="w-3 h-3" />, text: c.phone, href: `tel:${c.phone}` });
  }
  if (c?.email) {
    contactItems.push({ icon: <Mail className="w-3 h-3" />, text: c.email, href: `mailto:${c.email}` });
  }
  if (c?.website) {
    contactItems.push({
      icon: <Globe className="w-3 h-3" />,
      text: c.website.replace(/^https?:\/\//, ''),
      href: c.website,
    });
  }

  const hasDetails = chips.length > 0 || contactItems.length > 0;

  return (
    <div className="px-5 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
      {/* Top row: number badge + name + action */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-8 h-8 bg-switch-green-600 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
            {index + 1}
          </div>
          <div className="min-w-0">
            <h4 className="font-semibold text-gray-900 text-base">{name}</h4>
            {c?.company && c.company !== name && (
              <p className="text-sm text-gray-500">{c.company}</p>
            )}
            {subtitle && (
              <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>

      {/* Detail chips + contact row */}
      {hasDetails && (
        <div className="mt-2.5 ml-11 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {chips.map((chip, i) => (
            <span key={i} className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
              {chip.icon}
              {chip.text}
            </span>
          ))}
          {contactItems.map((item, i) => (
            <span key={i} className="inline-flex items-center gap-1 text-xs text-gray-500">
              {item.icon}
              {item.href ? (
                <a
                  href={item.href}
                  target={item.href.startsWith('http') ? '_blank' : undefined}
                  rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="hover:text-switch-green-600 hover:underline truncate max-w-[160px]"
                >
                  {item.text}
                </a>
              ) : (
                <span className="truncate max-w-[160px]">{item.text}</span>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

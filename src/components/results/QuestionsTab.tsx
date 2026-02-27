import { ContractorQuestionsPanel } from '../questions/ContractorQuestionsPanel';
import type { Bid, BidEquipment, BidScope, BidContractor, BidScore, BidQuestion } from '../../lib/types';

interface BidEntry {
  bid: Bid;
  equipment: BidEquipment[];
  scope?: BidScope | null;
  contractor?: BidContractor | null;
  scores?: BidScore | null;
}

interface QuestionsTabProps {
  bids: BidEntry[];
  questions: BidQuestion[];
  refreshQuestions: () => Promise<void>;
}

export function QuestionsTab({ bids, questions, refreshQuestions }: QuestionsTabProps) {
  return (
    <ContractorQuestionsPanel
      bids={bids}
      questions={questions}
      refreshQuestions={refreshQuestions}
    />
  );
}

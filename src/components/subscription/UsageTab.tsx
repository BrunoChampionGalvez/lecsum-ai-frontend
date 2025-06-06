"use client";

import React from 'react';
import { Card } from '../ui/Card';
import { SubscriptionWithUsage } from '@/api/subscription';

interface UsageTabProps {
  usageData: SubscriptionWithUsage | null;
}

export const UsageTab: React.FC<UsageTabProps> = ({ usageData }) => {
  if (!usageData) {
    return <Card><div className="p-6">No usage data available.</div></Card>;
  }
  
  const { plan, usage, limits, remaining } = usageData;
  
  // Calculate percentages for progress bars
  const calculatePercentage = (used: number, total: number): number => {
    return Math.min(Math.round((used / total) * 100), 100);
  };
  
  // Helper to determine color based on usage percentage
  const getColorClass = (percentage: number): string => {
    if (percentage < 50) return 'bg-green-300';
    if (percentage < 80) return 'bg-yellow-300';
    return 'bg-red-300';
  };
  
  return (
    <div className="space-y-6">
      <Card
        title="Current Usage"
        className="mb-6"
      >
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-[var(--primary)]">{plan.name}</h3>
          
          <div className="space-y-6">
            {/* Lite Messages */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="font-medium">Lite Messages</span>
                <span>
                  {usage.liteMessagesUsed} / {limits.liteMessageLimit}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className={`h-2.5 rounded-full ${getColorClass(calculatePercentage(usage.liteMessagesUsed, limits.liteMessageLimit))}`}
                  style={{ width: `${calculatePercentage(usage.liteMessagesUsed, limits.liteMessageLimit)}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {remaining.liteMessages} messages remaining
              </div>
            </div>
            
            {/* Think Messages */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="font-medium">Think Messages</span>
                <span>
                  {usage.thinkMessagesUsed} / {limits.thinkMessageLimit}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className={`h-2.5 rounded-full ${getColorClass(calculatePercentage(usage.thinkMessagesUsed, limits.thinkMessageLimit))}`}
                  style={{ width: `${calculatePercentage(usage.thinkMessagesUsed, limits.thinkMessageLimit)}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {remaining.thinkMessages} messages remaining
              </div>
            </div>
            
            {/* Flashcards */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="font-medium">Flashcards</span>
                <span>
                  {usage.flashcardsGenerated} / {limits.flashcardsLimit}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className={`h-2.5 rounded-full ${getColorClass(calculatePercentage(usage.flashcardsGenerated, limits.flashcardsLimit))}`}
                  style={{ width: `${calculatePercentage(usage.flashcardsGenerated, limits.flashcardsLimit)}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {remaining.flashcards} flashcards remaining
              </div>
            </div>
            
            {/* Quiz Questions */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="font-medium">Quiz Questions</span>
                <span>
                  {usage.quizQuestionsGenerated} / {limits.quizQuestionsLimit}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className={`h-2.5 rounded-full ${getColorClass(calculatePercentage(usage.quizQuestionsGenerated, limits.quizQuestionsLimit))}`}
                  style={{ width: `${calculatePercentage(usage.quizQuestionsGenerated, limits.quizQuestionsLimit)}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {remaining.quizQuestions} questions remaining
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card 
        title="Usage History" 
        footer={
          <div className="text-center text-sm text-gray-500">
            Detailed usage statistics will be available in a future update.
          </div>
        }
      >
        <div className="min-h-[100px] flex items-center justify-center">
          <p className="text-gray-500">Usage history will be displayed here.</p>
        </div>
      </Card>
    </div>
  );
};

"use client";

import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { SubscriptionDetails, SubscriptionPlan } from '@/api/subscription';
import subscriptionApi from '@/api/subscription';

interface SubscriptionPlanTabProps {
  subscription: SubscriptionDetails | null;
  availablePlans: SubscriptionPlan[];
  onManageClick?: () => void;
}

export const SubscriptionPlanTab: React.FC<SubscriptionPlanTabProps> = ({ subscription, availablePlans, onManageClick }) => {
  const [isUpgrading, setIsUpgrading] = useState<boolean>(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  
  // Function to format date in a user-friendly way
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  };
  
  const handleUpgrade = async (planType: string) => {
    if (!subscription || subscription.plan.type === planType) return;
    
    setIsUpgrading(true);
    setUpgradeError(null);
    
    try {
      await subscriptionApi.upgradePlan(planType);
      window.location.reload(); // Refresh to show updated subscription
    } catch (err) {
      console.error('Failed to upgrade plan:', err);
      setUpgradeError('Failed to upgrade your subscription. Please try again later.');
    } finally {
      setIsUpgrading(false);
    }
  };
  
  if (!subscription) {
    return <Card><div className="p-6">No subscription data available.</div></Card>;
  }
  
  const { plan, limits } = subscription;
  const isFreeTrialActive = plan.isTrialPeriod;
  const trialDaysLeft = plan.trialDaysLeft || 0;
  
  return (
    <div className="space-y-6">
      <Card
        title="Current Subscription"
        className="mb-6"
      >
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-[var(--primary)]">{plan.name}</h3>
          
          {isFreeTrialActive && (
            <div className="bg-[var(--primary-light)] bg-opacity-10 p-4 rounded-md mb-4">
              <p className="font-medium">
                You're currently on a free trial that ends on {formatDate(plan.endDate)} ({trialDaysLeft} days left).
              </p>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="p-4 border border-gray-200 rounded-md">
              <div className="text-lg font-semibold mb-2">Lite Messages</div>
              <div className="text-3xl font-bold text-[var(--primary)]">{limits.liteMessageLimit}</div>
            </div>
            
            <div className="p-4 border border-gray-200 rounded-md">
              <div className="text-lg font-semibold mb-2">Think Messages</div>
              <div className="text-3xl font-bold text-[var(--primary)]">{limits.thinkMessageLimit}</div>
            </div>
            
            <div className="p-4 border border-gray-200 rounded-md">
              <div className="text-lg font-semibold mb-2">Flashcards</div>
              <div className="text-3xl font-bold text-[var(--primary)]">{limits.flashcardsLimit}</div>
            </div>
            
            <div className="p-4 border border-gray-200 rounded-md">
              <div className="text-lg font-semibold mb-2">Quiz Questions</div>
              <div className="text-3xl font-bold text-[var(--primary)]">{limits.quizQuestionsLimit}</div>
            </div>
          </div>
        </div>
      </Card>

      <Card title="Available Plans" className="mb-6">
        {upgradeError && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-md mb-4">
            {upgradeError}
          </div>
        )}
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {availablePlans.map((planItem) => {
              const isCurrentPlan = plan.type === planItem.type;
              const isFreeTrialPlan = planItem.type === 'free_trial';
              
              return (
                <div 
                  key={planItem.id}
                  className={`p-4 border rounded-md ${isCurrentPlan ? 'border-[var(--primary)] border-2' : 'border-gray-200'}`}
                >
                  <div className="text-lg font-semibold mb-1">{planItem.name}</div>
                  <div className="text-sm text-gray-500 mb-3">
                    {planItem.description || (isFreeTrialPlan ? `Duration: ${planItem.trialDurationDays} days` : '')}
                  </div>
                  
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>{planItem.liteMessageLimit} Lite messages</li>
                    {planItem.thinkMessageLimit > 0 && (
                      <li>{planItem.thinkMessageLimit} Think messages</li>
                    )}
                    <li>{planItem.flashcardsLimit} Flashcards</li>
                    <li>{planItem.quizQuestionsLimit} Quiz questions</li>
                  </ul>
                  
                  {!isCurrentPlan && !isFreeTrialPlan && (
                    <button
                      onClick={() => handleUpgrade(planItem.type)}
                      disabled={isUpgrading}
                      className={`mt-3 w-full py-2 px-3 rounded-md bg-[var(--primary)] text-white font-medium transition-all ${isUpgrading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-opacity-90'}`}
                    >
                      {isUpgrading ? 'Upgrading...' : 'Upgrade'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
};

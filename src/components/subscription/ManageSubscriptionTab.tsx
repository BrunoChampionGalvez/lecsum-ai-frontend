"use client";

import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { SubscriptionDetails } from '@/api/subscription';
import subscriptionApi from '@/api/subscription';
import { AlertTriangle } from 'lucide-react';

interface ManageSubscriptionTabProps {
  subscription: SubscriptionDetails | null;
  onSubscriptionUpdate: () => void;
}

export const ManageSubscriptionTab: React.FC<ManageSubscriptionTabProps> = ({ 
  subscription,
  onSubscriptionUpdate
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  if (!subscription) {
    return (
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Manage Subscription</h2>
          <p className="text-gray-600">No subscription information available.</p>
        </div>
      </Card>
    );
  }

  const isSubscriptionActive = subscription.plan.isActive;
  const subscriptionEndDate = new Date(subscription.plan.endDate);
  const isExpired = subscriptionEndDate < new Date();
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const handleCancelConfirm = async () => {    
    try {
      setIsLoading(true);
      setError(null);
      await subscriptionApi.cancelSubscription();
      setSuccessMessage('Your subscription has been canceled. You will have access until the end of your current billing period.');
      onSubscriptionUpdate(); // Refresh parent component data
      setShowCancelModal(false);
    } catch (err) {
      console.error('Failed to cancel subscription:', err);
      setError('Failed to cancel your subscription. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCancel = () => {
    setShowCancelModal(true);
  };

  const handleUpgrade = async (planType: string) => {
    try {
      setIsLoading(true);
      setError(null);
      await subscriptionApi.upgradePlan(planType);
      setSuccessMessage('Your subscription has been upgraded successfully!');
      onSubscriptionUpdate(); // Refresh parent component data
    } catch (err) {
      console.error('Failed to upgrade subscription:', err);
      setError('Failed to upgrade your subscription. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-4">Manage Subscription</h2>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {successMessage}
          </div>
        )}

        <div className="mb-6">
          <h3 className="font-medium text-lg mb-2">Current Plan</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="mb-2"><span className="font-semibold">Plan:</span> {subscription.plan.name}</p>
            
            {/* Show different status messages based on subscription state */}
            {isExpired ? (
              <p className="text-red-600 font-medium">
                Your subscription expired on {formatDate(subscription.plan.endDate)}.
              </p>
            ) : isSubscriptionActive ? (
              <p>
                <span className="font-semibold">Status:</span> 
                <span className="text-[var(--primary)] ml-1 font-medium">Active</span>
                <span className="block mt-1">
                  Your plan will renew automatically on {formatDate(subscription.plan.endDate)}.
                </span>
              </p>
            ) : (
              <p>
                <span className="font-semibold">Status:</span> 
                <span className="text-orange-600 ml-1 font-medium">Canceled</span>
                <span className="block mt-1">
                  Your access will end on {formatDate(subscription.plan.endDate)}.
                </span>
              </p>
            )}
            
            {subscription.plan.isTrialPeriod && (
              <p className="mt-2">
                <span className="font-semibold">Trial:</span> 
                You have {subscription.plan.trialDaysLeft} days left in your trial period.
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-4">
          {isSubscriptionActive && !isExpired && (
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="px-4 py-2 border border-red-500 text-red-500 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 outline-0 cursor-pointer"
            >
              {isLoading ? 'Processing...' : 'Cancel Subscription'}
            </button>
          )}
          
          {/* Cancel Subscription Modal */}
          <Modal
            isOpen={showCancelModal}
            onClose={() => setShowCancelModal(false)}
            title="Cancel Your Subscription"
            footer={
              <>
                <button 
                  onClick={() => setShowCancelModal(false)} 
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors mr-2 cursor-pointer"
                  disabled={isLoading}
                >
                  Keep Subscription
                </button>
                <button 
                  onClick={handleCancelConfirm} 
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-70 cursor-pointer"
                  disabled={isLoading}
                >
                  {isLoading ? 'Processing...' : 'Yes, Cancel Subscription'}
                </button>
              </>
            }
          >
            <div className="py-2">
              <div className="flex items-start mb-4">
                <div className="mr-3 mt-0.5">
                  <div className="bg-amber-100 p-2 rounded-full">
                    <AlertTriangle className="h-6 w-6 text-amber-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">Are you sure you want to cancel?</h3>
                  <p className="text-gray-600 mb-2">Your subscription will be canceled immediately, but you'll still have access to all features until the end of your current billing period:</p>
                  <p className="text-gray-800 font-semibold">{formatDate(subscription.plan.endDate)}</p>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-2 border border-gray-100">
                <h4 className="font-medium mb-2">What happens next:</h4>
                <ul className="list-disc pl-5 space-y-1 text-gray-700">
                  <li>You won't be charged again</li>
                  <li>You'll keep full access until the end date</li>
                  <li>You can reactivate your subscription anytime</li>
                  <li>Your account and data will remain intact</li>
                </ul>
              </div>
              
              <p className="text-sm text-gray-500 mt-2">You can upgrade or resubscribe at any time from your account settings.</p>
            </div>
          </Modal>

          {((!isSubscriptionActive && !isExpired) || isExpired) && (
            <div>
              <h3 className="font-medium text-lg mb-2 mt-4">Upgrade Options</h3>
              <div className="grid gap-4 mt-2">
                <button
                  onClick={() => handleUpgrade('starter')}
                  disabled={isLoading || subscription.plan.type === 'starter'}
                  className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-dark)] border border-[var(--primary)] cursor-pointer transition-colors"
                >
                  {isLoading ? 'Processing...' : 'Upgrade to Starter Plan'}
                </button>
                <button
                  onClick={() => handleUpgrade('pro')}
                  disabled={isLoading || subscription.plan.type === 'pro'}
                  className="px-4 py-2 bg-[var(--orange)] text-white rounded-lg hover:bg-[var(--orange-hover)] border border-[var(--orange)] cursor-pointer transition-colors"
                >
                  {isLoading ? 'Processing...' : 'Upgrade to Pro Plan'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

"use client";

import React, { useState, useEffect, useCallback } from 'react';

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
    status?: number;
  };
  message?: string;
}
import { SubscriptionPlanTab } from './SubscriptionPlanTab';
import { UsageTab } from './UsageTab';
import { ManageSubscriptionTab } from './ManageSubscriptionTab';
import subscriptionApi, { SubscriptionDetails, SubscriptionPlan, SubscriptionWithUsage } from '@/api/subscription';
import { Card } from '../ui/Card';
import { AlertCircle, AlertTriangle } from 'lucide-react';

export const SubscriptionPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('plan');
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionDetails | null>(null);
  const [usageData, setUsageData] = useState<SubscriptionWithUsage | null>(null);
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isExpired, setIsExpired] = useState<boolean>(false);

  const checkSubscriptionStatus = useCallback((subscription: SubscriptionDetails | null) => {
    if (!subscription || !subscription.plan) {
      setIsActive(false);
      setIsExpired(true); // No plan means effectively expired/inactive
      if (activeTab === 'usage') setActiveTab('manage');
      return;
    }

    const endDate = new Date(subscription.plan.endDate);
    const now = new Date();
    const currentIsActive = subscription.plan.isActive && endDate > now;
    const currentIsExpired = !currentIsActive;

    setIsActive(currentIsActive);
    setIsExpired(currentIsExpired);

    if (currentIsExpired && activeTab === 'usage') {
      setActiveTab('manage');
    }
  }, [activeTab, setActiveTab, setIsActive, setIsExpired]);

  const fetchSubscriptionData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch available plans first
      try {
        const plans = await subscriptionApi.getAvailablePlans();
        setAvailablePlans(plans || []);
      } catch (planError) {
        console.error('Error fetching subscription plans:', planError);
        // Non-critical, proceed with other fetches
      }

      // Try to fetch authenticated data
      try {
        const sub = await subscriptionApi.getUserSubscription();
        setSubscriptionData(sub);
        checkSubscriptionStatus(sub);

        if (sub && sub.plan && sub.plan.isActive) { // Only fetch usage if active
            const usage = await subscriptionApi.getUsageDetails();
            setUsageData(usage);
        } else {
            setUsageData(null); // Clear usage data if not active
        }

      } catch (authErrorRaw) {
        const authError = authErrorRaw as ApiError;
        if (authError?.response?.status === 401 || authError?.response?.status === 404) {
          // 404 can mean no subscription, 401 means not logged in
          setError('No active subscription found or session expired. Please log in.');
          setSubscriptionData(null);
          setUsageData(null);
          checkSubscriptionStatus(null); // Update status based on no subscription
        } else {
          setError('Failed to load your subscription details.');
          console.error('Error fetching subscription details:', authError);
        }
      }
    } catch (generalError) {
      console.error('Error in subscription page:', generalError);
      setError('Something went wrong loading subscription information');
    } finally {
      setIsLoading(false);
    }
  }, [checkSubscriptionStatus, setIsLoading, setError, setAvailablePlans, setSubscriptionData, setUsageData]);

  useEffect(() => {
    fetchSubscriptionData();
  }, [fetchSubscriptionData]);

  // The rest of the component (return statement) starts here
  // This replacement chunk only defines the initial state and hooks


  return (
    <div className="flex flex-col min-h-[calc(100vh-180px)]">
      <h1 className="text-2xl font-bold text-[var(--primary)] mb-6">Your Subscription</h1>
      
      <div className="flex flex-col md:flex-row gap-6 flex-1">
        {/* Left sidebar */}
        <div className="w-full md:w-64 flex-shrink-0">
          <div className="bg-white rounded-lg shadow-md h-full flex flex-col">
            
            <div className="flex flex-col h-full">
              <button
                onClick={() => setActiveTab('plan')}
                className={`cursor-pointer rounded-lg text-left px-4 py-3 mt-2 mx-2 font-medium transition-colors ${activeTab === 'plan' 
                  ? 'bg-[var(--primary)] text-white' 
                  : 'hover:bg-gray-100'}`}
              >
                Subscription Plan
              </button>
              <button
                onClick={() => setActiveTab('usage')}
                className={`cursor-pointer rounded-lg text-left px-4 py-3 mt-2 mx-2 font-medium transition-colors ${activeTab === 'usage' 
                  ? 'bg-[var(--primary)] text-white' 
                  : 'hover:bg-gray-100'}`}
              >
                Usage
              </button>
              <button
                onClick={() => setActiveTab('manage')}
                className={`cursor-pointer rounded-lg text-left px-4 py-3 mt-2 mx-2 font-medium transition-colors ${activeTab === 'manage' 
                  ? 'bg-[var(--primary)] text-white' 
                  : 'hover:bg-gray-100'}`}
              >
                Manage Subscription
              </button>
            </div>
          </div>
        </div>
        
        {/* Main content */}
        <div className="flex-1">
          {isLoading ? (
            <Card>
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary)]" />
              </div>
            </Card>
          ) : error && error.includes('You need to be logged in') ? (
            <Card>
              <div className="p-6 text-center">
                <p className="text-red-500">{error}</p>
                <button 
                  onClick={() => window.location.reload()} 
                  className="mt-4 px-4 py-2 bg-[var(--primary)] text-white rounded-md hover:bg-opacity-90 transition-all cursor-pointer">
                  Try Again
                </button>
              </div>
            </Card>
          ) : (
            <>
              {/* Subscription status banner */}
              {subscriptionData && (
                <div className="mb-4">
                  {isExpired ? (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center">
                      <AlertCircle className="h-5 w-5 mr-2" />
                      <div>
                        <p className="font-bold">Your subscription has expired</p>
                        <p>Your access ended on {new Date(subscriptionData.plan.endDate).toLocaleDateString()}. Please renew to continue using premium features.</p>
                      </div>
                    </div>
                  ) : !isActive ? (
                    <div className="bg-amber-50 border border-amber-300 text-amber-800 px-4 py-3 rounded flex items-center">
                      <AlertTriangle className="h-5 w-5 mr-2" />
                      <div>
                        <p className="font-bold">Subscription canceled</p>
                        <p>Your subscription has been canceled but you still have access until {new Date(subscriptionData.plan.endDate).toLocaleDateString()}.</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
              
              {activeTab === 'plan' && (
                <SubscriptionPlanTab 
                  subscription={subscriptionData} 
                  availablePlans={availablePlans}
                />
              )}
              {activeTab === 'usage' && (
                usageData ? (
                  <UsageTab 
                    usageData={usageData} 
                  />
                ) : !isActive || isExpired ? (
                  <Card>
                    <div className="p-6 text-center">
                      <h3 className="text-xl font-semibold mb-4">{isExpired ? 'Subscription Expired' : 'Subscription Inactive'}</h3>
                      <p className="mb-4 text-gray-600">
                        {isExpired 
                          ? 'Your subscription has expired. Please renew your subscription to access usage details.'
                          : 'Your subscription is no longer active. Please renew your subscription to access usage details.'}
                      </p>
                      <button 
                        onClick={() => setActiveTab('manage')} 
                        className="px-4 py-2 bg-[var(--primary)] text-white rounded-md hover:bg-opacity-90 transition-all cursor-pointer">
                        Manage Subscription
                      </button>
                    </div>
                  </Card>
                ) : (
                  <Card>
                    <div className="p-6 text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary)] mx-auto mb-4" />
                      <p>Loading usage data...</p>
                    </div>
                  </Card>
                )
              )}
              {activeTab === 'manage' && (
                <ManageSubscriptionTab
                  subscription={subscriptionData}
                  onSubscriptionUpdate={fetchSubscriptionData}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

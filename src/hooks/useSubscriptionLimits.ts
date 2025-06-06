"use client";

import { useState, useEffect } from 'react';
import subscriptionApi, { SubscriptionWithUsage } from '../api/subscription';

interface SubscriptionLimits {
  remaining: {
    liteMessages: number;
    thinkMessages: number;
    flashcards: number;
    quizQuestions: number;
  };
  isActive: boolean;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  canUseLiteMessage: boolean;
  canUseThinkMessage: boolean;
  canCreateFlashcards: boolean;
  canCreateQuizQuestions: boolean;
}

export function useSubscriptionLimits(): SubscriptionLimits {
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionWithUsage | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchSubscriptionDetails() {
    setIsLoading(true);
    try {
      const data = await subscriptionApi.getUsageDetails();
      console.log('Subscription limits:', data);
      setSubscriptionData(data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching subscription details:', err);
      setError('Could not fetch subscription limits');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchSubscriptionDetails();
  }, []);

  const remaining = subscriptionData?.remaining || {
    liteMessages: 0,
    thinkMessages: 0,
    flashcards: 0,
    quizQuestions: 0
  };

  const isActive = subscriptionData?.plan.isActive || false;
  
  return {
    remaining,
    isActive,
    isLoading,
    error,
    refresh: fetchSubscriptionDetails,
    canUseLiteMessage: remaining.liteMessages > 0,
    canUseThinkMessage: remaining.thinkMessages > 0,
    canCreateFlashcards: remaining.flashcards > 0,
    canCreateQuizQuestions: remaining.quizQuestions > 0
  };
}

import { apiClient } from '../lib/api/client';

// Types for subscription data
export interface SubscriptionPlan {
  id: string;
  type: string;
  name: string;
  description?: string;
  liteMessageLimit: number;
  thinkMessageLimit: number;
  flashcardsLimit: number;
  quizQuestionsLimit: number;
  trialDurationDays?: number;
  isActive: boolean;
}

export interface SubscriptionUsageData {
  liteMessagesUsed: number;
  thinkMessagesUsed: number;
  flashcardsGenerated: number;
  quizQuestionsGenerated: number;
}

export interface SubscriptionLimits {
  liteMessageLimit: number;
  thinkMessageLimit: number;
  flashcardsLimit: number;
  quizQuestionsLimit: number;
}

export interface SubscriptionDetails {
  plan: {
    name: string;
    type: string;
    isTrialPeriod: boolean;
    trialDaysLeft: number;
    endDate: string;
    isActive: boolean;
  };
  limits: SubscriptionLimits;
  usage: SubscriptionUsageData;
}

export interface SubscriptionWithUsage extends SubscriptionDetails {
  remaining: {
    liteMessages: number;
    thinkMessages: number;
    flashcards: number;
    quizQuestions: number;
  };
}

// API functions
const subscriptionApi = {
  /**
   * Get the user's current subscription details including plan and usage
   */
  async getUserSubscription(): Promise<SubscriptionDetails> {
    return await apiClient.get('/subscription');
  },

  /**
   * Get detailed usage data with remaining limits
   */
  async getUsageDetails(): Promise<SubscriptionWithUsage> {
    return await apiClient.get('/subscription/usage');
  },

  /**
   * Get all available subscription plans
   */
  async getAvailablePlans(): Promise<SubscriptionPlan[]> {
    return await apiClient.get('/subscription/plans');
  },

  /**
   * Upgrade the user's subscription to a new plan
   */
  async upgradePlan(planType: string): Promise<SubscriptionDetails> {
    return await apiClient.post('/subscription/upgrade', { planType });
  },

  /**
   * Cancel the user's current subscription
   * The subscription will remain active until it expires
   */
  async cancelSubscription(): Promise<SubscriptionDetails> {
    return await apiClient.patch('/subscription/cancel');
  },
};

export default subscriptionApi;

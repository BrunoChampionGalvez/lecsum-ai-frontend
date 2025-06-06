"use client";

import React from 'react';
import { MainLayout } from '../../components/ui/MainLayout';
import { SubscriptionPage } from '../../components/subscription/SubscriptionPage';

export default function SubscriptionRoute() {
  return (
    <MainLayout>
      <SubscriptionPage />
    </MainLayout>
  );
}

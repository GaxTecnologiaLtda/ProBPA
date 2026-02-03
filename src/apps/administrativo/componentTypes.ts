import React from 'react';

export interface StatCardProps {
    title: string;
    value: string | number;
    trend?: string;
    trendUp?: boolean;
    icon: React.ElementType;
    color: 'blue' | 'green' | 'purple' | 'orange';
}

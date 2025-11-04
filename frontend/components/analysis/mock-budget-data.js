// Mock data for BudgetVsActualAnalysis component
// This can be used to test the component without making API calls

export const mockBudgetVsActualData = {
  insights: [
    {
      category: 'Food & Dining',
      budgeted: 8000,
      actual: 7500,
      variance: -500,
      utilization: 93.75,
      trend: 'stable',
      insights: ['You\'re approaching your budget limit for Food & Dining'],
      recommendations: [],
      suggestedBudget: 8250,
      isOverBudget: false
    },
    {
      category: 'Transportation',
      budgeted: 3000,
      actual: 3500,
      variance: 500,
      utilization: 116.67,
      trend: 'increasing',
      insights: ['You\'ve exceeded your budget for Transportation by 16.7%'],
      recommendations: [
        'Consider reducing spending on Transportation or increasing your budget allocation',
        'Review recent transactions to identify areas where you can cut back'
      ],
      suggestedBudget: 3850,
      isOverBudget: true
    },
    {
      category: 'Entertainment',
      budgeted: 2000,
      actual: 1200,
      variance: -800,
      utilization: 60,
      trend: 'decreasing',
      insights: ['You\'re doing well with Entertainment spending, staying within 60.0% of your budget'],
      recommendations: [
        'You have flexibility to increase spending on Entertainment or reallocate funds to other categories'
      ],
      suggestedBudget: 1320,
      isOverBudget: false
    },
    {
      category: 'Housing',
      budgeted: 15000,
      actual: 15000,
      variance: 0,
      utilization: 100,
      trend: 'stable',
      insights: ['You\'ve exactly met your budget for Housing'],
      recommendations: [
        'Continue monitoring your Housing expenses to maintain this balance'
      ],
      suggestedBudget: 16500,
      isOverBudget: false
    },
    {
      category: 'Utilities',
      budgeted: 3000,
      actual: 2500,
      variance: -500,
      utilization: 83.33,
      trend: 'stable',
      insights: ['You\'re doing well with Utilities spending, staying within 83.3% of your budget'],
      recommendations: [],
      suggestedBudget: 2750,
      isOverBudget: false
    }
  ],
  summary: {
    totalBudgeted: 31000,
    totalActual: 29700,
    overallVariance: -1300,
    overBudgetCount: 1,
    underBudgetCount: 4
  },
  overallInsight: 'Great job! You\'re staying within budget in 4 categories. Consider reallocating unused funds to savings or other goals.',
  overallRecommendations: [
    'You\'re saving ₹1,300 compared to your budget. Consider increasing your savings rate or investing these extra funds.',
    'Evaluate if any budget categories are consistently under-utilized and adjust your allocations accordingly.',
    'Focus on reducing transportation costs which are currently exceeding your budget.'
  ]
};

// Helper function to simulate API delay
export const fetchMockData = () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockBudgetVsActualData);
    }, 800); // Simulate network delay
  });
};

// Error mock data
export const mockErrorData = {
  message: 'Failed to fetch AI-powered budget analysis'
};

// Helper function to simulate API error
export const fetchMockError = () => {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(mockErrorData.message));
    }, 800);
  });
};
const geminiAPI = require('../utils/gemini');

// Re-export the methods from the geminiAPI instance
module.exports = {
  generateStockSummary: geminiAPI.analyzeStock.bind(geminiAPI),
  detectRecurringExpenses: geminiAPI.detectRecurringExpenses.bind(geminiAPI),
  analyzeBigExpenses: geminiAPI.analyzeBigExpenses.bind(geminiAPI),
  analyzeBudgetVsActual: async (comparisonData) => {
    try {
      const budgetDetails = comparisonData.budgets.map(b => 
        `Category: ${b.category}, Budget: ₹${b.budgetAmount}, Actual: ₹${b.actualSpent}, % Used: ${b.percentageUsed.toFixed(1)}%, ${b.difference >= 0 ? 'Over' : 'Under'} by ₹${Math.abs(b.difference)}`
      ).join('\n');
      
      const prompt = `Analyze the following budget vs actual spending for the period ${comparisonData.timePeriod.startDate} to ${comparisonData.timePeriod.endDate}:

 ${budgetDetails}

Please provide:
1. Overall assessment of budget adherence
2. Categories with significant overspending or underspending
3. Recommendations for budget adjustments
4. Strategies to improve adherence to budgets

Format the response as a clear, actionable summary.`;

      return await geminiAPI.makeRequest([{
        role: 'user',
        parts: [{ text: prompt }]
      }]);
    } catch (error) {
      console.error('Error analyzing budget vs actual:', error);
      throw new Error('Failed to analyze budget vs actual');
    }
  },
  compareStocks: geminiAPI.compareStocks.bind(geminiAPI),
  analyzeStock: async (stock) => {
    // Call the updated analyzeStock method which now returns both analysis and rawResponse
    return await geminiAPI.analyzeStock(stock);
  },
  // Add the generatePersonalSuggestions method
  generatePersonalSuggestions: geminiAPI.generatePersonalSuggestions.bind(geminiAPI)
};
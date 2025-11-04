// controllers/dashboardController.js
const DashboardLayout = require('../models/DashboardLayout');

// Get dashboard layout
exports.getDashboardLayout = async (req, res) => {
  try {
    let dashboardLayout = await DashboardLayout.findOne({ userId: req.user.id });
    
    if (!dashboardLayout) {
      // If no layout exists, return default layout
      return res.status(200).json({
        success: true,
        data: {
          layout: [
            { id: "summary-cards", type: "summary-cards", position: { x: 0, y: 0, w: 12, h: 4 } },
            { id: "quick-actions", type: "quick-actions", position: { x: 0, y: 4, w: 12, h: 4 } },
            { id: "recent-transactions", type: "recent-transactions", position: { x: 0, y: 8, w: 12, h: 6 } },
            { id: "budget-overview", type: "budget-overview", position: { x: 0, y: 14, w: 12, h: 6 } },
            { id: "notifications", type: "notifications", position: { x: 0, y: 20, w: 12, h: 6 } },
            { id: "portfolio", type: "portfolio", position: { x: 0, y: 26, w: 12, h: 4 } },
          ]
        }
      });
    }
    
    res.status(200).json({
      success: true,
      data: dashboardLayout
    });
  } catch (error) {
    console.error('Error fetching dashboard layout:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Save dashboard layout
exports.saveDashboardLayout = async (req, res) => {
  try {
    const { layout } = req.body;
    
    let dashboardLayout = await DashboardLayout.findOne({ userId: req.user.id });
    
    if (dashboardLayout) {
      dashboardLayout.layout = layout;
      dashboardLayout.updatedAt = new Date();
      await dashboardLayout.save();
    } else {
      dashboardLayout = new DashboardLayout({
        userId: req.user.id,
        layout,
        updatedAt: new Date()
      });
      await dashboardLayout.save();
    }
    
    res.status(200).json({
      success: true,
      data: dashboardLayout
    });
  } catch (error) {
    console.error('Error saving dashboard layout:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
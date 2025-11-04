const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

class ExportService {
  constructor() {
    this.tempDir = path.join(__dirname, '../temp');
    this.ensureTempDir();
  }

  ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  // Excel Export Methods
  async exportTransactionsToExcel(transactions, user, options = {}) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Transactions');

      // Add metadata
      workbook.creator = 'Finsync';
      workbook.lastModifiedBy = user.name;
      workbook.created = new Date();
      workbook.modified = new Date();

      // Define columns
      worksheet.columns = [
        { header: 'Date', key: 'date', width: 12 },
        { header: 'Description', key: 'description', width: 30 },
        { header: 'Category', key: 'category', width: 15 },
        { header: 'Subcategory', key: 'subcategory', width: 15 },
        { header: 'Amount', key: 'amount', width: 12 },
        { header: 'Type', key: 'type', width: 10 },
        { header: 'Account', key: 'account', width: 15 },
        { header: 'Tags', key: 'tags', width: 20 },
        { header: 'Notes', key: 'notes', width: 30 },
        { header: 'Recurring', key: 'isRecurring', width: 10 },
      ];

      // Add data
      transactions.forEach(transaction => {
        worksheet.addRow({
          date: new Date(transaction.date).toLocaleDateString('en-IN'),
          description: transaction.description,
          category: transaction.category,
          subcategory: transaction.subcategory || '',
          amount: transaction.amount,
          type: transaction.type,
          account: transaction.account,
          tags: transaction.tags?.join(', ') || '',
          notes: transaction.notes || '',
          isRecurring: transaction.isRecurring ? 'Yes' : 'No',
        });
      });

      // Style the header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' },
      };
      worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' } };

      // Add summary
      const summaryRow = transactions.length + 3;
      worksheet.getCell(`A${summaryRow}`).value = 'Summary';
      worksheet.getCell(`A${summaryRow}`).font = { bold: true };
      
      const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      const totalExpenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      
      worksheet.getCell(`B${summaryRow}`).value = 'Total Income';
      worksheet.getCell(`C${summaryRow}`).value = totalIncome;
      worksheet.getCell(`B${summaryRow + 1}`).value = 'Total Expenses';
      worksheet.getCell(`C${summaryRow + 1}`).value = totalExpenses;
      worksheet.getCell(`B${summaryRow + 2}`).value = 'Net Amount';
      worksheet.getCell(`C${summaryRow + 2}`).value = totalIncome - totalExpenses;

      // Generate filename
      const filename = `transactions_${user._id}_${Date.now()}.xlsx`;
      const filepath = path.join(this.tempDir, filename);

      await workbook.xlsx.writeFile(filepath);
      
      logger.logBusiness('excel_export', {
        type: 'transactions',
        userId: user._id,
        recordCount: transactions.length,
      });

      return { filepath, filename };
    } catch (error) {
      logger.error('Excel export error:', error);
      throw new Error('Failed to export transactions to Excel');
    }
  }

  async exportBudgetToExcel(budgets, user, options = {}) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Budgets');

      // Define columns
      worksheet.columns = [
        { header: 'Budget Name', key: 'name', width: 20 },
        { header: 'Category', key: 'category', width: 15 },
        { header: 'Total Amount', key: 'totalAmount', width: 15 },
        { header: 'Spent Amount', key: 'spentAmount', width: 15 },
        { header: 'Remaining', key: 'remaining', width: 15 },
        { header: 'Percentage Used', key: 'percentageUsed', width: 15 },
        { header: 'Status', key: 'status', width: 10 },
        { header: 'Period', key: 'period', width: 10 },
        { header: 'Start Date', key: 'startDate', width: 12 },
        { header: 'End Date', key: 'endDate', width: 12 },
      ];

      // Add data
      budgets.forEach(budget => {
        const remaining = budget.totalAmount - budget.spentAmount;
        const percentageUsed = budget.totalAmount > 0 ? 
          (budget.spentAmount / budget.totalAmount) * 100 : 0;
        
        worksheet.addRow({
          name: budget.name,
          category: budget.category,
          totalAmount: budget.totalAmount,
          spentAmount: budget.spentAmount,
          remaining: remaining,
          percentageUsed: `${percentageUsed.toFixed(1)}%`,
          status: budget.status,
          period: budget.period,
          startDate: new Date(budget.startDate).toLocaleDateString('en-IN'),
          endDate: new Date(budget.endDate).toLocaleDateString('en-IN'),
        });
      });

      // Style the header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' },
      };
      worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' } };

      const filename = `budgets_${user._id}_${Date.now()}.xlsx`;
      const filepath = path.join(this.tempDir, filename);

      await workbook.xlsx.writeFile(filepath);
      
      logger.logBusiness('excel_export', {
        type: 'budgets',
        userId: user._id,
        recordCount: budgets.length,
      });

      return { filepath, filename };
    } catch (error) {
      logger.error('Excel export error:', error);
      throw new Error('Failed to export budgets to Excel');
    }
  }

  async exportPortfolioToExcel(holdings, orders, user, options = {}) {
    try {
      const workbook = new ExcelJS.Workbook();
      
      // Holdings sheet
      const holdingsSheet = workbook.addWorksheet('Holdings');
      holdingsSheet.columns = [
        { header: 'Symbol', key: 'symbol', width: 10 },
        { header: 'Company', key: 'company', width: 25 },
        { header: 'Quantity', key: 'quantity', width: 10 },
        { header: 'Avg Price', key: 'avgPrice', width: 12 },
        { header: 'Current Price', key: 'currentPrice', width: 12 },
        { header: 'Market Value', key: 'marketValue', width: 12 },
        { header: 'Unrealized P&L', key: 'unrealizedPnL', width: 15 },
        { header: 'P&L %', key: 'pnlPercentage', width: 10 },
        { header: 'Sector', key: 'sector', width: 15 },
      ];

      holdings.forEach(holding => {
        holdingsSheet.addRow({
          symbol: holding.stock?.symbol || '',
          company: holding.stock?.name || '',
          quantity: holding.quantity,
          avgPrice: holding.averagePrice,
          currentPrice: holding.currentPrice,
          marketValue: holding.marketValue,
          unrealizedPnL: holding.unrealizedPnL,
          pnlPercentage: `${holding.pnlPercentage.toFixed(2)}%`,
          sector: holding.stock?.sector || '',
        });
      });

      // Orders sheet
      const ordersSheet = workbook.addWorksheet('Orders');
      ordersSheet.columns = [
        { header: 'Date', key: 'date', width: 12 },
        { header: 'Symbol', key: 'symbol', width: 10 },
        { header: 'Type', key: 'type', width: 8 },
        { header: 'Quantity', key: 'quantity', width: 10 },
        { header: 'Price', key: 'price', width: 12 },
        { header: 'Total Amount', key: 'totalAmount', width: 15 },
        { header: 'Status', key: 'status', width: 10 },
        { header: 'Order Type', key: 'orderType', width: 12 },
      ];

      orders.forEach(order => {
        ordersSheet.addRow({
          date: new Date(order.timestamp).toLocaleDateString('en-IN'),
          symbol: order.stock?.symbol || '',
          type: order.type,
          quantity: order.quantity,
          price: order.price,
          totalAmount: order.quantity * order.price,
          status: order.status,
          orderType: order.orderType,
        });
      });

      // Style headers
      [holdingsSheet, ordersSheet].forEach(sheet => {
        sheet.getRow(1).font = { bold: true };
        sheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4472C4' },
        };
        sheet.getRow(1).font = { color: { argb: 'FFFFFFFF' } };
      });

      const filename = `portfolio_${user._id}_${Date.now()}.xlsx`;
      const filepath = path.join(this.tempDir, filename);

      await workbook.xlsx.writeFile(filepath);
      
      logger.logBusiness('excel_export', {
        type: 'portfolio',
        userId: user._id,
        holdingsCount: holdings.length,
        ordersCount: orders.length,
      });

      return { filepath, filename };
    } catch (error) {
      logger.error('Excel export error:', error);
      throw new Error('Failed to export portfolio to Excel');
    }
  }

  // PDF Export Methods
  async exportTransactionsToPDF(transactions, user, options = {}) {
    try {
      const doc = new PDFDocument();
      const filename = `transactions_${user._id}_${Date.now()}.pdf`;
      const filepath = path.join(this.tempDir, filename);
      
      doc.pipe(fs.createWriteStream(filepath));

      // Header
      doc.fontSize(20).text('Finsync - Transaction Report', 50, 50);
      doc.fontSize(12).text(`Generated for: ${user.name}`, 50, 80);
      doc.fontSize(10).text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, 50, 100);
      
      // Summary
      const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      const totalExpenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      
      doc.fontSize(14).text('Summary', 50, 130);
      doc.fontSize(10)
        .text(`Total Income: ₹${totalIncome.toLocaleString('en-IN')}`, 70, 150)
        .text(`Total Expenses: ₹${totalExpenses.toLocaleString('en-IN')}`, 70, 165)
        .text(`Net Amount: ₹${(totalIncome - totalExpenses).toLocaleString('en-IN')}`, 70, 180);

      // Transactions table
      let yPosition = 220;
      doc.fontSize(12).text('Transactions', 50, yPosition);
      yPosition += 20;

      // Table headers
      doc.fontSize(8)
        .text('Date', 50, yPosition)
        .text('Description', 100, yPosition)
        .text('Category', 250, yPosition)
        .text('Amount', 320, yPosition)
        .text('Type', 380, yPosition);
      
      yPosition += 15;
      doc.moveTo(50, yPosition).lineTo(450, yPosition).stroke();

      // Transaction rows
      transactions.forEach((transaction, index) => {
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }
        
        yPosition += 15;
        doc.fontSize(8)
          .text(new Date(transaction.date).toLocaleDateString('en-IN'), 50, yPosition)
          .text(transaction.description.substring(0, 20), 100, yPosition)
          .text(transaction.category, 250, yPosition)
          .text(`₹${transaction.amount.toLocaleString('en-IN')}`, 320, yPosition)
          .text(transaction.type, 380, yPosition);
      });

      doc.end();
      
      logger.logBusiness('pdf_export', {
        type: 'transactions',
        userId: user._id,
        recordCount: transactions.length,
      });

      return { filepath, filename };
    } catch (error) {
      logger.error('PDF export error:', error);
      throw new Error('Failed to export transactions to PDF');
    }
  }

  async exportBudgetToPDF(budgets, user, options = {}) {
    try {
      const doc = new PDFDocument();
      const filename = `budgets_${user._id}_${Date.now()}.pdf`;
      const filepath = path.join(this.tempDir, filename);
      
      doc.pipe(fs.createWriteStream(filepath));

      // Header
      doc.fontSize(20).text('Finsync - Budget Report', 50, 50);
      doc.fontSize(12).text(`Generated for: ${user.name}`, 50, 80);
      doc.fontSize(10).text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, 50, 100);

      // Summary
      const totalBudgeted = budgets.reduce((sum, b) => sum + b.totalAmount, 0);
      const totalSpent = budgets.reduce((sum, b) => sum + b.spentAmount, 0);
      const overBudgetCount = budgets.filter(b => b.spentAmount > b.totalAmount).length;
      
      doc.fontSize(14).text('Summary', 50, 130);
      doc.fontSize(10)
        .text(`Total Budgeted: ₹${totalBudgeted.toLocaleString('en-IN')}`, 70, 150)
        .text(`Total Spent: ₹${totalSpent.toLocaleString('en-IN')}`, 70, 165)
        .text(`Over Budget Categories: ${overBudgetCount}`, 70, 180);

      // Budgets table
      let yPosition = 220;
      doc.fontSize(12).text('Budgets', 50, yPosition);
      yPosition += 20;

      // Table headers
      doc.fontSize(8)
        .text('Name', 50, yPosition)
        .text('Category', 150, yPosition)
        .text('Budgeted', 220, yPosition)
        .text('Spent', 280, yPosition)
        .text('Remaining', 340, yPosition)
        .text('Status', 400, yPosition);
      
      yPosition += 15;
      doc.moveTo(50, yPosition).lineTo(450, yPosition).stroke();

      // Budget rows
      budgets.forEach((budget, index) => {
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }
        
        yPosition += 15;
        const remaining = budget.totalAmount - budget.spentAmount;
        const status = budget.spentAmount > budget.totalAmount ? 'Over' : 'OK';
        
        doc.fontSize(8)
          .text(budget.name.substring(0, 15), 50, yPosition)
          .text(budget.category, 150, yPosition)
          .text(`₹${budget.totalAmount.toLocaleString('en-IN')}`, 220, yPosition)
          .text(`₹${budget.spentAmount.toLocaleString('en-IN')}`, 280, yPosition)
          .text(`₹${remaining.toLocaleString('en-IN')}`, 340, yPosition)
          .text(status, 400, yPosition);
      });

      doc.end();
      
      logger.logBusiness('pdf_export', {
        type: 'budgets',
        userId: user._id,
        recordCount: budgets.length,
      });

      return { filepath, filename };
    } catch (error) {
      logger.error('PDF export error:', error);
      throw new Error('Failed to export budgets to PDF');
    }
  }

  // Clean up temporary files
  cleanupTempFiles() {
    try {
      const files = fs.readdirSync(this.tempDir);
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      files.forEach(file => {
        const filepath = path.join(this.tempDir, file);
        const stats = fs.statSync(filepath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(filepath);
          logger.info(`Cleaned up temp file: ${file}`);
        }
      });
    } catch (error) {
      logger.error('Error cleaning up temp files:', error);
    }
  }

  // Get file stream for download
  getFileStream(filepath) {
    try {
      return fs.createReadStream(filepath);
    } catch (error) {
      logger.error('Error creating file stream:', error);
      throw new Error('File not found');
    }
  }

  // Delete file after download
  deleteFile(filepath) {
    try {
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Error deleting file:', error);
      return false;
    }
  }
}

// Export singleton instance
const exportService = new ExportService();

// Clean up temp files every hour
setInterval(() => {
  exportService.cleanupTempFiles();
}, 60 * 60 * 1000);

module.exports = exportService;

/**
 * Export Service
 * Handles exporting analytics data to various formats
 */

import { prisma } from '../../../../../core/database/client';
import { logger } from '../../../../../core/logger';
import { storageService } from '../../../../../lib/storage/storage.service';
import { createObjectCsvWriter } from 'csv-writer';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

export class ExportService {
  private exportDir: string;

  constructor() {
    this.exportDir = path.join(process.cwd(), 'exports');
    if (!fs.existsSync(this.exportDir)) {
      fs.mkdirSync(this.exportDir, { recursive: true });
    }
  }

  /**
   * Export data to specified format
   */
  async export(data: any, format: string, filename?: string): Promise<string> {
    try {
      const fileId = uuidv4();
      const baseFilename = filename || `export-${fileId}`;
      let filePath: string;
      let url: string;

      switch (format.toLowerCase()) {
        case 'csv':
          filePath = await this.exportToCSV(data, baseFilename);
          break;
        case 'excel':
        case 'xlsx':
          filePath = await this.exportToExcel(data, baseFilename);
          break;
        case 'pdf':
          filePath = await this.exportToPDF(data, baseFilename);
          break;
        case 'json':
        default:
          filePath = await this.exportToJSON(data, baseFilename);
      }

      // Upload to storage
      url = await storageService.uploadFile(filePath, {
        folder: 'exports',
        filename: path.basename(filePath),
      });

      // Clean up local file
      fs.unlinkSync(filePath);

      return url;
    } catch (error) {
      logger.error('Error exporting data:', error);
      throw error;
    }
  }

  /**
   * Export to JSON
   */
  private async exportToJSON(data: any, filename: string): Promise<string> {
    const filePath = path.join(this.exportDir, `${filename}.json`);
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
    return filePath;
  }

  /**
   * Export to CSV
   */
  private async exportToCSV(data: any, filename: string): Promise<string> {
    const filePath = path.join(this.exportDir, `${filename}.csv`);

    // Flatten nested data if necessary
    const flatData = this.flattenData(data);

    if (Array.isArray(flatData) && flatData.length > 0) {
      const headers = Object.keys(flatData[0]).map(key => ({
        id: key,
        title: key,
      }));

      const csvWriter = createObjectCsvWriter({
        path: filePath,
        header: headers,
      });

      await csvWriter.writeRecords(flatData);
    } else {
      // If data is not an array, write as single row
      const flatObj = this.flattenObject(flatData);
      const headers = Object.keys(flatObj).map(key => ({
        id: key,
        title: key,
      }));

      const csvWriter = createObjectCsvWriter({
        path: filePath,
        header: headers,
      });

      await csvWriter.writeRecords([flatObj]);
    }

    return filePath;
  }

  /**
   * Export to Excel
   */
  private async exportToExcel(data: any, filename: string): Promise<string> {
    const filePath = path.join(this.exportDir, `${filename}.xlsx`);
    const workbook = new ExcelJS.Workbook();

    if (typeof data === 'object' && data !== null) {
      // Create sheets for each top-level key
      for (const [key, value] of Object.entries(data)) {
        const worksheet = workbook.addWorksheet(this.sanitizeSheetName(key));
        this.addDataToWorksheet(worksheet, value);
      }
    } else {
      // Single sheet
      const worksheet = workbook.addWorksheet('Data');
      this.addDataToWorksheet(worksheet, data);
    }

    await workbook.xlsx.writeFile(filePath);
    return filePath;
  }

  /**
   * Add data to Excel worksheet
   */
  private addDataToWorksheet(worksheet: ExcelJS.Worksheet, data: any): void {
    const flatData = this.flattenData(data);

    if (Array.isArray(flatData) && flatData.length > 0) {
      // Add headers
      const headers = Object.keys(flatData[0]);
      worksheet.columns = headers.map(header => ({
        header: this.formatHeader(header),
        key: header,
        width: 20,
      }));

      // Add rows
      worksheet.addRows(flatData);
    } else if (typeof flatData === 'object' && flatData !== null) {
      // Add as key-value pairs
      worksheet.columns = [
        { header: 'Key', key: 'key', width: 30 },
        { header: 'Value', key: 'value', width: 50 },
      ];

      for (const [key, value] of Object.entries(this.flattenObject(flatData))) {
        worksheet.addRow({ key, value });
      }
    }
  }

  /**
   * Export to PDF
   */
  private async exportToPDF(data: any, filename: string): Promise<string> {
    const filePath = path.join(this.exportDir, `${filename}.pdf`);
    const doc = new PDFDocument({ margin: 50 });

    return new Promise((resolve, reject) => {
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Title
      doc.fontSize(20).text('Analytics Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.moveDown(2);

      this.addDataToPDF(doc, data);

      doc.end();

      stream.on('finish', () => resolve(filePath));
      stream.on('error', reject);
    });
  }

  /**
   * Add data to PDF document
   */
  private addDataToPDF(doc: PDFKit.PDFDocument, data: any, level: number = 0): void {
    const indent = level * 20;

    if (Array.isArray(data)) {
      if (data.length > 0 && typeof data[0] === 'object') {
        // Table-like data
        this.addTableToPDF(doc, data);
      } else {
        // Simple array
        data.forEach((item, index) => {
          doc.text(`${index + 1}. ${item}`, indent + 20);
        });
      }
    } else if (typeof data === 'object' && data !== null) {
      for (const [key, value] of Object.entries(data)) {
        const formattedKey = this.formatHeader(key);
        
        if (value && typeof value === 'object') {
          doc.font('Helvetica-Bold').text(formattedKey, indent);
          this.addDataToPDF(doc, value, level + 1);
        } else {
          doc.text(`${formattedKey}: ${value}`, indent);
        }
      }
    } else {
      doc.text(String(data), indent);
    }
  }

  /**
   * Add table to PDF
   */
  private addTableToPDF(doc: PDFKit.PDFDocument, data: any[]): void {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const columnWidth = 500 / headers.length;

    // Headers
    let y = doc.y;
    headers.forEach((header, i) => {
      doc.font('Helvetica-Bold')
         .text(this.formatHeader(header), 50 + (i * columnWidth), y, {
           width: columnWidth,
           align: 'left',
         });
    });

    y += 20;

    // Rows
    data.forEach((row, rowIndex) => {
      headers.forEach((header, i) => {
        const value = row[header] || '';
        doc.font('Helvetica')
           .text(String(value), 50 + (i * columnWidth), y + (rowIndex * 20), {
             width: columnWidth,
             align: 'left',
           });
      });
    });

    doc.y = y + (data.length * 20) + 20;
  }

  /**
   * Flatten nested data for CSV export
   */
  private flattenData(data: any): any {
    if (Array.isArray(data)) {
      return data.map(item => this.flattenObject(item));
    }
    return this.flattenObject(data);
  }

  /**
   * Flatten nested object
   */
  private flattenObject(obj: any, prefix: string = ''): any {
    if (!obj || typeof obj !== 'object') return obj;

    return Object.keys(obj).reduce((acc: any, key: string) => {
      const prefixedKey = prefix ? `${prefix}.${key}` : key;
      
      if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        Object.assign(acc, this.flattenObject(obj[key], prefixedKey));
      } else if (Array.isArray(obj[key])) {
        acc[prefixedKey] = JSON.stringify(obj[key]);
      } else {
        acc[prefixedKey] = obj[key];
      }
      
      return acc;
    }, {});
  }

  /**
   * Format header for display
   */
  private formatHeader(header: string): string {
    return header
      .split('.')
      .pop()!
      .split(/(?=[A-Z])/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Sanitize sheet name for Excel
   */
  private sanitizeSheetName(name: string): string {
    return name
      .replace(/[\[\]:\*\?\/\\]/g, '')
      .substring(0, 31);
  }

  /**
   * Upload CSV file
   */
  async uploadCSV(data: string, filename: string): Promise<string> {
    const filePath = path.join(this.exportDir, filename);
    await fs.promises.writeFile(filePath, data);
    
    const url = await storageService.uploadFile(filePath, {
      folder: 'exports',
      filename,
    });

    fs.unlinkSync(filePath);
    return url;
  }

  /**
   * Upload PDF file
   */
  async uploadPDF(data: Buffer, filename: string): Promise<string> {
    const filePath = path.join(this.exportDir, filename);
    await fs.promises.writeFile(filePath, data);
    
    const url = await storageService.uploadFile(filePath, {
      folder: 'exports',
      filename,
    });

    fs.unlinkSync(filePath);
    return url;
  }

  /**
   * Generate PDF from data
   */
  async generatePDF(data: any, title: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({ margin: 50 });

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Title
      doc.fontSize(20).text(title, { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.moveDown(2);

      this.addDataToPDF(doc, data);

      doc.end();
    });
  }

  /**
   * Clean up old export files
   */
  async cleanup(days: number = 7): Promise<void> {
    try {
      const files = await fs.promises.readdir(this.exportDir);
      const now = Date.now();

      for (const file of files) {
        const filePath = path.join(this.exportDir, file);
        const stats = await fs.promises.stat(filePath);
        const age = (now - stats.mtimeMs) / (1000 * 60 * 60 * 24);

        if (age > days) {
          await fs.promises.unlink(filePath);
          logger.debug(`Cleaned up old export file: ${file}`);
        }
      }
    } catch (error) {
      logger.error('Error cleaning up export files:', error);
    }
  }
}

export const exportService = new ExportService();
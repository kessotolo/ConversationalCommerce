/**
 * Service for handling CSV operations
 * Provides utilities for parsing and generating CSV data
 */
export class CsvService {
  /**
   * Convert array of objects to CSV string
   * @param data - Array of objects to convert
   * @param headers - Optional custom headers (keys to include from objects)
   * @returns CSV string with headers
   */
  public objectsToCsv<T extends Record<string, unknown>>(
    data: T[],
    headers?: string[]
  ): string {
    if (!data.length) {
      return '';
    }

    // If headers aren't provided, use all keys from the first object
    const keys = headers || Object.keys(data[0]);

    // Create the header row
    const headerRow = keys.join(',');

    // Create content rows
    const rows = data.map(item =>
      keys
        .map(key => {
          const value = item[key];
          return this.formatCsvValue(value);
        })
        .join(',')
    );

    // Combine header and rows
    return [headerRow, ...rows].join('\n');
  }

  /**
   * Parse CSV string into array of objects
   * @param csv - CSV string to parse
   * @param headers - Optional custom headers (if not using first row)
   * @returns Array of objects with properties corresponding to CSV columns
   */
  public csvToObjects<T = Record<string, string>>(
    csv: string,
    headers?: string[]
  ): T[] {
    if (!csv) {
      return [];
    }

    const lines = csv
      .split('\n')
      .map(line => line.trim())
      .filter(line => line); // Remove empty lines

    if (!lines.length) {
      return [];
    }

    let columnHeaders: string[];
    let dataRows: string[];

    if (headers) {
      // Use provided headers
      columnHeaders = headers;
      dataRows = lines;
    } else {
      // Use first row as headers
      columnHeaders = this.parseCsvLine(lines[0]);
      dataRows = lines.slice(1);
    }

    return dataRows.map(row => {
      const values = this.parseCsvLine(row);
      const obj: Record<string, string> = {};

      // Map values to their corresponding headers
      columnHeaders.forEach((header, index) => {
        obj[header] = values[index] || '';
      });

      return obj as T;
    });
  }

  /**
   * Download data as a CSV file
   * @param csvData - CSV string data
   * @param filename - Filename for the downloaded file
   */
  public downloadCsv(csvData: string, filename: string): void {
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    // Create downloadable link
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
  /**
   * Parse a single CSV line into an array of values
   * Handles quoted values with commas inside them
   * @param line - CSV line to parse
   * @returns Array of values
   */
  private parseCsvLine(line: string): string[] {
    const values: string[] = [];
    let currentValue = '';
    let insideQuote = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          // Handle escaped quotes (double quotes)
          currentValue += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote mode
          insideQuote = !insideQuote;
        }
      } else if (char === ',' && !insideQuote) {
        // End of value
        values.push(currentValue.trim());
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    
    // Add the last value
    values.push(currentValue.trim());
    
    return values;
  }
  
  /**
   * Format a value for CSV output
   * @param value - Value to format
   * @returns Formatted value
   */
  private formatCsvValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    
    let stringValue = String(value);
    
    // Check if value needs to be quoted (contains comma, newline, or quotes)
    if (
      stringValue.includes(',') || 
      stringValue.includes('\n') || 
      stringValue.includes('"') || 
      stringValue.includes('\r')
    ) {
      // Escape quotes by doubling them
      stringValue = stringValue.replace(/"/g, '""');
      // Wrap in quotes
      stringValue = `"${stringValue}"`;
    }
    
    return stringValue;
  }
}

// Export a singleton instance for use throughout the app
export const csvService = new CsvService();

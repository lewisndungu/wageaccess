import * as XLSX from "xlsx";
import Papa from "papaparse";

// Column mapping configuration
export const columnMappings: Record<string, string> = {
  "EMPLO NO.": "Emp No",
  "EMPLOYEES' FULL NAMES": "fullName",
  "ID NO": "ID Number",
  "KRA PIN NO.": "KRA Pin",
  "NSSF NO.": "NSSF No",
  "JOB TITTLE": "Position",
  "BASIC SALARY": "Gross Pay",
  PAYE: "PAYE",
  NSSF: "NSSF",
  "NHIF NO": "NHIF",
  "H-LEVY": "Levy",
  LOANS: "Loan Deduction",
  ADVANCE: "Employer Advance",
};

// Function to skip header rows and find the actual data rows
function findActualDataRows(
  data: Array<Record<string, any>>
): Array<Record<string, any>> {
  const dataStartIndex = data.findIndex((row) => {
    const rowValues = Object.values(row).map((v) =>
      String(v || "").toLowerCase()
    );
    return rowValues.some(
      (v) =>
        v.includes("employee") ||
        v.includes("name") ||
        v.includes("emp") ||
        v.includes("no.") ||
        v.includes("salary") ||
        v.includes("id")
    );
  });

  if (dataStartIndex >= 0) {
    return data.slice(dataStartIndex + 1);
  }

  return data;
}

// Improved function to find the closest matching column
export function findBestMatch(
  targetColumn: string,
  availableColumns: string[]
): string | null {
  const specialCases: Record<string, string[]> = {
    "EMPLO NO.": [
      "EMP NO",
      "EMPLOYEE NO",
      "EMPLOYEE NUMBER",
      "EMP NUMBER",
      "STAFF NO",
      "PAYROLL NO",
    ],
    "EMPLOYEES' FULL NAMES": [
      "EMPLOYEE NAME",
      "FULL NAME",
      "NAME",
      "EMPLOYEE NAMES",
      "STAFF NAME",
      "EMPLOYEE FULL NAME",
    ],
    "ID NO": ["ID NUMBER", "NATIONAL ID", "IDENTITY NUMBER", "ID"],
    "KRA PIN NO.": ["KRA PIN", "KRA", "PIN NO", "PIN NUMBER", "TAX PIN"],
    "NSSF NO.": ["NSSF NUMBER", "NSSF", "SOCIAL SECURITY NO"],
    "JOB TITTLE": ["TITLE", "POSITION", "JOB TITLE", "DESIGNATION", "ROLE"],
    "BASIC SALARY": [
      "SALARY",
      "GROSS SALARY",
      "GROSS",
      "GROSS PAY",
      "MONTHLY SALARY",
    ],
    "NHIF NO": [
      "NHIF",
      "NHIF NUMBER",
      "HEALTH INSURANCE",
      "HEALTH INSURANCE NO",
    ],
    "H-LEVY": ["HOUSING LEVY", "LEVY", "HOUSE LEVY", "HOUSING"],
    LOANS: ["LOAN", "LOAN DEDUCTION", "LOAN REPAYMENT", "DEBT REPAYMENT"],
    ADVANCE: [
      "SALARY ADVANCE",
      "ADVANCE SALARY",
      "EMPLOYER ADVANCE",
      "ADVANCE PAYMENT",
    ],
  };

  const cleanedAvailableColumns = availableColumns
    .map((col) => {
      if (col && col.startsWith("__EMPTY")) return null;
      return col;
    })
    .filter(Boolean) as string[];

  const exactMatch = cleanedAvailableColumns.find(
    (col) => col && col.toLowerCase() === targetColumn.toLowerCase()
  );
  if (exactMatch) return exactMatch;

  if (specialCases[targetColumn]) {
    for (const variation of specialCases[targetColumn]) {
      const specialMatch = cleanedAvailableColumns.find(
        (col) => col && col.toLowerCase() === variation.toLowerCase()
      );
      if (specialMatch) return specialMatch;
    }
  }

  for (const col of cleanedAvailableColumns) {
    if (
      col &&
      (col.toLowerCase().includes(targetColumn.toLowerCase()) ||
        targetColumn.toLowerCase().includes(col.toLowerCase()))
    ) {
      return col;
    }
  }

  const targetWords = targetColumn
    .toLowerCase()
    .split(/[\s.,\-_]+/)
    .filter((word) => word.length > 2);
  for (const col of cleanedAvailableColumns) {
    if (!col) continue;
    const colWords = col
      .toLowerCase()
      .split(/[\s.,\-_]+/)
      .filter((word) => word.length > 2);
    const hasCommonWords = targetWords.some((word) => colWords.includes(word));
    if (hasCommonWords) return col;
  }

  return null;
}

// Process file and return transformed data
export async function processFile(file: File): Promise<{
  data: Array<Record<string, any>>;
  fileName: string;
  failedExtractions: Array<{ row: Record<string, any>; reason: string }>;
}> {
  const fileName = file.name.split(".")[0] + "_transformed.xlsx";
  let failedExtractions: Array<{ row: Record<string, any>; reason: string }> =
    [];

  if (file.name.endsWith(".csv")) {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          try {
            const { transformedData, failedRows } = transformData(
              results.data as Array<Record<string, any>>
            );
            failedExtractions = failedRows;
            resolve({ data: transformedData, fileName, failedExtractions });
          } catch (error) {
            reject(error);
          }
        },
        error: (error) => {
          reject(error);
        },
      });
    });
  } else {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target?.result as ArrayBuffer;
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            defval: "",
          }) as Array<Record<string, any>>;

          const dataRows = findActualDataRows(jsonData);

          const dataToTransform = dataRows.length > 0 ? dataRows : jsonData;

          console.log(
            "First data row (likely headers):",
            dataRows.length > 0
              ? jsonData[dataRows.findIndex((r) => r === dataRows[0]) - 1]
              : null
          );
          console.log("Processing data rows starting with:", dataRows[0]);

          const { transformedData, failedRows } =
            transformData(dataToTransform);
          failedExtractions = failedRows;

          if (transformedData.length === 0) {
            const { directExtracted, directFailedRows } =
              directDataExtraction(jsonData);
            failedExtractions = [...failedExtractions, ...directFailedRows];
            resolve({ data: directExtracted, fileName, failedExtractions });
          } else {
            resolve({ data: transformedData, fileName, failedExtractions });
          }
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = (error) => {
        reject(error);
      };

      reader.readAsArrayBuffer(file);
    });
  }
}

// Direct extraction for non-standard formats
function directDataExtraction(data: Array<Record<string, any>>): {
  directExtracted: Array<Record<string, any>>;
  directFailedRows: Array<{ row: Record<string, any>; reason: string }>;
} {
  const directExtracted: Array<Record<string, any>> = [];
  const directFailedRows: Array<{ row: Record<string, any>; reason: string }> =
    [];

  data.forEach((row) => {
    const rowValues = Object.values(row);
    const hasName = rowValues.some(
      (val) =>
        typeof val === "string" &&
        val.length > 3 &&
        /[A-Za-z]{2,}\s+[A-Za-z]{2,}/.test(String(val))
    );

    const hasNumber = rowValues.some(
      (val) =>
        typeof val === "number" ||
        (typeof val === "string" && /^\d+$/.test(String(val)))
    );

    if (hasName && hasNumber) {
      const extractedRow: Record<string, any> = {};
      let extractedFields = 0;

      Object.entries(row).forEach(([key, value]) => {
        if (
          typeof value === "string" &&
          value.length > 3 &&
          /[A-Za-z]{2,}\s+[A-Za-z]{2,}/.test(String(value))
        ) {
          const fullName = String(value).trim();
          const nameParts = fullName.split(/\s+/);

          extractedRow["First Name"] = nameParts[0];
          extractedRow["Last Name"] = nameParts.slice(1).join(" ");
          extractedRow["fullName"] = fullName;
          extractedFields++;
        } else if (/^\d{5,}$/.test(String(value))) {
          extractedRow["ID Number"] = value;
          extractedFields++;
        } else if (/^[A-Z]\d{9}[A-Z]$/.test(String(value))) {
          extractedRow["KRA Pin"] = value;
          extractedFields++;
        } else if (/^\d{4,6}$/.test(String(value))) {
          extractedRow["NSSF No"] = value;
          extractedFields++;
        } else if (typeof value === "number" && value > 1000) {
          if (!extractedRow["Gross Pay"]) {
            extractedRow["Gross Pay"] = value;
            extractedFields++;
          }
        }
      });

      if (extractedFields > 2) {
        directExtracted.push(extractedRow);
      } else {
        directFailedRows.push({
          row,
          reason: `Could only identify ${extractedFields} fields (minimum 3 required)`,
        });
      }
    } else {
      const hasValues = Object.values(row).some(
        (v) => v !== "" && v !== null && v !== undefined
      );
      if (hasValues) {
        directFailedRows.push({
          row,
          reason: "Row does not contain recognizable employee data pattern",
        });
      }
    }
  });

  return { directExtracted, directFailedRows };
}

// Improved transform data function
export function transformData(data: Array<Record<string, any>>): {
  transformedData: Array<Record<string, any>>;
  failedRows: Array<{ row: Record<string, any>; reason: string }>;
} {
  if (!data || data.length === 0) {
    return { transformedData: [], failedRows: [] };
  }

  console.log("Original data first row:", data[0]);

  const originalHeaders = Object.keys(data[0]);

  console.log("Original headers:", originalHeaders);

  const headerMapping: Record<string, string> = {};
  const failedRows: Array<{ row: Record<string, any>; reason: string }> = [];

  Object.entries(columnMappings).forEach(([original, target]) => {
    const bestMatch = findBestMatch(original, originalHeaders);
    console.log(`Mapping for ${original}: ${bestMatch} -> ${target}`);
    if (bestMatch) {
      headerMapping[bestMatch] = target;
    }
  });

  console.log("Final header mapping:", headerMapping);

  if (Object.keys(headerMapping).length === 0) {
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i];
      for (const [key, value] of Object.entries(row)) {
        const valueStr = String(value).trim().toLowerCase();
        if (!valueStr) continue;

        for (const [original, target] of Object.entries(columnMappings)) {
          const originalLower = original.toLowerCase();
          if (
            valueStr.includes(originalLower) ||
            originalLower.includes(valueStr)
          ) {
            const rowIndex = i;
            console.log(`Found possible header row at index ${rowIndex}:`, row);

            if (rowIndex < data.length - 1) {
              console.log(
                "Attempting extraction with headers from detected row"
              );
              return extractDataWithDetectedHeaders(
                data.slice(rowIndex),
                data.slice(rowIndex + 1)
              );
            }
          }
        }
      }
    }
  }

  const transformedData = data
    .map((row) => {
      const isEmpty = Object.values(row).every(
        (val) => val === "" || val === null || val === undefined
      );

      const valueCount = Object.values(row).filter(
        (val) => val !== "" && val !== null && val !== undefined
      ).length;
      const isLikelyHeader =
        valueCount === 1 || (valueCount < 3 && Object.keys(row).length > 4);

      if (isEmpty || isLikelyHeader) {
        return null;
      }

      const transformedRow: Record<string, any> = {};
      let mappedFields = 0;

      Object.entries(row).forEach(([key, value]) => {
        if (headerMapping[key]) {
          if (headerMapping[key] === "fullName") {
            const fullName = String(value || "").trim();
            const nameParts = fullName.split(/\s+/);

            if (nameParts.length >= 2) {
              transformedRow["First Name"] = nameParts[0];
              transformedRow["Last Name"] = nameParts.slice(1).join(" ");
            } else {
              transformedRow["First Name"] = fullName;
              transformedRow["Last Name"] = "";
            }
            transformedRow["fullName"] = fullName;
            mappedFields++;
          } else {
            transformedRow[headerMapping[key]] = value;
            mappedFields++;
          }
        }
      });

      if (mappedFields < 3 && !isEmpty && !isLikelyHeader) {
        failedRows.push({
          row,
          reason: `Only ${mappedFields} fields could be mapped to known columns`,
        });
        return null;
      }

      return transformedRow;
    })
    .filter((row) => row !== null && Object.keys(row).length > 0) as Record<string, any>[];

  return { transformedData, failedRows };
}

// Extract data with detected headers
function extractDataWithDetectedHeaders(
  allRows: Array<Record<string, any>>,
  dataRows: Array<Record<string, any>>
): {
  transformedData: Array<Record<string, any>>;
  failedRows: Array<{ row: Record<string, any>; reason: string }>;
} {
  if (allRows.length === 0 || dataRows.length === 0) {
    return { transformedData: [], failedRows: [] };
  }

  const headerRow = allRows[0];
  const headerMapping: Record<string, string> = {};
  const failedRows: Array<{ row: Record<string, any>; reason: string }> = [];

  for (const [key, headerValue] of Object.entries(headerRow)) {
    const headerText = String(headerValue).trim();
    if (!headerText) continue;

    for (const [original, target] of Object.entries(columnMappings)) {
      if (
        headerText.toLowerCase().includes(original.toLowerCase()) ||
        original.toLowerCase().includes(headerText.toLowerCase())
      ) {
        headerMapping[key] = target;
        break;
      }
    }
  }

  console.log("Header mapping from detected headers:", headerMapping);

  const transformedData = dataRows
    .map((row) => {
      const isEmpty = Object.values(row).every(
        (val) => val === "" || val === null || val === undefined
      );

      const valueCount = Object.values(row).filter(
        (val) => val !== "" && val !== null && val !== undefined
      ).length;
      const isLikelyHeader =
        valueCount === 1 || (valueCount < 3 && Object.keys(row).length > 4);

      if (isEmpty || isLikelyHeader) {
        return null;
      }

      const transformedRow: Record<string, any> = {};
      let mappedFields = 0;

      Object.entries(row).forEach(([key, value]) => {
        if (headerMapping[key]) {
          if (headerMapping[key] === "fullName") {
            const fullName = String(value || "").trim();
            const nameParts = fullName.split(/\s+/);

            if (nameParts.length >= 2) {
              transformedRow["First Name"] = nameParts[0];
              transformedRow["Last Name"] = nameParts.slice(1).join(" ");
            } else {
              transformedRow["First Name"] = fullName;
              transformedRow["Last Name"] = "";
            }
            transformedRow["fullName"] = fullName;
            mappedFields++;
          } else {
            transformedRow[headerMapping[key]] = value;
            mappedFields++;
          }
        }
      });

      if (mappedFields < 3 && !isEmpty && !isLikelyHeader) {
        failedRows.push({
          row,
          reason: `Only ${mappedFields} fields could be mapped to known columns`,
        });
        return null;
      }

      return transformedRow;
    })
    .filter((row) => row !== null && Object.keys(row).length > 0) as Record<string, any>[];

  return { transformedData, failedRows };
}

// Function to download the transformed data
export function downloadTransformedData(
  data: Array<Record<string, any>>,
  fileName: string
): void {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileNameWithTimestamp = fileName.replace(".xlsx", `_${timestamp}.xlsx`);

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Transformed Data");

  XLSX.writeFile(workbook, fileNameWithTimestamp);
}

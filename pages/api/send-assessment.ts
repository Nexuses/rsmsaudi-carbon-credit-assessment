import type { NextApiRequest, NextApiResponse } from 'next'
import nodemailer from 'nodemailer'
import React from 'react';
import { Document, Page, Text, View, StyleSheet, pdf, Image } from '@react-pdf/renderer';
import { questionsData } from '@/lib/questions';
import { translations } from '@/lib/translations';
import { google } from 'googleapis';

// Define the structure of the request body
interface AssessmentData {
  personalInfo: {
    name: string;
    email: string;
    company: string;
    position: string;
  };
  answers: Record<string, string>;
  score: number;
  language?: 'en' | 'fr' | 'ar';
}

interface PersonalInfo {
  name: string;
  email: string;
  company: string;
  position: string;
}

// Helper function to get result text
const getResultText = (score: number, language: 'en' | 'fr' | 'ar' = 'en') => {
  const t = translations[language].resultTexts;
  // Updated thresholds for 7 questions (max 56 points)
  if (score >= 85) return t.advanced;  // Carbon readiness max 100
  if (score >= 65) return t.solid;
  if (score >= 35) return t.basic;
  return t.urgent;                       // Below 20
};

// Create styles for the PDF
const createStyles = (language: 'en' | 'fr' | 'ar') => StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#757574',
    position: 'relative',
  },
  letterheadHeader: {
    backgroundColor: '#009CD9',
    paddingTop: 20,
    paddingBottom: 15,
    paddingLeft: 40,
    paddingRight: 40,
    marginBottom: 0,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  logo: {
    width: 80,
    height: 40,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 3,
    textAlign: language === 'ar' ? 'right' : 'left',
  },
  companyTagline: {
    fontSize: 10,
    color: '#ffffff',
    opacity: 0.9,
    textAlign: language === 'ar' ? 'right' : 'left',
  },
  managingPartner: {
    fontSize: 10,
    color: '#ffffff',
    opacity: 0.9,
    marginTop: 4,
    textAlign: language === 'ar' ? 'right' : 'left',
    fontStyle: 'italic',
  },
  headerBottom: {
    borderTopWidth: 1,
    borderTopColor: '#ffffff',
    borderTopStyle: 'solid',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: language === 'ar' ? 'right' : 'left',
  },
  documentDate: {
    fontSize: 10,
    color: '#ffffff',
    opacity: 0.9,
    textAlign: language === 'ar' ? 'left' : 'right',
  },
  contentArea: {
    padding: 40,
    paddingTop: 30,
    paddingBottom: 30,
    flex: 1,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2D9C2D',
    marginBottom: 15,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#2D9C2D',
    borderBottomStyle: 'solid',
    textAlign: language === 'ar' ? 'right' : 'left',
  },
  personalInfoCard: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#009CD9',
    borderLeftStyle: 'solid',
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#757574',
    width: '25%',
    textAlign: language === 'ar' ? 'right' : 'left',
  },
  infoValue: {
    fontSize: 11,
    color: '#2D9C2D',
    fontWeight: 'bold',
    flex: 1,
    textAlign: language === 'ar' ? 'right' : 'left',
  },
  scoreContainer: {
    backgroundColor: '#f0f9ff',
    padding: 25,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 25,
    borderWidth: 2,
    borderColor: '#009CD9',
    borderStyle: 'solid',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#757574',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#2D9C2D',
    marginBottom: 15,
  },
  resultText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#009CD9',
    textAlign: 'center',
    lineHeight: 1.4,
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#009CD9',
    borderStyle: 'solid',
  },
  questionsTableContainer: {
    marginTop: 15,
    borderWidth: 2,
    borderColor: '#009CD9',
    borderStyle: 'solid',
    borderRadius: 12,
    overflow: 'hidden',
    breakInside: 'avoid',
  },
  questionsTableContainerPageBreak: {
    marginTop: 15,
    borderWidth: 2,
    borderColor: '#009CD9',
    borderStyle: 'solid',
    borderRadius: 12,
    overflow: 'hidden',
    breakInside: 'avoid',
  },
  questionsTable: {
    marginTop: 0,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#2D9C2D',
    borderRadius: 0,
    marginBottom: 0,
    borderBottomWidth: 2,
    borderBottomColor: '#009CD9',
    borderBottomStyle: 'solid',
  },
  tableHeaderCell: {
    flex: 1,
    padding: 12,
    textAlign: language === 'ar' ? 'right' : 'left',
    borderRightWidth: 1,
    borderRightColor: '#ffffff',
    borderRightStyle: 'solid',
  },
  tableHeaderCellLast: {
    flex: 1,
    padding: 12,
    textAlign: language === 'ar' ? 'right' : 'left',
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    borderBottomStyle: 'solid',
    backgroundColor: '#ffffff',
  },
  tableRowAlt: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    borderBottomStyle: 'solid',
    backgroundColor: '#f8f9fa',
  },
  tableRowLast: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
  },
  tableRowAltLast: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
  },
  tableCell: {
    flex: 1,
    padding: 12,
    textAlign: language === 'ar' ? 'right' : 'left',
    borderRightWidth: 1,
    borderRightColor: '#e5e5e5',
    borderRightStyle: 'solid',
  },
  tableCellLast: {
    flex: 1,
    padding: 12,
    textAlign: language === 'ar' ? 'right' : 'left',
  },
  tableCellText: {
    fontSize: 10,
    color: '#757574',
    lineHeight: 1.4,
  },
  letterheadFooter: {
    backgroundColor: '#757574',
    padding: 15,
    paddingLeft: 40,
    paddingRight: 40,
    marginTop: 'auto',
  },
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLeft: {
    flex: 1,
  },
  footerRight: {
    alignItems: 'flex-end',
  },
  footerText: {
    fontSize: 9,
    color: '#ffffff',
    textAlign: language === 'ar' ? 'right' : 'left',
    lineHeight: 1.3,
  },
  footerDescription: {
    fontSize: 8,
    color: '#ffffff',
    opacity: 0.8,
    textAlign: language === 'ar' ? 'right' : 'left',
    lineHeight: 1.2,
    fontStyle: 'italic',
  },
});

// Helper function to generate PDF buffer
async function generatePDFBuffer(
  personalInfo: PersonalInfo,
  score: number,
  answers: Record<string, string>,
  language: 'en' | 'fr' | 'ar'
): Promise<Buffer> {
  const t = translations[language] || translations.en;
  const styles = createStyles(language);
  const currentQuestions = questionsData[language] || questionsData.en;

  const createDocument = () => {
    const currentDate = new Date().toLocaleDateString(language === 'ar' ? 'ar-SA' : language === 'fr' ? 'fr-FR' : 'en-US');
    
    // First page: 11 questions, second page: remaining questions
    const allAnswers = Object.entries(answers);
    const questionChunks: [string, string][][] = [];

    if (allAnswers.length > 0) {
      questionChunks.push(allAnswers.slice(0, 11));
      if (allAnswers.length > 11) {
        questionChunks.push(allAnswers.slice(11));
      }
    }
    
    const createQuestionRows = (answersChunk: [string, string][], isLastPage = false) => {
      return answersChunk.map(([questionId, answerValue]: [string, string], index: number) => {
        const question = currentQuestions.find((q) => q.id === questionId);
        const answer = question?.options.find((opt) => opt.value === answerValue);
        const globalIndex = allAnswers.findIndex(([id]) => id === questionId);
        const isLastRow = isLastPage && index === answersChunk.length - 1;
        const rowStyle = isLastRow 
          ? (globalIndex % 2 === 0 ? styles.tableRowLast : styles.tableRowAltLast)
          : (globalIndex % 2 === 0 ? styles.tableRow : styles.tableRowAlt);
        const cellStyle = isLastRow ? styles.tableCellLast : styles.tableCell;
        
        return React.createElement(View, { key: questionId, style: rowStyle },
          React.createElement(View, { style: cellStyle },
            React.createElement(Text, { style: styles.tableCellText }, question?.text || 'Unknown question')
          ),
          React.createElement(View, { style: styles.tableCellLast },
            React.createElement(Text, { style: styles.tableCellText }, answer?.label || 'Unknown answer')
          )
        );
      });
    };

    const createFooter = () => React.createElement(View, { style: styles.letterheadFooter },
      React.createElement(View, { style: styles.footerContent },
        React.createElement(View, { style: styles.footerLeft },
          React.createElement(Text, { style: styles.footerText }, "© 2026 RSM SAUDI ARABIA. All rights reserved."),
          React.createElement(Text, { style: styles.footerDescription }, "THE POWER OF BEING UNDERSTOOD")
        )
      )
    );

    const pages = [];
    
    pages.push(
      React.createElement(Page, { size: "A4", style: styles.page },
        React.createElement(View, { style: styles.letterheadHeader },
          React.createElement(View, { style: styles.headerTop },
            React.createElement(View, { style: styles.headerLeft },
              React.createElement(Text, { style: styles.companyName }, "RSM SAUDI ARABIA"),
              React.createElement(Text, { style: styles.companyTagline }, "THE POWER OF BEING UNDERSTOOD")
            ),
            React.createElement(View, { style: styles.headerRight },
              React.createElement(Image, {
                style: styles.logo,
                src: "https://22527425.fs1.hubspotusercontent-na2.net/hubfs/22527425/Intellectus/Untitled%20design%20(2).png"
              })
            )
          ),
          React.createElement(View, { style: styles.headerBottom },
            React.createElement(Text, { style: styles.documentTitle }, t.pdfLabels.assessmentResults),
            React.createElement(Text, { style: styles.documentDate }, currentDate)
          )
        ),
        React.createElement(View, { style: styles.contentArea },
          React.createElement(View, { style: styles.section },
            React.createElement(Text, { style: styles.sectionTitle }, "Detailed Information"),
            React.createElement(View, { style: styles.personalInfoCard },
              React.createElement(View, { style: styles.infoRow },
                React.createElement(Text, { style: styles.infoLabel }, `${t.pdfLabels.name}:`),
                React.createElement(Text, { style: styles.infoValue }, personalInfo.name)
              ),
              React.createElement(View, { style: styles.infoRow },
                React.createElement(Text, { style: styles.infoLabel }, `${t.pdfLabels.email}:`),
                React.createElement(Text, { style: styles.infoValue }, personalInfo.email)
              ),
              React.createElement(View, { style: styles.infoRow },
                React.createElement(Text, { style: styles.infoLabel }, `${t.pdfLabels.company}:`),
                React.createElement(Text, { style: styles.infoValue }, personalInfo.company)
              ),
              React.createElement(View, { style: styles.infoRow },
                React.createElement(Text, { style: styles.infoLabel }, `${t.pdfLabels.position}:`),
                React.createElement(Text, { style: styles.infoValue }, personalInfo.position)
              )
            )
          ),
          React.createElement(View, { style: styles.section },
            React.createElement(Text, { style: styles.sectionTitle }, "Assessment Results"),
            React.createElement(View, { style: styles.scoreContainer },
              React.createElement(Text, { style: styles.scoreLabel }, t.pdfLabels.score),
              React.createElement(Text, { style: styles.scoreValue }, score.toString()),
              React.createElement(Text, { style: styles.resultText }, getResultText(score, language))
            )
          )
        )
      )
    );

    questionChunks.forEach((chunk, chunkIndex) => {
      const isLastChunk = chunkIndex === questionChunks.length - 1;
      
      pages.push(
        React.createElement(Page, { size: "A4", style: styles.page },
          React.createElement(View, { style: styles.contentArea },
            React.createElement(View, { style: styles.section },
              chunkIndex === 0 ? React.createElement(Text, { style: styles.sectionTitle }, "Assessment Details") : null,
              React.createElement(View, { 
                style: chunkIndex === 0 ? styles.questionsTableContainer : styles.questionsTableContainerPageBreak 
              },
                React.createElement(View, { style: styles.questionsTable },
                  chunkIndex === 0 ? React.createElement(View, { style: styles.tableHeader },
                    React.createElement(View, { style: styles.tableHeaderCell },
                      React.createElement(Text, { style: styles.tableHeaderText }, t.pdfLabels.question)
                    ),
                    React.createElement(View, { style: styles.tableHeaderCellLast },
                      React.createElement(Text, { style: styles.tableHeaderText }, t.pdfLabels.answer)
                    )
                  ) : null,
                  ...createQuestionRows(chunk, isLastChunk)
                )
              )
            )
          ),
          isLastChunk ? createFooter() : null
        )
      );
    });

    return React.createElement(Document, {}, ...pages);
  };

  // Generate PDF buffer - use blob() method and convert to Buffer
  const pdfDoc = pdf(createDocument());
  const blob = await pdfDoc.toBlob();
  
  // Convert Blob to Buffer
  const arrayBuffer = await blob.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// Helper function to convert column number to letter (e.g., 1 -> A, 27 -> AA)
function columnToLetter(column: number): string {
  let temp, letter = '';
  while (column > 0) {
    temp = (column - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    column = (column - temp - 1) / 26;
  }
  return letter;
}

// Load Google credentials from env: file path (GOOGLE_APPLICATION_CREDENTIALS) or single-line JSON (GOOGLE_SERVICE_ACCOUNT_CREDENTIALS)
function getGoogleAuthCredentials(): object | undefined {
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (keyPath) {
    try {
      const fs = require('fs');
      const path = require('path');
      const resolved = path.isAbsolute(keyPath) ? keyPath : path.join(process.cwd(), keyPath);
      const raw = fs.readFileSync(resolved, 'utf8');
      return JSON.parse(raw);
    } catch (e) {
      console.error('Google credentials file error:', e);
      return undefined;
    }
  }
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS;
  if (!raw || typeof raw !== 'string') return undefined;
  try {
    return JSON.parse(raw.trim());
  } catch (e) {
    console.error('Google credentials JSON parse error (is GOOGLE_SERVICE_ACCOUNT_CREDENTIALS on a single line?):', e);
    return undefined;
  }
}

// Function to write assessment data to Google Sheets
async function writeToGoogleSheets(
  personalInfo: PersonalInfo,
  answers: Record<string, string>,
  score: number,
  language: 'en' | 'fr' | 'ar'
): Promise<{ success: boolean; error?: string }> {
  try {
    const credentials = getGoogleAuthCredentials();
    if (!credentials) {
      const msg = 'Google Sheets skipped: set GOOGLE_APPLICATION_CREDENTIALS (path to JSON file) or GOOGLE_SERVICE_ACCOUNT_CREDENTIALS (single-line JSON).';
      console.warn(msg);
      return { success: false, error: msg };
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    // Google Sheets ID for: https://docs.google.com/spreadsheets/d/1QhL3v-W_ZvQF7UM6py8CvDho_HzlxXhLqwBqDPpXsIw/edit
    const spreadsheetId = '1QhL3v-W_ZvQF7UM6py8CvDho_HzlxXhLqwBqDPpXsIw';
    const sheetName = 'Sheet1'; // Change if your sheet/tab has a different name

    // Get current questions for the language
    const currentQuestions = questionsData[language] || questionsData.en;

    // Prepare headers
    const headers = [
      'Timestamp',
      'Name',
      'Email',
      'Company',
      'Position',
      'Score',
      'Language',
      ...currentQuestions.map(q => `Q${q.id.replace('q', '')} - ${q.text.substring(0, 50)}...`),
    ];

    const lastColumnLetter = columnToLetter(headers.length);
    const headerRange = `${sheetName}!A1:${lastColumnLetter}1`;

    // Check if headers exist, if not, add them
    try {
      const headerResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: headerRange,
      });

      // If no headers exist, add them
      if (!headerResponse.data.values || headerResponse.data.values.length === 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: headerRange,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [headers],
          },
        });
      } else {
        // Update headers if they don't match (in case questions changed)
        const existingHeaders = headerResponse.data.values[0];
        if (existingHeaders.length !== headers.length || 
            JSON.stringify(existingHeaders) !== JSON.stringify(headers)) {
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: headerRange,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
              values: [headers],
            },
          });
        }
      }
    } catch (error) {
      // If sheet doesn't exist or error, try to create headers
      console.error('Error checking/updating headers:', error);
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: headerRange,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [headers],
        },
      });
    }

    // Prepare row data
    const timestamp = new Date().toISOString();
    const rowData = [
      timestamp,
      personalInfo.name,
      personalInfo.email,
      personalInfo.company,
      personalInfo.position,
      score.toString(),
      language.toUpperCase(),
      ...currentQuestions.map(q => {
        const answerValue = answers[q.id] || '';
        const answer = q.options.find(opt => opt.value === answerValue);
        return answer ? answer.label : '';
      }),
    ];

    // Append the new row
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:${lastColumnLetter}`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [rowData],
      },
    });

    console.log('Successfully wrote assessment data to Google Sheets');
    return { success: true };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Error writing to Google Sheets:', error);
    return { success: false, error: errMsg };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' })
  }

  const { personalInfo, answers, score, language = 'en' } = req.body as AssessmentData
  const t = translations[language];
  const currentQuestions = questionsData[language];

  // Create a transporter using SMTP
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  // Prepare email content with HTML formatting
  const emailContent = `
    <html>
      <head>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            color: #333;
            direction: ${language === 'ar' ? 'rtl' : 'ltr'};
          }
          .container { max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #2c3e50; text-align: center; }
          .score { font-size: 24px; font-weight: bold; color: #27ae60; text-align: center; }
          .section { margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: ${language === 'ar' ? 'right' : 'left'}; }
          th { background-color: #f2f2f2; }
          .logo { display: block; margin: 0 auto; max-width: 200px; background: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <img src="https://cdn-nexlink.s3.us-east-2.amazonaws.com/rsm-international-vector-logo_2-removebg-preview_5f53785d-2f5c-421e-a976-6388f78a00f2.png" alt="RSM Logo" class="logo">
          <h1>${t.pdfLabels.assessmentResults}</h1>
          <div class="section">
            <table>
              <tr>
                <th colspan="2">${t.pdfLabels.personalInfo}</th>
              </tr>
              <tr>
                <td><strong>${t.pdfLabels.name}:</strong></td>
                <td>${personalInfo.name}</td>
              </tr>
              <tr>
                <td><strong>${t.pdfLabels.email}:</strong></td>
                <td>${personalInfo.email}</td>
              </tr>
              <tr>
                <td><strong>${t.pdfLabels.company}:</strong></td>
                <td>${personalInfo.company}</td>
              </tr>
              <tr>
                <td><strong>${t.pdfLabels.position}:</strong></td>
                <td>${personalInfo.position}</td>
              </tr>
            </table>
          </div>
          <div class="section">
            <h2 class="score">${t.pdfLabels.score}: ${score}</h2>
          </div>
          <div class="section">
            <table>
              <tr>
                <th>${t.pdfLabels.question}</th>
                <th>${t.pdfLabels.answer}</th>
              </tr>
              ${Object.entries(answers).map(([questionId, answerValue]) => {
                const question = currentQuestions.find(q => q.id === questionId);
                const answer = question?.options.find(opt => opt.value === answerValue);
                return `
                  <tr>
                    <td>${question?.text || 'Unknown question'}</td>
                    <td>${answer?.label || 'Unknown answer'}</td>
                  </tr>
                `;
              }).join('')}
            </table>
          </div>
        </div>
      </body>
    </html>
  `

  try {
    // Generate PDF buffer
    const pdfBuffer = await generatePDFBuffer(personalInfo, score, answers, language);

    // Prepare user email content (RSM styled thank-you email)
    const userEmailContent = `
<!DOCTYPE html>
<html lang="${language}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${t.email.subject}</title>
    <style>
        /* Resets and Core Styles */
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse; }
        img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; display: block; }
        body { margin: 0; padding: 0; background-color: #ffffff; font-family: Helvetica, Arial, sans-serif; color: #333333; }
        
        /* RSM Color Palette */
        .rsm-blue { color: #002E5D; }
        .bg-rsm-blue { background-color: #002E5D; }
        .bg-light-gray { background-color: #f4f4f4; }
        
        /* Components */
        .container { width: 100%; max-width: 600px; margin: 0 auto; }
        .rounded-block { border-radius: 16px; overflow: hidden; }
        .attachment-badge { background-color: #eef2f6; color: #002E5D; padding: 8px 16px; border-radius: 20px; font-size: 13px; font-weight: bold; display: inline-block; border: 1px solid #ccdbe8; }
        
        /* Typography */
        h1 { font-size: 32px; font-weight: bold; margin: 0 0 20px 0; color: #002E5D; line-height: 1.2; }
        h2 { font-size: 20px; font-weight: bold; margin: 0 0 15px 0; color: #002E5D; }
        h3 { font-size: 18px; font-weight: bold; margin: 0 0 10px 0; color: #ffffff; }
        p { font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; }
        
        /* List Items in Grey Box */
        .list-title { font-size: 16px; font-weight: bold; color: #002E5D; margin-bottom: 4px; }
        .list-desc { font-size: 15px; color: #555555; line-height: 1.5; margin: 0; }
        
        .disclaimer { font-size: 12px; color: #777777; line-height: 1.5; }
        .footer-text { font-size: 12px; color: #999999; line-height: 1.5; }

        /* Buttons */
        .btn-primary { display: inline-block; padding: 14px 30px; background-color: #002E5D; color: #ffffff !important; text-decoration: none; font-weight: bold; border-radius: 30px; font-size: 16px; text-align: center; }
        .btn-secondary { display: inline-block; padding: 12px 24px; background-color: #ffffff; color: #002E5D !important; text-decoration: none; font-weight: bold; border-radius: 30px; font-size: 14px; text-align: center; border: 2px solid #ffffff; }

        /* Spacing Utility */
        .p-40 { padding: 40px; }
        .p-30 { padding: 30px; }
        .mb-30 { margin-bottom: 30px; }
        .mt-30 { margin-top: 30px; }

        /* Mobile Responsive */
        @media only screen and (max-width: 600px) {
            .container { width: 100% !important; padding-left: 20px; padding-right: 20px; }
            .p-40 { padding: 30px 20px !important; }
            .p-30 { padding: 25px 20px !important; }
            .mobile-stack { display: block !important; width: 100% !important; padding-bottom: 20px; }
            h1 { font-size: 26px !important; }
        }
    </style>
</head>
<body>

    <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
            <td align="center" style="padding-top: 30px; padding-bottom: 40px;">
                <table class="container" border="0" cellpadding="0" cellspacing="0">
                    
                    <tr>
                        <td align="left" style="padding-bottom: 30px;">
                            <img src="https://i.imgur.com/k83w5gc.png" alt="RSM Logo" width="120">
                        </td>
                    </tr>

                    <tr>
                        <td align="left" style="padding-bottom: 20px;">
                            <h1>Your Carbon Credit Assessment Report Is Ready</h1>
                            <p>${t.email.greeting} ${personalInfo.name},</p>
                            <p>${t.email.body}</p>
                            <p>${t.email.bodyPurpose}</p>
                        </td>
                    </tr>

                    <tr>
                        <td align="center" style="padding-bottom: 15px;">
                            <table border="0" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td class="attachment-badge">
                                        <strong>Note:</strong> Your full PDF report is attached below
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding-bottom: 30px;">
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" class="rounded-block bg-rsm-blue">
                                <tr>
                                    <td class="p-40" valign="middle" style="color: #ffffff;">
                                        <h3>How can RSM Saudi Arabia support you?</h3>
                                        <p style="color: #e0e0e0; margin-bottom: 25px;">Our regional carbon markets team specializes in conducting comprehensive carbon credit readiness assessments and supporting organizations in developing robust carbon strategies aligned with Saudi Arabia's Vision 2030, the Saudi Green Initiative, and leading international standards.</p>
                                        
                                        <table border="0" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td>
                                                    <a href="mailto:${t.email.appointmentEmail}" class="btn-secondary">${t.email.appointmentText}</a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <tr>
                        <td align="left" style="padding-top: 20px; border-top: 1px solid #eeeeee;">
                            <p class="disclaimer"><strong>Disclaimer:</strong> ${t.email.disclaimer}</p>
                            
                            <p class="footer-text" style="margin-top: 30px;">
                                <img src="https://i.imgur.com/k83w5gc.png" alt="RSM Logo" width="80" style="opacity: 0.6; margin-bottom: 15px;"><br>
                                ${t.email.closing.replace(/\n/g, '<br>')}<br>
                                <strong>RSM SAUDI ARABIA</strong><br>
                                <strong>THE POWER OF BEING UNDERSTOOD</strong><br>
                                © ${new Date().getFullYear()} RSM Saudi Arabia. All rights reserved.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>

</body>
</html>
    `;

    // Send email to user with PDF attachment
    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: personalInfo.email,
      replyTo: 'ladhikari@rsmsaudi.com',
      subject: t.email.subject,
      html: userEmailContent,
      attachments: [
        {
          filename: `${personalInfo.company}_Cyber_Self_Assessment_Report.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    // Send internal notification email (without PDF)
    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: "arpit.m@nexuses.in",
      subject: t.pdfLabels.assessmentResults,
      html: emailContent,
    })

    // Write assessment data to Google Sheets
    const sheetsResult = await writeToGoogleSheets(personalInfo, answers, score, language);

    res.status(200).json({
      message: 'Assessment results sent successfully',
      sheetsUpdated: sheetsResult.success,
      ...(sheetsResult.error && { sheetsError: sheetsResult.error }),
    })
  } catch (error) {
    console.error('Error sending email:', error)
    res.status(500).json({ message: 'Failed to send assessment results' })
  }
}

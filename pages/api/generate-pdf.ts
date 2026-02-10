import type { NextApiRequest, NextApiResponse } from 'next';
import React from 'react';
import { Document, Page, Text, View, StyleSheet, pdf, Image } from '@react-pdf/renderer';
import { translations } from '@/lib/translations';
import { questionsData } from '@/lib/questions';

// Add language parameter to the request body type
interface RequestBody {
  personalInfo: PersonalInfo;
  score: number;
  answers: Record<string, string>;
  questions: Question[];
  language: 'en' | 'fr' | 'ar';
}

// Add this interface at the top of the file
interface PersonalInfo {
  name: string;
  email: string;
  company: string;
  position: string;
}

// Add these types
type Question = {
  id: string;
  text: string;
  options: Array<{ value: string; label: string }>;
};

// Add getResultText function
const getResultText = (score: number, language: 'en' | 'fr' | 'ar' = 'en') => {
  const t = translations[language].resultTexts;
  // Updated thresholds for 7 questions (max 56 points)
  if (score >= 85) return t.advanced;  // Carbon readiness max 100
  if (score >= 65) return t.solid;
  if (score >= 35) return t.basic;
  return t.urgent;                       // Below 20
};

// Create styles for the PDF with letterhead design and custom colors
const createStyles = (language: 'en' | 'fr' | 'ar') => StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#757574',
    position: 'relative',
  },
  // Letterhead Header
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
  
  // Main Content Area
  contentArea: {
    padding: 40,
    paddingTop: 30,
    paddingBottom: 30,
    flex: 1,
  },
  
  // Section Styling
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
  
  // Personal Information Card
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
  
  // Score Display
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
  
  // Assessment Details Table
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
  
  // Letterhead Footer
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
  footerDivider: {
    height: 1,
    backgroundColor: '#ffffff',
    opacity: 0.3,
    marginVertical: 8,
  },
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { personalInfo, score, answers, language } = req.body as RequestBody;

    // Validate required fields
    if (!personalInfo || !personalInfo.name || !personalInfo.email || !personalInfo.company) {
      return res.status(400).json({ message: 'Missing required personal information' });
    }

    if (score === undefined || score === null) {
      return res.status(400).json({ message: 'Score is required' });
    }

    if (!answers || Object.keys(answers).length === 0) {
      return res.status(400).json({ message: 'Answers are required' });
    }

    // Use the language parameter to get the correct translations
    const t = translations[language] || translations.en;
    const styles = createStyles(language);
    const currentQuestions = questionsData[language] || questionsData.en;

    // Create the PDF document using React.createElement
    const createDocument = () => {
      const currentDate = new Date().toLocaleDateString(language === 'ar' ? 'ar-SA' : language === 'fr' ? 'fr-FR' : 'en-US');
      
      // Split questions into chunks for better page management
      // First page: 11 questions, second page: remaining questions
      const allAnswers = Object.entries(answers);
      const questionChunks: [string, string][][] = [];

      if (allAnswers.length > 0) {
        // First page - first 11 questions (or fewer if less than 11 total)
        questionChunks.push(allAnswers.slice(0, 11));
        // Second page - remaining questions (if any)
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

      // Create footer component for reuse
      const createFooter = () => React.createElement(View, { style: styles.letterheadFooter },
        React.createElement(View, { style: styles.footerContent },
          React.createElement(View, { style: styles.footerLeft },
            React.createElement(Text, { style: styles.footerText }, "© 2026 RSM SAUDI ARABIA. All rights reserved."),
            React.createElement(Text, { style: styles.footerDescription }, "THE POWER OF BEING UNDERSTOOD")
          )
        )
      );

      // Create pages array
      const pages = [];
      
      // First Page - Header, Personal Info, and Score
      pages.push(
        React.createElement(Page, { size: "A4", style: styles.page },
          // Professional Letterhead Header (First Page Only)
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

          // Main Content Area - First Page
          React.createElement(View, { style: styles.contentArea },
            // Personal Information Section
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

            // Assessment Score Section
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

      // Create pages for assessment details
      questionChunks.forEach((chunk, chunkIndex) => {
        const isLastChunk = chunkIndex === questionChunks.length - 1;
        
        pages.push(
          React.createElement(Page, { size: "A4", style: styles.page },
            // Main Content Area (No Header)
            React.createElement(View, { style: styles.contentArea },
              // Questions and Answers Section
              React.createElement(View, { style: styles.section },
                // Only show section title on first page
                chunkIndex === 0 ? React.createElement(Text, { style: styles.sectionTitle }, "Assessment Details") : null,
                React.createElement(View, { 
                  style: chunkIndex === 0 ? styles.questionsTableContainer : styles.questionsTableContainerPageBreak 
                },
                  React.createElement(View, { style: styles.questionsTable },
                    // Only show table header on first page
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

            // Footer (Last Page Only)
            isLastChunk ? createFooter() : null
          )
        );
      });

      return React.createElement(Document, {}, ...pages);
    };

    // Generate PDF buffer
    const pdfBuffer = await pdf(createDocument()).toBuffer();

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=assessment_report.pdf');

    // Send the PDF
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    
    // Provide more detailed error information
    if (error instanceof Error) {
      res.status(500).json({ 
        message: 'Error generating PDF', 
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    } else {
      res.status(500).json({ message: 'Unknown error generating PDF' });
    }
  }
}

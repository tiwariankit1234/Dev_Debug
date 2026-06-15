const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const { Report } = require('./models');
const authMiddleware = require('./authMiddleware');

// POST /api/analyze - Trigger analysis
router.post('/analyze', authMiddleware, async (req, res) => {
  try {
    const { code, language, input } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Code content is required.' });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey || geminiKey.includes('YOUR_GEMINI_API_KEY_HERE')) {
      return res.status(400).json({
        error: 'Gemini API Key not set on the server. Please check the backend .env configuration.'
      });
    }

    const pythonScriptPath = path.join(__dirname, '..', 'agent', 'analyze.py');
    const inputPayload = JSON.stringify({
      code,
      language: language || 'auto',
      input: input || '',
      apiKey: geminiKey
    });

    console.log(`Spawning Python Agent: ${pythonScriptPath}`);

    const runAgent = (cmd) => {
      const pythonProcess = spawn(cmd, [pythonScriptPath]);

      let stdoutData = '';
      let stderrData = '';
      let errorSent = false;

      pythonProcess.on('error', (err) => {
        if (err.code === 'ENOENT' && cmd === 'python3') {
          console.log("python3 command not found, falling back to python...");
          runAgent('python');
        } else {
          console.error(`Failed to start Python process (${cmd}):`, err);
          if (!res.headersSent && !errorSent) {
            errorSent = true;
            res.status(500).json({
              error: `Failed to start the analysis agent using command '${cmd}'. Make sure Python is installed and in the system PATH.`,
              details: err.message
            });
          }
        }
      });

      // Handle stdin errors to prevent crashing on closed sockets
      pythonProcess.stdin.on('error', (err) => {
        console.error('Stdin error on python process:', err);
      });

      try {
        pythonProcess.stdin.write(inputPayload);
        pythonProcess.stdin.end();
      } catch (writeErr) {
        console.error('Failed to write to stdin:', writeErr);
      }

      pythonProcess.stdout.on('data', (data) => {
        stdoutData += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderrData += data.toString();
      });

      pythonProcess.on('close', async (code) => {
        if (errorSent || res.headersSent) return;

        console.log(`Exit code from ${cmd}: ${code}`);
        console.log(`stdout: "${stdoutData}"`);
        console.log(`stderr: "${stderrData}"`);

        if (code !== 0) {
          // Handle Windows Microsoft Store python3 stub
          if (cmd === 'python3' && (code === 9009 || stderrData.includes('Python was not found'))) {
            console.log("python3 alias failed on Windows, falling back to python...");
            return runAgent('python');
          }
          
          console.error(`Python stderr: ${stderrData}`);
          return res.status(500).json({
            error: 'Analysis Agent Subprocess failed.',
            details: stderrData
          });
        }

        try {
          console.log("this is stdoutData", stdoutData);
          const result = JSON.parse(stdoutData);

          if (!result.success) {
            return res.status(500).json({
              error: 'AI analysis failed.',
              details: result.error || 'Unknown error'
            });
          }

          // Save report to database
          const newReport = new Report({
            userId: req.userId,
            code,
            language: result.language,
            input: input || '',
            sandbox: result.sandbox,
            staticAnalysis: result.staticAnalysis,
            aiReport: result.aiReport
          });

          await newReport.save();
          res.json(newReport);

        } catch (jsonErr) {
          console.error('Failed to parse Python JSON output:', jsonErr);
          console.error('Raw stdout:', stdoutData);
          res.status(500).json({
            error: 'Invalid response from analysis agent.',
            details: stdoutData
          });
        }
      });
    };

    runAgent('python3');

  } catch (error) {
    console.error('Endpoint /api/analyze error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

// GET /api/reports - Fetch all reports (summaries)
router.get('/reports', authMiddleware, async (req, res) => {
  try {
    const reports = await Report.find({ userId: req.userId }, '_id language createdAt sandbox.success')
      .sort({ createdAt: -1 });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/reports/:id - Fetch detailed report by ID
router.get('/reports/:id', authMiddleware, async (req, res) => {
  try {
    const report = await Report.findOne({ _id: req.params.id, userId: req.userId });
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/reports/:id - Delete a report
router.delete('/reports/:id', authMiddleware, async (req, res) => {
  try {
    const report = await Report.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json({ success: true, message: 'Report deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/reports/:id/pdf - Generate server-side PDF
router.get('/reports/:id/pdf', authMiddleware, async (req, res) => {
  try {
    const report = await Report.findOne({ _id: req.params.id, userId: req.userId });
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Set headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=devdebug_report_${report._id}.pdf`);

    // Create PDF Document
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    // Stream the PDF to response
    doc.pipe(res);

    // Styling Palette
    const primaryColor = '#0f172a';  // Dark Slate
    const secondaryColor = '#0ea5e9'; // Electric Teal
    const accentColor = '#64748b';    // Slate Gray
    const warningColor = '#f97316';   // Amber Warning
    const errorColor = '#ef4444';     // Red Error
    const successColor = '#22c55e';   // Green Success

    // Cover Page / Header
    doc
      .rect(0, 0, 612, 120)
      .fill(primaryColor);

    doc
      .fillColor('#ffffff')
      .fontSize(22)
      .font('Helvetica-Bold')
      .text('DEVDEBUG AGENT REPORT', 50, 40);

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#e2e8f0')
      .text(`Report ID: ${report._id}  |  Generated on: ${new Date(report.createdAt).toLocaleString()}`, 50, 75);

    // Meta Section
    doc.moveDown(5);
    doc
      .fillColor(primaryColor)
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('SUMMARY OF REVIEW', 50, 140);

    doc
      .rect(50, 160, 500, 2)
      .fill(secondaryColor);

    doc
      .fillColor(primaryColor)
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Detected Language: ', 55, 180)
      .font('Helvetica')
      .text(report.language.toUpperCase(), 170, 180);

    const sandboxStatus = report.sandbox.success ? 'PASSED' : 'FAILED / WARNING';
    const statusColor = report.sandbox.success ? successColor : (report.sandbox.compiled === false ? errorColor : warningColor);

    doc
      .font('Helvetica-Bold')
      .text('Execution Status: ', 55, 200)
      .fillColor(statusColor)
      .text(sandboxStatus, 170, 200)
      .fillColor(primaryColor);

    doc
      .font('Helvetica-Bold')
      .text('Run Time: ', 55, 220)
      .font('Helvetica')
      .text(`${report.sandbox.run_time_ms} ms`, 170, 220);

    // Code Sandbox Run logs
    doc.moveDown(6);
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Sandbox Compile & Run Log:');

    doc.moveDown(0.5);

    // Draw Box for terminal output
    const consoleY = doc.y;
    doc
      .rect(50, consoleY, 500, 100)
      .fill('#f1f5f9');

    doc
      .fillColor('#334155')
      .font('Courier')
      .fontSize(8.5);

    const logText = [
      `[Compile Output]: ${report.sandbox.compile_output || 'None'}`,
      `[Stdout]: ${report.sandbox.execution_output || 'None'}`,
      `[Stderr]: ${report.sandbox.execution_error || 'None'}`,
      `[Exit Code]: ${report.sandbox.exit_code}`
    ].join('\n');

    doc.text(logText, 60, consoleY + 10, { width: 480, height: 80, ellipsis: true });

    // AI General Review
    doc.moveDown(7);
    doc
      .fillColor(primaryColor)
      .font('Helvetica-Bold')
      .fontSize(12)
      .text('AI Assessment Summary:');
    doc
      .font('Helvetica')
      .fontSize(9.5)
      .fillColor('#334155')
      .text(report.aiReport.generalReview || 'No general review available.', { align: 'justify', lineGap: 3 });

    // Bugs Section (New Page if needed)
    doc.addPage();
    doc
      .fillColor(primaryColor)
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('DETECTED LOGICAL BUGS', 50, 50);

    doc
      .rect(50, 70, 500, 2)
      .fill(warningColor);

    doc.moveDown(2);

    const bugs = report.aiReport.bugs || [];
    if (bugs.length === 0) {
      doc
        .fillColor(successColor)
        .font('Helvetica-Bold')
        .fontSize(11)
        .text('No logical bugs detected in the code! Awesome job.');
    } else {
      bugs.forEach((bug, index) => {
        const severityColor = bug.severity === 'critical' ? errorColor : (bug.severity === 'warning' ? warningColor : accentColor);
        doc
          .fillColor(severityColor)
          .font('Helvetica-Bold')
          .fontSize(10)
          .text(`Bug #${index + 1} [Line ${bug.line}] - Severity: ${bug.severity.toUpperCase()}`);

        doc
          .fillColor('#334155')
          .font('Helvetica')
          .fontSize(9)
          .text(`Description: ${bug.description}`, { lineGap: 2 });

        if (bug.fix) {
          doc
            .font('Helvetica-Oblique')
            .text(`Suggested Fix: ${bug.fix}`, { lineGap: 2 });
        }

        doc.moveDown(1.5);
      });
    }

    // Security Scan Section
    doc.moveDown(2);
    doc
      .fillColor(primaryColor)
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('SECURITY VULNERABILITY SCAN');

    doc
      .rect(doc.x, doc.y + 5, 500, 2)
      .fill(errorColor);

    doc.moveDown(2);

    const secIssues = report.aiReport.securityIssues || [];
    if (secIssues.length === 0) {
      doc
        .fillColor(successColor)
        .font('Helvetica-Bold')
        .fontSize(11)
        .text('No security vulnerabilities identified. Code satisfies sandbox-level security audits.');
    } else {
      secIssues.forEach((issue, index) => {
        const severityColor = ['Critical', 'High'].includes(issue.severity) ? errorColor : (issue.severity === 'Medium' ? warningColor : accentColor);

        doc
          .fillColor(severityColor)
          .font('Helvetica-Bold')
          .fontSize(10)
          .text(`Vulnerability #${index + 1}: ${issue.category} (Severity: ${issue.severity}) - Lines: ${issue.lines || 'N/A'}`);

        doc
          .fillColor('#334155')
          .font('Helvetica')
          .fontSize(9)
          .text(`Description: ${issue.description}`, { lineGap: 2 });

        doc
          .font('Helvetica-Bold')
          .text(`Remediation: `, { continued: true })
          .font('Helvetica')
          .text(issue.remediation, { lineGap: 2 });

        doc.moveDown(1.5);
      });
    }

    // Fixed Code Section (New Page)
    doc.addPage();
    doc
      .fillColor(primaryColor)
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('PROPOSED FIXED CODE', 50, 50);

    doc
      .rect(50, 70, 500, 2)
      .fill(successColor);

    doc.moveDown(2);

    const fixedCodeY = doc.y;
    doc
      .rect(50, fixedCodeY, 500, doc.page.height - fixedCodeY - 80)
      .fill('#f8fafc');

    doc
      .fillColor('#0f172a')
      .font('Courier')
      .fontSize(8.5);

    doc.text(report.aiReport.fixedCode || '// No fixed code generated.', 60, fixedCodeY + 15, {
      width: 480,
      height: doc.page.height - fixedCodeY - 110,
      ellipsis: true
    });

    // End stream
    doc.end();

  } catch (error) {
    console.error('PDF generation endpoint failed:', error);
    res.status(500).json({ error: 'Failed to generate PDF document: ' + error.message });
  }
});

const fetchWithRetry = async (url, options, maxRetries = 3, initialDelay = 1000) => {
  let delay = initialDelay;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        if ([503, 429].includes(response.status) && attempt < maxRetries - 1) {
          console.warn(`Gemini API returned status ${response.status}. Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2;
          continue;
        }
        const errorText = await response.text();
        throw new Error(`Gemini API returned status ${response.status}: ${errorText}`);
      }
      return response;
    } catch (error) {
      if (attempt < maxRetries - 1) {
        console.warn(`Fetch error occurred. Retrying in ${delay}ms...`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }
      throw error;
    }
  }
};

// POST /api/translate - Translate code
router.post('/translate', authMiddleware, async (req, res) => {
  try {
    const { code, sourceLanguage, targetLanguage } = req.body;

    if (!code || !targetLanguage) {
      return res.status(400).json({ error: 'Code and target language are required.' });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey || geminiKey.includes('YOUR_GEMINI_API_KEY_HERE')) {
      return res.status(400).json({
        error: 'Gemini API Key not set on the server.'
      });
    }

    const prompt = `
You are an expert software engineer. Translate the following code from ${sourceLanguage || 'auto'} to ${targetLanguage}.
Make sure to follow the idioms, syntax rules, and best practices of ${targetLanguage}.
Preserve logic, variable names (where appropriate), structure, and comments.

=== CODE TO TRANSLATE ===
${code}

=== TASK ===
Return a JSON object containing the translated code. Do not wrap the response in markdown blocks (such as \`\`\`json). Return raw JSON ONLY.
JSON Schema:
{
  "translatedCode": "the complete translated code here",
  "notes": "brief explanation of any key translation differences or assumptions (max 2 sentences)"
}
`;

    const url = `https://gemini-proxy.ankittiwari002003.workers.dev/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${geminiKey}`;
    const payload = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        responseMimeType: "application/json"
      }
    };

    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    const textResponse = data.candidates[0].content.parts[0].text;
    const result = JSON.parse(textResponse.trim());

    res.json(result);

  } catch (error) {
    console.error('Code translation failed:', error);
    res.status(500).json({ error: 'Failed to translate code: ' + error.message });
  }
});

module.exports = router;

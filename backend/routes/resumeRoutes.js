import express from "express";
import fs from "fs";
import { PDFParse } from "pdf-parse";
import upload from "../middlewares/uploadMiddleware.js";

const router = express.Router();

const techKeywords = ["java", "python", "react", "sql", "apis"];
const actionVerbs = ["developed", "built", "designed", "implemented"];
const sectionNames = ["education", "skills", "projects", "experience"];

const extractResumeText = async (file) => {
  if (file.mimetype === "application/pdf") {
    const dataBuffer = fs.readFileSync(file.path);
    const parser = new PDFParse({ data: dataBuffer });
    try {
      const data = await parser.getText();
      return data.text.replace(/\s+/g, " ").trim();
    } finally {
      await parser.destroy();
    }
  }

  const rawText = fs.readFileSync(file.path, "utf8");
  const cleanedText = rawText
    .replace(/[^\x20-\x7E\n\r]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleanedText || file.originalname;
};

const countMatches = (text, words) => {
  const lowerText = text.toLowerCase();
  return words.filter((word) => lowerText.includes(word)).length;
};

const analyzeResume = (resumeText) => {
  const words = resumeText.split(/\s+/).filter(Boolean);
  const keywordMatches = countMatches(resumeText, techKeywords);
  const sectionMatches = countMatches(resumeText, sectionNames);
  const actionVerbMatches = countMatches(resumeText, actionVerbs);
  const symbolCount = (resumeText.match(/[|{}<>~^`]/g) || []).length;
  const formattingRatio = resumeText.length ? symbolCount / resumeText.length : 0;

  const keywordScore = keywordMatches >= 3 ? 3 : keywordMatches * 1;
  const sectionScore = sectionMatches >= 3 ? 2 : sectionMatches * 0.6;
  const formattingScore = formattingRatio > 0.08 ? 1 : 2;
  const actionVerbScore = actionVerbMatches >= 2 ? 1.5 : actionVerbMatches * 0.5;
  const lengthScore = words.length >= 250 && words.length <= 900 ? 1.5 : 1;

  const score = Number(
    Math.min(10, keywordScore + sectionScore + formattingScore + actionVerbScore + lengthScore).toFixed(1)
  );

  const suggestions = [];

  if (keywordMatches < 3) {
    const missingKeywords = techKeywords.filter((word) => !resumeText.toLowerCase().includes(word));
    suggestions.push(`Add more job keywords such as ${missingKeywords.slice(0, 3).join(", ")}.`);
  }

  if (sectionMatches < 3) {
    suggestions.push("Use clear sections for Education, Skills, Projects, and Experience.");
  }

  if (formattingScore < 2) {
    suggestions.push("Simplify formatting so ATS tools can read it easily.");
  }

  if (actionVerbMatches < 2) {
    suggestions.push("Start bullet points with stronger action verbs like developed, built, designed, and implemented.");
  }

  if (words.length < 250 || words.length > 900) {
    suggestions.push("Keep the resume around 250 to 900 words for a stronger ATS-friendly length.");
  }

  const feedback = suggestions.length
    ? `Good base, but ${suggestions.join(" ")}`
    : "Strong ATS-friendly resume with relevant keywords, clear sections, action verbs, and suitable length.";

  return {
    score,
    feedback,
    details: {
      keywordMatches,
      totalKeywords: techKeywords.length,
      sectionMatches,
      totalSections: sectionNames.length,
      actionVerbMatches,
      wordCount: words.length
    }
  };
};

const buildImprovedResume = () => {
  return `PROFESSIONAL SUMMARY
Software-focused candidate with hands-on project experience, strong problem-solving ability, and practical knowledge of modern development tools.

SKILLS
Java, Python, React, SQL, APIs, Git, debugging, responsive UI development

PROJECTS
- Developed a React-based web application with reusable components and clean user flows.
- Built backend API endpoints to handle data requests, validation, and structured responses.
- Implemented database-driven features using SQL concepts and organized project logic.

EDUCATION
Add your degree, college name, graduation year, and relevant coursework.

EXPERIENCE
- Designed and improved user-facing features with attention to performance and readability.
- Implemented project functionality using clear code structure and practical development patterns.`;
};

const createPdfBuffer = (text) => {
  const lines = text
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .split("\n")
    .slice(0, 28)
    .map((line, index) => `BT /F1 11 Tf 50 ${760 - index * 22} Td (${line}) Tj ET`)
    .join("\n");

  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length ${lines.length} >>
stream
${lines}
endstream
endobj
trailer
<< /Root 1 0 R >>
%%EOF`;

  return Buffer.from(pdf);
};

router.get("/", (req, res) => {
  res.json({ message: "Resume route working" });
});

router.post("/upload", upload.single("resume"), async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  try {
    const resumeText = await extractResumeText(req.file);
    const analysis = analyzeResume(resumeText);

    res.status(200).json({
      message: "File uploaded and analyzed successfully",
      resumeText,
      ...analysis,
      file: {
        originalName: req.file.originalname,
        filename: req.file.filename,
        size: req.file.size,
        path: req.file.path
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get("/chat", (req, res) => {
  res.send("Chat route working");
});

router.post("/chat", (req, res) => {
  const { message, resumeText = "" } = req.body;

  if (!message) {
    return res.status(400).json({ message: "Message is required" });
  }

  const lowerMessage = message.toLowerCase();
  const analysis = analyzeResume(resumeText || message);
  const keywordMatches = countMatches(resumeText, techKeywords);
  const sectionMatches = countMatches(resumeText, sectionNames);
  const actionVerbMatches = countMatches(resumeText, actionVerbs);

  let reply = "";

  if (lowerMessage.includes("why")) {
    reply = `Your score is ${analysis.score}/10 because:

- Keywords matched: ${keywordMatches}/${techKeywords.length}
- Sections found: ${sectionMatches}/${sectionNames.length}
- Action verbs used: ${actionVerbMatches}

Main issues:
${analysis.feedback}

This is why your score is not higher.`;
  } else if (lowerMessage.includes("improve resume")) {
    reply = `Here is an improved version of your resume:

${buildImprovedResume()}

This is a mock AI rewrite for now. Later you can connect this route to an OpenAI API for a fully personalized rewrite.`;
  } else if (lowerMessage.includes("skill")) {
    reply = `Your resume may already contain good skills.

To improve further, you can:
- Add advanced tools like Docker, AWS, and CI/CD.
- Mention libraries and frameworks like Redux, Express, or Tailwind when relevant.
- Add project-specific skills like API integration, authentication, database design, and deployment.

Also, do not only list skills. Show them inside projects with clear outcomes.`;
  } else if (lowerMessage.includes("already")) {
    reply = `You're right. If your resume already includes these elements, the low score was likely caused by:

- Poor PDF text extraction before the parser fix
- Strict scoring logic
- Sections not being detected properly from the uploaded file

So the issue may not be your resume. The analyzer now uses real PDF text extraction, so re-upload the resume and the score should be much more realistic.`;
  } else if (lowerMessage.includes("improve") || lowerMessage.includes("better")) {
    reply = `Here is how to improve your resume:

1. Add measurable impact
   Example: "Built app" -> "Built app used by 100+ users"

2. Strengthen projects
   Mention APIs, logic, challenges, database work, and deployment.

3. Use strong action verbs
   Developed, implemented, optimized, designed, built.

4. Add one standout project
   Choose something real-world, AI-based, or useful enough to discuss in interviews.

This can push your score toward 8+.`;
  } else {
    reply = `Your score is ${analysis.score}/10.

Ask things like:
- Why is my score low?
- How can I improve?
- What skills should I add?
- I already have these sections.`;
  }

  if (analysis.score < 3) {
    reply += "\n\nNote: If this is a strong resume, the score may still be affected by parsing issues. Re-upload the PDF after restarting the backend.";
  }

  res.json({ reply });
});

router.post("/generate-pdf", (req, res) => {
  const improvedResume = req.body?.improvedResume || buildImprovedResume();
  const pdfBuffer = createPdfBuffer(improvedResume);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=improved_resume.pdf");
  res.send(pdfBuffer);
});

export default router;

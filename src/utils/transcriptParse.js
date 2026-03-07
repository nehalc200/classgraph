// src/utils/transcriptParse.js

function normalizeCourse(subject, number) {
    const subj = (subject || "").toUpperCase().trim();
    const num = (number || "").toUpperCase().trim();
    return `${subj} ${num}`.replace(/\s+/g, " ").trim();
  }
  
  // Grade tokens that imply completion (we'll ignore NP/W/F/U)
  // NOTE: many transcripts use "IP" or blank for in-progress
  const gradeTokenRe = /\b(A\+|A|A-|B\+|B|B-|C\+|C|C-|D\+|D|D-|F|P|NP|S|U|W|IP)\b/;
  
  const UCSD_SUBJECTS = new Set([
    "CSE","MATH","COGS","ECON","BILD","BICD","BIMM","CHEM","PHYS","ESYS",
    "PSYC","POLI","HILD","MMW","LITR","WCWP","USP","TDGE","VIS","LTWL",
    "ECE"
  ]);
  
  // IMPORTANT: global regex because we use matchAll
  const courseTokenRe = /\b([A-Z]{2,5})\s*(\d{1,3}[A-Z]{0,2})\b/g;
  
  const bannedSubjects = new Set([
    "NP", "W", "F", "P", "S", "U", "IP",
    "GPA", "TERM", "TOTAL", "UNITS", "POINTS", "GRADE", "REPEAT"
  ]);
  
  export function parseAcademicHistoryText(text) {
    const completed = new Set();
    const inProgress = new Set();
  
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.replace(/\s+/g, " ").trim())
      .filter(Boolean);
  
    let inTransferBlock = false;
  
    // 👇 NEW: handle rows that wrap across lines
    // if we saw a course code but no grade yet, store it here
    let pendingCourse = null;
  
    for (const line of lines) {
      // Detect transfer block boundaries (heuristic)
      if (/Transfer Courses/i.test(line)) inTransferBlock = true;
      if (/UCSD Undergraduate Courses by Term/i.test(line)) inTransferBlock = false;
  
      const matches = [...line.matchAll(courseTokenRe)];
      const candidates = matches
        .map((m) => normalizeCourse(m[1], m[2]))
        .filter((c) => {
          const subj = c.split(" ")[0];
          return !bannedSubjects.has(subj);
        });
  
      const grade = line.match(gradeTokenRe)?.[1] || null;
  
      // ✅ If line has NO course token but DOES have a grade,
      // and we have a pendingCourse, treat it as completion info for previous line.
      if (candidates.length === 0 && grade && pendingCourse) {
        if (grade === "NP" || grade === "U" || grade === "F" || grade === "W") {
          // no credit
        } else if (grade === "IP") {
          inProgress.add(pendingCourse);
        } else {
          completed.add(pendingCourse);
        }
        pendingCourse = null;
        continue;
      }
  
      if (candidates.length === 0) continue;
  
      // ---- Transfer block handling ----
      if (inTransferBlock) {
        // Prefer UCSD approx courses
        const ucsdCandidates = candidates.filter((c) => UCSD_SUBJECTS.has(c.split(" ")[0]));
        if (ucsdCandidates.length > 0) {
          for (const c of ucsdCandidates) completed.add(c);
        }
        pendingCourse = null;
        continue;
      }
  
      // ---- UCSD term courses ----
      // If we have a grade on the same line, use it
      if (grade) {
        if (grade === "NP" || grade === "U" || grade === "F" || grade === "W") {
          // no credit
        } else if (grade === "IP") {
          inProgress.add(candidates[0]);
        } else {
          completed.add(candidates[0]);
        }
        pendingCourse = null;
      } else {
        // No grade yet: could be in-progress OR could be wrapped line
        // store as pending; if next line has grade, it’ll get completed
        pendingCourse = candidates[0];
  
        // also tentatively mark in progress (will be removed if completed later)
        inProgress.add(candidates[0]);
      }
    }
  
    // If completed, remove from in progress
    for (const c of completed) inProgress.delete(c);
  
    return { completed, inProgress };
  }
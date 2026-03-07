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
    "AAPI","AIP","ANTH","ASTR","AWP","BENG","BIOM","CAT","CCE","CCS","CGS","CHEM","CHIN","CLAS","CLIN","CLRE","COGS","COMM","CONT","CSE","CSS",
    "DOC","DSC","DSGN","ECE","ECON","EDS","ENG","ENVR","ERC","ESYS","ETHN","FMPH","GLBH","GSS","HDS","HILD","HMNR","HUM","INTL","JAPN","JWSP",
    "LATI","LAWS","LHCO","LIT","MAE","MATH","MATS","MBC","MCWP","MGT","MMW","MSED","MUS","NANO","NEU","PH","PHIL","PHYS","POLI","PSYC","RELI",
    "REV","SE","SEV","SIO","SXTH","SYN","TMC","USP","VIS","WARR"
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
        const equivalents = extractTransferEquivalents(line);
        for (const course of equivalents) {
          completed.add(course);
        }
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
  
  /**
   * Extract UCSD equivalent courses from transfer text by scanning after "LD" markers.
   * e.g. "... 4.50  A  S125  LD  MATH 18  MATH 20D  CISC ..." → ["MATH 18", "MATH 20D"]
   */
  function extractTransferEquivalents(text) {
    const equivalents = new Set();
  
    // Split on "LD" markers to get chunks after each one
    const chunks = text.split(/\bLD\b/);
  
    // Skip the first chunk (before the first LD)
    for (let i = 1; i < chunks.length; i++) {
      const chunk = chunks[i];
  
      // Find all course-like tokens in this chunk
      const matches = [...chunk.matchAll(courseTokenRe)];
  
      for (const m of matches) {
        const subj = m[1].toUpperCase().trim();
        const num = m[2].toUpperCase().trim();
  
        // Stop when we hit a non-UCSD subject — that's the next transfer row's course
        if (!UCSD_SUBJECTS.has(subj)) break;
  
        equivalents.add(normalizeCourse(subj, num));
        console.log(`Found transfer equivalent: ${normalizeCourse(subj, num)}`);
      }
    }
  
    return equivalents;
  }
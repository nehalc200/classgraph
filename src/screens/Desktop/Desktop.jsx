import React, { useState, useCallback, useEffect } from "react";
import { Button } from "../../components/Button";
import { D3Graph } from "../../components/D3Graph";
import { GraphTabs } from "../../components/GraphTabs";
import { CourseSearch } from "../../components/CourseSearch";
import { loadAstNodeForCourse } from "../../utils/loadAstData";
import { TranscriptUpload } from "../../components/TranscriptUpload";
import { extractTextFromPdf } from "../../utils/pdfExtract";
import { parseAcademicHistoryText } from "../../utils/transcriptParse";

import graphBg from "./graphbackground.webp";

export const Desktop = () => {
  // State
  const [selectedCourse, setSelectedCourse] = useState("");
  const [tabs, setTabs] = useState([]);           // [{ courseCode, astNode }]
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [transcriptFile, setTranscriptFile] = useState(null);
  const [transcriptText, setTranscriptText] = useState("");
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [transcriptError, setTranscriptError] = useState("");
  const [record, setRecord] = useState({ completed: new Set(), inProgress: new Set() });

  // When the user selects a course from search
  const handleCourseSelect = useCallback((courseCode) => {
    setSelectedCourse(courseCode);
  }, []);

  // When the user clicks "Go" — lazy-load the department and open in a new tab
  const handleGenerate = useCallback(async () => {
    if (!selectedCourse || generating) return;
    setGenerating(true);
    try {
      const rootNode = await loadAstNodeForCourse(selectedCourse);
      if (!rootNode) {
        setGenerating(false);
        return;
      }

      // Avoid duplicate tabs
      setTabs((prev) => {
        const existingIndex = prev.findIndex((t) => t.courseCode === rootNode.code);
        if (existingIndex >= 0) {
          setActiveTabIndex(existingIndex);
          return prev;
        }
        setActiveTabIndex(prev.length);
        return [...prev, { courseCode: rootNode.code, astNode: rootNode }];
      });
    } catch (e) {
      console.error('Failed to load course data:', e);
    } finally {
      setGenerating(false);
    }
  }, [selectedCourse, generating]);

  // When the user clicks an expandable node inside the graph
  const handleNodeExpand = useCallback(
    async (courseCode) => {
      const rootNode = await loadAstNodeForCourse(courseCode);
      if (!rootNode) return;

      setTabs((prev) => {
        const existingIndex = prev.findIndex((t) => t.courseCode === rootNode.code);
        if (existingIndex >= 0) {
          setActiveTabIndex(existingIndex);
          return prev;
        }
        setActiveTabIndex(prev.length);
        return [...prev, { courseCode: rootNode.code, astNode: rootNode }];
      });
    },
    [],
  );

  // Tab interactions
  const handleTabSelect = useCallback((index) => setActiveTabIndex(index), []);
  const handleTabClose = useCallback(
    (index) => {
      setTabs((prev) => prev.filter((_, i) => i !== index));
      setActiveTabIndex((prev) => (prev >= index ? Math.max(0, prev - 1) : prev));
    },
    [],
  );
  useEffect(() => {
    let cancelled = false;
  
    const run = async () => {
      setTranscriptError("");
      setTranscriptText("");
  
      if (!transcriptFile) return;
  
      try {
        setTranscriptLoading(true);
        const text = await extractTextFromPdf(transcriptFile);
        if (cancelled) return;
  
        setTranscriptText(text);
        const parsed = parseAcademicHistoryText(text);
        setRecord(parsed);

        console.log("COMPLETED:", Array.from(parsed.completed).sort());
        console.log("IN PROGRESS:", Array.from(parsed.inProgress).sort());
        console.log("PDF TEXT (first 2000 chars):", text.slice(0, 2000));
      } catch (e) {
        console.error("PDF ERROR:", e);
        if (!cancelled) setTranscriptError("Could not read that PDF. See console.");
      } finally {
        if (!cancelled) setTranscriptLoading(false);
      }
    };
  
    run();
    return () => {
      cancelled = true;
    };
  }, [transcriptFile]);

  // Currently active AST node
  const activeAstNode = tabs.length > 0 ? tabs[activeTabIndex]?.astNode : null;

  return (
    <div className="min-h-screen w-full font-['Inter'] pb-20 bg-[#FAF6F4]">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header
        className="relative w-full h-[314px] bg-cover bg-center flex flex-col items-center justify-center"
        style={{ backgroundImage: `url(${graphBg})` }}
      >
        <h1 className="text-5xl md:text-[65px] font-black text-black tracking-[-0.33px] text-center px-4">
          UCSD ClassGraph
        </h1>
        <div className="mt-8">
          <Button onClick={() => {
            const section = document.getElementById('graph-section');
            if (section) section.scrollIntoView({ behavior: 'smooth' });
          }}>
            Let's go!
          </Button>
        </div>
        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-black" />
      </header>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="w-full flex justify-center mt-8">
        <div className="w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Description */}
          <p className="text-center text-xl md:text-[25px] font-medium text-black tracking-[-0.12px] leading-snug md:leading-[36.3px] mb-12 max-w-5xl mx-auto">
            Many courses at UCSD have a variety of ways to take the necessary
            prerequisites, making scheduling, course dependencies, and academic
            planning difficult for students. ClassGraph helps our students
            understand and plan their complex course requirements for their major
            and graduation.
          </p>

          <div id="graph-section" className="w-full flex justify-center">
            <div className="w-full max-w-6xl flex flex-col" style={{ minHeight: 700 }}>
          
              <div className="mb-8 w-full max-w-3xl mx-auto">
                <div className="border-2 border-black rounded-2xl bg-white px-6 py-5 shadow-sm">
                  
                  <div className="text-sm font-semibold mb-2 text-gray-800">
                    Upload Academic History
                  </div>

                  <div className="text-xs text-gray-500 mb-4">
                    Upload your UCSD Academic History PDF to highlight prerequisites you have already completed.
                  </div>

                  <TranscriptUpload
                    file={transcriptFile}
                    onChange={setTranscriptFile}
                  />

                </div>
              </div>
              {transcriptLoading ? (
                <div className="mt-3 text-sm text-gray-600">Extracting text…</div>
              ) : transcriptError ? (
                <div className="mt-3 text-sm text-red-600">{transcriptError}</div>
              ) : transcriptText ? (
                <div className="mt-3 text-sm text-gray-600">
                  Extracted {transcriptText.length.toLocaleString()} characters.
                </div>
              ) : null}

              {record.completed.size > 0 || record.inProgress.size > 0 ? (
                <div className="mt-4 text-xs text-gray-700">
                  <div className="font-semibold">Detected courses</div>
                  <div className="mt-2">
                    <span className="font-medium">Completed:</span>{" "}
                    {Array.from(record.completed).slice(0, 12).join(", ")}
                    {record.completed.size > 12 ? " …" : ""}
                  </div>
                  <div className="mt-1">
                    <span className="font-medium">In progress:</span>{" "}
                    {Array.from(record.inProgress).slice(0, 12).join(", ")}
                    {record.inProgress.size > 12 ? " …" : ""}
                  </div>
                </div>
              ) : null}

              <div className="mb-4 w-full max-w-3xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
                <CourseSearch onSelect={handleCourseSelect} onQueryChange={setSelectedCourse} onSubmit={handleGenerate} />
                <Button onClick={handleGenerate} disabled={generating}>
                  {generating ? '…' : 'Go'}
                </Button>
              </div>

              {tabs.length > 0 ? (
                <>
                  <GraphTabs
                    tabs={tabs}
                    activeIndex={activeTabIndex}
                    onSelect={handleTabSelect}
                    onClose={handleTabClose}
                  />
                  <div className="flex-1" style={{ minHeight: 600 }}>
                  <D3Graph
                    rootAstNode={activeAstNode}
                    onNodeExpand={handleNodeExpand}
                    completedCourses={record.completed}
                    inProgressCourses={record.inProgress}
                  />
                  </div>
                </>
              ) : (
                <div
                  className="w-full flex-1 bg-[#FAF6F4] rounded-xl relative flex items-center justify-center"
                  style={{ minHeight: 600, border: '2px solid #1e1e1e' }}
                >
                  <span className="text-gray-500 font-medium text-base sm:text-lg text-center px-4">
                    Search for a course and click "Go" to see its prerequisites
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

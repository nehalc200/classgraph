import React, { useState } from "react";
import { InputGroup } from "../../components/InputGroup";
import { SelectGroup } from "../../components/SelectGroup";
import { Button } from "../../components/Button";
import { CheckboxGroup } from "../../components/CheckboxGroup";
import { CourseGraph } from "../../components/CourseGraph";
import majorsData from "../../../data/majors.json";
import mathAstData from "../../../data/MATH_ast.json";
import graphBg from "./graphbackground.webp";

export const Desktop = () => {
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear + i);
  const collegeOptions = ["Revelle", "Muir", "Marshall", "Roosevelt", "Warren", "Sixth", "Seventh", "Eighth"];

  // Create options with label (name) and value (code)
  const majorOptions = majorsData
    .map((major) => ({
      label: major.name,
      value: major.code,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  // State management for form inputs
  const [selectedMajor, setSelectedMajor] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedCollege, setSelectedCollege] = useState("");
  const [isTransfer, setIsTransfer] = useState(false);
  const [additionalMajors, setAdditionalMajors] = useState("");
  const [showGraph, setShowGraph] = useState(false);

  // Function to check if conditions are met for graph rendering
  const canRenderGraph = () => {
    // Find Mathematics major code
    const mathMajor = majorsData.find(m => m.name === "Mathematics");
    const mathMajorCode = mathMajor ? mathMajor.code : null;

    return (
      selectedMajor === mathMajorCode &&
      selectedYear === "2029" &&
      selectedCollege === "Warren" &&
      !isTransfer &&
      additionalMajors.trim() === ""
    );
  };

  // Handle Generate Graph button click
  const handleGenerateGraph = () => {
    if (canRenderGraph()) {
      setShowGraph(true);
    } else {
      setShowGraph(false);
      alert("Graph can only be generated for Mathematics major, graduating in 2029, Warren college, non-transfer, with no additional majors/minors.");
    }
  };




  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-white to-transparent font-['Inter'] pb-20 bg-[#FAF6F4]" >
      {/* Header Section */}
      <header
        className="relative w-full h-[314px] bg-cover bg-center flex flex-col items-center justify-center" style={{ backgroundImage: `url(${graphBg})` }} >
        <h1 className="text-5xl md:text-[65px] font-black text-black tracking-[-0.33px] text-center px-4">
          UCSD ClassGraph
        </h1>
        <div className="mt-8">
        <Button onClick={() => {}}>
          Let's go!
        </Button>

        </div>
        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-black"></div>
      </header>


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

          <div className="flex flex-col lg:flex-row gap-12 items-center lg:items-start justify-center">
            {/* Left Column: Form */}
            <div className="w-full lg:w-[400px] flex flex-col gap-8 flex-shrink-0">
              <SelectGroup 
                label="Major" 
                id="major" 
                options={majorOptions}
                value={selectedMajor}
                onChange={(e) => setSelectedMajor(e.target.value)}
              />
              <SelectGroup 
                label="Graduating year" 
                id="year" 
                options={yearOptions}
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              />
              <SelectGroup 
                label="College" 
                id="college" 
                options={collegeOptions}
                value={selectedCollege}
                onChange={(e) => setSelectedCollege(e.target.value)}
              />
              <CheckboxGroup 
                label="Transfer" 
                id="transfer"
                checked={isTransfer}
                onChange={(e) => setIsTransfer(e.target.checked)}
              />

              <InputGroup 
                label="Additional majors/minors" 
                id="additional"
                value={additionalMajors}
                onChange={(e) => setAdditionalMajors(e.target.value)}
              />

              <div className="mt-4 flex justify-center">
              <Button onClick={handleGenerateGraph}>
                Generate graph
              </Button>

              </div>
            </div>

            {/* Right Column: Visualization/Placeholder */}
            <div className="w-full lg:w-[500px] flex justify-center lg:justify-start flex-shrink-0">
              <div className="w-full h-[500px] lg:h-[600px] bg-[#d9d9d9] rounded-xl relative shadow-inner">
                {showGraph ? (
                  <CourseGraph data={mathAstData} />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-500 font-medium">
                    Graph Preview Area
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

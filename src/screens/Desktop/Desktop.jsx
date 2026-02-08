import React from "react";
import { InputGroup } from "../../components/InputGroup";
import { SelectGroup } from "../../components/SelectGroup";
import { Button } from "../../components/Button";
import { CheckboxGroup } from "../../components/CheckboxGroup";
import majorsData from "../../../data/majors.json";

export const Desktop = () => {
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear + i);
  const collegeOptions = ["Revelle", "Muir", "Marshall", "Roosevelt", "Warren", "Sixth", "Seventh", "Eighth"];

  const majorOptions = majorsData.map((major) => major.name).sort();



  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-white to-transparent font-['Inter'] pb-20">
      {/* Header Section */}
      <header className="relative w-full h-[314px] bg-[url(https://c.animaapp.com/rTAWbAbr/img/frame-1.png)] bg-cover bg-center flex flex-col items-center justify-center">
        <h1 className="text-5xl md:text-[65px] font-black text-black tracking-[-0.33px] text-center px-4">
          UCSD ClassGraph
        </h1>
        <div className="mt-8">
          <Button>Let’s go</Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* Description */}
        <p className="text-center text-xl md:text-[25px] font-medium text-black tracking-[-0.12px] leading-snug md:leading-[36.3px] mb-12 max-w-5xl mx-auto">
          Many courses at UCSD have a variety of ways to take the necessary
          prerequisites, making scheduling, course dependencies, and academic
          planning difficult for students. ClassGraph helps our students
          understand and plan their complex course requirements for their major
          and graduation.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left Column: Form */}
          <div className="lg:col-span-5 flex flex-col gap-8 lg:pl-8">
            <SelectGroup label="Major" id="major" options={majorOptions} />
            <SelectGroup label="Graduating year" id="year" options={yearOptions} />
            <SelectGroup label="College" id="college" options={collegeOptions} />
            <CheckboxGroup label="Transfer" id="transfer" />

            <InputGroup label="Additional majors/minors" id="additional" />

            <div className="mt-4 flex justify-center">
              <Button>Generate graph</Button>
            </div>
          </div>

          {/* Right Column: Visualization/Placeholder */}
          <div className="lg:col-span-7">
            <div className="w-full h-[500px] lg:h-[600px] bg-[#d9d9d9] rounded-xl relative shadow-inner">
              {/* Optional: Add a visual indicator or placeholder content */}
              <div className="absolute inset-0 flex items-center justify-center text-gray-500 font-medium">
                Graph Preview Area
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

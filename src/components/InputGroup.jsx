import React from "react";

export const InputGroup = ({ label, id, className = "", value, onChange }) => {
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <label
        htmlFor={id}
        className="font-medium text-black text-3xl text-center tracking-[-0.15px]"
      >
        {label}
      </label>
      <input
        id={id}
        type="text"
        className="w-full h-[70px] bg-[#d9d9d9] rounded-none border-none px-4 text-xl focus:outline-none focus:ring-2 focus:ring-black"
        value={value}
        onChange={onChange}
      />
    </div>
  );
};

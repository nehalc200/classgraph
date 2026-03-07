import React, { useRef } from "react";

export const TranscriptUpload = ({
  file,
  onChange,
  disabled = false,
  className = "",
}) => {
  const inputRef = useRef(null);

  const handlePick = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0] ?? null;
    onChange?.(f);

    // allow re-uploading the same file
    e.target.value = "";
  };

  const handleClear = () => onChange?.(null);

  return (
    <div className={`flex flex-col sm:flex-row gap-3 items-stretch ${className}`}>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled}
      />

      <button
        type="button"
        onClick={handlePick}
        disabled={disabled}
        className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-black bg-[#FAF6F4] hover:bg-white transition-colors
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <span className="font-medium text-black text-lg tracking-[-0.09px]">
          Upload Academic History (PDF)
        </span>
      </button>

      <div
        className="flex-1 rounded-xl border-2 border-black bg-[#FAF6F4] px-4 py-3 flex items-center justify-between"
      >
        <span className="text-sm sm:text-base text-gray-700 truncate">
          {file ? file.name : "No file selected"}
        </span>

        {file ? (
          <button
            type="button"
            onClick={handleClear}
            className="ml-3 text-sm font-medium underline hover:opacity-80"
          >
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
};